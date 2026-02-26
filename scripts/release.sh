#!/usr/bin/env bash
#
# release.sh — Bump version, commit, tag, and push the rag-debugger SDK.
#
# Usage:
#   ./scripts/release.sh <version>
#
# Examples:
#   ./scripts/release.sh 0.2.0        # Release v0.2.0
#   ./scripts/release.sh 1.0.0        # Release v1.0.0
#   ./scripts/release.sh 0.1.1        # Patch release
#
# What it does:
#   1. Validates the version format (semver: X.Y.Z)
#   2. Checks for clean git working tree
#   3. Updates version in:
#      - packages/sdk/pyproject.toml
#      - packages/sdk/rag_debugger/__init__.py
#   4. Commits the version bump
#   5. Creates a signed git tag (v<version>)
#   6. Pushes the commit + tag to origin
#
# The tag push triggers the GitHub Actions publish workflow (.github/workflows/publish.yml)
# which builds and publishes the package to PyPI via trusted publishing.
#

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ─────────────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
error() { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Navigate to repo root ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ── Parse & validate args ──────────────────────────────────────────────────
if [[ $# -ne 1 ]]; then
    echo -e "${BOLD}Usage:${NC} $0 <version>"
    echo ""
    echo "  version   Semver version string (e.g. 0.2.0, 1.0.0)"
    echo ""
    echo "Examples:"
    echo "  $0 0.2.0"
    echo "  $0 1.0.0-beta.1"
    exit 1
fi

VERSION="$1"
TAG="v${VERSION}"

# Validate semver format
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    error "Invalid version format: '${VERSION}'. Expected semver (e.g. 0.2.0, 1.0.0-beta.1)"
fi

# ── Preflight checks ───────────────────────────────────────────────────────
info "Releasing ${BOLD}rag-debugger v${VERSION}${NC}"
echo ""

# Check we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    error "Not inside a git repository"
fi

# Check for clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
    error "Working tree is not clean. Commit or stash your changes first."
fi

# Check the tag doesn't already exist
if git rev-parse "$TAG" &>/dev/null; then
    error "Tag '${TAG}' already exists. Delete it first or pick a different version."
fi

# Check we're on main branch
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    warn "You are on branch '${CURRENT_BRANCH}', not 'main'. Continue? (y/N)"
    read -r REPLY
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# ── Files to update ────────────────────────────────────────────────────────
PYPROJECT="packages/sdk/pyproject.toml"
INIT_PY="packages/sdk/rag_debugger/__init__.py"

# Verify files exist
[[ -f "$PYPROJECT" ]] || error "File not found: $PYPROJECT"
[[ -f "$INIT_PY" ]]   || error "File not found: $INIT_PY"

# Read current version
CURRENT_VERSION=$(grep -oP 'version = "\K[^"]+' "$PYPROJECT" | head -1)
info "Current version: ${BOLD}${CURRENT_VERSION}${NC}"
info "New version:     ${BOLD}${VERSION}${NC}"
echo ""

if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
    error "Version is already set to ${VERSION}. Nothing to do."
fi

# ── Confirm ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}The following files will be updated:${NC}"
echo "  • $PYPROJECT"
echo "  • $INIT_PY"
echo ""
echo -e "A git commit and tag ${BOLD}${TAG}${NC} will be created and pushed."
echo ""
read -rp "Proceed? (y/N) " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""

# ── Update versions ────────────────────────────────────────────────────────
info "Updating ${PYPROJECT}..."
sed -i "s/^version = \".*\"/version = \"${VERSION}\"/" "$PYPROJECT"
ok "Updated pyproject.toml"

info "Updating ${INIT_PY}..."
sed -i "s/^__version__ = \".*\"/__version__ = \"${VERSION}\"/" "$INIT_PY"
ok "Updated __init__.py"

# ── Verify the build works ─────────────────────────────────────────────────
info "Verifying package build..."
cd packages/sdk
if python3 -m build --quiet 2>/dev/null; then
    ok "Package builds successfully"
else
    cd "$REPO_ROOT"
    git checkout -- "$PYPROJECT" "$INIT_PY"
    error "Build failed! Reverted version changes."
fi
cd "$REPO_ROOT"

# ── Git commit and tag ─────────────────────────────────────────────────────
info "Committing version bump..."
git add "$PYPROJECT" "$INIT_PY"
git commit -m "chore(sdk): bump version to ${VERSION}" --quiet
ok "Committed"

info "Creating tag ${TAG}..."
git tag -a "$TAG" -m "Release rag-debugger ${VERSION}"
ok "Tag created"

# ── Push ────────────────────────────────────────────────────────────────────
info "Pushing to origin..."
git push origin "$CURRENT_BRANCH" --quiet
git push origin "$TAG" --quiet
ok "Pushed commit and tag"

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}🚀 Released rag-debugger ${VERSION}${NC}"
echo ""
echo "  Tag:     ${TAG}"
echo "  Commit:  $(git rev-parse --short HEAD)"
echo "  Branch:  ${CURRENT_BRANCH}"
echo ""
echo "The GitHub Actions publish workflow will now build and publish to PyPI."
echo "Monitor progress at: https://github.com/ChanduBobbili/rag-debugger/actions"

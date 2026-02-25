FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency resolution
RUN pip install uv

# Copy project definition first to cache dependency installation
COPY pyproject.toml .
RUN uv pip install --system -e ".[dev]"

# Pre-download the sentence-transformers model during the Docker build
# This prevents a massive download from happening on the first startup
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy the rest of the application code
COPY . .

# Run the backend server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7777"]

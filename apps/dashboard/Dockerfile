FROM node:22-slim

WORKDIR /app

# Enable corepack to properly install and manage pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy the rest of the dashboard source code
COPY . .

# Run the development server
CMD ["pnpm", "dev"]

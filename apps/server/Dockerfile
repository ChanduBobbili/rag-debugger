FROM python:3.11-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml .
RUN uv pip install --system -e ".[dev]"
# Pre-download sentence-transformers model at build time
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7777"]

.PHONY: dev server dashboard test-server test clean

dev:
	docker-compose up --build

server:
	cd apps/server && uv run uvicorn main:app --host 0.0.0.0 --port 7777 --reload

dashboard:
	cd apps/dashboard && pnpm dev

test-server:
	cd apps/server && .venv/bin/python -m pytest tests/ -v

test: test-server

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type d -name .next -exec rm -rf {} +
	rm -f apps/server/data/*.duckdb
	rm -f apps/server/data/*.duckdb.wal

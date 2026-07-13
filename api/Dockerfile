FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev

FROM builder AS test
RUN uv sync --frozen --group dev
COPY tests/ tests/
ENTRYPOINT [ "uv", "run", "pytest" ]


FROM python:3.13-slim-bookworm AS runtime-base

WORKDIR /app
COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app/src

FROM runtime-base as api-runtime

EXPOSE 8000
CMD ["uvicorn", "main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]


FROM runtime-base as worker-runtime
CMD ["python", "worker.py"]
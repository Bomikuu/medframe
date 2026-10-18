FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /workspace/services/api
COPY services/api/pyproject.toml services/api/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY services/api/ ./
RUN uv sync --locked --no-dev
ENV PATH="/workspace/services/api/.venv/bin:$PATH"
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --no-access-log"]

FROM mirror.gcr.io/library/python:3.13-slim
WORKDIR /app
COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
ENV PYTHONPATH=/app/src
ENV WORKER_NAME=media-worker
CMD ["python", "src/worker.py"]

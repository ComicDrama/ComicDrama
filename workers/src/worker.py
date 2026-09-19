import os
import time

from common.logging import StructuredLogger


def run() -> None:
    worker_name = os.getenv("WORKER_NAME", "worker")
    logger = StructuredLogger(worker_name)
    logger.info("worker.started", message="worker placeholder started")
    try:
        while True:
            time.sleep(30)
    except KeyboardInterrupt:
        logger.info("worker.stopped", message="worker stopped")


if __name__ == "__main__":
    run()

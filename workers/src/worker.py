import os
import time


def run() -> None:
    worker_name = os.getenv("WORKER_NAME", "worker")
    print(f"{worker_name} placeholder started", flush=True)
    while True:
        time.sleep(30)


if __name__ == "__main__":
    run()
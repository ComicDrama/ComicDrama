from dataclasses import dataclass
from typing import Literal

TaskStatus = Literal["PENDING", "QUEUED", "RUNNING", "SUCCEEDED", "RETRYING", "FAILED", "CANCELLED"]

@dataclass(frozen=True)
class TaskPayload:
    task_id: str
    task_type: str
    project_id: str
    resource_type: str
    resource_id: str
    input_version: int
    idempotency_key: str
    priority: int
    attempt: int
    max_attempts: int
    trace_id: str
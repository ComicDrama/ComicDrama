import json
import sys
from datetime import UTC, datetime
from typing import Any


class StructuredLogger:
    """Emit one JSON object per log line for API/worker log aggregation."""

    def __init__(self, service: str):
        self.service = service

    def log(
        self,
        level: str,
        event: str,
        *,
        trace_id: str | None = None,
        task_id: str | None = None,
        error_code: str | None = None,
        message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        record: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": level,
            "service": self.service,
            "event": event,
        }
        optional_fields = {
            "traceId": trace_id,
            "taskId": task_id,
            "errorCode": error_code,
            "message": message,
            "metadata": metadata,
        }
        record.update({key: value for key, value in optional_fields.items() if value is not None})
        print(
            json.dumps(record, ensure_ascii=False, separators=(",", ":")),
            file=sys.stdout,
            flush=True,
        )

    def info(self, event: str, **kwargs: Any) -> None:
        self.log("INFO", event, **kwargs)

    def error(self, event: str, **kwargs: Any) -> None:
        self.log("ERROR", event, **kwargs)

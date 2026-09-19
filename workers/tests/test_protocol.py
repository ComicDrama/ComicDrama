import json

from common.logging import StructuredLogger
from common.protocol import TaskPayload


def test_structured_logger_emits_json(capsys):
    logger = StructuredLogger("test-worker")
    logger.info("test.event", trace_id="trace_test", task_id="task_test", metadata={"ok": True})

    output = capsys.readouterr().out.strip()
    record = json.loads(output)
    assert record["service"] == "test-worker"
    assert record["level"] == "INFO"
    assert record["event"] == "test.event"
    assert record["traceId"] == "trace_test"
    assert record["taskId"] == "task_test"
    assert record["metadata"] == {"ok": True}


def test_task_payload_is_immutable():
    payload = TaskPayload(
        task_id="task_1",
        task_type="render",
        project_id="project_1",
        resource_type="timeline",
        resource_id="timeline_1",
        input_version=1,
        idempotency_key="idem_1",
        priority=10,
        attempt=1,
        max_attempts=3,
        trace_id="trace_1",
    )
    assert payload.task_type == "render"

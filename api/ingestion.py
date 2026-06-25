"""
Ingestion patterns module.

Real-world source systems have varying integration capability — the JUSTIS Hub's
actual job is to adapt to whatever each of the 8 agencies can support. This
module illustrates three distinct patterns that feed the same normalized store.

Pattern 1 — Push / Webhook
  A modern agency system POSTs directly to the hub as events occur.
  No polling required; the hub is a passive receiver.
  Freshness: realtime (seconds to low minutes).

Pattern 2 — Queue (SQS-style)
  The agency publishes events to a durable message queue; the hub consumes at
  its own pace. Decouples producer and consumer rates — a burst of agency events
  doesn't overload the hub. Corresponds to the lambda-architecture "speed layer."
  Freshness: near-realtime (minutes, depending on consumer poll interval).

Pattern 3 — Batch Pull
  The hub polls a legacy agency endpoint on a schedule (e.g. nightly). No
  streaming capability required from the agency — a direct analogue to what a
  CABLE3/CMS-era legacy system can realistically support.
  Freshness: batch-24h (data can be up to 24 hours stale at time of access).

Data freshness is explicitly non-uniform across sources. This is a design
reality, not a limitation to paper over: "is this person currently in custody"
needs much fresher data than "historical conviction record from 2019." Labeling
records with their freshness tier makes this tradeoff visible to consumers
rather than pretending everything is real-time.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

FRESHNESS_REALTIME      = "realtime"
FRESHNESS_NEAR_REALTIME = "near-realtime"
FRESHNESS_BATCH_24H     = "batch-24h"


class IngestedRecord(BaseModel):
    id: str
    source_system: str
    agency_name: str
    subject: str            # who this record is about (display)
    event_type: str
    freshness: str          # "realtime" | "near-realtime" | "batch-24h"
    ingestion_method: str   # "push" | "queue" | "batch"
    ingested_at: str        # ISO-8601


class QueuedEvent(BaseModel):
    id: str
    source_system: str
    agency_name: str
    subject: str
    event_type: str
    queued_at: str


class PushEventRequest(BaseModel):
    source_system: str
    agency_name: str
    subject: str
    event_type: str


class BatchPullRequest(BaseModel):
    source_system: str


# ── In-memory stores ──────────────────────────────────────────────────────────

# Completed ingestion log — records from all three patterns land here.
INGESTION_LOG: list[IngestedRecord] = [
    IngestedRecord(
        id="ing-001",
        source_system="SFPD",
        agency_name="San Francisco Police Department",
        subject="DOE, JOHN MICHAEL",
        event_type="booking_created",
        freshness=FRESHNESS_REALTIME,
        ingestion_method="push",
        ingested_at="2024-04-12T02:45:00Z",
    ),
    IngestedRecord(
        id="ing-002",
        source_system="PROBATION",
        agency_name="Adult Probation Department",
        subject="Doe, Jon M.",
        event_type="intake_complete",
        freshness=FRESHNESS_NEAR_REALTIME,
        ingestion_method="queue",
        ingested_at="2024-04-14T10:22:00Z",
    ),
    IngestedRecord(
        id="ing-003",
        source_system="DA_OFFICE",
        agency_name="District Attorney's Office",
        subject="JOHN DOE",
        event_type="case_file_updated",
        freshness=FRESHNESS_BATCH_24H,
        ingestion_method="batch",
        ingested_at="2024-04-15T06:00:00Z",
    ),
]

# Pending queue — items waiting for the consumer to process them.
# Starts with one court record to illustrate the queue in its pre-consumed state.
INGESTION_QUEUE: list[QueuedEvent] = [
    QueuedEvent(
        id="q-001",
        source_system="COURTS",
        agency_name="San Francisco Superior Court",
        subject="John Doe",
        event_type="arraignment_scheduled",
        queued_at="2024-04-16T08:00:00Z",
    ),
]

_COUNTER = {"n": 4}   # ID counter — increments on each new ingested record


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _next_id() -> str:
    i = _COUNTER["n"]
    _COUNTER["n"] += 1
    return f"ing-{i:03d}"


# ── Push ─────────────────────────────────────────────────────────────────────

def handle_push_event(req: PushEventRequest) -> IngestedRecord:
    """Simulate receiving a webhook POST from a push-capable agency system."""
    record = IngestedRecord(
        id=_next_id(),
        source_system=req.source_system,
        agency_name=req.agency_name,
        subject=req.subject,
        event_type=req.event_type,
        freshness=FRESHNESS_REALTIME,
        ingestion_method="push",
        ingested_at=_now(),
    )
    INGESTION_LOG.append(record)
    return record


# ── Queue ─────────────────────────────────────────────────────────────────────

def enqueue_event(req: PushEventRequest) -> QueuedEvent:
    """Simulate SQS SendMessage — place an event on the async queue."""
    item = QueuedEvent(
        id=f"q-{uuid.uuid4().hex[:8]}",
        source_system=req.source_system,
        agency_name=req.agency_name,
        subject=req.subject,
        event_type=req.event_type,
        queued_at=_now(),
    )
    INGESTION_QUEUE.append(item)
    return item


def process_queue_item() -> Optional[IngestedRecord]:
    """
    Simulate SQS ReceiveMessage + DeleteMessage.
    Pops the oldest queue item and moves it into the ingestion log as a
    near-realtime record. Returns None if the queue is empty.
    """
    if not INGESTION_QUEUE:
        return None
    item = INGESTION_QUEUE.pop(0)
    record = IngestedRecord(
        id=_next_id(),
        source_system=item.source_system,
        agency_name=item.agency_name,
        subject=item.subject,
        event_type=item.event_type,
        freshness=FRESHNESS_NEAR_REALTIME,
        ingestion_method="queue",
        ingested_at=_now(),
    )
    INGESTION_LOG.append(record)
    return record


# ── Batch ─────────────────────────────────────────────────────────────────────

_BATCH_FIXTURE: dict[str, list[tuple[str, str, str]]] = {
    # (subject, event_type, agency_name)
    "COURTS": [
        ("Jane Smith", "case_dismissed", "San Francisco Superior Court"),
        ("Roberto Chavez", "sentencing_complete", "San Francisco Superior Court"),
    ],
    "SFPD": [
        ("Unknown Subject", "incident_report", "San Francisco Police Department"),
        ("Maria E. Rodriguez", "field_contact", "San Francisco Police Department"),
    ],
    "SHERIFF": [
        ("Mark Rodriguez", "booking_created", "San Francisco Sheriff's Department"),
        ("Doe, Jane A.", "release_processed", "San Francisco Sheriff's Department"),
    ],
}


def run_batch_pull(req: BatchPullRequest) -> list[IngestedRecord]:
    """
    Simulate a nightly batch pull from a legacy agency source.
    Returns all records pulled in this batch run.
    """
    records: list[IngestedRecord] = []
    fixtures = _BATCH_FIXTURE.get(req.source_system, [])
    for subject, event_type, agency_name in fixtures:
        r = IngestedRecord(
            id=_next_id(),
            source_system=req.source_system,
            agency_name=agency_name,
            subject=subject,
            event_type=event_type,
            freshness=FRESHNESS_BATCH_24H,
            ingestion_method="batch",
            ingested_at=_now(),
        )
        INGESTION_LOG.append(r)
        records.append(r)
    return records

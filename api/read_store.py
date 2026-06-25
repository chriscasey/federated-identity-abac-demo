"""
CQRS read-model projection.

CQRS (Command Query Responsibility Segregation) separates the write path from
the read path. Writes go to the source of truth (here: data.py, representing
the Postgres-style relational store). Reads for search and cross-agency queries
come from a derived projection (here: this module, representing an OpenSearch-
style document index).

Why two stores?
  Postgres (source of truth) — optimized for ACID transactions, referential
  integrity, and correct data. The right place to write; the wrong place to run
  full-text search or complex multi-field filters across large cross-agency
  record sets.

  OpenSearch (read projection) — optimized for fast, flexible querying and
  aggregation. The right place to search; not authoritative. A document
  that lives here is derived data, rebuilt from Postgres on a schedule or
  triggered by write events.

  Keeping the two roles separate avoids the common failure mode of treating a
  search index as a system of record: when the index is wrong or stale, you can
  rebuild it from the authoritative source without data loss.

The sync step
  sync_from_source() copies and denormalizes from data.py into READ_STORE.
  In a real system this would run on a schedule, be triggered by each commit
  to the write store, or use change-data-capture (CDC). In this demo it is
  triggered manually via the UI to make the sync step visually legible —
  including the brief window where the read store is behind the source of truth.

Eventual consistency window
  Between writes to the source of truth and completion of the next sync, the
  read store may serve slightly stale data. The SyncStatus record exposes
  last_synced_at so a consumer can decide whether the staleness is acceptable
  for their use case — the same judgment call that drives the freshness labels
  on the ingestion side.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel


class ReadProjectionRecord(BaseModel):
    """
    Denormalized identity document, optimized for search queries.

    Joins identity and agency data that lives in separate tables in the source
    of truth into a single flat document — the standard OpenSearch/Elasticsearch
    document shape. Fields like agency_name and federation_protocol are
    duplicated here intentionally: search queries can filter on them without
    a JOIN.
    """
    identity_id: str
    display_name: str
    role: str
    clearance_level: str
    agency_id: str
    agency_name: str            # denormalized from agencies table
    federation_protocol: str    # denormalized from agencies table
    searchable_text: str        # pre-computed for full-text search index


class SyncStatus(BaseModel):
    syncing: bool = False
    last_synced_at: Optional[str] = None
    record_count: int = 0
    source_record_count: int = 0


READ_STORE: list[ReadProjectionRecord] = []
_STATUS = SyncStatus()


def sync_from_source() -> SyncStatus:
    """
    Rebuild the read projection from data.py (the source of truth).

    In production this function would:
    - Be triggered by a write event (CDC from Postgres WAL) or run on a schedule
    - Handle partial failures with retries and a dead-letter queue
    - Track a sync cursor so it only processes changed records, not a full rebuild
    - Alert if the read store drifts more than a configured staleness threshold
    """
    from .data import IDENTITIES, AGENCIES

    _STATUS.syncing = True

    READ_STORE.clear()
    for identity in IDENTITIES.values():
        agency = AGENCIES.get(identity.agency_id)
        agency_name = agency.name if agency else identity.agency_id
        protocol = agency.federation_protocol if agency else "unknown"

        READ_STORE.append(ReadProjectionRecord(
            identity_id=identity.internal_id,
            display_name=identity.display_name,
            role=identity.role,
            clearance_level=identity.clearance_level,
            agency_id=identity.agency_id,
            agency_name=agency_name,
            federation_protocol=protocol,
            searchable_text=(
                f"{identity.display_name} | {agency_name} | "
                f"{identity.role} | {identity.clearance_level} | {protocol}"
            ),
        ))

    _STATUS.syncing = False
    _STATUS.last_synced_at = (
        datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )
    _STATUS.record_count = len(READ_STORE)
    _STATUS.source_record_count = len(IDENTITIES)
    return _STATUS


def get_status() -> SyncStatus:
    try:
        from .data import IDENTITIES
        _STATUS.source_record_count = len(IDENTITIES)
    except Exception:
        pass
    return _STATUS

"""
Entity resolution — weighted-attribute probabilistic matching.

This module demonstrates a different approach to the citizen identity problem
than the field-classification model in person_resolution.py. Where that module
asks "what TYPE of identifier matched?", this module asks "how CONFIDENT are
we, numerically, that these records refer to the same person?"

The two approaches are complementary:
  Field-classification (person_resolution.py):
    Better when source systems have clear, reliable unique identifiers (SSN,
    state ID). The decision is categorical — a match either is or isn't
    conclusive. Simpler to audit because the reasoning is deterministic.

  Weighted scoring (this module):
    Necessary when no shared identifier exists. Produces a 0–1 confidence
    score from a weighted combination of soft attributes (name similarity,
    DOB, address). Tunable: lower the threshold to catch more matches at the
    cost of more false positives; raise it to reduce false positives at the
    cost of missed links.

Why conservative thresholds in a justice context?
  A false positive (incorrectly linking two different people's records) could
  wrongly merge someone's criminal history with an unrelated person who shares
  a similar name or date of birth. This is substantially more harmful than a
  false negative (missing a valid link, which a human can catch via the review
  queue). The thresholds here (0.75 auto-link, 0.40 review) are conservative
  by design.

  This directly mirrors the reasoning behind the "explainability over
  sophistication" principle on the anomaly detection side: human review is
  not a failure mode, it's the safety mechanism.

Demo scenario: Maria Elena Rodriguez
  Three agencies hold records for the same person:
    SFPD:       "Rodriguez, Maria E."   DOB 1992-07-14   addr: 821 Mission St
    DA Office:  "Maria E. Rodriguez"    DOB 1992-07-14   (no address)
    Probation:  "M. Rodriguez"          DOB 1992-07-14   addr: 821 Mission Street (variant)

  A fourth record (Sheriff's Office) has the same last name and DOB but a
  different first name and different address. It goes to the review queue.

  The three Rodriguez records auto-link into a golden record. The Sheriff
  record — "Rodriguez, Mark" — requires human verification.

Connection to the JUSTIS roadmap:
  The "golden record" concept here directly mirrors the JUSTIS roadmap's
  Master Data Management (MDM) initiative (person master data, first phase),
  and the Person Based Integrated View (PBIV) that aggregates information
  about a person across agencies with role-gated access.
"""

import re
from typing import Optional
from pydantic import BaseModel


# ── Scoring configuration ─────────────────────────────────────────────────────

AUTO_LINK_THRESHOLD = 0.75   # composite score ≥ this → link to golden record
REVIEW_THRESHOLD    = 0.40   # composite score ≥ this → human review queue
                              # composite score < REVIEW_THRESHOLD → no match

NAME_WEIGHT    = 0.45
DOB_WEIGHT     = 0.40
ADDRESS_WEIGHT = 0.15        # redistributed to name if either record lacks address

_ADDRESS_STOPWORDS = {"ca", "san", "francisco", "sf", "los", "angeles"}


# ── Data models ───────────────────────────────────────────────────────────────

class CitizenRecord(BaseModel):
    """A raw identity record received from one source agency system."""
    id: str
    source_system: str
    agency_name: str
    names: list[str]
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    ssn: Optional[str] = None   # present only if agency collected and shared it


class EntityMatch(BaseModel):
    """Scoring result comparing a CitizenRecord against a GoldenRecord."""
    record_id: str
    golden_record_id: str
    name_score: float
    dob_score: float
    address_score: Optional[float]      # None if address missing from either record
    composite_score: float
    decision: str                        # "auto_link" | "review" | "no_match"
    score_breakdown: str                 # human-readable explanation


class GoldenRecord(BaseModel):
    """
    The hub's canonical view of a single real-world citizen.
    Built by linking and reconciling records from multiple agencies.

    Mirrors the JUSTIS roadmap's Master Data Management (MDM) 'person master
    data' initiative and the Person Based Integrated View (PBIV) concept.
    """
    id: str
    canonical_name: str
    date_of_birth: Optional[str] = None
    canonical_address: Optional[str] = None
    linked_record_ids: list[str]
    source_systems: list[str]


class ReviewQueueItem(BaseModel):
    """A match candidate held for human review."""
    match: EntityMatch
    citizen_record: CitizenRecord
    golden_record: GoldenRecord


# ── Mock citizen records ───────────────────────────────────────────────────────

CITIZEN_RECORDS: list[CitizenRecord] = [
    CitizenRecord(
        id="cr-001",
        source_system="SFPD",
        agency_name="San Francisco Police Department",
        names=["Rodriguez, Maria E."],
        date_of_birth="1992-07-14",
        address="821 Mission St, San Francisco, CA",
    ),
    CitizenRecord(
        id="cr-002",
        source_system="DA_OFFICE",
        agency_name="District Attorney's Office",
        names=["Maria E. Rodriguez"],
        date_of_birth="1992-07-14",
        address=None,                           # DA doesn't collect address
    ),
    CitizenRecord(
        id="cr-003",
        source_system="PROBATION",
        agency_name="Adult Probation Department",
        names=["M. Rodriguez"],
        date_of_birth="1992-07-14",
        address="821 Mission Street, SF, CA",   # street vs. St — variant
    ),
    CitizenRecord(
        id="cr-004",
        source_system="SHERIFF",
        agency_name="San Francisco Sheriff's Department",
        names=["Rodriguez, Mark"],              # different first name
        date_of_birth="1992-07-14",             # same DOB — possibly coincidental
        address="1249 Valencia St, San Francisco",
    ),
]


# ── Scoring functions ──────────────────────────────────────────────────────────

def _name_tokens(s: str) -> set[str]:
    return set(re.sub(r"[^a-z\s]", "", s.lower()).split())


def _name_score(candidate_names: list[str], canonical_name: str) -> float:
    """
    Score name similarity against a canonical name.

    Decomposes into first and last name to handle common legacy-system entry
    variations: reversed order, middle names, initials, different first names.

    Returns:
      0.90  last name matches + first name is exact
      0.75  last name matches + first name initial matches canonical first
      0.50  last name matches + first name doesn't match (different person?)
      0.00  last name not found
    """
    canon_tokens = re.sub(r"[^a-z\s]", "", canonical_name.lower()).split()
    if not canon_tokens:
        return 0.0
    canon_last  = canon_tokens[-1]
    canon_first = canon_tokens[0]

    best = 0.0
    for name in candidate_names:
        tokens = re.sub(r"[^a-z\s]", "", name.lower()).split()
        if not tokens:
            continue
        token_set = set(tokens)
        if canon_last not in token_set:
            continue                            # last name must match
        if canon_first in token_set:
            score = 0.90                        # exact first name
        elif any(len(t) == 1 and t == canon_first[0] for t in token_set):
            score = 0.75                        # initial matches
        else:
            score = 0.50                        # last name only
        best = max(best, score)

    return best


def _dob_score(candidate_dob: Optional[str], canonical_dob: Optional[str]) -> float:
    if candidate_dob and canonical_dob:
        return 1.0 if candidate_dob == canonical_dob else 0.0
    return 0.0


def _address_score(
    candidate_addr: Optional[str],
    canonical_addr: Optional[str],
) -> Optional[float]:
    """
    Token-based Jaccard similarity on address strings.
    Returns None if either address is missing — the weight is redistributed
    rather than zeroed out, to avoid penalizing agencies that don't collect
    addresses.
    """
    if not candidate_addr or not canonical_addr:
        return None
    cand  = _name_tokens(candidate_addr) - _ADDRESS_STOPWORDS
    canon = _name_tokens(canonical_addr) - _ADDRESS_STOPWORDS
    if not cand or not canon:
        return None
    return len(cand & canon) / len(cand | canon)


def score_against_golden(record: CitizenRecord, golden: GoldenRecord) -> EntityMatch:
    """Compute a weighted match score between a citizen record and a golden record."""
    ns = _name_score(record.names, golden.canonical_name)
    ds = _dob_score(record.date_of_birth, golden.date_of_birth)
    addr_s = _address_score(record.address, golden.canonical_address)

    if addr_s is None:
        # Redistribute address weight to name when address is unavailable
        composite = (NAME_WEIGHT + ADDRESS_WEIGHT) * ns + DOB_WEIGHT * ds
        addr_display = "n/a"
    else:
        composite = NAME_WEIGHT * ns + DOB_WEIGHT * ds + ADDRESS_WEIGHT * addr_s
        addr_display = f"{addr_s:.2f}"

    if composite >= AUTO_LINK_THRESHOLD:
        decision = "auto_link"
    elif composite >= REVIEW_THRESHOLD:
        decision = "review"
    else:
        decision = "no_match"

    breakdown = (
        f"name {ns:.2f} × {NAME_WEIGHT} "
        f"+ dob {ds:.2f} × {DOB_WEIGHT} "
        f"+ addr {addr_display} × {ADDRESS_WEIGHT} "
        f"= {composite:.2f}"
    )

    return EntityMatch(
        record_id=record.id,
        golden_record_id=golden.id,
        name_score=round(ns, 3),
        dob_score=round(ds, 3),
        address_score=round(addr_s, 3) if addr_s is not None else None,
        composite_score=round(composite, 3),
        decision=decision,
        score_breakdown=breakdown,
    )


# ── State initialization ───────────────────────────────────────────────────────
# cr-001 (SFPD) is the first record received and seeds the golden record.
# The remaining records are processed in order: auto-linked ones join the golden
# record; review-threshold records enter the review queue.

_INITIAL_GOLDEN = GoldenRecord(
    id="golden-rodriguez-001",
    canonical_name="Maria Elena Rodriguez",
    date_of_birth="1992-07-14",
    canonical_address="821 Mission St, San Francisco, CA",
    linked_record_ids=["cr-001"],
    source_systems=["SFPD"],
)

GOLDEN_RECORDS: dict[str, GoldenRecord] = {_INITIAL_GOLDEN.id: _INITIAL_GOLDEN}
REVIEW_QUEUE:   dict[str, ReviewQueueItem] = {}
MATCH_RESULTS:  dict[str, EntityMatch] = {}

for _r in CITIZEN_RECORDS[1:]:   # cr-001 already seeded the golden record
    _m = score_against_golden(_r, _INITIAL_GOLDEN)
    MATCH_RESULTS[_r.id] = _m
    if _m.decision == "auto_link":
        _g = GOLDEN_RECORDS[_m.golden_record_id]
        GOLDEN_RECORDS[_m.golden_record_id] = _g.model_copy(update={
            "linked_record_ids": _g.linked_record_ids + [_r.id],
            "source_systems": _g.source_systems + [_r.source_system],
        })
    elif _m.decision == "review":
        REVIEW_QUEUE[_r.id] = ReviewQueueItem(
            match=_m,
            citizen_record=_r,
            golden_record=GOLDEN_RECORDS[_m.golden_record_id],
        )


# ── State access ──────────────────────────────────────────────────────────────

class EntityResolutionState(BaseModel):
    citizen_records: list[CitizenRecord]
    golden_records: list[GoldenRecord]
    match_results: dict[str, EntityMatch]
    review_queue: list[ReviewQueueItem]
    auto_link_threshold: float
    review_threshold: float


def get_state() -> EntityResolutionState:
    return EntityResolutionState(
        citizen_records=CITIZEN_RECORDS,
        golden_records=list(GOLDEN_RECORDS.values()),
        match_results=MATCH_RESULTS,
        review_queue=list(REVIEW_QUEUE.values()),
        auto_link_threshold=AUTO_LINK_THRESHOLD,
        review_threshold=REVIEW_THRESHOLD,
    )


def approve_review(record_id: str) -> Optional[EntityResolutionState]:
    """Link the review record to its golden record and remove from queue."""
    item = REVIEW_QUEUE.get(record_id)
    if not item:
        return None
    golden_id = item.match.golden_record_id
    if golden_id in GOLDEN_RECORDS:
        g = GOLDEN_RECORDS[golden_id]
        record = next((r for r in CITIZEN_RECORDS if r.id == record_id), None)
        GOLDEN_RECORDS[golden_id] = g.model_copy(update={
            "linked_record_ids": g.linked_record_ids + [record_id],
            "source_systems": g.source_systems + (
                [record.source_system] if record else []
            ),
        })
    del REVIEW_QUEUE[record_id]
    return get_state()


def reject_review(record_id: str) -> Optional[EntityResolutionState]:
    """Remove from review queue; the record stays unlinked."""
    if record_id not in REVIEW_QUEUE:
        return None
    del REVIEW_QUEUE[record_id]
    return get_state()

"""
Person identity resolution matching engine.

Design intent
-------------
Matching is driven by a per-source-system field registry that classifies each
PII field by how uniquely identifying it is. The engine checks those fields in
priority order:

  1. Unique identifiers (SSN, state ID) — one match is conclusive. Auto-link
     immediately; no human review needed.

  2. Quasi-identifiers (DOB, address) + descriptors (name) in combination —
     enough to flag as a plausible match but not conclusive. Route to human
     review (pending).

  3. Descriptors only (name, physical description) — insufficient alone.
     No match.

This replaces a weighted point-scoring approach. The reason: numeric weights
require calibration against labeled data and tend to obscure the reasoning
behind a decision. The classification approach produces plain-language
outcomes — "auto-linked because SSN matched" or "pending because name and
date of birth matched but no unique identifier was found" — that a reviewer
or auditor can evaluate without statistical background.

Matching threshold for pending
-------------------------------
A record qualifies for pending review if it has:
  - at least one name match (exact, fuzzy, or partial), AND
  - at least one quasi-identifier match.

A matching quasi-identifier alone (e.g. shared date of birth) is not enough
to enter the review queue — DOB alone is shared by ~1/365 of the population
and would flood the queue. Name alone similarly is insufficient. The
combination creates meaningful specificity.
"""

import re
from typing import Optional
from .models import (
    MatchCandidate, MatchedField, FieldClassification,
    PersonRecord, SourceRecord, PhysicalDescription,
)
from .source_registry import REGISTRY


def _name_tokens(name: str) -> list[str]:
    return re.sub(r"[^a-z\s]", "", name.lower()).split()


def _match_name(candidate_names: list[str], canonical_name: str) -> Optional[MatchedField]:
    """
    Return the strongest name MatchedField across all candidate variants,
    or None if no meaningful overlap was found.

    Match types (strongest first):
      exact    — candidate contains all core tokens from canonical name
      fuzzy    — last name matches; first name is a recognizable variant
      partial  — last name matches; first name is an initial only (e.g. "J.")
    """
    canon_tokens = _name_tokens(canonical_name)
    canon_core = {canon_tokens[0], canon_tokens[-1]} if len(canon_tokens) >= 2 else set(canon_tokens)

    best_type: Optional[str] = None
    type_rank = {"exact": 3, "fuzzy": 2, "partial": 1}

    for name in candidate_names:
        tokens = _name_tokens(name)
        if not tokens:
            continue
        token_set = set(tokens)
        has_initial = any(len(t) == 1 for t in tokens)

        if canon_core <= token_set:
            match_type = "exact"
        elif canon_tokens[-1] in token_set and has_initial:
            match_type = "partial"
        elif canon_tokens[-1] in token_set:
            match_type = "fuzzy"
        else:
            continue

        if best_type is None or type_rank[match_type] > type_rank[best_type]:
            best_type = match_type

    if best_type is None:
        return None

    return MatchedField(
        field_name="name",
        label="Full Name",
        classification=FieldClassification.DESCRIPTOR,
        match_type=best_type,
    )


def _match_dob(candidate_dob: Optional[str], canonical_dob: Optional[str]) -> Optional[MatchedField]:
    if candidate_dob and canonical_dob and candidate_dob == canonical_dob:
        return MatchedField(
            field_name="date_of_birth",
            label="Date of Birth",
            classification=FieldClassification.QUASI_IDENTIFIER,
            match_type="exact",
        )
    return None


def _extract_height_inches(h: Optional[str]) -> Optional[int]:
    if not h:
        return None
    m = re.search(r"(\d+)['\s\-](\d+)", h)
    return int(m.group(1)) * 12 + int(m.group(2)) if m else None


def _match_physical(
    candidate_phys: Optional[PhysicalDescription],
    canonical_phys: Optional[PhysicalDescription],
) -> Optional[MatchedField]:
    if not candidate_phys or not canonical_phys:
        return None
    canon_h = _extract_height_inches(canonical_phys.height)
    cand_h = _extract_height_inches(candidate_phys.height)
    if canon_h and cand_h and abs(canon_h - cand_h) <= 2:
        return MatchedField(
            field_name="physical_description",
            label="Physical Description",
            classification=FieldClassification.DESCRIPTOR,
            match_type="exact",
        )
    return None


def score_match(source_record: SourceRecord, person: PersonRecord) -> MatchCandidate:
    """
    Evaluate a potential link between a source record and an existing canonical
    person record using the source system's field registry entry.

    Returns a MatchCandidate with:
      decision = "auto_link"  if any unique identifier matched
      decision = "pending"    if name + quasi-identifier matched, no unique ID
      decision = "no_match"   if overlap is insufficient to propose a link
    """
    registry_entry = REGISTRY.get(source_record.agency_id)
    matched_fields: list[MatchedField] = []
    decisive_field: Optional[str] = None

    # ── Step 1: check unique identifiers ─────────────────────────────────────
    if registry_entry:
        unique_fields = [
            f for f in registry_entry.fields
            if f.classification == FieldClassification.UNIQUE_IDENTIFIER
        ]
        for field_config in unique_fields:
            candidate_value = source_record.extracted.identifiers.get(field_config.field_name)
            canonical_value = person.identifiers.get(field_config.field_name)
            if candidate_value and canonical_value and candidate_value == canonical_value:
                matched_fields.append(MatchedField(
                    field_name=field_config.field_name,
                    label=field_config.label,
                    classification=FieldClassification.UNIQUE_IDENTIFIER,
                    match_type="verified",
                ))
                decisive_field = field_config.field_name

    if decisive_field:
        return MatchCandidate(
            id=f"match-{source_record.id}",
            source_record=source_record,
            person_id=person.id,
            person_name=person.canonical_name,
            decision="auto_link",
            decisive_field=decisive_field,
            matched_fields=matched_fields,
            status="auto_linked",
        )

    # ── Step 2: check quasi-identifiers and descriptors ───────────────────────
    name_match = _match_name(source_record.extracted.names, person.canonical_name)
    if name_match:
        matched_fields.append(name_match)

    dob_match = _match_dob(source_record.extracted.date_of_birth, person.date_of_birth)
    if dob_match:
        matched_fields.append(dob_match)

    phys_match = _match_physical(source_record.extracted.physical, person.physical)
    if phys_match:
        matched_fields.append(phys_match)

    has_name = any(f.field_name == "name" for f in matched_fields)
    has_quasi = any(f.classification == FieldClassification.QUASI_IDENTIFIER for f in matched_fields)

    if has_name and has_quasi:
        decision = "pending"
        status = "pending"
    else:
        decision = "no_match"
        status = "no_match"

    return MatchCandidate(
        id=f"match-{source_record.id}",
        source_record=source_record,
        person_id=person.id,
        person_name=person.canonical_name,
        decision=decision,
        decisive_field=None,
        matched_fields=matched_fields,
        status=status,
    )

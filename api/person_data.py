"""
Static mock data for the person identity resolution feature.

Each source record contains the raw text exactly as it would arrive from a
legacy agency system, alongside the structured fields the ingest pipeline
would extract. The messiness is intentional: inconsistent name spellings,
different date formats, and varying identifier schemes are the real-world
problem this pattern addresses.

Demo matching story
-------------------
SFPD booking     → creates John Doe's person record (SSN collected at booking)
Probation intake → auto-linked via SSN match
DA case notes    → pending review (name + DOB only; DA does not collect SSN)
Field contact    → pending review (partial name + verbal DOB; no SSN)

The two pending records illustrate the review workflow. The two auto-linked
records show the SSN-based conclusive match path.
"""

from .models import (
    PhysicalDescription, ExtractedFields, SourceRecord,
    PersonRecord, MatchCandidate, MatchedField, FieldClassification,
)

# ── Source records ────────────────────────────────────────────────────────────

_SFPD_BOOKING = SourceRecord(
    id="src-001",
    agency_id="SFPD",
    agency_name="San Francisco Police Department",
    raw_text=(
        "BOOKING RECORD - SFPD CENTRAL BOOKING\n"
        "Date: 04/12/2024  Time: 0214\n"
        "Booking#: 2024-04120001  Case: SF-2024-CR-00842\n"
        "Subject: DOE, JOHN MICHAEL\n"
        "Race: W  Sex: M  DOB: 03/15/1985\n"
        "SSN: 555-42-7823\n"
        "HT: 5-11  WT: 178  Hair: BRN  Eyes: BLU\n"
        "Charges: PC 459 (1st Deg Burglary), PC 211 (Robbery)\n"
        "Arresting Officer: Rivera, J. #4471"
    ),
    extracted=ExtractedFields(
        names=["John Michael Doe"],
        date_of_birth="1985-03-15",
        identifiers={"ssn": "555-42-7823"},
        physical=PhysicalDescription(
            height="5'11\"", weight="178 lbs",
            hair="Brown", eyes="Blue", race="White", sex="M",
        ),
        source_ids={"booking_number": "2024-04120001"},
        case_references=["SF-2024-CR-00842"],
    ),
    ingested_at="2024-04-12T02:45:00",
    person_id="person-doe-001",
)

_PROBATION_INTAKE = SourceRecord(
    id="src-002",
    agency_id="PROBATION",
    agency_name="Adult Probation Department",
    raw_text=(
        "ADULT PROBATION DEPT - INTAKE ASSESSMENT\n"
        "Case Worker: T. Nguyen  Date: April 14, 2024\n"
        "\n"
        "Name: Doe, Jon M.\n"
        "Date of Birth: March 15, 1985\n"
        "SSN: 555-42-7823 (verified via state ID)\n"
        "Height: 5'11\"  Weight: approx 180 lbs\n"
        "Eye color: blue  Hair color: brown\n"
        "Prior SFPD booking reference: 2024-04120001\n"
        "\n"
        "Notes: Subject presents cooperative. Prior record on file.\n"
        "Referred by DA office re: SF-2024-CR-00842."
    ),
    extracted=ExtractedFields(
        names=["Jon M. Doe"],
        date_of_birth="1985-03-15",
        identifiers={"ssn": "555-42-7823"},
        physical=PhysicalDescription(
            height="5'11\"", weight="180 lbs", hair="Brown", eyes="Blue",
        ),
        source_ids={"probation_case": "APD-2024-04140"},
        case_references=["SF-2024-CR-00842"],
    ),
    ingested_at="2024-04-14T10:22:00",
    person_id="person-doe-001",
)

# DA case notes: no SSN — DA does not routinely collect it.
# Matches on name (exact) + DOB (quasi) → pending review.
_DA_CASE_NOTES = SourceRecord(
    id="src-003",
    agency_id="DA_OFFICE",
    agency_name="District Attorney's Office",
    raw_text=(
        "DISTRICT ATTORNEY - CASE FILE NOTES\n"
        "People v. John Doe\n"
        "Assistant DA: M. Chen  Date: 04/15/2024\n"
        "\n"
        "Defendant: JOHN DOE  DOB: 3-15-85\n"
        "Physical: White male, approx 5 ft 11 in, 175-180 lbs\n"
        "Known aliases: None on file.\n"
        "Case Ref: SF-2024-CR-00842\n"
        "Booking Ref: 2024-04120001"
    ),
    extracted=ExtractedFields(
        names=["John Doe"],
        date_of_birth="1985-03-15",
        identifiers={},
        physical=PhysicalDescription(
            height="5'11\"", weight="175-180 lbs", race="White", sex="M",
        ),
        source_ids={},
        case_references=["SF-2024-CR-00842"],
    ),
    ingested_at="2024-04-15T14:08:00",
    person_id=None,   # pending — no SSN to auto-link
)

# Field contact card: partial name, verbal DOB, no SSN.
# Matches on name (partial) + DOB (quasi) → pending review.
_FIELD_CONTACT = SourceRecord(
    id="src-004",
    agency_id="SFPD",
    agency_name="San Francisco Police Department",
    raw_text=(
        "SFPD FIELD CONTACT CARD\n"
        "Date: 03/28/2024\n"
        "Officer: K. Williams #2219\n"
        "\n"
        "Subject: J. DOE (declined to provide full first name)\n"
        "DOB: 03/15/1985 -- verbal, unverified, no ID presented\n"
        "Ht: approx 5-11  Build: medium\n"
        "Location: 800 block Bryant St, San Francisco\n"
        "Circumstances: Subject contacted re: suspicious activity call\n"
        "No warrants found. No charges filed."
    ),
    extracted=ExtractedFields(
        names=["J. Doe"],
        date_of_birth="1985-03-15",
        identifiers={},
        physical=PhysicalDescription(height="5'11\""),
        source_ids={"field_contact": "FC-2024-0328-001"},
        case_references=[],
    ),
    ingested_at="2024-03-28T16:34:00",
    person_id=None,   # pending — no SSN, partial name
)

# ── Canonical person records ──────────────────────────────────────────────────

PERSON_RECORDS: dict[str, PersonRecord] = {
    "person-doe-001": PersonRecord(
        id="person-doe-001",
        canonical_name="John Michael Doe",
        date_of_birth="1985-03-15",
        aliases=["Jon M. Doe"],
        identifiers={"ssn": "555-42-7823"},
        physical=PhysicalDescription(
            height="5'11\"", weight="178 lbs",
            hair="Brown", eyes="Blue", race="White", sex="M",
        ),
        source_records=[_SFPD_BOOKING, _PROBATION_INTAKE],
    )
}

SOURCE_RECORDS: dict[str, SourceRecord] = {
    "src-001": _SFPD_BOOKING,
    "src-002": _PROBATION_INTAKE,
    "src-003": _DA_CASE_NOTES,
    "src-004": _FIELD_CONTACT,
}

# ── Match candidates ──────────────────────────────────────────────────────────
# Pre-computed for the demo. In production these are produced at ingest time
# by score_match() in person_resolution.py.

MATCH_CANDIDATES: dict[str, MatchCandidate] = {

    # DA case notes: name exact + DOB quasi, no unique identifier → pending
    "match-001": MatchCandidate(
        id="match-001",
        source_record=_DA_CASE_NOTES,
        person_id="person-doe-001",
        person_name="John Michael Doe",
        decision="pending",
        decisive_field=None,
        matched_fields=[
            MatchedField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                match_type="exact",
            ),
            MatchedField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                match_type="exact",
            ),
        ],
        status="pending",
    ),

    # Field contact card: name partial + DOB quasi, no unique identifier → pending
    "match-002": MatchCandidate(
        id="match-002",
        source_record=_FIELD_CONTACT,
        person_id="person-doe-001",
        person_name="John Michael Doe",
        decision="pending",
        decisive_field=None,
        matched_fields=[
            MatchedField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                match_type="partial",
            ),
            MatchedField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                match_type="exact",
            ),
        ],
        status="pending",
    ),
}

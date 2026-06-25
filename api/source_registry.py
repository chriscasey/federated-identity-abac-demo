"""
Source system field registry.

Each entry declares which PII fields a source system can contribute to
person identity matching, and how uniquely identifying each field is.

This is static configuration — set once per system and updated only when
a system's data collection practices change. Adding a new source system
means adding an entry here; the matching engine reads from this registry
and requires no code changes.

Field classification guide
--------------------------
unique_identifier  Sufficient alone to auto-link. SSN, state ID, fingerprint ID.
quasi_identifier   Requires combination. DOB, address. Not unique alone.
descriptor         Corroborating only. Name, physical description.

Matching threshold
------------------
A record auto-links if any unique_identifier matches the canonical person.
A record goes to pending review if name (descriptor) + at least one
quasi_identifier matches but no unique_identifier was found.
Everything else is no_match.
"""

from .models import FieldClassification, RegistryField, SourceSystemConfig

REGISTRY: dict[str, SourceSystemConfig] = {

    "SFPD": SourceSystemConfig(
        system_id="SFPD",
        display_name="San Francisco Police Department",
        description=(
            "Booking records, field contact cards, and arrest reports. "
            "SSN and DOB are collected and verified at booking via state ID check."
        ),
        fields=[
            RegistryField(
                field_name="ssn",
                label="Social Security Number",
                classification=FieldClassification.UNIQUE_IDENTIFIER,
                description="Verified against federal SSA records at booking. Sufficient alone to identify.",
            ),
            RegistryField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="Collected at booking. Verified via state ID when presented.",
            ),
            RegistryField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                description="Self-reported or from ID. Aliases common; treat as corroborating only.",
            ),
            RegistryField(
                field_name="physical_description",
                label="Physical Description",
                classification=FieldClassification.DESCRIPTOR,
                description="Officer-observed height, weight, hair, eyes. Subjective; corroborating only.",
            ),
        ],
    ),

    "DA_OFFICE": SourceSystemConfig(
        system_id="DA_OFFICE",
        display_name="District Attorney's Office",
        description=(
            "Case file notes and charging documents. The DA works primarily from "
            "court filings and SFPD booking records; SSN is not routinely collected."
        ),
        fields=[
            RegistryField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="Taken from charging documents or SFPD booking transfer. Not independently verified.",
            ),
            RegistryField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                description="From charging documents. Legal name as it appears in court filings.",
            ),
        ],
    ),

    "PROBATION": SourceSystemConfig(
        system_id="PROBATION",
        display_name="Adult Probation Department",
        description=(
            "Intake assessments and supervision records. SSN is collected and "
            "verified during intake via state ID; address is self-reported."
        ),
        fields=[
            RegistryField(
                field_name="ssn",
                label="Social Security Number",
                classification=FieldClassification.UNIQUE_IDENTIFIER,
                description="Verified via state ID at intake. Sufficient alone to identify.",
            ),
            RegistryField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="Verified via state ID at intake.",
            ),
            RegistryField(
                field_name="address",
                label="Home Address",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="Self-reported at intake. Not independently verified; may be outdated.",
            ),
            RegistryField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                description="From state ID at intake. Legal name.",
            ),
            RegistryField(
                field_name="physical_description",
                label="Physical Description",
                classification=FieldClassification.DESCRIPTOR,
                description="Staff-observed at intake. Corroborating only.",
            ),
        ],
    ),

    "COURTS": SourceSystemConfig(
        system_id="COURTS",
        display_name="San Francisco Superior Court",
        description=(
            "Court docket records and case filings. Court records identify parties "
            "by name, DOB, and address of record. SSN is not collected by the court."
        ),
        fields=[
            RegistryField(
                field_name="date_of_birth",
                label="Date of Birth",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="From court filing. Sourced from DA or defense filing; not independently verified.",
            ),
            RegistryField(
                field_name="address",
                label="Address of Record",
                classification=FieldClassification.QUASI_IDENTIFIER,
                description="Address used for court notices. May differ from current residence.",
            ),
            RegistryField(
                field_name="name",
                label="Full Name",
                classification=FieldClassification.DESCRIPTOR,
                description="Legal name as it appears in case filings.",
            ),
        ],
    ),
}

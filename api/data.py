"""
Static mock data for the demo: agencies, identities, and the single case record.

Everything here is invented for illustration purposes. The payload shapes,
field values, case details, and legal citations are plausible but fictional.

SOURCE OF TRUTH (Postgres-style role)
--------------------------------------
In the CQRS storage model this module plays the role of the Postgres source of
truth: the canonical, ACID-compliant store where normalized records live with
full referential integrity. Writes here are authoritative.

A derived read projection (read_store.py, representing an OpenSearch-style
document index) is rebuilt from this data on each sync. The read store serves
search and cross-agency queries; this module remains the authoritative source.
If the two ever disagree, this module is correct.

Real-world grounding
--------------------
The structure of this module mirrors the Common Data Repository (CDR) pattern
described in the CCSF JUSTIS 5-Year Roadmap (Gartner, 2019): a shared,
normalized data store where cross-agency records are held in a canonical form
that any authorized participant can query, subject to access control.

In a real CDR-style system:
  - AGENCIES would be a registry of participating entities with their
    federation metadata, maintained by the hub operator.
  - IDENTITIES would be the MDM person master records produced by the
    normalization layer after processing inbound agency identity tokens.
  - CASE_RECORD would be an entry in the shared case repository, with
    field-level classification tags enforced by the access engine.

Here all three are static in-memory fixtures. The specific field values,
classification rules, and legal citations are illustrative.

Structure
---------
AGENCIES     dict[agency_id → Agency]
IDENTITIES   dict[internal_id → NormalizedIdentity]
CASE_RECORD  the single CaseRecord used throughout the demo

The raw SAML/OIDC payload dicts are kept as module-level private constants so
that NormalizedIdentity.raw_payload can reference them. This lets the UI show
the before/after normalization comparison without duplicating the data.
"""

from .models import (
    Agency, NormalizedIdentity, CaseRecord, CaseField,
    Classification, FederationProtocol
)

# ---------------------------------------------------------------------------
# Agencies
# ---------------------------------------------------------------------------

AGENCIES: dict[str, Agency] = {
    "SFPD": Agency(
        id="SFPD",
        name="San Francisco Police Department",
        # Legacy enterprise environments often use SAML; SFPD represents that pattern.
        federation_protocol=FederationProtocol.SAML,
        security_contact="laso@sfpd.gov",
    ),
    "DA_OFFICE": Agency(
        id="DA_OFFICE",
        name="District Attorney's Office",
        federation_protocol=FederationProtocol.OIDC,
        security_contact="laso@sfda.gov",
    ),
    "PD_OFFICE": Agency(
        id="PD_OFFICE",
        name="Public Defender's Office",
        federation_protocol=FederationProtocol.OIDC,
        security_contact="laso@sfpd-office.gov",
    ),
}

# ---------------------------------------------------------------------------
# Raw identity payloads (kept for the normalization visualization in the UI)
#
# Notice the intentional field-name divergence between protocols:
#   SAML uses "subjectId" and "displayName" (XML attribute convention)
#   OIDC uses "sub" and "name"   (JWT claim names defined in RFC 7519)
#
# This is the real-world problem the normalization layer solves: two agencies
# can both give you a "who is this person" payload, but the field names differ
# because they followed different standards. The normalizer maps both to the
# same NormalizedIdentity shape so nothing downstream has to care.
# ---------------------------------------------------------------------------

_SFPD_SAML_PAYLOAD = {
    "agency": "SFPD",
    "subjectId": "sfpd-12345",      # SAML NameID equivalent
    "displayName": "Detective J. Rivera",
    "role": "detective",
    "clearanceLevel": "standard",
    "federationProtocol": "SAML",
}

_DA_OIDC_PAYLOAD = {
    "agency": "DA_OFFICE",
    "sub": "da-67890",              # OIDC subject claim (RFC 7519 §4.1.2)
    "name": "ADA M. Chen",
    "role": "prosecutor",
    "clearanceLevel": "standard",
    "federationProtocol": "OIDC",
}

_PD_OIDC_PAYLOAD = {
    "agency": "PD_OFFICE",
    "sub": "pd-54321",
    "name": "Deputy PD S. Alvarez",
    "role": "defense_attorney",
    "clearanceLevel": "standard",
    "federationProtocol": "OIDC",
}

# ---------------------------------------------------------------------------
# Normalized identities
#
# In a real system these would be produced at runtime by the normalizer when
# an identity token arrives. Here they are pre-built so the demo has stable
# fixtures without needing a real IdP.
# ---------------------------------------------------------------------------

IDENTITIES: dict[str, NormalizedIdentity] = {
    "sfpd-12345": NormalizedIdentity(
        internal_id="sfpd-12345",
        display_name="Detective J. Rivera",
        agency_id="SFPD",
        role="detective",
        clearance_level="standard",
        source_protocol=FederationProtocol.SAML,
        raw_payload=_SFPD_SAML_PAYLOAD,
    ),
    "da-67890": NormalizedIdentity(
        internal_id="da-67890",
        display_name="ADA M. Chen",
        agency_id="DA_OFFICE",
        role="prosecutor",
        clearance_level="standard",
        source_protocol=FederationProtocol.OIDC,
        raw_payload=_DA_OIDC_PAYLOAD,
    ),
    "pd-54321": NormalizedIdentity(
        internal_id="pd-54321",
        display_name="Deputy PD S. Alvarez",
        agency_id="PD_OFFICE",
        role="defense_attorney",
        clearance_level="standard",
        source_protocol=FederationProtocol.OIDC,
        raw_payload=_PD_OIDC_PAYLOAD,
    ),
}

# ---------------------------------------------------------------------------
# Case record
#
# A single illustrative case with seven fields, each carrying a classification
# tag and a rationale string. The rationale is non-standard for production
# data models but is included deliberately: the "why" behind a classification
# normally lives in policy docs that engineers never read. Putting it in the
# data makes the policy explicit and visible in the UI.
#
# Field classifications used:
#   shared_public      docketNumber, courtDate
#   shared_redacted    chargesFiled, evidenceLog
#   prosecution_only   prosecutionStrategyNotes
#   defense_only       defenseStrategyNotes
#   ambiguous          prisonClassificationRisk  ← intentionally unresolved
# ---------------------------------------------------------------------------

CASE_RECORD = CaseRecord(
    case_id="SF-2024-CR-00842",
    title="People v. Doe — Case SF-2024-CR-00842",
    fields=[
        CaseField(
            field_name="docketNumber",
            value="SF-2024-CR-00842",
            classification=Classification.SHARED_PUBLIC,
            rationale="Court docket numbers are public court records under California Rule of Court 2.550.",
        ),
        CaseField(
            field_name="courtDate",
            value="2024-09-15 09:00 AM — Dept. 22, Hall of Justice",
            classification=Classification.SHARED_PUBLIC,
            rationale="Scheduled hearing dates are publicly accessible in court calendars.",
        ),
        CaseField(
            field_name="chargesFiled",
            value="Count 1: PC 459 (Burglary — 1st Degree); Count 2: PC 211 (Robbery)",
            classification=Classification.SHARED_REDACTED,
            rationale=(
                "Charges are disclosed to both parties as required by Brady v. Maryland and Penal Code 859.5, "
                "but supporting offense report details are redacted for the defense pending discovery completion."
            ),
        ),
        CaseField(
            field_name="prosecutionStrategyNotes",
            value=(
                "Eyewitness credibility strong — recommend leading with physical evidence. "
                "Anticipate defense motion to suppress the 04/12 search. "
                "Prep Detective Rivera for cross on chain of custody."
            ),
            classification=Classification.PROSECUTION_ONLY,
            rationale=(
                "Attorney work product doctrine (Hickman v. Taylor) protects prosecution strategy from disclosure to opposing counsel. "
                "Sharing this with the defense would constitute a Brady violation in reverse and compromise case preparation."
            ),
        ),
        CaseField(
            field_name="defenseStrategyNotes",
            value=(
                "Challenge search warrant probable cause — affidavit relies on CI with undisclosed prior unreliability. "
                "Eyewitness ID obtained under suggestive conditions (Neil v. Biggers motion pending). "
                "Explore alibi witnesses from 04/11 evening."
            ),
            classification=Classification.DEFENSE_ONLY,
            rationale=(
                "Defense counsel's case strategy is protected under attorney-client privilege and work product doctrine. "
                "Prosecution access would violate the defendant's Sixth Amendment right to effective assistance of counsel."
            ),
        ),
        CaseField(
            field_name="evidenceLog",
            value=(
                "Item 001: Surveillance footage (04/12, 02:14 AM) — Source: [REDACTED FOR DEFENSE]\n"
                "Item 002: Fingerprint analysis — Source: SFPD Crime Lab\n"
                "Item 003: Victim statement (04/12) — Source: [REDACTED FOR DEFENSE]\n"
                "Item 004: CI tip (undisclosed) — Source: [CLASSIFIED]"
            ),
            classification=Classification.SHARED_REDACTED,
            rationale=(
                "Evidence inventory is disclosed to both parties under Brady/Giglio obligations, "
                "but the source and method of evidence collection may be redacted to protect ongoing investigations "
                "and confidential informants under Evid. Code 1041."
            ),
        ),
        CaseField(
            field_name="prisonClassificationRisk",
            value="Moderate — pending full assessment by Probation",
            # Deliberately left as AMBIGUOUS to illustrate that real systems have fields
            # that don't fit neatly into existing categories. See the "How it works" page
            # in the UI for a full explanation of the ambiguity.
            classification=Classification.AMBIGUOUS,
            rationale=(
                "This field's classification is genuinely ambiguous without more real requirements. "
                "Pre-conviction risk assessments touch both prosecution (sentencing argument) and defense (mitigation) interests, "
                "and SFPD may have a legitimate investigative interest. "
                "Real classification would require input from all three agencies and likely Adult Probation. "
                "Flagged here to illustrate that not every field has an obvious answer."
            ),
        ),
    ],
)

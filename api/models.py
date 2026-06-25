"""
Core data models for the Federated Identity ABAC Demo.

All models are Pydantic BaseModels, which gives us automatic validation,
JSON serialization, and OpenAPI schema generation via FastAPI at no extra cost.

The type hierarchy mirrors the conceptual layers of the system:
  - Identity layer:  Agency, NormalizedIdentity
  - Data layer:      CaseField, CaseRecord
  - Decision layer:  FieldAccessResult, AccessDecisionResponse
  - Anomaly layer:   AnomalyRequest, AnomalyAlert
  - API layer:       AccessDecisionRequest (request body for POST /access-decision)
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class FederationProtocol(str, Enum):
    """
    The identity protocol the source agency uses.

    Different agencies in a multi-agency system rarely agree on a single IdP
    or protocol. Rather than requiring all agencies to adopt the same standard,
    the normalization layer (see normalizer.py) accepts both and maps each to
    the common NormalizedIdentity shape.
    """
    SAML = "SAML"
    OIDC = "OIDC"


class AccessDecision(str, Enum):
    """
    The three outcomes the access decision engine can return for a single field.

    VISIBLE  — the field and its full value are shown to this identity.
    HIDDEN   — the field exists but is completely withheld; a placeholder is shown.
    REDACTED — the field is shown but with sensitive sub-content removed or masked.
               This is distinct from HIDDEN: the identity knows the field exists and
               can see non-sensitive parts of the value.
    """
    VISIBLE = "visible"
    HIDDEN = "hidden"
    REDACTED = "redacted"


class Classification(str, Enum):
    """
    The sensitivity classification tag attached to each field on a case record.

    Classifications drive every access decision in the engine. They are assigned
    by whoever prepares the data (in a real system, the data steward or policy
    admin), not by the engine itself. The engine only evaluates them.

    SHARED_PUBLIC      — visible to any authorized participant; no restrictions.
    SHARED_REDACTED    — visible to all participants, but content may be filtered
                         per role (e.g. evidence source redacted for defense).
    PROSECUTION_ONLY   — DA's Office only; hard deny for all other agencies.
    DEFENSE_ONLY       — Public Defender only; hard deny for all other agencies.
    AMBIGUOUS          — classification genuinely uncertain; access restricted
                         pending a policy decision. Included to show that not
                         every field has an obvious answer.
    """
    SHARED_PUBLIC = "shared_public"
    SHARED_REDACTED = "shared_redacted"
    PROSECUTION_ONLY = "prosecution_only"
    DEFENSE_ONLY = "defense_only"
    AMBIGUOUS = "ambiguous"


class Agency(BaseModel):
    """
    Represents one participating agency in the federated system.

    security_contact is the Local Agency Security Officer (LASO) — the
    designated person anomaly alerts route to for this agency. In a real
    CJIS-compliant deployment each agency is required to designate a LASO.
    """
    id: str
    name: str
    federation_protocol: FederationProtocol
    security_contact: str


class NormalizedIdentity(BaseModel):
    """
    The common internal identity representation after protocol-specific
    normalization has been applied.

    Regardless of whether the identity arrived via a SAML assertion or OIDC
    token, all downstream code (access engine, anomaly detector, audit log)
    works exclusively with this model. That single internal interface is the
    key architectural pattern this demo illustrates.

    raw_payload stores the original protocol payload so the UI can show the
    before/after normalization comparison. It would not exist in a production
    system — it's here for the demo's explanatory value only.
    """
    internal_id: str
    display_name: str
    agency_id: str
    role: str
    clearance_level: str
    source_protocol: FederationProtocol
    raw_payload: dict  # original SAML assertion or OIDC claims, kept for UI visualization


class CaseField(BaseModel):
    """
    A single field on a case record, with its classification and the rationale
    behind that classification.

    rationale is non-standard for a production data model but is included here
    deliberately: in a real system the "why" behind a classification lives in
    policy documentation that engineers rarely read. Embedding it in the data
    makes the policy visible and testable.
    """
    field_name: str
    value: str
    classification: Classification
    rationale: str  # the legal/policy reason this classification was chosen


class CaseRecord(BaseModel):
    """A case record composed of individually-classified fields."""
    case_id: str
    title: str
    fields: list[CaseField]


class FieldAccessResult(BaseModel):
    """
    The outcome of evaluating one identity's access to one field.

    value is None when decision is HIDDEN (the field is withheld entirely).
    When decision is REDACTED, value contains the partially-masked content.
    When decision is VISIBLE, value is the full original field value.

    reason is the human-readable explanation of why this decision was made,
    surfaced directly in the UI so the access control is never a black box.
    """
    field_name: str
    decision: AccessDecision
    value: Optional[str]  # None only when decision == HIDDEN
    reason: str


class AccessDecisionResponse(BaseModel):
    """
    The full result of evaluating one identity's access to all fields in a case.
    Returned by POST /api/access-decision.
    """
    identity_id: str
    case_id: str
    field_results: list[FieldAccessResult]


class AnomalyRequest(BaseModel):
    """
    Input for the anomaly simulation endpoint.

    In a real system these values would be derived from the actual access log
    (event count, timestamp). Here they are caller-supplied so the demo UI
    can let a user trigger different scenarios interactively.
    """
    identity_id: str
    off_hours: bool = False   # simulates an access occurring outside business hours
    access_count: int = 1     # number of records accessed in the simulated session


class AnomalyAlert(BaseModel):
    """
    The result of the anomaly evaluation, whether triggered or not.

    routed_to is the agency LASO contact the alert would be sent to.
    It is None when triggered is False — no alert means no routing.
    """
    triggered: bool
    identity_id: str
    agency_id: str
    reason: Optional[str]      # human-readable explanation of what rule fired
    routed_to: Optional[str]   # LASO security contact for the identity's agency
    simulated_events: int
    off_hours: bool


class AccessDecisionRequest(BaseModel):
    """Request body for POST /api/access-decision."""
    identity_id: str
    case_id: str

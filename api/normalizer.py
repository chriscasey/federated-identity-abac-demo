"""
Identity normalization layer — implements the MDM (Master Data Management)
pattern for person identity.

Real-world grounding
--------------------
CCSF's JUSTIS 5-Year Roadmap (Gartner, 2019) identifies person master data
as the first MDM domain: before cases, locations, or events can be linked
across agencies, a single authoritative record of "who is this person" must
be established. This module is a direct illustration of that pattern.

The core problem: different agencies use different identity protocols, which
means the same conceptual information ("who is this person") arrives with
different field names depending on the source.

    SAML assertion:  subjectId, displayName, agency, role, clearanceLevel
    OIDC token:      sub, name, agency, role, clearanceLevel

This module maps both shapes to a single NormalizedIdentity model — the
person master record. All code downstream of this point — the access engine,
anomaly detector, audit log — works only with NormalizedIdentity and never
needs to know which protocol the identity came from.

In a real system this normalization would sit within (or immediately behind)
the JUSTIS Hub integration middleware, called at the trust boundary after
token validation, not at request time. Here it is not called in the hot path
because the demo uses pre-built fixtures; it is provided as a reference
implementation of the mapping logic.
"""

from .models import NormalizedIdentity, FederationProtocol


def normalize_saml(payload: dict) -> NormalizedIdentity:
    """
    Map a SAML assertion payload to NormalizedIdentity.

    SAML assertions use XML-derived attribute naming conventions:
      - "subjectId" for the principal identifier (analogous to OIDC "sub")
      - "displayName" for the human-readable name (analogous to OIDC "name")
    """
    return NormalizedIdentity(
        internal_id=payload["subjectId"],
        display_name=payload["displayName"],
        agency_id=payload["agency"],
        role=payload["role"],
        clearance_level=payload["clearanceLevel"],
        source_protocol=FederationProtocol.SAML,
        raw_payload=payload,
    )


def normalize_oidc(payload: dict) -> NormalizedIdentity:
    """
    Map an OIDC claims payload to NormalizedIdentity.

    OIDC uses JWT claim names defined in RFC 7519:
      - "sub" (subject) for the principal identifier
      - "name" for the human-readable display name
    """
    return NormalizedIdentity(
        internal_id=payload["sub"],
        display_name=payload["name"],
        agency_id=payload["agency"],
        role=payload["role"],
        clearance_level=payload["clearanceLevel"],
        source_protocol=FederationProtocol.OIDC,
        raw_payload=payload,
    )


def normalize(payload: dict) -> NormalizedIdentity:
    """
    Dispatch to the correct protocol-specific normalizer based on the
    'federationProtocol' field present in all mock payloads.

    In a real implementation this dispatch would happen at the token validation
    layer (e.g. based on the IdP endpoint that issued the token), not by
    inspecting a field in the payload itself.

    Raises ValueError for unknown protocols so callers get an explicit failure
    rather than a subtle data error.
    """
    protocol = payload.get("federationProtocol")
    if protocol == "SAML":
        return normalize_saml(payload)
    if protocol == "OIDC":
        return normalize_oidc(payload)
    raise ValueError(f"Unknown federation protocol: {protocol}")

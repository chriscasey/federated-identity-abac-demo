"""
Attribute-based access control (ABAC) decision engine.

Real-world grounding
--------------------
This engine is a simplified illustration of the "Person Based Integrated View"
(PBIV) capability described in the CCSF JUSTIS 5-Year Roadmap (Gartner, 2019).
The roadmap describes PBIV as a cross-agency consolidated view of a person's
record, with field-level access gated by agency access level and inter-agency
MOUs (Memoranda of Understanding). Our classification tags and per-agency
allow/deny rules model exactly that gate: whether a given agency's identity
may see a given field is determined by the field's classification and the
identity's agency attributes, not by a monolithic role.

Design principles
-----------------
1. Explainability over cleverness. Every decision returns a human-readable
   reason string. The UI surfaces this directly, and a real audit system would
   store it. There is no "access denied" without a "because...".

2. Stateless evaluation. evaluate_field_access() is a pure function: same
   inputs always produce the same output, with no side effects. This makes it
   trivially testable and safe to call in parallel.

3. Classification-first, not role-first. The engine branches on the field's
   classification tag, then checks identity attributes within each branch.
   This is the ABAC pattern: policy is expressed in the data, not hardcoded
   in role hierarchies.

4. No implicit defaults. Every Classification value is handled explicitly.
   An unrecognized classification raises ValueError so new tags added to the
   enum cannot silently fall through to an allow-all or deny-all default.

Entry points
------------
evaluate_field_access()  — evaluate one identity against one field
evaluate_case_access()   — evaluate one identity against all fields in a case
"""

from .models import (
    NormalizedIdentity, CaseField, CaseRecord,
    FieldAccessResult, AccessDecisionResponse, AccessDecision, Classification
)


def _redact_for_identity(field: CaseField, identity: NormalizedIdentity) -> str:
    """
    Apply role-specific content redactions to a shared_redacted field.

    shared_redacted fields are visible to all parties but may have sub-content
    masked depending on who is asking. This function encodes the per-field
    redaction rules.

    chargesFiled
        Defense sees the charges list but not the underlying offense report
        details, which are withheld until formal discovery is complete.

    evidenceLog
        Both sides see the evidence inventory (Brady/Giglio obligations), but
        the source and collection method of certain items are redacted for the
        defense and SFPD under California Evidence Code 1041 (protecting
        confidential informants and ongoing investigation methods).
        The DA sees full source attribution because they originated the evidence.

    Any other shared_redacted field returns the value unmodified. New fields
    with their own redaction logic should add a named branch here.
    """
    value = field.value

    if field.field_name == "chargesFiled":
        if identity.agency_id == "PD_OFFICE":
            return value + "\n[Offense report details redacted — pending discovery completion]"
        return value

    if field.field_name == "evidenceLog":
        if identity.agency_id in ("PD_OFFICE", "SFPD"):
            # Walk each log entry line and redact source markers for non-DA viewers.
            lines = value.split("\n")
            redacted_lines = []
            for line in lines:
                if "Source: [REDACTED FOR DEFENSE]" in line and identity.agency_id == "PD_OFFICE":
                    # PD sees the sentinel as-is; they know something is withheld.
                    redacted_lines.append(line)
                elif "Source: [REDACTED FOR DEFENSE]" in line:
                    # SFPD gets a neutral label rather than the raw "[REDACTED FOR DEFENSE]"
                    # marker, which would be confusing for a non-legal-party viewer.
                    redacted_lines.append(line.replace("[REDACTED FOR DEFENSE]", "Confidential source on file"))
                else:
                    redacted_lines.append(line)
            return "\n".join(redacted_lines)
        # DA sees full source attribution — they originated the evidence.
        return value.replace("[REDACTED FOR DEFENSE]", "Confidential source on file")

    return value


def evaluate_field_access(identity: NormalizedIdentity, field: CaseField) -> FieldAccessResult:
    """
    Evaluate whether the given identity may access the given field.

    Returns a FieldAccessResult containing:
      - decision: VISIBLE, HIDDEN, or REDACTED
      - value:    the field value (full, masked, or None if hidden)
      - reason:   a human-readable explanation of why this decision was made

    The reason string is intentionally written for a non-technical audience
    because it is surfaced directly in the UI and would appear in audit reports.
    """
    c = field.classification

    if c == Classification.SHARED_PUBLIC:
        # No restrictions — all authorized case participants may see this field.
        return FieldAccessResult(
            field_name=field.field_name,
            decision=AccessDecision.VISIBLE,
            value=field.value,
            reason="Public to all authorized case participants.",
        )

    if c == Classification.PROSECUTION_ONLY:
        # Attorney work product; disclosure to opposing counsel is prohibited.
        if identity.agency_id == "DA_OFFICE":
            return FieldAccessResult(
                field_name=field.field_name,
                decision=AccessDecision.VISIBLE,
                value=field.value,
                reason="Restricted to prosecution. Current identity is prosecution (DA's Office).",
            )
        return FieldAccessResult(
            field_name=field.field_name,
            decision=AccessDecision.HIDDEN,
            value=None,
            reason=(
                f"Restricted to prosecution only. "
                f"Current identity ({identity.display_name}, {identity.agency_id}) is not prosecution."
            ),
        )

    if c == Classification.DEFENSE_ONLY:
        # Attorney-client privilege; prosecution access would violate Sixth Amendment rights.
        if identity.agency_id == "PD_OFFICE":
            return FieldAccessResult(
                field_name=field.field_name,
                decision=AccessDecision.VISIBLE,
                value=field.value,
                reason="Restricted to defense. Current identity is defense (Public Defender's Office).",
            )
        return FieldAccessResult(
            field_name=field.field_name,
            decision=AccessDecision.HIDDEN,
            value=None,
            reason=(
                f"Restricted to defense only. "
                f"Current identity ({identity.display_name}, {identity.agency_id}) is not defense."
            ),
        )

    if c == Classification.SHARED_REDACTED:
        # All parties see this field, but content is filtered based on their agency.
        redacted_value = _redact_for_identity(field, identity)
        return FieldAccessResult(
            field_name=field.field_name,
            decision=AccessDecision.REDACTED,
            value=redacted_value,
            reason="Shared field with role-based redaction applied per agency access rules.",
        )

    if c == Classification.AMBIGUOUS:
        # Restrict access until the classification is resolved through policy review.
        # Returning REDACTED rather than HIDDEN so the UI shows the field exists
        # and the user can read the explanation — the ambiguity is itself informative.
        return FieldAccessResult(
            field_name=field.field_name,
            decision=AccessDecision.REDACTED,
            value="[Pending classification decision]",
            reason=(
                "This field's classification is genuinely ambiguous. "
                "Access is restricted pending a requirements review with all stakeholder agencies."
            ),
        )

    # Guard against future Classification values that weren't handled above.
    raise ValueError(f"Unhandled classification: {c}")


def evaluate_case_access(identity: NormalizedIdentity, case: CaseRecord) -> AccessDecisionResponse:
    """
    Evaluate the given identity's access to every field in a case record.

    This is the primary entry point called by the API route. It applies
    evaluate_field_access() independently to each field; fields do not
    affect each other's decisions.
    """
    return AccessDecisionResponse(
        identity_id=identity.internal_id,
        case_id=case.case_id,
        field_results=[evaluate_field_access(identity, f) for f in case.fields],
    )

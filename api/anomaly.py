"""
Rule-based anomaly detection.

Design intent
-------------
This detector is intentionally simple and non-ML. In a justice-data context,
explainability matters more than sophistication: an analyst or LASO must be
able to understand exactly why an alert was generated and justify that
explanation in a legal or compliance context. A neural net score of 0.87
cannot do that; "7 records accessed in one session (threshold: 5)" can.

Two rules are implemented, each triggering independently:

  BULK_ACCESS   access_count > BULK_ACCESS_THRESHOLD
  OFF_HOURS     off_hours == True  (caller asserts the access was after hours)

Either rule alone is sufficient to trigger an alert. When both fire, both
reasons are included in the alert so the reviewer has the full picture.

Alert routing
-------------
Anomaly alerts are routed to the LASO (Local Agency Security Officer) of the
identity's agency, not to a central security team. This mirrors real CJIS
policy: each agency is responsible for monitoring its own personnel's access,
with the LASO as the designated point of contact.

In a real system, evaluate_anomaly() would publish to an alerting queue
(e.g. PagerDuty, SIEM). Here it returns the alert payload so the demo UI
can display it directly.
"""

from .models import AnomalyAlert, AnomalyRequest
from .data import AGENCIES, IDENTITIES

# Threshold for bulk-access detection. Set low (5) so the demo is easy to
# trigger. In a real deployment this would be tuned per role against a
# behavioral baseline (e.g. average records accessed per session per role).
BULK_ACCESS_THRESHOLD = 5


def evaluate_anomaly(request: AnomalyRequest) -> AnomalyAlert:
    """
    Evaluate a simulated access session for anomalous patterns.

    Parameters
    ----------
    request.identity_id   The identity performing the access.
    request.access_count  Number of records accessed in the simulated session.
    request.off_hours     True if the access occurred outside business hours.

    Returns an AnomalyAlert. triggered=False means neither rule fired and
    no alert would be routed. triggered=True means at least one rule fired;
    reason and routed_to are populated with the details.

    Raises ValueError if identity_id does not exist in IDENTITIES, so the
    API layer can translate this to a 404 rather than a 500.
    """
    identity = IDENTITIES.get(request.identity_id)
    if identity is None:
        raise ValueError(f"Unknown identity: {request.identity_id}")

    agency = AGENCIES[identity.agency_id]

    triggered = request.access_count > BULK_ACCESS_THRESHOLD or request.off_hours

    # Build a list of reason strings for each rule that fired, then join them.
    # Keeping reasons separate makes it easy to add new rules without changing
    # the joining logic.
    reasons = []
    if request.access_count > BULK_ACCESS_THRESHOLD:
        reasons.append(
            f"Bulk access detected: {request.access_count} records accessed "
            f"(threshold: {BULK_ACCESS_THRESHOLD})"
        )
    if request.off_hours:
        reasons.append("Access outside normal business hours (simulated: 02:14 AM)")

    return AnomalyAlert(
        triggered=triggered,
        identity_id=identity.internal_id,
        agency_id=identity.agency_id,
        reason="; ".join(reasons) if reasons else None,
        routed_to=agency.security_contact if triggered else None,
        simulated_events=request.access_count,
        off_hours=request.off_hours,
    )

# Federated Identity & ABAC Demo

A proof-of-concept demonstrating multi-agency identity federation and attribute-based access control (ABAC) patterns, built as an illustrative exercise in multi-agency access control architecture.

**This is not a real system specification.** All agencies, case data, identities, and business rules are invented for illustration purposes. No non-public information was used in building this demo.

## What it demonstrates

1. **Multi-protocol identity federation** — SAML and OIDC payloads normalized into one internal identity model
2. **Attribute-based access control** — field-level filtering on a shared case record based on identity attributes and data classification tags
3. **Explainable access decisions** — every field shows *why* it was shown, hidden, or redacted for the current identity
4. **Rule-based anomaly detection** — simple, interpretable thresholds (not ML), with per-agency alert routing to a mock security contact
5. **Audit logging** — every access decision is logged with enough context to support a real investigation

## Running locally

### Backend (FastAPI)

```bash
cd federated-identity-abac-demo
python -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
uvicorn api.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. The Vite dev server proxies `/api/*` to the FastAPI backend automatically.

## Project structure

```
api/                  FastAPI backend
  main.py             Routes
  models.py           Pydantic data models
  data.py             Mock agencies, identities, case record
  access_engine.py    ABAC decision logic
  normalizer.py       SAML/OIDC → NormalizedIdentity
  anomaly.py          Rule-based anomaly detection

netlify/functions/
  api.py              Mangum wrapper — exposes FastAPI as a Netlify Function

frontend/src/
  App.tsx             Root component and state
  api.ts              Typed API client
  types.ts            TypeScript types (mirror of Pydantic models)
  components/         IdentitySwitcher, CaseRecordView, FieldRow,
                      AnomalyPanel, AuditLogPanel
```

## Deployment

Configured for Netlify via `netlify.toml`. The React app is the static frontend; the FastAPI backend runs as a Netlify Function via `mangum`.

```bash
# Build the frontend
cd frontend && npm run build
```

Then deploy the project root to Netlify (or connect the GitHub repo and let Netlify build automatically).

## Real-world grounding

The architecture and terminology in this PoC draw from a real public document:
**CCSF JUSTIS 5-Year Roadmap and Implementation Plan** (Gartner, 2019),
publicly available via sf.gov.

**Important caveats:**
- The document is approximately six years old and describes an *intended future state as of 2019*, not necessarily the current actual JUSTIS system.
- Specific business rules, data classifications, and field-level access logic in this PoC remain invented and illustrative — current implementation details are not public.

The following terms from that document are used to ground the demo's architecture:

| Term | Meaning in the roadmap | How it maps to this PoC |
|------|------------------------|-------------------------|
| **JUSTIS Hub** | Central integration middleware connecting all 8 participating agencies | The FastAPI service (`main.py`) acts as the hub-style integration point — the single entry point through which all identity normalization and access decisions flow |
| **Common Data Repository (CDR)** | Shared normalized data store for cross-agency records | The mock agency registry, person master records, and case record in `data.py` mirror this pattern |
| **Master Data Management (MDM)** | Person master data identified as the first MDM domain in the roadmap | The identity normalization layer (`normalizer.py`) implements exactly this: taking divergent agency identity payloads and producing a single canonical person record |
| **Person Based Integrated View (PBIV)** | Cross-agency consolidated view of a person's record, with field-level access gated by agency access level and inter-agency MOUs | The access decision engine (`access_engine.py`) is a simplified illustration of the PBIV access gate |
| **CJIS** | Criminal Justice Information Services — the FBI compliance framework governing criminal justice data handling | Referenced as the real-world compliance backdrop; this PoC addresses the access control modeling layer, not full CJIS technical controls |

## Design decisions I'd revisit with real requirements

- The `prisonClassificationRisk` field is intentionally left in an `ambiguous` classification state — in a real system, this would require input from all stakeholder agencies and legal review before classification.
- The audit log is session-scoped (React state). A real system would require an immutable, append-only, centrally stored log with tamper detection.
- Anomaly detection uses simple count/time thresholds. A real system would benefit from behavioral baselines and cross-agency pattern correlation, though explainability would remain a priority.
- Identity payloads are mocked/hardcoded. A real implementation would integrate with actual SAML IdPs and OIDC providers, with token validation.

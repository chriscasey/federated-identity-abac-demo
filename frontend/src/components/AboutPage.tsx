export function AboutPage() {
  return (
    <div className="about-page">

      <section className="about-section">
        <h2>What this demonstrates</h2>
        <div className="about-cards">
          <div className="about-card">
            <div className="about-card-num">01</div>
            <strong>Multi-protocol identity federation</strong>
            <p>
              Two identity protocols (SAML and OIDC) are normalized into a single internal
              identity model before any access decision is made. The demo shows the raw
              protocol payload side-by-side with the normalized result — toggle "Show raw
              payload" on any identity to see this.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">02</div>
            <strong>Attribute-based access control (ABAC)</strong>
            <p>
              Access is not determined by role alone. Each field on the case record carries a
              classification tag, and each access decision evaluates the combination of the
              identity's agency, role, and clearance level against that tag. The same field
              can produce three different outcomes for three different identities.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">03</div>
            <strong>Explainable access decisions</strong>
            <p>
              Every field shows <em>why</em> it was shown, hidden, or redacted — not just the
              result. This includes both the runtime access reason (based on the current
              identity) and the classification rationale (the legal or policy logic behind
              the tag). Click "why?" on any field in the demo.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">04</div>
            <strong>Rule-based anomaly detection</strong>
            <p>
              A deliberately simple, interpretable rule set: flag if access count exceeds a
              threshold, or if access occurs off-hours. No ML, by design — explainability
              matters more than sophistication in a justice-data context. Anomalies route an
              alert to the flagged identity's agency-level security contact (LASO).
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">05</div>
            <strong>Audit logging</strong>
            <p>
              Every access decision is appended to a log with enough context to support a
              real investigation: timestamp, identity, agency, case, field, decision, and the
              reason. Visible in the Audit Log panel at the bottom of the demo.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Architecture</h2>
        <div className="arch-flow">
          <div className="arch-box arch-source">
            <div className="arch-label">Agency Identity Sources</div>
            <div className="arch-items">
              <span className="arch-tag">SFPD · SAML assertion</span>
              <span className="arch-tag">DA's Office · OIDC claims</span>
              <span className="arch-tag">Public Defender · OIDC claims</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-norm">
            <div className="arch-label">Hub Integration / MDM Layer</div>
            <div className="arch-items">
              <span className="arch-detail">JUSTIS Hub-style central integration</span>
              <span className="arch-detail">Normalizes divergent protocol payloads</span>
              <span className="arch-detail">into a person master record (MDM)</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-engine">
            <div className="arch-label">Access Decision Engine</div>
            <div className="arch-items">
              <span className="arch-detail">Person Based Integrated View (PBIV)</span>
              <span className="arch-detail">Field access gated by agency level</span>
              <span className="arch-detail">and inter-agency MOU rules</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-output">
            <div className="arch-label">Filtered Case View</div>
            <div className="arch-items">
              <span className="arch-detail">CDR-style shared record</span>
              <span className="arch-detail">Visible / Redacted / Hidden</span>
              <span className="arch-detail">with inline explanations</span>
            </div>
          </div>
        </div>
        <div className="arch-side">
          <div className="arch-side-box">
            <div className="arch-label">Anomaly Detector</div>
            <div className="arch-items">
              <span className="arch-detail">Runs alongside access decisions</span>
              <span className="arch-detail">Routes alerts to agency LASO</span>
            </div>
          </div>
          <div className="arch-side-box">
            <div className="arch-label">Audit Log</div>
            <div className="arch-items">
              <span className="arch-detail">Appends every decision</span>
              <span className="arch-detail">with full context</span>
            </div>
          </div>
        </div>
        <p className="arch-source-note">
          Architecture terminology draws from the{' '}
          <strong>CCSF JUSTIS 5-Year Roadmap and Implementation Plan</strong>{' '}
          (Gartner, 2019, publicly available via sf.gov). That document is approximately
          six years old and describes an intended future state — it may not reflect the
          current system. Specific business rules and field-level logic in this PoC are
          illustrative.
        </p>
      </section>

      <section className="about-section">
        <h2>The three identities</h2>
        <div className="identity-table">
          <div className="id-row id-row-header">
            <span>Identity</span>
            <span>Agency</span>
            <span>Protocol</span>
            <span>Key payload field</span>
          </div>
          <div className="id-row">
            <span>Detective J. Rivera</span>
            <span>SFPD</span>
            <span className="proto-tag proto-saml">SAML</span>
            <span><code>subjectId</code> → <code>internal_id</code></span>
          </div>
          <div className="id-row">
            <span>ADA M. Chen</span>
            <span>DA's Office</span>
            <span className="proto-tag proto-oidc">OIDC</span>
            <span><code>sub</code> → <code>internal_id</code></span>
          </div>
          <div className="id-row">
            <span>Deputy PD S. Alvarez</span>
            <span>Public Defender</span>
            <span className="proto-tag proto-oidc">OIDC</span>
            <span><code>sub</code> → <code>internal_id</code></span>
          </div>
        </div>
        <p className="about-note">
          SFPD uses SAML (common in legacy enterprise environments); both DA and Public
          Defender use OIDC. Different field names for the same concepts (e.g.{' '}
          <code>subjectId</code> vs <code>sub</code>) are intentional — the normalization
          layer's job is to hide this.
        </p>
      </section>

      <section className="about-section">
        <h2>Field classifications and what they mean</h2>
        <div className="class-table">
          <div className="class-row">
            <span className="class-tag class-public">shared_public</span>
            <span>Visible to all three agencies. Court docket numbers, scheduled hearing dates.</span>
          </div>
          <div className="class-row">
            <span className="class-tag class-redacted">shared_redacted</span>
            <span>
              Both sides see the field, but with role-specific content removed. The charges
              list is visible to everyone, but the underlying offense report is redacted for
              the defense until discovery completes. Evidence log entries are visible, but
              source/method may be redacted to protect confidential informants.
            </span>
          </div>
          <div className="class-row">
            <span className="class-tag class-prosecution">prosecution_only</span>
            <span>
              DA's Office only. Hard deny for Public Defender and SFPD. Protects attorney
              work product (Hickman v. Taylor) and prevents Brady violations.
            </span>
          </div>
          <div className="class-row">
            <span className="class-tag class-defense">defense_only</span>
            <span>
              Public Defender only. Hard deny for DA and SFPD. Protects attorney-client
              privilege and the defendant's Sixth Amendment right to effective counsel.
            </span>
          </div>
          <div className="class-row">
            <span className="class-tag class-ambiguous">ambiguous</span>
            <span>
              Intentionally left unresolved. The pre-trial risk classification field touches
              prosecution (sentencing), defense (mitigation), and law enforcement (investigation)
              interests simultaneously. In a real system this would require multi-agency input
              and legal review before a classification could be assigned. Flagged here to show
              that not every field has an obvious answer.
            </span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Anomaly detection logic</h2>
        <p className="about-body">
          The anomaly detector applies two simple, independently-triggering rules:
        </p>
        <div className="rule-list">
          <div className="rule-row">
            <span className="rule-name">Bulk access</span>
            <span>
              If the simulated access count exceeds 5 records, an anomaly is flagged. The
              threshold is intentionally low for demo purposes — in a real system it would be
              calibrated against behavioral baselines per role and time period.
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-name">Off-hours</span>
            <span>
              If the "off-hours" flag is set (simulating a 02:14 AM access), an anomaly is
              flagged regardless of volume. Off-hours access to sensitive case data is a
              well-known indicator of credential compromise or insider threat.
            </span>
          </div>
        </div>
        <p className="about-body" style={{ marginTop: '12px' }}>
          On trigger, the alert payload includes the identity, agency, reason, and the
          agency-level security contact (LASO) the alert would be routed to. No ML is used —
          a deliberate choice. Rule-based systems are auditable and explainable; a
          justice-data context demands that an officer can understand exactly why an alert
          was generated.
        </p>
      </section>

      <section className="about-section">
        <h2>What's intentionally out of scope</h2>
        <ul className="about-list">
          <li>
            <strong>Real SAML/OIDC handshakes.</strong> Identity payloads are mocked and
            hardcoded. A real implementation would integrate with actual IdPs and validate tokens.
          </li>
          <li>
            <strong>Full CJIS technical controls.</strong> This demo addresses the access
            control and identity modeling layer, not encryption implementation, FIPS-validated
            modules, or network security controls.
          </li>
          <li>
            <strong>Machine learning anomaly detection.</strong> Intentionally avoided.
            Explainability matters more than sophistication here.
          </li>
          <li>
            <strong>Persistent audit log.</strong> The audit log is session-scoped React state.
            A real system would require an immutable, append-only, centrally stored log with
            tamper detection and retention policies.
          </li>
          <li>
            <strong>Multiple cases or records.</strong> One illustrative case is enough to
            demonstrate the access control patterns. Extending to multiple records is
            straightforward — the engine is stateless per-evaluation.
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Stack</h2>
        <div className="stack-row">
          <div className="stack-item">
            <span className="stack-label">Backend</span>
            <span>Python · FastAPI · Pydantic</span>
          </div>
          <div className="stack-item">
            <span className="stack-label">Frontend</span>
            <span>React · TypeScript · Vite</span>
          </div>
          <div className="stack-item">
            <span className="stack-label">Deploy</span>
            <span>Netlify (static frontend + Python serverless function via Mangum)</span>
          </div>
        </div>
      </section>

    </div>
  )
}

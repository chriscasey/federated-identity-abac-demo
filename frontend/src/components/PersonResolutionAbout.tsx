export function PersonResolutionAbout() {
  return (
    <div className="about-page">

      <section className="about-section">
        <h2>What this demonstrates</h2>
        <div className="about-cards">
          <div className="about-card">
            <div className="about-card-num">01</div>
            <strong>Cross-agency person linkage</strong>
            <p>
              A citizen may appear in records across multiple agency systems — entered
              at different times, by different staff, using different formats and
              identifier schemes. This view shows how a hub-level person record links
              those source records together into a single unified view while preserving
              full provenance: which agency said what, and in what form.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">02</div>
            <strong>Unstructured data ingestion</strong>
            <p>
              Source records arrive as free-form text from legacy agency systems —
              not structured JSON or database exports. Each record is preserved
              verbatim alongside the structured fields the ingest pipeline extracted
              from it. Toggle "Show source text" on any record card to see the
              raw-to-structured transformation.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">03</div>
            <strong>Field-classification matching</strong>
            <p>
              Incoming records are matched against existing person records using a
              per-source-system field registry. Each field is classified by how
              uniquely identifying it is — not by a numeric weight. The matching
              decision (auto-link, pending review, or no match) is derived from
              the types of fields that matched, not an aggregate score.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">04</div>
            <strong>Human-in-the-loop review</strong>
            <p>
              Records without a unique identifier match are held for a human
              reviewer rather than linked automatically. The reviewer sees a
              side-by-side comparison of the incoming record and the candidate
              person, the classification of each matched field, and the raw source
              text — then approves or rejects the link.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>How a record moves through the system</h2>
        <div className="arch-flow">
          <div className="arch-box arch-source">
            <div className="arch-label">Source System</div>
            <div className="arch-items">
              <span className="arch-detail">Legacy agency system</span>
              <span className="arch-detail">Free-form text output</span>
              <span className="arch-detail">(booking record, intake form, field card)</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-norm">
            <div className="arch-label">Ingest / Extraction</div>
            <div className="arch-items">
              <span className="arch-detail">Raw text preserved verbatim</span>
              <span className="arch-detail">Structured fields extracted:</span>
              <span className="arch-detail">name, DOB, identifiers, IDs</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-engine">
            <div className="arch-label">Matching Engine</div>
            <div className="arch-items">
              <span className="arch-detail">Registry lookup for source system</span>
              <span className="arch-detail">Unique ID match → auto-link</span>
              <span className="arch-detail">Name + quasi-ID → review queue</span>
            </div>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-box arch-output">
            <div className="arch-label">Person Record</div>
            <div className="arch-items">
              <span className="arch-detail">Canonical hub-level record</span>
              <span className="arch-detail">All linked source records</span>
              <span className="arch-detail">with full provenance</span>
            </div>
          </div>
        </div>
        <div className="arch-side">
          <div className="arch-side-box">
            <div className="arch-label">Review Queue</div>
            <div className="arch-items">
              <span className="arch-detail">Pending records held here</span>
              <span className="arch-detail">Human approves or rejects</span>
            </div>
          </div>
        </div>
        <p className="arch-source-note">
          This pattern mirrors the Master Data Management (MDM) / Common Data
          Repository (CDR) concept from the{' '}
          <strong>CCSF JUSTIS 5-Year Roadmap and Implementation Plan</strong>{' '}
          (Gartner, 2019, publicly available via sf.gov): a hub-level canonical
          record for each person, built by linking and reconciling records from
          disparate agency feeder systems.
        </p>
      </section>

      <section className="about-section">
        <h2>Field classification</h2>
        <p className="about-body">
          The registry classifies each PII field by how uniquely identifying it is.
          This determines the matching outcome — not a numeric weight:
        </p>
        <div className="class-table" style={{ marginTop: '14px' }}>
          <div className="class-row">
            <span className="field-class-badge badge-unique" style={{ minWidth: '120px', textAlign: 'center' }}>
              Unique Identifier
            </span>
            <div>
              <strong>One match is conclusive.</strong> Only one person holds this value.
              Social Security Number (SSN), state ID number, fingerprint identifier.
              A record auto-links immediately when a unique identifier matches — no
              human review required. In the demo: SFPD and Adult Probation collect
              and verify SSN at intake.
            </div>
          </div>
          <div className="class-row">
            <span className="field-class-badge badge-quasi" style={{ minWidth: '120px', textAlign: 'center' }}>
              Quasi-Identifier
            </span>
            <div>
              <strong>Requires combination.</strong> Not unique alone, but a name match
              plus one or more quasi-identifiers creates meaningful specificity.
              Date of birth, home address. Many people share any one value;
              far fewer share two together. Records with name + quasi-identifier
              but no unique identifier route to human review.
            </div>
          </div>
          <div className="class-row">
            <span className="field-class-badge badge-descriptor" style={{ minWidth: '120px', textAlign: 'center' }}>
              Descriptor
            </span>
            <div>
              <strong>Corroborating only.</strong> Low discriminating power on its own.
              Full name, physical description. Useful to confirm a match a reviewer is
              already confident about, but never sufficient alone — a name match covers
              too many people. Descriptors contribute to a match basis but do not
              determine the outcome.
            </div>
          </div>
        </div>
        <div className="pattern-refs">
          <div className="pattern-refs-label">Patterns referenced — DDIA (Kleppmann)</div>
          <div className="pattern-ref-row">
            <span className="pattern-ref-name">Record Linkage</span>
            <span className="pattern-ref-book">DDIA · Ch. 10</span>
            <span className="pattern-ref-note">identifying that records across disparate systems refer to the same real-world entity, without a shared identifier</span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Matching outcomes</h2>
        <div className="rule-list">
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>Auto-link</span>
            <span>
              Any unique identifier (SSN, state ID) in the incoming record matches
              the canonical person. Conclusive — the record is linked automatically
              without human review. In the demo, the Probation intake record carries
              an SSN matching the canonical record, so it auto-links.
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>Pending review</span>
            <span>
              Name matched at any tier (exact, fuzzy, or partial) and at least one
              quasi-identifier matched, but no unique identifier was found. Possible
              match — routes to a human reviewer. In the demo, the DA case notes and
              the field contact card both match on name + date of birth but have no
              SSN, so both sit in the review queue.
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>No match</span>
            <span>
              Overlap is insufficient to propose a link: only descriptors matched
              without any quasi-identifier, or nothing meaningful matched at all. The
              record is treated as a new, unlinked entry — either a genuinely new
              person or a record that needs manual investigation.
            </span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>The demo records</h2>
        <div className="identity-table">
          <div className="id-row id-row-header">
            <span>Record</span>
            <span>Source</span>
            <span>Name as received</span>
            <span>Outcome</span>
          </div>
          <div className="id-row">
            <span>SFPD Booking</span>
            <span>San Francisco Police Department</span>
            <span><code>DOE, JOHN MICHAEL</code></span>
            <span>Creates person record (SSN collected)</span>
          </div>
          <div className="id-row">
            <span>Probation Intake</span>
            <span>Adult Probation Department</span>
            <span><code>Doe, Jon M.</code></span>
            <span>Auto-linked — SSN match</span>
          </div>
          <div className="id-row">
            <span>DA Case Notes</span>
            <span>District Attorney's Office</span>
            <span><code>JOHN DOE</code></span>
            <span>Pending — name (exact) + DOB, no SSN</span>
          </div>
          <div className="id-row">
            <span>Field Contact Card</span>
            <span>San Francisco Police Department</span>
            <span><code>J. DOE</code></span>
            <span>Pending — name (partial) + DOB, no SSN</span>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Why field classification instead of weights</h2>
        <p className="about-body">
          A weighted scoring approach (SSN = 60 points, DOB = 40 points, etc.) is
          flexible but creates two problems in a justice context. First, the weights
          require calibration against labeled ground-truth data — data that is rarely
          available and tends to encode historical bias. Second, the numeric score is
          difficult to explain to a reviewer or auditor: "this record scored 65" is
          harder to reason about than "this record matched on date of birth but has no
          unique identifier."
        </p>
        <p className="about-body">
          Field classification produces decisions that are directly traceable to the
          nature of the fields that matched. "Auto-linked because SSN matched" is
          auditable without statistical background. "Pending because name and date of
          birth matched but no unique identifier was found" tells the reviewer exactly
          what to verify.
        </p>
      </section>

      <section className="about-section">
        <h2>What's intentionally out of scope</h2>
        <ul className="about-list">
          <li>
            <strong>Phonetic name matching.</strong> Production systems often use Soundex
            or NYSIIS to catch phonetic variants ("Smith" / "Smyth"). This demo uses
            token-based string matching only — sufficient to illustrate the concept
            without requiring an external library.
          </li>
          <li>
            <strong>Multiple person records.</strong> The demo has one person (John Doe)
            to keep the signal clear. A real hub would hold records for every person who
            has appeared in any participating agency system.
          </li>
          <li>
            <strong>Persistent state across sessions.</strong> Approved and rejected matches
            are tracked in client state only. A page refresh restores the initial demo
            state. A real system would persist decisions to a database and audit log every
            action with the reviewer's identity.
          </li>
          <li>
            <strong>Real extraction pipeline.</strong> The structured fields in the demo
            were manually extracted and stored with the mock data. A production ingest
            pipeline would apply Natural Language Processing (NLP) parsing, regular
            expression patterns, and field-specific normalizers to extract and standardize
            fields from raw text at ingest time.
          </li>
        </ul>
      </section>

    </div>
  )
}

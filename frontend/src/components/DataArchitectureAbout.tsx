export function DataArchitectureAbout() {
  return (
    <div className="about-page">

      <section className="about-section">
        <h2>What this demonstrates</h2>
        <div className="about-cards">
          <div className="about-card">
            <div className="about-card-num">01</div>
            <strong>Push / queue / batch ingestion</strong>
            <p>
              Not every agency can push data in real time. The hub adapts to each
              source's actual capability — a webhook for modern systems, a message
              queue for asynchronous producers, and a nightly batch pull for legacy
              systems that can only be queried on a schedule. All three paths converge
              on the same normalized store, each tagged with its freshness guarantee.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">02</div>
            <strong>CQRS storage pattern</strong>
            <p>
              Writes go to the source of truth (Postgres-style relational store). Reads
              for search and cross-agency queries come from a derived projection
              (OpenSearch-style index). A sync step denormalizes records from the write
              store into the read store. The two roles are optimized differently and kept
              explicitly separate.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">03</div>
            <strong>Probabilistic entity resolution</strong>
            <p>
              When source records share no common identifier, a weighted confidence
              score (name similarity, date of birth, address overlap) determines whether
              to auto-link to a golden record or route to human review. The threshold is
              conservative by design: in a justice context, a false match is more costly
              than a missed one.
            </p>
          </div>
          <div className="about-card">
            <div className="about-card-num">04</div>
            <strong>Two entity resolution approaches</strong>
            <p>
              The Person Records tab shows field-classification matching (deterministic —
              does a unique identifier exist?). This tab shows weighted-attribute matching
              (probabilistic — what is the confidence score?). Both produce a golden
              record and a review queue; they differ in when they apply and how they
              explain their reasoning.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Ingestion patterns: why all three?</h2>
        <div className="rule-list">
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>Push / Webhook</span>
            <span>
              Modern agency systems that can emit events immediately. The hub is a
              passive receiver; no polling overhead. Data arrives within seconds.
              Corresponds to the lambda-architecture speed layer.
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>Queue (SQS)</span>
            <span>
              Agencies that can publish to a durable queue but cannot call the hub
              directly. The queue decouples producer and consumer rates — a burst of
              agency events doesn't overload the hub. Near-realtime (minutes).
              A retryable buffer between the agency and the hub.
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-name" style={{ width: '140px' }}>Batch Pull</span>
            <span>
              Legacy systems (a CABLE3/CMS-era system, for instance) that can only
              export a full snapshot on a schedule. The hub polls on a nightly cron.
              Data can be up to 24 hours stale. Not a limitation to hide — it is a
              design reality that consumers need to account for.
            </span>
          </div>
        </div>
        <p className="about-body" style={{ marginTop: 16 }}>
          The key principle is that <strong>data freshness is not uniform across sources</strong>{' '}
          and the system should make this explicit. "Is this person currently in custody?"
          needs much fresher data than "what is their conviction history from 2019?"
          Labeling every record with its freshness tier gives consumers the information
          they need to decide whether a particular record is fresh enough for their
          use case — rather than pretending everything is real-time.
        </p>
      </section>

      <section className="about-section">
        <h2>CQRS: why separate stores?</h2>
        <p className="about-body">
          A relational database (Postgres) is optimized for ACID transactions, referential
          integrity, and correct normalized data. It is the right place to write. It is not
          the right place to run full-text search or complex multi-field filter queries
          across millions of cross-agency records — it can do it, but slowly and with
          significant query tuning effort.
        </p>
        <p className="about-body">
          OpenSearch (or Elasticsearch) is optimized for fast, flexible document queries
          and aggregations. It is the right place to query. It is not a system of record —
          a document that lives in the index is derived data. If the index becomes corrupted
          or falls behind, you rebuild it from the source of truth. No data is lost because
          no data lives there exclusively.
        </p>
        <p className="about-body">
          The common failure mode this pattern avoids: treating the search index as
          authoritative. That creates a two-master situation where the two stores can
          disagree and there is no clear answer to "which one is right?" With CQRS,
          the answer is always the same: the relational source of truth is right. The
          sync step — visible here — is where eventual consistency is intentionally
          accepted in exchange for query performance.
        </p>
      </section>

      <section className="about-section">
        <h2>Entity resolution: field-classification vs. weighted scoring</h2>
        <div className="class-table" style={{ marginTop: 14 }}>
          <div className="class-row">
            <span className="field-class-badge badge-unique" style={{ minWidth: 120, textAlign: 'center' }}>
              Field-classification
            </span>
            <div>
              <strong>Person Records tab — deterministic.</strong> Each field is classified
              as a unique identifier, quasi-identifier, or descriptor. If a unique identifier
              matches, it's conclusive — no score needed. If only quasi-identifiers and
              descriptors match, it goes to review. The reasoning is categorical and
              directly auditable: "SSN matched" or "name + DOB matched, no unique ID."
              Best when source systems have reliable shared identifiers.
            </div>
          </div>
          <div className="class-row">
            <span className="field-class-badge badge-quasi" style={{ minWidth: 120, textAlign: 'center' }}>
              Weighted scoring
            </span>
            <div>
              <strong>This tab — probabilistic.</strong> Computes a 0–1 confidence score
              from a weighted combination of soft attributes (name similarity, date of birth,
              address overlap). The threshold is tunable: lower it to catch more matches at
              the cost of more false positives; raise it to reduce false positives at the
              cost of more misses. Necessary when no shared identifier exists. The score
              is useful but requires calibration against labeled ground-truth data.
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Why a conservative matching threshold?</h2>
        <p className="about-body">
          In a justice-system context, the cost of a false match substantially exceeds the
          cost of a false negative. A false match — incorrectly linking two different
          people's records — could wrongly merge one person's criminal history with an
          unrelated person who happens to share a similar name or date of birth. That
          error can propagate into downstream decisions (bail, sentencing, background
          checks) before it is caught.
        </p>
        <p className="about-body">
          A false negative — missing a valid link — is worse than nothing, but it is
          recoverable: a human reviewer working the queue will eventually surface it,
          and the golden record can be updated. No irreversible harm is done while the
          link is missing.
        </p>
        <p className="about-body">
          This asymmetry argues for conservative thresholds and a human review queue
          for anything the system is not highly confident about — the same reasoning
          behind the "explainability over sophistication" principle on the anomaly
          detection side. Human review is not a failure mode; it is the safety mechanism.
        </p>
        <p className="about-body">
          The 0.75 auto-link threshold used here is illustrative. A production deployment
          would require calibration against labeled ground-truth data, likely legal review
          of what "sufficient confidence" means in a given decision context, and ongoing
          monitoring as data quality and agency practices change.
        </p>
      </section>

      <section className="about-section">
        <h2>Connection to the JUSTIS roadmap</h2>
        <p className="about-body">
          The golden record pattern here directly mirrors the{' '}
          <strong>Master Data Management (MDM) initiative</strong> named in the CCSF JUSTIS
          5-Year Roadmap (Gartner, 2019), which identified person master data as the first
          MDM domain. The roadmap's{' '}
          <strong>Person Based Integrated View (PBIV)</strong> describes exactly this
          cross-agency consolidated view — aggregating information about a person across
          all participating agencies, with field-level access gated by role and inter-agency
          MOUs. Entity resolution is the prerequisite that makes PBIV possible: you cannot
          build a cross-agency view of a person if you cannot reliably identify which
          records across agencies refer to the same person.
        </p>
      </section>

    </div>
  )
}

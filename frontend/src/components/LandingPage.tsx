type Section = 'abac' | 'persons' | 'data-arch'

interface LandingPageProps {
  onNavigate: (section: Section) => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="landing-page">

      <div className="landing-intent">
        <p>
          I put this together to dig into some of the concepts from our conversations. Not because
          I've worked them out, but because actually building something forces you to specifics faster
          than just talking about it does. Even a rough prototype surfaces questions a slide deck won't.
        </p>
        <p>
          The architecture is based on the CCSF JUSTIS 5-Year Roadmap (Gartner, 2019). I know it's
          several years old and describes where things were headed, not where they are now. It was the
          most detailed public description of JUSTIS I could find, so I used it as a starting point.
          If the real system looks pretty different, I'd like to understand how.
        </p>
        <p>
          There's a lot I'd get wrong in production. Entity resolution thresholds, what CJIS compliance
          actually requires at each layer, how agencies share data in practice today. I tried to call
          those out in the "How it works" sections. This isn't a proposal; I just wanted something
          concrete to talk from.
        </p>
      </div>

      <div className="landing-sections">

        <div className="landing-card" onClick={() => onNavigate('abac')}>
          <div className="landing-card-header">
            <span className="landing-card-num">01</span>
            <h3>Federated Identity &amp; ABAC</h3>
          </div>
          <p className="landing-card-desc">
            The core access control layer. Three agencies authenticate with two identity protocols;
            a normalization layer produces a single internal identity, then field-level ABAC
            determines what each identity can see on a shared case record.
          </p>
          <ul className="landing-card-features">
            <li>SAML + OIDC payloads normalized into one identity model</li>
            <li>Per-field access decisions with inline explanations</li>
            <li>Rule-based anomaly detection with LASO routing</li>
            <li>Audit log per access decision</li>
          </ul>
          <button className="landing-card-btn" onClick={(e) => { e.stopPropagation(); onNavigate('abac') }}>
            Open →
          </button>
        </div>

        <div className="landing-card" onClick={() => onNavigate('persons')}>
          <div className="landing-card-header">
            <span className="landing-card-num">02</span>
            <h3>Person Records</h3>
          </div>
          <p className="landing-card-desc">
            How the hub determines that records from different agencies refer to the same person,
            using field classification (deterministic) rather than a numeric score.
          </p>
          <ul className="landing-card-features">
            <li>Field classification: unique identifier / quasi-identifier / descriptor</li>
            <li>Unique identifier match → auto-link; quasi-identifier match → review queue</li>
            <li>Human-in-the-loop review with side-by-side comparison</li>
            <li>Per-agency source system registry</li>
          </ul>
          <button className="landing-card-btn" onClick={(e) => { e.stopPropagation(); onNavigate('persons') }}>
            Open →
          </button>
        </div>

        <div className="landing-card" onClick={() => onNavigate('data-arch')}>
          <div className="landing-card-header">
            <span className="landing-card-num">03</span>
            <h3>Data Architecture</h3>
          </div>
          <p className="landing-card-desc">
            The pipelines and storage patterns that bring data from eight agencies into a unified
            queryable view, with explicit freshness guarantees and a probabilistic entity
            resolution queue.
          </p>
          <ul className="landing-card-features">
            <li>Push / queue / batch ingestion with freshness tagging</li>
            <li>CQRS: Postgres-style write store + OpenSearch-style read projection</li>
            <li>Probabilistic entity resolution (weighted scoring, conservative threshold)</li>
          </ul>
          <button className="landing-card-btn" onClick={(e) => { e.stopPropagation(); onNavigate('data-arch') }}>
            Open →
          </button>
        </div>

      </div>

      <div className="landing-books">
        <span className="landing-books-label">Patterns drawn from</span>
        <div className="landing-books-list">
          <span><em>Patterns of Enterprise Application Architecture</em>, Martin Fowler</span>
          <span><em>Designing Data-Intensive Applications</em>, Martin Kleppmann</span>
        </div>
      </div>

    </div>
  )
}

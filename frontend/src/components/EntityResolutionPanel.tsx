import { useEffect, useState } from 'react'
import type {
  EntityResolutionState, CitizenRecord, EntityMatch, GoldenRecord, ReviewQueueItem,
} from '../types'
import { api } from '../api'

export function EntityResolutionPanel() {
  const [state, setState]     = useState<EntityResolutionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    api.getEntityResolutionState()
      .then(s => { setState(s); setLoading(false) })
      .catch((e: unknown) => { setError(String(e)); setLoading(false) })
  }, [])

  const handleApprove = async (recordId: string) => {
    const s = await api.approveEntityMatch(recordId)
    setState(s)
  }

  const handleReject = async (recordId: string) => {
    const s = await api.rejectEntityMatch(recordId)
    setState(s)
  }

  if (loading) return <div className="persons-loading">Loading entity resolution state…</div>
  if (error)   return <div className="error-state"><p>{error}</p></div>
  if (!state)  return null

  const golden = state.golden_records[0]

  return (
    <div className="data-arch-page">
      <div className="data-arch-intro">
        <p>
          This came up in our conversations: identity mapping for <em>citizens</em>,
          not system users. Three agencies hold records for the same person — entered at
          different times with different formats and no shared identifier. A fourth record
          has the same last name and date of birth but a different first name and address.
        </p>
        <p>
          The matching engine checks for a shared unique identifier first (there is none
          here). It then computes a weighted confidence score from name similarity, date
          of birth, and address overlap. Records above the auto-link threshold (
          {state.auto_link_threshold}) link to the golden record automatically; records
          above the review threshold ({state.review_threshold}) but below auto-link go to
          the human review queue.
        </p>
      </div>

      <h3 className="er-section-heading">Incoming citizen records</h3>
      <div className="citizen-records-grid">
        {state.citizen_records.map(rec => {
          const isSource = rec.id === 'cr-001'
          const match    = state.match_results[rec.id]
          return (
            <CitizenRecordCard
              key={rec.id}
              record={rec}
              match={match ?? null}
              isGoldenSeed={isSource}
            />
          )
        })}
      </div>

      {golden && (
        <>
          <h3 className="er-section-heading">Golden record</h3>
          <GoldenRecordCard
            golden={golden}
            allRecords={state.citizen_records}
          />
        </>
      )}

      {state.review_queue.length > 0 && (
        <>
          <h3 className="er-section-heading">
            Review queue
            <span className="pending-count-badge">{state.review_queue.length}</span>
          </h3>
          <div className="er-review-list">
            {state.review_queue.map(item => (
              <ReviewCard
                key={item.citizen_record.id}
                item={item}
                threshold={state.auto_link_threshold}
                onApprove={() => handleApprove(item.citizen_record.id)}
                onReject={() => handleReject(item.citizen_record.id)}
              />
            ))}
          </div>
        </>
      )}

      {state.review_queue.length === 0 && (
        <div className="er-queue-empty">
          Review queue is empty — all records resolved.
        </div>
      )}
    </div>
  )
}

function DecisionBadge({ match, isGoldenSeed }: { match: EntityMatch | null; isGoldenSeed: boolean }) {
  if (isGoldenSeed) return <span className="er-badge er-badge-seed">Seeds golden record</span>
  if (!match) return null
  if (match.decision === 'auto_link')
    return <span className="er-badge er-badge-auto">Auto-linked · {match.composite_score.toFixed(2)}</span>
  if (match.decision === 'review')
    return <span className="er-badge er-badge-review">Pending review · {match.composite_score.toFixed(2)}</span>
  return <span className="er-badge er-badge-nomatch">No match · {match.composite_score.toFixed(2)}</span>
}

function CitizenRecordCard({ record, match, isGoldenSeed }: {
  record: CitizenRecord
  match: EntityMatch | null
  isGoldenSeed: boolean
}) {
  return (
    <div className={`citizen-card ${isGoldenSeed ? 'citizen-card-seed' : ''}`}>
      <div className="citizen-card-header">
        <span className="citizen-agency">{record.agency_name}</span>
        <DecisionBadge match={match} isGoldenSeed={isGoldenSeed} />
      </div>
      <div className="citizen-fields">
        <div className="citizen-field-row">
          <span className="citizen-field-label">Name(s)</span>
          <span className="citizen-field-value">{record.names.join(', ')}</span>
        </div>
        {record.date_of_birth && (
          <div className="citizen-field-row">
            <span className="citizen-field-label">DOB</span>
            <span className="citizen-field-value">{record.date_of_birth}</span>
          </div>
        )}
        {record.address && (
          <div className="citizen-field-row">
            <span className="citizen-field-label">Address</span>
            <span className="citizen-field-value">{record.address}</span>
          </div>
        )}
        {!record.address && (
          <div className="citizen-field-row">
            <span className="citizen-field-label">Address</span>
            <span className="citizen-field-value citizen-field-absent">not collected</span>
          </div>
        )}
      </div>
      {match && (
        <div className="citizen-score-row">
          <span className="citizen-score-label">Score</span>
          <span className="citizen-score-breakdown">{match.score_breakdown}</span>
        </div>
      )}
    </div>
  )
}

function GoldenRecordCard({ golden, allRecords }: {
  golden: GoldenRecord
  allRecords: CitizenRecord[]
}) {
  const linkedAgencies = golden.source_systems.map(sys => {
    const rec = allRecords.find(r => r.source_system === sys)
    return rec?.agency_name ?? sys
  })

  return (
    <div className="golden-record-card">
      <div className="golden-record-header">
        <span className="golden-label">Golden Record</span>
        <span className="golden-linked-count">
          {golden.linked_record_ids.length} source record{golden.linked_record_ids.length !== 1 ? 's' : ''} linked
        </span>
      </div>
      <div className="golden-canonical-name">{golden.canonical_name}</div>
      <div className="golden-fields">
        {golden.date_of_birth && (
          <div className="citizen-field-row">
            <span className="citizen-field-label">DOB</span>
            <span className="citizen-field-value">{golden.date_of_birth}</span>
          </div>
        )}
        {golden.canonical_address && (
          <div className="citizen-field-row">
            <span className="citizen-field-label">Address</span>
            <span className="citizen-field-value">{golden.canonical_address}</span>
          </div>
        )}
      </div>
      <div className="golden-sources">
        <span className="golden-sources-label">Linked from:</span>
        {linkedAgencies.map((name, i) => (
          <span key={i} className="golden-source-chip">{name}</span>
        ))}
      </div>
    </div>
  )
}

function ReviewCard({ item, threshold, onApprove, onReject }: {
  item: ReviewQueueItem
  threshold: number
  onApprove: () => void
  onReject: () => void
}) {
  const m = item.match
  return (
    <div className="er-review-card">
      <div className="er-review-header">
        <span className="pending-badge">Needs human review</span>
        <span className="er-review-agency">{item.citizen_record.agency_name}</span>
      </div>

      <div className="er-review-comparison">
        <div className="er-review-col">
          <div className="pending-col-label">Incoming record</div>
          <div className="citizen-field-row">
            <span className="citizen-field-label">Name(s)</span>
            <span className="citizen-field-value">{item.citizen_record.names.join(', ')}</span>
          </div>
          {item.citizen_record.date_of_birth && (
            <div className="citizen-field-row">
              <span className="citizen-field-label">DOB</span>
              <span className="citizen-field-value">{item.citizen_record.date_of_birth}</span>
            </div>
          )}
          {item.citizen_record.address && (
            <div className="citizen-field-row">
              <span className="citizen-field-label">Address</span>
              <span className="citizen-field-value">{item.citizen_record.address}</span>
            </div>
          )}
        </div>
        <div className="pending-vs">vs.</div>
        <div className="er-review-col">
          <div className="pending-col-label">Golden record</div>
          <div className="citizen-field-row">
            <span className="citizen-field-label">Name</span>
            <span className="citizen-field-value">{item.golden_record.canonical_name}</span>
          </div>
          {item.golden_record.date_of_birth && (
            <div className="citizen-field-row">
              <span className="citizen-field-label">DOB</span>
              <span className="citizen-field-value">{item.golden_record.date_of_birth}</span>
            </div>
          )}
        </div>
      </div>

      <div className="match-signals">
        <div className="match-signals-label">Confidence score breakdown</div>
        <div className="er-score-breakdown">
          <ScoreBar label="Name similarity" score={m.name_score} weight={0.45} />
          <ScoreBar label="Date of birth" score={m.dob_score} weight={0.40} />
          {m.address_score !== null && (
            <ScoreBar label="Address similarity" score={m.address_score} weight={0.15} />
          )}
          {m.address_score === null && (
            <div className="er-score-row">
              <span className="er-score-label">Address</span>
              <span className="er-score-absent">not available — weight redistributed to name</span>
            </div>
          )}
          <div className="er-score-total">
            <span>Composite</span>
            <span className="er-composite-score">{m.composite_score.toFixed(3)}</span>
            <span className="er-threshold-note">
              threshold {threshold} — {m.composite_score >= threshold ? 'above (borderline)' : 'below'}
            </span>
          </div>
        </div>
      </div>

      <div className="pending-match-actions">
        <div className="er-review-note">
          Score {m.composite_score.toFixed(2)} is below the {threshold} auto-link threshold.
          Review the name discrepancy before linking.
        </div>
        <div className="pending-action-btns">
          <button className="btn-reject-match" onClick={onReject}>Reject</button>
          <button className="btn-approve-match" onClick={onApprove}>Link to Golden Record</button>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const pct = Math.round(score * 100)
  return (
    <div className="er-score-row">
      <span className="er-score-label">{label}</span>
      <div className="er-score-bar-wrap">
        <div className="er-score-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="er-score-pct">{score.toFixed(2)}</span>
      <span className="er-score-weight">× {weight}</span>
    </div>
  )
}

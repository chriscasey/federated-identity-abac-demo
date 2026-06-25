import { useEffect, useState } from 'react'
import type { PersonRecord, MatchCandidate, SourceRecord, FieldClassification } from '../types'
import { api } from '../api'

const CLASSIFICATION_LABELS: Record<FieldClassification, string> = {
  unique_identifier: 'Unique Identifier',
  quasi_identifier: 'Quasi-Identifier',
  descriptor: 'Descriptor',
}

export function PersonResolutionTab() {
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [pendingMatches, setPendingMatches] = useState<MatchCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([api.listPersons(), api.getPendingMatches()])
      .then(([p, m]) => { setPersons(p); setPendingMatches(m); setLoading(false) })
      .catch((e: unknown) => { setError(String(e)); setLoading(false) })
  }, [])

  const toggleRaw = (id: string) =>
    setExpandedRaw(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleApprove = async (match: MatchCandidate) => {
    await api.approveMatch(match.id)
    setPendingMatches(prev => prev.filter(m => m.id !== match.id))
    setPersons(prev => prev.map(p =>
      p.id === match.person_id
        ? { ...p, source_records: [...p.source_records, match.source_record] }
        : p
    ))
  }

  const handleReject = async (matchId: string) => {
    await api.rejectMatch(matchId)
    setPendingMatches(prev => prev.filter(m => m.id !== matchId))
  }

  if (loading) return <div className="persons-loading">Loading person records…</div>
  if (error) return <div className="error-state"><p>{error}</p></div>

  return (
    <div className="persons-page">
      <p className="persons-intro">
        Citizens may have records across multiple agency systems, entered at different
        times using different formats and identifier schemes. The person record view
        shows how a hub links those source records together — each with its raw source
        text and the structured fields extracted at ingest — and surfaces unresolved
        matches for human review before they are linked.
      </p>

      {pendingMatches.length > 0 && (
        <section className="persons-section">
          <h2 className="persons-section-heading">
            Pending Review
            <span className="pending-count-badge">{pendingMatches.length}</span>
          </h2>
          <div className="pending-list">
            {pendingMatches.map(match => (
              <PendingMatchCard
                key={match.id}
                match={match}
                rawExpanded={expandedRaw.has(match.id)}
                onToggleRaw={() => toggleRaw(match.id)}
                onApprove={() => handleApprove(match)}
                onReject={() => handleReject(match.id)}
              />
            ))}
          </div>
        </section>
      )}

      {persons.map(person => (
        <section key={person.id} className="persons-section">
          <PersonRecordHeader person={person} />
          <div className="source-records-grid">
            {person.source_records.map(src => (
              <SourceRecordCard
                key={src.id}
                record={src}
                rawExpanded={expandedRaw.has(src.id)}
                onToggleRaw={() => toggleRaw(src.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function PersonRecordHeader({ person }: { person: PersonRecord }) {
  const phys = person.physical
  const physParts = phys ? [
    phys.sex, phys.race, phys.height, phys.weight,
    phys.hair ? `Hair: ${phys.hair}` : null,
    phys.eyes ? `Eyes: ${phys.eyes}` : null,
  ].filter(Boolean) : []

  return (
    <div className="person-record-header">
      <div className="person-record-main">
        <h3 className="person-canonical-name">{person.canonical_name}</h3>
        <div className="person-record-meta">
          {person.date_of_birth && (
            <span className="person-meta-item">DOB: {person.date_of_birth}</span>
          )}
          {person.identifiers?.ssn && (
            <span className="person-meta-item person-identifier-badge">
              SSN on file
            </span>
          )}
          {person.aliases.length > 0 && (
            <span className="person-meta-item person-aliases">
              Also known as: {person.aliases.join(' · ')}
            </span>
          )}
        </div>
        {physParts.length > 0 && (
          <div className="person-physical-row">{physParts.join('  ·  ')}</div>
        )}
      </div>
      <div className="person-record-count">
        {person.source_records.length} linked record{person.source_records.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function SourceRecordCard({ record, rawExpanded, onToggleRaw }: {
  record: SourceRecord
  rawExpanded: boolean
  onToggleRaw: () => void
}) {
  const e = record.extracted
  return (
    <div className="source-card">
      <div className="source-card-top">
        <span className="source-agency-badge">{record.agency_name}</span>
        <span className="source-ingest-date">{record.ingested_at.split('T')[0]}</span>
      </div>

      <div className="source-extracted-fields">
        <ExtractedRow label="Name(s)" value={e.names.join(', ')} />
        {e.date_of_birth && <ExtractedRow label="Date of birth" value={e.date_of_birth} />}
        {e.identifiers?.ssn && <ExtractedRow label="SSN" value="••••" />}
        {e.physical?.height && <ExtractedRow label="Height" value={e.physical.height} />}
        {e.physical?.weight && <ExtractedRow label="Weight" value={e.physical.weight} />}
        {e.physical?.hair && <ExtractedRow label="Hair" value={e.physical.hair} />}
        {e.physical?.eyes && <ExtractedRow label="Eyes" value={e.physical.eyes} />}
        {Object.entries(e.source_ids).map(([k, v]) => (
          <ExtractedRow key={k} label={k.replace(/_/g, ' ')} value={v} />
        ))}
        {e.case_references.length > 0 && (
          <ExtractedRow label="Case refs" value={e.case_references.join(', ')} />
        )}
      </div>

      <div className="source-card-footer">
        <button className="btn-ghost source-raw-toggle" onClick={onToggleRaw}>
          {rawExpanded ? 'Hide source text' : 'Show source text'}
        </button>
      </div>

      {rawExpanded && <pre className="source-raw-text">{record.raw_text}</pre>}
    </div>
  )
}

function ExtractedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="extracted-row">
      <span className="extracted-label">{label}</span>
      <span className="extracted-value">{value}</span>
    </div>
  )
}

function PendingMatchCard({ match, rawExpanded, onToggleRaw, onApprove, onReject }: {
  match: MatchCandidate
  rawExpanded: boolean
  onToggleRaw: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="pending-match-card">
      <div className="pending-match-header">
        <div className="pending-match-labels">
          <span className="pending-badge">Pending Review</span>
        </div>
        <span className="pending-source-agency">{match.source_record.agency_name}</span>
      </div>

      <div className="pending-comparison">
        <div className="pending-col">
          <div className="pending-col-label">Incoming record</div>
          <CompareRow label="Name" value={match.source_record.extracted.names.join(', ')} />
          {match.source_record.extracted.date_of_birth && (
            <CompareRow label="Date of birth" value={match.source_record.extracted.date_of_birth} />
          )}
          {match.source_record.extracted.physical?.height && (
            <CompareRow label="Height" value={match.source_record.extracted.physical.height} />
          )}
          <CompareRow label="Source" value={match.source_record.agency_name} />
        </div>
        <div className="pending-vs">vs.</div>
        <div className="pending-col">
          <div className="pending-col-label">Existing person record</div>
          <CompareRow label="Canonical name" value={match.person_name} />
        </div>
      </div>

      <div className="match-signals">
        <div className="match-signals-label">Basis for match</div>
        <div className="match-signals-list">
          {match.matched_fields.map((f, i) => {
            const badgeClass =
              f.classification === 'unique_identifier' ? 'badge-unique' :
              f.classification === 'quasi_identifier' ? 'badge-quasi' : 'badge-descriptor'
            return (
              <div key={i} className="match-signal-row">
                <span className={`field-class-badge badge-sm ${badgeClass}`}>
                  {CLASSIFICATION_LABELS[f.classification]}
                </span>
                <span className="signal-field">{f.label}</span>
                <span className="signal-match-type">— {f.match_type} match</span>
              </div>
            )
          })}
          <div className="match-basis-note">
            No unique identifier (e.g. SSN) found in this record — requires human review.
          </div>
        </div>
      </div>

      <div className="pending-match-actions">
        <button className="btn-ghost" onClick={onToggleRaw}>
          {rawExpanded ? 'Hide source text' : 'Show source text'}
        </button>
        <div className="pending-action-btns">
          <button className="btn-reject-match" onClick={onReject}>Reject</button>
          <button className="btn-approve-match" onClick={onApprove}>Approve Link</button>
        </div>
      </div>

      {rawExpanded && <pre className="source-raw-text">{match.source_record.raw_text}</pre>}
    </div>
  )
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="compare-row">
      <span className="compare-label">{label}</span>
      <span className="compare-value">{value}</span>
    </div>
  )
}

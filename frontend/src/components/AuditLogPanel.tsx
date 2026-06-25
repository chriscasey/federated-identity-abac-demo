import type { AuditLogEntry } from '../types'

const DECISION_LABELS: Record<string, string> = {
  visible: '✓ visible',
  hidden: '✗ hidden',
  redacted: '~ redacted',
}

interface Props {
  entries: AuditLogEntry[]
  onClear: () => void
}

export function AuditLogPanel({ entries, onClear }: Props) {
  return (
    <div className="audit-log-panel">
      <div className="audit-header">
        <h2>Audit Log</h2>
        {entries.length > 0 && (
          <button className="btn-ghost" onClick={onClear}>Clear</button>
        )}
      </div>
      <p className="panel-desc">
        Every access decision is logged. In a real system, this log would be immutable and centrally stored.
      </p>

      {entries.length === 0 ? (
        <p className="empty-state">No decisions logged yet. Select an identity to begin.</p>
      ) : (
        <div className="audit-entries">
          {[...entries].reverse().map((entry, i) => (
            <div key={i} className={`audit-entry decision-${entry.decision}`}>
              <span className="audit-ts">{entry.timestamp}</span>
              <span className="audit-identity">{entry.display_name}</span>
              <span className="audit-field">{entry.field_name}</span>
              <span className={`audit-decision audit-${entry.decision}`}>
                {DECISION_LABELS[entry.decision]}
              </span>
              <span className="audit-reason">{entry.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

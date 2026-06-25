import { useState } from 'react'
import type { CaseField, FieldAccessResult } from '../types'

const FIELD_LABELS: Record<string, string> = {
  docketNumber: 'Docket Number',
  courtDate: 'Court Date',
  chargesFiled: 'Charges Filed',
  prosecutionStrategyNotes: 'Prosecution Strategy Notes',
  defenseStrategyNotes: 'Defense Strategy Notes',
  evidenceLog: 'Evidence Log',
  prisonClassificationRisk: 'Pre-Trial Risk Classification',
}

interface Props {
  field: CaseField
  result: FieldAccessResult | null  // null = no identity selected yet (unfiltered baseline)
}

export function FieldRow({ field, result }: Props) {
  const [expanded, setExpanded] = useState(false)

  const decision = result?.decision ?? 'visible'
  const label = FIELD_LABELS[field.field_name] ?? field.field_name

  const decisionBadge = () => {
    if (!result) return <span className="badge badge-unfiltered">unfiltered</span>
    if (decision === 'visible') return <span className="badge badge-visible">visible</span>
    if (decision === 'redacted') return <span className="badge badge-redacted">redacted</span>
    return <span className="badge badge-hidden">hidden</span>
  }

  const displayValue = () => {
    if (!result) return field.value
    if (decision === 'visible' || decision === 'redacted') return result.value
    return null
  }

  const value = displayValue()

  return (
    <div className={`field-row field-${decision}`}>
      <div className="field-header" onClick={() => setExpanded(!expanded)}>
        <div className="field-label-group">
          <span className="field-label">{label}</span>
          <span className="field-classification">{field.classification}</span>
        </div>
        <div className="field-controls">
          {decisionBadge()}
          <button className="why-btn" aria-label="Why?">
            {expanded ? '▲ less' : '▼ why?'}
          </button>
        </div>
      </div>

      {value !== null ? (
        <pre className="field-value">{value}</pre>
      ) : (
        <div className="field-hidden-placeholder">
          [Hidden — click "why?" to see reason]
        </div>
      )}

      {expanded && (
        <div className="field-why-panel">
          {result && (
            <p className="field-reason"><strong>Access decision:</strong> {result.reason}</p>
          )}
          <p className="field-rationale"><strong>Classification rationale:</strong> {field.rationale}</p>
        </div>
      )}
    </div>
  )
}

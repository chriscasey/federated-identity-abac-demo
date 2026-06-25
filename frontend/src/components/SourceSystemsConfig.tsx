import { useEffect, useState } from 'react'
import type { SourceSystemConfig, RegistryField, FieldClassification } from '../types'
import { api } from '../api'

const CLASSIFICATION_LABELS: Record<FieldClassification, string> = {
  unique_identifier: 'Unique Identifier',
  quasi_identifier: 'Quasi-Identifier',
  descriptor: 'Descriptor',
}

const CLASSIFICATION_ORDER: FieldClassification[] = [
  'unique_identifier',
  'quasi_identifier',
  'descriptor',
]

export function SourceSystemsConfig() {
  const [systems, setSystems] = useState<SourceSystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listSourceSystems()
      .then(data => { setSystems(data); setLoading(false) })
      .catch((e: unknown) => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return <div className="persons-loading">Loading registry…</div>
  if (error) return <div className="error-state"><p>{error}</p></div>

  return (
    <div className="source-systems-page">
      <div className="source-systems-intro">
        <p>
          Before a source record can be matched against the person index, the hub needs
          to know what identity fields each source system actually collects — and how
          reliable each field is as a unique identifier. This registry is that
          configuration. It is set once per system and updated only when a system's
          data collection practices change.
        </p>
        <div className="classification-legend">
          <div className="legend-item">
            <span className="field-class-badge badge-unique">Unique Identifier</span>
            <span className="legend-desc">
              One match is conclusive. Auto-links without human review.
            </span>
          </div>
          <div className="legend-item">
            <span className="field-class-badge badge-quasi">Quasi-Identifier</span>
            <span className="legend-desc">
              Not unique alone. Name + one or more quasi-identifiers routes to review.
            </span>
          </div>
          <div className="legend-item">
            <span className="field-class-badge badge-descriptor">Descriptor</span>
            <span className="legend-desc">
              Low discriminating power. Corroborates but never decides a match alone.
            </span>
          </div>
        </div>
      </div>

      <div className="source-systems-grid">
        {systems.map(system => (
          <SourceSystemCard key={system.system_id} system={system} />
        ))}
      </div>
    </div>
  )
}

function SourceSystemCard({ system }: { system: SourceSystemConfig }) {
  const fieldsByClass = CLASSIFICATION_ORDER.reduce<Record<FieldClassification, RegistryField[]>>(
    (acc, cls) => {
      acc[cls] = system.fields.filter(f => f.classification === cls)
      return acc
    },
    { unique_identifier: [], quasi_identifier: [], descriptor: [] },
  )

  const hasUniqueId = fieldsByClass.unique_identifier.length > 0

  return (
    <div className={`source-system-card ${hasUniqueId ? 'has-unique-id' : ''}`}>
      <div className="source-system-header">
        <div className="source-system-name">{system.display_name}</div>
        {hasUniqueId && (
          <span className="field-class-badge badge-unique badge-sm">SSN available</span>
        )}
      </div>
      <p className="source-system-desc">{system.description}</p>

      <div className="source-system-fields">
        {CLASSIFICATION_ORDER.map(cls => {
          const fields = fieldsByClass[cls]
          if (fields.length === 0) return null
          return (
            <div key={cls} className="field-group">
              <div className="field-group-label">{CLASSIFICATION_LABELS[cls]}</div>
              {fields.map(field => (
                <FieldRow key={field.field_name} field={field} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldRow({ field }: { field: RegistryField }) {
  const badgeClass =
    field.classification === 'unique_identifier' ? 'badge-unique' :
    field.classification === 'quasi_identifier' ? 'badge-quasi' : 'badge-descriptor'

  return (
    <div className="field-row">
      <div className="field-row-top">
        <span className={`field-class-badge badge-sm ${badgeClass}`}>
          {CLASSIFICATION_LABELS[field.classification]}
        </span>
        <span className="field-label">{field.label}</span>
      </div>
      <p className="field-description">{field.description}</p>
    </div>
  )
}

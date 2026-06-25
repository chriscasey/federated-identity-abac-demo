import type { NormalizedIdentity } from '../types'

const PROTOCOL_LABELS: Record<string, string> = {
  SAML: 'SAML assertion',
  OIDC: 'OIDC claims',
}

interface Props {
  identities: NormalizedIdentity[]
  selected: NormalizedIdentity | null
  onSelect: (identity: NormalizedIdentity) => void
  showRawPayload: boolean
  onToggleRaw: () => void
}

export function IdentitySwitcher({ identities, selected, onSelect, showRawPayload, onToggleRaw }: Props) {
  return (
    <div className="identity-switcher">
      <div className="switcher-header">
        <h2>Active Identity</h2>
        {selected && (
          <button className="btn-ghost" onClick={onToggleRaw}>
            {showRawPayload ? 'Show normalized →' : '← Show raw payload'}
          </button>
        )}
      </div>

      <div className="identity-options">
        {identities.map((id) => (
          <button
            key={id.internal_id}
            className={`identity-card ${selected?.internal_id === id.internal_id ? 'active' : ''}`}
            onClick={() => onSelect(id)}
          >
            <span className="identity-name">{id.display_name}</span>
            <span className="identity-meta">
              {id.agency_id} · {id.role} · {PROTOCOL_LABELS[id.source_protocol]}
            </span>
          </button>
        ))}
      </div>

      {selected && showRawPayload && (
        <div className="payload-panel">
          <p className="payload-label">
            Raw {PROTOCOL_LABELS[selected.source_protocol]} from {selected.agency_id}
          </p>
          <pre className="payload-code">{JSON.stringify(selected.raw_payload, null, 2)}</pre>
          <div className="payload-arrow">↓ normalized to internal identity model</div>
          <pre className="payload-code normalized">
{JSON.stringify({
  internal_id: selected.internal_id,
  display_name: selected.display_name,
  agency_id: selected.agency_id,
  role: selected.role,
  clearance_level: selected.clearance_level,
  source_protocol: selected.source_protocol,
}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

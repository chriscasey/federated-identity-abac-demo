import { useState } from 'react'
import type { NormalizedIdentity, AnomalyAlert } from '../types'
import { api } from '../api'

interface Props {
  identity: NormalizedIdentity | null
  onAlert: (alert: AnomalyAlert) => void
}

export function AnomalyPanel({ identity, onAlert }: Props) {
  const [offHours, setOffHours] = useState(false)
  const [accessCount, setAccessCount] = useState(6)
  const [alert, setAlert] = useState<AnomalyAlert | null>(null)
  const [loading, setLoading] = useState(false)

  const simulate = async () => {
    if (!identity) return
    setLoading(true)
    try {
      const result = await api.simulateAnomaly(identity.internal_id, offHours, accessCount)
      setAlert(result)
      onAlert(result)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => setAlert(null)

  return (
    <div className="anomaly-panel">
      <h2>Anomaly Detection</h2>
      <p className="panel-desc">
        Rule-based, not ML. Threshold: &gt;5 records accessed, or off-hours access.
      </p>

      <div className="anomaly-controls">
        <label className="control-row">
          <span>Simulated access count</span>
          <input
            type="number"
            min={1}
            max={20}
            value={accessCount}
            onChange={(e) => setAccessCount(Number(e.target.value))}
          />
        </label>
        <label className="control-row checkbox">
          <input
            type="checkbox"
            checked={offHours}
            onChange={(e) => setOffHours(e.target.checked)}
          />
          <span>Simulate off-hours access (02:14 AM)</span>
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={simulate}
        disabled={!identity || loading}
      >
        {loading ? 'Simulating…' : 'Simulate anomalous access'}
      </button>

      {!identity && <p className="hint">Select an identity first.</p>}

      {alert && (
        <div className={`anomaly-result ${alert.triggered ? 'triggered' : 'clear'}`}>
          <div className="alert-header">
            {alert.triggered ? '⚠ Anomaly detected' : '✓ No anomaly'}
          </div>
          {alert.triggered && (
            <>
              <p><strong>Reason:</strong> {alert.reason}</p>
              <p><strong>Alert routed to:</strong> {alert.routed_to}</p>
              <p><strong>Identity:</strong> {identity?.display_name} ({alert.agency_id})</p>
            </>
          )}
          <button className="btn-ghost reset-btn" onClick={reset}>Clear</button>
        </div>
      )}
    </div>
  )
}

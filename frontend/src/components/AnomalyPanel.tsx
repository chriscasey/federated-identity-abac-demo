import { useEffect, useRef, useState } from 'react'
import type { NormalizedIdentity, AnomalyAlert } from '../types'
import { api } from '../api'

const THRESHOLD = 5

interface Props {
  identity: NormalizedIdentity | null
  accessCount: number
  onAlert: (alert: AnomalyAlert) => void
}

export function AnomalyPanel({ identity, accessCount, onAlert }: Props) {
  const [offHours, setOffHours] = useState(false)
  const [alert, setAlert] = useState<AnomalyAlert | null>(null)
  const prevTriggered = useRef(false)

  useEffect(() => {
    if (!identity) return
    api.simulateAnomaly(identity.internal_id, offHours, accessCount)
      .then(result => {
        setAlert(result)
        if (result.triggered && !prevTriggered.current) {
          onAlert(result)
        }
        prevTriggered.current = result.triggered
      })
      .catch(() => {})
  }, [identity?.internal_id, accessCount, offHours])

  return (
    <div className="anomaly-panel">
      <h2>Anomaly Detection</h2>
      <p className="panel-desc">
        Rule-based, not ML. Fires automatically when access count exceeds {THRESHOLD} records,
        or when off-hours access is simulated.
      </p>

      <label className="control-row checkbox">
        <input
          type="checkbox"
          checked={offHours}
          onChange={(e) => setOffHours(e.target.checked)}
        />
        <span>Simulate off-hours access (02:14 AM)</span>
      </label>

      {!identity && (
        <p className="hint">Select an identity to begin monitoring.</p>
      )}

      {identity && alert && !alert.triggered && (
        <div className="anomaly-monitoring">
          {accessCount} / {THRESHOLD} record accesses &middot; no anomaly
        </div>
      )}

      {alert?.triggered && (
        <div className="anomaly-result triggered">
          <div className="alert-header">&#9888; Anomaly detected</div>
          <p><strong>Reason:</strong> {alert.reason}</p>
          <p><strong>Alert routed to:</strong> {alert.routed_to}</p>
          <p><strong>Identity:</strong> {identity?.display_name} ({alert.agency_id})</p>
        </div>
      )}
    </div>
  )
}

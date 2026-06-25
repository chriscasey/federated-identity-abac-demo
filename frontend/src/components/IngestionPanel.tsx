import { useEffect, useState } from 'react'
import type { IngestedRecord, QueuedEvent, FreshnessLevel } from '../types'
import { api } from '../api'

const FRESHNESS_LABELS: Record<FreshnessLevel, string> = {
  'realtime':      'Realtime',
  'near-realtime': 'Near-realtime',
  'batch-24h':     'Batch · 24 h',
}

const FRESHNESS_DELAY: Record<FreshnessLevel, string> = {
  'realtime':      'seconds',
  'near-realtime': 'minutes',
  'batch-24h':     'up to 24 hours',
}

export function IngestionPanel() {
  const [log, setLog]         = useState<IngestedRecord[]>([])
  const [queue, setQueue]     = useState<QueuedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)
  const [flash, setFlash]     = useState<string | null>(null)

  const load = async () => {
    const [l, q] = await Promise.all([api.getIngestionLog(), api.getIngestionQueue()])
    setLog(l)
    setQueue(q)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  const handlePush = async () => {
    setBusy('push')
    await api.pushEvent({
      source_system: 'SFPD',
      agency_name: 'San Francisco Police Department',
      subject: 'Simulated event subject',
      event_type: 'status_update',
    })
    await load()
    setBusy(null)
    showFlash('Push event ingested — realtime')
  }

  const handleProcessQueue = async () => {
    setBusy('queue')
    const result = await api.processQueueItem()
    await load()
    setBusy(null)
    if (result) showFlash('Queue item processed — near-realtime')
    else showFlash('Queue is empty')
  }

  const handleBatch = async () => {
    setBusy('batch')
    const result = await api.runBatchPull('COURTS')
    await load()
    setBusy(null)
    showFlash(`Batch pull complete — ${result.records_pulled} records (batch-24h)`)
  }

  if (loading) return <div className="persons-loading">Loading ingestion data…</div>

  return (
    <div className="data-arch-page">
      <div className="data-arch-intro">
        <p>
          Not every agency system has the same integration capability. The hub adapts
          to each source rather than requiring a single synchronization model. Three
          patterns feed the same normalized store — each with a different freshness
          guarantee that consumers need to understand.
        </p>
      </div>

      {flash && <div className="ingest-flash">{flash}</div>}

      <div className="ingestion-grid">
        <IngestionPatternCard
          method="push"
          title="Push / Webhook"
          freshness="realtime"
          description="A modern agency system POSTs directly to the hub as events occur. No polling required on the hub side. Corresponds to the lambda-architecture speed layer."
          sourceExample="SFPD booking system → hub endpoint"
          action={
            <button
              className="btn-ingest"
              onClick={handlePush}
              disabled={busy !== null}
            >
              {busy === 'push' ? 'Sending…' : 'Simulate Push Event'}
            </button>
          }
        />

        <IngestionPatternCard
          method="queue"
          title="Queue (SQS-style)"
          freshness="near-realtime"
          description="The agency publishes to a durable message queue; the hub consumes asynchronously. Decouples producer and consumer rates — bursts don't overload the hub."
          sourceExample="Probation system → SQS queue → hub consumer"
          action={
            <div className="queue-actions">
              <span className="queue-depth-badge">
                {queue.length} item{queue.length !== 1 ? 's' : ''} queued
              </span>
              <button
                className="btn-ingest btn-ingest-sm"
                onClick={handleProcessQueue}
                disabled={busy !== null}
              >
                {busy === 'queue' ? 'Processing…' : 'Process Next →'}
              </button>
            </div>
          }
        />

        <IngestionPatternCard
          method="batch"
          title="Batch Pull"
          freshness="batch-24h"
          description="The hub polls a legacy source on a schedule. No streaming capability required from the agency — the direct analogue to what a CABLE3/CMS-era system can support."
          sourceExample="Hub scheduler → Courts legacy API → normalized records"
          action={
            <button
              className="btn-ingest"
              onClick={handleBatch}
              disabled={busy !== null}
            >
              {busy === 'batch' ? 'Pulling…' : 'Run Batch Pull (Courts)'}
            </button>
          }
        />
      </div>

      <div className="ingestion-log-section">
        <h3 className="ingestion-log-title">
          Ingestion log
          <span className="log-count-badge">{log.length} records</span>
        </h3>
        <div className="ingestion-log-table">
          <div className="ingest-log-row ingest-log-header">
            <span>Freshness</span>
            <span>Method</span>
            <span>Agency</span>
            <span>Subject</span>
            <span>Event</span>
            <span>Ingested</span>
          </div>
          {log.map(r => (
            <div key={r.id} className="ingest-log-row">
              <span>
                <span className={`freshness-badge freshness-${r.freshness}`}>
                  {FRESHNESS_LABELS[r.freshness as FreshnessLevel] ?? r.freshness}
                </span>
              </span>
              <span className="ingest-method">{r.ingestion_method}</span>
              <span className="ingest-agency">{r.agency_name}</span>
              <span className="ingest-subject">{r.subject}</span>
              <span className="ingest-event">{r.event_type.replace(/_/g, ' ')}</span>
              <span className="ingest-time">{r.ingested_at.replace('T', ' ').replace('Z', '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IngestionPatternCard({ method, title, freshness, description, sourceExample, action }: {
  method: string
  title: string
  freshness: FreshnessLevel
  description: string
  sourceExample: string
  action: React.ReactNode
}) {
  return (
    <div className={`ingestion-card ingestion-card-${method}`}>
      <div className="ingestion-card-header">
        <span className="ingestion-card-title">{title}</span>
        <span className={`freshness-badge freshness-${freshness}`}>
          {FRESHNESS_LABELS[freshness]} · {FRESHNESS_DELAY[freshness]}
        </span>
      </div>
      <p className="ingestion-card-desc">{description}</p>
      <div className="ingestion-card-example">{sourceExample}</div>
      <div className="ingestion-card-action">{action}</div>
    </div>
  )
}

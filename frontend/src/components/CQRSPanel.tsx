import { useEffect, useState } from 'react'
import type { SyncStatus, ReadProjectionRecord } from '../types'
import { api } from '../api'

export function CQRSPanel() {
  const [status, setStatus]     = useState<SyncStatus | null>(null)
  const [records, setRecords]   = useState<ReadProjectionRecord[]>([])
  const [syncing, setSyncing]   = useState(false)
  const [loading, setLoading]   = useState(true)

  const load = async () => {
    const [s, r] = await Promise.all([api.getReadStoreStatus(), api.getReadStoreRecords()])
    setStatus(s)
    setRecords(r)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSync = async () => {
    setSyncing(true)
    // Brief pause so the "Syncing…" state is visually perceptible
    await new Promise(r => setTimeout(r, 600))
    const s = await api.syncReadStore()
    const r = await api.getReadStoreRecords()
    setStatus(s)
    setRecords(r)
    setSyncing(false)
  }

  if (loading) return <div className="persons-loading">Loading storage state…</div>

  const sourceCount = status?.source_record_count ?? 0
  const readCount   = records.length
  const isSynced    = status?.last_synced_at !== null && readCount > 0

  return (
    <div className="data-arch-page">
      <div className="data-arch-intro">
        <p>
          Writes go to the source of truth (Postgres-style relational store). Reads
          for search and cross-agency queries come from a derived projection
          (OpenSearch-style document index). The two stores are optimized for
          different workloads — keeping them separate avoids the failure mode of
          treating a search index as authoritative.
        </p>
      </div>

      <div className="cqrs-layout">

        {/* Source of truth */}
        <div className="cqrs-store cqrs-source">
          <div className="cqrs-store-header">
            <span className="cqrs-store-label">Source of Truth</span>
            <span className="cqrs-tech-badge">Postgres-style</span>
          </div>
          <p className="cqrs-store-desc">
            Canonical, ACID-compliant store. Writes here are authoritative.
            Normalized data — identities and agencies are in separate tables.
          </p>
          <div className="cqrs-counts">
            <div className="cqrs-count-row">
              <span className="cqrs-count-label">Identities</span>
              <span className="cqrs-count-val">{sourceCount}</span>
            </div>
            <div className="cqrs-count-row">
              <span className="cqrs-count-label">Agencies</span>
              <span className="cqrs-count-val">3</span>
            </div>
            <div className="cqrs-count-row">
              <span className="cqrs-count-label">Cases</span>
              <span className="cqrs-count-val">1</span>
            </div>
          </div>
          <div className="cqrs-raw-label">data.py — normalized records</div>
        </div>

        {/* Sync column */}
        <div className="cqrs-sync-col">
          <div className="cqrs-sync-arrow">
            {syncing ? (
              <span className="sync-spinner">⟳</span>
            ) : (
              <span className="sync-arrow-icon">→</span>
            )}
          </div>
          <div className="cqrs-sync-label">
            {syncing ? 'Syncing…' : 'Sync step'}
          </div>
          <div className="cqrs-sync-sub">
            {syncing
              ? 'Denormalizing and indexing records'
              : 'Joins + denormalization'}
          </div>
          <button
            className="btn-sync"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          {status?.last_synced_at && !syncing && (
            <div className="cqrs-last-synced">
              Last synced<br />
              {status.last_synced_at.replace('T', ' ').replace('Z', '')}
            </div>
          )}
          {!status?.last_synced_at && !syncing && (
            <div className="cqrs-not-synced">Read store not yet synced</div>
          )}
        </div>

        {/* Read projection */}
        <div className={`cqrs-store cqrs-read ${!isSynced ? 'cqrs-read-empty' : ''}`}>
          <div className="cqrs-store-header">
            <span className="cqrs-store-label">Read Projection</span>
            <span className="cqrs-tech-badge">OpenSearch-style</span>
          </div>
          <p className="cqrs-store-desc">
            Derived, read-optimized document index. Denormalized — agency name
            and protocol are embedded in each record for fast filtering.
            Not authoritative: rebuilt from the source of truth on each sync.
          </p>
          {!isSynced ? (
            <div className="cqrs-empty-msg">
              Press "Sync Now" to build the read projection from the source of truth.
            </div>
          ) : (
            <>
              <div className="cqrs-counts">
                <div className="cqrs-count-row">
                  <span className="cqrs-count-label">Documents</span>
                  <span className="cqrs-count-val">{readCount}</span>
                </div>
                <div className="cqrs-count-row">
                  <span className="cqrs-count-label">Staleness</span>
                  <span className="cqrs-count-val cqrs-count-ok">current</span>
                </div>
              </div>
              <div className="cqrs-projection-records">
                {records.map(r => (
                  <div key={r.identity_id} className="cqrs-projection-row">
                    <div className="cqrs-proj-name">{r.display_name}</div>
                    <div className="cqrs-proj-meta">
                      {r.agency_name} · {r.role} · {r.federation_protocol}
                    </div>
                    <div className="cqrs-searchable-text">{r.searchable_text}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      <div className="cqrs-note">
        <strong>Eventual consistency window.</strong> Between a write to the source of truth
        and completion of the next sync, the read store may serve stale data. In a real
        system this window is managed with change-data-capture (CDC) from Postgres WAL,
        retries on sync failure, and a staleness threshold alert if the gap grows too large.
        In this demo the sync is triggered manually to make the step explicitly visible.
      </div>
    </div>
  )
}

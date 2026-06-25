import { useEffect, useState } from 'react'
import type {
  NormalizedIdentity,
  CaseRecord,
  AccessDecisionResponse,
  AnomalyAlert,
  AuditLogEntry,
} from './types'
import { api } from './api'
import { IdentitySwitcher } from './components/IdentitySwitcher'
import { CaseRecordView } from './components/CaseRecordView'
import { AnomalyPanel } from './components/AnomalyPanel'
import { AuditLogPanel } from './components/AuditLogPanel'
import { AboutPage } from './components/AboutPage'
import { PersonResolutionTab } from './components/PersonResolutionTab'
import { PersonResolutionAbout } from './components/PersonResolutionAbout'
import { SourceSystemsConfig } from './components/SourceSystemsConfig'

type Section = 'abac' | 'persons'
type AbacSubTab = 'demo' | 'about'
type PersonsSubTab = 'records' | 'source-systems' | 'about'

const CASE_ID = 'SF-2024-CR-00842'

export function App() {
  const [identities, setIdentities] = useState<NormalizedIdentity[]>([])
  const [selectedIdentity, setSelectedIdentity] = useState<NormalizedIdentity | null>(null)
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [accessResult, setAccessResult] = useState<AccessDecisionResponse | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [showRawPayload, setShowRawPayload] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('abac')
  const [abacSubTab, setAbacSubTab] = useState<AbacSubTab>('demo')
  const [personsSubTab, setPersonsSubTab] = useState<PersonsSubTab>('records')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.listIdentities(), api.getCase(CASE_ID)])
      .then(([ids, rec]) => {
        setIdentities(ids)
        setCaseRecord(rec)
      })
      .catch((e: unknown) => setError(String(e)))
  }, [])

  const selectIdentity = async (identity: NormalizedIdentity) => {
    setSelectedIdentity(identity)
    setShowRawPayload(false)
    try {
      const result = await api.accessDecision(identity.internal_id, CASE_ID)
      setAccessResult(result)
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19)
      const newEntries: AuditLogEntry[] = result.field_results.map((r) => ({
        timestamp: ts,
        identity_id: identity.internal_id,
        display_name: identity.display_name,
        agency_id: identity.agency_id,
        case_id: CASE_ID,
        field_name: r.field_name,
        decision: r.decision,
        reason: r.reason,
      }))
      setAuditLog((prev) => [...prev, ...newEntries])
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  const handleAnomalyAlert = (alert: AnomalyAlert) => {
    if (!selectedIdentity) return
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const entry: AuditLogEntry = {
      timestamp: ts,
      identity_id: selectedIdentity.internal_id,
      display_name: selectedIdentity.display_name,
      agency_id: selectedIdentity.agency_id,
      case_id: CASE_ID,
      field_name: '[anomaly simulation]',
      decision: 'visible',
      reason: alert.triggered
        ? `ANOMALY FLAGGED: ${alert.reason} → routed to ${alert.routed_to}`
        : 'Anomaly simulation: no threshold breached',
    }
    setAuditLog((prev) => [...prev, entry])
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Could not connect to the API: {error}</p>
        <p>Make sure the backend is running: <code>uvicorn api.main:app --reload</code></p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Federated Identity &amp; ABAC Demo</h1>
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeSection === 'abac' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('abac')}
            >
              Federated Identity &amp; ABAC
            </button>
            <button
              className={`tab-btn ${activeSection === 'persons' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('persons')}
            >
              Person Records
            </button>
          </nav>
        </div>
      </header>

      <div className="sub-tab-bar">
        {activeSection === 'abac' ? (
          <>
            <button
              className={`sub-tab-btn ${abacSubTab === 'demo' ? 'sub-tab-active' : ''}`}
              onClick={() => setAbacSubTab('demo')}
            >
              Demo
            </button>
            <button
              className={`sub-tab-btn ${abacSubTab === 'about' ? 'sub-tab-active' : ''}`}
              onClick={() => setAbacSubTab('about')}
            >
              How it works
            </button>
          </>
        ) : (
          <>
            <button
              className={`sub-tab-btn ${personsSubTab === 'records' ? 'sub-tab-active' : ''}`}
              onClick={() => setPersonsSubTab('records')}
            >
              Records
            </button>
            <button
              className={`sub-tab-btn ${personsSubTab === 'source-systems' ? 'sub-tab-active' : ''}`}
              onClick={() => setPersonsSubTab('source-systems')}
            >
              Source Systems
            </button>
            <button
              className={`sub-tab-btn ${personsSubTab === 'about' ? 'sub-tab-active' : ''}`}
              onClick={() => setPersonsSubTab('about')}
            >
              How it works
            </button>
          </>
        )}
      </div>

      {activeSection === 'abac' ? (
        abacSubTab === 'demo' ? (
          <>
            <main className="app-main">
              <section className="left-col">
                <IdentitySwitcher
                  identities={identities}
                  selected={selectedIdentity}
                  onSelect={selectIdentity}
                  showRawPayload={showRawPayload}
                  onToggleRaw={() => setShowRawPayload((v) => !v)}
                />
                <AnomalyPanel
                  identity={selectedIdentity}
                  onAlert={handleAnomalyAlert}
                />
              </section>
              <section className="right-col">
                {caseRecord && (
                  <CaseRecordView
                    caseRecord={caseRecord}
                    accessResult={accessResult}
                  />
                )}
              </section>
            </main>
            <section className="audit-section">
              <AuditLogPanel
                entries={auditLog}
                onClear={() => setAuditLog([])}
              />
            </section>
          </>
        ) : (
          <AboutPage />
        )
      ) : (
        personsSubTab === 'records' ? (
          <PersonResolutionTab />
        ) : personsSubTab === 'source-systems' ? (
          <SourceSystemsConfig />
        ) : (
          <PersonResolutionAbout />
        )
      )}
    </div>
  )
}

import type {
  NormalizedIdentity,
  CaseRecord,
  AccessDecisionResponse,
  AnomalyAlert,
  PersonRecord,
  MatchCandidate,
  SourceSystemConfig,
  IngestedRecord,
  QueuedEvent,
  ReadProjectionRecord,
  SyncStatus,
  EntityResolutionState,
} from './types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  listIdentities: () => get<NormalizedIdentity[]>('/identities'),

  getCase: (caseId: string) => get<CaseRecord>(`/case/${caseId}`),

  accessDecision: (identityId: string, caseId: string) =>
    post<AccessDecisionResponse>('/access-decision', {
      identity_id: identityId,
      case_id: caseId,
    }),

  simulateAnomaly: (identityId: string, offHours: boolean, accessCount: number) =>
    post<AnomalyAlert>('/anomaly/simulate', {
      identity_id: identityId,
      off_hours: offHours,
      access_count: accessCount,
    }),

  listPersons: () => get<PersonRecord[]>('/persons'),

  getPendingMatches: () => get<MatchCandidate[]>('/matches/pending'),

  approveMatch: (matchId: string) =>
    post<MatchCandidate>(`/matches/${matchId}/approve`, {}),

  rejectMatch: (matchId: string) =>
    post<MatchCandidate>(`/matches/${matchId}/reject`, {}),

  listSourceSystems: () => get<SourceSystemConfig[]>('/source-systems'),

  // Ingestion patterns
  getIngestionLog:   () => get<IngestedRecord[]>('/ingest/log'),
  getIngestionQueue: () => get<QueuedEvent[]>('/ingest/queue'),
  pushEvent: (body: { source_system: string; agency_name: string; subject: string; event_type: string }) =>
    post<IngestedRecord>('/ingest/push', body),
  processQueueItem: () => post<IngestedRecord | null>('/ingest/queue/process', {}),
  runBatchPull: (source_system: string) =>
    post<{ records_pulled: number; records: IngestedRecord[] }>('/ingest/batch', { source_system }),

  // CQRS read store
  getReadStoreStatus:  () => get<SyncStatus>('/read-store/status'),
  getReadStoreRecords: () => get<ReadProjectionRecord[]>('/read-store/records'),
  syncReadStore:       () => post<SyncStatus>('/read-store/sync', {}),

  // Entity resolution
  getEntityResolutionState: () => get<EntityResolutionState>('/entity-resolution/state'),
  approveEntityMatch: (recordId: string) =>
    post<EntityResolutionState>(`/entity-resolution/review/${recordId}/approve`, {}),
  rejectEntityMatch: (recordId: string) =>
    post<EntityResolutionState>(`/entity-resolution/review/${recordId}/reject`, {}),
}

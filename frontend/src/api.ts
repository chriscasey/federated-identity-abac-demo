import type {
  NormalizedIdentity,
  CaseRecord,
  AccessDecisionResponse,
  AnomalyAlert,
  PersonRecord,
  MatchCandidate,
  SourceSystemConfig,
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
}

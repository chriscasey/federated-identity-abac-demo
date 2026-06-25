export type FederationProtocol = 'SAML' | 'OIDC'
export type AccessDecision = 'visible' | 'hidden' | 'redacted'
export type Classification =
  | 'shared_public'
  | 'shared_redacted'
  | 'prosecution_only'
  | 'defense_only'
  | 'ambiguous'

export interface Agency {
  id: string
  name: string
  federation_protocol: FederationProtocol
  security_contact: string
}

export interface NormalizedIdentity {
  internal_id: string
  display_name: string
  agency_id: string
  role: string
  clearance_level: string
  source_protocol: FederationProtocol
  raw_payload: Record<string, string>
}

export interface CaseField {
  field_name: string
  value: string
  classification: Classification
  rationale: string
}

export interface CaseRecord {
  case_id: string
  title: string
  fields: CaseField[]
}

export interface FieldAccessResult {
  field_name: string
  decision: AccessDecision
  value: string | null
  reason: string
}

export interface AccessDecisionResponse {
  identity_id: string
  case_id: string
  field_results: FieldAccessResult[]
}

export interface AnomalyAlert {
  triggered: boolean
  identity_id: string
  agency_id: string
  reason: string | null
  routed_to: string | null
  simulated_events: number
  off_hours: boolean
}

export interface AuditLogEntry {
  timestamp: string
  identity_id: string
  display_name: string
  agency_id: string
  case_id: string
  field_name: string
  decision: AccessDecision
  reason: string
}

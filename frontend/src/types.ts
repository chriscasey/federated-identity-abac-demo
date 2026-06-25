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

// ── Person identity resolution types ─────────────────────────────────────────

export interface PhysicalDescription {
  height: string | null
  weight: string | null
  hair: string | null
  eyes: string | null
  race: string | null
  sex: string | null
}

export interface ExtractedFields {
  names: string[]
  date_of_birth: string | null
  physical: PhysicalDescription | null
  identifiers: Record<string, string>
  source_ids: Record<string, string>
  case_references: string[]
}

export interface SourceRecord {
  id: string
  agency_id: string
  agency_name: string
  raw_text: string
  extracted: ExtractedFields
  ingested_at: string
  person_id: string | null
}

// ── Source system field registry ──────────────────────────────────────────────

export type FieldClassification = 'unique_identifier' | 'quasi_identifier' | 'descriptor'

export interface RegistryField {
  field_name: string
  label: string
  classification: FieldClassification
  description: string
}

export interface SourceSystemConfig {
  system_id: string
  display_name: string
  description: string
  fields: RegistryField[]
}

// ── Match candidates ──────────────────────────────────────────────────────────

export interface MatchedField {
  field_name: string
  label: string
  classification: FieldClassification
  match_type: string   // "exact" | "fuzzy" | "partial" | "verified"
}

export interface MatchCandidate {
  id: string
  source_record: SourceRecord
  person_id: string
  person_name: string
  decision: string              // "auto_link" | "pending" | "no_match"
  decisive_field: string | null
  matched_fields: MatchedField[]
  status: string                // "auto_linked" | "pending" | "approved" | "rejected"
}

export interface PersonRecord {
  id: string
  canonical_name: string
  date_of_birth: string | null
  aliases: string[]
  physical: PhysicalDescription | null
  identifiers: Record<string, string>
  source_records: SourceRecord[]
}

// ── Ingestion patterns ────────────────────────────────────────────────────────

export type FreshnessLevel = 'realtime' | 'near-realtime' | 'batch-24h'

export interface IngestedRecord {
  id: string
  source_system: string
  agency_name: string
  subject: string
  event_type: string
  freshness: FreshnessLevel
  ingestion_method: string
  ingested_at: string
}

export interface QueuedEvent {
  id: string
  source_system: string
  agency_name: string
  subject: string
  event_type: string
  queued_at: string
}

// ── CQRS read store ───────────────────────────────────────────────────────────

export interface ReadProjectionRecord {
  identity_id: string
  display_name: string
  role: string
  clearance_level: string
  agency_id: string
  agency_name: string
  federation_protocol: string
  searchable_text: string
}

export interface SyncStatus {
  syncing: boolean
  last_synced_at: string | null
  record_count: number
  source_record_count: number
}

// ── Entity resolution ─────────────────────────────────────────────────────────

export interface CitizenRecord {
  id: string
  source_system: string
  agency_name: string
  names: string[]
  date_of_birth: string | null
  address: string | null
  ssn: string | null
}

export interface EntityMatch {
  record_id: string
  golden_record_id: string
  name_score: number
  dob_score: number
  address_score: number | null
  composite_score: number
  decision: string  // "auto_link" | "review" | "no_match"
  score_breakdown: string
}

export interface GoldenRecord {
  id: string
  canonical_name: string
  date_of_birth: string | null
  canonical_address: string | null
  linked_record_ids: string[]
  source_systems: string[]
}

export interface ReviewQueueItem {
  match: EntityMatch
  citizen_record: CitizenRecord
  golden_record: GoldenRecord
}

export interface EntityResolutionState {
  citizen_records: CitizenRecord[]
  golden_records: GoldenRecord[]
  match_results: Record<string, EntityMatch>
  review_queue: ReviewQueueItem[]
  auto_link_threshold: number
  review_threshold: number
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

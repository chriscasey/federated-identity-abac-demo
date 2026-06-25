import type { CaseRecord, AccessDecisionResponse } from '../types'
import { FieldRow } from './FieldRow'

interface Props {
  caseRecord: CaseRecord
  accessResult: AccessDecisionResponse | null
}

export function CaseRecordView({ caseRecord, accessResult }: Props) {
  const resultByField = accessResult
    ? Object.fromEntries(accessResult.field_results.map((r) => [r.field_name, r]))
    : null

  return (
    <div className="case-record">
      <h2>{caseRecord.title}</h2>
      {!accessResult && (
        <p className="baseline-note">
          Showing unfiltered baseline — no identity selected. Select an identity above to apply access control.
        </p>
      )}
      <div className="field-list">
        {caseRecord.fields.map((field) => (
          <FieldRow
            key={field.field_name}
            field={field}
            result={resultByField ? (resultByField[field.field_name] ?? null) : null}
          />
        ))}
      </div>
    </div>
  )
}

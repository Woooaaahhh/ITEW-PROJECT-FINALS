import type { MedicalClearanceStatus, Student } from './spmsDb'

/** Row display: derived from stored fields + clearance status. */
export type MedicalListStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

/** Normalize legacy DB values and defaults. */
export function normalizeMedicalStatus(raw: string | null | undefined): MedicalClearanceStatus {
  const s = (raw ?? 'pending').toLowerCase()
  if (s === 'approved' || s === 'cleared') return 'approved'
  if (s === 'rejected' || s === 'not_cleared') return 'rejected'
  return 'pending'
}

/** True if any medical record fields or document exist. */
export function hasMedicalRecordData(s: Student): boolean {
  return Boolean(
    (s.medicalSubmittedAt ?? '').trim() ||
      (s.medicalHeight ?? '').trim() ||
      (s.medicalWeight ?? '').trim() ||
      (s.medicalBloodPressure ?? '').trim() ||
      (s.medicalPhysicianName ?? '').trim() ||
      (s.medicalExamDate ?? '').trim() ||
      (s.medicalFormDetails ?? '').trim() ||
      (s.medicalCondition ?? '').trim() ||
      s.medicalDocumentDataUrl,
  )
}

/** Status for Medical module table and filters. */
export function getMedicalListStatus(s: Student): MedicalListStatus {
  const norm = normalizeMedicalStatus(s.medicalClearanceStatus)
  if (norm === 'approved') return 'approved'
  if (norm === 'rejected') return 'rejected'
  return hasMedicalRecordData(s) ? 'pending' : 'not_submitted'
}

export function medicalListStatusLabel(status: MedicalListStatus): string {
  if (status === 'not_submitted') return 'Not Submitted'
  if (status === 'pending') return 'Pending'
  if (status === 'approved') return 'Approved'
  return 'Rejected'
}

export function medicalListStatusBadgeClass(status: MedicalListStatus): string {
  if (status === 'not_submitted') return 'bg-light text-secondary border'
  if (status === 'pending') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
  if (status === 'approved') return 'bg-success-subtle text-success border border-success-subtle'
  return 'bg-danger-subtle text-danger border border-danger-subtle'
}

export function isMedicalApprovedForTryouts(student: Student): boolean {
  return normalizeMedicalStatus(student.medicalClearanceStatus) === 'approved'
}

export function medicalStatusLabel(status: MedicalClearanceStatus): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

/** Student submitted form/doc and is waiting for faculty (pending review). */
export function hasPendingMedicalSubmission(student: Student): boolean {
  return (
    normalizeMedicalStatus(student.medicalClearanceStatus) === 'pending' &&
    Boolean(student.medicalSubmittedAt?.trim())
  )
}

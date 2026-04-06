import type { MedicalClearanceStatus, Student } from './spmsDb'

/** Normalize legacy DB values and defaults. */
export function normalizeMedicalStatus(raw: string | null | undefined): MedicalClearanceStatus {
  const s = (raw ?? 'pending').toLowerCase()
  if (s === 'approved' || s === 'cleared') return 'approved'
  if (s === 'rejected' || s === 'not_cleared') return 'rejected'
  return 'pending'
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

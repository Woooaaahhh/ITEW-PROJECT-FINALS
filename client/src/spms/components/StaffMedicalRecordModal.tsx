import { useEffect } from 'react'
import { StudentMedicalFormPanel } from './StudentMedicalFormPanel'

type StaffMedicalRecordModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  mode: 'staff' | 'readonly'
  /** Overrides default “Admin · view only” badge when mode is readonly */
  readOnlyBadgeLabel?: string
  onAfterSave?: () => void
}

export function StaffMedicalRecordModal({
  open,
  onClose,
  studentId,
  studentName,
  mode,
  readOnlyBadgeLabel,
  onAfterSave,
}: StaffMedicalRecordModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const isReadOnly = mode === 'readonly'

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="spms-staff-medical-title">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" role="document">
          <div
            className="modal-content border-0 overflow-hidden"
            style={{ borderRadius: 16, boxShadow: '0 24px 80px rgba(2, 6, 23, 0.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`modal-header border-0 border-bottom py-3 ${isReadOnly ? 'bg-secondary bg-opacity-10' : 'bg-primary bg-opacity-10'}`}>
              <div className="d-flex align-items-start gap-3 min-w-0">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 text-primary"
                  style={{ width: 44, height: 44, background: 'rgba(13, 110, 253, 0.12)' }}
                >
                  <i className="bi bi-heart-pulse fs-5" />
                </div>
                <div className="min-w-0">
                  <h5 id="spms-staff-medical-title" className="modal-title fw-bold mb-0">
                    {isReadOnly ? 'Medical record' : 'Medical record — edit'}
                  </h5>
                  <p className="spms-muted small mb-0 mt-1 text-truncate" title={studentName}>
                    {studentName}
                  </p>
                  {isReadOnly ? (
                    <span className="badge rounded-pill bg-secondary-subtle text-secondary border mt-2">
                      {readOnlyBadgeLabel ?? 'Admin · view only'}
                    </span>
                  ) : (
                    <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle mt-2">
                      Faculty · edit &amp; review
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className="btn-close flex-shrink-0 mt-1" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body p-3 p-md-4">
              <StudentMedicalFormPanel
                key={studentId + mode}
                studentId={studentId}
                mode={mode}
                hideFormTitle
                hideProfileLink
                onAfterSave={onAfterSave}
              />
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-outline-secondary rounded-3" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  )
}

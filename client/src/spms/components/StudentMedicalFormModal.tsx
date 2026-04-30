import { useEffect } from 'react'
import { StudentMedicalFormPanel } from './StudentMedicalFormPanel'

type StudentMedicalFormModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  /** Shown in the header when using a shared login to edit a chosen student */
  forStudentName?: string
  onAfterSave?: () => void
}

export function StudentMedicalFormModal({ open, onClose, studentId, forStudentName, onAfterSave }: StudentMedicalFormModalProps) {
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

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="spms-medical-modal-title">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" role="document">
          <div
            className="modal-content border-0 overflow-hidden"
            style={{ borderRadius: 16, boxShadow: '0 24px 80px rgba(2, 6, 23, 0.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header border-0 border-bottom bg-primary bg-opacity-10 py-3">
              <div className="d-flex align-items-start gap-3 min-w-0">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0 text-primary"
                  style={{ width: 44, height: 44, background: 'rgba(13, 110, 253, 0.12)' }}
                >
                  <i className="bi bi-heart-pulse fs-5" />
                </div>
                <div className="min-w-0">
                  <h5 id="spms-medical-modal-title" className="modal-title fw-bold mb-0">
                    Medical clearance
                  </h5>
                  {forStudentName ? (
                    <p className="fw-semibold text-body small mb-0 mt-1 text-truncate" title={forStudentName}>
                      Record for: {forStudentName}
                    </p>
                  ) : null}
                  <p className="spms-muted small mb-0 mt-1">
                    Add or update this student&apos;s information for try-out review. Faculty will approve or reject after submission.
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close flex-shrink-0 mt-1" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body p-3 p-md-4">
              <StudentMedicalFormPanel
                key={studentId}
                studentId={studentId}
                hideFormTitle
                hideProfileLink
                onAfterSave={onAfterSave}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  )
}

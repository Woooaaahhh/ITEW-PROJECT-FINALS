import avatarUrl from '../../assets/react.svg'
import type { Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

type ProfileCardProps = {
  student: Student | null
  loading?: boolean
}

export function ProfileCard({ student, loading }: ProfileCardProps) {
  if (loading) {
    return (
      <div
        className="spms-card card border-0"
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
      >
        <div className="card-body">
          <div className="spms-muted">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div
        className="spms-card card border-0"
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
      >
        <div className="card-body">
          <div className="spms-muted">No profile data available.</div>
        </div>
      </div>
    )
  }

  const name = fullName(student)

  const row = (label: string, value: string | null | undefined) => (
    <div className="d-flex flex-column py-2 border-bottom border-secondary border-opacity-25">
      <span className="spms-muted small">{label}</span>
      <span className="fw-medium">{value ?? '—'}</span>
    </div>
  )

  return (
    <div
      className="spms-card card border-0 overflow-hidden"
      style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
    >
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row align-items-start gap-4">
          <div className="flex-shrink-0 text-center">
            <img
              src={student.profilePictureDataUrl || avatarUrl}
              alt={name}
              className="rounded-4 border"
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderColor: 'rgba(15, 23, 42, .1) !important',
              }}
            />
          </div>
          <div className="flex-grow-1 min-w-0">
            <h5 className="fw-bold mb-3">{name}</h5>
            {row('Email', student.email)}
            {row('Contact Number', student.contactNumber)}
            {row('Address', student.address)}
            {row('Year Level', student.yearLevel ?? null)}
            {row('Section', student.section ?? null)}
          </div>
        </div>
      </div>
    </div>
  )
}

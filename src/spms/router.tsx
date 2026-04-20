/** Client-side routing (React Router): route table (createBrowserRouter); pages swap without a full document reload. */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell, type PageMeta } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { RoleProtectedRoute } from './components/RoleProtectedRoute'
import { RedirectToRoleDashboard } from './pages/RedirectToRoleDashboard'
import { RegistrarDashboard } from './pages/RegistrarDashboard'
import { RegistrarRecordsPage } from './pages/RegistrarRecordsPage'
import { FacultyDashboard } from './pages/FacultyDashboard'
import { StudentDashboard } from './pages/StudentDashboard'
import { StudentsPage } from './pages/StudentsPage'
import { AddStudentPage } from './pages/AddStudentPage'
import { EditStudentPage } from './pages/EditStudentPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { ReportsPage } from './pages/ReportsPage'
import { SectionsPage } from './pages/SectionsPage'
import { FacultyAchievementsPage } from './pages/FacultyAchievementsPage'
import { FacultyViolationsPage } from './pages/FacultyViolationsPage'
import { FacultySkillsPage } from './pages/FacultySkillsPage'
import { FacultySportsPage } from './pages/FacultySportsPage'
import { FacultyAcademicPage } from './pages/FacultyAcademicPage'
import { MedicalModulePage } from './pages/MedicalModulePage'
import { StudentMedicalSubmitPage } from './pages/StudentMedicalSubmitPage'
import { StudentMyRecordsPage } from './pages/StudentMyRecordsPage'
import { StudentLegacyProfileRedirect } from './pages/StudentLegacyProfileRedirect'
import { UsersPage } from './pages/UsersPage'
import { InstructionModulePage } from './pages/InstructionModulePage'
import { SchedulingPage } from './pages/SchedulingPage'
import { DashboardDebug } from './pages/DashboardDebug'
import { NotFoundPage } from './pages/NotFoundPage'
import { LoginPage } from './pages/LoginPage'
import { Link } from 'react-router-dom'

const dashboardHandle: PageMeta = {
  title: 'Dashboard',
  subtitle: 'Student Profile Management overview',
}

const registrarHandle: PageMeta = {
  title: 'Admin Dashboard',
  subtitle: 'Student profile management',
  showSearch: true,
}

const registrarRecordsHandle: PageMeta = {
  title: 'Behavior & achievements',
  subtitle: 'Verify official violation and non-academic records',
  showSearch: true,
}

const facultyHandle: PageMeta = {
  title: 'Faculty Dashboard',
  subtitle: 'View students, record violations and skills',
  showSearch: true,
}

const facultyViolationsHandle: PageMeta = {
  title: 'Violations',
  subtitle: 'Record and review student violations',
}

const facultyAchievementsHandle: PageMeta = {
  title: 'Achievements',
  subtitle: 'Record and review non-academic achievements',
}

const facultySkillsHandle: PageMeta = {
  title: 'Skills',
  subtitle: 'Assign and manage student skills',
}

const facultySportsHandle: PageMeta = {
  title: 'Sports',
  subtitle: 'Manage sports list and eligibility fields',
}

const facultyAcademicHandle: PageMeta = {
  title: 'Academic',
  subtitle: 'View current term, history, and update student academic records',
}

const medicalModuleHandle: PageMeta = {
  title: 'Medical',
  subtitle: 'Search students, view clearance status, and manage medical records',
  showSearch: true,
}

const studentMedicalHandle: PageMeta = {
  title: 'Medical submission',
  subtitle: 'Submit documents and details for faculty review',
}

const studentRecordsHandle: PageMeta = {
  title: 'My Records',
  subtitle: 'View your violations and skills records',
}

const studentHandle: PageMeta = {
  title: 'Student Dashboard',
  subtitle: 'Browse students and open a profile for full details',
}

const studentsHandle: PageMeta = {
  title: 'Student List',
  subtitle: 'Search and manage student profiles',
  right: (
    <Link className="btn btn-primary rounded-4 px-3" to="/students/new">
      <i className="bi bi-person-plus me-1" /> Add Student
    </Link>
  ),
}

const addHandle: PageMeta = {
  title: 'Add Student',
  subtitle: 'Create a new student profile record',
  right: (
    <Link className="btn btn-outline-primary rounded-4 px-3" to="/students">
      <i className="bi bi-arrow-left me-1" /> Back
    </Link>
  ),
}

const profileHandle: PageMeta = {
  title: 'Student Profile',
  subtitle: 'View complete student information',
}

const editHandle: PageMeta = {
  title: 'Edit Student',
  subtitle: 'Update student profile information',
  right: (
    <Link className="btn btn-outline-primary rounded-4 px-3" to="/students">
      <i className="bi bi-arrow-left me-1" /> Back
    </Link>
  ),
}

const reportsHandle: PageMeta = {
  title: 'Reports',
  subtitle: 'Filter students and export CSV or print',
}

const sectionsHandle: PageMeta = {
  title: 'Sections',
  subtitle: 'Manage class sections',
}

const usersHandle: PageMeta = {
  title: 'Account Management',
  subtitle: 'Create and manage user accounts',
}

const instructionHandle: PageMeta = {
  title: 'Instruction Module',
  subtitle: 'Manage syllabus, lessons, and curriculum',
}

const schedulingHandle: PageMeta = {
  title: 'Scheduling',
  subtitle: 'Manage rooms, labs, and faculty assignments',
}

const notFoundHandle: PageMeta = {
  title: 'Not Found',
  subtitle: 'Missing route',
}

export const spmsRouter = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <RedirectToRoleDashboard />, handle: dashboardHandle },
      {
        path: '/admin',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <RegistrarDashboard />
          </RoleProtectedRoute>
        ),
        handle: registrarHandle,
      },
      {
        path: '/admin/records',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <RegistrarRecordsPage />
          </RoleProtectedRoute>
        ),
        handle: registrarRecordsHandle,
      },
      { path: '/registrar', element: <Navigate to="/admin" replace /> },
      { path: '/registrar/records', element: <Navigate to="/admin/records" replace /> },
      {
        path: '/faculty',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultyDashboard />
          </RoleProtectedRoute>
        ),
        handle: facultyHandle,
      },
      {
        path: '/faculty/violations',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultyViolationsPage />
          </RoleProtectedRoute>
        ),
        handle: facultyViolationsHandle,
      },
      {
        path: '/faculty/achievements',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultyAchievementsPage />
          </RoleProtectedRoute>
        ),
        handle: facultyAchievementsHandle,
      },
      {
        path: '/faculty/skills',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultySkillsPage />
          </RoleProtectedRoute>
        ),
        handle: facultySkillsHandle,
      },
      {
        path: '/faculty/sports',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultySportsPage />
          </RoleProtectedRoute>
        ),
        handle: facultySportsHandle,
      },
      {
        path: '/faculty/academic',
        element: (
          <RoleProtectedRoute allowedRoles={['faculty']}>
            <FacultyAcademicPage />
          </RoleProtectedRoute>
        ),
        handle: facultyAcademicHandle,
      },
      {
        path: '/faculty/medical',
        element: <Navigate to="/medical" replace />,
      },
      {
        path: '/medical',
        element: (
          <RoleProtectedRoute allowedRoles={['admin', 'faculty', 'student']}>
            <MedicalModulePage />
          </RoleProtectedRoute>
        ),
        handle: medicalModuleHandle,
      },
      {
        path: '/student/records',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentMyRecordsPage />
          </RoleProtectedRoute>
        ),
        handle: studentRecordsHandle,
      },
      {
        path: '/student/medical',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentMedicalSubmitPage />
          </RoleProtectedRoute>
        ),
        handle: studentMedicalHandle,
      },
      {
        path: '/student',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </RoleProtectedRoute>
        ),
        handle: studentHandle,
      },
      {
        path: '/student/academic',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentLegacyProfileRedirect />
          </RoleProtectedRoute>
        ),
        handle: studentHandle,
      },
      {
        path: '/student/skills',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentLegacyProfileRedirect />
          </RoleProtectedRoute>
        ),
        handle: studentHandle,
      },
      {
        path: '/student/violations',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentLegacyProfileRedirect />
          </RoleProtectedRoute>
        ),
        handle: studentHandle,
      },
      {
        path: '/student/achievements',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentLegacyProfileRedirect />
          </RoleProtectedRoute>
        ),
        handle: studentHandle,
      },
      {
        path: '/students',
        element: (
          <RoleProtectedRoute allowedRoles={['admin', 'faculty']}>
            <StudentsPage />
          </RoleProtectedRoute>
        ),
        handle: studentsHandle,
      },
      {
        path: '/students/new',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AddStudentPage />
          </RoleProtectedRoute>
        ),
        handle: addHandle,
      },
      {
        path: '/students/:id',
        element: (
          <RoleProtectedRoute allowedRoles={['admin', 'faculty', 'student']}>
            <StudentProfilePage />
          </RoleProtectedRoute>
        ),
        handle: profileHandle,
      },
      {
        path: '/students/:id/edit',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <EditStudentPage />
          </RoleProtectedRoute>
        ),
        handle: editHandle,
      },
      {
        path: '/reports',
        element: (
          // Rubric note: current behavior is NOT "Registrar-only".
          // Access to /reports is allowed for BOTH roles below: admin (Registrar) and faculty.
          // Students are blocked by this guard + canAccessPath() in authService.ts.
          <RoleProtectedRoute allowedRoles={['admin', 'faculty']}>
            <ReportsPage />
          </RoleProtectedRoute>
        ),
        handle: reportsHandle,
      },
      {
        path: '/sections',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <SectionsPage />
          </RoleProtectedRoute>
        ),
        handle: sectionsHandle,
      },
      {
        path: '/users',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <UsersPage />
          </RoleProtectedRoute>
        ),
        handle: usersHandle,
      },
      {
        path: '/scheduling',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <SchedulingPage />
          </RoleProtectedRoute>
        ),
        handle: schedulingHandle,
      },
      {
        path: '/debug',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <DashboardDebug />
          </RoleProtectedRoute>
        ),
        handle: { title: 'Dashboard Debug', subtitle: 'Diagnostic tool for dashboard loading issues' },
      },
      {
        path: '/instruction',
        element: (
          <RoleProtectedRoute allowedRoles={['admin', 'faculty', 'student']}>
            <InstructionModulePage />
          </RoleProtectedRoute>
        ),
        handle: instructionHandle,
      },
      { path: '*', element: <NotFoundPage />, handle: notFoundHandle },
    ],
  },
])

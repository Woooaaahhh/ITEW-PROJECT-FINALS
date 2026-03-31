import { createBrowserRouter } from 'react-router-dom'
import { AppShell, type PageMeta } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { RoleProtectedRoute } from './components/RoleProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { RedirectToRoleDashboard } from './pages/RedirectToRoleDashboard'
import { RegistrarDashboard } from './pages/RegistrarDashboard'
import { FacultyDashboard } from './pages/FacultyDashboard'
import { StudentDashboard } from './pages/StudentDashboard'
import { StudentsPage } from './pages/StudentsPage'
import { AddStudentPage } from './pages/AddStudentPage'
import { EditStudentPage } from './pages/EditStudentPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { ReportsPage } from './pages/ReportsPage'
import { SectionsPage } from './pages/SectionsPage'
import { FacultyAchievementsPage, FacultyViolationsPage } from './pages/FacultyViolationsPage'
import { FacultySkillsPage } from './pages/FacultySkillsPage'
import { StudentAcademicPage } from './pages/StudentAcademicPage'
import { StudentSkillsPage } from './pages/StudentSkillsPage'
import { StudentAchievementsPage } from './pages/StudentAchievementsPage'
import { StudentViolationsPage } from './pages/StudentViolationsPage'
import { UsersPage } from './pages/UsersPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { LoginPage } from './pages/LoginPage'
import { Link } from 'react-router-dom'

const dashboardHandle: PageMeta = {
  title: 'Dashboard',
  subtitle: 'Student Profile Management overview',
}

const registrarHandle: PageMeta = {
  title: 'Registrar Dashboard',
  subtitle: 'Student profile management',
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

const studentHandle: PageMeta = {
  title: 'Student Dashboard',
  subtitle: 'View your profile and academic info',
}

const studentAcademicHandle: PageMeta = {
  title: 'Academic History',
  subtitle: 'View your academic records',
}

const studentSkillsHandle: PageMeta = {
  title: 'Skills',
  subtitle: 'View your recorded skills',
}

const studentViolationsHandle: PageMeta = {
  title: 'Violations',
  subtitle: 'Your official violation records',
}

const studentAchievementsHandle: PageMeta = {
  title: 'Achievements',
  subtitle: 'Your non-academic achievements',
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
  right: (
    <div className="d-flex gap-2">
      <Link className="btn btn-outline-primary rounded-4 px-3" to="/students">
        <i className="bi bi-arrow-left me-1" /> Back
      </Link>
    </div>
  ),
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
        path: '/registrar',
        element: (
          <RoleProtectedRoute allowedRoles={['admin']}>
            <RegistrarDashboard />
          </RoleProtectedRoute>
        ),
        handle: registrarHandle,
      },
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
            <StudentAcademicPage />
          </RoleProtectedRoute>
        ),
        handle: studentAcademicHandle,
      },
      {
        path: '/student/skills',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentSkillsPage />
          </RoleProtectedRoute>
        ),
        handle: studentSkillsHandle,
      },
      {
        path: '/student/violations',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentViolationsPage />
          </RoleProtectedRoute>
        ),
        handle: studentViolationsHandle,
      },
      {
        path: '/student/achievements',
        element: (
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentAchievementsPage />
          </RoleProtectedRoute>
        ),
        handle: studentAchievementsHandle,
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
          <RoleProtectedRoute allowedRoles={['admin']}>
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
      { path: '*', element: <NotFoundPage />, handle: notFoundHandle },
    ],
  },
])

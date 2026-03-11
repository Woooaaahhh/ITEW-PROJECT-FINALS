import { createBrowserRouter } from 'react-router-dom'
import { AppShell, type PageMeta } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { StudentsPage } from './pages/StudentsPage'
import { AddStudentPage } from './pages/AddStudentPage'
import { EditStudentPage } from './pages/EditStudentPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { Link } from 'react-router-dom'

const dashboardHandle: PageMeta = {
  title: 'Dashboard',
  subtitle: 'Student Profile Management overview',
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

const notFoundHandle: PageMeta = {
  title: 'Not Found',
  subtitle: 'Missing route',
}

export const spmsRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage />, handle: dashboardHandle },
      { path: '/students', element: <StudentsPage />, handle: studentsHandle },
      { path: '/students/new', element: <AddStudentPage />, handle: addHandle },
      { path: '/students/:id', element: <StudentProfilePage />, handle: profileHandle },
      { path: '/students/:id/edit', element: <EditStudentPage />, handle: editHandle },
      { path: '*', element: <NotFoundPage />, handle: notFoundHandle },
    ],
  },
])


import { useState, useEffect } from 'react'
import { useData, useToast } from './context/AppContext'
import { authService, dashboardService } from './services/api'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import LoginPage from './components/LoginPage'
import DashboardPage from './components/DashboardPage'
import StudentsPage from './components/StudentsPage'
import DeficienciesPage from './components/DeficienciesPage'
import GradesPage from './components/GradesPage'
import CurriculumPage from './components/CurriculumPage'
import ReportsPage from './components/ReportsPage'

import AddStudentModal from './components/modals/AddStudentModal'
import EditStudentModal from './components/modals/EditStudentModal'
import StudentProfileModal from './components/modals/StudentProfileModal'
import AddDeficiencyModal from './components/modals/AddDeficiencyModal'
import AddGradeModal from './components/modals/AddGradeModal'
import AddCurriculumModal from './components/modals/AddCurriculumModal'

import useModal from './hooks/useModal'
import { useStudents } from './hooks/useStudents'
import { useDeficiencies } from './hooks/useDeficiencies'
import { useGrades } from './hooks/useGrades'
import { useSubjects } from './hooks/useSubjects'

export default function App() {
  const [user, setUser] = useState(authService.getUser())
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState(null)
  
  const toast = useToast()
  const { setStudents, setDeficiencies, setGrades, setSubjects, addActivity } = useData()

  // Modals
  const studentModal = useModal()
  const editStudentModal = useModal()
  const profileModal = useModal()
  const deficiencyModal = useModal()
  const gradeModal = useModal()
  const curriculumModal = useModal()

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [initialCourse, setInitialCourse] = useState('')

  // Data fetching
  const { refresh: refreshStudents } = useStudents()
  const { refresh: refreshDeficiencies } = useDeficiencies()
  const { refresh: refreshGrades } = useGrades()
  const { refresh: refreshSubjects } = useSubjects()

  useEffect(() => {
    if (user) {
      loadStats()
      refreshStudents()
      refreshDeficiencies()
      refreshGrades()
      refreshSubjects()
    }
  }, [user])

  async function loadStats() {
    try {
      const data = await dashboardService.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats', err)
    }
  }

  function handleLogin() {
    setUser(authService.getUser())
  }

  function handleLogout() {
    authService.logout()
    setUser(null)
    setCurrentPage('dashboard')
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            stats={stats}
            onNavigate={setCurrentPage}
            onAddStudent={() => studentModal.open()}
            user={user}
          />
        )
      case 'students':
        return (
          <StudentsPage
            onEdit={(s) => {
              setSelectedStudent(s)
              editStudentModal.open()
            }}
            onView={(s) => {
              setSelectedStudent(s)
              profileModal.open()
            }}
            onAdd={() => studentModal.open()}
          />
        )
      case 'deficiencies':
        return <DeficienciesPage onAdd={() => deficiencyModal.open()} />
      case 'grades':
        return <GradesPage onAdd={() => gradeModal.open()} />
      case 'curriculum':
        return (
          <CurriculumPage
            onAddToCurriculum={(course) => {
              setInitialCourse(course)
              curriculumModal.open()
            }}
          />
        )
      case 'reports':
        return <ReportsPage />
      default:
        return <DashboardPage stats={stats} />
    }
  }

  return (
    <div className={!sidebarOpen ? 'sidebar-closed' : ''} style={{ width: '100%' }}>
      <Sidebar
        isOpen={sidebarOpen}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        user={user}
      />

      <main className="main">
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onSearch={(val) => {
            // Handle global search if needed, or pass to pages
            console.log('Global search:', val)
          }}
        />

        {renderPage()}
      </main>

      {/* Modals */}
      <AddStudentModal
        isOpen={studentModal.isOpen}
        onClose={studentModal.close}
        onSaved={() => {
          refreshStudents()
          loadStats()
          addActivity('Added new student record', 'green')
        }}
      />

      <EditStudentModal
        isOpen={editStudentModal.isOpen}
        onClose={editStudentModal.close}
        student={selectedStudent}
        onSaved={() => {
          refreshStudents()
          addActivity(`Updated student <b>${selectedStudent?.student_number}</b>`, 'blue')
        }}
      />

      <StudentProfileModal
        isOpen={profileModal.isOpen}
        onClose={profileModal.close}
        student={selectedStudent}
        onEdit={() => {
          profileModal.close()
          editStudentModal.open()
        }}
        onDeleted={() => {
          profileModal.close()
          refreshStudents()
          loadStats()
          addActivity(`Deleted student <b>${selectedStudent?.student_number}</b>`, 'red')
        }}
      />

      <AddDeficiencyModal
        isOpen={deficiencyModal.isOpen}
        onClose={deficiencyModal.close}
        onSaved={() => {
          refreshDeficiencies()
          loadStats()
          addActivity('Recorded new deficiency', 'orange')
        }}
      />

      <AddGradeModal
        isOpen={gradeModal.isOpen}
        onClose={gradeModal.close}
        onSaved={() => {
          refreshGrades()
          addActivity('Added new grade entry', 'blue')
        }}
      />

      <AddCurriculumModal
        isOpen={curriculumModal.isOpen}
        onClose={curriculumModal.close}
        initialCourse={initialCourse}
        onSaved={() => {
          // Re-trigger curriculum load
          setCurrentPage('curriculum')
          addActivity(`Updated curriculum for <b>${initialCourse}</b>`, 'blue')
        }}
      />
    </div>
  )
}

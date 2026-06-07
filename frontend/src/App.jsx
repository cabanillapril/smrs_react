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
import ImportCORPage from './components/ImportCORPage'
import ImportAppraisalPage from './components/ImportAppraisalPage'
import ImportGradeReport from './components/ImportGradeReport'



import AddStudentModal from './components/modals/AddStudentModal'
import EditStudentModal from './components/modals/EditStudentModal'
import StudentProfileModal from './components/modals/StudentProfileModal'
import AddDeficiencyModal from './components/modals/AddDeficiencyModal'
import AddGradeModal from './components/modals/AddGradeModal'
import AddCurriculumModal from './components/modals/AddCurriculumModal'
import EditGradeModal from './components/modals/EditGradeModal'
import LogoutModal from './components/modals/LogoutModal'

import useModal from './hooks/useModal'

import { useStudents } from './hooks/useStudents'
import { useDeficiencies } from './hooks/useDeficiencies'
import { useGrades } from './hooks/useGrades'
import { useSubjects } from './hooks/useSubjects'

export default function App() {
  const [user, setUser] = useState(authService.getUser())
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [globalSearch, setGlobalSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState(null)
  const [profileInitialTab, setProfileInitialTab] = useState(null)

  const toast = useToast()
  const { students, setStudents, setDeficiencies, setGrades, setSubjects, addActivity } = useData()

  // Modals
  const logoutModal = useModal()

  const studentModal = useModal()

  const editStudentModal = useModal()
  const profileModal = useModal()
  const deficiencyModal = useModal()
  const gradeModal = useModal()
  const editGradeModal = useModal()
  const curriculumModal = useModal()

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedGrade, setSelectedGrade] = useState(null)
  const [initialCourse, setInitialCourse] = useState('')

  // Data fetching
  const { refresh: refreshStudents } = useStudents()
  const { refresh: refreshDeficiencies } = useDeficiencies()
  const { refresh: refreshGrades } = useGrades()
  const { refresh: refreshSubjects } = useSubjects()

  useEffect(() => {
    if (!user) return

    loadStats()
    refreshStudents()
    refreshDeficiencies()
    refreshGrades()
    refreshSubjects()
  }, [user])



  async function loadStats() {
    try {
      const data = await dashboardService.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats', {
        message: err?.message,
        tokenPresent: !!localStorage.getItem('smrs_token'),
      })
    }
  }

  function handleLogin() {
    setUser(authService.getUser())
  }

  function handleLogout() {
    // open logout confirmation modal
    logoutModal.open()
  }

  async function confirmLogout() {
    authService.logout()
    setUser(null)
    setCurrentPage('dashboard')
  }

  async function handleViewStudentById(studentId) {
    try {
      // First try to find the student in the already-loaded context (fast, no extra API call)
      let student = students.find(
        (s) => s.student_id === studentId || String(s.student_number) === String(studentId)
      )
      if (!student) {
        // Not found - might be a freshly-created student; refresh the list and search the fresh data
        const freshList = await refreshStudents()
        student = (freshList || []).find(
          (s) => s.student_id === studentId || String(s.student_number) === String(studentId)
        )
      }
      if (!student) {
        toast('Student not found in database.', 'error')
        return
      }
      setProfileInitialTab('profile')
      setSelectedStudent(student)
      profileModal.open()
    } catch (err) {
      toast(`Failed to load student details: ${err.message}`, 'error')
    }
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
              setProfileInitialTab('profile')
              setSelectedStudent(s)
              profileModal.open()
            }}
            onAdd={() => studentModal.open()}
            globalSearch={globalSearch}
          />
        )
      case 'deficiencies':
        return <DeficienciesPage onAdd={() => deficiencyModal.open()} onViewStudent={(s) => { setProfileInitialTab('deficiencies'); setSelectedStudent(s); profileModal.open(); }} />
      case 'grades':
        return (
          <GradesPage
            onAdd={() => gradeModal.open()}
            onEdit={(g) => {
              setSelectedGrade(g)
              editGradeModal.open()
            }}
            onViewStudent={(s) => { setProfileInitialTab('grades'); setSelectedStudent(s); profileModal.open(); }}
          />
        )
      case 'curriculum':
        return (
          <CurriculumPage
            onAddToCurriculum={(course) => {
              setInitialCourse(course)
              curriculumModal.open()
            }}
          />
        )
      case 'import-cor':
        return <ImportCORPage onActivity={addActivity} onViewStudent={handleViewStudentById} />
      case 'reports':
        return <ReportsPage />
      case 'import':
        return <ImportAppraisalPage onActivity={addActivity} />
      case 'import-grade':
        return <ImportGradeReport onActivity={addActivity} />
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
            setGlobalSearch(val || '')
            if (currentPage !== 'students') setCurrentPage('students')
          }}
        />

        {renderPage()}
      </main>

      {/* Modals */}
      <LogoutModal
        isOpen={logoutModal.isOpen}
        onClose={logoutModal.close}
        onConfirm={confirmLogout}
      />

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
        onAddGrade={(studentNumber) => {
          setSelectedStudent(selectedStudent) // keep current
          gradeModal.open()
          // grade modal will use initialStudentId prop
        }}
        onAddDeficiency={(studentNumber) => {
          setSelectedStudent((prev) => prev)
          setTimeout(() => {
            deficiencyModal.open()
          }, 0)
          // keep selected student so initialStudentId keeps the correct format (student_number)
        }}
        onEditGrade={(g) => {
          setSelectedGrade(g)
          profileModal.close()
          setTimeout(() => editGradeModal.open(), 0)
        }}
      />


      <AddDeficiencyModal
        isOpen={deficiencyModal.isOpen}
        onClose={deficiencyModal.close}
        initialStudentId={selectedStudent?.student_id || selectedStudent?.student_number || ''}
        onSaved={() => {
          refreshDeficiencies()
          loadStats()
          addActivity('Recorded new deficiency', 'orange')
        }}
      />

      <AddGradeModal
        isOpen={gradeModal.isOpen}
        onClose={gradeModal.close}
        initialStudentId={selectedStudent?.student_id || selectedStudent?.student_number || ''}
        onSaved={() => {
          refreshGrades()
          addActivity('Added new grade entry', 'blue')
        }}
      />

      <EditGradeModal
        isOpen={editGradeModal.isOpen}
        onClose={() => {
          editGradeModal.close()
          setSelectedGrade(null)
        }}
        grade={selectedGrade}
        onSaved={() => {
          refreshGrades()
          loadStats()
          addActivity('Updated grade entry', 'blue')
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

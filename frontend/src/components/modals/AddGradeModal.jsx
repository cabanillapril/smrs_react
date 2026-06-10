import { useEffect, useState } from 'react'
import Modal from '../Modal'

import { FormGroup, FormInput, FormSelect } from '../Form'
import { gradeService, studentService } from '../../services/api'
import { useData } from '../../context/AppContext'

export default function AddGradeModal({ isOpen, onClose, onSaved, initialStudentId = '' }) {
  const { students, grades } = useData()
  const [form, setForm] = useState({
    student_id: '',
    subject_code: '',
    subject_name: '',
    school_year: '2025-2026',
    midterm: '',
    finals: '',
    instructor: '',
    semester: '1',
  })

  const [loading, setLoading] = useState(false)
  const [studentName, setStudentName] = useState('')

  // Auto-fetch student name when ID changes
  useEffect(() => {
    const id = form.student_id.trim().toUpperCase()
    if (id.length >= 4) {
      // Instant lookup in the local students list for "real-time" feedback
      const found = students.find(s => (s.student_id || '').toUpperCase() === id)
      if (found) {
        setStudentName(`${found.first_name} ${found.last_name}`)
      } else {
        setStudentName('')
      }
    } else {
      setStudentName('')
    }
  }, [form.student_id, students])

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({ ...prev, student_id: initialStudentId || prev.student_id }))
      if (!initialStudentId) setStudentName('')
    }
  }, [isOpen, initialStudentId])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }


  const resetForm = () => setForm({
    student_id: '',
    subject_code: '',
    subject_name: '',
    school_year: '2025-2026',
    midterm: '',
    finals: '',
    instructor: '',
    semester: '1',
  })

  async function handleSave() {
    if (!form.student_id || !form.subject_code) return

    const sid = form.student_id.trim().toUpperCase()
    const code = form.subject_code.trim().toUpperCase()

    // Check for existing grade with same student + subject code
    const existing = (grades || []).find(g =>
      (g.student_id || '').toUpperCase() === sid &&
      (g.subject_code || '').toUpperCase() === code
    )

    if (existing) {
      const replace = window.confirm(
        `A grade record for "${form.subject_code.toUpperCase()}" already exists for this student.\n\n` +
        `OK → Replace with new data\nCancel → Keep existing record`
      )
      if (!replace) return

      setLoading(true)
      try {
        await gradeService.update(existing.grade_id, {
          subject_code: form.subject_code,
          subject_name: form.subject_name || null,
          midterm: form.midterm ? parseFloat(form.midterm) : null,
          finals: form.finals ? parseFloat(form.finals) : null,
          instructor: form.instructor || null,
          semester: parseInt(form.semester),
          school_year: form.school_year,
        })
        resetForm()
        onSaved()
        onClose()
      } catch (err) {
        let conflictData = null
        try {
          const parsed = JSON.parse(err.message)
          if (parsed && parsed.type === 'SUBJECT_CONFLICT') {
            conflictData = parsed
          }
        } catch (e) {}

        if (conflictData) {
          const msg = `Subject code "${conflictData.subject_code}" already exists in the system as "${conflictData.existing.subject_name}" (${conflictData.existing.unit} units).\n\n` +
                      `Do you want to update the system to use the new name "${conflictData.incoming.subject_name}"?\n\n` +
                      `OK/Yes → Apply new details\nCancel/No → Keep existing details`
          const overwrite = window.confirm(msg)
          
          setLoading(true)
          try {
            await gradeService.update(existing.grade_id, {
              subject_code: form.subject_code,
              subject_name: form.subject_name || null,
              midterm: form.midterm ? parseFloat(form.midterm) : null,
              finals: form.finals ? parseFloat(form.finals) : null,
              instructor: form.instructor || null,
              semester: parseInt(form.semester),
              school_year: form.school_year,
            }, !overwrite, overwrite)
            resetForm()
            onSaved()
            onClose()
          } catch (retryErr) {
            alert(retryErr.message)
          } finally {
            setLoading(false)
          }
          return
        }
        alert(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      await gradeService.create({
        student_id: form.student_id,
        subject_code: form.subject_code,
        subject_name: form.subject_name || null,
        semester: form.semester,
        school_year: form.school_year,
        midterm_grade: form.midterm ? parseFloat(form.midterm) : null,
        final_grade: form.finals ? parseFloat(form.finals) : null,
        instructor: form.instructor || null,
      })
      resetForm()
      onSaved()
      onClose()
    } catch (err) {
      let conflictData = null
      try {
        const parsed = JSON.parse(err.message)
        if (parsed && parsed.type === 'SUBJECT_CONFLICT') {
          conflictData = parsed
        }
      } catch (e) {}

      if (conflictData) {
        const msg = `Subject code "${conflictData.subject_code}" already exists in the system as "${conflictData.existing.subject_name}" (${conflictData.existing.unit} units).\n\n` +
                    `Do you want to update the system to use the new name "${conflictData.incoming.subject_name}"?\n\n` +
                    `OK/Yes → Apply new details\nCancel/No → Keep existing details`
        const overwrite = window.confirm(msg)
        
        setLoading(true)
        try {
          await gradeService.create({
            student_id: form.student_id,
            subject_code: form.subject_code,
            subject_name: form.subject_name || null,
            semester: form.semester,
            school_year: form.school_year,
            midterm_grade: form.midterm ? parseFloat(form.midterm) : null,
            final_grade: form.finals ? parseFloat(form.finals) : null,
            instructor: form.instructor || null,
          }, !overwrite, overwrite)
          resetForm()
          onSaved()
          onClose()
        } catch (retryErr) {
          alert(retryErr.message)
        } finally {
          setLoading(false)
        }
        return
      }
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Grade Entry"
      size="narrow"
    >
      <div className="modal-body">
        <FormGroup label="Student ID" required>
          <FormInput value={form.student_id} onChange={(e) => set('student_id', e.target.value)} placeholder="e.g. 23-00000" />
          {studentName && (
            <div style={{
              marginTop: 4,
              fontSize: '0.85rem',
              color: 'var(--accent-blue)',
              fontWeight: 600
            }}>{studentName}</div>
          )}
        </FormGroup>
        <FormGroup label="Subject Code" required>
          <FormInput value={form.subject_code} onChange={(e) => set('subject_code', e.target.value)} placeholder="e.g. MATH101" />
        </FormGroup>
        <FormGroup label="Subject Name">
          <FormInput value={form.subject_name} onChange={(e) => set('subject_name', e.target.value)} placeholder="e.g. College Algebra" />
        </FormGroup>
        <FormGroup label="Instructor">
          <FormInput value={form.instructor} onChange={(e) => set('instructor', e.target.value)} placeholder="Instructor Name (Optional)" />
        </FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Midterm Grade">
            <FormInput type="number" step="0.25" value={form.midterm} onChange={(e) => set('midterm', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
          <FormGroup label="Finals Grade">
            <FormInput type="number" step="0.25" value={form.finals} onChange={(e) => set('finals', e.target.value)} placeholder="1.0-5.0" />
          </FormGroup>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Semester">
            <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">Summer</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="School Year">
            <FormInput value={form.school_year} onChange={(e) => set('school_year', e.target.value)} placeholder="eg. 2025-2026" />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save Grade'}
        </button>
      </div>
    </Modal>
  )
}

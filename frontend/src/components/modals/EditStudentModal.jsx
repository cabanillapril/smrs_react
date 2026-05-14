import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import { studentService } from '../../services/api'
import { PROGRAMS, STATUSES } from '../../utils/constants'
import MajorSelect from '../MajorSelect'

export default function EditStudentModal({ isOpen, onClose, onSaved, student }) {
  const [form, setForm] = useState({
    student_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    birthday: '',
    gender: '',
    address: '',
    contact_number: '',
    email: '',
    course: '',
    major: '',
    year_level: '1',
    section: '',
    status: 'Regular',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (student) {
      setForm({
        student_id: student.student_id || '',
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        birthday: student.birthday || '',
        gender: student.gender || '',
        address: student.address || '',
        contact_number: student.contact_number || '',
        email: student.email || '',
        course: student.course || PROGRAMS[0],
        major: student.major || '',
        year_level: String(student.year_level || 1),
        section: student.section || '',
        status: student.status || 'Regular',
      })
    }
  }, [student])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!student || !form.student_id || !form.first_name || !form.last_name) return
    setLoading(true)
    try {
      await studentService.update(student.student_number, {
        ...form,
        year_level: parseInt(form.year_level),
        section: (form.section || 'A').toUpperCase().substring(0, 1),
      })
      onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Record: ${student?.student_id || student?.student_number}`}
      size="large"
    >
      <div className="modal-body">
        <div className="info-section-title">Personal Information</div>
        <div className="form-grid" style={{ marginBottom: 24 }}>
          <FormGroup label="First Name" required>
            <FormInput value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
          </FormGroup>
          <FormGroup label="Middle Name">
            <FormInput value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
          </FormGroup>
          <FormGroup label="Last Name" required>
            <FormInput value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </FormGroup>
          <FormGroup label="Gender">
            <FormSelect value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Birthday">
            <FormInput type="date" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
          </FormGroup>
        </div>

        <div className="info-section-title">Contact Details</div>
        <div className="form-grid" style={{ marginBottom: 24 }}>
          <FormGroup label="Email Address">
            <FormInput type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </FormGroup>
          <FormGroup label="Contact Number">
            <FormInput value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} />
          </FormGroup>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormGroup label="Full Address">
              <FormInput value={form.address} onChange={(e) => set('address', e.target.value)} />
            </FormGroup>
          </div>
        </div>

        <div className="info-section-title">Academic Information</div>
        <div className="form-grid">
          <FormGroup label="Student ID" required>
            <FormInput value={form.student_id} onChange={(e) => set('student_id', e.target.value)} />
          </FormGroup>
          <FormGroup label="Enrollment Status">
            <FormSelect value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Academic Program">
            <FormSelect value={form.course} onChange={(e) => { set('course', e.target.value); set('major', ''); }}>
              {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Major">
            <MajorSelect program={form.course} value={form.major} onChange={(e) => set('major', e.target.value)} />
          </FormGroup>
          <FormGroup label="Year Level">
            <FormSelect value={form.year_level} onChange={(e) => set('year_level', e.target.value)}>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Section">
            <FormInput 
              value={form.section} 
              onChange={(e) => set('section', e.target.value.toUpperCase().substring(0,1))} 
              placeholder="A-Z"
              maxLength="1"
            />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Update Record'}
        </button>
      </div>
    </Modal>
  )
}

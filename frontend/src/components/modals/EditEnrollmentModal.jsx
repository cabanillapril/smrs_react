import React, { useEffect, useState } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import { enrollmentService } from '../../services/api'

export default function EditEnrollmentModal({ isOpen, onClose, onSaved, enrollment }) {
  const [form, setForm] = useState({
    units: '',
    instructor: '',
    semester: '1',
    school_year: '',
    schedule: '',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && enrollment) {
      setForm({
        units: enrollment.units?.toString() || '3',
        instructor: enrollment.instructor || '',
        semester: enrollment.semester?.toString() || '1',
        school_year: enrollment.school_year || '',
        schedule: enrollment.schedule || '',
      })
    }
  }, [isOpen, enrollment])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!enrollment) return
    setLoading(true)
    try {
      await enrollmentService.update(enrollment.enrollment_id, {
        semester: parseInt(form.semester),
        school_year: form.school_year || null,
        instructor: form.instructor || null,
        units: form.units ? parseFloat(form.units) : 3.0,
        schedule: form.schedule || null,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Enrolled Subject" size="narrow">
      <div className="modal-body">
        <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Subject: <b style={{ color: 'var(--text-normal)' }}>{enrollment?.subject_code}</b>
          {enrollment?.subject_name && ` — ${enrollment.subject_name}`}
        </div>

        <FormGroup label="Units" required>
          <FormInput
            type="number"
            step="1"
            value={form.units}
            onChange={(e) => set('units', e.target.value)}
            placeholder="e.g. 3"
          />
        </FormGroup>

        <FormGroup label="Instructor">
          <FormInput
            value={form.instructor}
            onChange={(e) => set('instructor', e.target.value)}
            placeholder="e.g. C. Reotutar"
          />
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Semester">
            <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">Summer</option>
            </FormSelect>
          </FormGroup>

          <FormGroup label="School Year">
            <FormInput
              value={form.school_year}
              onChange={(e) => set('school_year', e.target.value)}
              placeholder="e.g. 2025-2026"
            />
          </FormGroup>
        </div>

        <FormGroup label="Schedule">
          <FormInput
            value={form.schedule}
            onChange={(e) => set('schedule', e.target.value)}
            placeholder="e.g. TTh 1:00 PM - 2:30 PM (Optional)"
          />
        </FormGroup>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

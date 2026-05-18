import { useEffect, useState } from 'react'
import Modal from '../Modal'

import { FormGroup, FormInput, FormSelect } from '../Form'
import { gradeService } from '../../services/api'
import { SEMESTERS } from '../../utils/constants'

export default function EditGradeModal({ isOpen, onClose, onSaved, grade }) {
    const [form, setForm] = useState({
        midterm: '',
        finals: '',
        grade: '',
        remarks: '',
        semester: SEMESTERS[0],
    })

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        if (!grade) return
        setForm({
            midterm: grade.midterm ?? '',
            finals: grade.finals ?? '',
            grade: grade.grade ?? '',
            remarks: grade.remarks ?? '',
            semester: grade.semester ?? SEMESTERS[0],
        })
    }, [isOpen, grade])

    function set(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        if (!grade) return
        setLoading(true)
        try {
            await gradeService.update(grade.grade_id, {
                midterm: form.midterm !== '' ? parseFloat(form.midterm) : null,
                finals: form.finals !== '' ? parseFloat(form.finals) : null,
                grade: form.grade !== '' ? parseFloat(form.grade) : null,
                remarks: form.remarks !== '' ? form.remarks : null,
            })
            onSaved?.()
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
            title="Edit Grade Entry"
            size="narrow"
        >
            <div className="modal-body">
                <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <b>{grade?.subject_code}</b> — {grade?.student_name || grade?.student_id}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormGroup label="Midterm Grade">
                        <FormInput type="number" step="0.25" value={form.midterm} onChange={(e) => set('midterm', e.target.value)} placeholder="1.0-5.0" />
                    </FormGroup>

                    <FormGroup label="Finals Grade">
                        <FormInput type="number" step="0.25" value={form.finals} onChange={(e) => set('finals', e.target.value)} placeholder="1.0-5.0" />
                    </FormGroup>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <FormGroup label="Final Grade">
                        <FormInput type="number" step="0.25" value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="1.0-5.0" />
                    </FormGroup>

                    <FormGroup label="Remarks">
                        <FormInput value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Passed/Failed/INC/..." />
                    </FormGroup>
                </div>

                <FormGroup label="Semester">
                    <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)} disabled>
                        {SEMESTERS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </FormSelect>
                </FormGroup>
            </div>

            <div className="modal-footer">
                <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </Modal>
    )
}

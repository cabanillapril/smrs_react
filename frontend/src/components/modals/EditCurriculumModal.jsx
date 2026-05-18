import { useState, useEffect } from 'react'
import Modal from '../Modal'
import { FormGroup, FormInput, FormSelect } from '../Form'
import MajorSelect from '../MajorSelect'
import { curriculumService } from '../../services/api'

export default function EditCurriculumModal({ isOpen, onClose, onSaved, entry }) {
    const [form, setForm] = useState({
        major: entry?.major || '',
        year_level: String(entry?.year_level ?? 1),
        semester: String(entry?.semester ?? 1),
        subject_code: entry?.subject_code || '',
        subject_name: entry?.subject_name || '',
        units: String(entry?.unit ?? 3),
        course: entry?.course || '',
    })

    useEffect(() => {
        if (!isOpen) return
        setForm({
            major: entry?.major || '',
            year_level: String(entry?.year_level ?? 1),
            semester: String(entry?.semester ?? 1),
            subject_code: entry?.subject_code || '',
            subject_name: entry?.subject_name || '',
            units: String(entry?.unit ?? 3),
            course: entry?.course || '',
        })
    }, [isOpen, entry])

    function set(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        if (!entry) return

        if (!form.subject_code.trim()) {
            alert('Subject code is required.')
            return
        }

        try {
            await curriculumService.update(entry.curriculum_id, {
                course: form.course,
                major: form.major || null,
                year_level: parseInt(form.year_level),
                semester: parseInt(form.semester),
                subject_code: form.subject_code.trim().toUpperCase(),
                subject_name: (form.subject_name || '').trim() || form.subject_code.trim().toUpperCase(),
                units: parseInt(form.units) || 3,
            })

            onSaved?.()
            onClose()
        } catch (err) {
            alert(err.message || 'Failed to update curriculum.')
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Curriculum Entry" size="narrow">
            <div className="modal-body">
                <FormGroup label="Program">
                    <FormInput value={form.course} readOnly />
                </FormGroup>

                <FormGroup label="Major">
                    <MajorSelect
                        program={form.course}
                        value={form.major}
                        onChange={(e) => set('major', e.target.value)}
                        emptyLabel="All Majors"
                    />
                </FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormGroup label="Year Level">
                        <FormSelect value={form.year_level} onChange={(e) => set('year_level', e.target.value)}>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </FormSelect>
                    </FormGroup>
                    <FormGroup label="Semester">
                        <FormSelect value={form.semester} onChange={(e) => set('semester', e.target.value)}>
                            <option value="1">1st Semester</option>
                            <option value="2">2nd Semester</option>
                        </FormSelect>
                    </FormGroup>
                </div>

                <FormGroup label="Subject Code" required>
                    <FormInput
                        value={form.subject_code}
                        onChange={(e) => set('subject_code', e.target.value)}
                        placeholder="e.g. MATH101"
                    />
                </FormGroup>

                <FormGroup label="Subject Name">
                    <FormInput
                        value={form.subject_name}
                        onChange={(e) => set('subject_name', e.target.value)}
                        placeholder="e.g. Calculus I"
                    />
                </FormGroup>

                <FormGroup label="Units">
                    <FormInput
                        type="number"
                        value={form.units}
                        onChange={(e) => set('units', e.target.value)}
                        min="1"
                        max="9"
                    />
                </FormGroup>
            </div>

            <div className="modal-footer">
                <button className="btn btn-ghost" onClick={onClose}>
                    Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    Save Changes
                </button>
            </div>
        </Modal>
    )
}


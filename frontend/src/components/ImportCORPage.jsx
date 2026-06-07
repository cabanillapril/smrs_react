import { useState } from 'react'
import { importService } from '../services/api'
import ImportHistory from './ImportHistory'

// ── SVG icon helpers ────────────────────────────────────────────────────────
const IconUpload = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
)

const IconPaper = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
)

const IconScan = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
)

const IconSave = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
)

const IconTrash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
    </svg>
)

const SEMESTERS = [
    { value: 1, label: '1st Semester' },
    { value: 2, label: '2nd Semester' },
    { value: 3, label: 'Summer' },
]

export default function ImportCORPage({ onActivity, onViewStudent }) {
    const [step, setStep] = useState('upload')    // upload | preview | done
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)

    // Editable preview state
    const [student, setStudent] = useState({})
    const [subjects, setSubjects] = useState([])

    // Edit mode states
    const [isEditingStudent, setIsEditingStudent] = useState(false)
    const [isEditingSubjects, setIsEditingSubjects] = useState(false)

    const handleFileChange = (e) => {
        const f = e.target.files[0]
        if (f) setFile(f)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) setFile(f)
    }

    const handleScan = async () => {
        if (!file) return
        setLoading(true)
        setError(null)
        try {
            const data = await importService.previewCOR(file)
            console.log("Scanned student data:", data.student)
            setPreview(data)
            setStudent(data.student || {})
            setSubjects(data.subjects || [])
            setStep('preview')
        } catch (err) {
            setError(err.message || 'Failed to scan document.')
        } finally {
            setLoading(false)
        }
    }

    const handleCommit = async () => {
        // Validate before setting loading
        const missingFields = validateCORForm();
        if (missingFields.length > 0) {
            alert(`Cannot save COR. Please fill in the following required fields:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        setLoading(true)
        setError(null)
        try {
            const res = await importService.commitCOR({ student, subjects })
            setResult(res)
            setStep('done')
            onActivity?.(`Imported COR: <b>${student.student_name || student.student_id || 'student'}</b> — ${subjects.length} subject(s) enrolled`, 'purple')
            // Auto-open student profile modal with the real student_id from the saved record
            const realStudentId = res?.student?.student_id || res?.student_id
            if (realStudentId && onViewStudent) {
                // Small delay to let the 'done' step render first
                setTimeout(() => onViewStudent(realStudentId), 300)
            }
        } catch (err) {
            setError(err.message || 'Failed to save records.')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setStep('upload')
        setFile(null)
        setPreview(null)
        setStudent({})
        setSubjects([])
        setError(null)
        setResult(null)
        setIsEditingStudent(false)
        setIsEditingSubjects(false)
    }

    const setStudentField = (field, value) => setStudent(prev => ({ ...prev, [field]: value }))

    const setSubjectField = (index, field, value) => {
        setSubjects(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
    }

    const removeSubject = (index) => {
        setSubjects(prev => prev.filter((_, i) => i !== index))
    }

    const addSubject = () => {
        setSubjects(prev => [...prev, { subject_code: '', subject_name: '', units: 3, instructor: '', schedule: '' }])
    }

    function validateCORForm() {
        const missing = [];

        // Student Info validation
        if (!student.student_id || student.student_id.trim() === '' || student.student_id.trim() === '-') missing.push("Student ID");
        if (!student.first_name || student.first_name.trim() === '') missing.push("Student First Name");
        if (!student.last_name || student.last_name.trim() === '') missing.push("Student Last Name");
        if (!student.course || student.course.trim() === '') missing.push("Student Course");
        if (!student.year_level) missing.push("Student Year Level");
        if (!student.semester) missing.push("Student Semester");
        if (!student.school_year || student.school_year.trim() === '') missing.push("Student School Year");

        // Subject Rows validation
        if (subjects.length === 0) {
            missing.push("At least one subject row");
        } else {
            subjects.forEach((subj, index) => {
                if (!subj.subject_code || subj.subject_code.trim() === '') missing.push(`Row ${index + 1} Subject Code`);
                if (!subj.units) missing.push(`Row ${index + 1} Units`);
                if (!subj.instructor || subj.instructor.trim() === '') missing.push(`Row ${index + 1} Instructor`);
            });
        }
        return missing;
    }

    return (
        <div className="page active">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'linear-gradient(135deg, var(--accent-purple, #7c3aed) 0%, var(--accent-blue) 100%)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0
                    }}>
                        <IconPaper />
                    </div>
                    <div>
                        <h1 className="page-title">Import COR</h1>
                        <p className="page-subtitle">Upload a Certificate of Registration to enroll a student's subjects</p>
                    </div>
                </div>

                {/* Step progress */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {['upload', 'preview', 'done'].map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700,
                                backgroundColor: step === s ? 'var(--accent-blue)' : (['upload', 'preview', 'done'].indexOf(step) > i ? 'var(--accent-green)' : 'var(--bg-raised)'),
                                color: step === s || ['upload', 'preview', 'done'].indexOf(step) > i ? '#fff' : 'var(--text-muted)'
                            }}>{i + 1}</div>
                            <span style={{ fontSize: '0.8rem', color: step === s ? 'var(--text-normal)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
                            {i < 2 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>›</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── UPLOAD STEP ──────────────────────────────────────────── */}
            {step === 'upload' && (
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById('cor-file-input').click()}
                        style={{
                            border: `2px dashed ${file ? 'var(--accent-blue)' : 'var(--border)'}`,
                            borderRadius: '16px',
                            padding: '60px 40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: file ? 'rgba(59,130,246,0.04)' : 'var(--bg-card)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <input id="cor-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileChange} />
                        <div style={{ color: file ? 'var(--accent-blue)' : 'var(--text-muted)', marginBottom: 16 }}>
                            <IconUpload />
                        </div>
                        {file ? (
                            <>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{file.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{(file.size / 1024).toFixed(1)} KB • Click to change</div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Drop your COR here or click to browse</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Supports PDF, JPG, PNG</div>
                            </>
                        )}
                    </div>

                    {error && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleScan} disabled={!file || loading} style={{ gap: 8 }}>
                            {loading ? <><span className="btn-spinner" /> Scanning…</> : <><IconScan /> Scan Document</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── PREVIEW STEP ─────────────────────────────────────────── */}
            {step === 'preview' && (
                <div>
                    {/* Student info card */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Student Information</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className="btn btn-ghost sm"
                                    onClick={() => setIsEditingStudent(!isEditingStudent)}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                    {isEditingStudent ? 'Done' : 'Edit Info'}
                                </button>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{preview?.filename}</span>
                            </div>
                        </div>
                        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                            {[
                                { label: 'First Name', field: 'first_name' },
                                { label: 'Middle Name', field: 'middle_name' },
                                { label: 'Last Name', field: 'last_name' },
                                { label: 'Student ID', field: 'student_id' },
                                { label: 'Course', field: 'course' },
                                { label: 'Year Level', field: 'year_level', type: 'number' },
                                { label: 'School Year', field: 'school_year', placeholder: 'e.g. 2025-2026' },
                            ].map(({ label, field, type, placeholder }) => (
                                <div key={field}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                                    {isEditingStudent ? (
                                        <input
                                            type={type || 'text'}
                                            className="form-input"
                                            value={student[field] || ''}
                                            placeholder={placeholder || label}
                                            onChange={(e) => setStudentField(field, type === 'number' ? parseInt(e.target.value) || '' : e.target.value)}
                                            style={{ width: '100%' }}
                                        />
                                    ) : (
                                        <div
                                            className="preview-display-value"
                                            onClick={() => setIsEditingStudent(true)}
                                        >
                                            {student[field] !== undefined && student[field] !== null && student[field] !== '' ? (
                                                student[field]
                                            ) : (
                                                <span className="preview-display-placeholder">—</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Semester</label>
                                {isEditingStudent ? (
                                    <select
                                        className="filter-select"
                                        value={student.semester || ''}
                                        onChange={(e) => setStudentField('semester', parseInt(e.target.value))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select…</option>
                                        {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                ) : (
                                    <div
                                        className="preview-display-value"
                                        onClick={() => setIsEditingStudent(true)}
                                    >
                                        {SEMESTERS.find(s => s.value === student.semester)?.label || <span className="preview-display-placeholder">—</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subjects table */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Enrolled Subjects <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({subjects.length} subjects)</span></h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-ghost sm"
                                    onClick={() => setIsEditingSubjects(!isEditingSubjects)}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                    {isEditingSubjects ? 'Done' : 'Edit Subjects'}
                                </button>
                                <button className="btn btn-ghost sm" onClick={addSubject} style={{ fontSize: '0.85rem' }}>+ Add Row</button>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Description</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Units</th>
                                    <th>Instructor</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((s, i) => (
                                    <tr key={i}>
                                        <td>
                                            {isEditingSubjects ? (
                                                <input className="form-input" value={s.subject_code} onChange={(e) => setSubjectField(i, 'subject_code', e.target.value.toUpperCase())} style={{ width: '100%', minWidth: 90 }} />
                                            ) : (
                                                <span className="preview-cell-text code-cell" onClick={() => setIsEditingSubjects(true)}>{s.subject_code || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingSubjects ? (
                                                <input className="form-input" value={s.subject_name} onChange={(e) => setSubjectField(i, 'subject_name', e.target.value)} style={{ width: '100%', minWidth: 160 }} />
                                            ) : (
                                                <span className="preview-cell-text" onClick={() => setIsEditingSubjects(true)}>{s.subject_name || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isEditingSubjects ? (
                                                <input className="form-input" type="number" step="0.5" value={s.units} onChange={(e) => setSubjectField(i, 'units', parseFloat(e.target.value))} style={{ width: 60, textAlign: 'center' }} />
                                            ) : (
                                                <span className="preview-cell-text center-text" onClick={() => setIsEditingSubjects(true)}>{s.units !== undefined && s.units !== null ? s.units : <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingSubjects ? (
                                                <input className="form-input" value={s.instructor || ''} onChange={(e) => setSubjectField(i, 'instructor', e.target.value)} style={{ width: '100%', minWidth: 120 }} placeholder="Instructor name" />
                                            ) : (
                                                <span className="preview-cell-text" onClick={() => setIsEditingSubjects(true)}>{s.instructor || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            <button onClick={() => removeSubject(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 4 }}>
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {subjects.length === 0 && (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No subjects detected. Click "+ Add Row" to add manually.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={handleReset}>← Back</button>
                        <button
                            className="btn btn-primary"
                            onClick={handleCommit}
                            disabled={loading}>
                            {loading ? <><span className="btn-spinner" /> Saving…</> : <><IconSave /> Save to Database</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── DONE STEP ────────────────────────────────────────────── */}
            {step === 'done' && result && (
                <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'rgba(52, 211, 153, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        color: 'var(--accent-green)', fontSize: '2rem'
                    }}>
                        <i className="ph ph-check-circle" style={{ fontSize: '2.5rem' }} />
                    </div>
                    <h2 style={{ marginBottom: 8 }}>COR Imported Successfully</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                        Enrollment records have been saved for <b>{result.student_name}</b>
                        {' '}(ID: {result.student?.student_id || result.student_id})
                    </p>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px', marginBottom: 32, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Student</span>
                            <b>{result.student_name}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Student ID</span>
                            <span className="id-cell">{result.student?.student_id || result.student_id}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Subjects Enrolled</span>
                            <b style={{ color: 'var(--accent-green)' }}>+{result.enrollments_created}</b>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn btn-ghost" onClick={handleReset}>Import Another COR</button>
                        <button
                            className="btn btn-primary"
                            onClick={() => onViewStudent && onViewStudent(result.student?.student_id || result.student_id)}
                        >
                            View Student Profile
                        </button>
                    </div>
                </div>
            )}

            <ImportHistory type="COR" />
        </div>
    )
}

import { useState } from 'react'
import { importService } from '../services/api'
import EditableField from './EditableField'
import ImportHistory from './ImportHistory'

// ── SVG icon helpers ────────────────────────────────────────────────────────
const IconUpload = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
)

const IconCheck = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
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

const IconPlus = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
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

const IconPaper = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
)

// ── Component ────────────────────────────────────────────────────────────────
export default function ImportAppraisalPage({ onActivity, onOpenStudentEdit }) {
    const [step, setStep] = useState('upload') // upload | preview | done
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    function handleAddRow() {
        setPreview(prev => {
            if (!prev) return null
            const newRow = {
                subject_code: 'SUBJ101',
                subject_name: 'New Subject Name',
                units: 3,
                midterm_grade: null,
                final_grade: null,
                semester: 1,
                school_year: prev.student.school_year || '',
                instructor: ''
            }
            return { ...prev, rows: [...prev.rows, newRow] }
        })
    }

    function handleDeleteRow(index) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            updatedRows.splice(index, 1)
            return { ...prev, rows: updatedRows }
        })
    }

    function handleFileChange(event) {
        const nextFile = event.target.files?.[0]
        if (nextFile) {
            setFile(nextFile)
            setError('')
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) {
            setFile(f)
            setError('')
        }
    }

    function handleStudentChange(key, val) {
        setPreview(prev => {
            if (!prev) return null
            let updatedRows = prev.rows;
            // If we update school_year in the header, apply it to all rows to save time
            if (key === 'school_year') {
                updatedRows = prev.rows.map(r => ({
                    ...r,
                    school_year: val
                }));
            }
            return { ...prev, student: { ...prev.student, [key]: val }, rows: updatedRows }
        })
    }

    function handleRowChange(index, key, val) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            updatedRows[index] = { ...updatedRows[index], [key]: val }
            return { ...prev, rows: updatedRows }
        })
    }

    async function previewImport() {
        if (!file) return
        setLoading(true)
        setError('')
        setResult(null)
        try {
            const data = await importService.preview(file)
            setPreview(data)
            setStep('preview')
        } catch (err) {
            setError(err.message || 'Failed to parse PDF')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setStep('upload')
        setFile(null)
        setPreview(null)
        setError('')
        setResult(null)
    }

    function validateAppraisalForm() {
        const missing = [];
        if (!preview) return ["No data to save."];

        // Student Info validation
        if (!preview.student.first_name || preview.student.first_name.trim() === '') missing.push("Student First Name");
        if (!preview.student.last_name || preview.student.last_name.trim() === '') missing.push("Student Last Name");
        if (!preview.student.course || preview.student.course.trim() === '') missing.push("Student Course");
        if (!preview.student.school_year || preview.student.school_year.trim() === '') missing.push("School Year");

        // Subject Rows validation
        if (preview.rows.length === 0) {
            missing.push("At least one subject row");
        } else {
            preview.rows.forEach((row, index) => {
                if (!row.subject_code || row.subject_code.trim() === '') missing.push(`Row ${index + 1} Subject Code`);
            });
        }
        return missing;
    }

    async function commitImport() {
        if (!preview) return

        // Check for completeness before starting the loading state
        const missingFields = validateAppraisalForm();
        if (missingFields.length > 0) {
            alert(`Cannot save Appraisal. Please fill in the following required fields:\n- ${missingFields.join('\n- ')}`);
            return; // Stop here and allow the user to re-input
        }

        setLoading(true)
        setError('')
        try {
            const data = await importService.commitAppraisalData(preview)
            const studentData = data.created_student || data.student;

            setResult({ commit: true, created_grades: data.created_grades, created_student: data.created_student })
            setStep('done')
            onActivity?.(`Imported Appraisal: <b>${preview?.student?.first_name} ${preview?.student?.last_name || 'student'}</b> — ${data.created_grades ?? 0} grade(s) added`, 'blue')

            if (onOpenStudentEdit && studentData) {
                onOpenStudentEdit(studentData);
            }
        } catch (err) {
            setError(err.message || 'Failed to import PDF')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page active">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'linear-gradient(135deg, var(--accent-blue) 0%, #3b82f6 100%)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0
                    }}>
                        <IconPaper />
                    </div>
                    <div>
                        <h1 className="page-title">Import Appraisal</h1>
                        <p className="page-subtitle">Upload a Curriculum Appraisal to extract and record student grades</p>
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
                        onClick={() => document.getElementById('appraisal-file-input').click()}
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
                        <input id="appraisal-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff" style={{ display: 'none' }} onChange={handleFileChange} />
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
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Drop appraisal document here or click to browse</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Supports PDF, JPG, PNG, BMP, TIFF</div>
                            </>
                        )}
                    </div>

                    {error && <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={previewImport} disabled={!file || loading} style={{ gap: 8 }}>
                            {loading ? <><span className="btn-spinner" /> Scanning…</> : <><IconScan /> Scan Document</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── PREVIEW STEP ─────────────────────────────────────────── */}
            {step === 'preview' && preview && (
                <div>
                    {/* Student info card */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Student Information</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file?.name}</span>
                        </div>
                        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                            {[
                                { label: 'First Name', field: 'first_name' },
                                { label: 'Middle Name', field: 'middle_name' },
                                { label: 'Last Name', field: 'last_name' },
                                { label: 'Student ID', field: 'student_id' },
                                { label: 'Course', field: 'course' },
                                { label: 'Major', field: 'major' },
                                { label: 'Status (DB)', field: 'status' },
                                { label: 'School Year', field: 'school_year' },
                            ].map(({ label, field }) => (
                                <div key={field}>
                                    <EditableField
                                        type={field === 'status' ? 'select' : 'text'}
                                        options={field === 'status' ? ['Regular', 'Irregular'] : []}
                                        label={label}
                                        value={preview.student[field] || ''}
                                        placeholder={field === 'school_year' ? 'e.g. 2025-2026' : ''}
                                        onSave={(val) => handleStudentChange(field, val)}
                                    />
                                </div>
                            ))}
                            <EditableField
                                className="full-span"
                                label="Address"
                                value={preview.student.address || ''}
                                onSave={(val) => handleStudentChange('address', val)}
                                style={{ gridColumn: 'span 2' }}
                            />
                        </div>
                    </div>

                    {/* Subjects table */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Grades To Import <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({preview.rows.length} subjects)</span></h3>
                            <button className="btn btn-ghost" onClick={handleAddRow} style={{ fontSize: '0.85rem' }}>+ Add Row</button>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Description</th>
                                    <th>Units</th>
                                    <th>Midterm</th>
                                    <th>Final</th>
                                    <th>Sem</th>
                                    <th>Instructor</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((s, i) => (
                                    <tr key={i}>
                                        <td>
                                            <EditableField
                                                value={s.subject_code}
                                                onSave={(val) => handleRowChange(i, 'subject_code', val.toUpperCase())}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.subject_name}
                                                onSave={(val) => handleRowChange(i, 'subject_name', val)}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.units}
                                                onSave={(val) => handleRowChange(i, 'units', parseInt(val))}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.midterm_grade}
                                                onSave={(val) => handleRowChange(i, 'midterm_grade', parseFloat(val))}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.final_grade}
                                                onSave={(val) => handleRowChange(i, 'final_grade', parseFloat(val))}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.semester}
                                                onSave={(val) => handleRowChange(i, 'semester', parseInt(val))}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={s.instructor}
                                                onSave={(val) => handleRowChange(i, 'instructor', val)}
                                            />
                                        </td>
                                        <td>
                                            <button onClick={() => handleDeleteRow(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 4 }}>
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {preview.rows.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No grade records found. Click "+ Add Row" to add manually.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={handleReset}>← Back</button>
                        <button
                            className="btn btn-primary"
                            onClick={commitImport}
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
                    <h2 style={{ marginBottom: 8 }}>Appraisal Imported Successfully</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                        Appraisal grade records have been recorded for <b>{result.created_student?.first_name} {result.created_student?.last_name}</b>
                    </p>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px', marginBottom: 32, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Student</span>
                            <b>{result.created_student?.first_name} {result.created_student?.last_name}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Student ID</span>
                            <span className="id-cell">{result.created_student?.student_id}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Grades Recorded</span>
                            <b style={{ color: 'var(--accent-green)' }}>+{result.created_grades}</b>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleReset}>Import Another Appraisal</button>
                </div>
            )}

            <ImportHistory type="Appraisal" />
        </div>
    )
}

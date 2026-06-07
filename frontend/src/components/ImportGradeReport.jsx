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
export default function ImportGradeReport({ onActivity }) {
    const [step, setStep] = useState('upload') // upload | preview | done
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Edit mode states
    const [isEditingMetadata, setIsEditingMetadata] = useState(false)
    const [isEditingRows, setIsEditingRows] = useState(false)

    function handleAddRow() {
        setPreview(prev => {
            if (!prev) return null
            const newRow = {
                student_number: '00-0000',
                student_name: 'New Student Name',
                course: 'BSIT',
                midterm_grade: null,
                final_grade: null,
                remark: 'INC',
                enrollment_status: 'Active',
                first_name: '',
                middle_name: '',
                last_name: ''
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

    function handleMetadataChange(key, val) {
        setPreview(prev => {
            if (!prev) return null
            return { ...prev, metadata: { ...prev.metadata, [key]: val } }
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

    function handleRowGradeChange(index, key, val) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            const updatedRow = { ...updatedRows[index], [key]: val }
            const mid = updatedRow.midterm_grade
            const fin = updatedRow.final_grade
            let finalValue = null
            if (mid !== null && fin !== null) {
                finalValue = Math.round(((mid + fin) / 2) * 100) / 100
            } else if (mid !== null) {
                finalValue = mid
            } else if (fin !== null) {
                finalValue = fin
            }

            const currentRemark = updatedRow.remark || ''
            const isSpecialRemark = /dropped|ud/i.test(currentRemark)

            if (!isSpecialRemark) {
                let remark = 'INC'
                if (finalValue !== null) {
                    remark = finalValue <= 3.0 ? 'Passed' : 'Failed'
                }
                updatedRow.remark = remark
            }

            updatedRows[index] = updatedRow
            return { ...prev, rows: updatedRows }
        })
    }

    async function previewImport() {
        if (!file) return
        setLoading(true)
        setError('')
        setResult(null)
        try {
            const data = await importService.previewGradeReport(file)
            setPreview(data)
            setStep('preview')
        } catch (err) {
            setError(err.message || 'Failed to parse Grade Report')
        } finally {
            setLoading(false)
        }
    }

    function validateGradeReportForm() {
        const missing = [];
        if (!preview) return ["No data to save."];

        const m = preview.metadata;
        if (!m.subject_code || m.subject_code.trim() === '') missing.push("Subject Code");
        if (!m.instructor || m.instructor.trim() === '') missing.push("Instructor");
        if (!m.school_year || m.school_year.trim() === '') missing.push("School Year");
        if (m.semester === undefined || m.semester === null) missing.push("Semester");

        if (preview.rows.length === 0) {
            missing.push("At least one student record");
        } else {
            preview.rows.forEach((row, index) => {
                if (!row.student_number || row.student_number.trim() === '') missing.push(`Row ${index + 1} Student ID`);
                if (!row.student_name || row.student_name.trim() === '') missing.push(`Row ${index + 1} Student Name`);
            });
        }
        return missing;
    }

    async function commitImport() {
        if (!preview) return

        const missingFields = validateGradeReportForm();
        if (missingFields.length > 0) {
            alert(`Cannot save Grade Report. Please fill in the following required fields:\n- ${missingFields.join('\n- ')}`);
            return; // Halt save until user corrects input
        }

        setLoading(true)
        setError('')
        try {
            const data = await importService.commitGradeReportData(preview)
            setResult({ commit: true, created_grades: data.created_grades, metadata: preview.metadata })
            setStep('done')
            onActivity?.(`Imported Grade Report: <b>${preview?.metadata?.subject_code || 'subject'}</b> — ${data.created_grades ?? 0} grade(s) added`, 'blue')
        } catch (err) {
            setError(err.message || 'Failed to import Grade Report')
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
        setIsEditingMetadata(false)
        setIsEditingRows(false)
    }

    return (
        <div className="page active">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'linear-gradient(135deg, var(--accent-green) 0%, #10b981 100%)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0
                    }}>
                        <IconPaper />
                    </div>
                    <div>
                        <h1 className="page-title">Import Grade Report</h1>
                        <p className="page-subtitle">Upload a scanned Grade Report to record class performance</p>
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
                        onClick={() => document.getElementById('grade-report-file-input').click()}
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
                        <input id="grade-report-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff" style={{ display: 'none' }} onChange={handleFileChange} />
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
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Drop grade report here or click to browse</div>
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
                    {/* Metadata card */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Subject &amp; Report Information</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className="btn btn-ghost sm"
                                    onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                    {isEditingMetadata ? 'Done' : 'Edit Info'}
                                </button>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{file?.name}</span>
                            </div>
                        </div>
                        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                            {[
                                { label: 'Subject Code', key: 'subject_code' },
                                { label: 'Description', key: 'subject_description' },
                                { label: 'Instructor', key: 'instructor' },
                                { label: 'School Year', key: 'school_year', placeholder: 'e.g. 2025-2026' },
                                { label: 'Semester', key: 'semester', type: 'select' },
                                { label: 'Academic Period', key: 'academic_period' },
                                { label: 'Class / Section', key: 'class_section' },
                                { label: 'Date Generated', key: 'report_date' },
                            ].map(({ label, key, placeholder, type }) => (
                                <div key={key}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                                    {isEditingMetadata ? (
                                        type === 'select' ? (
                                            <select
                                                className="form-input"
                                                value={preview.metadata[key] || ''}
                                                onChange={(e) => handleMetadataChange(key, parseInt(e.target.value))}
                                                style={{ width: '100%' }}
                                            >
                                                <option value="1">1st Semester</option>
                                                <option value="2">2nd Semester</option>
                                                <option value="3">Summer</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={preview.metadata[key] || ''}
                                                placeholder={placeholder}
                                                onChange={(e) => handleMetadataChange(key, e.target.value)}
                                                style={{ width: '100%' }}
                                            />
                                        )
                                    ) : (
                                        <div
                                            className="preview-display-value"
                                            onClick={() => setIsEditingMetadata(true)}
                                        >
                                            {key === 'semester' ? (
                                                preview.metadata[key] === 1 ? '1st Semester' :
                                                    preview.metadata[key] === 2 ? '2nd Semester' :
                                                        preview.metadata[key] === 3 ? 'Summer' : '—'
                                            ) : (
                                                preview.metadata[key] || <span className="preview-display-placeholder">—</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Student records table */}
                    <div className="table-card min" style={{ marginBottom: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>Student Records To Import <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>({preview.rows.length} records)</span></h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-ghost sm"
                                    onClick={() => setIsEditingRows(!isEditingRows)}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                    {isEditingRows ? 'Done' : 'Edit Records'}
                                </button>
                                <button className="btn btn-ghost sm" onClick={handleAddRow} style={{ fontSize: '0.85rem' }}>+ Add Row</button>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    <th>Course</th>
                                    <th>Midterm</th>
                                    <th>Final</th>
                                    <th>Remark</th>
                                    <th>Status</th>
                                    <th style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((s, i) => (
                                    <tr key={i} className={s.enrollment_status?.toLowerCase() !== 'active' ? 'status-warning-row' : ''}>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" value={s.student_number} onChange={(e) => handleRowChange(i, 'student_number', e.target.value)} style={{ width: '100%', minWidth: 90 }} />
                                            ) : (
                                                <span className="preview-cell-text code-cell" onClick={() => setIsEditingRows(true)}>{s.student_number || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" value={s.student_name} onChange={(e) => handleRowChange(i, 'student_name', e.target.value)} style={{ width: '100%', minWidth: 160 }} />
                                            ) : (
                                                <span className="preview-cell-text" onClick={() => setIsEditingRows(true)}>{s.student_name || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" type="text" value={s.course} onChange={(e) => handleRowChange(i, 'course', e.target.value)} style={{ width: 70 }} />
                                            ) : (
                                                <span className="preview-cell-text center-text" onClick={() => setIsEditingRows(true)}>{s.course || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" type="number" step="0.01" value={s.midterm_grade !== null && s.midterm_grade !== undefined ? s.midterm_grade : ''} onChange={(e) => handleRowGradeChange(i, 'midterm_grade', e.target.value === '' ? null : parseFloat(e.target.value))} style={{ width: 70 }} />
                                            ) : (
                                                <span className="grade-badge" style={{ cursor: 'pointer' }} onClick={() => setIsEditingRows(true)}>{s.midterm_grade !== null && s.midterm_grade !== undefined ? s.midterm_grade.toFixed(2) : <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" type="number" step="0.01" value={s.final_grade !== null && s.final_grade !== undefined ? s.final_grade : ''} onChange={(e) => handleRowGradeChange(i, 'final_grade', e.target.value === '' ? null : parseFloat(e.target.value))} style={{ width: 70 }} />
                                            ) : (
                                                <span className="grade-badge" style={{ cursor: 'pointer' }} onClick={() => setIsEditingRows(true)}>{s.final_grade !== null && s.final_grade !== undefined ? s.final_grade.toFixed(2) : <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <input className="form-input" value={s.remark || ''} onChange={(e) => handleRowChange(i, 'remark', e.target.value)} style={{ width: 80 }} />
                                            ) : (
                                                <span className="preview-cell-text center-text" onClick={() => setIsEditingRows(true)}>{s.remark || <span className="preview-display-placeholder">—</span>}</span>
                                            )}
                                        </td>
                                        <td>
                                            {isEditingRows ? (
                                                <select className="filter-select" value={s.enrollment_status || 'Active'} onChange={(e) => handleRowChange(i, 'enrollment_status', e.target.value)} style={{ width: 100 }}>
                                                    <option value="Active">Active</option>
                                                    <option value="Dropped">Dropped</option>
                                                    <option value="Officially Dropped">Officially Dropped</option>
                                                    <option value="Unofficially Dropped">Unofficially Dropped</option>
                                                </select>
                                            ) : (
                                                <span className="year-badge" style={{ cursor: 'pointer' }} onClick={() => setIsEditingRows(true)}>{s.enrollment_status || 'Active'}</span>
                                            )}
                                        </td>
                                        <td>
                                            <button onClick={() => handleDeleteRow(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 4 }}>
                                                <IconTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {preview.rows.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No student records found. Click "+ Add Row" to add manually.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={handleReset}>← Back</button>
                        <button className="btn btn-primary" onClick={commitImport} disabled={loading}>
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
                    <h2 style={{ marginBottom: 8 }}>Grade Report Imported Successfully</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                        Grade records have been imported for subject <b>{result.metadata?.subject_code}</b>
                    </p>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '20px', marginBottom: 32, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Subject Code</span>
                            <b>{result.metadata?.subject_code}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Description</span>
                            <b>{result.metadata?.subject_description}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Grades Added</span>
                            <b style={{ color: 'var(--accent-green)' }}>+{result.created_grades}</b>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleReset}>Import Another Report</button>
                </div>
            )}

            <ImportHistory type="Grade Report" />
        </div>
    )
}

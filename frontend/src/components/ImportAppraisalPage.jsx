import { useState } from 'react'
import { importService } from '../services/api'

export default function ImportAppraisalPage() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingPhase, setLoadingPhase] = useState('')
    const [error, setError] = useState('')
    const [editingCell, setEditingCell] = useState({ index: null, field: null })

    function handleAddRow() {
        setPreview(prev => {
            if (!prev) return null
            const newRow = {
                subject_code: 'SUBJ 101',
                subject_name: 'New Subject Name',
                units: 3,
                midterm_grade: null,
                final_grade: null,
                semester: 1,
                instructor: ''
            }
            return {
                ...prev,
                rows: [...prev.rows, newRow]
            }
        })
    }

    function handleDeleteRow(index) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            updatedRows.splice(index, 1)
            return {
                ...prev,
                rows: updatedRows
            }
        })
    }

    function handleFileChange(event) {
        setPreview(null)
        setResult(null)
        setError('')
        const nextFile = event.target.files?.[0]
        setFile(nextFile ?? null)
    }

    function handleStudentChange(key, val) {
        setPreview(prev => {
            if (!prev) return null
            return {
                ...prev,
                student: {
                    ...prev.student,
                    [key]: val
                }
            }
        })
    }

    function handleRowChange(index, key, val) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            updatedRows[index] = {
                ...updatedRows[index],
                [key]: val
            }
            return {
                ...prev,
                rows: updatedRows
            }
        })
    }

    async function previewImport() {
        if (!file) return
        setLoading(true)
        setLoadingPhase('Extracting PDF content...')
        setError('')
        setResult(null)

        try {
            const data = await importService.preview(file)
            setPreview(data)
            setLoadingPhase('')
        } catch (err) {
            setError(err.message || 'Failed to parse PDF')
            setLoadingPhase('')
        } finally {
            setLoading(false)
        }
    }

    async function commitImport() {
        if (!preview) return
        setLoading(true)
        setLoadingPhase('Processing and importing data...')
        setError('')
        setResult(null)

        try {
            const data = await importService.commitAppraisalData(preview)
            setResult({
                commit: true,
                created_grades: data.created_grades,
                created_student: data.created_student
            })
            setLoadingPhase('')
        } catch (err) {
            setError(err.message || 'Failed to import PDF')
            setLoadingPhase('')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-card">
            <div className="page-header">
                <div>
                    <h2>📄 Import Appraisal</h2>
                    <p>Upload a PDF appraisal and preview the extracted student and grade data.</p>
                </div>
            </div>

            <div className="import-container">
                <div className="upload-section">
                    <label className="file-input-label">
                        <div className="file-input-box">
                            {file ? (
                                <>
                                    <div className="file-icon">✓</div>
                                    <div className="file-name">{file.name}</div>
                                    <div className="file-size">({(file.size / 1024).toFixed(1)} KB)</div>
                                </>
                            ) : (
                                <>
                                    <div className="file-icon">📁</div>
                                    <div className="file-text">Click to select PDF</div>
                                </>
                            )}
                        </div>
                        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>

                    <div className="button-group">
                        <button className="btn btn-primary" onClick={previewImport} disabled={!file || loading}>
                            <span className="btn-icon">👁️</span>
                            {loading && loadingPhase.includes('Extract') ? 'Scanning...' : 'Preview'}
                        </button>
                        <button className="btn btn-success" onClick={commitImport} disabled={!preview || loading}>
                            <span className="btn-icon">💾</span>
                            {loading && loadingPhase.includes('Processing') ? 'Importing...' : 'Save to Database'}
                        </button>
                    </div>
                </div>

                {loading && loadingPhase && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>{loadingPhase}</p>
                        <div className="loading-hint">This may take a minute depending on PDF size...</div>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginTop: '24px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {preview && (
                <div className="preview-section">
                    <h3>📋 Extracted Data Preview</h3>

                    <div className="student-card">
                        <h4>Student Information</h4>
                        <div className="student-grid">
                            <div className="student-field">
                                <span className="field-label">First Name</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.first_name || ''}
                                    onChange={(e) => handleStudentChange('first_name', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Middle Name</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.middle_name || ''}
                                    onChange={(e) => handleStudentChange('middle_name', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Last Name</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.last_name || ''}
                                    onChange={(e) => handleStudentChange('last_name', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Student ID</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.student_id || ''}
                                    onChange={(e) => handleStudentChange('student_id', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Course</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.course || ''}
                                    onChange={(e) => handleStudentChange('course', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Major</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.major || ''}
                                    onChange={(e) => handleStudentChange('major', e.target.value)}
                                />
                            </div>
                            <div className="student-field" style={{ gridColumn: 'span 2' }}>
                                <span className="field-label">Address</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.student.address || ''}
                                    onChange={(e) => handleStudentChange('address', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grades-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0 }}>Grade Records ({preview.rows.length} subjects)</h4>
                            <button className="btn btn-primary sm" onClick={handleAddRow}>
                                <span className="btn-icon">+</span> Add Subject
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Subject</th>
                                        <th style={{ textAlign: 'center' }}>Units</th>
                                        <th style={{ textAlign: 'center' }}>Midterm</th>
                                        <th style={{ textAlign: 'center' }}>Final</th>
                                        <th style={{ textAlign: 'center' }}>Semester</th>
                                        <th>Instructor</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row, index) => (
                                        <tr key={`${row.subject_code}-${index}`}>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'subject_code' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        value={row.subject_code || ''}
                                                        onChange={(e) => handleRowChange(index, 'subject_code', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'subject_code' })}
                                                    >
                                                        {row.subject_code || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'subject_name' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        value={row.subject_name || ''}
                                                        onChange={(e) => handleRowChange(index, 'subject_name', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'subject_name' })}
                                                    >
                                                        {row.subject_name || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingCell.index === index && editingCell.field === 'units' ? (
                                                    <input
                                                        type="number"
                                                        className="preview-edit-input center"
                                                        value={row.units !== null && row.units !== undefined ? row.units : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseInt(e.target.value)
                                                            handleRowChange(index, 'units', val)
                                                        }}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'units' })}
                                                    >
                                                        {row.units !== null && row.units !== undefined ? row.units : '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingCell.index === index && editingCell.field === 'midterm_grade' ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="preview-edit-input center"
                                                        value={row.midterm_grade !== null && row.midterm_grade !== undefined ? row.midterm_grade : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                                            handleRowChange(index, 'midterm_grade', val)
                                                        }}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        className="grade-badge"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'midterm_grade' })}
                                                    >
                                                        {row.midterm_grade !== null && row.midterm_grade !== undefined ? row.midterm_grade : '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingCell.index === index && editingCell.field === 'final_grade' ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="preview-edit-input center"
                                                        value={row.final_grade !== null && row.final_grade !== undefined ? row.final_grade : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                                            handleRowChange(index, 'final_grade', val)
                                                        }}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        className="grade-badge"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'final_grade' })}
                                                    >
                                                        {row.final_grade !== null && row.final_grade !== undefined ? row.final_grade : '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingCell.index === index && editingCell.field === 'semester' ? (
                                                    <input
                                                        type="number"
                                                        className="preview-edit-input center"
                                                        value={row.semester !== null && row.semester !== undefined ? row.semester : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseInt(e.target.value)
                                                            handleRowChange(index, 'semester', val)
                                                        }}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'semester' })}
                                                    >
                                                        {row.semester !== null && row.semester !== undefined ? row.semester : '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'instructor' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        value={row.instructor || ''}
                                                        onChange={(e) => handleRowChange(index, 'instructor', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'instructor' })}
                                                    >
                                                        {row.instructor || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-danger sm"
                                                    onClick={() => handleDeleteRow(index)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {result && result.commit && (
                <div className="alert alert-success" style={{ marginTop: '24px' }}>
                    <strong>✓ Import Successful!</strong> Added {result.created_grades} grades for <strong>{result.created_student?.first_name} {result.created_student?.last_name}</strong>.
                </div>
            )}
        </div>
    )
}

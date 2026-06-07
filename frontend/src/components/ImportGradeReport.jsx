import { useState } from 'react'
import { importService } from '../services/api'

export default function ImportGradeReport() {
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

    function handleMetadataChange(key, val) {
        setPreview(prev => {
            if (!prev) return null
            return {
                ...prev,
                metadata: {
                    ...prev.metadata,
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

    function handleRowGradeChange(index, key, val) {
        setPreview(prev => {
            if (!prev) return null
            const updatedRows = [...prev.rows]
            const updatedRow = { ...updatedRows[index], [key]: val }
            
            // Recompute final grade and remark
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
            
            let remark = 'INC'
            if (finalValue !== null) {
                remark = finalValue <= 3.0 ? 'Passed' : 'Failed'
            }
            updatedRow.remark = remark
            
            updatedRows[index] = updatedRow
            return {
                ...prev,
                rows: updatedRows
            }
        })
    }

    async function previewImport() {
        if (!file) return
        setLoading(true)
        setLoadingPhase('Scanning and extracting file content (OCR)...')
        setError('')
        setResult(null)

        try {
            const data = await importService.previewGradeReport(file)
            setPreview(data)
            setLoadingPhase('')
        } catch (err) {
            setError(err.message || 'Failed to parse Grade Report')
            setLoadingPhase('')
        } finally {
            setLoading(false)
        }
    }

    async function commitImport() {
        if (!preview) return
        setLoading(true)
        setLoadingPhase('Processing and importing grade records...')
        setError('')
        setResult(null)

        try {
            const data = await importService.commitGradeReportData(preview)
            setResult({
                commit: true,
                created_grades: data.created_grades,
                metadata: preview.metadata
            })
            setLoadingPhase('')
        } catch (err) {
            setError(err.message || 'Failed to import Grade Report')
            setLoadingPhase('')
        } finally {
            setLoading(false)
        }
    }

    function getStatusStyle(status) {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'regular'
            case 'dropped':
            case 'officially dropped':
            case 'unofficially dropped':
                return 'deficient'
            default:
                return ''
        }
    }

    return (
        <div className="page-card">
            <div className="page-header">
                <div>
                    <h2>📄 Import Grade Report</h2>
                    <p>Upload a scanned Grade Report image (JPG/PNG) or PDF to extract and import records.</p>
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
                                    <div className="file-text">Click to select PDF or Image</div>
                                </>
                            )}
                        </div>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>

                    <div className="button-group">
                        <button className="btn btn-primary" onClick={previewImport} disabled={!file || loading}>
                            <span className="btn-icon">👁️</span>
                            {loading && loadingPhase.includes('Scanning') ? 'Scanning...' : 'Preview'}
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
                        <div className="loading-hint">This may take a minute depending on file size and OCR complexity...</div>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginTop: '24px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {preview && (
                <div className="preview-section" style={{ marginTop: '24px' }}>
                    <h3>📋 Extracted Data Preview</h3>

                    <div className="student-card">
                        <h4>Subject & Report Information</h4>
                        <div className="student-grid">
                            <div className="student-field">
                                <span className="field-label">Subject Code</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.subject_code || ''}
                                    onChange={(e) => handleMetadataChange('subject_code', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Description</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.subject_description || ''}
                                    onChange={(e) => handleMetadataChange('subject_description', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Instructor</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.instructor || ''}
                                    onChange={(e) => handleMetadataChange('instructor', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Academic Period</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.academic_period || ''}
                                    onChange={(e) => handleMetadataChange('academic_period', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Class / Section</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.class_section || ''}
                                    onChange={(e) => handleMetadataChange('class_section', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Institution</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.institution || ''}
                                    onChange={(e) => handleMetadataChange('institution', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Campus</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.campus || ''}
                                    onChange={(e) => handleMetadataChange('campus', e.target.value)}
                                />
                            </div>
                            <div className="student-field">
                                <span className="field-label">Date Generated</span>
                                <input
                                    type="text"
                                    className="preview-edit-input"
                                    value={preview.metadata.report_date || ''}
                                    onChange={(e) => handleMetadataChange('report_date', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grades-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0 }}>Student Records ({preview.rows.length} rows)</h4>
                            <button className="btn btn-primary sm" onClick={handleAddRow}>
                                <span className="btn-icon">+</span> Add Student Record
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Course</th>
                                        <th style={{ textAlign: 'center' }}>Midterm</th>
                                        <th style={{ textAlign: 'center' }}>Final</th>
                                        <th>Remark</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row, index) => (
                                        <tr key={`${row.student_number}-${index}`} className={row.enrollment_status?.toLowerCase() !== 'active' ? 'status-warning-row' : ''}>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'student_number' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                                                        value={row.student_number || ''}
                                                        onChange={(e) => handleRowChange(index, 'student_number', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                                                        onClick={() => setEditingCell({ index, field: 'student_number' })}
                                                    >
                                                        {row.student_number || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'student_name' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        style={{ fontWeight: 600 }}
                                                        value={row.student_name || ''}
                                                        onChange={(e) => handleRowChange(index, 'student_name', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer', fontWeight: 600 }}
                                                        onClick={() => setEditingCell({ index, field: 'student_name' })}
                                                    >
                                                        {row.student_name || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'course' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        value={row.course || ''}
                                                        onChange={(e) => handleRowChange(index, 'course', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'course' })}
                                                    >
                                                        {row.course || '—'}
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
                                                            handleRowGradeChange(index, 'midterm_grade', val)
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
                                                            handleRowGradeChange(index, 'final_grade', val)
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
                                            <td>
                                                {editingCell.index === index && editingCell.field === 'remark' ? (
                                                    <input
                                                        type="text"
                                                        className="preview-edit-input"
                                                        value={row.remark || ''}
                                                        onChange={(e) => handleRowChange(index, 'remark', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell({ index: null, field: null }) }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ display: 'block', minHeight: '1.2em', cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'remark' })}
                                                    >
                                                        {row.remark || '—'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {editingCell.index === index && editingCell.field === 'enrollment_status' ? (
                                                    <select
                                                        className="preview-edit-select"
                                                        value={row.enrollment_status || 'Active'}
                                                        onChange={(e) => handleRowChange(index, 'enrollment_status', e.target.value)}
                                                        onBlur={() => setEditingCell({ index: null, field: null })}
                                                        autoFocus
                                                    >
                                                        <option value="Active">Active</option>
                                                        <option value="Dropped">Dropped</option>
                                                        <option value="Officially Dropped">Officially Dropped</option>
                                                        <option value="Unofficially Dropped">Unofficially Dropped</option>
                                                    </select>
                                                ) : (
                                                    <span
                                                        className={`status-badge ${getStatusStyle(row.enrollment_status)}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setEditingCell({ index, field: 'enrollment_status' })}
                                                    >
                                                        {row.enrollment_status}
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
                    <strong>✓ Import Successful!</strong> Added {result.created_grades} grade records for the subject <strong>{result.metadata.subject_code} - {result.metadata.subject_description}</strong>.
                </div>
            )}
        </div>
    )
}
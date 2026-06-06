import { useState } from 'react'
import { importService } from '../services/api'

export default function ImportGradeReport() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingPhase, setLoadingPhase] = useState('')
    const [error, setError] = useState('')

    function handleFileChange(event) {
        setPreview(null)
        setResult(null)
        setError('')
        const nextFile = event.target.files?.[0]
        setFile(nextFile ?? null)
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
        if (!file) return
        setLoading(true)
        setLoadingPhase('Processing and importing grade records...')
        setError('')
        setResult(null)

        try {
            const data = await importService.commitGradeReport(file)
            setResult(data)
            setPreview(data)
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
                                <span className="field-value">{preview.metadata.subject_code || 'N/A'}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Description</span>
                                <span className="field-value">{preview.metadata.subject_description || 'N/A'}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Instructor</span>
                                <span className="field-value">{preview.metadata.instructor || 'N/A'}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Academic Period</span>
                                <span className="field-value">{preview.metadata.academic_period || 'N/A'}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Class / Section</span>
                                <span className="field-value">{preview.metadata.class_section || 'N/A'}</span>
                            </div>
                            {preview.metadata.institution && (
                                <div className="student-field">
                                    <span className="field-label">Institution</span>
                                    <span className="field-value">{preview.metadata.institution}</span>
                                </div>
                            )}
                            {preview.metadata.campus && (
                                <div className="student-field">
                                    <span className="field-label">Campus</span>
                                    <span className="field-value">{preview.metadata.campus}</span>
                                </div>
                            )}
                            {preview.metadata.report_date && (
                                <div className="student-field">
                                    <span className="field-label">Date Generated</span>
                                    <span className="field-value">{preview.metadata.report_date}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grades-card">
                        <h4>Student Records ({preview.rows.length} rows)</h4>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row, index) => (
                                        <tr key={`${row.student_number}-${index}`} className={row.enrollment_status?.toLowerCase() !== 'active' ? 'status-warning-row' : ''}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{row.student_number}</td>
                                            <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                                            <td>{row.course}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="grade-badge">{row.midterm_grade ?? '—'}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="grade-badge">{row.final_grade ?? '—'}</span>
                                            </td>
                                            <td>{row.remark || '—'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`status-badge ${getStatusStyle(row.enrollment_status)}`}>
                                                    {row.enrollment_status}
                                                </span>
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
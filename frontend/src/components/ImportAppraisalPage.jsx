import { useState } from 'react'
import { importService } from '../services/api'

export default function ImportAppraisalPage() {
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
        if (!file) return
        setLoading(true)
        setLoadingPhase('Processing and importing data...')
        setError('')
        setResult(null)

        try {
            const data = await importService.commit(file)
            setResult(data)
            setPreview(data)
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
                                <span className="field-label">Name</span>
                                <span className="field-value">{preview.student.first_name} {preview.student.middle_name || ''} {preview.student.last_name}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Student ID</span>
                                <span className="field-value">{preview.student.student_id}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Course/Major</span>
                                <span className="field-value">{preview.student.major || preview.student.course || 'N/A'}</span>
                            </div>
                            <div className="student-field">
                                <span className="field-label">Address</span>
                                <span className="field-value">{preview.student.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grades-card">
                        <h4>Grade Records ({preview.rows.length} subjects)</h4>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Subject</th>
                                        <th>Units</th>
                                        <th>Midterm</th>
                                        <th>Final</th>
                                        <th>Semester</th>
                                        <th>Instructor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row, index) => (
                                        <tr key={`${row.subject_code}-${index}`}>
                                            <td>{row.subject_code}</td>
                                            <td>{row.subject_name}</td>
                                            <td>{row.units ?? '—'}</td>
                                            <td>{row.midterm_grade ?? '—'}</td>
                                            <td>{row.final_grade ?? '—'}</td>
                                            <td>{row.semester ?? '—'}</td>
                                            <td>{row.instructor || '—'}</td>
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

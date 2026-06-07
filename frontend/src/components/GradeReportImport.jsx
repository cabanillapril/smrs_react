import React, { useState } from 'react';
import EditableField from './EditableField';
import { useToasts } from '../App';
import { importService } from '../services/api';

export default function GradeReportImport({ onOpenStudentEdit }) {
    const toast = useToasts();
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        setFile(selected || null);
        setPreviewData(null);
    };

    const handlePreview = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatusMsg("Scanning document...");
        try {
            const data = await importService.previewGradeReport(file);
            setPreviewData(data);
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCommit = async () => {
        if (!previewData) return;
        setIsProcessing(true);
        setStatusMsg("Importing records...");
        try {
            const res = await importService.commitGradeReportData(previewData);
            const studentData = res?.student || res?.data?.student || res?.created_student;

            toast(`Successfully imported ${res.created_grades} records!`, "success");

            // Auto-open modal if we imported for a specific student
            if (onOpenStudentEdit && studentData) {
                onOpenStudentEdit(studentData);
            }

            handleReset();
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const updateMetadata = (field, value) => {
        setPreviewData(prev => ({
            ...prev,
            metadata: { ...prev.metadata, [field]: value }
        }));
    };

    const updateRow = (index, field, value) => {
        const newRows = [...previewData.rows];
        newRows[index][field] = value;
        setPreviewData(prev => ({ ...prev, rows: newRows }));
    };

    const handleReset = () => {
        setPreviewData(null);
        setFile(null);
        setIsProcessing(false);
        setStatusMsg("");
    };

    return (
        <div className="page active">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Import Grade Report</h1>
                    <p className="page-subtitle">Upload scanned grade sheets to record bulk student grades</p>
                </div>
            </div>

            <div className="section-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="file" className="form-input" onChange={handleFileChange} accept=".pdf,image/*" />
                    <button className="btn btn-primary" onClick={handlePreview} disabled={!file || isProcessing}>
                        {isProcessing ? "Processing..." : "Preview Scan"}
                    </button>
                    {previewData && (
                        <button className="btn btn-success" onClick={handleCommit} disabled={isProcessing}>
                            Save to Database
                        </button>
                    )}
                </div>
            </div>

            {previewData && (
                <div className="preview-container">
                    <div className="section-card" style={{ marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '15px' }}>Report Metadata</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <EditableField label="Subject Code" value={previewData.metadata.subject_code} onSave={(v) => updateMetadata('subject_code', v)} />
                            <EditableField label="Description" value={previewData.metadata.subject_description} onSave={(v) => updateMetadata('subject_description', v)} />
                            <EditableField label="Instructor" value={previewData.metadata.instructor} onSave={(v) => updateMetadata('instructor', v)} />
                            <EditableField label="Period" value={previewData.metadata.academic_period} onSave={(v) => updateMetadata('academic_period', v)} />
                        </div>
                    </div>

                    <div className="table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Full Name</th>
                                    <th style={{ textAlign: 'center' }}>Midterm</th>
                                    <th style={{ textAlign: 'center' }}>Final</th>
                                    <th>Remark</th>
                                    <th>Enrollment</th>
                                    <th>Student Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.rows.map((row, idx) => (
                                    <tr key={idx}>
                                        {/* Row background is now standard/transparent, not maroon */}
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', whiteSpace: 'normal' }}>
                                            <EditableField
                                                value={row.student_number}
                                                onSave={(v) => updateRow(idx, 'student_number', v)}
                                            />
                                        </td>
                                        <td style={{ fontWeight: '600', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <EditableField
                                                value={row.student_name}
                                                onSave={(v) => updateRow(idx, 'student_name', v)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <EditableField
                                                value={row.midterm_grade}
                                                onSave={(v) => updateRow(idx, 'midterm_grade', parseFloat(v))}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <EditableField
                                                value={row.final_grade}
                                                onSave={(v) => updateRow(idx, 'final_grade', parseFloat(v))}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={row.remark}
                                                type="select"
                                                options={['Passed', 'Failed', 'INC', 'Dropped', 'Unofficially Dropped', 'Officially Dropped']}
                                                onSave={(v) => updateRow(idx, 'remark', v)}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={row.enrollment_status}
                                                type="select"
                                                options={['Active', 'Dropped', 'Unofficially Dropped', 'Officially Dropped']}
                                                onSave={(v) => updateRow(idx, 'enrollment_status', v)}
                                            />
                                        </td>
                                        <td>
                                            <EditableField
                                                value={row.student_status}
                                                type="select"
                                                options={['Regular', 'Irregular']}
                                                onSave={(v) => updateRow(idx, 'student_status', v)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
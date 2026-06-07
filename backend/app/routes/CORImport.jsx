import React, { useState } from 'react';
import EditableField from '../components/EditableField';
import { useToasts } from '../App';
import { importService } from '../services/api';

/**
 * COR Import Page
 * - Natural text preview (no boxes until clicked)
 * - Auto-opens Student Modal after successful commit
 */
export default function CORImport({ onOpenStudentEdit }) {
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
            // Assuming your api service has a previewCor method
            const data = await importService.previewCor(file);
            setPreviewData(data);
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setIsProcessing(false);
            setStatusMsg("");
        }
    };

    const handleCommit = async () => {
        if (!previewData) return;
        setIsProcessing(true);
        setStatusMsg("Saving to database...");
        try {
            const res = await importService.commitCorData(previewData);

            // More robust data extraction for triggering the modal
            const studentData = res?.student || res?.data?.student || res?.data?.created_student;

            toast("COR Data saved successfully!", "success");

            // CRUCIAL: Trigger the student modal to add additional info
            if (onOpenStudentEdit && studentData) {
                onOpenStudentEdit(studentData);
            }
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setIsProcessing(false);
            setStatusMsg("");
        }
    };

    const updateStudentField = (field, value) => {
        setPreviewData(prev => ({
            ...prev,
            student: { ...prev.student, [field]: value }
        }));
    };

    const updateSubjectField = (index, field, value) => {
        const newSubjects = [...previewData.subjects];
        newSubjects[index][field] = value;
        setPreviewData(prev => ({ ...prev, subjects: newSubjects }));
    };

    return (
        <div className="page active">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Import COR</h1>
                    <p className="page-subtitle">Upload Certificate of Registration to enroll student and subjects</p>
                </div>
            </div>

            <div className="section-card" style={{ marginBottom: '24px' }}>
                <div className="upload-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="file"
                        className="form-input"
                        onChange={handleFileChange}
                        accept=".pdf,image/*"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handlePreview}
                        disabled={!file || isProcessing}
                    >
                        {isProcessing && statusMsg.includes("Scanning") ? "Scanning..." : "Preview"}
                    </button>
                    {previewData && (
                        <button
                            className="btn btn-success"
                            onClick={handleCommit}
                            disabled={isProcessing}
                        >
                            {isProcessing && statusMsg.includes("Saving") ? "Saving..." : "Save & Complete Profile"}
                        </button>
                    )}
                </div>
                {isProcessing && <div className="loading-bar-tiny" style={{ marginTop: '12px' }}>{statusMsg}</div>}
            </div>

            {previewData && (
                <div className="preview-layout">
                    <div className="section-card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Student Identification</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <EditableField
                                label="Student ID"
                                value={previewData.student.student_id}
                                onSave={(val) => updateStudentField('student_id', val)}
                            />
                            <EditableField
                                label="Last Name"
                                value={previewData.student.last_name}
                                onSave={(val) => updateStudentField('last_name', val)}
                            />
                            <EditableField
                                label="First Name"
                                value={previewData.student.first_name}
                                onSave={(val) => updateStudentField('first_name', val)}
                            />
                            <EditableField
                                label="Course"
                                value={previewData.student.course}
                                onSave={(val) => updateStudentField('course', val)}
                            />
                            <EditableField
                                label="Status (DB)"
                                value={previewData.student.status || 'Regular'}
                                type="select"
                                options={['Regular', 'Irregular']}
                                onSave={(val) => updateStudentField('status', val)}
                            />
                        </div>
                    </div>

                    <div className="table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Description</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Units</th>
                                    <th>Instructor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.subjects.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
                                            <EditableField
                                                value={row.subject_code}
                                                onSave={(val) => updateSubjectField(idx, 'subject_code', val)}
                                            />
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <EditableField
                                                value={row.subject_name}
                                                onSave={(val) => updateSubjectField(idx, 'subject_name', val)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', width: '80px' }}>
                                            <EditableField
                                                value={row.units}
                                                onSave={(val) => updateSubjectField(idx, 'units', val)}
                                            />
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <EditableField
                                                value={row.instructor}
                                                onSave={(val) => updateSubjectField(idx, 'instructor', val)}
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
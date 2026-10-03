import { useState } from 'react';
import type { HealthRecordCategory } from '@/types/healthRecords';
import {
  ALLOWED_HEALTH_RECORD_MIME_TYPES,
  MAX_HEALTH_RECORD_FILE_SIZE_BYTES,
  HEALTH_RECORD_CATEGORY_LABELS,
} from '@/types/healthRecords';
import { useUploadHealthRecord, useDirectCreateHealthRecord } from '@/hooks/useHealthRecords';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface UploadRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadRecordModal({ isOpen, onClose, onSuccess }: UploadRecordModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<HealthRecordCategory>('LAB_REPORT');
  const [title, setTitle] = useState('');
  const [recordedDate, setRecordedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<string | null>(null);

  const uploadMutation = useUploadHealthRecord();
  const directMutation = useDirectCreateHealthRecord();

  if (!isOpen) return null;

  const isUploading = uploadMutation.isPending || directMutation.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size (max 25 MB)
    if (selected.size > MAX_HEALTH_RECORD_FILE_SIZE_BYTES) {
      setValidationError(
        `File exceeds maximum permitted size of 25 MB (Selected: ${(selected.size / (1024 * 1024)).toFixed(1)} MB).`
      );
      setFile(null);
      return;
    }

    // Validate MIME type
    const mime = selected.type || 'application/octet-stream';
    const isAllowed = (ALLOWED_HEALTH_RECORD_MIME_TYPES as readonly string[]).includes(mime);
    // Also check extension fallback for PDF/DICOM if browser reports empty type
    const ext = selected.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'tiff' || ext === 'dcm';

    if (!isAllowed && !isAllowedExt) {
      setValidationError(
        `Unsupported document format (${mime}). Allowed formats: PDF, JPEG, PNG, WebP, TIFF, DICOM.`
      );
      setFile(null);
      return;
    }

    setFile(selected);
    if (!title) {
      // Pre-fill title without extension
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!file) {
      setValidationError('Please select a health document or file to upload.');
      return;
    }

    if (!title.trim()) {
      setValidationError('Please enter a descriptive title for this record.');
      return;
    }

    if (!recordedDate) {
      setValidationError('Please specify the clinical date of the record.');
      return;
    }

    const mime = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    try {
      setUploadStep('Initiating secure vault upload window...');

      // Attempt standard 3-step presigned upload
      try {
        await uploadMutation.mutateAsync({
          intentDto: {
            category,
            title: title.trim(),
            fileName: file.name,
            fileSizeBytes: file.size,
            mimeType: mime,
            recordedDate,
            description: description.trim() || undefined,
          },
          file,
        });
      } catch (err: unknown) {
        // If it's an API validation/auth error (4xx), do not attempt fallback or duplicate retry
        if (
          err &&
          typeof err === 'object' &&
          'status' in err &&
          typeof (err as { status: unknown }).status === 'number' &&
          (err as { status: number }).status >= 400 &&
          (err as { status: number }).status < 500
        ) {
          throw err;
        }

        // If presigned storage URL network transfer failed, attempt direct base64 ingest
        setUploadStep('Finalizing document ingest...');
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          const byte = bytes[i];
          if (byte !== undefined) {
            binary += String.fromCharCode(byte);
          }
        }
        const base64 = btoa(binary);

        await directMutation.mutateAsync({
          category,
          title: title.trim(),
          fileName: file.name,
          fileMimeType: mime,
          fileSizeBytes: file.size,
          recordedDate,
          description: description.trim() || undefined,
          fileContentBase64: base64,
        });
      }

      setUploadStep(null);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setUploadStep(null);
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setValidationError(message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 58, 120, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '540px',
          padding: '24px 28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 id="upload-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#073a78', margin: 0 }}>
              Upload Health Record
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Documents are stored securely in your encrypted personal health vault.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close dialog"
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              fontSize: '16px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              color: '#475569',
            }}
          >
            ×
          </button>
        </div>

        {validationError && (
          <div style={{ marginBottom: '16px' }}>
            <ErrorAlert title="Validation Error" message={validationError} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Picker */}
          <div>
            <label
              htmlFor="record-file"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Document / Medical File <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: file ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('record-file')?.click()}
            >
              <input
                id="record-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.dcm,application/pdf,image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
              {file ? (
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#096ed3' }}>
                    {file.name}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Document'}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    Click to select document or image
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                    PDF, JPEG, PNG, WebP, TIFF, DICOM up to 25 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Record Title */}
          <div>
            <label
              htmlFor="record-title"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Record Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="record-title"
              type="text"
              maxLength={200}
              placeholder="e.g. Fasting Lipid & HbA1c Panel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Two Columns: Category & Clinical Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="record-category"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
              >
                Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="record-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as HealthRecordCategory)}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                }}
              >
                {(Object.keys(HEALTH_RECORD_CATEGORY_LABELS) as HealthRecordCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {HEALTH_RECORD_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="record-date"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
              >
                Clinical Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="record-date"
                type="date"
                value={recordedDate}
                onChange={(e) => setRecordedDate(e.target.value)}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="record-desc"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Clinical Notes / Context (Optional)
            </label>
            <textarea
              id="record-desc"
              rows={3}
              maxLength={2000}
              placeholder="e.g. Ordered following annual physical consultation."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Upload Progress Status */}
          {isUploading && (
            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
                {uploadStep || 'Uploading document to secure health vault...'}
              </p>
              <div
                style={{
                  height: '6px',
                  background: '#e0f2fe',
                  borderRadius: '3px',
                  marginTop: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
                    borderRadius: '3px',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 0,
                background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(11, 169, 231, 0.25)',
              }}
            >
              {isUploading ? 'Securing & Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { HealthRecordsPage } from '@/features/health-records/HealthRecordsPage';
import { HealthRecordDetailPage } from '@/features/health-records/HealthRecordDetailPage';
import { UploadRecordModal } from '@/features/health-records/components/UploadRecordModal';
import { RecordPreviewModal } from '@/features/health-records/components/RecordPreviewModal';
import { DeleteRecordModal } from '@/features/health-records/components/DeleteRecordModal';
import { GrantConsentModal } from '@/features/consent/components/GrantConsentModal';
import { RevokeConsentModal } from '@/features/consent/components/RevokeConsentModal';
import { ConsentAuditHistoryModal } from '@/features/consent/components/ConsentAuditHistoryModal';
import * as healthRecordsApi from '@/api/healthRecords';
import * as doctorsApi from '@/api/doctors';
import { ApiError } from '@/api/client';
import {
  HealthRecordCategory,
  HealthRecordStatus,
  ConsentScope,
  ConsentStatus,
  ConsentAction,
} from '@/types/healthRecords';
import type {
  HealthRecordResponseDto,
  PaginatedHealthRecordsResponseDto,
  ConsentResponseDto,
  ConsentDetailResponseDto,
} from '@/types/healthRecords';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const mockRecord1: HealthRecordResponseDto = {
  id: 'record-uuid-1',
  publicRecordId: 'REC-901A',
  patientId: 'patient-1',
  category: HealthRecordCategory.LAB_REPORT,
  title: 'Comprehensive Metabolic Panel',
  description: 'Annual fasting metabolic panel and kidney function test',
  originalFileName: 'metabolic_panel_2026.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 2048500,
  status: HealthRecordStatus.AVAILABLE,
  recordedDate: '2026-09-12T00:00:00.000Z',
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
};

const mockRecord2: HealthRecordResponseDto = {
  id: 'record-uuid-2',
  publicRecordId: 'REC-902B',
  patientId: 'patient-1',
  category: HealthRecordCategory.IMAGING,
  title: 'Chest X-Ray Digital Scan',
  description: 'PA view clear lung fields',
  originalFileName: 'chest_xray.png',
  mimeType: 'image/png',
  fileSizeBytes: 8450100,
  status: HealthRecordStatus.AVAILABLE,
  recordedDate: '2026-09-02T00:00:00.000Z',
  createdAt: '2026-09-02T14:30:00.000Z',
  updatedAt: '2026-09-02T14:30:00.000Z',
};

const mockPaginatedRecords: PaginatedHealthRecordsResponseDto = {
  data: [mockRecord1, mockRecord2],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockConsent1: ConsentResponseDto = {
  id: 'consent-uuid-1',
  publicPatientId: 'PAT-1001',
  publicDoctorId: 'DOC-501',
  doctorDisplayName: 'Dr. Gregory House, MD',
  careRelationshipId: 'rel-1',
  scope: ConsentScope.HEALTH_RECORDS,
  status: ConsentStatus.ACTIVE,
  purpose: 'Care consultation and longitudinal monitoring',
  isCurrentlyActive: true,
  grantedAt: '2026-09-01T12:00:00.000Z',
  expiresAt: '2026-12-01T12:00:00.000Z',
  revokedAt: null,
  revocationReason: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

const mockConsent2: ConsentResponseDto = {
  id: 'consent-uuid-2',
  publicPatientId: 'PAT-1001',
  publicDoctorId: 'DOC-502',
  doctorDisplayName: 'Dr. Allison Cameron, MD',
  careRelationshipId: 'rel-2',
  scope: ConsentScope.WELLNESS,
  status: ConsentStatus.REVOKED,
  purpose: 'Second opinion consultation',
  isCurrentlyActive: false,
  grantedAt: '2026-08-01T12:00:00.000Z',
  expiresAt: null,
  revokedAt: '2026-08-20T10:00:00.000Z',
  revocationReason: 'Consultation concluded',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
};

const mockConsentDetail: ConsentDetailResponseDto = {
  consent: mockConsent1,
  history: [
    {
      id: 'audit-1',
      consentId: 'consent-uuid-1',
      action: ConsentAction.GRANTED,
      actorId: 'patient-1',
      actorRole: 'PATIENT',
      reason: 'Care consultation',
      metadata: null,
      createdAt: '2026-09-01T12:00:00.000Z',
    },
  ],
};

const mockTestUser = {
  id: 'patient-1',
  email: 'patient@example.com',
  phone: null,
  roles: ['PATIENT'] as Array<'PATIENT'>,
  emailVerified: true,
  phoneVerified: false,
  status: 'ACTIVE' as const,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function renderWithProviders(ui: React.ReactElement, initialRoute = '/health-records') {
  const queryClient = createTestQueryClient();

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          initialState={{
            status: 'AUTHENTICATED',
            user: mockTestUser,
          }}
        >
          <MemoryRouter initialEntries={[initialRoute]}>
            {ui}
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    ),
    queryClient,
  };
}

describe('Phase 9 — Health Records, Media & Consent Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('manvia_auth_token', 'mock-patient-jwt');
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'patient-1',
        email: 'patient@example.com',
        roles: ['PATIENT'],
        firstName: 'Jane',
        lastName: 'Doe',
      })
    );

    vi.spyOn(healthRecordsApi, 'getPatientHealthRecordsApi').mockResolvedValue(mockPaginatedRecords);
    vi.spyOn(healthRecordsApi, 'getPatientConsentsApi').mockResolvedValue([mockConsent1, mockConsent2]);
    vi.spyOn(healthRecordsApi, 'getHealthRecordByIdApi').mockResolvedValue(mockRecord1);
    vi.spyOn(healthRecordsApi, 'getRecordDownloadUrlApi').mockResolvedValue({
      recordId: 'record-uuid-1',
      publicRecordId: 'REC-901A',
      downloadUrl: 'https://storage.manvia.local/signed/metabolic_panel.pdf?token=sec123',
      expiresInSeconds: 300,
    });
    vi.spyOn(healthRecordsApi, 'getConsentDetailsApi').mockResolvedValue(mockConsentDetail);
    vi.spyOn(doctorsApi, 'searchDoctorsApi').mockResolvedValue({
      data: [
        {
          publicDoctorId: 'DOC-501',
          displayName: 'Dr. Gregory House, MD',
          bio: 'Diagnostic Medicine',
          primarySpecialty: 'Internal Medicine',
          subSpecialties: [],
          languages: ['English'],
          yearsOfExperience: 20,
          defaultConsultationFee: 150,
          currency: 'USD',
          verificationStatus: 'VERIFIED',
          qualifications: [],
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
  });

  // 1. Health records list renders
  it('1. renders the health records list with records from backend', async () => {
    renderWithProviders(<HealthRecordsPage />);

    expect(await screen.findByText('Comprehensive Metabolic Panel')).toBeInTheDocument();
    expect(screen.getByText('Chest X-Ray Digital Scan')).toBeInTheDocument();
    expect(screen.getByText('REC-901A')).toBeInTheDocument();
    expect(screen.getByText('REC-902B')).toBeInTheDocument();
  });

  // 2. Empty records state
  it('2. displays empty state when patient has no health records', async () => {
    vi.spyOn(healthRecordsApi, 'getPatientHealthRecordsApi').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    renderWithProviders(<HealthRecordsPage />);

    expect(await screen.findByText(/No Health Records Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload First Document/i)).toBeInTheDocument();
  });

  // 3. Record loading state
  it('3. displays accessible loading state while records are loading', async () => {
    vi.spyOn(healthRecordsApi, 'getPatientHealthRecordsApi').mockReturnValue(new Promise(() => {}));

    renderWithProviders(<HealthRecordsPage />);

    expect(screen.getByText(/Accessing encrypted health vault/i)).toBeInTheDocument();
  });

  // 4. Record error state
  it('4. displays error alert and retry button when records query fails', async () => {
    vi.spyOn(healthRecordsApi, 'getPatientHealthRecordsApi').mockRejectedValue(
      new ApiError('Health records service temporarily offline', 500)
    );

    renderWithProviders(<HealthRecordsPage />);

    expect(await screen.findByText('Failed to Load Health Records')).toBeInTheDocument();
    expect(screen.getByText('Health records service temporarily offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  // 5. Record detail renders
  it('5. renders single record detail page with complete backend metadata', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/health-records/:recordId" element={<HealthRecordDetailPage />} />
      </Routes>,
      '/health-records/record-uuid-1'
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Comprehensive Metabolic Panel' })).toBeInTheDocument();
    expect(screen.getByText('metabolic_panel_2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('application/pdf')).toBeInTheDocument();
    expect(screen.getByText('Securely encrypted at rest')).toBeInTheDocument();
    expect(screen.getByText('Dr. Gregory House, MD')).toBeInTheDocument();
  });

  // 6 & 7. Upload validation (reject > 25MB and unsupported MIME)
  it('6 & 7. validates file size <= 25MB and allowed MIME types on upload', async () => {
    renderWithProviders(<UploadRecordModal isOpen={true} onClose={() => {}} />);

    // Try unsupported MIME type (e.g. .exe / text/plain)
    const fileInput = screen.getByLabelText(/Document \/ Medical File/i);

    const badFile = new File(['executable content'], 'virus.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(await screen.findByText(/Unsupported document format/i)).toBeInTheDocument();

    // Try file > 25 MB
    const largeFile = new File(['a'.repeat(100)], 'huge_scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 30 * 1024 * 1024 }); // 30 MB
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(await screen.findByText(/File exceeds maximum permitted size of 25 MB/i)).toBeInTheDocument();
  });

  // 8. Backend upload success
  it('8. executes successful upload flow using backend presigned URL and finalization', async () => {
    vi.spyOn(healthRecordsApi, 'createUploadIntentApi').mockResolvedValue({
      recordId: 'rec-new-123',
      publicRecordId: 'REC-NEW-123',
      uploadUrl: 'https://storage.manvia.local/upload/rec-new-123',
      storageKey: 'patients/p1/rec-new-123',
      expiresInSeconds: 900,
      requiredHeaders: {},
    });
    vi.spyOn(healthRecordsApi, 'uploadFileToPresignedUrlApi').mockResolvedValue();
    vi.spyOn(healthRecordsApi, 'finalizeUploadApi').mockResolvedValue({
      ...mockRecord1,
      id: 'rec-new-123',
      title: 'Blood Work Results',
    });

    const handleSuccess = vi.fn();
    renderWithProviders(<UploadRecordModal isOpen={true} onClose={() => {}} onSuccess={handleSuccess} />);

    // Attach valid PDF file
    const validFile = new File(['valid pdf content'], 'blood_work.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1 MB
    const fileInput = screen.getByLabelText(/Document \/ Medical File/i);
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Fill title
    const titleInput = screen.getByLabelText(/Record Title/i);
    fireEvent.change(titleInput, { target: { value: 'Blood Work Results' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Upload Document/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(healthRecordsApi.createUploadIntentApi).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Blood Work Results',
          fileName: 'blood_work.pdf',
          mimeType: 'application/pdf',
        })
      );
      expect(healthRecordsApi.uploadFileToPresignedUrlApi).toHaveBeenCalledWith(
        'https://storage.manvia.local/upload/rec-new-123',
        validFile,
        {}
      );
      expect(healthRecordsApi.finalizeUploadApi).toHaveBeenCalledWith('rec-new-123');
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  // 9. Upload failure handling
  it('9. gracefully displays backend failure when upload authorization fails', async () => {
    vi.spyOn(healthRecordsApi, 'createUploadIntentApi').mockRejectedValue(
      new ApiError('Invalid file metadata or corrupt document header', 400)
    );

    renderWithProviders(<UploadRecordModal isOpen={true} onClose={() => {}} />);

    const validFile = new File(['valid pdf content'], 'report.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/Document \/ Medical File/i);
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const titleInput = screen.getByLabelText(/Record Title/i);
    fireEvent.change(titleInput, { target: { value: 'Corrupt File' } });

    fireEvent.click(screen.getByRole('button', { name: /Upload Document/i }));

    expect(await screen.findByText('Invalid file metadata or corrupt document header')).toBeInTheDocument();
  });

  // 10. Upload duplicate/submission protection
  it('10. disables submit button and protects against duplicate clicks during pending upload', async () => {
    vi.spyOn(healthRecordsApi, 'createUploadIntentApi').mockReturnValue(new Promise(() => {}));

    renderWithProviders(<UploadRecordModal isOpen={true} onClose={() => {}} />);

    const validFile = new File(['valid pdf content'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document \/ Medical File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Record Title/i), { target: { value: 'Report 1' } });

    const submitBtn = screen.getByRole('button', { name: /Upload Document/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Uploading\.\.\./i })).toBeDisabled();
    });
  });

  // 11. Secure preview/download behavior
  it('11. fetches secure temporary signed URL for record preview and download', async () => {
    renderWithProviders(<RecordPreviewModal record={mockRecord1} isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(healthRecordsApi.getRecordDownloadUrlApi).toHaveBeenCalledWith('record-uuid-1');
    });

    expect(await screen.findByRole('link', { name: /Download File/i })).toBeInTheDocument();
    expect(screen.getByText(/Secure signed link expires in/i)).toBeInTheDocument();
  });

  // 12. Record deletion / archive if supported
  it('12. shows confirmation modal and performs soft delete/archive on confirmation', async () => {
    vi.spyOn(healthRecordsApi, 'deleteHealthRecordApi').mockResolvedValue({
      ...mockRecord1,
      status: HealthRecordStatus.ARCHIVED,
    });

    const handleSuccess = vi.fn();
    renderWithProviders(
      <DeleteRecordModal record={mockRecord1} isOpen={true} onClose={() => {}} onSuccess={handleSuccess} />
    );

    expect(screen.getByText(/Archive Health Record\?/i)).toBeInTheDocument();

    const archiveBtn = screen.getByRole('button', { name: /Confirm Archive/i });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(healthRecordsApi.deleteHealthRecordApi).toHaveBeenCalledWith('record-uuid-1');
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  // 13. Consent list rendering
  it('13. renders patient consent agreements and scopes in consent tab', async () => {
    renderWithProviders(<HealthRecordsPage />, '/health-records?tab=consents');

    expect(await screen.findByText('Dr. Gregory House, MD')).toBeInTheDocument();
    expect(screen.getByText('Dr. Allison Cameron, MD')).toBeInTheDocument();
    expect(screen.getByText('DOC-501')).toBeInTheDocument();
  });

  // 14. Consent status mapping
  it('14. correctly renders ACTIVE and REVOKED status badges with audit context', async () => {
    renderWithProviders(<HealthRecordsPage />, '/health-records?tab=consents');

    expect(await screen.findByText(/Active Access/i)).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  // 15. Consent grant
  it('15. submits new consent agreement with designated scopes to backend', async () => {
    vi.spyOn(healthRecordsApi, 'grantConsentApi').mockResolvedValue([mockConsent1]);

    const handleSuccess = vi.fn();
    renderWithProviders(<GrantConsentModal isOpen={true} onClose={() => {}} onSuccess={handleSuccess} />);

    // Select doctor
    const docSelect = await screen.findByRole('combobox');
    fireEvent.change(docSelect, { target: { value: 'DOC-501' } });

    // Submit
    const grantBtn = screen.getByRole('button', { name: /Grant Consent/i });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(healthRecordsApi.grantConsentApi).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: 'DOC-501',
          scopes: expect.arrayContaining(['HEALTH_RECORDS']),
        })
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  // 16. Consent revocation
  it('16. revokes physician consent with patient confirmation and revocation reason', async () => {
    vi.spyOn(healthRecordsApi, 'revokeConsentApi').mockResolvedValue({
      ...mockConsent1,
      status: ConsentStatus.REVOKED,
      isCurrentlyActive: false,
    });

    const handleSuccess = vi.fn();
    renderWithProviders(
      <RevokeConsentModal consent={mockConsent1} isOpen={true} onClose={() => {}} onSuccess={handleSuccess} />
    );

    expect(screen.getByText(/Revoke Physician Access\?/i)).toBeInTheDocument();
    const reasonInput = screen.getByLabelText(/Reason for Revocation/i);
    fireEvent.change(reasonInput, { target: { value: 'Care episode completed' } });

    fireEvent.click(screen.getByRole('button', { name: /Revoke Access/i }));

    await waitFor(() => {
      expect(healthRecordsApi.revokeConsentApi).toHaveBeenCalledWith('consent-uuid-1', {
        reason: 'Care episode completed',
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  // 17. Consent conflict / error handling
  it('17. displays backend error when consent revocation or grant fails', async () => {
    vi.spyOn(healthRecordsApi, 'revokeConsentApi').mockRejectedValue(
      new ApiError('Consent already revoked or expired', 409)
    );

    renderWithProviders(
      <RevokeConsentModal consent={mockConsent1} isOpen={true} onClose={() => {}} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Revoke Access/i }));

    expect(await screen.findByText('Consent already revoked or expired')).toBeInTheDocument();
  });

  // 18. 401/403 handling
  it('18. handles unauthorized or forbidden access without exposing other patients data', async () => {
    vi.spyOn(healthRecordsApi, 'getHealthRecordByIdApi').mockRejectedValue(
      new ApiError('Forbidden: You do not own this health record', 403)
    );

    renderWithProviders(
      <Routes>
        <Route path="/health-records/:recordId" element={<HealthRecordDetailPage />} />
      </Routes>,
      '/health-records/unknown-id'
    );

    expect(await screen.findByText('Record Not Found or Inaccessible')).toBeInTheDocument();
    expect(screen.getByText(/This health record does not exist or you do not have permission to view it/i)).toBeInTheDocument();
  });

  // 19. Query invalidation after changes
  it('19. invalidates health records and timeline queries after record upload', async () => {
    vi.spyOn(healthRecordsApi, 'createUploadIntentApi').mockResolvedValue({
      recordId: 'rec-new',
      publicRecordId: 'REC-NEW',
      uploadUrl: 'https://storage.local/put',
      storageKey: 'key',
      expiresInSeconds: 300,
      requiredHeaders: {},
    });
    vi.spyOn(healthRecordsApi, 'uploadFileToPresignedUrlApi').mockResolvedValue();
    vi.spyOn(healthRecordsApi, 'finalizeUploadApi').mockResolvedValue(mockRecord1);

    const { queryClient } = renderWithProviders(<UploadRecordModal isOpen={true} onClose={() => {}} />);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Document \/ Medical File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Record Title/i), { target: { value: 'Doc 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Upload Document/i }));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['health-records'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
    });
  });

  // 20. Accessibility basics
  it('20. ensures modals have accessible roles, labels, and modal semantics', () => {
    renderWithProviders(
      <ConsentAuditHistoryModal consent={mockConsent1} isOpen={true} onClose={() => {}} />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});

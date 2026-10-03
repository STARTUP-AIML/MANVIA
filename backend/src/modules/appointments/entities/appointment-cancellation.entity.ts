export type CancellationActorType = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SYSTEM';

export interface AppointmentCancellationEntity {
  id: string;
  appointmentId: string;
  cancelledBy: string;
  cancellationActorType: CancellationActorType;
  reason: string;
  reasonCode: string | null;
  metadata: string | null;
  cancelledAt: Date;
  createdAt: Date;
}

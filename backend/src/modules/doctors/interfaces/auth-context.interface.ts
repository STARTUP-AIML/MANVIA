export interface CurrentUserContext {
  userId: string;
  activeRole: 'DOCTOR' | 'PATIENT' | 'ADMIN';
  email?: string;
}

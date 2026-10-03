export interface DoctorQualificationEntity {
  id: string;
  doctorId: string;
  qualification: string;
  institution: string;
  fieldOfStudy?: string | null;
  graduationYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Frontend data vocabulary — mirrors FormFlow_System_Design_Brief.md sections 2, 4 and 5.
 * Keep in sync with Backend/src/Types/index.ts once the API is wired up; today these
 * types only shape the mock data in lib/mock-data.ts.
 */

export type PartyRole = 'owner' | 'field_supervisor' | 'university_supervisor' | 'hod' | 'guardian' | 'multi';

export type SubmissionStatus = 'draft' | 'awaiting_others' | 'complete';

export interface FormTemplateSummary {
  id: string;
  title: string;
  description: string;
  pageCount: number;
  usageCount: number;
  icon: string;
  iconTone: 'primary' | 'secondary' | 'tint';
  badge?: string;
  badgeTone: 'amber' | 'neutral' | 'error';
}

export interface MyForm {
  id: string;
  templateTitle: string;
  status: SubmissionStatus;
  description: string;
  progress: number;
  department: string;
  departmentIcon: string;
  dateLabel: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export interface StudentProfile {
  fullName: string;
  matricNumber: string;
  department: string;
  level: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  profilePhotoUrl?: string;
}

export interface GuardianProfile {
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface MediaAssets {
  passportPhotoUrl: string;
  signatureUrl: string;
}

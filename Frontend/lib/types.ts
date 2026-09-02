/**
 * Frontend data vocabulary — mirrors FormFlow_System_Design_Brief.md sections 2, 4 and 5.
 * These types shape the mock data in lib/mock-data.ts (templates, submissions, testimonials)
 * that the PDF-editing flow hasn't been wired to yet. User/profile/media types are real —
 * see lib/api.ts — since auth is wired up to the backend.
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


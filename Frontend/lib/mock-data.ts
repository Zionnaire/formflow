import type { FormTemplateSummary, MyForm, Testimonial } from './types';

/**
 * Static placeholder data standing in for the API described in
 * FormFlow_System_Design_Brief.md sections 4 and 6. Swap each of these for a
 * real fetch once the corresponding Backend endpoint is wired up.
 */

export const formTemplates: FormTemplateSummary[] = [
  {
    id: 'university-admin-form',
    title: 'University Admin Form',
    description: 'General purpose administration request.',
    pageCount: 2,
    usageCount: 1200,
    icon: 'assignment',
    iconTone: 'secondary',
    badge: 'Used by 1,200 students',
    badgeTone: 'amber',
  },
  {
    id: 'hostel-application',
    title: 'Hostel Application',
    description: 'Apply for on-campus housing.',
    pageCount: 4,
    usageCount: 850,
    icon: 'home',
    iconTone: 'primary',
    badge: 'Used by 850 students',
    badgeTone: 'amber',
  },
  {
    id: 'medical-exemption',
    title: 'Medical Exemption',
    description: 'Request academic consideration for health reasons.',
    pageCount: 1,
    usageCount: 420,
    icon: 'health_and_safety',
    iconTone: 'tint',
    badge: 'Used by 420 students',
    badgeTone: 'neutral',
  },
  {
    id: 'internship-report-booklet',
    title: 'Internship Report Booklet',
    description: 'Multi-party report — student, field supervisor, university supervisor, and HOD sections.',
    pageCount: 13,
    usageCount: 96,
    icon: 'work_history',
    iconTone: 'secondary',
    badge: 'Multi-party',
    badgeTone: 'neutral',
  },
];

export const featuredTemplates = [
  {
    id: 'scholarship-application-2024',
    title: 'Scholarship Application 2024',
    description: 'Apply for university-wide merit and need-based scholarships.',
    icon: 'workspace_premium',
    badge: 'Closing Soon',
    badgeTone: 'error' as const,
  },
  {
    id: 'semester-registration',
    title: 'Semester Registration',
    description: 'Complete your course enrollment and fee payment forms.',
    icon: 'event_note',
    badge: 'Trending',
    badgeTone: 'amber' as const,
  },
  {
    id: 'internship-logbook',
    title: 'Internship Logbook',
    description: 'Weekly progress tracking for your professional placement.',
    icon: 'work_history',
    badge: 'Trending',
    badgeTone: 'amber' as const,
  },
];

export const testimonials: Testimonial[] = [
  {
    quote: 'I finished my entire hostel application in 2 minutes. The auto-fill is a lifesaver!',
    name: 'Sarah J.',
    role: 'Engineering Student',
  },
  {
    quote: 'No more hunting for a printer or writing the same info 10 times. Simple and brilliant.',
    name: 'David O.',
    role: 'Grad School Applicant',
  },
  {
    quote: 'The shared-fill link for my guarantor worked perfectly. They finished their part in seconds.',
    name: 'Amina K.',
    role: 'International Student',
  },
];

export const myForms: MyForm[] = [
  {
    id: 'financial-aid-2024',
    templateTitle: 'Financial Aid Application 2024',
    status: 'draft',
    description: 'Needs your signature and proof of address before submission.',
    progress: 75,
    department: 'Financial Dept.',
    departmentIcon: 'folder',
    dateLabel: 'Last edited: Oct 24',
  },
  {
    id: 'housing-registration',
    templateTitle: 'Housing Registration Request',
    status: 'complete',
    description: 'All documents verified and accepted by the housing office.',
    progress: 100,
    department: 'Housing Dept.',
    departmentIcon: 'home',
    dateLabel: 'Submitted: Sep 12',
  },
  {
    id: 'course-exception',
    templateTitle: 'Course Exception Form',
    status: 'draft',
    description: 'Awaiting advisor approval for prerequisite waiver.',
    progress: 25,
    department: 'Academic Dept.',
    departmentIcon: 'school',
    dateLabel: 'Last edited: Oct 15',
  },
];

export function getTemplateById(id: string): FormTemplateSummary | undefined {
  return formTemplates.find((t) => t.id === id);
}

export function getMyFormById(id: string): MyForm | undefined {
  return myForms.find((f) => f.id === id);
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Resolves a form's display title from any of the mock sources, falling back to a humanized slug. */
export function resolveFormTitle(formId: string): string {
  return (
    getTemplateById(formId)?.title ??
    getMyFormById(formId)?.templateTitle ??
    featuredTemplates.find((t) => t.id === formId)?.title ??
    humanizeSlug(formId)
  );
}

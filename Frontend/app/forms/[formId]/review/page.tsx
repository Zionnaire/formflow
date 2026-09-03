'use client';

import { use } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MockReview } from '@/components/review/MockReview';
import { DynamicReview } from '@/components/review/DynamicReview';
import { isObjectId } from '@/lib/api';

export default function ReviewPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);

  return (
    <PageShell>
      <RequireAuth>{isObjectId(formId) ? <DynamicReview submissionId={formId} /> : <MockReview formId={formId} />}</RequireAuth>
    </PageShell>
  );
}

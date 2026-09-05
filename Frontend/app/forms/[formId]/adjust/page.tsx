'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { FieldPositionEditor } from '@/components/editor/FieldPositionEditor';

export default function FieldPositionPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);

  return (
    <RequireAuth>
      <FieldPositionEditor submissionId={formId} />
    </RequireAuth>
  );
}

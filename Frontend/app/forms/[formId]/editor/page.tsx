'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MockFormEditor } from '@/components/editor/MockFormEditor';
import { DynamicFormEditor } from '@/components/editor/DynamicFormEditor';
import { isObjectId } from '@/lib/api';

export default function FormEditorPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);

  return <RequireAuth>{isObjectId(formId) ? <DynamicFormEditor submissionId={formId} /> : <MockFormEditor formId={formId} />}</RequireAuth>;
}

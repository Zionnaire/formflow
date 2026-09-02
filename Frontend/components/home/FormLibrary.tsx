'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { TemplateCard } from '@/components/forms/TemplateCard';
import { formTemplates } from '@/lib/mock-data';

export function FormLibrary() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return formTemplates;
    return formTemplates.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [search]);

  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-sm mb-sm">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-background mb-xs">Form Library</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Popular templates used by your peers.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-surface-container-low border border-outline-variant rounded pl-10 pr-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-on-surface-variant/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md py-lg text-center">
          No templates match &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </section>
  );
}

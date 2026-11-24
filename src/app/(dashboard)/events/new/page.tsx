'use client';

import { EventForm } from '@/components/events/event-form';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';

export default function NewEventPage() {
  const { terms } = useWorkspaceConfig();
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{terms.newProjectCta}</h1>
      <p className="text-muted-foreground mb-8">
        Completa los datos para crear un nuevo registro en {terms.projectPlural.toLowerCase()}.
      </p>
      <EventForm />
    </div>
  );
}

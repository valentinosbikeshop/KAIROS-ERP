import Link from 'next/link';
import { Calendar, MapPin, Building2, Trash2, Copy, Loader2, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/constants';
import { cn, formatDateCL } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onDuplicate?: (id: string, e: React.MouseEvent) => void;
  duplicating?: boolean;
  canDuplicate?: boolean;
  projectSingular?: string;
  isDemo?: boolean;
}

export function EventCard({
  event,
  onDelete,
  onDuplicate,
  duplicating,
  canDuplicate = true,
  projectSingular = 'Proyecto',
}: EventCardProps) {
  const statusColor = EVENT_STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-800';
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status;

  const formattedDate = event.event_date
    ? formatDateCL(event.event_date, { long: true })
    : 'Fecha por definir';

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full animate-in fade-in duration-300 flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold line-clamp-2">{event.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-2 text-sm">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{event.client_company || 'Sin cliente'}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onDuplicate && (
                <button
                  type="button"
                  disabled={duplicating}
                  onClick={(e) => onDuplicate(event.id, e)}
                  className={cn(
                    'p-2 rounded-md transition-colors disabled:opacity-50',
                    canDuplicate
                      ? 'text-muted-foreground hover:text-[#1261E0] hover:bg-[#1261E0]/10'
                      : 'text-amber-600/80 hover:bg-amber-50'
                  )}
                  title={
                    canDuplicate
                      ? `Duplicar ${projectSingular.toLowerCase()} en 1 clic`
                      : 'Cupo de plan alcanzado — actualice para duplicar'
                  }
                  aria-label={`Duplicar ${projectSingular.toLowerCase()}`}
                >
                  {duplicating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : canDuplicate ? (
                    <Copy className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </button>
              )}
              {event.status === 'planning' && !event.is_demo_base && onDelete && (
                <button
                  type="button"
                  onClick={(e) => onDelete(event.id, e)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  title="Mover a papelera"
                  aria-label="Mover a papelera"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{event.location || 'Ubicación por definir'}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('border-none', statusColor)}>
              {statusLabel}
            </Badge>
            {event.project_type && (
              <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 border-slate-200">
                {event.project_type}
              </Badge>
            )}
            {event.base_quantity && event.base_quantity > 0 && (
              <Badge variant="outline" className="text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200">
                Base: {event.base_quantity}
              </Badge>
            )}
            {event.is_demo_base && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px]">
                Ejemplo Base
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { cn, formatCLP, formatDateCL, getMonthName, parseDateSafe } from '@/lib/utils';
import { EVENT_STATUS_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Event, EventItem } from '@/types/database';

interface ResourceCalendarProps {
  events: (Event & { event_items?: EventItem[] })[];
  projectPluralLabel?: string;
}

export interface DateConflict {
  date: string;
  events: (Event & { event_items?: EventItem[] })[];
  overlappingResources: string[];
}

export function detectScheduleConflicts(
  events: (Event & { event_items?: EventItem[] })[]
): DateConflict[] {
  const byDate = new Map<string, (Event & { event_items?: EventItem[] })[]>();

  events.forEach((ev) => {
    if (ev.deleted_at || ev.quote_status === 'rejected' || !ev.event_date) return;
    if (ev.status !== 'planning' && ev.status !== 'approved') return;
    const cleanDate = String(ev.event_date).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return;
    const list = byDate.get(cleanDate) || [];
    list.push(ev);
    byDate.set(cleanDate, list);
  });

  const conflicts: DateConflict[] = [];
  byDate.forEach((dayEvents, date) => {
    if (dayEvents.length < 2) return;

    const serviceCounts = new Map<string, { label: string; count: number }>();
    dayEvents.forEach((ev) => {
      const seenInEvent = new Set<string>();
      (ev.event_items || []).forEach((item) => {
        if (
          !item.approved ||
          item.tipo_evento === 'ABONO_CLIENTE' ||
          item.tipo_evento === 'GASTO_REAL' ||
          item.servicio === 'ABONO_CLIENTE' ||
          item.servicio === 'GASTO_REAL' ||
          item.es_insumo
        ) {
          return;
        }
        const norm = item.servicio.trim().toLowerCase();
        if (!norm || seenInEvent.has(norm)) return;
        seenInEvent.add(norm);
        const cur = serviceCounts.get(norm);
        serviceCounts.set(norm, {
          label: item.servicio.trim(),
          count: (cur?.count || 0) + 1,
        });
      });
    });

    const overlappingResources: string[] = [];
    serviceCounts.forEach((v) => {
      if (v.count >= 2) overlappingResources.push(v.label);
    });

    conflicts.push({
      date,
      events: dayEvents,
      overlappingResources,
    });
  });

  return conflicts.sort((a, b) => a.date.localeCompare(b.date));
}

export function ResourceCalendar({
  events,
  projectPluralLabel = 'Proyectos',
}: ResourceCalendarProps) {
  const activeEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          !e.deleted_at &&
          e.quote_status !== 'rejected' &&
          Boolean(e.event_date)
      ),
    [events]
  );

  const initialAnchor = useMemo(() => {
    const upcoming = activeEvents
      .filter((e) => e.status === 'approved' || e.status === 'planning')
      .map((e) => parseDateSafe(e.event_date || ''))
      .filter((d) => d.year > 0 && d.month > 0)
      .sort((a, b) => a.year - b.year || a.month - b.month);
    if (upcoming.length > 0) {
      return { year: upcoming[0].year, month: upcoming[0].month };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [activeEvents]);

  const [cursorYear, setCursorYear] = useState(initialAnchor.year);
  const [cursorMonth, setCursorMonth] = useState(initialAnchor.month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const conflicts = useMemo(() => detectScheduleConflicts(activeEvents), [activeEvents]);
  const conflictMap = useMemo(() => {
    const m = new Map<string, DateConflict>();
    conflicts.forEach((c) => m.set(c.date, c));
    return m;
  }, [conflicts]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, (Event & { event_items?: EventItem[] })[]>();
    activeEvents.forEach((ev) => {
      const cleanDate = String(ev.event_date || '').trim().slice(0, 10);
      if (!cleanDate) return;
      const list = m.get(cleanDate) || [];
      list.push(ev);
      m.set(cleanDate, list);
    });
    return m;
  }, [activeEvents]);

  const monthCells = useMemo(() => {
    const firstDay = new Date(cursorYear, cursorMonth - 1, 1, 12, 0, 0);
    // Mon = 0 .. Sun = 6
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(cursorYear, cursorMonth, 0).getDate();
    const cells: ({ day: number; dateStr: string } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${cursorYear}-${String(cursorMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [cursorYear, cursorMonth]);

  const monthEventsList = useMemo(() => {
    const prefix = `${cursorYear}-${String(cursorMonth).padStart(2, '0')}-`;
    return activeEvents
      .filter((e) => String(e.event_date || '').startsWith(prefix))
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
  }, [activeEvents, cursorYear, cursorMonth]);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursorYear, cursorMonth - 1 + delta, 1, 12, 0, 0);
    setCursorYear(d.getFullYear());
    setCursorMonth(d.getMonth() + 1);
    setSelectedDate(null);
  };

  const selectedDayEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      <Card
        className={cn(
          'border shadow-2xs',
          conflicts.length > 0 ? 'border-amber-300 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/50'
        )}
      >
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {conflicts.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {conflicts.length > 0
                    ? `${conflicts.length} fecha(s) con tope de agenda o recursos simultáneos detectados`
                    : 'Sin topes de agenda ni choque de equipos/personal en fechas activas'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Analiza automáticamente {projectPluralLabel.toLowerCase()} activos (Planificación y Aprobados) que coinciden en la misma fecha o comparten partidas/personal.
                </p>
              </div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {conflicts.map((conflict) => (
                <button
                  key={conflict.date}
                  type="button"
                  onClick={() => {
                    const p = parseDateSafe(conflict.date);
                    if (p.year && p.month) {
                      setCursorYear(p.year);
                      setCursorMonth(p.month);
                    }
                    setSelectedDate(conflict.date);
                  }}
                  className="text-left rounded-xl border border-amber-300/80 bg-white/90 p-3 hover:bg-white transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900">
                      {formatDateCL(conflict.date, { long: true })}
                    </span>
                    <Badge variant="outline" className="border-amber-400 text-amber-900 text-[10px]">
                      {conflict.events.length} simultáneos
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 truncate">
                    {conflict.events.map((e) => e.name).join(' · ')}
                  </p>
                  {conflict.overlappingResources.length > 0 && (
                    <p className="text-[11px] text-rose-700 font-medium mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      Recurso compartido: {conflict.overlappingResources.slice(0, 3).join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Controls */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Agenda Operativa · {getMonthName(cursorMonth)} {cursorYear}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCursorYear(now.getFullYear());
                setCursorMonth(now.getMonth() + 1);
                setSelectedDate(null);
              }}
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Desktop Monthly Grid */}
          <div className="hidden md:grid grid-cols-7 gap-1.5">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-1.5"
              >
                {d}
              </div>
            ))}

            {monthCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="min-h-24 rounded-lg bg-muted/20" />;
              }
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const conflict = conflictMap.get(cell.dateStr);
              const isSelected = selectedDate === cell.dateStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={cn(
                    'min-h-24 rounded-xl border p-2 text-left flex flex-col gap-1 transition-all',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : conflict
                      ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-50'
                      : 'border-border/60 bg-card hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{cell.day}</span>
                    {conflict && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-1 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded truncate font-medium',
                          ev.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-900'
                        )}
                      >
                        {ev.name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-muted-foreground font-medium pl-1">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile Agenda List */}
          <div className="md:hidden space-y-2.5">
            {monthEventsList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sin {projectPluralLabel.toLowerCase()} agendados para {getMonthName(cursorMonth)} {cursorYear}.
              </p>
            ) : (
              monthEventsList.map((ev) => {
                const dateKey = String(ev.event_date || '').slice(0, 10);
                const conflict = conflictMap.get(dateKey);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className={cn(
                      'block rounded-xl border p-3 space-y-1',
                      conflict ? 'border-amber-300 bg-amber-50/50' : 'bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-primary">
                        {formatDateCL(dateKey)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {EVENT_STATUS_LABELS[ev.status] || ev.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">{ev.name}</p>
                    {ev.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </p>
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Selected Day Detail Drawer */}
          {selectedDate && (
            <div className="rounded-xl border border-primary/20 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  Programación del {formatDateCL(selectedDate, { long: true })}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  Cerrar
                </Button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay {projectPluralLabel.toLowerCase()} programados para esta fecha. Día disponible.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDayEvents.map((ev) => {
                    const revenue = (ev.event_items || [])
                      .filter(
                        (i) =>
                          i.approved &&
                          !i.parent_id &&
                          i.tipo_evento !== 'ABONO_CLIENTE' &&
                          i.tipo_evento !== 'GASTO_REAL' &&
                          i.servicio !== 'ABONO_CLIENTE' &&
                          i.servicio !== 'GASTO_REAL' &&
                          !i.es_insumo
                      )
                      .reduce((s, i) => s + Number(i.valor_total || 0) * (Number(i.cantidad) || 1), 0);

                    return (
                      <div
                        key={ev.id}
                        className="rounded-lg border bg-background p-3 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{ev.name}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {EVENT_STATUS_LABELS[ev.status] || ev.status}
                            </Badge>
                          </div>
                          {ev.client_company && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ev.client_company}
                            </p>
                          )}
                          <p className="text-xs font-mono font-semibold text-primary">
                            {formatCLP(revenue)}
                          </p>
                        </div>
                        <Link href={`/events/${ev.id}`}>
                          <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0">
                            Ver
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

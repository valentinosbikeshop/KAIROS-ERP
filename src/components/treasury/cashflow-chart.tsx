'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCLP } from '@/lib/utils';

export interface CashflowBucket {
  bucket: string;
  cobrosPendientes: number;
  egresosPendientes: number;
  flujoNeto: number;
}

export function CashflowChart({ data }: { data: CashflowBucket[] }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Proyección de Flujo de Caja (Horizonte 30 / 60 / 90 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 16, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                tickFormatter={(value) => formatCLP(value)}
                tickLine={false}
                axisLine={false}
                width={84}
                className="text-xs font-mono text-muted-foreground"
              />
              <Tooltip
                formatter={(value: any) => [formatCLP(Number(value || 0)), undefined]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid rgba(203, 213, 225, 0.85)',
                  background: 'rgba(255, 255, 255, 0.96)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar
                dataKey="cobrosPendientes"
                name="Por Cobrar (CxC)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="egresosPendientes"
                name="Costos Proyectados"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="flujoNeto"
                name="Flujo Neto Estimado"
                fill="#4A607A"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

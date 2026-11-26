'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MonthlyData } from '@/types';
import { formatCLP } from '@/lib/utils';

export function RevenueChart({ data }: { data: MonthlyData[] }) {
  return (
    <Card className="h-full glass-card animate-reveal-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          Evolución Mensual (ex-IVA): Ventas vs Costos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 24, left: 16, bottom: 5 }}>
              <defs>
                <linearGradient id="figuraSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A607A" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#4A607A" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="figuraCostsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9E4A47" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#9E4A47" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
              <XAxis
                dataKey="month"
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
                formatter={(value: any) => [formatCLP(value || 0), undefined]}
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid rgba(203, 213, 225, 0.75)',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 12px 28px -10px rgba(10, 17, 31, 0.14)',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                name="Ventas Netas"
                dataKey="ventas"
                stroke="#4A607A"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#figuraSalesGrad)"
                dot={{ r: 3.5, fill: '#4A607A', strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                name="Costos Netos"
                dataKey="costos"
                stroke="#9E4A47"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#figuraCostsGrad)"
                dot={{ r: 3.5, fill: '#9E4A47', strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

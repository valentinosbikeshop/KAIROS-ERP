'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CostCategory } from '@/types';
import { formatCLP, formatPercentage } from '@/lib/utils';

const COLORS = ['#1261E0', '#0D8A72', '#0284C7', '#43536B', '#38BDF8', '#14B8A6'];

export function CostDistribution({ data }: { data: CostCategory[] }) {
  return (
    <Card className="h-full glass-card animate-reveal-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          Distribución de Costos por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={104}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                animationBegin={100}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any, props: any) => [
                  `${formatCLP(value || 0)} (${formatPercentage(props.payload.percentage)})`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid rgba(203, 213, 225, 0.75)',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 12px 28px -10px rgba(10, 17, 31, 0.14)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

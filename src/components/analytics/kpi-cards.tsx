import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AnimatedNumber, SpotlightCard } from '@/components/ui/motion-primitives';
import { TrendingUp, DollarSign, Receipt, PiggyBank, BarChart3, Calculator } from 'lucide-react';
import { FinancialSummary } from '@/types';

export function KpiCards({ data }: { data: FinancialSummary }) {
  const cards: Array<{
    title: string;
    value: number;
    format: 'clp' | 'percent';
    icon: typeof DollarSign;
    color: string;
    bgColor: string;
  }> = [
    {
      title: 'Ingresos Totales Brutos',
      value: data.totalIngresosBrutos,
      format: 'clp',
      icon: DollarSign,
      color: 'text-[#0D8A72]',
      bgColor: 'bg-[#0D8A72]/10',
    },
    {
      title: 'Facturación Neta',
      value: data.facturacionNeta,
      format: 'clp',
      icon: Receipt,
      color: 'text-[#1261E0]',
      bgColor: 'bg-[#1261E0]/10',
    },
    {
      title: 'Costos Operativos',
      value: data.costosOperativos,
      format: 'clp',
      icon: Calculator,
      color: 'text-[#B9382C]',
      bgColor: 'bg-[#B9382C]/10',
    },
    {
      title: 'Utilidad Neta',
      value: data.utilidadNeta,
      format: 'clp',
      icon: PiggyBank,
      color: 'text-[#0D8A72]',
      bgColor: 'bg-[#0D8A72]/10',
    },
    {
      title: 'Margen Promedio',
      value: data.margenPromedio,
      format: 'percent',
      icon: BarChart3,
      color: 'text-[#0284C7]',
      bgColor: 'bg-[#0284C7]/10',
    },
    {
      title: 'IVA Débito Fiscal',
      value: data.ivaDebitoFiscal,
      format: 'clp',
      icon: TrendingUp,
      color: 'text-[#43536B]',
      bgColor: 'bg-[#43536B]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <SpotlightCard
          key={index}
          className="animate-reveal-up opacity-0"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-xl ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums text-foreground">
              <AnimatedNumber value={card.value} format={card.format} duration={650} />
            </div>
          </CardContent>
        </SpotlightCard>
      ))}
    </div>
  );
}

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
      color: 'text-[#467366]',
      bgColor: 'bg-[#467366]/12',
    },
    {
      title: 'Facturación Neta',
      value: data.facturacionNeta,
      format: 'clp',
      icon: Receipt,
      color: 'text-[#4A607A]',
      bgColor: 'bg-[#4A607A]/12',
    },
    {
      title: 'Costos Operativos',
      value: data.costosOperativos,
      format: 'clp',
      icon: Calculator,
      color: 'text-[#9E4A47]',
      bgColor: 'bg-[#9E4A47]/12',
    },
    {
      title: 'Utilidad Neta',
      value: data.utilidadNeta,
      format: 'clp',
      icon: PiggyBank,
      color: 'text-[#467366]',
      bgColor: 'bg-[#467366]/12',
    },
    {
      title: 'Margen Promedio',
      value: data.margenPromedio,
      format: 'percent',
      icon: BarChart3,
      color: 'text-[#4A607A]',
      bgColor: 'bg-[#4A607A]/12',
    },
    {
      title: 'IVA Débito Fiscal',
      value: data.ivaDebitoFiscal,
      format: 'clp',
      icon: TrendingUp,
      color: 'text-[#5A6D82]',
      bgColor: 'bg-[#5A6D82]/12',
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

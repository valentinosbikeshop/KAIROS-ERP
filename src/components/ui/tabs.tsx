'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType>({ value: '', onValueChange: () => {} });

function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
  const value = controlledValue ?? uncontrolledValue;
  const handleChange = onValueChange ?? setUncontrolledValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl p-1.5 border border-slate-200/80 text-muted-foreground shadow-sm',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, value, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  const isSelected = context.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-foreground hover:bg-white/70',
        isSelected && 'bg-white/95 text-foreground shadow-sm border border-slate-200/80 backdrop-blur-md',
        className
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  );
}


function TabsContent({ className, value, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (context.value !== value) return null;
  return (
    <div
      className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

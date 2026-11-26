'use client';

import { useState, useRef } from 'react';
import { Upload, File, X, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { canUseAi, requiredPlanForModule } from '@/lib/plan-guards';

interface FileUploadProps {
  onParsed: (text: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onParsed, disabled }: FileUploadProps) {
  const { entitlements, plans, isDuoExempt } = useWorkspaceConfig();
  const aiCheck = canUseAi(entitlements);
  const aiAllowed = isDuoExempt || aiCheck.allowed;
  const aiPlan = requiredPlanForModule('mod_ai_suite', plans);
  const effectiveDisabled = Boolean(disabled) || !aiAllowed;

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!effectiveDisabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (selectedFile: File) => {
    if (!aiAllowed) {
      setError(
        aiCheck.reason ||
          `La lectura documental IA/OCR está disponible desde ${aiPlan.name}.`
      );
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 403 || res.status === 402) {
          throw new Error(
            errBody.error ||
              `Acceso bloqueado (${res.status}). Requiere ${aiPlan.name} o créditos IA disponibles.`
          );
        }
        throw new Error(errBody.error || `Error al procesar el archivo (HTTP ${res.status})`);
      }

      const data = await res.json();
      onParsed(data.text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (effectiveDisabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      await processFile(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      await processFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      {!aiAllowed ? (
        <div className="border-2 border-dashed border-amber-300/80 rounded-lg p-6 text-center bg-amber-50/50 space-y-2">
          <Lock className="w-7 h-7 text-amber-600 mx-auto" />
          <p className="font-medium text-xs text-amber-950">
            Lectura OCR de PDF, Excel e Imágenes bloqueada
          </p>
          <p className="text-[11px] text-amber-900/80">
            {aiCheck.reason ||
              `Disponible desde ${aiPlan.name} ($${aiPlan.price_clp.toLocaleString('es-CL')}/mes).`}
          </p>
        </div>
      ) : !file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50',
            effectiveDisabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !effectiveDisabled && fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Haga clic o arrastre un archivo aquí</p>
            <p className="text-xs text-muted-foreground mt-1">
              Soporta Imágenes, PDF, Excel, CSV (Máx. 10MB)
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            onChange={handleFileChange}
            disabled={effectiveDisabled}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary/10 rounded text-primary shrink-0">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <File className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!loading && (
            <Button variant="ghost" size="icon" onClick={clearFile} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive mt-2">
          {error}
        </p>
      )}
    </div>
  );
}

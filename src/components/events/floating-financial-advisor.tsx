'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, FileUp, Sparkles, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventItem } from '@/types';
import { useUser } from '@/hooks/use-user';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/events/file-upload';
import { FormattedChatText } from '@/components/ui/formatted-chat-text';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface FloatingFinancialAdvisorProps {
  event: Event;
  items: EventItem[];
}

export function FloatingFinancialAdvisor({ event, items }: FloatingFinancialAdvisorProps) {
  const { organization } = useUser();
  const { industry } = useWorkspaceConfig();
  const orgName = organization?.name || 'FIGURA';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Asesor Financiero IA de ${orgName} (${industry.shortName}). Analizamos el presupuesto de **${event.name}** con **${items.length}** partidas aprobadas. ¿Qué aspecto de costos, IVA o margen desea revisar?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedText, setParsedText] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen]);

  const handleSendMessage = async (textToSend: string, textFile: string) => {
    if (!textToSend.trim() && !textFile) return;

    const userMessageContent =
      textToSend.trim() +
      (textFile ? `\n[Archivo adjunto]: ${textFile.substring(0, 500)}...` : '');

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessageContent },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setParsedText('');
    setShowFileUploader(false);

    try {
      const response = await fetch('/api/ai/financial-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          eventData: {
            name: event.name,
            description: event.description,
            status: event.status,
            client: event.client_company,
            date: event.event_date,
          },
          approvedItems: items,
          filesText: textFile,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error: any) {
      console.error('Error in AI Advisor:', error);
      const errMsg =
        error instanceof Error && error.message && !error.message.startsWith('Error HTTP:')
          ? error.message
          : 'No se pudo completar el análisis en este momento. Intente nuevamente.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendMessage(input, parsedText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion, parsedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Asesor Financiero IA de ${orgName} (${industry.shortName}). Analizamos el presupuesto de **${event.name}** con **${items.length}** partidas aprobadas. ¿Qué aspecto de costos, IVA o margen desea revisar?`,
      },
    ]);
    setParsedText('');
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Asesor Financiero"
          aria-expanded={isOpen}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg transition-all duration-300 relative',
            isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-105',
            'bg-[#4A607A] hover:bg-[#3F536B] text-white border border-white/40'
          )}
        >
          <Sparkles className="h-5 w-5 text-white/90 absolute top-3 right-3 opacity-80" />
          <Bot className="h-6 w-6 text-white" />
        </Button>
      </div>

      <div
        role="dialog"
        aria-modal="false"
        aria-label="Asesor Financiero IA"
        className={cn(
          'fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] transition-all duration-300 origin-bottom-right',
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 pointer-events-none translate-y-8'
        )}
      >
        <div className="flex flex-col glass-luxury shadow-2xl rounded-2xl overflow-hidden h-[600px] max-h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between p-4 bg-white/85 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#4A607A]/12 border border-[#4A607A]/25">
                <Bot className="h-5 w-5 text-[#4A607A]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  Asesor Financiero
                  <span className="flex h-2 w-2 rounded-full bg-[#467366]"></span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Analista CFO · {industry.shortName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
                onClick={clearChat}
                title="Limpiar Chat"
                aria-label="Limpiar Chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar Asesor Financiero (Esc)"
                title="Cerrar (Esc)"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex max-w-[85%] text-sm',
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                )}
              >
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-muted/60 border border-border/50 text-foreground rounded-tl-sm backdrop-blur-md'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <FormattedChatText content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-2 mt-2 px-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs font-normal border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() =>
                    handleSuggestionClick(
                      'Realice un análisis exhaustivo de las partidas aprobadas, con recomendaciones para proteger el margen neto.'
                    )
                  }
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 shrink-0" />
                  Análisis exhaustivo de margen y costos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs font-normal border-border text-muted-foreground hover:text-foreground rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() =>
                    handleSuggestionClick('¿Dónde detecta oportunidad de mejorar el margen neto?')
                  }
                >
                  ¿Dónde mejorar el margen neto?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs font-normal border-border text-muted-foreground hover:text-foreground rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() =>
                    handleSuggestionClick(
                      `¿Falta algún costo operativo, traslado o retención típica de ${industry.shortName}?`
                    )
                  }
                >
                  ¿Falta algún costo operativo o logístico?
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex max-w-[85%] mr-auto justify-start text-sm">
                <div className="px-4 py-3 rounded-2xl bg-muted/60 border border-border/50 rounded-tl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {(parsedText || showFileUploader) && (
            <div className="px-4 py-2 bg-muted/30 border-t border-border/30 text-xs">
              {showFileUploader ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 z-10 rounded-full bg-background border shadow-sm"
                    onClick={() => setShowFileUploader(false)}
                    aria-label="Cerrar carga"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <FileUpload
                    onParsed={(text) => {
                      setParsedText((prev) => (prev ? prev + '\n' + text : text));
                      setShowFileUploader(false);
                    }}
                  />
                </div>
              ) : parsedText ? (
                <div className="flex items-center justify-between text-primary bg-primary/5 px-2 py-1.5 rounded border border-primary/20">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Documento adjunto listo ({parsedText.length} chars)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => setParsedText('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <div className="p-3 bg-background/80 backdrop-blur-sm border-t border-border/40">
            <div className="relative flex items-end gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setShowFileUploader(!showFileUploader)}
                title="Adjuntar cotización o documento"
                aria-label="Adjuntar documento"
              >
                <FileUp className="h-4.5 w-4.5" />
              </Button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Consulte sobre costos, márgenes o flujo SII..."
                className="w-full max-h-32 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none py-2 px-1 text-sm custom-scrollbar"
                rows={1}
              />

              <Button
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl bg-primary shadow-sm hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={(!input.trim() && !parsedText) || isLoading}
                aria-label="Enviar consulta"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

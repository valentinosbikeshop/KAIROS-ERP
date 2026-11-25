'use client';

import React from 'react';

function renderInlineTokens(text: string): React.ReactNode[] {
  // Match **bold**, `code`, or *italic* without leaving raw asterisks
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-200/70 text-[12px] font-medium text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    // Strip any stray lone markdown asterisks
    return <React.Fragment key={idx}>{part.replace(/\*\*/g, '')}</React.Fragment>;
  });
}

export function FormattedChatText({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((rawLine, lineIdx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" aria-hidden="true" />;
        }

        const bulletMatch = line.match(/^\s*(?:•|-|\*)\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-0.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-60 shrink-0" />
              <span className="flex-1">{renderInlineTokens(bulletMatch[1])}</span>
            </div>
          );
        }

        const headingMatch = line.match(/^#{1,3}\s+(.*)$/);
        if (headingMatch) {
          return (
            <div key={lineIdx} className="font-semibold text-foreground pt-0.5">
              {renderInlineTokens(headingMatch[1])}
            </div>
          );
        }

        return <p key={lineIdx}>{renderInlineTokens(line)}</p>;
      })}
    </div>
  );
}

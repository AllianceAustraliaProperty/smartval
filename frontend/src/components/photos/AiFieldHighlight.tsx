import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiFieldHighlightProps {
  isAiSuggested: boolean;
  children: React.ReactNode;
}

export const AiFieldHighlight: React.FC<AiFieldHighlightProps> = ({ isAiSuggested, children }) => {
  if (!isAiSuggested) {
    return <>{children}</>;
  }

  return (
    <div className="relative group rounded-md border border-purple-200 bg-purple-50/30 p-1 transition-all">
      {children}
      <div 
        className="absolute -right-2 -top-2 flex items-center justify-center w-5 h-5 bg-purple-100 rounded-full text-purple-600 shadow-sm"
        title="AI suggested this value"
      >
        <Sparkles size={12} />
      </div>
    </div>
  );
};

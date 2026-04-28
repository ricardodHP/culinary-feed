import { useState, useEffect } from "react";
import { Bot, X } from "lucide-react";

interface Props {
  onClick: () => void;
}

const AssistantFloatingButton = ({ onClick }: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) setShowTooltip(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[104px] right-6 z-[55] flex items-center gap-2">
      {showTooltip && (
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1.5 shadow-elevated animate-fade-in">
          <span className="text-sm text-foreground whitespace-nowrap">¿Te ayudo a elegir?</span>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button
        onClick={onClick}
        className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground shadow-elevated flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95 border border-border shrink-0"
      >
        <Bot className="w-5 h-5" />
      </button>
    </div>
  );
};

export default AssistantFloatingButton;

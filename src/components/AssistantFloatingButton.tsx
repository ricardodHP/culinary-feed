import { useState, useEffect } from "react";
import { Bot, X } from "lucide-react";

interface Props {
  onClick: () => void;
  used?: boolean;
}

const SHOW_DELAY = 3000;       // first appearance after mount
const VISIBLE_DURATION = 3000; // how long it stays visible
const REPEAT_INTERVAL = 45000; // re-appear every 45s if user hasn't used it

const AssistantFloatingButton = ({ onClick, used = false }: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Recurring appearance loop until the assistant is used or dismissed
  useEffect(() => {
    if (used || dismissed) {
      setShowTooltip(false);
      return;
    }
    const initial = setTimeout(() => setShowTooltip(true), SHOW_DELAY);
    const interval = setInterval(() => setShowTooltip(true), REPEAT_INTERVAL);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [used, dismissed]);

  // Auto-hide tooltip after it appears
  useEffect(() => {
    if (!showTooltip) return;
    const hideTimer = setTimeout(() => setShowTooltip(false), VISIBLE_DURATION);
    return () => clearTimeout(hideTimer);
  }, [showTooltip]);

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

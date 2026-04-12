import { Bot } from "lucide-react";

interface Props {
  onClick: () => void;
}

const AssistantFloatingButton = ({ onClick }: Props) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 left-6 z-[55] w-11 h-11 rounded-full bg-secondary text-secondary-foreground shadow-elevated flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95 border border-border"
  >
    <Bot className="w-5 h-5" />
  </button>
);

export default AssistantFloatingButton;

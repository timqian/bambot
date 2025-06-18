import GlassButton from "./GlassButton";
import { RiChatAiLine } from "@remixicon/react";

interface ChatControlButtonProps {
  showControlPanel: boolean;
  onToggleControlPanel: () => void;
}

export default function ChatControlButton({
  showControlPanel,
  onToggleControlPanel,
}: ChatControlButtonProps) {
  return (
    <GlassButton
      onClick={onToggleControlPanel}
      icon={<RiChatAiLine size={24} />}
      tooltip="Chat Control"
      pressed={showControlPanel}
    />
  );
}

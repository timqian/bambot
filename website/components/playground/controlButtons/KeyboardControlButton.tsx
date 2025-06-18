import GlassButton from "./GlassButton";
import { RiKeyboardFill } from "@remixicon/react";

interface KeyboardControlButtonProps {
  showControlPanel: boolean;
  onToggleControlPanel: () => void;
}

export default function KeyboardControlButton({
  showControlPanel,
  onToggleControlPanel,
}: KeyboardControlButtonProps) {
  return (
    <GlassButton
      onClick={onToggleControlPanel}
      icon={<RiKeyboardFill size={24} />}
      tooltip="Keyboard Control"
      pressed={showControlPanel}
    />
  );
}


import { RiGamepadFill } from "@remixicon/react";
import GlassButton from "./GlassButton";

type GamepadControlButtonProps = {
  showControlPanel: boolean;
  onToggleControlPanel: () => void;
}

export default function GamepadControlButton({
  showControlPanel,
  onToggleControlPanel,
}: GamepadControlButtonProps) {
  return (
    <GlassButton
      onClick={onToggleControlPanel}
      icon={<RiGamepadFill size={24} />}
      tooltip="Gamepad Control"
      pressed={showControlPanel}
    />
  );
}

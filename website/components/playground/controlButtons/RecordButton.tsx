import GlassButton from "./GlassButton";
import { RiRecordCircleLine } from "@remixicon/react";

interface RecordButtonProps {
  showControlPanel: boolean;
  onToggleControlPanel: () => void;
}

export default function RecordButton({
  showControlPanel,
  onToggleControlPanel,
}: RecordButtonProps) {
  return (
    <GlassButton
      onClick={onToggleControlPanel}
      icon={<RiRecordCircleLine size={24} />}
      tooltip="Record dataset"
      pressed={showControlPanel}
    />
  );
}

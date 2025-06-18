import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface GlassButtonProps {
  icon: ReactNode;
  tooltip: string;
  onClick?: () => void;
  pressed?: boolean;
}

export default function GlassButton({
  icon,
  tooltip,
  onClick,
  pressed = false,
}: GlassButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`inline-flex items-center justify-center align-middle select-none text-center p-2 text-white text-sm font-medium rounded-lg border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased ${
            pressed ? 'bg-white/40 shadow-inner' : ''
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        className=""
      >
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

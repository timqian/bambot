import React from "react";
import { RiKeyboardFill, RiRobot2Line } from "@remixicon/react";
import GlassButton from "./controlButtons/GlassButton"; // Assuming you have a GlassButton component

interface ControlBtnsProps {
  onMicrophoneClick?: () => void;
  onLightClick?: () => void;
  onGridClick?: () => void;
}

export default function ControlBtns({
  onMicrophoneClick,
  onLightClick,
  onGridClick,
}: ControlBtnsProps) {
  return (
    <div className="flex gap-2 max-w-md ">
      {/* Microphone Button */}
      <GlassButton
        onClick={onMicrophoneClick}
        icon={<RiKeyboardFill size={24} />}
        tooltip="Keyboard Control"
        pressed={true} // You can manage the pressed state if needed
      />
      <button
        onClick={onGridClick}
        className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center p-2 text-white text-sm font-medium rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased"
      >
        <svg
          fill="currentColor"
          height="24"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path d="m19.4697 3.46967c-.2929.29289-.2929.76777 0 1.06066s.7677.29289 1.0606 0zm3.0606-.93934c.2929-.29289.2929-.76777 0-1.06066s-.7677-.29289-1.0606 0zm-1.0606-1.06066-2 2 1.0606 1.06066 2-2z" />
            <path d="m19.4967 11.7619-.5303-.5303zm-2.9034.7258.5303-.5303zm2.1775 0 .5304.5304zm-7.2585-7.25854-.5304-.53033zm0 2.17758-.5304.53033zm.7258-2.90344.5303.53033zm-.5303-.53033-.7259.72586 1.0607 1.06066.7258-.72586zm-.7259 3.9641 5.081 5.08103 1.0607-1.0607-5.081-5.08099zm8.3193 5.08103.7258-.7259-1.0606-1.0606-.7259.7258zm.7258-.7259c2.2973-2.29728 2.2973-6.02193 0-8.31923l-1.0606 1.06066c1.7115 1.71151 1.7115 4.48642 0 6.19797zm-7.2586-7.25857c1.7116-1.71151 4.4865-1.71151 6.198 0l1.0606-1.06066c-2.2973-2.29729-6.0219-2.29729-8.3192 0zm-.7258 1.84278c-.2295-.22951-.2907-.42114-.2926-.55315-.0018-.12702.0493-.32046.2926-.56377l-1.0607-1.06066c-.4609.46092-.7406 1.02553-.7317 1.64589.0088.61535.2998 1.1604.7317 1.59235zm6.1979 5.08099c-.2295.2295-.4211.2907-.5531.2926-.1271.0018-.3205-.0493-.5638-.2926l-1.0607 1.0607c.461.4609 1.0256.7406 1.6459.7317.6154-.0088 1.1604-.2998 1.5924-.7317z" />
            <path d="m4.53033 20.5303c.29289-.2929.29289-.7677 0-1.0606s-.76777-.2929-1.06066 0zm-3.06066.9394c-.29289.2929-.29289.7677 0 1.0606s.76777.2929 1.06066 0zm2-2-2 2 1.06066 1.0606 2-2z" />
            <path d="m12.4877 16.5933-.5303.5303zm-7.25854-5.081-.53033-.5304zm2.17758 0 .53033-.5304zm-2.90344.7258.53033.5303zm.53033.5303.72586-.7258-1.06066-1.0607-.72586.7259zm1.84278-.7258 5.08099 5.081 1.0607-1.0607-5.08103-5.081zm5.08099 6.1979-.7258.7259 1.0606 1.0606.7259-.7258zm-.7258.7259c-1.71155 1.7115-4.48646 1.7115-6.19797 0l-1.06066 1.0606c2.2973 2.2973 6.02195 2.2973 8.31923 0zm-7.25863-7.2586c-2.29729 2.2973-2.29729 6.0219 0 8.3192l1.06066-1.0606c-1.71151-1.7115-1.71151-4.4864 0-6.198zm3.9641-.7259c-.43195-.4319-.977-.7229-1.59235-.7317-.62036-.0089-1.18497.2708-1.64589.7317l1.06066 1.0607c.24331-.2433.43675-.2944.56377-.2926.13201.0019.32364.0631.55315.2926zm5.08103 8.3193c.4319-.432.7229-.977.7317-1.5924.0089-.6203-.2708-1.1849-.7317-1.6459l-1.0607 1.0607c.2433.2433.2944.4367.2926.5638-.0019.132-.0631.3236-.2926.5531z" />
            <path d="m9.96967 8.96967c-.29289.29289-.29289.76777 0 1.06063.29293.2929.76773.2929 1.06063 0zm2.56063-.43934c.2929-.29289.2929-.76777 0-1.06066s-.7677-.29289-1.0606 0zm1.4394 4.43937c-.2929.2929-.2929.7677 0 1.0606s.7677.2929 1.0606 0zm2.5606-.4394c.2929-.2929.2929-.7677 0-1.0606s-.7677-.2929-1.0606 0zm-5.5-2.5 1.5-1.49997-1.0606-1.06066-1.50003 1.5zm4 4 1.5-1.5-1.0606-1.0606-1.5 1.5z" />
          </g>
        </svg>
      </button>
      {/* Light Button */}
      <button
        onClick={onLightClick}
        className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center p-2 text-white text-sm font-medium rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased"
      >
        <RiRobot2Line size={24} />
      </button>

      {/* Grid Button */}
      <button
        onClick={onGridClick}
        className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center p-2 text-white text-sm font-medium rounded-lg bg-white/2.5 border border-white/50 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.75),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/60 before:via-transparent before:to-transparent before:opacity-70 before:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-tl after:from-white/30 after:via-transparent after:to-transparent after:opacity-50 after:pointer-events-none transition antialiased"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5"
        >
          <path
            fillRule="evenodd"
            d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3V6ZM3 15.75a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2.25Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-2.25Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

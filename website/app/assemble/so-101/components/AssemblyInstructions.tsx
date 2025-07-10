import { RiLink } from "@remixicon/react";
import { useLocale } from "./LocaleContext";

export default function AssemblyInstructions() {
  const { t } = useLocale();
  return (
    <section className="scroll-mt-32">
      <h2
        id="assembly"
        className="group text-3xl font-bold text-white mb-6 scroll-mt-32"
      >
        {t.assembly}
      </h2>

      <div className="prose max-w-none">
        <p className="text-lg text-zinc-300 mb-4">
          {t.stepByStep}{" "}
          <a
            href="https://huggingface.co/docs/lerobot/so101#step-by-step-assembly-instructions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {t.lerobotDocumentation}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

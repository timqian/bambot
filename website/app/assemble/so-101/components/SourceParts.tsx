import { RiLink } from "@remixicon/react";
import { useLocale } from "./LocaleContext";

export default function SourceParts() {
  const { t } = useLocale();
  return (
    <section className="scroll-mt-32">
      <h2
        id="source"
        className="group text-3xl font-bold text-white mb-6 scroll-mt-32"
      >
        <a href="#source" className="flex items-center">
          {t.sourceTheParts}
          <RiLink className="w-5 h-5 ml-2 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </h2>
      <div className="prose max-w-none">
        <p className="text-lg text-zinc-300 mb-4">
          {t.followThe}{" "}
          <a
            href="https://github.com/TheRobotStudio/SO-ARM100"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            SO-ARM100 README
          </a>{" "}
          {t.sourceReadme}
        </p>
        {/* <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">
            Install LeRobot 🤗
          </h3>
          <p className="text-blue-300 mb-3">
            Follow our Installation Guide, then install the Feetech SDK:
          </p>
          <code className="block bg-zinc-950 text-green-400 p-3 rounded text-sm">
            pip install -e ".[feetech]"
          </code>
        </div> */}
      </div>
    </section>
  );
}

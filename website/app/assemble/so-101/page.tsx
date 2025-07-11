"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SourceParts from "./components/SourceParts";
import AssemblyInstructions from "./components/AssemblyInstructions";
import ConfigureMotors from "./components/ConfigureMotors";
import Calibrate from "./components/Calibrate";
import GlassButton from "../../../components/playground/controlButtons/GlassButton";
import { RiMenu2Line } from "@remixicon/react";
import { LocaleProvider, useLocale } from "./components/LocaleContext";

function SO101AssemblyContent() {
  const { locale, setLocale, t } = useLocale();
  const [activeSection, setActiveSection] = useState("source");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sections = [
    { id: "source", title: t.source },
    { id: "assembly", title: t.assembly },
    { id: "configure", title: t.configure },
    { id: "calibrate", title: t.calibrate },
  ];

  useEffect(() => {
    // Auto-open sidebar on desktop
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Handle initial hash
    const hash = window.location.hash.slice(1);
    if (hash && sections.find((s) => s.id === hash)) {
      setActiveSection(hash);
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }

    // Handle hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sections.find((s) => s.id === hash)) {
        setActiveSection(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    // Scroll spy with IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is intersecting and is closest to the top
        const intersectingEntry = entries.find((entry) => entry.isIntersecting);

        if (intersectingEntry) {
          const newActiveSection = intersectingEntry.target.id;
          // Check if active section is already correct to avoid loop
          if (activeSection !== newActiveSection) {
            setActiveSection(newActiveSection);
            // Update hash without triggering scroll, only if not already correct
            if (window.location.hash !== `#${newActiveSection}`) {
              history.replaceState(null, "", `#${newActiveSection}`);
            }
          }
        }
      },
      {
        // This rootMargin creates a "scan line" 20% from the top of the viewport.
        // When a section's h2 crosses this line, it becomes active.
        rootMargin: "-20% 0px -80% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("hashchange", handleHashChange);
      sections.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) observer.unobserve(element);
      });
    };
  }, [activeSection]); // Add activeSection to dependencies

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <div className="fixed top-20 left-5 sm:left-10 z-50">
          <GlassButton
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            icon={<RiMenu2Line className="w-5 h-5" />}
            tooltip={t.openNavigation}
            pressed={isSidebarOpen}
          />
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Unified Sidebar Navigation */}
      <nav
        className={`fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-zinc-800/95 backdrop-blur-sm rounded-tr-xl border-t border-r border-zinc-700 p-6 z-40 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">{t.steps}</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-2 flex-grow overflow-y-auto">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => {
                scrollToSection(section.id);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                activeSection === section.id
                  ? "bg-blue-600 text-white"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-700"
              }`}
            >
              <div className="flex items-start space-x-3">
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    activeSection === section.id
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-600 text-zinc-300"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <div className="font-medium text-sm">{section.title}</div>
                  {/* <div className="text-xs opacity-75 mt-1">
                    {index === 0 && "Get parts & install SDK"}
                    {index === 1 && "Build the robot step-by-step"}
                    {index === 2 && "Setup motor IDs & ports"}
                    {index === 3 && "Align leader & follower"}
                  </div> */}
                </div>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : ""
        }`}
      >
        {/* Header */}
        <div className="relative max-w-4xl mx-auto px-5 sm:px-10 pt-20 pb-8">
          <div className="absolute top-20 right-5 sm:right-10">
            {/* <div className="flex items-center space-x-2 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
              <button
                onClick={() => setLocale("en")}
                className={`px-3 py-1 text-sm rounded-md ${
                  locale === "en"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLocale("zh")}
                className={`px-3 py-1 text-sm rounded-md ${
                  locale === "zh"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                中文
              </button>
            </div> */}
                        <select
              value={locale}
              onChange={(e) =>
                setLocale(e.target.value as "en" | "zh")
              }
              className="px-3 py-1 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>


          <h1 className="text-4xl font-bold text-white mb-2 pt-16 lg:pt-0">
            {t.assembleTitle}
          </h1>
          <p className="text-zinc-400">{t.assembleDescription}</p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-5 sm:px-10 pb-8 space-y-16">
          <SourceParts />
          <AssemblyInstructions />
          <ConfigureMotors />
          <Calibrate />
        </div>
      </div>
    </div>
  );
}

function SO101AssemblyPageWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const getInitialLocale = () => {
    const lang = searchParams.get("lang");
    if (lang === "zh") return "zh";
    return "en";
  };

  const [locale, setLocaleState] = useState<"en" | "zh">(getInitialLocale());

  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, [searchParams]);

  const handleSetLocale = (newLocale: "en" | "zh") => {
    setLocaleState(newLocale);
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", newLocale);
    router.push(`?${params.toString()}`);
  };

  return (
    <LocaleProvider value={[locale, handleSetLocale as any]}>
      <SO101AssemblyContent />
    </LocaleProvider>
  );
}

export default function SO101AssemblyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SO101AssemblyPageWrapper />
    </Suspense>
  );
}

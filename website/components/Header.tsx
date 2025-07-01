"use client";
import Script from "next/script";
import Link from "next/link";
import { useState, useEffect } from "react";
// import { Bell } from "lucide-react";
import { RiNotification2Line } from "@remixicon/react";

import { NotificationDialog } from "@/components/playground/leaderControl/NotificationDialog";

export default function Header() {
  const [showNotification, setShowNotification] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const NOTIFICATION_KEY = "bambot-update-2024-05";

  useEffect(() => {
    if (!localStorage.getItem(NOTIFICATION_KEY)) {
      setHasNew(true);
    }
  }, []);

  const handleBellClick = () => {
    setShowNotification(true);
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
    if (hasNew) {
      localStorage.setItem(NOTIFICATION_KEY, "true");
      setHasNew(false);
    }
  };

  return (
    <>
      <header className="text-white w-full p-5 sm:px-10 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
        <Link href="/">
          <div className="text-2xl font-bold e">BamBot</div>
        </Link>
        <div className="flex  gap-4 items-center">
          <button
            onClick={handleBellClick}
            className="relative"
            title="Notifications"
          >
            <RiNotification2Line className="text-white w-5 h-5" />
            {hasNew && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-800" />
            )}
          </button>
          <div className="pt-2">
            <a
              className="github-button"
              href="https://github.com/timqian/bambot"
              // data-color-scheme="no-preference: light; light: light; dark: dark;"
              data-size="large"
              data-show-count="true"
              aria-label="Star timqian/bambot on GitHub"
            >
              Star
            </a>
          </div>
        </div>
      </header>
      {/* Script for GitHub buttons */}
      <Script async defer src="https://buttons.github.io/buttons.js" />
      <NotificationDialog
        open={showNotification}
        onOpenChange={setShowNotification}
        onClose={handleCloseNotification}
      />
    </>
  );
}

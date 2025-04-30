"use client";
import Script from "next/script";
import Link from "next/link";

export default function Header() {
  return (
    <>
      <header className="text-white w-full p-5 sm:px-10 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
        <Link href="/">
          <div className="text-2xl font-bold e">BamBot</div>
        </Link>
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
      </header>
      {/* Script for GitHub buttons */}
      <Script async defer src="https://buttons.github.io/buttons.js" />
    </>
  );
}

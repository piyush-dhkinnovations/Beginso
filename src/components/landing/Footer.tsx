"use client";

import { useCallback } from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const handlePlaceholderLink = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <footer className="bg-neutral-900 py-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-white tracking-tight">
              Beginso
            </span>
          </div>
          
          <div className="text-neutral-400 text-[13px]">
            &copy; {currentYear} Beginso. All rights reserved.
          </div>

          <div className="flex items-center gap-6 text-[13px] text-neutral-400">
            <a
              href="#"
              onClick={handlePlaceholderLink}
              className="hover:text-white transition-colors cursor-not-allowed opacity-70"
              title="Coming soon"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              onClick={handlePlaceholderLink}
              className="hover:text-white transition-colors cursor-not-allowed opacity-70"
              title="Coming soon"
            >
              Terms of Service
            </a>
            <a
              href="#"
              onClick={handlePlaceholderLink}
              className="hover:text-white transition-colors cursor-not-allowed opacity-70"
              title="Coming soon"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

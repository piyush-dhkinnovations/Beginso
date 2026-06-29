import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-neutral-200 z-30 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-heading-2 text-neutral-900 font-bold">
            Onboarding Platform
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex pt-[56px] min-h-[calc(100vh-56px)]">
        {/* Left Sidebar */}
        <aside className="fixed left-0 top-[56px] bottom-0 w-[200px] border-r-[2.5px] border-neutral-200 bg-neutral-50 hidden md:block z-20">
          <nav className="p-4 flex flex-col gap-2">
            <div className="text-label text-neutral-400 px-3 mb-2">Menu</div>
            <div className="px-3 py-2 text-body text-neutral-800 font-medium rounded-md bg-neutral-100 cursor-pointer">
              Dashboard
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 md:ml-[200px] p-6 overflow-y-auto min-h-full">
          {children}
        </main>
      </div>
    </div>
  );
}

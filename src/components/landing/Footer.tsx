import { Wordmark } from "./Wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Templates", href: "/templates" },
      { label: "Changelog", href: "/blog?category=Changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Acceptable Use", href: "/acceptable-use-policy" },
      { label: "Fair Use Policy", href: "/fair-use-policy" },
      { label: "Data Processing Agreement", href: "/data-processing-agreement" },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--ink-900)] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<<<<<<< Updated upstream
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
=======
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-8">
>>>>>>> Stashed changes
          <div>
            <Wordmark height={32} force="dark" />
            <p className="text-[13px] text-white/60 mt-3">&copy; {currentYear} Beginso. All rights reserved.</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-white/50 mb-4">{column.title}</div>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-[14px] text-white/80 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

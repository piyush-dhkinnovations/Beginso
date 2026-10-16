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
    <footer className="bg-(--surface-inverse) pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-8">
          <div>
            <Wordmark height={32} force="dark" />
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="bg-body-sm font-semibold text-(--text-on-brand)/70 mb-2">{column.title}</div>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="inline-flex min-h-10 items-center bg-body-sm text-(--text-on-brand)/80 hover:text-(--text-on-brand) transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 border-t border-(--text-on-brand)/15 pt-6 bg-body-sm text-(--text-on-brand)/60">&copy; {currentYear} Beginso. All rights reserved.</p>
      </div>
    </footer>
  );
}

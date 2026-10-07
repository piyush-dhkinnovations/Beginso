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
      { label: "Documentation", href: "/docs" },
      { label: "API reference", href: "/docs/api" },
      { label: "Help centre", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
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
    <footer className="bg-(--surface-inverse) py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div>
            <Wordmark height={32} force="dark" />
            <p className="bg-body-sm text-(--text-on-brand)/60 mt-3">&copy; {currentYear} Beginso. All rights reserved.</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="bg-body-sm font-semibold uppercase tracking-wide text-(--text-on-brand)/50 mb-4">{column.title}</div>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="bg-body text-(--text-on-brand)/80 hover:text-(--text-on-brand) transition-colors">
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

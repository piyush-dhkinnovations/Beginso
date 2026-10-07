import { FormLevelHeader } from '@/components/forms/FormLevelHeader';

// Every page under /forms/:id shares this header (breadcrumb + form sub-nav); it hides itself on
// the builder and the preview, which are full-bleed. A fragment keeps the page as a direct child
// of AppShell's <main>, so the shell's own gap and padding still apply.
export default function FormLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FormLevelHeader />
      {children}
    </>
  );
}

import { FormLevelHeader } from '@/components/forms/FormLevelHeader';
import { FormDataHeader } from '@/components/forms/FormDataHeader';

// Every page under /forms/:id shares one of two headers, each hiding itself off its own routes: the form
// header (icon, name, actions) and the data header (Responses / Summary). Neither shows on the preview, which
// is full-bleed. A fragment keeps the page as a direct child of AppShell's <main>, so the shell's own gap and
// padding still apply. The app sidebar collapses to its icon rail on the form's own pages (PersonalShell).
export default function FormLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FormLevelHeader />
      <FormDataHeader />
      {children}
    </>
  );
}

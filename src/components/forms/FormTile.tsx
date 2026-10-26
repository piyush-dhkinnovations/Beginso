import { getFormIcon, suggestFormIcon } from '@/lib/formIcons';
import { IconArt } from '@/components/forms/FormIcon';
import { LogoImage } from '@/components/ui/LogoImage';

/**
 * A form's mark. In order: its uploaded logo, the icon the owner picked, and otherwise the icon that suits the form's name (lib/formIcons
 * suggestFormIcon), so a list of forms is scannable without anyone setting anything up. All three are shown alone, with no box around them.
 */
export function FormTile({
  title,
  size = 44,
  logoUrl,
  iconName,
}: {
  title: string;
  size?: number;
  logoUrl?: string | null;
  iconName?: string | null;
}) {
  // A form with its own logo shows just the logo: no tile, border or background around it.
  if (logoUrl) {
    // Small tiles (table rows) show the logo at full size; big ones (cards) leave a little air around it.
    const logo = size < 56 ? size : Math.round(size * 0.8);
    return <LogoImage key={logoUrl} src={logoUrl} size={logo} margin={(size - logo) / 2} />;
  }
  // An icon is shown as its artwork alone, like a logo: no tile, border or background around it.
  const icon = getFormIcon(iconName) ?? suggestFormIcon(title);
  return (
    <span className="inline-flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <IconArt icon={icon} size={Math.round(size * 0.92)} />
    </span>
  );
}

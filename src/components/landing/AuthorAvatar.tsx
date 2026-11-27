import { Avatar } from "@/components/ui/Avatar";
import { BRAND_MARK } from '@/lib/brand';

// "Beginso Team" is the product/company itself, not a person — show the
// brand icon mark instead of a generated-initials avatar.
export function AuthorAvatar({ name, size = 24 }: { name: string; size?: number }) {
  if (name === "Beginso Team") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-(--accent-soft) shrink-0"
        style={{ height: size + 8, width: size + 8 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
        <img src={BRAND_MARK} alt={name} height={size} width={size} style={{ height: size, width: size }} />
      </span>
    );
  }
  const avatarSize = size <= 20 ? "xs" : size <= 28 ? "sm" : size <= 40 ? "default" : "lg";
  return <Avatar name={name} size={avatarSize} />;
}

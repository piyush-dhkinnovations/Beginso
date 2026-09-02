import { bx } from "@/lib/utils";
import { Avatar, type AvatarProps } from "./Avatar";

export interface AvatarStackPerson {
  name: string;
  src?: string;
}

export interface AvatarStackProps {
  people: AvatarStackPerson[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §9 AVATARS (.bg-avatar-stack,
// .bg-avatar-more). Renders up to `max` overlapping avatars, then a +N tile for the rest.
export function AvatarStack({ people, max = 4, size = "default", className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <span className={bx("bg-avatar-stack", className)}>
      {shown.map((person) => (
        <Avatar key={person.name} name={person.name} src={person.src} size={size} alt="" />
      ))}
      {overflow > 0 && (
        <span className={bx("bg-avatar", "bg-avatar-more", size !== "default" && `bg-avatar-${size}`)}>
          +{overflow}
        </span>
      )}
    </span>
  );
}

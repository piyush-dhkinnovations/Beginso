import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { AuthorAvatar } from "./AuthorAvatar";
import type { BlogCategory, BlogPost } from "@/lib/blogPosts";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// One generated cover per category (gradient + pattern + label baked in),
// committed as a static file — see public/blog/covers/. Reused across every
// post in that category rather than regenerated inline per post.
const COVER_SRC: Record<BlogCategory, string> = {
  Product: "/blog/covers/product.png",
  Guide: "/blog/covers/guide.png",
  Changelog: "/blog/covers/changelog.png",
  Engineering: "/blog/covers/engineering.png",
};

export function BlogCover({ post, className = "aspect-video" }: { post: BlogPost; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={COVER_SRC[post.category]} alt="" className={`w-full object-cover ${className}`} />
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="lift block rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden"
    >
      <BlogCover post={post} />
      <div className="p-5">
        <Badge variant="primary" pill className="mb-3">
          {post.category}
        </Badge>
        <h3 className="bg-h5 text-[var(--text-primary)] mb-2">{post.title}</h3>
        <p className="bg-body-sm text-[var(--text-secondary)] mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-2">
          <AuthorAvatar name={post.author} size={20} />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">{post.author}</span>
          <span className="text-[12px] text-[var(--text-muted)]">· {formatDate(post.date)}</span>
        </div>
      </div>
    </Link>
  );
}

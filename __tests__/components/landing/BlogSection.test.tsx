import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlogSection from '@/components/landing/BlogSection';
import { BLOG_POSTS } from '@/lib/blogPosts';

describe('BlogSection', () => {
  it('has a blog anchor and heading', () => {
    const { container } = render(<BlogSection />);
    expect(container.querySelector('section#blog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: "What's new in Beginso" })).toBeInTheDocument();
  });

  it('links to the blog index', () => {
    render(<BlogSection />);
    expect(screen.getByRole('link', { name: /View all posts/ })).toHaveAttribute('href', '/blog');
  });

  it('renders a card linking to every post', () => {
    render(<BlogSection />);
    for (const post of BLOG_POSTS) {
      const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === `/blog/${post.slug}`);
      expect(link, post.slug).toBeDefined();
      expect(link).toHaveTextContent(post.title);
    }
  });
});

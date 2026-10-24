import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UrlAnswer } from '@/components/responses/answers/UrlAnswer';
import type { FormField } from '@/types/form';

const mockPreview = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getLinkPreview: (...a: unknown[]) => mockPreview(...a) },
}));

const field = (style?: string, display?: string) => ({ type: 'url', urlPreviewStyle: style, urlDisplay: display }) as unknown as FormField;

function renderUrl(value: string, f?: FormField) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UrlAnswer value={value} field={f} scope="acme" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockPreview.mockReset().mockResolvedValue({ url: 'https://example.com/', domain: 'example.com', title: 'Example Title', image: 'https://img/x.png' });
});

describe('UrlAnswer', () => {
  it.each(['javascript:alert(1)', 'not a url', 'ftp://x.com'])('shows %s as inert text, not a link', (v) => {
    renderUrl(v, field('text'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(v)).toBeInTheDocument();
  });

  it('text style renders a hardened external link', () => {
    renderUrl('https://example.com/a', field('text'));
    const a = screen.getByRole('link');
    expect(a).toHaveAttribute('href', 'https://example.com/a');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(a).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(a).toHaveTextContent('(opens in a new tab)');
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('compact style shows the full href as text and as the title attribute', () => {
    renderUrl('https://www.example.com/path', field('compact', 'inline'));
    const a = screen.getByRole('link');
    expect(a).toHaveAttribute('title', 'https://www.example.com/path');
    expect(screen.getByText('https://www.example.com/path')).toBeInTheDocument();
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('rich style (default) fetches a preview with url and scope and shows title and image', async () => {
    renderUrl('https://example.com/', undefined);
    expect(await screen.findByText('Example Title')).toBeInTheDocument();
    expect(mockPreview).toHaveBeenCalledWith('https://example.com/', 'acme');
    expect(screen.getByRole('link', { name: /Open website/ })).toHaveAttribute('href', 'https://example.com/');
    expect(document.querySelector('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('shows a loading placeholder before the preview resolves', () => {
    mockPreview.mockReturnValue(new Promise(() => {}));
    renderUrl('https://example.com/', field('rich', 'card'));
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('falls back to the domain and a monogram when the preview fails', async () => {
    mockPreview.mockRejectedValue(new Error('x'));
    renderUrl('https://www.example.com/', field('rich', 'inline'));
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument());
    expect(screen.getAllByText('example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('e')).toBeInTheDocument();
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('swaps a broken thumbnail for the monogram', async () => {
    renderUrl('https://example.com/', field('rich', 'card'));
    const img = await waitFor(() => {
      const el = document.querySelector('img');
      expect(el).toBeInTheDocument();
      return el!;
    });
    fireEvent.error(img);
    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('e')).toBeInTheDocument();
  });

  it('never scrapes a sign-in-only host and shows a neutral Drive chip instead of "Page not found"', () => {
    mockPreview.mockResolvedValue({ title: 'Page not found', image: null });
    renderUrl('https://drive.google.com/file/d/16-OAlkOr72y7pOTilGnao_jw-zIQlixR/view?usp=drivesdk', field('rich', 'card'));
    expect(mockPreview).not.toHaveBeenCalled();
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
    expect(screen.getByText('Google Drive file')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Opens in a new tab/ })).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });

  it.each([
    'https://docs.google.com.evil.example/document/d/1234567890/edit',
    'https://notdrive.google.com/file/d/1234567890/view',
  ])('does not use a Google Drive thumbnail for deceptive host %s', async (href) => {
    mockPreview.mockResolvedValue({ title: null, image: null });
    renderUrl(href, field('rich', 'card'));
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument());
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  describe('small card (the Table layout)', () => {
    const renderSmall = (value: string, f?: FormField) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return render(
        <QueryClientProvider client={client}>
          <UrlAnswer value={value} field={f} scope="acme" small />
        </QueryClientProvider>
      );
    };

    it('is the list card in a small size: title, host and one hardened Open link', async () => {
      mockPreview.mockResolvedValue({ title: 'Destiny of a migrant', image: null });
      renderSmall('https://vimeo.com/999576491?ts=0');
      expect(await screen.findByText('Destiny of a migrant')).toBeInTheDocument();
      expect(screen.getByText('vimeo.com')).toBeInTheDocument();
      const a = screen.getByRole('link', { name: /Open website/ });
      expect(a).toHaveAttribute('href', 'https://vimeo.com/999576491?ts=0');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer nofollow');
      expect(a).toHaveAttribute('target', '_blank');
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('shows a monogram when the page has no thumbnail', async () => {
      mockPreview.mockResolvedValue({ title: null, image: null });
      renderSmall('https://example.com/page');
      await waitFor(() => expect(screen.getByText('e')).toBeInTheDocument());
    });

    it('is the same small card whatever style the form owner chose for the question', async () => {
      mockPreview.mockResolvedValue({ title: 'T', image: null });
      renderSmall('https://example.com/', { type: 'url', urlPreviewStyle: 'text' } as unknown as FormField);
      expect(await screen.findByRole('link', { name: /Open website/ })).toBeInTheDocument();
    });

    it.each([
      ['https://drive.google.com/file/d/16-ZyXwVuTsRqPoNm/view', 'Google Drive file'],
      ['https://docs.google.com/document/d/abc/edit', 'Google Docs file'],
      ['https://www.dropbox.com/s/abc/file.pdf', 'Dropbox file'],
      ['https://www.figma.com/file/abc', 'Figma file'],
    ])('%s is named, never scraped, and never "Page not found"', (href, label) => {
      renderSmall(href);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Opens in a new tab/ })).toHaveAttribute('href', href);
      expect(screen.queryByText(/Page not found/)).not.toBeInTheDocument();
      expect(mockPreview).not.toHaveBeenCalled();
    });

    it('text that is not a web address is not a link', () => {
      renderSmall('javascript:alert(1)');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  const rich = (extra: Record<string, string>) => ({ type: 'url', urlPreviewStyle: 'rich', urlDisplay: 'card', ...extra }) as unknown as FormField;
  const thumb = async () => waitFor(() => {
    const el = document.querySelector('img');
    expect(el).toBeInTheDocument();
    return el!;
  });

  it('large size stacks the image above the text; the aspect ratio frames it', async () => {
    renderUrl('https://example.com/', rich({ urlPreviewSize: 'large', urlAspectRatio: '16:9' }));
    const img = await thumb();
    expect(img.className).toContain('aspect-video');
    expect(img.className).toContain('w-full');
    expect(img.parentElement?.className).toContain('flex-col');
  });

  it('medium and small sit beside the text, small narrower; 1:1 is square', async () => {
    const { unmount } = renderUrl('https://example.com/', rich({ urlPreviewSize: 'small', urlAspectRatio: '1:1' }));
    const small = await thumb();
    expect(small.className).toContain('w-20');
    expect(small.className).toContain('aspect-square');
    expect(small.parentElement?.className).not.toContain('flex-col');
    unmount();
    renderUrl('https://example.com/', rich({ urlPreviewSize: 'medium' }));
    expect((await thumb()).className).toContain('w-28');
  });
});

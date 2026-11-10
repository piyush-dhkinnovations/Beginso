import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TemplatePreviewFrame } from '@/components/templates/TemplatePreviewFrame';

describe('TemplatePreviewFrame', () => {
  it('points the iframe at the template\'s own bare preview route', () => {
    const { container } = render(<TemplatePreviewFrame slug="job-application" device="desktop" title="Job Application preview" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveAttribute('src', '/discover-templates/job-application/preview');
    expect(iframe).toHaveAttribute('title', 'Job Application preview');
  });

  it("renders the iframe at the device's real pixel width regardless of the stage's own measured width", () => {
    // jsdom reports 0 clientWidth; useWidth floors it at 160 — the iframe's native width must still be
    // the device's real width (not shrunk to 160px), since the scale transform is what adapts it, not the width itself.
    const { container } = render(<TemplatePreviewFrame slug="job-application" device="mobile" title="t" />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.style.width).toBe('375px');
  });

  it('scales down for a smaller device, and the outer stage never changes size with it', () => {
    const { container: desktop } = render(<TemplatePreviewFrame slug="job-application" device="desktop" title="t" />);
    const { container: mobile } = render(<TemplatePreviewFrame slug="job-application" device="mobile" title="t" />);
    const desktopIframe = desktop.querySelector('iframe') as HTMLIFrameElement;
    const mobileIframe = mobile.querySelector('iframe') as HTMLIFrameElement;
    // Different native widths (real device sizes)...
    expect(desktopIframe.style.width).not.toBe(mobileIframe.style.width);
    // ...but the same outer stage class (h-full w-full) on both — the box itself never resizes.
    expect(desktop.firstElementChild?.className).toBe(mobile.firstElementChild?.className);
  });
});

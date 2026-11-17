import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TemplatePreviewFrame } from '@/components/templates/TemplatePreviewFrame';

describe('TemplatePreviewFrame', () => {
  it('points the iframe at the template\'s own bare preview route', () => {
    const { container } = render(<TemplatePreviewFrame slug="job-application" device="desktop" title="Job Application preview" />);
    const iframe = container.querySelector('iframe');
    // see-through (`bg=0`): the stage behind the frame carries the form's own page
    expect(iframe).toHaveAttribute('src', '/discover-templates/job-application/preview?embed=1&bg=0');
    expect(iframe).toHaveAttribute('title', 'Job Application preview');
  });

  it("renders the iframe at the device's real pixel width regardless of the stage's own measured width", () => {
    // jsdom reports 0 for the stage's width: the iframe's native width must still be the device's real width, since the scale transform is what
    // adapts it, not the width itself.
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
    // ...but the same outer stage class on both: the box itself never resizes.
    expect(desktop.firstElementChild?.className).toBe(mobile.firstElementChild?.className);
  });

  it('draws the page of the form over the whole stage, whatever the device, with nothing but the form changing size', () => {
    const page = { backgroundImage: 'linear-gradient(135deg, rgb(22, 163, 74), rgb(167, 217, 183))' };
    const { container } = render(<TemplatePreviewFrame slug="job-application" device="mobile" title="t" pageStyle={page} />);
    const stage = container.firstElementChild as HTMLElement;
    expect(stage.style.backgroundImage).toContain('linear-gradient');
    // one box: the iframe has no border or shadow of its own
    expect(container.querySelector('iframe')?.className).not.toMatch(/shadow|rounded|border-\(/);
  });
});

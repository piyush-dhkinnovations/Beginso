/**
 * Feature: page-shaped skeletons
 * Tests: PageSkeletons — each one announces itself once, has the footprint of the screen it stands in for, and the
 * route-level loading files use them.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ActivityCardSkeleton,
  CardGridSkeleton,
  ChartCardSkeleton,
  DashboardGridSkeleton,
  HomeBodySkeleton,
  InsightsBodySkeleton,
  QuickActionsSkeleton,
  ResponsesBodySkeleton,
  KpiCardSkeleton,
  ListBodySkeleton,
  PageHeaderSkeleton,
  SettingsBodySkeleton,
  SkeletonRegion,
} from '@/components/ui/PageSkeletons';

const pathname = vi.hoisted(() => ({ value: '/w/acme' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

import TemplatesLoading from '@/app/(user)/templates/loading';
import SharedLoading from '@/app/(user)/shared/loading';
import WorkspacesLoading from '@/app/(user)/workspaces/loading';
import FormsLoading from '@/app/(user)/forms/loading';
import FormLevelLoading from '@/app/(user)/forms/[id]/loading';
import WorkspaceLoading from '@/app/w/[slug]/loading';
import SettingsLoading from '@/app/(user)/settings/loading';
import ResponsesLoading from '@/app/(user)/form-responses/loading';

describe('SkeletonRegion', () => {
  it('is one polite busy status with a screen-reader label', () => {
    render(<SkeletonRegion label="Loading things">x</SkeletonRegion>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading things')).toHaveClass('sr-only');
  });
});

describe('building blocks', () => {
  it('KpiCardSkeleton has the same footprint as a KPI card', () => {
    const { container } = render(<KpiCardSkeleton />);
    expect(container.firstElementChild).toHaveClass('min-h-34', 'rounded-xl', 'border', 'p-5');
  });

  it('ChartCardSkeleton fills its grid cell', () => {
    const { container } = render(<ChartCardSkeleton />);
    expect(container.firstElementChild).toHaveClass('h-full');
  });

  it('PageHeaderSkeleton shows only the parts asked for', () => {
    const none = render(<PageHeaderSkeleton />).container;
    const all = render(<PageHeaderSkeleton eyebrow description action />).container;
    expect(all.querySelectorAll('.bg-skeleton').length).toBe(none.querySelectorAll('.bg-skeleton').length + 3);
  });
});

describe('DashboardGridSkeleton', () => {
  it('uses the dashboard grid: a row of KPI cards (3 columns each) then chart cards (6 columns, two rows)', () => {
    const { container } = render(<DashboardGridSkeleton />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toHaveClass('xl:grid-cols-12');
    const cells = Array.from(grid.children) as HTMLElement[];
    expect(cells).toHaveLength(6);
    expect(cells.slice(0, 4).every((c) => c.className.includes('xl:col-span-3'))).toBe(true);
    expect(cells.slice(4).every((c) => c.className.includes('xl:col-span-6') && c.className.includes('row-span-2'))).toBe(true);
  });

  it('honours the counts it is given', () => {
    const { container } = render(<DashboardGridSkeleton kpis={2} charts={1} />);
    expect(container.firstElementChild?.children).toHaveLength(3);
  });
});

describe('HomeBodySkeleton', () => {
  it('is one status region holding the grid and the two list cards', () => {
    const { container } = render(<HomeBodySkeleton />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelector('.xl\\:grid-cols-12')).not.toBeNull();
    expect(container.querySelectorAll('.divide-y')).toHaveLength(2);
  });
});

describe('CardGridSkeleton', () => {
  it('draws the requested number of cards, with media when asked', () => {
    const plain = render(<CardGridSkeleton count={4} />).container;
    expect(plain.querySelectorAll('.rounded-xl.border')).toHaveLength(4);
    const media = render(<CardGridSkeleton count={2} media />).container;
    expect(media.querySelectorAll('.rounded-none')).toHaveLength(2);
  });

  it('uses two columns or three on wide screens', () => {
    expect(render(<CardGridSkeleton columns={2} />).container.firstElementChild).not.toHaveClass('lg:grid-cols-3');
    expect(render(<CardGridSkeleton />).container.firstElementChild).toHaveClass('lg:grid-cols-3');
  });
});

describe('the column steps match the real pages', () => {
  it('Forms and Responses stop at four across; Templates, Workspaces and Shared go on to five', () => {
    expect(render(<CardGridSkeleton columns={4} />).container.firstElementChild).toHaveClass('min-[90rem]:grid-cols-4');
    expect(render(<CardGridSkeleton columns={4} />).container.firstElementChild?.className).not.toMatch(/grid-cols-5/);
    expect(render(<CardGridSkeleton columns="wide" />).container.firstElementChild).toHaveClass('min-[150rem]:grid-cols-5');
  });
});

describe('the Home side cards and the form data pages', () => {
  it('Recent Activity is a card with its heading inside, rows of a round icon, two lines and a date; Home shows it under Quick actions', () => {
    const { container } = render(<ActivityCardSkeleton />);
    expect(container.firstElementChild).toHaveClass('bg-card');
    expect(container.querySelectorAll('.divide-y > div')).toHaveLength(5);
    const home = render(<HomeBodySkeleton />).container;
    expect(home.querySelectorAll('.min-h-16')).toHaveLength(5); // the activity rows
    expect(render(<QuickActionsSkeleton />).container.querySelectorAll('.bg-card')).toHaveLength(2);
  });

  it('the Responses body is a search row, the stage pills with the view switch, then a table; Insights is a filter row and the widget grid', () => {
    render(<ResponsesBodySkeleton />);
    expect(screen.getByRole('status', { name: 'Loading responses' })).toBeInTheDocument();
    render(<InsightsBodySkeleton />);
    expect(screen.getByRole('status', { name: 'Loading insights' })).toBeInTheDocument();
  });
});

describe('ListBodySkeleton', () => {
  it('is a filter row and a table of the requested rows', () => {
    const { container } = render(<ListBodySkeleton rows={3} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelectorAll('.border-b.border-\\(--border-subtle\\)')).toHaveLength(3);
  });
});

describe('SettingsBodySkeleton', () => {
  it('is a section list on the left and a short form on the right, announced once', () => {
    const { container } = render(<SettingsBodySkeleton />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-skeleton-circle')).toHaveLength(1);
  });
});

describe('route-level loading files', () => {
  it('Account settings and Responses show their own title over their skeleton', () => {
    for (const [Page, title] of [
      [SettingsLoading, 'Account settings'],
      [ResponsesLoading, 'Responses'],
    ] as const) {
      const { unmount } = render(<Page />);
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      unmount();
    }
  });

  it('each list page shows its real title above the matching skeleton', () => {
    for (const [Page, title] of [
      [TemplatesLoading, 'Templates'],
      [SharedLoading, 'Shared with me'],
      [WorkspacesLoading, 'All workspaces'],
      [FormsLoading, 'Forms'],
    ] as const) {
      const { unmount } = render(<Page />);
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(1);
      unmount();
    }
  });

  it('pages under a single form keep the generic page skeleton, not the Forms list one', () => {
    render(<FormLevelLoading />);
    expect(screen.queryByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('the workspace Home gets the Home skeleton; every other workspace page the generic one', () => {
    pathname.value = '/w/acme';
    const home = render(<WorkspaceLoading />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    home.unmount();
    pathname.value = '/w/acme/forms';
    render(<WorkspaceLoading />);
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

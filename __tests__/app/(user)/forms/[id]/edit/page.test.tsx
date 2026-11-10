/**
 * The editor's Settings tab: the form's Settings and Share & Embed on one tab, named Settings, Settings first and
 * Share & Embed below it. The builder's hooks and the other tabs are stubbed; this covers which tab a URL opens,
 * what each role sees on the merged tab, and the jumps between the two sections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BuilderPageShell from '@/app/(user)/forms/[id]/edit/page';
import { useBuilderStore } from '@/store/builderStore';
import type { BuilderTarget } from '@/components/form-builder/BuilderTabs';

let search = new URLSearchParams();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'f1' }),
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => search,
}));

let role: string = 'owner';
vi.mock('@/components/form-builder/useBuilderForm', () => ({
  useBuilderForm: () => ({ isLoading: false, formWorkspaceSlug: null, formsListHref: '/forms', overviewHref: '/forms/f1/overview', formRole: role }),
}));
vi.mock('@/components/form-builder/useBuilderAutosave', () => ({
  reloadBuilder: vi.fn(),
  useBuilderAutosave: () => ({ saveState: 'idle', setSaveState: vi.fn(), savedAt: null, saveDetail: null, handleRetrySave: vi.fn() }),
}));
vi.mock('@/components/form-builder/useBuilderUndoShortcuts', () => ({ useBuilderUndoShortcuts: () => {} }));
let publishSetActiveTab: ((tab: BuilderTarget) => void) | null = null;
vi.mock('@/components/form-builder/useBuilderPublishFlow', () => ({
  useBuilderPublishFlow: ({ setActiveTab }: { setActiveTab: (tab: BuilderTarget) => void }) => {
    publishSetActiveTab = setActiveTab;
    return { showPublishModal: false, setShowPublishModal: vi.fn(), handleStatusChange: vi.fn(), handlePublishClick: vi.fn(), handleChangeSetting: vi.fn(), handleFixField: vi.fn(), handlePreview: vi.fn(), handlePreviewInNewTab: vi.fn() };
  },
}));
vi.mock('@/components/form-builder/useBuilderLeaveGuard', () => ({
  useBuilderLeaveGuard: () => ({ showLeaveModal: false, handleBack: vi.fn(), handleLeaveWithoutSaving: vi.fn(), handleStay: vi.fn() }),
}));
vi.mock('@/components/form-builder/useBuilderDnd', () => ({ useBuilderDnd: () => ({}) }));
vi.mock('@/lib/pendingEdits', () => ({ usePendingEdits: () => false }));

vi.mock('@/components/form-builder/BuilderHeader', () => ({ BuilderHeader: () => null }));
vi.mock('@/components/forms/FormLogoButton', () => ({ FormLogoButton: () => null }));
vi.mock('@/components/form-builder/AddFieldSheet', () => ({ AddFieldSheet: () => null }));
vi.mock('@/components/form-builder/PublishModal', () => ({ PublishModal: () => null }));
vi.mock('@/components/form-builder/LeaveBuilderModal', () => ({ LeaveBuilderModal: () => null }));
vi.mock('@/components/form-builder/BuildTabPanel', () => ({ BuildTabPanel: () => <p>build panel</p> }));
vi.mock('@/components/form-builder/BrandingTabContent', () => ({ BrandingTabContent: () => <p>branding panel</p> }));
vi.mock('@/components/form-builder/ShareView', () => ({
  ShareView: ({ onOpenSettings }: { onOpenSettings?: () => void }) => (
    <section>
      <h2>Share &amp; Embed</h2>
      <button type="button" onClick={onOpenSettings}>Change who can respond</button>
    </section>
  ),
}));
vi.mock('@/components/form-builder/SettingsPanel', () => ({ SettingsPanel: () => <h2>Settings</h2> }));

const scrollIntoView = vi.fn();

function renderAt(tab?: string) {
  search = new URLSearchParams(tab ? { tab } : {});
  return render(<BuilderPageShell />);
}

describe('Form editor: Settings tab', () => {
  beforeEach(() => {
    role = 'owner';
    replace.mockReset();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    useBuilderStore.setState({ formId: 'f1' });
  });

  it('has three tabs, the last one named Settings', () => {
    renderAt();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Build', 'Branding', 'Settings']);
  });

  it('shows Settings above Share & Embed, without scrolling, on ?tab=settings', () => {
    renderAt('settings');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Settings', 'Share & Embed']);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('opens the same tab scrolled down to Share & Embed on ?tab=share', () => {
    renderAt('share');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('form-share'));
  });

  it('gives a Reviewer only Settings, with no Share & Embed section at all', () => {
    role = 'reviewer';
    renderAt('settings');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: 'Share & Embed' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('"Change who can respond" scrolls up to Settings without leaving the tab', async () => {
    renderAt('settings');
    await userEvent.click(screen.getByRole('button', { name: 'Change who can respond' }));
    expect(replace).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('the publish check\'s "Change" goes straight to the Settings tab, no scroll needed', () => {
    renderAt('settings');
    publishSetActiveTab!('settings');
    expect(replace).toHaveBeenCalledWith('/forms/f1/edit?tab=settings', { scroll: false });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('clicking the tab opens it at the top (Settings), not scrolled to Share & Embed', async () => {
    renderAt('build');
    expect(screen.getByText('build panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(replace).toHaveBeenCalledWith('/forms/f1/edit?tab=settings', { scroll: false });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

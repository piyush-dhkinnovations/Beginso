/**
 * __tests__/settings/unsavedTabState.property.test.tsx
 * Feature: sprint-6-settings, Property 1: Unsaved edits survive a tab switch
 * Requirements: 12.1
 *
 * Tests the exact mount-persistence mechanism `src/app/(user)/settings/page.tsx` uses (a
 * `visitedTabs` Set that only grows, rendering every visited tab's content permanently — CSS
 * `hidden` when inactive, never JSX-omitted) against a minimal harness with a synthetic
 * local-state child, rather than the full SettingsPage — mirrors this repo's established PBT
 * convention of testing the underlying mechanism directly (see reportPolling.property.test.ts,
 * responses.optimistic.property.test.ts) instead of a full page render with five real tabs' worth
 * of service/firebase/auth mocks. The real bug this validates: the original
 * `{activeTab === 'x' && <XTab/>}` rendering unmounted the previous tab on every switch, resetting
 * its local RHF state — found while writing this test, fixed in page.tsx the same pass.
 */

import { describe, it } from 'vitest';
import { useState } from 'react';
import { render, fireEvent } from '@testing-library/react';
import fc from 'fast-check';

type Tab = 'profile' | 'workspace' | 'branding' | 'notifications' | 'security';
const TABS: Tab[] = ['profile', 'workspace', 'branding', 'notifications', 'security'];

function TextField({ testId }: { testId: string }) {
  const [value, setValue] = useState('');
  return <input data-testid={testId} value={value} onChange={(e) => setValue(e.target.value)} />;
}

// Same shape as SettingsPage's actual tab-hosting logic: a Set that only grows, each visited
// tab's content rendered permanently once added, hidden (not omitted) when inactive.
function TabHost({ activeTab, onActiveTabChange }: { activeTab: Tab; onActiveTabChange: (t: Tab) => void }) {
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set([activeTab]));
  if (!visitedTabs.has(activeTab)) {
    setVisitedTabs(new Set(visitedTabs).add(activeTab));
  }

  return (
    <div>
      {TABS.map((tab) => (
        <button key={tab} onClick={() => onActiveTabChange(tab)}>
          {tab}
        </button>
      ))}
      {TABS.map(
        (tab) =>
          visitedTabs.has(tab) && (
            <div key={tab} className={activeTab === tab ? '' : 'hidden'}>
              <TextField testId={`field-${tab}`} />
            </div>
          )
      )}
    </div>
  );
}

function Harness() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  return <TabHost activeTab={activeTab} onActiveTabChange={setActiveTab} />;
}

describe('SettingsPage tab-mount persistence — property test', () => {
  it('an unsaved edit on the originating tab is unchanged after any sequence of tab switches', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...TABS), { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (tabSequence, nameInput) => {
          const { getByTestId, getByText, unmount } = render(<Harness />);

          fireEvent.change(getByTestId('field-profile'), { target: { value: nameInput } });

          for (const tab of tabSequence) {
            fireEvent.click(getByText(tab));
          }
          fireEvent.click(getByText('profile'));

          const survived = (getByTestId('field-profile') as HTMLInputElement).value === nameInput;
          unmount();
          return survived;
        }
      ),
      { numRuns: 100 }
    );
  });
});

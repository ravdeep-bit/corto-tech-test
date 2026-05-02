import { test, expect } from '../../fixtures/pomFixtures';
import searchScenarios from '../../data/searchScenarios.json';

interface SearchScenario {
  description: string;
  searchTerm: string;
  expectEmpty: boolean;
  expectedTitleContains: string | null;
  smoke?: boolean;
}

test.describe('Search functionality on /books', () => {
  test.beforeEach(async ({ bookStorePage }) => {
    await bookStorePage.goto();
  });

  // Data-driven — one test per JSON row; `smoke: true` rows get the @smoke tag.
  for (const scenario of searchScenarios as SearchScenario[]) {
    test(
      `returns expected results when ${scenario.description}`,
      { tag: scenario.smoke ? ['@smoke'] : [] },
      async ({ bookStorePage }) => {
        await bookStorePage.search(scenario.searchTerm);

        if (scenario.expectEmpty) {
          expect(await bookStorePage.getVisibleRowCount()).toBe(0);
          expect(await bookStorePage.hasNoResults()).toBe(true);
        } else {
          const count = await bookStorePage.getVisibleRowCount();
          expect(count).toBeGreaterThan(0);

          const titles = await bookStorePage.getResultTitles();
          const matched = titles.some((title) =>
            title.toLowerCase().includes(scenario.expectedTitleContains!.toLowerCase()),
          );
          expect(
            matched,
            `expected at least one result to contain "${scenario.expectedTitleContains}", got ${JSON.stringify(titles)}`,
          ).toBe(true);
        }
      },
    );
  }

  test('clearing the search restores the original list', async ({ bookStorePage }) => {
    const initialCount = await bookStorePage.getVisibleRowCount();
    expect(initialCount).toBeGreaterThan(0);

    await bookStorePage.search('Git Pocket Guide');
    expect(await bookStorePage.getVisibleRowCount()).toBeLessThan(initialCount);

    await bookStorePage.clearSearch();
    expect(await bookStorePage.getVisibleRowCount()).toBe(initialCount);
    expect(await bookStorePage.getSearchInputValue()).toBe('');
  });
});

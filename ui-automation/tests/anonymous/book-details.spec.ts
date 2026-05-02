import { test, expect } from '../../fixtures/pomFixtures';

// Search → click → detail flow + metadata for a known stable book.
test.describe('Book details page', () => {
  const KNOWN_BOOK = 'Git Pocket Guide';

  test.beforeEach(async ({ bookStorePage }) => {
    await bookStorePage.goto();
  });

  test(
    'navigates to detail page with ISBN in the URL',
    { tag: '@smoke' },
    async ({ bookStorePage, bookDetailsPage }) => {
      await bookStorePage.search(KNOWN_BOOK);
      await bookStorePage.openBookByTitle(KNOWN_BOOK);

      expect(await bookDetailsPage.isOnDetailPage()).toBe(true);
      expect(bookDetailsPage.getIsbnFromUrl()).toBeTruthy();
    },
  );

  test('displays the expected metadata fields for a known book', async ({
    bookStorePage,
    bookDetailsPage,
  }) => {
    await bookStorePage.search(KNOWN_BOOK);
    await bookStorePage.openBookByTitle(KNOWN_BOOK);

    const details = await bookDetailsPage.getBookDetails();

    // Assert populated, not exact values — catalogue may change.
    expect(details.isbn, 'ISBN should be populated').toBeTruthy();
    expect(details.title, 'Title should be populated').toBeTruthy();
    expect(details.author, 'Author should be populated').toBeTruthy();
    expect(details.publisher, 'Publisher should be populated').toBeTruthy();
    expect(details.totalPages, 'Total Pages should be populated').toBeTruthy();
    expect(details.description, 'Description should be populated').toBeTruthy();
    expect(details.title).toBe(KNOWN_BOOK);
  });

  test('ISBN in the URL matches the ISBN displayed on the page', async ({
    bookStorePage,
    bookDetailsPage,
  }) => {
    await bookStorePage.search(KNOWN_BOOK);
    await bookStorePage.openBookByTitle(KNOWN_BOOK);

    const urlIsbn = bookDetailsPage.getIsbnFromUrl();
    const details = await bookDetailsPage.getBookDetails();

    expect(urlIsbn).toBeTruthy();
    expect(details.isbn).toBe(urlIsbn);
  });

  test('does not render "Add To Your Collection" button when not logged in', async ({
    bookStorePage,
    bookDetailsPage,
  }) => {
    // Auth boundary — button isn't rendered for anonymous users at all.
    await bookStorePage.search(KNOWN_BOOK);
    await bookStorePage.openBookByTitle(KNOWN_BOOK);

    await bookDetailsPage.expectAddToCollectionButtonHidden();
  });
});

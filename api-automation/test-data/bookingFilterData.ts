// Filter-test data for GET /booking. Externalised so adding a new filter
// scenario is a one-edit change to this file, not a code change in the spec.

// String we expect no existing booking to match — for the empty-result negative test.
export const NON_EXISTENT_FILTER_VALUE = 'NoSuchUser_xyz_unique_nope';

// Per-run unique seed values for filter tests, so concurrent runs / stale
// data on the shared API don't cause cross-test interference.
export function uniqueFilterTarget(): { firstname: string; lastname: string } {
  const id = Date.now();
  return {
    firstname: `Alice${id}`,
    lastname: `Smith${id}`,
  };
}

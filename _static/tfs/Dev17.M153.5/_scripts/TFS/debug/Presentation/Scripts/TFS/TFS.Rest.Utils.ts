/**
 * Fetches items using a get call, making multiple calls if necessary
 * @param get {Function} A method that wraps the rest call to get items
 * @param top {number} The maximum number of results to fetch per call
 * @param skip {number} The number of results to skip (i.e., for paging or when making subsequent calls)
 */
export function batchGet<T>(get: (top: number, skip: number) => IPromise<T[]>, top = 500, skip = 0): IPromise<T[]> {
    return get(top, skip)
        .then((items: T[]) => {
            if (items.length < top) {
                // If we already have all the items, return them
                return items;
            } else {
                // There are still more items on the server, so make another call (skipping what we already have), append the results and return the combined array
                return batchGet(get, top, skip + items.length)
                    .then(extraItems => items.concat(extraItems));
            }
        });
}

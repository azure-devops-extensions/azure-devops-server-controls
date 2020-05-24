export class PathSearchResultItem {
    constructor(
        public path: string,
        public isFolder: boolean = false,
        /**
         * Array of indices of characters of a file path that matched the search text 
         */
        public matchingIndices: number[] = []) {
    }
}

export interface PathSearchResult {
    /**
     * Search query corresponding the path results.
     */
    searchText: string;
    results: PathSearchResultItem[];
}
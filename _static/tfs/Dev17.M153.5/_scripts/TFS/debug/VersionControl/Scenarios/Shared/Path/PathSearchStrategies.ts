import {SearchableObject} from "VSS/Search";
import {FuzzySearchStrategy} from "VSSPreview/Search/FuzzySearch"
import {PathSearchResultItem} from "VersionControl/Scenarios/Shared/Path/PathSearchResult";
import {localeIgnoreCaseComparer, localeComparer} from "VSS/Utils/String";

const pathSeparator = '/';

interface FolderItems {
    /**
     * Items present in the folder.
     */
    items: SearchableObject<PathSearchResultItem>[];

    /**
     * Base path of the folder with correct casing.
     */
    basePath: string;
}

/**
 * Strategy to provide navigational results ie. Folders or files in the present folder.
 * Assumption: File paths are case insensitive.
 */
export class InFolderSearchStrategy extends FuzzySearchStrategy<PathSearchResultItem> {
    private _allItems: SearchableObject<PathSearchResultItem>[];
    private _currentFolderPath: string;

    constructor(maxResults?: number) {
        // key is decided based upon the property present in PathSearchResult class
        super(undefined, {
            filterOptions: {
                pathSeparator: pathSeparator,
                maxResults: maxResults,
                key: 'path'
            }
        });

        this._allItems = [];
    }

    public processItems(objects: SearchableObject<PathSearchResultItem>[]): void {
        this._allItems = objects;
    }

    public clearStrategyStore(): void {
        super.clearStrategyStore();
        this._currentFolderPath = undefined;
        this._allItems = [];
    }

    public search(query: string): PathSearchResultItem[] {
        const trimmedQuery = query.trim();
        const parsedQuery = this._parsePathQuery(query);

        this._processItemsForPath(parsedQuery.basePath);

        const searchResults = super.search(parsedQuery.query)
            .map((item) => {
                return new PathSearchResultItem(this._currentFolderPath + item.path, item.isFolder);
            })
            .map((item) => {
                return new PathSearchResultItem(item.path, item.isFolder, this.getMatchingIndices(item, trimmedQuery));
            });

        if (!parsedQuery.query) {
            searchResults.sort(resultItemComparer);
        }

        return searchResults;
    }

    public dataExists(): boolean {
        return (Boolean(this._allItems) && Boolean(this._allItems.length));
    }

    /**
     * Updates base store with the objects present in the current folder.
     * And updates current folder path.
     */
    private _processItemsForPath(basePath: string): void {
        if (this._currentFolderPath != undefined && !localeIgnoreCaseComparer(this._currentFolderPath, basePath)) {
            return;
        }

        super.clearStrategyStore();

        const folderItems = InFolderSearchStrategy._getFolderItems(basePath, this._options.filterOptions.pathSeparator, this._allItems);
        this._currentFolderPath = folderItems.basePath;
        super.processItems(folderItems.items);
    }

    /**
     * Breaks query in basePath and query part. BasePath represents the current folder path.
     * @param path query path
     * @return Eg foo/bar/abc {basePath: foo/bar/, query: abc}
     */
    private _parsePathQuery(path: string): { basePath: string, query: string } {
        const result = { basePath: '', query: '' };

        if (!path) {
            return result;
        }

        path = trimAndConvertSlashes(path);

        const end = path.length - 1;
        const start = 0;

        // get position of last path seperator
        const basePosition = path.lastIndexOf(this._options.filterOptions.pathSeparator);

        if (basePosition < start) {
            // no seperator found, take entire path as query
            result.query = path;
        } else {
            result.basePath = path.substring(start, basePosition + 1);
            result.query = path.substring(basePosition + 1);
        }

        return result;
    }

    /**
     * Returns items(files/directories) present in the current folder.
     */
    private static _getFolderItems(
        folderPath: string,
        pathSeparator: string,
        searchableObjects: SearchableObject<PathSearchResultItem>[]): FolderItems {
        const folderItems: SearchableObject<PathSearchResultItem>[] = [];
        let correctlyCasedFolderPath = "";

        for (let i = 0; i < searchableObjects.length; i++) {
            const searchableObject = searchableObjects[i];
            const item = searchableObject.item;
            const itemPath = item.path;

            const lastSeperatorIndex = itemPath.lastIndexOf(pathSeparator);
            const itemNameStartIndex = lastSeperatorIndex === -1 ? 0 : lastSeperatorIndex + 1;
            const itemBasePath = itemPath.substring(0, itemNameStartIndex);

            if (localeIgnoreCaseComparer(folderPath, itemBasePath) === 0) {
                // Store the base path.
                if (!correctlyCasedFolderPath) {
                    correctlyCasedFolderPath = itemBasePath;
                }
                const folderItem = itemPath.substring(itemNameStartIndex, itemPath.length);
                folderItems.push(
                    new SearchableObject<PathSearchResultItem>(new PathSearchResultItem(folderItem, item.isFolder), [])
                );
            }
        }
        return {
            items: folderItems,
            basePath: correctlyCasedFolderPath || folderPath
        };
    }
}

// max data set size beyond which optimization will be applied
const maxItemsOptimizationLimit = 100000;

// reduce positive search candidates by this factor to optimize search performance
const maxInnersSearchFactor = .2;

/**
 * Strategy to provide path search results on all the files.
 */
export class GlobalSearchStrategy extends FuzzySearchStrategy<PathSearchResultItem> {
    private optimizationApplied = false;

    constructor(maxResults?: number) {
        // key is decided based upon the property present in PathSearchResult class
        super(undefined, {
            filterOptions: {
                pathSeparator: pathSeparator,
                maxResults: maxResults,
                key: 'path'
            }
        });
    }

    public search(query: string): PathSearchResultItem[] {
        const searchQuery = trimAndConvertSlashes(query.trim());

        if (!searchQuery) {
            return [];
        }

        if (!this.optimizationApplied &&
            this.getIndexTotalSize() > maxItemsOptimizationLimit) {
            const maxInners = Math.ceil(this.getIndexTotalSize() * maxInnersSearchFactor);
            const filterOptions = $.extend({}, this._options.filterOptions, { maxInners: maxInners });
            this._fuzzyFilter.setOptions(filterOptions);
            this.optimizationApplied = true;
        }

        return super.search(searchQuery)
            .map((item) => {
                return new PathSearchResultItem(item.path, item.isFolder, this.getMatchingIndices(item, searchQuery));
            }
        );
    }
}

/**
 * Create searchable path objects for VSS/Search/SearchCore
 * This method also extract folder paths using file paths
 * and include them in returned dataset
 *
 * @param filePaths fully qualified file paths
 */
export function createSearchablePathObjects(filePaths: string[]): SearchableObject<PathSearchResultItem>[] {
    const folderPathsLookup: IDictionaryStringTo<boolean> = {};
    const searchableObjects: SearchableObject<PathSearchResultItem>[] = [];

    const collectPath = (path: string, isFolder?: boolean) =>
        searchableObjects.push(new SearchableObject(new PathSearchResultItem(path, isFolder), []));

    for (const path of filePaths) {
        collectPath(path);
        let start = path.length - 1;
        let pos;

        // extract folder paths
        while ((pos = path.lastIndexOf(pathSeparator, start)) > 0) {
            const folderPath = path.substring(0, pos);
            // we already have this folder and its parents
            if (folderPathsLookup[folderPath]) {
                break;
            }
            folderPathsLookup[folderPath] = true;
            collectPath(folderPath, true);
            start = pos - 1;
        }
    }

    return searchableObjects;
}

/**
 * This method does following two things:-
 *  1. Converts backslashes to forwardslashes
 *  2. Removes leading slashes.
 * @param searchQuery
 */
function trimAndConvertSlashes(searchQuery: string): string {
    if (searchQuery == undefined) {
        throw new Error("searchQuery cannot be null/undefined.");
    }

    // Convert backslashes to forwardslashes
    searchQuery = searchQuery.replace(/\\/g, "\/");

    // Remove leading forward slashes.
    return searchQuery.replace(/^[\/]+/, "");
}

function resultItemComparer(first: PathSearchResultItem, second: PathSearchResultItem): number {
    if (first.isFolder === second.isFolder) {
        return localeComparer(first.path, second.path);
    }
    else if (first.isFolder) {
        return -1;
    }

    return 1;
}
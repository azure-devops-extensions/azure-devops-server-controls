
import Diag = require("VSS/Diag");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;

export class SearchCore<T> {

    private _strategy: SearchStrategy<T>;
    private _adapter: SearchAdapter<T>;

    /**
     * The search core, allows users to perform searches on data using a custom strategy.
     * 
     * @param strategy The search strategy to use.
     * @param adapter The search adapter to use.
     */
    constructor(strategy: SearchStrategy<T>, adapter: SearchAdapter<T>) {
        Diag.Debug.assertParamIsObject(strategy, "strategy");
        Diag.Debug.assertParamIsObject(adapter, "adapter");

        this._strategy = strategy;
        this._adapter = adapter;
    }

    /**
     * Add items to the search strategy
     * 
     * @param items Items to add
     */
    public addItems(items: SearchableObject<T>[]) {
        Diag.Debug.assertParamIsArray(items, "items");

        Diag.measurePerformance(() => {
            this._strategy.processItems(items);
        }, "[SearchCore] Index Building Time");
        Diag.logTracePoint("SearchCore.finishIndexing");
    }
     
    /**
     * Performs a search using the Indexer and then runs the adapter's resultHandler on the results
     * 
     * @param query Query to run search on
     */
    public beginSearch(query: string): T[] {

        Diag.Debug.assertParamIsString(query, "query");

        // Get more items from the search adapter if we need to
        if (!this._adapter.isDataSetComplete()) {
            this._adapter.addMoreItems(delegate(this, this.addItems), () => { this.beginSearch(query); });
        }

        var searchResults: T[];
        Diag.measurePerformance(() => {
            searchResults = this._strategy.search(query);
        }, "[SearchCore] Search Time");

        this._adapter.handleResults(searchResults, true, query);
        return searchResults;
    }

    /**
     * Returns the search strategy currently being used.
     * 
     * @return The strategy in use
     */
    public getStrategy(): SearchStrategy<T> {

        return this._strategy;
    }

    /**
     * Clears the stored items in the strategy
     */
    public clearStrategyStore() {
        this.getStrategy().clearStrategyStore();
    }
}

export interface ISearchStrategyOptions<T> {
    specialCharacters?: string[];
    delimiter?: string | RegExp;
    comparer?: IComparer<T>;
}

export class SearchStrategy<T> {

    /**
     * Tokenizes the searchText into separate words using a regex. Empty terms ("") will not be returned.
     * 
     * @param searchText The searchText to split up.
     * @param delimiter The string or regex delimiter to use to split up the search terms
     * @return An array of strings, the separate words.
     */
    public static getTerms(searchText: string[], delimiter?: string | RegExp): string[] {
        Diag.Debug.assertParamIsArray(searchText, "searchText");

        var terms = new Object(void 0);

        for (let text of searchText) {
            // String casting here is to get around issue where lib.d.ts has separate overloads for string.split instead of one for string | RegExp
            var queryTerms = text.toLocaleLowerCase().split(<string>delimiter || " ");

            for (let i = 0, l = queryTerms.length; i < l; i++) {
                if (queryTerms[i]) {
                    terms[queryTerms[i]] = true;
                }
            }
        }

        return Object.keys(terms);
    }

    protected _options: ISearchStrategyOptions<T>;

    // Words starting with special characters should be indexed as normal with an additional index entry omitting the
    // special character. E.g. "[Title" => "[Title" and "Title"
    private _specialCharactersHashSet: IDictionaryStringTo<boolean>;

    /**
     * Abstract Class to inherit from in order to implement the methods needed to store items and search on them.
     */
    constructor(options?: ISearchStrategyOptions<T>) {
        this._options = $.extend({}, options);

        if (this._options.specialCharacters && this._options.specialCharacters.length) {
            this._buildSpecialCharacterHashSet(this._options.specialCharacters);
        }
    }

    private _buildSpecialCharacterHashSet(specialCharacters: string[]) {
        this._specialCharactersHashSet = {};

        for (let char of specialCharacters) {
            this._specialCharactersHashSet[char.toLocaleLowerCase()] = true;
        }
    }

    public _getTerms(searchTerms: string[]): string[] {
        var terms = SearchStrategy.getTerms(searchTerms, this._options.delimiter);

        if (this._specialCharactersHashSet) {
            // If the term has leading special characters we need to also add the term after stripping them
            for (let term of terms) {
                var trimIndex = 0
                var termLength = term.length;

                while (trimIndex < termLength && this._specialCharactersHashSet.hasOwnProperty(term[trimIndex])) {
                    trimIndex++;
                }

                if (trimIndex > 0 && trimIndex < termLength) {
                    terms.push(term.substr(trimIndex));
                }
            }
        }

        return terms;
    }

    /**
     *     Stores items and terms for each item in order to later retrieve
     *     and search upon.
     * 
     * @param searchableObjects SearchableObjects to add
     */
    public processItems(searchableObjects: SearchableObject<T>[]) {

        Diag.Debug.fail("processItems must be overridden by derived classes");
    }

    /**
     * Clears the items stored in the strategy.
     */
    public clearStrategyStore() {
        Diag.Debug.fail("clearStrategyStore must be overridden by derived classes");
    }

    /**
     *     Searches the item store for the query given to it. Returns an
     *     array of documents representing the documents which match the query.
     * 
     * @param query The query to search for
     * @return The list of items which match the query
     */
    public search(query: string): T[] {
        Diag.Debug.fail("search must be overridden by derived classes");

        return [];
    }

    /**
     * Checks whether data exists in the search strategy
     * 
     * @return True if data exists in the strategy, false if it doesn't.
     */
    public dataExists(): boolean {
        Diag.Debug.fail("dataExists must be overridden by derived classes");

        return false;
    }

    /**
     * Return the total count of item indexed.
     */
    public getIndexedItemsCount(): number {
        Diag.Debug.fail("getIndexedItemsCount must be overridden by derived classes");
        return 0;
    }

    /**
     * Return the total size of the indexed store.
     */
    public getIndexTotalSize(): number {
        Diag.Debug.fail("getIndexTotalSize must be overridden by derived classes");
        return 0;
    }
}

export class IndexedSearchStrategy<T> extends SearchStrategy<T> {

    private _searchStore: IndexedSearchStore<T>;
    private _dataExists: boolean;
    private _indexedItems: T[];

    constructor(store?: IndexedSearchStore<T>, options?: ISearchStrategyOptions<T>) {
        /**
         * Provides search capabilities using an inverted index (or another index provided).
         * 
         * @param store The indexed storage mechanism
         * @param options Options to customize this search strategy
         */
        super(options);

        // Default to TRIE Index store if no store is defined
        if (store) {
            this._searchStore = store;
        } else {
            // TODO: For now we are passing the delimiter through to the Store to do its own tokenization. We should allow for separate tokenization
            // of search input and search results. Also, Store should not be calling SearchStrategy.getTerms() from within its scope.
            var storeOptions: IndexedSearchStoreOptions<T> = { comparer: this._options.comparer };
            if (options && options.delimiter) {
                storeOptions.delimiter = options.delimiter;
            }
            this._searchStore = new TrieStore(storeOptions);
        }

        this._dataExists = false;
        this._indexedItems = [];
    }

    public getIndexTotalSize(): number {
        return this._searchStore.getStoreTotalSize();
    }

    /**
     * Clears the items stored in the strategy.
     */
    public clearStrategyStore() {

        // Reset the indexed item cache and data exists boolean
        this._dataExists = false;
        this._indexedItems = [];
        this._searchStore.clearStrategyStore();
    }

    /**
     * Return the total count of item indexed.
     */
    public getIndexedItemsCount(): number {
        return this._indexedItems.length;
    }

    /**
     * Processes all SearchableObjects and adds them to the index
     * 
     * @param searchableObjects SearchableObjects to add
     */
    public processItems(searchableObjects: SearchableObject<T>[]) {
        Diag.Debug.assertParamIsArray(searchableObjects, "items");

        var termCount = 0;

        for (let searchableObject of searchableObjects) {
            Diag.Debug.assertIsNotNull(searchableObject.item, "No Item Information");
            Diag.Debug.assertIsArray(searchableObject.terms, "No term(s) in SearchableObject");

            if (searchableObject.terms.length !== 0) {
                if (this._searchStore.addToIndex(searchableObject.item, this._getTerms(searchableObject.terms))) {
                    this._indexedItems.push(searchableObject.item);
                    termCount += searchableObject.terms.length;
                }
            }
        }

        this._dataExists = true;
    }

    /**
     * Performs a search using the Indexer and then runs the resultHandler on the results.
     * 
     * @param query Query to run search on
     * @return The search results
     */
    public search(query: string): T[] {
        Diag.Debug.assertParamIsString(query, "query");

        // Strip leading spaces from the query
        var strippedQuery = $.trim(query);

        if (strippedQuery === "") {
            return this._indexedItems;
        }

        // Return the results from the Search Store.
        return this._searchStore.search(strippedQuery);
    }

    /**
     * Checks whether data exists in the search strategy
     * 
     * @return True if data exists in the strategy, false if it doesn't.
     */
    public dataExists(): boolean {

        return this._dataExists;
    }
}

export interface IndexedSearchStoreOptions<T> {
    delimiter?: string | RegExp;
    comparer?: IComparer<T>;
}

export class IndexedSearchStore<T> {

    protected _options: IndexedSearchStoreOptions<T>;
    protected _comparer: IComparer<T>;

    /**
     *  Abstract function allowing for additional stores for an IndexedSearchStrategy
     */
    constructor(options?: IndexedSearchStoreOptions<T>) {
        this._options = options || {};
        this._comparer = this._options.comparer;
    }

    /**
     * Runs a query on the index.
     * 
     * @param query The query to run.
     * @return An array of items, representing the results.
     */
    public search(query: string): T[] {
        Diag.Debug.fail("search must be overridden by derived classes");

        return [];
    }

    /**
     * Adds an item to the index, under its token and its subparts.
     * 
     * @param item The item to add to the index.
     * @param tokens The tokens to add the item under.
     * @returns true if the item was added to the index, false if it was already in the index
     */
    public addToIndex(item: T, tokens: string[]): boolean {
        Diag.Debug.fail("addToIndex must be overridden by derived classes");
        return false;
    }

    /**
     * Clears the items stored in the strategy.
     */
    public clearStrategyStore() {
        Diag.Debug.fail("clearStrategyStore must be overriden by derived classes");
    }

    /**
     * totalsize of the index store
     */
    public getStoreTotalSize(): number {
        Diag.Debug.fail("getStoreTotalSize must be overriden by derived classes");
        return 0;
    }

}

/**
 * The class for the single node in a TRIE, which is being used in the TRIE store.
 */
class TrieNode<T> {
    public children: { [id: string]: TrieNode<T> } = {};
    public content: T[] = [];

    constructor(content?: T) {
        if (content) {
            this.content.push(content);
        }
    }
}

/**
 * The class for the TRIE, which is being used in the TRIE store.
 */
class Trie<T> {
    private root: TrieNode<T> = new TrieNode<T>();
    private _comparer: IComparer<T>;
    private _trieSize: number;
    private SIZEOF_KEY: number = 2;
    private SIZEOF_NUMBER: number = 8;

    constructor(comparer: IComparer<T>) {
        this._comparer = comparer;
        this._trieSize = 0;
    }

    /**
     * Adds an item to the index
     * @param key The value to index the item inder
     * @param content
     * @returns true if added, false if already was in the trie under the given key
     */
    public insert(key: string, content: T): boolean {
        var node = this.root;
        var i = 0;
        var n = key.length;
        var newNode: TrieNode<T>;
        var childNode: TrieNode<T>;

        // Traverse through existing prefix nodes
        for (; i < n; ++i) {
            childNode = node.children[key[i]];
            if (childNode) {
                node = childNode;
            } else {
                break;
            }
        }

        // Build the remainder of the prefix nodes (that are not already in the trie)
        for (; i < n; ++i) {
            newNode = new TrieNode<T>();
            this._trieSize += this.SIZEOF_KEY;
            node.children[key[i]] = newNode;
            node = newNode;
        }

        var added = false;

        if (node.content.indexOf(content) === -1) {  // object-equality is ok here. Don't use the comparer - too slow
            node.content.push(content);
            this._trieSize += this.SIZEOF_NUMBER;
            added = true;
        }

        return added;
    }
        
    /**
     * Find a string (value) into the TRIE store. Return all the IDs which contains the value
     * @param key The index value to search for
     */
    public find(key: string): T[] {
        var node: TrieNode<T> = this.root;

        for (var i = 0, n = key.length; i < n; ++i) {
            var c: string = key[i];
            if (node.children[c]) {
                node = node.children[c];
            } else {
                return null;
            }
        }

        return this._getAllDescendantContent(node);
    }

    private _getAllDescendantContent(node: TrieNode<T>): T[] {
        var stack: TrieNode<T>[] = [];
        var results: T[] = [];
        var current: TrieNode<T>;

        // Depth-first-traversal of the Trie
        stack.push(node);
        while (stack.length) {
            current = stack.pop();
            if (current.content && current.content.length) {
                results = results.concat(current.content);
            }
            if (current.children) {
                for (let child in current.children) {
                    stack.push(current.children[child]);
                }
            }
        }

        // Fast sort and filter the results to get a unique set of items.
        // (an item may have appeared multiple times in the decendent content
        // if it was indexed under multiple keys)
        return fastUnique(results, this._comparer);
    }

    public clear() {
        this.root = new TrieNode<T>();
        this._trieSize = 0;
    }

    public getTrieTotalSize(): number {
        return this._trieSize;
    }
}

export class TrieStore<T> extends IndexedSearchStore<T> {
    private _trie: Trie<T>;

    constructor(options?: IndexedSearchStoreOptions<T>) {
        super(options);
        this._trie = new Trie<T>(this._comparer);
    }

    public search(query: string): T[] {
        var terms = SearchStrategy.getTerms([query], this._options.delimiter);
        var results: T[] = [];

        for (let term of terms) {
            Diag.Debug.assertIsStringNotEmpty(term, "The search terms should not be empty string");
            if (term) {
                var resultDocuments = this._trie.find(term);

                // Result actually exists, add to SearchResult
                if (resultDocuments) {
                    if (results.length === 0) {
                        results = resultDocuments;
                    } else {
                        results = Utils_Array.intersectUniqueSorted(results, resultDocuments, this._comparer);
                    }
                } else {
                    // One of our terms returned no results, return no results for query
                    results = [];
                }
                if (results.length === 0) {
                    break;
                }
            }
        }

        // No need to sort the results or remove duplicates here. Both trie.find and
        // Utils_Array.intersectUniqueSorted will return unique, sorted output.
        return results;
    }

    /**
     * Adds an item to the index, under its token and its subparts.
     * 
     * @param item The item to add to the index.
     * @param tokens The tokens to add the item under.
     * @returns true if the item was added to the index, false if it was already in the index
     */
    public addToIndex(item: T, tokens: string[]): boolean {
        Diag.Debug.assertParamIsNotNull(item, "item");
        Diag.Debug.assertParamIsArray(tokens, "tokens");

        var addedToIndex = true;

        for (let token of tokens) {
            Diag.Debug.assertIsStringNotEmpty(token, "Shouldn't be indexing items against an empty string");
            if (!this._trie.insert(token, item)) {
                addedToIndex = false;
            }
        }

        return addedToIndex;
    }

    public clearStrategyStore() {
        this._trie.clear();
    }

    public getStoreTotalSize(): number {
        return this._trie.getTrieTotalSize();
    }
}

export class InvertedIndexStore<T> extends IndexedSearchStore<T> {

    private _index: IDictionaryStringTo<T[]>;
    private _tokenCache: IDictionaryStringTo<string[]>;

    constructor(options?: IndexedSearchStoreOptions<T>) {
        /**
         *     Indexes documents and terms in an inverted index.
         *     Index is in form:
         *         _index[token] = [document]
         *         where token is a term or part of a term, and document is a unique item stored.
         */
        super(options);

        this._index = {};
        this._tokenCache = {};
    }

    /**
     * Runs a query on the index.
     * 
     * @param query The query to run.
     * @return An array of items, representing the results.
     */
    public search(query: string): T[] {
        Diag.Debug.assertParamIsString(query, "query");

        var terms = SearchStrategy.getTerms([query], this._options.delimiter);
        var results: T[] = [];

        for (let term of terms) {
            var resultDocuments = this._index[term];

            // Result actually exists, add to SearchResult
            if (resultDocuments) {
                if (results.length === 0) {
                    results = resultDocuments;
                } else {
                    results = Utils_Array.intersect(results, resultDocuments, this._comparer);
                }
            } else {
                // One of our terms returned no results, return no results for query
                results = [];
                break;
            }
        }

        return fastUnique(results, this._comparer);
    }

    /**
     * Adds an item to the index, under its token and its subparts.
     * 
     * @param item The item to add to the index.
     * @param tokens The tokens to add the item under.
     * @returns true if the item was added to the index, false if it was already in the index
     */
    public addToIndex(item: T, tokens: string[]): boolean {
        Diag.Debug.assertParamIsNotNull(item, "item");
        Diag.Debug.assertParamIsArray(tokens, "tokens");

        var addedToIndex = true;

        if (tokens) {
            for (let token of tokens) {
                let substrings: string[] = [];

                if (token) {
                    // Add the base token
                    if (!this._addItemToIndex(item, token)) {
                        addedToIndex = false;
                    }

                    // Split up the token into its substrings to search beginning of words
                    // This is retrieved from the cache if available to speed up indexing
                    if (this._tokenCache[token]) {
                        substrings = this._tokenCache[token];
                    } else {
                        var tokenLength = token.length;
                        for (var j = 1; j < tokenLength; j++) {
                            substrings.push(token.substring(0, j));
                        }
                        this._tokenCache[token] = substrings;
                    }

                    // Add the substrings to the index
                    if (substrings) {
                        for (let substring of substrings) {
                            if (!this._addItemToIndex(item, substring)) {
                                addedToIndex = false;
                            }
                        }
                    }
                }
            }
        }

        return addedToIndex;
    }

    /**
     * Clears the items stored in the strategy.
     */
    public clearStrategyStore() {
        this._index = {};
    }

    /**
     * Adds a item to the index, under a single key's location.
     * 
     * @param item The item to add.
     * @param key The key to add the item under
     * @returns true if the item was added to the index, false if it was already in the index under the given key
     */
    private _addItemToIndex(item: T, key: string): boolean {
        Diag.Debug.assertParamIsNotNull(item, "item");
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");

        var added = false;
        var indexEntry = this._index[key];

        if (!indexEntry) {
            // There's nothing under the index, so create an array there
            indexEntry = [];
            this._index[key] = indexEntry;
        }

        // Push the document into the array at the location if it doesn't exist
        if (indexEntry.indexOf(item) === -1) {
            indexEntry.push(item);
            added = true;
        }

        return added;
    }
}

export class SearchAdapter<T> {

    /**
     * Abstract Class to inherit from in order to implement the UI methods for search.
     */
    constructor() {
    }

    /**
     * Adds additional items to the search strategy
     * 
     * @param addItemsCallback The function which adds items to the search strategy.
     * @param searchCallback The function which searches the newly updated strategy.
     */
    public addMoreItems(addItemsCallback: (items: SearchableObject<T>[]) => void, searchCallback: () => void) {
        Diag.Debug.fail("addMoreItems must be overriden by derived classes");
    }

    /**
     * Creates SearchableObjects for all available work items
     * 
     * @return An array of SearchableObjects.
     */
    public createSearchableObjects(): SearchableObject<T>[] {
        Diag.Debug.fail("createIndexObjects must be overriden by derived classes");
        return [];
    }

    /**
     *     Handles the results in the UI by filtering through all available items to the ones
     *     provided in the results array.
     * 
     * @param results An array of items
     * @param finished Represents whether or not the search is finished
     * @param query search query
     */
    public handleResults(results: T[], finished: boolean, query?: string) {
        Diag.Debug.fail("handleResults must be overridden by derived classes");
    }

    /**
     *     Handles an error being thrown in the search process.
     * 
     * @param message Specific error message if provided.
     */
    public handleError(message: string) {
        Diag.Debug.fail("handleError must be overridden by derived classes");
    }

    /**
     *     Handles the search results being cleared and the view resetting to normal.
     */
    public handleClear() {
        Diag.Debug.fail("handleClear must be overridden by derived classes");
    }

    /**
     *     Returns whether or not there is more data to be loaded.
     * 
     * @return True if no more data needs to be loaded, false otherwise
     */
    public isDataSetComplete(): boolean {
        Diag.Debug.fail("isDataSetComplete must be overridden by derived classes");
        return false;
    }
}

export class SearchableObject<T> {

    public item: T;
    public terms: string[];

    /**
     * Represents a single item to be placed in the index.
     * 
     * @param item The item to be added
     * @param terms The terms associated to the item.
     */
    constructor(item: T, terms: string[]) {
        Diag.Debug.assertParamIsNotNull(item, "item");
        Diag.Debug.assertParamIsArray(terms, "terms");

        this.item = item;
        this.terms = terms;
    }

    /**
     * Set the terms for this item
     * 
     * @param terms The new terms
     */
    public setTerms(terms: string[]) {
        Diag.Debug.assertParamIsArray(terms, "terms");

        this.terms = terms;
    }

    /**
     * Add a term to the item
     * 
     * @param term The additional term
     */
    public addTerm(term: string) {
        Diag.Debug.assertParamIsString(term, "term");

        this.terms.push(term);
    }
}

/**
 * Return the unique (and sorted) elements of an array. 
 * @param data The array to sort and filter down to unique items
 * @param comparer Comparer for objects of type T. If T is a primitive type, then the comparer can be null/undefined
 */
export function fastUnique<T>(data: T[], comparer?: IComparer<T>): T[] {
    var length = data.length;
    if (length > 1) {

        data.sort(comparer);

        // pre-allocate array to avoid memory re-allocation during pushes
        var uniqueData = new Array(length);
        uniqueData[0] = data[0];
        var indexOfLastUniqueData = 0;
        var uniqueDataInsertIndex = 1;

        for (let i = 1; i < length; i++) {
            if (data[i] !== data[indexOfLastUniqueData]) {  // object equality is ok here - don't need to use the comparer
                uniqueData[uniqueDataInsertIndex++] = data[i];
                indexOfLastUniqueData = i;
            }
        }

        // truncate the array now with the full list of unique values
        uniqueData.length = uniqueDataInsertIndex;

        data = uniqueData;
    }

    return data;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.Search", exports);

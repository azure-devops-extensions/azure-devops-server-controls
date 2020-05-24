export interface IMentionAutocompleteFooterProps {
    /**
     * Status text.
     */
    statusText: string;

    /**
     * Whether to show search button in the footer.
     */
    showSearchButton?: boolean;

    /**
     * Search button id.
     */
    searchButtonId?: string;

    /**
     * Whether to highlight search button in the footer.
     */
    hightlightSearchButton?: boolean;

    /**
     * Called when the search button is clicked.
     */
    onSearchButtonClick?: () => void;


    /**
     * The input element that the autocomplete is attached to.
     * Providing this to the footer will cause it to be re-focused when the search button is clicked.
     */
    getInputElement?: () => HTMLElement;
}
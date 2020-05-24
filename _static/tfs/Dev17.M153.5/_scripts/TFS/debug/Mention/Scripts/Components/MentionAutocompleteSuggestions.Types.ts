import * as React from "react";
import { IBaseProps } from "OfficeFabric/Utilities";
import { IMentionAutocompleteItem } from "Mention/Scripts/Components/MentionAutocomplete.Types";

export interface IMentionAutocompleteSuggestionsProps<T> extends IBaseProps<T> {
    /**
     * Called when rendering the suggestion item
     */
    onRenderSuggestionItem: (item: IMentionAutocompleteItem<T>) => JSX.Element;

    /**
     * Called when suggestion item is clicked
     */
    onSuggestionClick: (event?: React.MouseEvent<HTMLElement>, item?: IMentionAutocompleteItem<T>, index?: number, isSearchEnabled?: boolean) => void;

    /**
     * The input element that the suggestions is watching on changes.
     * 
     * Note: Component only initialize input element during the constructor due the nature of mention scenario.
     * Props change will not result in any update to the already initialized input element.
     */
    getInputElement: () => HTMLElement;

    /**
     * Whether to show search button in the footer.
     */
    showSearchButton?: boolean;

    /**
     * Called when the search button is clicked.
     */
    onSearchEnabled?: () => PromiseLike<IMentionAutocompleteItem<T>[]>;
}

export interface IMentionAutocompleteSuggestions<T> {
    /**
     * Gets the selected suggestion.
     */
    getCurrentSuggestion(): IMentionAutocompleteItem<T>;

    /**
     * Gets the selected index.
     */
    getCurrentIndex(): number;

    /**
     * Selects the next suggestion.
     */
    nextSuggestion(): void;

    /**
     * Selects the previous suggestion.
     */
    previousSuggestion(): void;

    /**
     * Updates the suggestions.
     * @param suggestionsPromise The promises that returns the list of suggestions
     */
    updateSuggestions(suggestionsPromise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>): void;

    /**
     * Tries to enables search.
     */
    tryEnableSearch(): boolean;

    /**
     * Indicates whether the search is enabled.
     */
    isSearchEnabled(): boolean;

    /**
     * Disables search.
     */
    disableSearch(): void;
}
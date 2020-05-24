import { IBaseProps } from "OfficeFabric/Utilities";

export interface IMentionAutocompleteProps<T> extends IBaseProps<T> {
    /**
     * Element that the callout will pin to.
     * 
     * Note: Component only initialize input element during the constructor due the nature of mention scenario.
     * Props change will not result in any update to the already initialized input element.
     */
    getInputElement: () => HTMLElement;

    /**
     * Called when the picker items are rendered.
     */
    onRenderItem: (item: IMentionAutocompleteItem<T>) => JSX.Element;

    /**
    * Called when the picker is opened.
    */
    onOpen?: (event?: Event) => void;

    /**
     * Called when the picker is closed.
     */
    onClose?: (event?: Event) => void;

    /**
     * Called when a picker item is selected.
     */
    onItemSelected?: (event?: KeyboardEvent | MouseEvent, item?: IMentionAutocompleteItem<T>, index?: number, isSearchEnabled?: boolean) => void;

    /**
     * Shows search button in the footer.
     * Once the button is clicked, input changes will call onSearch callback to get suggestions instead until the callout is closed.
     */
    showSearchButton?: boolean;

    /**
     * Called when the search button is clicked.
     */
    onSearchEnabled?: () => PromiseLike<IMentionAutocompleteItem<T>[]>;

    /**
     * Sets a fixed width for the autocomplete. The width of pinned target will be used if not specified.
     */
    width?: number;

    /**
     * Sets minimal width of the autocomplete. The default minimal width will be used if not specified and the minimal width will be ignored if a fixed width is set.
     */
    minimalWidth?: number;
}

export interface IMentionAutocomplete<T> {
    /**
     * Opens the picker.
     */
    open(event?: Event): void;

    /**
     * Closes the picker.
     */
    close(event?: Event): void;

    /**
     * Toggles the picker - opens it if it is currently closed and closes it if it is currently empty.
     */
    toggle(event?: Event): void;

    /**
     * Returns true if the picker is currently open.
     */
    isOpen(): boolean;

    /**
     * Updates the suggestions.
     * @param suggestionsPromise The promises that returns the list of suggestions
     */
    updateSuggestions(suggestionsPromise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>): void;

    /**
     * Handles the keyboard event.
     */
    handleKeyboardEvent(event: KeyboardEvent): void;

    /**
     * Disables search.
     */
    disableSearch(): void;
}

export interface IMentionAutocompleteItem<T> {
    /**
     * The key of the mention autocomplete item and it is used as an uniqueidentifier of the individual item in the list.
     */
    key: string;

    /**
     * The item data which will be used to render the item
     */
    data: T;
}
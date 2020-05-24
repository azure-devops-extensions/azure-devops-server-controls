import { ISearchInput } from "Search/Scenarios/Shared/Components/SearchInput/SearchInput.Props";

/**
 * An ISearchFilter is used to describe a filter that can be applied to the
 * search condition to limit the search scope.
 *
 * If the filter has a hint it will be shown next to the filter and is intended
 * to help the consumer understand how the filter applies to the scope.
 * If the filter has a hint, the filter will be on a line by itself.
 */
export interface ISearchFilter {

    /**
     * This is the filter text that will be added to the search input.
     */
    text: string;

    /**
     * This is a hint string to help the consumer understand what the filter
     * will do to the search.
     */
    hint?: string;

    /**
    * Short hand text for the given filter. This takes precedences over text whenver the item is selected.
    */
    shortcutText?: string;

    /**
    * Delegate to fetch the final text to be used as suggestion.
    */
    getSuggestedText?: (currentString: string, filterText: string) => string;

    /**
    * If true, then upon filter selection entire text in the input box will be replaced by help text.
    */
    replaceText?: boolean;
}

/**
 * A set of search filters can be grouped together to help the consumer
 * understand a set of related filters.
 */
export interface ISearchFilterGroup {

    /**
     * The caption for the filter group should describe the how the set of
     * filters apply to the search.
     */
    caption: string;

    /**
     * The filters are the set of search filters that belong to this filter
     * group. They will be shown in the order listed in the array.
     */
    filters: ISearchFilter[];

    /**
     * An example can be given that uses one or more of the filters.
     */
    example?: string;

    /**
     * If a group has a footer it is drawn below the list of filters. This is
     * done for both single and multi line groups.
     */
    footer?: string;

    /**
     * If the group is marked a "singleLine" group, each of the filters will
     * be rendered on a single line. It will wrap as too many filters are shown.
     * no hints for the filters are shown in this mode.
     */
    singleLine?: boolean;
}

/**
 * The SearchInputComponent will show custom help for a given provider
 */
export interface ISearchHelpComponentProps {

    /**
     * The help will show a series of filter groups in the component. They will
     * be shown in the order of the array.
     */
    filterGroups: ISearchFilterGroup[];

    /**
    * text based on which the the list is being filtered.
    */
    filterText?: string;

    /**
    * Search box instance to update and fetch the input text.
    */
    searchInput?: ISearchInput;

    /**
     * An optional help link that will be shown. The link will open detailed
     * search help in a new window. This will prevent the consumer from being
     * navigated away from the current state of the page.
     */
    helpLink?: string;

    /**
    * Invoked upon filter activation in the help component.
    */
    onItemActivated?: (item: ISearchFilter) => void;

    /**
    * Invoked if help needs to be dismissed.
    */
    onDismiss?: () => void;

    /**
    * Call back to provide the caller with a reference to Help component reference.
    */
    componentRef?: (ref: IFocusable) => void;

    /**
    * Optional call back to render the filter names. Could be used for highlighting the hit text.
    */
    onRenderFilterText?: (filter: ISearchFilter, filterText: string) => JSX.Element | string;
}

export interface SearchFilterGroupComponentProps {
    filterGroup: ISearchFilterGroup;

    filterText: string;
    
    searchInput: ISearchInput;

    onItemActivated?: (item: ISearchFilter) => void;

    onRenderFilterText?: (filter: ISearchFilter, filterText: string) => JSX.Element | string;
}


export interface SearchFilterComponentProps {
    filter: ISearchFilter;

    searchInput: ISearchInput;

    filterText: string;

    onItemActivated?: (item: ISearchFilter) => void;

    onRenderFilterText?: (filter: ISearchFilter, filterText: string) => JSX.Element | string;
}

export interface IFocusable {
    focus(): void;
}
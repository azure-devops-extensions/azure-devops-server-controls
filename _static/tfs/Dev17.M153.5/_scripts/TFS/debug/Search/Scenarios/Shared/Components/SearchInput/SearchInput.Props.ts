export interface ISearchInputProps {
    /**
    * Label to notify whether it is account or project context.
    */
    contextLabel: string;

    /**
    * search text to be shown to the user.
    */
    defaultSearchText: string;

    /**
    * Watermark text in case there is not text to show.
    */
    placeholderText: string;

    /**
    * aria-label property for the input mentioning the entity and context
    * at which search is being performed.
    */
    inputAriaLabel: string;

    /**
    * Delegate invoked on search action.
    */
    onExecuteSearch: (searchText: string, openInNewTab: boolean) => void;
    
    /**
    * Delegate invoked whenever the text in the input box changes.
    */
    onInputChange?: (searchText: string, caretPos: number) => void;

    /**
    * If true, component will try to bring up the help popup, if any.
    */
    showHelp?: boolean;

    /**
    * Delegate invoked when the help pop up needs to be dismissed.
    */
    onDismissHelp?: () => void;
    
    /**
    * Delegate invoked when the help pop up needs to be shown.
    */
    onShowHelp?: () => void;

    /**
    * Delegate invoked when the text in the search input box is cleared out.
    */
    onRemoveText?: () => void;
}

export interface ISearchInput {
    updateText: (text: string, replace?: boolean) => void;

    getText: () => string;
}
export interface INavigationProps {
    /** Optional handler to call after navigation happened */
    postNavigation?: (item: INavigationItem) => void;
}

export interface INavigationItem {
    /** Id of the navigation item. By default will be used to navigate to this item if there are no sub-items */
    id?: string;

    /** Optional href to navigate to */
    href?: string;

    /** If it's an external item, href will be opened when navigation item is triggered */
    external?: boolean;

    /** Optional callback to trigger when item is selected */
    onClick?: (item: INavigationItem) => void;

    /** Optional icon to display */
    icon?: string;

    /** Title to show for item */
    title?: string;

    /** Optional aria label */
    ariaLabel?: string;

    /** Sub menu items */
    items?: INavigationItem[];

    /** If the item is collapsible, should it be expanded by default */
    initialExpanded?: boolean;
}

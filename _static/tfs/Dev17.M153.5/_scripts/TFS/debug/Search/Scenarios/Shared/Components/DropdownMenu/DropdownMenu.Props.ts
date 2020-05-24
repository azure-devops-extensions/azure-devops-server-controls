import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

export enum LoadState {
    Loading = 1,

    Loaded = 2,

    LoadFailed = 3,
}

export interface IDropdownMenuProps {
    /**
    * CSS class for the component
    */
    className: string

    /**
    * Items present in the dropdown
    */
    items: IContextualMenuItem[];

    /**
    * Active dropdown menu signifies that the dropdown is visible
    */
    active: boolean;

    /**
    * Loading message and spinner icon is shown in the dropdown menu if this value is set as true
    */
    loadState: LoadState;

    /**
    * Aria label for the menu button
    */
    menuButtonAriaLabel: string;

    /**
    * Display message shown on the component
    */
    menuButtonLabel: string;

    /**
    * Callback triggered when the menu is dismissed
    */
    onDismiss: () => void;

    /**
    * Callback triggered when the menu button is clicked
    */
    onMenuButtonClick: () => void;
}

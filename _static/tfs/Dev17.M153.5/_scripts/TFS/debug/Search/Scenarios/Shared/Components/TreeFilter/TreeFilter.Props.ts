import * as _TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as _FocusZone from 'OfficeFabric/FocusZone';
import * as _PathTree from "Presentation/Scripts/TFS/Components/Tree/Tree";
import * as _SparseTreeStore from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore"

export enum ContentLoadState {
    Loading = 1,

    LoadSuccess = 2,

    LoadFailed = 4
}

export interface ITreeFilterProps {
    /**
     * A unique string which represents the Pick list control.
     */
    name: string;

    /**
     * True when the control is enabled, false otherwise.
     */
    enabled: boolean;

    /**
     * True when search within items is enabled, false otherwise.
     */
    searchable: boolean;

    /**
     * Items to be shown in the tree view
     */
    items: _TreeStore.IItem[];

    /**
     * The left hand side part of full string labelled as button text.
     * 
     */
    label: string;

    /**
    * Defines whether the content load has finished, is in progress, or failed.
    */
    contentLoadState: ContentLoadState;

    /**
    * Aria label for clear text icon in the search box.
    */
    searchBoxClearTextAriaLabel: string;

    /**
    * Aria label for apply path button.
    */
    applyButtonAriaLabel: string;

    /**
    * Default applied path
    */
    defaultPath: string;

    /**
    * Delimeter between components of a path.
    */
    pathSeparator: string;

    /**
    * Delegate invoked whenever a node in tree view is expanded
    */
    onItemExpand: (path: string) => void;

    /**
    * Delegate invoked whenever a node in tree view is collapsed
    */
    onItemCollapse: (path: string) => void;

    /**
    * Delegate invoked whenever a node in tree view is selected
    */
    onItemSelected: (name: string, path: string) => void;

    /**
    * Delegate invoked to know if the node in tree view is expandible/collapsible
    */
    onGetItemIsCollapsible: (item: _TreeStore.IItem) => boolean;

    /**
    * Delegate invoked to render the tree cell.
    */
    onTreeItemRender: (item: _TreeStore.IItem, isActive: boolean, highlightText?: string) => JSX.Element;

    /**
    * Delegate invoked to get the height of the page when the dropdown is being expanded
    */
    onGetPageHeight: () => number;

    /**
    * Delegate invoked to get the width of the page when the dropdown is being expanded
    */
    onGetPageWidth: () => number;

    /**
     * Count to be displayed in the footer section of tree dropdown
     */
    itemsDisplayCount: number;

    /**
     * Type of the search: whether user searched for a keyword or a path: used to decide the footer message string
     */
    searchType: _SparseTreeStore.SearchType;

    /**
     * State of the tree dropdown: Opened or closed
     * */
    isTreeDropdownActive: boolean;

    /**
     * Delegate to be invoked once Dropdown is invoked
     */
    onInvokeDropdown: () => void;

    /**
    * Delegate invoked to get the string to be displayed in the footer section of the drop-down menu.
    */
    onGetFooterMessage?: (itemCount: number, searchText: string, searchType: _SparseTreeStore.SearchType, isEditable?: boolean, isEditing?: boolean) => string;

    /**
    * Delegate invoked whenever the dropdown is supposed to be dismissed.
    */
    onDismissDropdown?: () => void;

    /**
    * Fires on every text change.
    */
    onSearchTextChanged?: (searchText: string) => void;

    /**
     * Water mark text of the search box rendered when the control supports search in the list.
     */
    searchTextPlaceholder?: string;

    /**
     * Delegate invoked on user action e.g. hover on help icon to trigger callout.
     */
    triggerCallout?: (showCallout: boolean) => void;

    /**
     * Object to hold callout properties such as the title, and content.
     */
    calloutProps?: { [key: string]: string };
}

export interface ITreeDropdownProps {
    /**
     * Items to be shown in the tree view
     */
    items: _TreeStore.IItem[];

    /**
    * Delegate invoked to get the height of the page when the dropdown is being expanded
    */
    onGetPageHeight: () => number;

    /**
    * Delegate invoked to get the width of the page when the dropdown is being expanded
    */
    onGetPageWidth: () => number;

    /**
     * Delegate invoked to render the tree cell.
     */
    onTreeItemRender: (item: _TreeStore.IItem, isActive: boolean, highlightText?: string) => JSX.Element;

    /**
    * Delegate invoked whenever a node in tree view is selected
    */
    onItemSelected: (path: string) => void;

    /**
    * Delegate invoked whenever a node in tree view is expanded
    */
    onItemExpand: (path: string) => void;

    /**
    * Delegate invoked whenever a node in tree view is collapsed
    */
    onItemCollapse: (path: string) => void;

    /**
    * Delegate invoked to know if the node in tree view is expandible/collapsible
    */
    onGetItemIsCollapsible: (item: _TreeStore.IItem) => boolean;

    /**
    * Index of the item highlighted.
    */
    activeDescendantIndex: number;

    /**
     * Count to be displayed in the footer section of tree dropdown
     */
    itemsDisplayCount: number;

    /**
     * Type of the search: whether user searched for a keyword or a path: used to decide the footer message string
     */
    searchType: _SparseTreeStore.SearchType;

    /**
    * Text to be highlighted within tree cell
    */
    highlightText?: string;

    /**
    * Delegate invoked to get the string to be displayed in the footer section of the drop-down menu.
    */
    onGetFooterMessage?: (itemCount: number, searchType: _SparseTreeStore.SearchType) => string;
}

export interface IComboBox {
    getInputRef?: () => HTMLElement;
}

export interface IComboBoxProps {
    /**
    * If false, disables the button.
    */
    enabled: boolean;

    /**
    * Text used to label the left side part of the control.
    */
    comboBoxLabel: string;

    /**
    * If true, component renders a spinner signifying operations in progress.
    */
    showBusy?: boolean;

    /**
    * Set it tro true if combo box can recieve input.
    */
    editable?: boolean;

    /**
    * If true, control is active. Used to control tooltip and visibility of the label.
    */
    dropdownActive?: boolean;

    /**
    * Default text to be placed in the input box.
    */
    comboBoxText?: string;

    /**
    * Place holder to fill in the input box in abscence of any text.
    */
    placeholder?: string;

    /**
    * Aria label used for clear icon
    */
    clearIconAriaLabel?: string;

    /**
    * Aria label used for apply button
    */
    applyButtonAriaLabel?: string;

    /**
    * Action performed on clicking chevron icon
    */
    onChevronClick?: (evt?: React.SyntheticEvent<HTMLElement>) => void;

    /**
    * Action performed when the control is clicked upon.
    */
    onComboBoxClick?: (evt?: React.SyntheticEvent<HTMLElement>) => void;

    /**
    * Action performed when the clear text icon is activated.
    */
    onClearText?: (evt?: React.SyntheticEvent<HTMLElement>) => void;

    /**
    * Invoked whenever the text in the input box changes.
    */
    onTextChanged?: (evt?: React.ChangeEvent<HTMLInputElement>) => void;

    /**
    * Action invoked when the input box recieves focus
    */
    onInputFocus?: (evt?: React.FocusEvent<HTMLElement>) => void;

    /**
    * Action invoked on keydown events on input box.
    */
    onInputKeyDown?: (evt?: React.KeyboardEvent<HTMLInputElement>) => void;

    /**
    * Action invoked apply button is activated.
    */
    onApplyText?: (evt?: React.SyntheticEvent<HTMLElement>) => void;

    /**
    * Delegate invoked with component reference when it has finished mounting.
    */
    componentRef?: (ref: IComboBox) => void;

    /**
    * Keeps title, content etc for the info popup when the control is disabled.
    */
    disabledInfoCalloutProps?: { [key: string]: string };
}
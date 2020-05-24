/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    autobind,
    getId, css,
    getRTLSafeKeyCode,
    KeyCodes } from 'OfficeFabric/Utilities';
import { KeyCode } from "VSS/Utils/UI";
import { TreeViewDropdown } from "Search/Scripts/React/Components/PathTreeControl/TreeViewDropdown";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { IItemProps, LoadingState, ICalloutTriggable } from "Search/Scripts/React/Models";
import { Spinner, SpinnerType, SpinnerSize } from "OfficeFabric/Spinner";
import { getItemsShownHint } from "Search/Scripts/React/Common";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { ignoreCaseComparer } from "VSS/Utils/String";
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import { ActionsCreator } from "Search/Scripts/React/Components/PathTreeControl/ActionsCreator";
import { ActionsHub }  from "Search/Scripts/React/Components/PathTreeControl/ActionsHub";
import { PathTreeStore, PathTreeAdapter } from "Search/Scripts/React/Components/PathTreeControl/PathTreeStore";
import * as TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import { PathTreeCache } from "Search/Scripts/React/Sources/PathTreeCache";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { ICalloutProps, Callout } from "OfficeFabric/Callout";
import { DelayedFunction, delay } from "VSS/Utils/Core";
import { FocusZone, FocusZoneDirection } from 'OfficeFabric/FocusZone';
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";

import "VSS/LoaderPlugins/Css!Search/React/Components/PathControl";

export enum Mode {
    None = 0x0,
    Searching = 0x1,
    Navigating = 0x2
}

export interface ITreeViewPathControlState {
    active: boolean,
    items: IItem[],
    loadingState: LoadingState,
    textBoxInput: string,
    mode: Mode,
    activeDescendantIndex: number,
    filteringTree: boolean
}

export interface ITreeViewPathControlProps extends IItemProps, ICalloutTriggable {
    searchBoxWatermark: string,
    /** label to be used left of the input box */
    label: string,
    enabled: boolean,
    /** Initially selected menu item */
    defaultSelectedItem: IItem,
    dropdownItemDisplayLabels: string[],
    dataSource: PathTreeCache;
    rootPath: string,
    defaultPath: string,
    separator: string,
    triggerCallout?: (show: boolean) => void,
    calloutAnchor?: string,
    calloutProps?: { [key: string]: string }
}

// [TODO: @aajohari] Refactor this class to move common things in a separate class.
export class TreeViewPathControl extends React.Component<ITreeViewPathControlProps, ITreeViewPathControlState> {
    private _viewState: ITreeViewPathControlState;
    /** References for individual elements in the PathControl Component */
    private _textBox: HTMLInputElement;
    private _pathControl: HTMLElement;
    private _actionsHub: ActionsHub;
    private _actionsCreator: ActionsCreator;
    private _pathTreeAdapter: PathTreeAdapter;
    private _store: PathTreeStore;
    private _delayedFunction: DelayedFunction;
    private _spinnerDelayFn: DelayedFunction;
    private focusZone: FocusZone;

    constructor(props: ITreeViewPathControlProps) {
        super(props);
        this.state = this._viewState = this._getInitialState(props);
        this._actionsHub = new ActionsHub();
        this._actionsCreator = new ActionsCreator(this._actionsHub);
        this._pathTreeAdapter = new PathTreeAdapter();
        this._store = new PathTreeStore({
            adapter: this._pathTreeAdapter,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: false,
            getLookupName: name => name.toLowerCase(),
            canCompactNodeIntoChild: TreeStore.CompactMode.none,
            skipRoot: false,
            rootPath: this.props.rootPath,
            separator: this.props.separator,
            splitItemPath: (key, separator, justFolder) => this._defaultSplitItemPath(key, justFolder)
        });
    }

    private _defaultSplitItemPath(key: string, justFolder?: boolean): TreeStore.SplitResult {
        let rootPicked = false;

        if (!!key && ignoreCaseComparer(this.props.rootPath, this.props.separator) !== 0 &&
            key.lastIndexOf(this.props.rootPath) === 0) {
            rootPicked = true;
            key = key.substring(this.props.rootPath.length);
        }

        let parts = key.split(this.props.separator);

        if (parts[parts.length - 1] === "") {
            parts.pop();
        }
        if (rootPicked) {
            if (parts.length === 0) {
                parts.push(this.props.rootPath);
            } else {
                parts[0] = this.props.rootPath;
            }
        }
        if (justFolder) {
            return { folderParts: parts, itemName: null } as TreeStore.SplitResult;
        } else {
            let item = parts.pop();
            return { folderParts: parts, itemName: item } as TreeStore.SplitResult;
        }
    }

    public render(): JSX.Element {
        // In case where menu items are yet to be fetched, there is no selected item
        let dropdownVisible = this.state.active && this.state.loadingState !== LoadingState.Loading,
            contentLoading = this.state.active && (this.state.loadingState === LoadingState.Loading),
            menuButtonId = getId("search-Filters-DropdownButtonLabel-"),
            menuComboBoxAttributes = this._getMenuComboBoxAttributes(),
            inputBoxAttributes = this._getInputBoxAttributes(),
            applyItemButtonAttributes = this._getApplyItemButtonAttributes(),
            chevronButtonAttributes = this._getChevronButtonAttributes(),
            showRemoveTextIcon: boolean = this.state.textBoxInput && this.state.active,
            showComboBoxLabel: boolean = !this.props.enabled || !this.state.active,
            showTooltip: boolean = inputBoxAttributes["value"] != null &&
                inputBoxAttributes["value"].trim().length != 0 &&
                !dropdownVisible,
            searchDisabled: boolean = (this.state.loadingState & LoadingState.LoadSuccessWithNoSearch) !== 0;

        return (
            <div className={css("path-control-menu")}
                ref={(path) => this._pathControl = path}>
                <div
                    className={css(
                        "filter-comboBox-container", {
                            "is-disabled": !this.props.enabled
                        })}
                    {...menuComboBoxAttributes}>
                    {
                        // render the label and the input box
                        <div className={css("filter-comboBox") }>
                            {
                                showComboBoxLabel &&
                                <span className={css(
                                    "comboBox-displayLabel", {
                                        "is-disabled": !this.props.enabled
                                    }) }>
                                    {this.props.label}
                                </span>
                            }
                            {
                                showTooltip &&
                                <TooltipHost content={inputBoxAttributes["value"]}
                                    directionalHint={DirectionalHint.topCenter}
                                    hostClassName="treeview-input-tooltip">
                                    <input
                                        className={css("comboBox-input", {
                                            "is-disabled": !this.props.enabled
                                        })}
                                        {...inputBoxAttributes}>
                                    </input>
                                </TooltipHost>
                            }
                            {
                                !showTooltip &&
                                <input
                                    className={css("comboBox-input", {
                                        "is-disabled": !this.props.enabled
                                    })}
                                    {...inputBoxAttributes}>
                                </input>
                            }
                        </div>
                    }
                    {
                        this.state.filteringTree &&
                        <span className={css("comboBox-spinner")}>
                            <Spinner size={SpinnerSize.small} />
                        </span>
                    }                   
                    {
                        this.props.enabled &&
                        showRemoveTextIcon &&
                        <div className={css("comboBox-clearText") }>
                            {
                                // Render the clear text button 
                                <span className={css("bowtie-icon", "search-removeText-icon", "bowtie-navigate-close") }
                                    role="button"
                                    tabIndex={0}
                                    aria-label={Search_Resources.SearchBoxClearText}
                                    onKeyDown={this._onRemoveClick}
                                    onClick={this._onRemoveClick} />
                            }
                        </div>
                    }
                    {
                        // render "information" icon
                        !this.props.enabled &&
                        this.props.calloutAnchor &&
                        <span
                            id={this.props.calloutAnchor}
                            className={css("disabled-Info-icon", "bowtie-status-help-outline", "is-disabled") } />
                    }
                    {
                        showRemoveTextIcon &&
                        !searchDisabled &&
                        // Render the Right Arrow which applies the filter.
                        <span
                            className={css("filter-goButton bowtie-icon bowtie-arrow-right", {
                                "is-disabled": !this.props.enabled
                            }) }
                            {...applyItemButtonAttributes} />
                    }
                    {
                        (!showRemoveTextIcon ||
                        searchDisabled) &&
                        <span
                            className="filter-chevron bowtie-icon bowtie-chevron-down-light"
                            {...chevronButtonAttributes} />
                    }
                </div>
                {
                    // Render the path dropdown
                        this.props.enabled &&
                        dropdownVisible &&
                        
                            <Callout
                                directionalHint={DirectionalHint.bottomLeftEdge}
                                isBeakVisible={false}
                                onDismiss={this._onDismiss}
                                target={this._pathControl}
                                className="path-dropdown-callout">
                                <TreeViewDropdown
                                    onItemExpand={this._onItemExpand}
                                    onItemCollapse={this._onItemCollapse}
                                    onItemSelected={this._onItemClick}
                                    items={this.state.items}
                                    rootPath={this.props.rootPath}
                                    getStore={() => this._store}
                                    separator={this.props.separator}
                                    message={(itemCount) => this._getHelperMessage(itemCount)}
                                    filterText={this.state.textBoxInput}
                                    activeDescendantIndex={this.state.activeDescendantIndex}
                                />
                            </Callout>
                }
                {
                    contentLoading &&
                    <div className={css("content-loading", "ease-out")}>
                        <Spinner label={Search_Resources.Loading} type={SpinnerType.large} />
                    </div>
                }
            </div>);
    }

    @autobind
    private _onDismiss(): void {
        this._closeDropdown(true);
    }

    /**
     * Callback when a node is expanded. In search mode, only expands the node,
     * otherwise tries to get data from the cache/lower layers for the expanded node.
     */
    @autobind
    private _onItemExpand(path: string) {
        if (this.state.mode === Mode.Searching) {
            this._pathTreeAdapter.folderExpanded.invoke(path);
        } else {
            this._actionsCreator.getData(this.props.dataSource, this._pathTreeAdapter, path);

            // Wait for 500ms before showing the busy indicator.
            this._delayedFunction = new DelayedFunction(this, 500, "ExpandNodeProgressIndicator", () => {
                this._pathTreeAdapter.folderExpanding.invoke(path);
                this._pathTreeAdapter.emitIfPending.invoke({});
            });
            this._delayedFunction.start();
        }

        // Set the current active item to the expanded node to move the highlight 
        // to that node.
        for (let i = 0; i < this.state.items.length; i++) {
            if (ignoreCaseComparer(path, this.state.items[i].fullName) === 0) {
                this._viewState.activeDescendantIndex = i;

                break;
            }
        }

        TelemetryHelper.traceLog({
            "TreeViewPathControlNodeExpanded": true,
            "TreeViewPathControlType": this.props.item.name
        });

        this._pathTreeAdapter.emitIfPending.invoke(null);
        this.forceUpdate();

        // Set the focus back to the text box so that the up/down keys keep working
        // for the highlight.
        this._textBox.focus();
        this._textBox.value = this._viewState.textBoxInput;
    }

    /**
     * Callback when the node is to be collapsed.
     */
    @autobind
    private _onItemCollapse(path: string) {
        this._pathTreeAdapter.folderCollapsed.invoke(path);
        this._pathTreeAdapter.emitIfPending.invoke(null);

        // Set the current active item as the collapsed node so that the highlight
        // moves to that node.
        for (let i = 0; i < this.state.items.length; i++) {
            if (ignoreCaseComparer(path, this.state.items[i].fullName) === 0) {
                this._viewState.activeDescendantIndex = i;

                break;
            }
        }

        TelemetryHelper.traceLog({
            "TreeViewPathControlNodeCollapsed": true,
            "TreeViewPathControlType": this.props.item.name
        });

        this.forceUpdate();

        // Set the focus to the textbox so that up/down keys work for the highlight shift
        this._textBox.focus();
        this._textBox.value = this._viewState.textBoxInput;
    }

    /**
     * Listen to changes in pathStore.
     */
    public componentDidMount(): void {
        this._store.addChangedListener(this._onFileTreeStoreChanged);

        // Queue path load for the root, if the filter is enabled, as soon as the component is mounted.
        if (this.props.enabled) {
            this._actionsCreator.getData(this.props.dataSource, this._pathTreeAdapter, this.props.defaultPath);
        }
    }

    /**
     * Path tree store change listener. Gets the items from the store with the success/failure status.
     */
    @autobind
    private _onFileTreeStoreChanged(): void {
        this._viewState.items = this._store.getVisible();
        this._viewState.loadingState = this._pathTreeAdapter.getLoadingState();
        this._viewState.filteringTree = false;

        if (this._delayedFunction) {
            this._delayedFunction.cancel();
        }

        // As we support two type of searches - one substring match and full path match,
        // after getting the results from the store, set the active index accordingly for each case.
        if (this._viewState.mode === Mode.Searching) {
            let regex = this._removeLastSlash(this._viewState.textBoxInput).replace(/\\/g, "\\\\").toLocaleLowerCase();
            this._viewState.activeDescendantIndex = -1;

            if (this._viewState.textBoxInput.length > 0) {
                if (this._viewState.textBoxInput.indexOf(this.props.separator) !== -1) {
                    for (let i = 0; i < this._viewState.items.length; i++) {
                        if (this._viewState.items[i].fullName.toLocaleLowerCase().search(regex) === 0) {
                            this._viewState.activeDescendantIndex = i;

                            break;
                        }
                    }
                }
                else {
                    for (let i = 0; i < this._viewState.items.length; i++) {
                        if (this._viewState.items[i].name.toLocaleLowerCase().search(this._viewState.textBoxInput.toLocaleLowerCase()) !== -1) {
                            this._viewState.activeDescendantIndex = i;
                            break;
                        }
                    }
                }
            }
        }

        this.setState(this._viewState);

        this.forceUpdate();
    }

    /* We need to override this method as the filters are rendered as soon as the page is loaded.
     * Though it is not necessary that the required information is present to render path control as intial render
     * might have happened with "props" containing no data.
     * The same filters are updated when a user queries or, in url sharing scenarios, the page obtains the data.
     * This time since the component is updated, this method is called with new properties(with enough data) to render the page.
     * It is at this time we asynchronously queue request to fetch "paths".
     * @param newProps
     */
    public componentWillReceiveProps(nextProps): void {
        // clean up stale state.
        this._viewState = this._getInitialState(nextProps);
        this.setState(this._viewState);

        // This takes care of the scenario when the project is changed.
        this._store.updateOptions({
            rootPath: nextProps.rootPath
        });

        if (nextProps.enabled) {
            this._pathTreeAdapter.refresh.invoke({});
            this._actionsCreator.getData(nextProps.dataSource, this._pathTreeAdapter, nextProps.defaultPath);
        }
    }

    /**
     * This function provides the message displayed below the path dropdown based on search text, user action and loading state.
     */
    private _getHelperMessage(itemCount: number): string {
        if (this._viewState.loadingState === LoadingState.LoadFailed) {
            // If load has failed, provide appropriate message to the user.
            return Search_Resources.PathDropdownLoadFailedMessage;
        }
        else if ((this._viewState.loadingState & LoadingState.LoadFailedOnSizeExceeded) !== 0 &&
            (this._viewState.loadingState & LoadingState.LoadSuccess) !== 0) {

            return Search_Resources.RepositoryTooHugeSearchDisabled;
        }
        else if ((this._viewState.loadingState & LoadingState.LoadSuccessWithNoSearch) !== 0) {
            return Search_Resources.SelectAFolderTreeView;
        }
        else {
            // If user has entered the full path, we don't show the count of the results.
            let isBrowsing = this._viewState.textBoxInput.indexOf(this.props.separator) !== -1;
            let visibleItems = this._viewState.items.length;
            let message = "";

            // If user is not searching and the text box contains "root" paths
            // Show the search path water mark message
            if (this.state.mode === Mode.None && visibleItems > 0 &&
                !this.state.textBoxInput) {

                message = getItemsShownHint(visibleItems, this.state.textBoxInput, this.props.dropdownItemDisplayLabels);
            } else if (!(this.state.mode & Mode.Searching)) {

                message = Search_Resources.PathDropdownDisplayMessage.replace("{0}", this.props.dropdownItemDisplayLabels[1]);
            } else if (isBrowsing) {

                let regex = this._removeLastSlash(this._viewState.textBoxInput).replace(/\\/g, "\\\\").toLocaleLowerCase();
                let matchingNode = false;

                if (this._viewState.textBoxInput.length > 0) {
                    for (let i = 0; i < this._viewState.items.length; i++) {
                        if (this._viewState.items[i].fullName.toLocaleLowerCase().search(regex) === 0) {
                            matchingNode = true;
                            break;
                        }
                    }
                }

                if (!matchingNode) {
                    message = Search_Resources.TreeViewNoPathFoundMessage;
                } else {
                    message = Search_Resources.PathDropdownDisplayMessage.replace("{0}", this.props.dropdownItemDisplayLabels[1]);
                }
            } else {
                message = getItemsShownHint(itemCount, this.state.textBoxInput, this.props.dropdownItemDisplayLabels);
            }
            return message;
        }
    }

    /**
     * This function provides the attributes of the combo-box based on its state (disabled/enabled)
     * When the control is disabled, the container is tabbable and has a role of a "combobox" with disabled attribute in place.
     * When the control is enabled, the inner text box is modified to behave like a "combobox" so there is no need to set role for
     * the container explicitly.
     */
    private _getMenuComboBoxAttributes(): any {
        let attributes = {
            "aria-label": this.props.label
        };

        if (this.props.enabled) {
            attributes["onClick"] = this._onPathMenuComboBoxClick;
        }
        else {
            attributes["onFocus"] = () => this._triggerCallout(true);
            attributes["onBlur"] = () => this._triggerCallout(false);
            attributes["role"] = "combobox";
            attributes["tabIndex"] = 0;
            attributes["aria-disabled"] = true;
            attributes["disabled"] = true;
            attributes["onMouseOver"] = () => this._triggerCallout(true);
            attributes["onMouseLeave"] = () => this._triggerCallout(false);
            attributes["aria-describedby"] = this.props.ariaDescribedby;
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the input element of the path control based on its state
     * When the control is enabled, the input box should behave like a combobox and is the first tabbable element
     */
    private _getInputBoxAttributes(): any {
        let attributes = {
            "ref": (text) => { this._textBox = text;
            if (this.state.active && this.state.loadingState !== LoadingState.Loading &&
                this.state.activeDescendantIndex === -1 &&
                text != null) {

                text.focus();
            }
        },
            "aria-label": this.props.label + " " + this.state.textBoxInput,
            "spellCheck": false
        },
            label = this.state.activeDescendantIndex < 0 ||
                !(this.state.mode & Mode.Navigating) ||
                this.state.items.length === 0
                ? this.state.textBoxInput
                : this.state.items[this.state.activeDescendantIndex].fullName;

        if (this.props.enabled) {
            attributes["aria-expanded"] = this.state.active;
            attributes["role"] = "combobox";
            attributes["aria-autocomplete"] = "list";
            attributes["onFocus"] = this._onSearchTextBoxFocus;
            attributes["onClick"] = this._activateSearchBox;
            attributes["onKeyDown"] = this._onTextBoxKeyDown;
            attributes["value"] = label;

            if ((this.state.loadingState & LoadingState.LoadSuccessWithNoSearch) !== 0) {
                attributes["aria-disabled"] = true;
                attributes["placeholder"] = (this.state.loadingState & LoadingState.LoadFailedOnSizeExceeded) ?
                    Search_Resources.SelectAPathFromTreeView : "";
                attributes["readOnly"] = "readOnly";
            } else {
                attributes["onChange"] = this._onSearchTextChange;
                attributes["placeholder"] = this.props.searchBoxWatermark;
            }
        }
        else {
            attributes["disabled"] = true;
            attributes["value"] = "";
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the right arrow button of the path filter
     */
    private _getApplyItemButtonAttributes(): any {
        let attributes = {};
        if (this.props.enabled) {
            attributes["tabIndex"] = 0;
            attributes["role"] = "button";
            attributes["onClick"] = this._applyPath;
            attributes["onKeyDown"] = this._applyPath;
            attributes["aria-label"] = Search_Resources.ApplyPathFilterText;
        }

        return attributes;
    }

    /**
     * This function provides the attributes of the right arrow button of the path filter
     */
    private _getChevronButtonAttributes(): any {
        let attributes = {};
        if (this.props.enabled) {
            attributes["tabIndex"] = 0;
            attributes["role"] = "button";
            attributes["onClick"] = this._openPathDropdown;
            attributes["onKeyDown"] = this._openPathDropdown;
            attributes["aria-label"] = this.props.label + " " + Search_Resources.ComboBoxDropButtonText;
            attributes["aria-expanded"] = this.state.active;
        }

        return attributes;
    }

    @autobind
    private _openPathDropdown(evt): void {
        if (evt.type === 'click' || evt.keyCode === KeyCode.ENTER) {
            if (this.state.active) {
                this._closeDropdown(true);
            }
            else {
                this._textBox.focus();
            }

            //Prevent the path menu to react on Mouse Click. 
            evt.stopPropagation();
        }
    }

    /**
     * Clicking the menu button should activate the text box for search purpose and bring down the menu
     */
    @autobind
    private _onPathMenuComboBoxClick(): void {
        this._textBox.focus();
    }

    /**
     * On Clicking the menu item update the selected item, text in menu box and trigger item selection action.
     * @param item
     */
    @autobind
    private _onItemClick(item: string): void {
        this._applyItem(item, true);
    }

    /**
     * Applied the passed item selection for the menu.
     * @param item
     */
    @autobind
    private _applyItem(item: string, validated: boolean): void {
        let validatePath = (path: string): boolean => {
            // If display name is empty string return true as we want to show results for empty string
            // It is handeled by back end by applying root path filter
            if (!path) {
                return true;
            }

            path = this._removeLastSlash(path).trim();
            let dataLoaded: boolean = this.state.loadingState === LoadingState.LoadSuccess;
            // Once the data load is complete, the applied item should be a valid item.
            return !dataLoaded || this.state.items.some((o, i) => {
                return ignoreCaseComparer(o.fullName, path) === 0;
            });
        };

        // Invoke item selection changed if the path user wished to apply
        // is from the list of valid paths either by selecting an item or by 
        // Entering path in the text box.
        if (this.props.onItemSelectionChanged &&
            item &&
            (validated ||
                validatePath(item))) {
            this.props.onItemSelectionChanged(this.props.item.name, [item]);
        }

        this._closeDropdown(false, item);
    }

    /**
     * Call back funtion when there is a click on the arrow button.
     * Applies the item name in the text box if the menu is enabled.
     */
    @autobind
    private _applyPath(evt): void {
        if (evt.type === 'click' || evt.keyCode === KeyCode.ENTER) {
            let activeItemIndex = this.state.activeDescendantIndex,
                items: IItem[] = this.state.items;

            // If there is an active item after navigating the list of items apply it,
            // otherwise apply the text in the textbox if it is a valid path.
            if (activeItemIndex >= 0 && activeItemIndex < items.length) {
                this._applyItem(items[activeItemIndex].fullName, true);
            }
            else {
                this._applyItem(this.state.textBoxInput || "", false);
            }

            //Prevent the path menu to react on Mouse Click. 
            evt.stopPropagation();
        }
    }

    /**
     * Trigger callout when hover happens on the search box or when it is under focus.
     * @param showCallout
     */
    @autobind
    private _triggerCallout(showCallout: boolean): void {
        if (this.props.triggerCallout) {
            this.props.triggerCallout(showCallout);
        }
    }

    /**
     * On change in text in the text box, update the list visible to the user based on the text.
     * If the user enters /tfs/ the last character "/" will be truncated and results will be shown
     * @param evt
     */
    @autobind
    private _onSearchTextChange(evt): void {
        var searchText = evt.target.value,
            filterText: string = searchText.replace(/\/+/g, "/");

        if (this._delayedFunction) {
            this._viewState.filteringTree = false;
            this._delayedFunction.cancel();
            delete this._delayedFunction;
        }

        if (this._spinnerDelayFn) {
            this._spinnerDelayFn.cancel();
            delete this._spinnerDelayFn;
        }

        this._viewState.textBoxInput = searchText;
        this._viewState.mode = Mode.None;

        this.setState(this._viewState);

        this._spinnerDelayFn = delay(this, 250, () => {
            this._viewState.filteringTree = true;
            this.setState(this._viewState);
        });

        this._delayedFunction = delay(this, 300, () => {
            if (filterText.length > 0) {
                // searchText might get modified in the above trimming step so using evt.target.value
                this._viewState.textBoxInput = searchText;
                this._viewState.mode = Mode.Searching;
            }
            else {
                this._viewState.textBoxInput = "";
                this._viewState.mode = Mode.None;
            }
            
            this._viewState.activeDescendantIndex = 0;

            // Setting the state to active for opening the dropdown for cases when the user has closed the dropdown by ESC
            this._viewState.active = true;
            
            if (this._viewState.mode === Mode.Searching) {
                this._actionsCreator.filterData(this.props.dataSource, this._pathTreeAdapter, filterText);
            } else {
                this._actionsCreator.getData(this.props.dataSource, this._pathTreeAdapter, this.props.rootPath);
            }
        });
    }

    private _removeLastSlash(text: string): string {
        let lastCharacter = text.slice(-1);

        if (text.length > 1 &&
            (lastCharacter === "/" ||
                lastCharacter === "\\")) {
            text = text.slice(0, -1);
        }

        return text;
    }

    /**
     * Handle Keyboard navigation when focus is on Text Box
     * @param evt
     */
    @autobind
    private _onTextBoxKeyDown(evt): void {
        let items: IItem[] = this.state.items,
            itemCount: number = items.length;

        if (evt.keyCode === KeyCode.UP || evt.keyCode === KeyCode.DOWN) {
            if (itemCount === 0) {
                return;
            }

            let currentIndex = this.state.activeDescendantIndex;

            // Decrease the index in case of UP and increase for DOWN
            if (evt.keyCode === KeyCode.UP) {
                currentIndex >= 0 ? --currentIndex : currentIndex = itemCount - 1;
            }
            else {
                currentIndex < itemCount - 1 ? ++currentIndex : currentIndex = -1;
            }

            this._viewState.activeDescendantIndex = currentIndex;
            this._viewState.mode |= Mode.Navigating;
            this._viewState.items = this._viewState.items.map((item) => JSON.parse(JSON.stringify(item)));

            this.setState(this._viewState);
            evt.preventDefault();
        }
        else if (evt.keyCode === KeyCode.ESCAPE) {
            this._closeDropdown(true);
        }
        else if (evt.keyCode === KeyCode.ENTER) {
            let { activeDescendantIndex, items } = this.state, item: IItem;

            if (activeDescendantIndex >= 0 && activeDescendantIndex < itemCount) {
                // If there is an active element in the dropdown apply that item.
                item = items[activeDescendantIndex];
                this._applyItem(item.fullName, true);
            }
            else if (this.state.textBoxInput.length === 0) {
                this._applyItem(this.props.rootPath, true);
            } else {
                // Else try applying whatever user has typed in.
                this._applyItem(this.state.textBoxInput, false);
            }
        }
        else if (evt.keyCode === KeyCode.LEFT) {
            let { activeDescendantIndex, items } = this.state, item: IItem;

            if (activeDescendantIndex >= 0 && activeDescendantIndex < itemCount) {
                // If there is an active element in the dropdown apply that item.
                item = items[activeDescendantIndex];
                this._onItemCollapse(item.fullName);
                evt.preventDefault();
            }
        }
        else if (evt.keyCode === KeyCode.RIGHT) {
            let { activeDescendantIndex, items } = this.state, item: IItem;

            if (activeDescendantIndex >= 0 && activeDescendantIndex < itemCount) {
                // If there is an active element in the dropdown apply that item.
                item = items[activeDescendantIndex];
                this._onItemExpand(item.fullName);
                evt.preventDefault();
            }
        }
    }

    /**
     * On Clicking the cross button next to text box erase the text in the text box.
     * @param evt
     */
    @autobind
    private _onRemoveClick(evt): void {
        if (evt.type === 'click' || evt.keyCode === KeyCode.ENTER) {
            let pathType = this.props.item.name;

            this._textBox.focus();
            this._viewState.textBoxInput = "";
            this._viewState.activeDescendantIndex = -1;
            this._viewState.mode = Mode.None;
            this.setState(this._viewState);

            // This clears the data in store and re-fetches data from the cache.
            // This ensures that we have all the paths as opposed to filtered paths
            // and the initial state is set with only root path expanded.
            this._pathTreeAdapter.refresh.invoke({});
            this._actionsCreator.getData(this.props.dataSource, this._pathTreeAdapter, this.props.rootPath);
        }
    }

    /**
     * Callback when the text box is in focus.
     * Highlights the text and and activates the text box
     */
    @autobind
    private _onSearchTextBoxFocus(event): void {
        let inputElement = event.target as HTMLInputElement;

        // Highlight the input text when focus comes to input element.
        inputElement.select();
        this._activateSearchBox(event);
    }

    /**
     * Activates the text box, show one level elements.
     */
    @autobind
    private _activateSearchBox(evt): void {
        let text = (evt.target as HTMLInputElement).value;

        if (!this.state.active) {
            this._actionsCreator.getData(this.props.dataSource, this._pathTreeAdapter, this.props.rootPath);
        }

        this._viewState.active = true;
        this._viewState.textBoxInput = text;
        this.setState(this._viewState);
    }

    /**
     * Close the dropdown and display the selected item in the menu box.
     */
    private _closeDropdown(reset: boolean, item?: string): void {
        this._viewState.active = false;
        this._viewState.activeDescendantIndex = -1;
        this._viewState.mode = Mode.None;

        let defaultText = this.props.defaultSelectedItem.fullName || "";
        // If an item is selected set the text of the selected item
        // Else, if reset option is set restore the default path.
        // Else let the search text as is, whatever the user has keyed in.
        this._viewState.textBoxInput = (item) || (reset && defaultText) || this.state.textBoxInput;
        this.setState(this._viewState);
    }

    /**
     * Provides state of the component on basis of props provided.
     * @param props
     */
    private _getInitialState(props: ITreeViewPathControlProps): ITreeViewPathControlState {
        // Set the state for the control
        let _viewState = {
            active: false,
            items: [],
            loadingState: LoadingState.Loading,
            textBoxInput: props.defaultSelectedItem.fullName || "",
            mode: Mode.None,
            activeDescendantIndex: -1,
            filteringTree: false
        } as ITreeViewPathControlState;

        return _viewState;
    }
}
/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind, getId, css } from 'OfficeFabric/Utilities';
import { KeyCode } from "VSS/Utils/UI";
import { PathControlDropdown } from "Search/Scripts/React/Components/PathControl/PathControlDropdown";
import { IItemProps, IPathControlElement, LoadingState, ICalloutTriggable } from "Search/Scripts/React/Models";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { substringSort, fetchImmediateChildinPath, getItemsShownHint } from "Search/Scripts/React/Common";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { PathContent } from "Search/Scripts/React/Stores/PathStore";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";

import "VSS/LoaderPlugins/Css!Search/React/Components/PathControl";

const roots = ["/", "\\", "$/"];

export enum Mode {
    None = 0x0,
    Searching = 0x1,
    Navigating = 0x2
}

export interface IPathControlState {
    active: boolean,
    items: IPathControlElement[],
    loadingState: LoadingState,
    textBoxInput: string,
    mode: Mode,
    activeDescendantIndex: number
}

export interface IPathControlBehaviour {
    /** Renderer for an individual menu element */
    elementRenderer: (item: IPathControlElement, hitText: string, highlight: boolean) => JSX.Element,
    getItemsOnActivation: (items: IPathControlElement[], textBoxInput: string) => IPathControlElement[],
    getActivatedItemIndexOnActivation: (items: IPathControlElement[], textBoxInput: string) => number
}

export interface IPathControlProps extends IItemProps, ICalloutTriggable {
    behaviour: IPathControlBehaviour,
    searchBoxWatermark: string,
    /** label to be used left of the input box */
    label: string,
    enabled: boolean,
    /** Initially selected menu item */
    defaultSelectedItem: IPathControlElement,
    actionCreator: ActionCreator,
    storesHub: StoresHub,
    dropdownItemDisplayLabels: string[],

    triggerCallout?: (show: boolean) => void,
    calloutAnchor?: string,
    calloutProps?: {[key: string]: string}
}

export class PathControl extends React.Component<IPathControlProps, IPathControlState> {
    private _viewState: IPathControlState;
    /** References for individual elements in the PathControl Component */
    private _textBox: HTMLElement;
    private _pathControl: HTMLElement;
    constructor(props: IPathControlProps) {
        super(props);
        this.state = this._viewState = this._getInitialState(props);
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
            message: string = this._getHelperMessage(),
            showComboBoxLabel: boolean = !this.props.enabled || !this.state.active;

        return (
            <div className={css("path-control-menu") }
                onBlur={this._onMenuBlur}
                ref={(path) => { this._pathControl = path } } >
                <div
                    className={css(
                        "filter-comboBox-container", {
                            "is-disabled": !this.props.enabled
                        }) }
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
                            <input
                                className={css("comboBox-input", {
                                    "is-disabled": !this.props.enabled
                                }) }
                                {...inputBoxAttributes} />
                        </div>
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
                        // Render the Right Arrow which applies the filter.
                        <span
                            className={css("filter-goButton bowtie-icon bowtie-arrow-right", {
                                "is-disabled": !this.props.enabled
                            }) }
                            {...applyItemButtonAttributes} />
                    }
                    {
                        !showRemoveTextIcon &&
                        <span
                            className="filter-chevron bowtie-icon bowtie-chevron-down-light"
                            {...chevronButtonAttributes} />
                    }
                </div>
                {
                    // Render the path dropdown
                    this.props.enabled &&
                    dropdownVisible &&
                    <PathControlDropdown
                        items={this.state.items}
                        currentItemIndex={this.state.activeDescendantIndex}
                        message={message}
                        onItemClick={this._onItemClick}
                        onItemRender={(item: IPathControlElement) => {

                            // Bold the hit content if the mode is "Searching" or "None".
                            // We don't want higlights if user is navigating or navigating after searching.
                            let needBolding = (this._viewState.mode === Mode.Searching || this._viewState.mode === Mode.None);
                            return this.props.behaviour.elementRenderer(item, this.state.textBoxInput, needBolding)
                        } } />
                }
                {
                    contentLoading &&
                    <div className={css("content-loading", "ease-out")}>
                        <Spinner label={Search_Resources.Loading} type={SpinnerType.large} />
                    </div>
                }
            </div>);
    }

    /**
     * Listen to changes in pathStore.
     */
    public componentDidMount(): void {
        this.props.storesHub.pathStore.addChangedListener(this._onDataLoaded);

        // Queue path load, if the filter is enabled, as soon as the component is mounted.
        if (this.props.enabled) {
            this.props.actionCreator.loadPath(this.props.item);
        }
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

        if (nextProps.enabled) {
            this.props.actionCreator.loadPath(nextProps.item);
        }
    }

    public componentWillUnmount(): void {
        this.props.storesHub.pathStore.removeChangedListener(this._onDataLoaded);
    }

    /**
     * This function provides the message displayed below the path dropdown based on search text, user action and loading state.
     */
    private _getHelperMessage(): string {
        if (this.state.loadingState === LoadingState.LoadFailed) {
            TelemetryHelper.traceLog({
                "PathDataLoadFailed": true
            });
            // If load has failed, provide appropriate message to the user.
            return Search_Resources.PathDropdownLoadFailedMessage;
        }
        else if (this.state.loadingState === LoadingState.LoadFailedOnSizeExceeded) {
            TelemetryHelper.traceLog({
                "PathDataLargeSize": true
            });
            return Search_Resources.PathDropdownHugePathListMessage;
        }
        else if (this.state.loadingState === LoadingState.UnSupported) {
            TelemetryHelper.traceLog({
                "PathDataUnsupported": true
            });
            return Search_Resources.PathDropdownHugePathListMessage;
        }
        else {
            // If user is not searching and the text box contains "root" paths
            // Show the search path water mark message
            return !(this.state.mode & Mode.Searching)
                ? Search_Resources.PathDropdownDisplayMessage.replace("{0}", this.props.dropdownItemDisplayLabels[1])
                : getItemsShownHint(this.state.items.length, this.state.textBoxInput, this.props.dropdownItemDisplayLabels);
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
            "ref": (text) => { this._textBox = text },
            "aria-label": this.props.label + " " + this.state.textBoxInput,
            "spellCheck": false
        },
            label = this.state.activeDescendantIndex < 0 ||
                !(this.state.mode & Mode.Navigating)
                ? this.state.textBoxInput
                : this.state.items[this.state.activeDescendantIndex].displayName;

        if (this.props.enabled) {
            attributes["aria-expanded"] = this.state.active;
            attributes["role"] = "combobox";
            attributes["aria-autocomplete"] = "list";
            attributes["value"] = label;
            attributes["onKeyDown"] = this._onTextBoxKeyDown;
            attributes["onChange"] = this._onSearchTextChange;
            attributes["onFocus"] = this._onSearchTextBoxFocus;
            attributes["onClick"] = this._activateSearchBox;
            attributes["placeholder"] = this.props.searchBoxWatermark;
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
    private _onItemClick(item: IPathControlElement): void {
        this._applyItem(item, true);
    }

    /**
     * Applied the passed item selection for the menu.
     * @param item
     */
    @autobind
    private _applyItem(item: IPathControlElement, validated: boolean): void {
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
                return ignoreCaseComparer(o.displayName, path) === 0;
            });
        };

        // Invoke item selection changed if the path user wished to apply
        // is from the list of valid paths either by selecting an item or by 
        // Entering path in the text box.
        if (this.props.onItemSelectionChanged &&
            item &&
            (!item.displayName ||
                validated ||
                validatePath(item.displayName))) {
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
                items: IPathControlElement[] = this.state.items;

            // If there is an active item after navigating the list of items apply it,
            // otherwise apply the text in the textbox if it is a valid path.
            if (activeItemIndex >= 0 && activeItemIndex < items.length) {
                this._applyItem(items[activeItemIndex], true);
            }
            else {
                this._applyItem({
                    displayName: this.state.textBoxInput || ""
                }, false)
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
     * Update state once "path" load is completed.
     */
    @autobind
    private _onDataLoaded(): void {
        let pathType: string = this.props.item.name,
            pathContent: PathContent = this.props.storesHub.pathStore.getPathContent(pathType);

        this._viewState.items = pathContent.items;
        if (pathContent.loadingState !== null) {
            this._viewState.loadingState = pathContent.loadingState;
            this.setState(this._viewState);
        }
    }

    /**
     * On change in text in the text box, update the list visible to the user based on the text.
     * If the user enters /tfs/ the last character "/" will be truncated and results will be shown
     * @param evt
     */
    @autobind
    private _onSearchTextChange(evt): void {
        let searchText = evt.target.value,
            filterText: string = searchText.replace(/\/+/g, "/"),
            allPaths: IPathControlElement[] = this.props.storesHub.pathStore.getPathContent(this.props.item.name).items;

        // If the last character is "/" or "\" the user needs to be shown with more results 
        // e.g if user types /Tfs/ the user is unabe to see /Tfs in dropdown to select
        // So removing the last character to filter drop down results
        filterText = this._removeLastSlash(filterText);

        if (filterText.length > 0) {
            let results = substringSort(allPaths, item => (item.displayName), filterText.toLowerCase());

            this._viewState.items = results;
            // searchText might get modified in the above trimming step so using evt.target.value
            this._viewState.textBoxInput = searchText;
        }
        else {
            this._viewState.items = allPaths;
            this._viewState.textBoxInput = "";
        }

        this._viewState.mode = Mode.Searching;
        this._viewState.activeDescendantIndex = 0;

        // Setting the state to active for opening the dropdown for cases when the user has closed the dropdown by ESC
        this._viewState.active = true;
        this.setState(this._viewState);
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
        let items: IPathControlElement[] = this.state.items,
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

            this.setState(this._viewState);
            evt.preventDefault();
        }
        else if (evt.keyCode === KeyCode.ESCAPE) {
            this._closeDropdown(true);
        }
        else if (evt.keyCode === KeyCode.ENTER) {
            let { activeDescendantIndex, items } = this.state, item: IPathControlElement;

            if (activeDescendantIndex >= 0 && activeDescendantIndex < itemCount) {
                // If there is an active element in the dropdown apply that item.
                item = items[activeDescendantIndex];
                this._applyItem(item, true);
            }
            else {
                // Else try applying whatever user has typed in.
                item = {
                    displayName: this.state.textBoxInput
                };

                this._applyItem(item, false);
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
            this._viewState.mode = Mode.Searching;
            this._viewState.items = this.props.storesHub.pathStore.getPathContent(pathType).items;
            this.setState(this._viewState);
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
     * Activates the text boxm, show one level elements.
     */
    @autobind
    private _activateSearchBox(evt): void {
        let pathType: string = this.props.item.name,
            text = (evt.target as HTMLInputElement).value;

        if (!this.state.active) {
            let items = this.props.storesHub.pathStore.getPathContent(pathType).items;
            this._viewState.items = this
                .props
                .behaviour
                .getItemsOnActivation(items, text);

            this._viewState.activeDescendantIndex = this
                .props
                .behaviour
                .getActivatedItemIndexOnActivation(items, text);
        }

        this._viewState.active = true;
        this._viewState.textBoxInput = text;
        this.setState(this._viewState);
    }

    /**
     * Close the menu when there is Blur event triggered from outside the path control
     * @param evt
     */
    @autobind
    private _onMenuBlur(evt): void {
        let relatedTarget = evt.relatedTarget || document.activeElement;
        if (!this._pathControl.contains(relatedTarget)) {
            this._closeDropdown(true);
        }
    }

    /**
     * Close the dropdown and display the selected item in the menu box.
     */
    private _closeDropdown(reset: boolean, item?: IPathControlElement): void {
        this._viewState.active = false;
        this._viewState.activeDescendantIndex = -1;
        this._viewState.mode = Mode.None;

        let defaultText = this.props.defaultSelectedItem.displayName || "";
        // If an item is selected set the text of the selected item
        // Else, if reset option is set restore the default path.
        // Else let the search text as is, whatever the user has keyed in.
        this._viewState.textBoxInput = (item && item.displayName) || (reset && defaultText) || this.state.textBoxInput;
        this.setState(this._viewState);
    }

    /**
     * Fetch the index of item in the items.
     * @param items
     * @param item
     */
    private _getIndexOfItem(items: any[], item: any): number {
        let length = items.length,
            text = item.displayName;

        for (let i = 0; i < length; i++) {
            if (ignoreCaseComparer(items[i].displayName, text) === 0) {
                return i;
            }
        }
    }

    /**
     * Provides state of the component on basis of props provided.
     * @param props
     */
    private _getInitialState(props: IPathControlProps): IPathControlState {
        // Set the state for the control
        let _viewState = {
            active: false,
            items: [],
            loadingState: LoadingState.Loading,
            textBoxInput: props.defaultSelectedItem.displayName || "",
            mode: Mode.None,
            activeDescendantIndex: -1
        } as IPathControlState;

        return _viewState;
    }
}
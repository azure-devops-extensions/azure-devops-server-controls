/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { SearchBox } from "OfficeFabric/SearchBox";
import { autobind, css } from 'OfficeFabric/Utilities';
import { FocusZone, FocusZoneDirection } from 'OfficeFabric/FocusZone';
import { List } from "OfficeFabric/List";
import { MultiSelectDropdownElement } from "Search/Scripts/React/Components/Shared/MultiSelectDropdownElement/MultiSelectDropdownElement";
import { KeyCode } from "VSS/Utils/UI";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { ignoreCaseComparer } from "VSS/Utils/String";
import { multiSelectSubstringSort, getItemsShownHint } from "Search/Scripts/React/Common";

import "VSS/LoaderPlugins/Css!Search/React/Components/MultiSelectDropdown";

export const ALL_CHECKBOX_ITEM_ID = "2AA5457E-5E05-430C-A44A-A7C1E6B3C653";
const THRESHOLD_FILTER_COUNT_TO_RENDER_SEARCH_BOX: number = 8;

export interface IMultiSelectDropdownProps {
    id: string;
    items: any[];
    searchBoxWatermark: string,
    onSelectionChanged: (items: any[]) => void,
    onBlur: (evt?) => void
    dropdownItemDisplayLabels: string[]
}

/**
 * Wrapper to wrap a dropdown item to control its visibility in the list
 */
export class MultiSelectDropdownItem {
    constructor(public innerItem: any, public visible: boolean = true) { }
}

export interface IMultiSelectDropdownState {
    items: MultiSelectDropdownItem[],
    searchText: string
}

export class MultiSelectDropdown extends React.Component<IMultiSelectDropdownProps, IMultiSelectDropdownState> {
    private focusZone: FocusZone;
    private list: List;
    private viewState: IMultiSelectDropdownState;
    private dropdownFocussed: boolean;
    private mounted: boolean;

    constructor(props: IMultiSelectDropdownProps) {
        super(props);
        this.state = this.viewState = this._getState(props, "", true);
        this.dropdownFocussed = false;
        this.mounted = false;
    }

    public render(): JSX.Element {
        // filter out only visible items.
        let visibleItems: MultiSelectDropdownItem[] = this.state.items.filter(i => i.visible),
            // Remove All filter from the count of filter items.
            actualItemCount: number = this.state.searchText ? visibleItems.length : visibleItems.length - 1,
            itemsShownHint: string = getItemsShownHint(actualItemCount, this.state.searchText, this.props.dropdownItemDisplayLabels);

        return (
            // Ease out the dropdown when the control is not mounted yet.
            // On subsequent render "easing-out" the dropdown gives a blurry effect in E.E
            // and is quite visible since the dropdown stays
            <FocusZone
                ref={(focusZone) => this.focusZone = focusZone}
                direction={FocusZoneDirection.vertical}
                isCircularNavigation={true}
                onBlur={this._onBlur}
                onKeyDown={this._onKeyDown}>
                <div id={this.props.id} className={css("dropdown", {
                    "ease-out": !this.mounted
                }) }>
                    {
                        this._isSearchBoxAvailable(this.props) &&
                        <SearchBox
                            className="search-box"
                            value={this.state.searchText}
                            onChange={this._onSearchTextChanged}
                            onEscape={this._onSearchBoxEscaped}
                            labelText={this.props.searchBoxWatermark} />
                    }
                    <div className="element-list">
                        <List
                            ref={(list) => this.list = list}
                            items={visibleItems}
                            onRenderCell={
                                (item: MultiSelectDropdownItem, index) => {
                                    return <MultiSelectDropdownElement
                                        key={item.innerItem.id}
                                        item={item.innerItem}
                                        isDisabled={
                                            ignoreCaseComparer(item.innerItem.id, ALL_CHECKBOX_ITEM_ID) === 0 &&
                                            item.innerItem.selected}
                                        onChange={this._onItemSelectionChanged}
                                        onMount={this._onMenuItemMount} />;
                                }
                            } />
                    </div>
                    <div className={css("message") }
                         onMouseDown={this._onHelperMessageMouseDown}>
                         { itemsShownHint }
                    </div>
                </div>
            </FocusZone>
        );
    };

    public componentDidMount(): void {
        this.mounted = true;
    }

    /**
     * Update the list forcefully, as the items of the list may have modified even though the
     * List will appear to be the same. (shallow comparison)
     */
    public componentDidUpdate(): void {
        this.list.forceUpdate();
    }

    public componentWillReceiveProps(newProps: IMultiSelectDropdownProps): void {
        // Content is updated if the number of items is modified or the items itself are modified.
        let contentUpdated: boolean = newProps.items.length !== this.props.items.length ||
            !this.props.items.every((item, index) => {
                let newItem = newProps.items[index];
                return item.id === newItem.id;
            });

        if (contentUpdated) {
            this.viewState = this._getState(newProps, this.state.searchText, false);
            this.setState(this.viewState);
        }
    }

    /**
    * Function called when the mouse event happens on the helper message in the dropdown.
    * The mouse operation is made NoOp by supressing the event.
    * @param evt
    */
    @autobind
    private _onHelperMessageMouseDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    }

    @autobind
    private _onBlur(evt: any): void {
        this.props.onBlur(evt);
    }

    @autobind
    private _onSearchTextChanged(searchText: string): void {
        searchText = searchText.toLowerCase().trim();
        this.viewState.searchText = searchText;
        if (searchText.length > 0) {
            this.viewState.items = this._refineItems(this.state.items, searchText);
        }
        else {
            this.viewState = this._getState(this.props, "", true);
        }

        this.setState(this.viewState);
    }

    @autobind
    private _onItemSelectionChanged(item: any, isChecked: boolean): void {
        if (this.props.onSelectionChanged) {
            let items: MultiSelectDropdownItem[] = this.state.items,
                allFilter: any = items.filter(i => ignoreCaseComparer(i.innerItem.id, ALL_CHECKBOX_ITEM_ID) === 0)[0],
                checkedItems: any[] = [];

            // If "All" filter is selected uncheck all except that one.
            if (ignoreCaseComparer(item.id, ALL_CHECKBOX_ITEM_ID) === 0) {
                items.forEach(i => i.innerItem.selected = false)
                allFilter.innerItem.selected = true;
            }
            else {
                // Update selection state
                let someFilterSelected = false;
                items.forEach(i => {
                    if (ignoreCaseComparer(i.innerItem.id, ALL_CHECKBOX_ITEM_ID) !== 0) {
                        // Set the selected state of changed filter.
                        ignoreCaseComparer(i.innerItem.id, item.id) === 0 && (i.innerItem.selected = isChecked);

                        // If the items is already selected, add that in list of selected filters.
                        i.innerItem.selected && checkedItems.push(i.innerItem);

                        // Update the flag signifying not all filters are unchecked/selected.
                        someFilterSelected = someFilterSelected || i.innerItem.selected;
                    }
                });

                // Update allFilter's selected state.
                allFilter.innerItem.selected = !someFilterSelected;
            }

            // Update with latest modified items.
            this.viewState.items = items;
            this.setState(this.viewState);

            this.props.onSelectionChanged(checkedItems);
        }
    }

    @autobind
    private _onKeyDown(evt): void {
        if (evt.keyCode === KeyCode.ESCAPE) {
            this.props.onBlur(evt);
        }
    }

    @autobind
    private _onSearchBoxEscaped(evt?: any): void {
        if (this.props.onBlur) {
            this.props.onBlur(evt);
        }
    }

    /**
     * When the items in the menu dropdown get mount, bring the first tabbable element under focus.
     * Called on each row mount. Could be expensive for long list since method is invoked for each item in the list
     *
     */
    @autobind
    private _onMenuItemMount(): void {
        // If focus zone is already under focs no need to call .focus() again
        if (this.focusZone && !this.dropdownFocussed) {
            this.focusZone.focus();
            this.dropdownFocussed = true;
        }
    }

    /**
     * Returns the state object. Given the props method populates the items in the state object.
     * If there is a valid search text items are populated after refining the list from props on searchText.
     * reorder - If set to true will set the selected items ahead in the list, and all unselected items at the back.
     * @param props
     * @param searchText
     * @param reorder
     */
    private _getState(props: IMultiSelectDropdownProps, searchText: string, reorder?: boolean): IMultiSelectDropdownState {
        let items = (props.items || []).map((i, idx) => new MultiSelectDropdownItem(i));

        // If search text is non-empty and search box is available, set items after refining the list passed in props.
        if (this._isSearchBoxAvailable(props) && searchText) {
            items = this._refineItems(items, searchText);
        }
        else if (reorder) {
            let checkedItems = items.filter(i => i.innerItem.selected ||
                ignoreCaseComparer(i.innerItem.id, ALL_CHECKBOX_ITEM_ID) === 0),
                unCheckedItems = items.filter(i => !i.innerItem.selected &&
                    ignoreCaseComparer(i.innerItem.id, ALL_CHECKBOX_ITEM_ID) !== 0);

            // place checked items ahead in the list.
            items = checkedItems.concat(unCheckedItems);
        }

        return {
            searchText: searchText,
            items: items
        };
    }

    private _isSearchBoxAvailable(props: IMultiSelectDropdownProps): boolean {
        return (props.items || []).length > THRESHOLD_FILTER_COUNT_TO_RENDER_SEARCH_BOX;
    }

    private _refineItems(items: MultiSelectDropdownItem[], searchText: string): MultiSelectDropdownItem[] {
        let results = multiSelectSubstringSort<MultiSelectDropdownItem>(items,
            item => item.innerItem.name,
            (item: MultiSelectDropdownItem, hit: boolean) => {
                if (ignoreCaseComparer(item.innerItem.id, ALL_CHECKBOX_ITEM_ID) === 0) {
                    item.visible = false
                }
                else {
                    item.visible = hit;
                }

                return item;
            },
            searchText)

        return results;
    }
}
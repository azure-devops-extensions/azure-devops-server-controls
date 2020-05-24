/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { autobind, getId, css } from 'OfficeFabric/Utilities';
import { ignoreCaseComparer } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import * as Models from "Search/Scripts/React/Models";
import { MultiSelectDropdown, ALL_CHECKBOX_ITEM_ID } from "Search/Scripts/React/Components/Shared/MultiSelectDropdown/MultiSelectDropdown";
import { MenuButton } from "Search/Scripts/React/Components/Shared/MenuButton/MenuButton";

import "VSS/LoaderPlugins/Css!Search/React/Components/MultiSelectMenu";

export interface IMultiSelectMenuProps extends Models.IItemProps, Models.ICalloutTriggable {
    HTMLInputProps: IDictionaryStringTo<any>,
    displayName: string,
    searchBoxWatermark: string,
    allFilterDisplayName: string,
    dropdownItemDisplayLabels: string[],
    enabled: boolean,
    featureAvailabilityStates: IDictionaryStringTo<boolean>
}

export interface IMultiSelectMenuState {
    dropdownOpen: boolean
}

export class MultiSelectMenu extends React.Component<IMultiSelectMenuProps, IMultiSelectMenuState> {
    private _menuButton: HTMLElement;

    constructor(props: IMultiSelectMenuProps) {
        super(props);
        this.state = { dropdownOpen: false };
    }

    public render(): JSX.Element {
        let items: any[] = this.props.item.filters || [];
        // Prepend "All" filter
        items = [{
            name: this.props.allFilterDisplayName,
            id: ALL_CHECKBOX_ITEM_ID,
            selected: !items.some(f => f.selected),
            facet: 0
        }].concat(items);

        let selectedItems = items.filter(f => f.selected),
            { activeItemNamesOverflown, displayLabel, entireString } = this.getDisplayInformation(selectedItems, this.props.displayName);

        let menuButtonId: string = getId("search-Filters-DropdownButtonLabel-"),
            filterDropdownId: string = getId("search-Filter-DropdownMenu-");

        let menuButton = <MenuButton
            {...this.props}
            {...this.getMenuButtonProps(displayLabel, menuButtonId, filterDropdownId) } />;

        return (
            <div
                className="multiselect-menu"
                ref={((menuButtonElement) => {
                    this._menuButton = menuButtonElement
                }).bind(this)} >
                {
                    // wrap button within tooltip host, if filter is enabled.
                    this.props.enabled && activeItemNamesOverflown
                        ? <TooltipHost
                            content={entireString}
                            directionalHint={DirectionalHint.topCenter}>
                            {menuButton}
                        </TooltipHost>
                        : menuButton
                }
                {
                    this.state.dropdownOpen &&
                    <MultiSelectDropdown
                        id={filterDropdownId}
                        items={items}
                        searchBoxWatermark={this.props.searchBoxWatermark}
                        onSelectionChanged={this.onSelectionChanged}
                        onBlur={this.closeDropdown}
                        dropdownItemDisplayLabels={this.props.dropdownItemDisplayLabels} />
                }
            </div>
        );
    }

    public componentDidMount(): void {
        // Add max-width constraint to menu button once the component is rendered.
        // So as to prevent size updates which caused visual jarring effects.
        let width = this._menuButton.clientWidth,
            styles = "width: {0}px; max-width: {0}px".replace(/\{0\}/g, width.toString());
        this._menuButton.setAttribute("style", styles);
    }

    /**
     * Invoked when a filter is modified in the dropdown.
     * @param checkedItems - List of items which are selected.
     */
    @autobind
    private onSelectionChanged(checkedItems: any[]): void {
        if (this.props.onItemSelectionChanged) {
            // fire on selection change.
            let filterName = this.props.item.name;
            this.props.onItemSelectionChanged(filterName, checkedItems);
        }
    }

    @autobind
    private closeDropdown(evt): void {
        if (evt.type === "blur") {
            // On blur see if the related target which recieves the focus lies within the DOM tree of the MultiSelectMenu.
            // If yes, it implies the multiselect menu or its child recieved the focus, in which case we don't want the dropdown 
            // to go away.
            let relatedTarget = evt.relatedTarget || document.activeElement;
            if (this._menuButton && !this._menuButton.contains(relatedTarget)) {
                this.setState({ dropdownOpen: false });
            }
        }
        else if (evt.type === "keydown" && evt.keyCode === KeyCode.ESCAPE) {
            this.setState({ dropdownOpen: false });
        }
    }

    @autobind
    private onDropdownButtonClick(): void {
        this.setState({ dropdownOpen: !this.state.dropdownOpen });
    }

    @autobind
    private onKeyDown(evt): void {
        if (evt.keyCode === KeyCode.ENTER || evt.keyCode === KeyCode.DOWN) {
            // pressing enter or arrow down is same as clicking the button to bring up the dropdown menu.
            this.onDropdownButtonClick();
        }
    }

    private getMenuButtonProps(displayLabel: string, menuButtonId: string, filterDropdownId: string): any {
        return {
            displayLabel: displayLabel,
            menuButtonId: menuButtonId,
            showHelp: !this.props.enabled,
            onKeyDown: this.onKeyDown,
            onDropdownButtonClick: this.onDropdownButtonClick,
            role: "combobox",
            hasDropdown: true,
            dropdownOpen: this.state.dropdownOpen,
            dropdownId: filterDropdownId,
            ariaAutoComplete: "list"
        };
    }

    private getDisplayInformation(selectedItems: any[], filterLabel: string): any {
        let remainingSpaceCap = 60,
            $div = document.createElement("div"),
            styles = this.props.HTMLInputProps["style"],
            widthString: string = styles && styles["width"],
            maxWidth = parseInt(widthString.substr(0, widthString.length - 2)), // remove "px"            
            getItemName = (item) => {
                return item.id === ALL_CHECKBOX_ITEM_ID
                    ? (!ignoreCaseComparer(filterLabel, Search_Resources.AssignedToFiltersDisplayLabel)
                        ? Search_Resources.AnyText
                        : Search_Resources.AllText)
                    : item.name;
            }

        $div.setAttribute(
            "style",
            `position: absolute; 
            top: -5000px; 
            left: -5000px; 
            font-size: 14px`);

        document.body.appendChild($div);

        // sort items from longest to shortest as we want to show longer names first.
        selectedItems.sort((a, b) => { return b.name.length - a.name.length });

        let idx, selectedNames = selectedItems.map(item => getItemName(item)).join(", ");

        $div.innerHTML = filterLabel + ": " + selectedNames;

        let overflowOccurred = $div.clientWidth > maxWidth,
            moveToNextItem: boolean = true,
            itemsLength = selectedItems.length,
            fullLabel = overflowOccurred ? "" : selectedNames;

        // once overflow is detected try to get the label showing maximum number of characters along with +more count.
        for (let i = 0; overflowOccurred && moveToNextItem && i < itemsLength; i++) {
            let itemName: string = getItemName(selectedItems[i]),
                remainingCount = itemsLength - (i + 1);

            // set current item name in the div and see after placing the text we have enough space let to accomodate
            // "<at least 2 chars>... (+more)" format string. If not we truncate the current item name and append it with
            // more count as the final label, other wise we proceed onto the next item name.
            $div.innerHTML = filterLabel + ": " + fullLabel + itemName;
            moveToNextItem = (maxWidth - $div.clientWidth) >= remainingSpaceCap;

            if (moveToNextItem) {
                fullLabel += itemName + ", ";
            }
            else if (remainingCount <= 0) {
                fullLabel = itemName;
            }
            else {
                let itemNameLength = itemName.length,
                    itemLabel = "";

                // start from end of the string, and try accomodating the string along with +more count.
                // Break as soon as the length of the constructed label adjusts within the limits.
                for (let j = itemNameLength; j > 0; j--) {
                    let subtring = itemName.substr(0, j),
                        // If the label is able to contain the full item name, there is no need to show ellipsis.
                        separator = (j === itemNameLength) ? " " : "... ";

                    itemLabel = subtring + separator + "(+" + remainingCount.toString() + ")";

                    $div.innerHTML = filterLabel + ": " + fullLabel + itemLabel;

                    // break if the the label is long enough to be contained within the space we have.
                    if ($div.clientWidth < maxWidth) {
                        break;
                    }
                }

                fullLabel += itemLabel;
            }
        }

        document.body.removeChild($div);

        return {
            activeItemNamesOverflown: overflowOccurred,
            displayLabel: fullLabel,
            entireString: selectedNames
        };
    }
}
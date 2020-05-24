/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import { delay, equals } from "VSS/Utils/Core";
import { KeyCode } from "VSS/Utils/UI";
import { getId } from "VSS/Controls";

import { PathSearchDropdown, DropdownData, DropdownRow, DropdownItemPosition } from "VersionControl/Scenarios/Shared/Path/PathSearchDropdown";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/Shared/Path/PathExplorerCombobox";

export interface PathExplorerComboboxProps {
    inputText: string;
    onEditingCancel(options: { keepFocus: boolean }): void;
    onPathSelected(text: string, source?: string): void;
    onInputTextEdit(newText: string): void;
    onSearchItemSelection?(itemIndex: DropdownItemPosition, newInputText?: string): void;
    searchText?: string;
    isPathSearchEnabled: boolean;
    dropdownData?: DropdownData;
}

const inputElementRef = "InputElement";
const pathExplorerInputSource = "PathExplorerInputBox";
const pathDropdownSource = "PathExplorerDropdown";

export class PathExplorerCombobox extends React.Component<PathExplorerComboboxProps, {}> {
    private _isFocussed = true;
    private _dropdownId;

    constructor(props: PathExplorerComboboxProps) {
        super(props);
        this._dropdownId = 'DropDown' + getId();
    }

    public render(): JSX.Element {
        const {dropdownData} = this.props;
        let selectedResultId;

        const isDropdownPresent = Boolean(dropdownData);
        const isSearchResultSelected = dropdownData && this._isItemSelected(dropdownData.selectedItemPosition);
        const dropdownId = dropdownData && this._dropdownId;
        const ariaLabel = this.props.isPathSearchEnabled ? VCResources.PathExplorer_FindFileAriaLabel : VCResources.PathExplorer_NoSearchAriaLabel;
        const ariaAutoComplete = dropdownData ? "list" : undefined;
        const ariaExpanded = dropdownData && isDropdownPresent;

        if (isSearchResultSelected) {
            selectedResultId = PathSearchDropdown.getSearchItemId(dropdownData.selectedItemPosition)
        }

        return (
            <div
                className='path-explorer-combobox'
                onFocus={this.onControlFocus}
                onBlur={this.onControlBlur}>
                <div
                    className='input-container'
                    role={dropdownData && "combobox"}
                    aria-expanded={ariaExpanded}
                    aria-owns={dropdownId}
                    >
                    <input
                        autoFocus
                        type='text'
                        aria-label={ariaLabel}
                        value={this.props.inputText}
                        // we are using 'onInput' as 'onChange' misses keypress in IE11
                        onInput={this.onChange}
                        // empty 'onchange' handler to avoid react.js warning. https://github.com/facebook/react/issues/1118
                        onChange={() => { }}
                        onFocus={this.onInputElementFocus}
                        onKeyDown={this.onKeyDown}
                        ref={inputElementRef}
                        aria-autocomplete={ariaAutoComplete}
                        aria-controls={dropdownId}
                        aria-activedescendant={selectedResultId}
                        />
                    <KeyboardAccesibleComponent
                        className='bowtie-icon bowtie-navigate-close clear'
                        ariaLabel={VCResources.PathExplorer_ClearIconTooltip}
                        onClick={this.onCrossIconClick}/>
                    {
                        isDropdownPresent &&
                        <PathSearchDropdown
                            id={this._dropdownId}
                            cssClass='drop-popup'
                            onRowClick={this.onDropdownRowClick}
                            onRowMouseEnter={this.onDropdownRowMouseEnter}
                            data={this.props.dropdownData}
                            />
                    }
                    </div>
                <KeyboardAccesibleComponent
                    className='bowtie-icon bowtie-arrow-right navigate'
                    ariaLabel={VCResources.PathExplorer_NavigateIconTooltip}
                    onClick={this.navigate}/>
                </div>
        );
    }

    private onCrossIconClick = (): void => {
        this.props.onInputTextEdit("");
        (ReactDOM.findDOMNode(this.refs[inputElementRef]) as HTMLElement).focus();
    }

    private navigate = (): void => {
        this.props.onPathSelected(this.props.inputText, this._getSelectedItemSource());
    }

    private onDropdownRowClick = (row: DropdownRow) => {
        this.props.onPathSelected(row.text, pathDropdownSource);
    }

    private onDropdownRowMouseEnter = (itemIndex: DropdownItemPosition): void => {
        if (this.props.onSearchItemSelection) {
            this.props.onSearchItemSelection(itemIndex);
        }
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        switch (event.which) {
            case KeyCode.ESCAPE:
                this.props.onEditingCancel({ keepFocus: true });
                event.preventDefault();
                break;

            case KeyCode.UP:
                if (this.props.dropdownData && this.props.onSearchItemSelection) {
                    const previousItemPosition = getPreviousItemPosition(this.props.dropdownData);
                    this.props.onSearchItemSelection(
                        previousItemPosition,
                        getItemPath(this.props.dropdownData, this.props.searchText, previousItemPosition));
                    event.preventDefault();
                }
                break;

            case KeyCode.DOWN:
                if (this.props.dropdownData && this.props.onSearchItemSelection) {
                    const nextItemPosition = getNextItemPosition(this.props.dropdownData);
                    this.props.onSearchItemSelection(
                        nextItemPosition,
                        getItemPath(this.props.dropdownData, this.props.searchText, nextItemPosition));
                    event.preventDefault();
                }
                break;

            case KeyCode.ENTER:
                this.navigate();
                event.preventDefault();
                break;

            default:
                break;
        }
    }

    /**
     * This control has multiple focussable elements. onBlur event can be raised by 
     * the onBlur of any of those elements. So this method is a workaround to notify
     * that the control is still in focus.
     */
    private onControlFocus = (): void => {
        this._isFocussed = true;
    }

    private onControlBlur = (event: React.FormEvent<HTMLElement>): void => {
        this._isFocussed = false;
        // It is possible that focus shift is happening between the elements of this control only. 
        // Thus we verify it with isFocussed before calling onEditingCancelled
        delay(this, 0, () => {
            if (!this._isFocussed) {
                this.props.onEditingCancel({ keepFocus: this._isFocussed });
            }
        });
    }

    private onChange = (event: React.FormEvent<HTMLElement>): void => {
        const input = event.target as HTMLInputElement;
        this.props.onInputTextEdit(input.value);
    }

    private onInputElementFocus = (event: React.FormEvent<HTMLElement>): void => {
        const input = event.target as HTMLInputElement;
        input.select();
    }

    private _getSelectedItemSource(): string {
        if (this.props.dropdownData && this._isItemSelected(this.props.dropdownData.selectedItemPosition)) {
            return pathDropdownSource;
        }

        return pathExplorerInputSource;
    }

    private _isItemSelected(selectedItemPosition: DropdownItemPosition): boolean {
        return !equals(selectedItemPosition, getDefaultItemPosition());
    }
}

/**
 * This combobox considers search text as an item as well. Therefore Up/Down key navigation occurs 
 * on the combination of (rows in the dropdown + searchText of input box). This method returns (-1, -1) 
 * for representing the searchText's position. For an item present in dropdown, item's corresponding dropdown
 * postition is returned as it is.
 */
export function getNextItemPosition(dropdownData: DropdownData): DropdownItemPosition {
    if (!dropdownData) {
        return getDefaultItemPosition();
    }

    let itemPosition: DropdownItemPosition = {
        sectionIndex: dropdownData.selectedItemPosition.sectionIndex,
        rowIndex: dropdownData.selectedItemPosition.rowIndex + 1,
    }

    if (!(dropdownData.sections[itemPosition.sectionIndex] &&
        dropdownData.sections[itemPosition.sectionIndex].rows.length > itemPosition.rowIndex)) {
        itemPosition.sectionIndex = itemPosition.sectionIndex + 1;
        while (true) {
            if (itemPosition.sectionIndex === dropdownData.sections.length) {
                itemPosition = getDefaultItemPosition();
                break;
            }
            else if (dropdownData.sections[itemPosition.sectionIndex].rows.length > 0) {
                itemPosition.rowIndex = 0;
                break;
            }

            ++itemPosition.sectionIndex;
        }
    }

    return itemPosition;
}

/**
 * This combobox considers search text as an item as well. Therefore Up/Down key navigation occurs 
 * on the combination of (rows in the dropdown + searchText of input box). This method returns (-1, -1) 
 * for representing the searchText's position. For an item present in dropdown, item's corresponding dropdown
 * postition is returned as it is.
 */
export function getPreviousItemPosition(dropdownData: DropdownData): DropdownItemPosition {
    if (!dropdownData) {
        return getDefaultItemPosition();
    }

    let itemPosition: DropdownItemPosition = {
        sectionIndex: dropdownData.selectedItemPosition.sectionIndex,
        rowIndex: dropdownData.selectedItemPosition.rowIndex,
    }

    if (itemPosition.rowIndex > 0) {
        itemPosition.rowIndex = itemPosition.rowIndex - 1;
    }
    else {
        if (itemPosition.sectionIndex === getDefaultItemPosition().sectionIndex &&
            itemPosition.rowIndex === getDefaultItemPosition().rowIndex) {
            itemPosition.sectionIndex = dropdownData.sections.length - 1;
        }
        else {
            itemPosition.sectionIndex = itemPosition.sectionIndex - 1;
        }

        while (true) {
            if (itemPosition.sectionIndex === -1) {
                itemPosition = getDefaultItemPosition();
                break;
            }
            else if (dropdownData.sections[itemPosition.sectionIndex].rows.length > 0) {
                itemPosition.rowIndex = dropdownData.sections[itemPosition.sectionIndex].rows.length - 1;
                break;
            }

            --itemPosition.sectionIndex;
        }
    }

    return itemPosition;
}

export function getDefaultItemPosition(): DropdownItemPosition {
    return {
        sectionIndex: -1,
        rowIndex: -1,
    }
};

export function getSelectedItemPath(dropdownData: DropdownData, searchText: string): string {
    return getItemPath(dropdownData, searchText, dropdownData.selectedItemPosition);
}

/**
 * This combobox considers search text as an item as well. (-1, -1) are used for representing the 
 * the search text position. Therefore this method first checks if the itemPosition represents searchText.
 * If not, path is fetched from the item present at the itemPosition in dropdown data.
 */
export function getItemPath(dropdownData: DropdownData, searchText: string, itemPosition: DropdownItemPosition): string {
    const sectionIndex = itemPosition.sectionIndex;
    const rowIndex = itemPosition.rowIndex;

    if (sectionIndex === getDefaultItemPosition().sectionIndex && rowIndex === getDefaultItemPosition().rowIndex) {
        return searchText;
    }

    return dropdownData.sections[sectionIndex].rows[rowIndex].text;
}

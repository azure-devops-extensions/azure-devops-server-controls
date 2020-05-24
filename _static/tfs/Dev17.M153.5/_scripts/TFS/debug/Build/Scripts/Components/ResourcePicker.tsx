
import * as React from "react";

import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { Dropdown, IDropdownProps, IDropdownOption } from "OfficeFabric/Dropdown";
import { SearchBox, ISearchBoxProps } from "OfficeFabric/SearchBox";
import { TooltipHost } from "VSSUI/Tooltip";
import { BaseComponent, IRenderFunction } from "OfficeFabric/Utilities";

import { arrayEquals } from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Build/ResourcePicker";

namespace Keys {
    export const clear = "ResourcePicker_Clear";
    export const search = "ResourcePicker_Search";
}

export type KeyType = string | number;

export interface IClearResourceProps {
    ariaLabel: string;
    onClear: () => void;
}

export interface IResourcePickerOption extends IDropdownOption {
    tooltip?: string;
}

export interface IResourceSearchBoxProps extends ISearchBoxProps {
}

export interface IResourcePickerProps extends IDropdownProps {
    options: IResourcePickerOption[];
    searchBoxProps?: IResourceSearchBoxProps;
    selectedKey?: KeyType;
    onClearProps?: IClearResourceProps;
}

export class ResourcePicker extends BaseComponent<IResourcePickerProps, {}> {
    private _dropDown: Dropdown = null;
    private _selectedOption: IResourcePickerOption = null;

    constructor(props: IResourcePickerProps) {
        super(props);
    }

    public render(): JSX.Element {
        const { searchBoxProps, className, onRenderItem, onChanged, selectedKey, ...props } = this.props;
        let options = this.props.options;

        // inject search box if required
        if (this.props.searchBoxProps) {
            options.unshift({
                key: Keys.search,
                text: ""
            });
        }

        const clearOptionExists = options.some((option) => {
            return option.key === Keys.clear;
        });

        if (!!this.props.onClearProps && !clearOptionExists) {
            options.push({
                key: Keys.clear,
                text: ""
            });
        }

        return <Dropdown
            ref={this._resolveRef('_dropDown')}
            className={`build-resource-picker-control ${this.props.className}`}
            onRenderItem={this._onRenderItem}
            onRenderTitle={this._onRenderTitle}
            onChanged={this._onChanged}
            {...props}
        />;
    }

    public componentDidMount() {
        if (this.props.selectedKey) {
            this.setSelectedKey(this.props.selectedKey);
        }
    }

    public componentWillReceiveProps(nextProps: IResourcePickerProps) {
        if (this.props.selectedKey != nextProps.selectedKey) {
            this.setSelectedKey(nextProps.selectedKey);
        }
    }

    public componentWillUpdate(nextProps: IResourcePickerProps, nextState) {
        if (!this._areOptionsEqual(this.props.options, nextProps.options)) {
            // if options change, reset the selection so that we will select the right option later
            this._selectedOption = null;
        }
    }

    public setSelectedKey(key: KeyType) {
        if (this._dropDown) {
            // find the index
            let indexToSelect = -1;
            this.props.options.some((option, index) => {
                if (option.key === key) {
                    indexToSelect = index;
                    return true;
                }

                return false;
            });

            if (indexToSelect != -1) {
                const currentOptionToSelect = this.props.options[indexToSelect];
                if (!this._isAlreadySelected(currentOptionToSelect.key)) {
                    this._selectedOption = currentOptionToSelect;
                    this._dropDown.setSelectedIndex(indexToSelect);
                }
            }
            else {
                this.resetSelection();
            }
        }
    }

    public resetSelection() {
        this._selectedOption = this.props.options && this.props.options[0];
        this._dropDown && this._dropDown.setSelectedIndex(0);
    }

    private _onChanged = (option: IResourcePickerOption, index: number) => {
        if (option && option.key !== Keys.search && !this._isAlreadySelected(option.key)) {
            this._selectedOption = option;
            this.props.onChanged(option, index);
        }
    }

    private _onRenderItem = (props: IResourcePickerOption, defaultRender: (props: IResourcePickerOption) => JSX.Element) => {
        if (props.key === Keys.search) {
            return <SearchBox key={props.key} {...this.props.searchBoxProps} />;
        }

        if (props.key === Keys.clear) {
            return <CommandButton
                key={props.key}
                className="build-resource-clear-button"
                iconProps={{ iconName: "Clear" }}
                onClick={this._onClear}
                onKeyDown={this._onKeyDown}
                ariaLabel={this.props.onClearProps.ariaLabel}>
                {BuildResources.Clear}
            </CommandButton>;
        }

        let itemContent: JSX.Element = null;

        if (this.props.onRenderItem) {
            itemContent = this.props.onRenderItem(props, defaultRender);
        }
        else {
            itemContent = defaultRender(props);
        }

        if (props.tooltip) {
            return <TooltipHost
                content={props.tooltip}
                directionalHint={DirectionalHint.leftTopEdge}>
                {itemContent}
            </TooltipHost>;
        }

        return itemContent;
    }

    private _onRenderTitle = (selectedOptions: IResourcePickerOption[], defaultRender: (props: IResourcePickerOption[]) => JSX.Element) => {
        const firstItem = selectedOptions && selectedOptions[0];
        let isSearchBoxSelected = firstItem && firstItem.key === Keys.search;

        // if search box is added and a place holder exists, then we need to make sure we render place holder instead of leaving it to default rendering
        if (this.props.placeHolder && this.props.searchBoxProps && isSearchBoxSelected) {
            return <span>{this.props.placeHolder}</span>;
        }

        return defaultRender(selectedOptions);
    }

    private _onClear = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        this._clear();
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        triggerEnterKeyHandler(event, this._clear);
    }

    private _clear = () => {
        this.props.onClearProps.onClear();
    }

    private _isAlreadySelected(key: KeyType): boolean {
        return this._selectedOption && this._selectedOption.key === key;
    }

    private _areOptionsEqual(optionsA: IResourcePickerOption[], optionsB: IResourcePickerOption[]) {
        let areEqual = true;

        if (optionsA && !optionsB) {
            areEqual = false;
        }
        else if (optionsB && !optionsA) {
            areEqual = false;
        }
        else if (optionsB && optionsA) {
            if (optionsA.length != optionsB.length) {
                areEqual = false;
            }
            else if (!arrayEquals(optionsA, optionsB, (a, b) => a.key == b.key)) {
                areEqual = false;
            }
        }

        return areEqual;
    }
}
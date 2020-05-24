/// <reference types="react" />

import * as React from "react";

import * as PopupMenuButton from "Presentation/Scripts/TFS/Components/PopupMenuButton";
import * as PopupMenu from "Presentation/Scripts/TFS/Components/PopupMenu";
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";

import * as FilteredListComponent from "TestManagement/Scripts/TestReporting/WebComponents/Components/FilteredList";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { IItem } from "TestManagement/Scripts/TestReporting/Common/Common";

import * as Controls from "VSS/Controls";
import * as Menus from "VSS/Controls/Menus";
import * as Utils_String from "VSS/Utils/String";
import { delegate } from "VSS/Utils/Core";
import Utils_UI = require("VSS/Utils/UI");

// Filter Item section begin

export interface IFilterItemProps extends TFS_React.IProps {
    getItemList: () => IPromise<IItem[]>;
    onFilterChanged: (filterItem: IItem) => void;
    state: IFilterItemState;
}

export interface IFilterItemState extends TFS_React.IState {
    isVisible: boolean;
    isConfigured: boolean;
    value: string;
}

export class FilterItem extends React.Component<IFilterItemProps, IFilterItemState> {

    public componentWillMount(): void {
        this._initializeState();
    }

    public componentWillReceiveProps(nextProps: IFilterItemProps): void {
        this.setState(nextProps.state);
    }

    public render(): JSX.Element {
        let element: JSX.Element = null;

        if (this.state.isVisible) {
            if (this.state.isConfigured) {
                element = (
                    <div className="sl-fltr-bx left" >
                        <span className="fltr-val left">{this.state.value}</span>
                        <span className="fltr-close bowtie-icon bowtie-status-failure right" tabIndex={0} onKeyDown={this._handleKeyDown} onClick={delegate(this, this._onRemove)} />
                    </div>
                );
            } else {
                element = (
                    <div className="sl-fltr-cmp left" >
                        <FilteredListComponent.FilteredList listName="Branches" onSelectionChanged={delegate(this, this._onItemSelected) } getItemList={this.props.getItemList} containerCssClass="sl-fltr-cmp" />
                    </div>
                );
            }
        }

        return element;
    }

    private _handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onRemove(event);
        }
    }

    private _onRemove(e: any): void {
        this.setState({
            isVisible: false,
            isConfigured: false,
            value: Utils_String.empty
        } as IFilterItemState);

        this.props.onFilterChanged(null);
    }

    private _onItemSelected(selectedItem: IItem): void {
        this.setState({
            isVisible: true,
            isConfigured: true,
            value: selectedItem.name
        } as IFilterItemState);

        this.props.onFilterChanged(selectedItem);
    }

    private _initializeState(): void {
        this.setState({
            isVisible: false,
            isConfigured: false,
            value: Utils_String.empty
        } as IFilterItemState);
    }
}

// Filter Item section end

// Drop down filter sector control section begin

export interface IFilterOptions extends Menus.IMenuItemSpec {
    getItemList: () => IPromise<IItem[]>;
    onFilterSelected: (filterItem: IItem) => void;
}

export interface IDropDownFilterProps extends TFS_React.IProps {
    filterOptions: IFilterOptions[];
}

export interface IDropDownFilterState extends TFS_React.IState {
    childrenStates: IFilterItemState[]; 
}

export class DropDownFilter extends React.Component<IDropDownFilterProps, IDropDownFilterState> {

    public componentWillMount(): void {
        this._initializeMenuOptions();
        this._initializeChildrenState();
    }

    public render(): JSX.Element {
        this._setChildrenState();

        return (
            <div className="tri-wc-dd-filter" >
                <div className="fltr-container left" >
                    {this.props.filterOptions.map((filter: IFilterOptions, index: number) => <FilterItem state={this.state.childrenStates[index]} key={index} getItemList={filter.getItemList} onFilterChanged={filter.onFilterSelected} />) }
                    </div>
                <div className="fltr-sltr right" >
                    <span className="bowtie-icon bowtie-search-filter left" />
                    <PopupMenuButton.Component
                        className = "filter-btn right"
                        buttonCssClass = "clr-btn"
                        titleText = "Filter"
                        iconCssClass = "bowtie-chevron-down"
                        menuOptions = {this._getMenuOptions() } />
                </div>
            </div>
        );
    }

    private _getMenuOptions(): Menus.PopupMenuOptions {
        this._menuOptions.items = [{
            childItems: this.props.filterOptions.map((option: Menus.IMenuItemSpec, index: number) => {
                option.action = () => {
                    this.state.childrenStates[index] = {
                        isVisible: true,
                        isConfigured: false
                    } as IFilterItemState;
                    this.setState(this.state);
                };

                return option;
            })
        }];
        return this._menuOptions;
    }

    private _initializeMenuOptions(): void {
        this._menuOptions = {
            align: "right-bottom",
            useBowtieStyle: true
        } as Menus.PopupMenuOptions;
    }

    private _initializeChildrenState(): void {
        this.setState({
            childrenStates: []
        } as IDropDownFilterState);
    }

    private _setChildrenState(): void {
        this.props.filterOptions.forEach((index, option) => {
            this.state.childrenStates.push({
                isVisible: false,
                isConfigured: false,
                value: Utils_String.empty
            } as IFilterItemState);
        });
    }

    private _menuOptions: Menus.PopupMenuOptions;
}

// Drop down filter control section end




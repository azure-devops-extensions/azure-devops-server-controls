/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import { css } from "OfficeFabric/Utilities";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { CommandButton } from 'OfficeFabric/Button';
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/ContextualMenu";
import { ICalloutProps } from "OfficeFabric/Callout";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from 'OfficeFabric/Utilities';
import { reset } from "Search/Scripts/React/Components/MiddleSection/FilterScrubbers";
import { FilterNameList, FilterNameValue, IFilterCategory } from "Search/Scripts/Contracts/TFS.Search.Core.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import { ignoreCaseComparer } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Search/React/Components/FilterToggleButton";

export const FilterToggleButtonMenuItem = (actionCreator: ActionCreator, storesHub: StoresHub): IContextualMenuItem => {
    return {
        name: "",
        key: "filterToggleButton",
        className: "filter-toggle-button",
        onRender: (item: IContextualMenuItem) => {
            return <FilterToggleButton actionCreator={actionCreator} storesHub={storesHub} />
        }
    };
}

export interface IFilterToggleButtonProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface IFilterToggleButtonState {
    filtersApplied: boolean,
    filtersVisible: boolean,
    providersLoaded: boolean
}

export class FilterToggleButton extends React.Component<IFilterToggleButtonProps, IFilterToggleButtonState> {
    private _viewState: IFilterToggleButtonState;
    constructor(props: IFilterToggleButtonProps) {
        super(props);

        this.state = this._viewState = {
            filtersApplied: false,
            filtersVisible: true,
            providersLoaded: false
        };
    }

    public render(): JSX.Element {
        let toggleButtonClass = css('bowtie-icon', {
            'bowtie-search-filter-fill': this.state.filtersApplied,
            'bowtie-search-filter': !this.state.filtersApplied
        });
        let content = this.state.filtersVisible ? Resources.FilterButtonHideFilterPanel : Resources.FilterButtonShowFilterPanel;

        return (
            <TooltipHost
                content={content}
                directionalHint={DirectionalHint.topCenter}
                hostClassName='filter-toggle-tooltip'>
                {
                    this.state.providersLoaded &&
                    <CommandButton
                        iconProps={{ iconName: undefined, className: toggleButtonClass }}
                        onClick={() => this.props.actionCreator.toggleFiltersVisibility()}
                        ariaLabel={content}>
                    </CommandButton>
                }
            </TooltipHost>
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.filterStore.addChangedListener(this._onFiltersStoreUpdated);
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onProvidersUpdated);
    }

    @autobind
    private _onProvidersUpdated(): void {
        let providerTabs: Models.SearchPivotTabItem[] = this.props.storesHub.searchProvidersStore.ProviderTabs;
        if (providerTabs &&
            providerTabs.length) {
            this._viewState.providersLoaded = true;
            this.setState(this._viewState);
        }
    }

    @autobind
    private _onFiltersStoreUpdated(): void {
        let filtersApplied = this._isFilterApplied(),
            filtersVisible = this.props.storesHub.filterStore.getFiltersVisibility();

        this._viewState.filtersApplied = filtersApplied;
        this._viewState.filtersVisible = filtersVisible;

        this.setState(this._viewState);
    }

    private _isFilterApplied(): boolean {
        if (this.state.providersLoaded) {
            let currentProvider = this.props.storesHub.searchProvidersStore.CurrentProvider;

            let currentFilters = this.props.storesHub.filterStore.filters(currentProvider);

            let defaultFilters = reset(currentProvider);
            let defaultFiltersMap: IDictionaryStringTo<any> = {};
            defaultFilters.forEach((filter) => {
                if (Array.isArray(filter.values)) {
                    filter.values = filter.values.sort();
                }
                defaultFiltersMap[filter.name] = filter.valuesToString();
            });

            let defaultFiltersApplied = currentFilters.every((filter) => {
                let currentFilterCategory = filter.toIFilterCategory();
                let defaultFilterValues = defaultFiltersMap[currentFilterCategory.name];

                if (!defaultFilterValues) {
                    defaultFilterValues = "";
                }

                if (ignoreCaseComparer(defaultFilterValues, currentFilterCategory.valuesToString()) === 0) {
                    return true;
                }
                
                return false;
            });

            return !defaultFiltersApplied;
        }

        return false;
    }
}
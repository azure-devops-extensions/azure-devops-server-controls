/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import { Icon } from "OfficeFabric/Icon"
import { autobind, css } from 'OfficeFabric/Utilities';
import Utils_String = require("VSS/Utils/String");
import { IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/ContextualMenu";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { CommandButton, IconButton, IButtonProps } from 'OfficeFabric/Button';
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Utils_Core = require("VSS/Utils/Core");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { WorkItemCommon, Utils } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";

import "VSS/LoaderPlugins/Css!Search/React/Components/SortByDropdown";

export interface ISortField {
    referenceName: string,
    displayName: string
}

export interface ISortByDropdownProps {
    isClientSideSortEnabled: boolean,
    isServerSortEnabled: boolean,
    searchEntity: string,
    sortFields: ISortField[],
    actionCreator: ActionCreator,
    storesHub: StoresHub
}

export interface ISortByDropdownState {
    sortOption: Models.ISortOption,
    totalResultsCount: number,
    // [TODO: aajohari] This is a redundant variable. Should be disposed of when 
    // totalResultsCount fluctuation is fixed.
    visible: boolean
}

const providersProperties: IDictionaryStringTo<(actionCreator: ActionCreator, storesHub: StoresHub) => ISortByDropdownProps> = {};

providersProperties[SearchConstants.CodeEntityTypeId] =
    (actionCreator: ActionCreator, storesHub: StoresHub) => {
        let isCodeSearchServerSortEnabled: any = Helpers.Utils.isFeatureFlagEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeServerSort),
            isClientSortEnabled: any = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCodeClientSort);

        return {
            isClientSideSortEnabled: isClientSortEnabled,
            isServerSortEnabled: isCodeSearchServerSortEnabled,
            searchEntity: SearchConstants.CodeEntityTypeId,
            sortFields: [{
                referenceName: "relevance",
                displayName: Search_Resources.SortOptionRelevance,
            },
            {
                referenceName: "path",
                displayName: Search_Resources.SortOptionFilePath,
            },
            {
                referenceName: "fileName",
                displayName: Search_Resources.SortOptionFileName,
            }],
            actionCreator: actionCreator,
            storesHub: storesHub
        };
    };

providersProperties[SearchConstants.WorkItemEntityTypeId] =
    (actionCreator: ActionCreator, storesHub: StoresHub) => {
        let isWorkItemClientSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemClientSort),
            isWorkItemServerSortEnabled = Helpers.Utils.isFeatureFlagEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemServerSort),

            sortFields = Object.keys(WorkItemCommon.FIELD_METADATA).map((refName, index) => {
                if (Utils_String.ignoreCaseComparer("system.rev", refName) !== 0) {
                    return {
                        referenceName: refName,
                        displayName: WorkItemCommon.FIELD_METADATA[refName].displayName,
                    }
                }
            }).filter((p, i) => {
                return !!p;
            });

        return {
            isClientSideSortEnabled: isWorkItemClientSortEnabled,
            isServerSortEnabled: isWorkItemServerSortEnabled,
            searchEntity: SearchConstants.WorkItemEntityTypeId,
            sortFields: sortFields.sort((first, second) => {
                return Utils_String.ignoreCaseComparer(first.displayName, second.displayName);
            }),
            actionCreator: actionCreator,
            storesHub: storesHub
        };
    };

export const SortByDropdownMenuItem = (actionCreator: ActionCreator, storesHub: StoresHub): IContextualMenuItem => {
    return {
        name: "",
        key: "sortByDropdownItem",
        className: "sort-by-Dropdown-item",
        onRender: (item: IContextualMenuItem) => {
            return <SortByDropdownWrapper
                actionCreator={actionCreator}
                storesHub={storesHub} />
        }        
    };
}

export interface ISortByDropdownWrapperProps {
    actionCreator: ActionCreator,
    storesHub: StoresHub
}

export interface ISortByDropdownWrapperState {
    currentProvider: string
}

export class SortByDropdownWrapper extends React.Component<ISortByDropdownWrapperProps, ISortByDropdownWrapperState> {
    public constructor(props: ISortByDropdownWrapperProps) {
        super(props);

        this.state = {
            currentProvider: this.props.storesHub.searchProvidersStore.CurrentProviderTab.entityId
        };
    }

    public render(): JSX.Element {
        if (this.state.currentProvider) {
            let currentProvider = this.props.storesHub.searchProvidersStore.CurrentProviderTab;

            let currentProviderProps = providersProperties[this.state.currentProvider](this.props.actionCreator, this.props.storesHub);

            if (currentProviderProps.isClientSideSortEnabled || currentProviderProps.isServerSortEnabled) {
                return <SortByDropdown
                    {...currentProviderProps}
                    actionCreator={this.props.actionCreator}
                    storesHub={this.props.storesHub} />
            }
        }

        return null;
    }

    public componentDidMount(): void {
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onSearchProviderChanged.bind(this));
    }

    private _onSearchProviderChanged(): void {
        this.setState({ currentProvider: this.props.storesHub.searchProvidersStore.CurrentProviderTab.entityId });
    }
}

export class SortByDropdown extends React.Component<ISortByDropdownProps, ISortByDropdownState> {
    private _state: ISortByDropdownState;

    public constructor(props: ISortByDropdownProps) {
        super(props);

        this._state = {
            sortOption: props.storesHub.sortCriteriaStore.firstSortOption,
            totalResultsCount: props.storesHub.searchResultsStore.totalResultsCount,
            visible: props.storesHub.searchResultsStore.totalResultsCount > 1
        }

        this.state = this._state;
    }

    public render(): JSX.Element {
        if (this.state.visible) {
            let {displayName, referenceName} = getCurrentSelectedItem(this.props.sortFields, this.state.sortOption.field);
            let isRelevanceField = Utils_String.ignoreCaseComparer(this.state.sortOption.field, WorkItemConstants.RELEVANCE_FIELD_REFERENCE_NAME) === 0;
            let item: IContextualMenuItem = {
                itemType: ContextualMenuItemType.Header,
                name: Search_Resources.SortByDropdownHeader,
                key: 'SortByDropdownMenuHeader',
                className: 'sortby-header-item'
            };

            let tooltipText = Search_Resources.SortByDropdownTooltip.replace("{0}", displayName);

            return (
                <span>
                    <TooltipHost
                        content={tooltipText}
                        directionalHint={DirectionalHint.topCenter}
                        hostClassName='sortby-dropdown-tooltip'>
                        <IconButton className='sort-order-button'
                            iconProps={{
                                className: css('sort-order-icon', 'bowtie-icon', {
                                    'bowtie-sort-asc': this.state.sortOption.sortOrder === 'asc',
                                    'bowtie-sort-desc': this.state.sortOption.sortOrder === 'desc'
                                })
                            }}
                            onClick={this._onSortButtonClick}
                            disabled={isRelevanceField} />
                        <div className='sort-dropdown-separator' />
                        <CommandButton
                            className='sortby-dropdown-button'
                            text={displayName}
                            menuProps={{
                                shouldFocusOnMount: true,
                                directionalHint: DirectionalHint.bottomAutoEdge,
                                items: [item].concat(this.props.sortFields.map((item, index) => ({
                                    key: item.referenceName,
                                    name: item.displayName,
                                    onClick: this._onSelection,
                                    canCheck: true,
                                    role: "menuitem",
                                    checked: referenceName === item.referenceName
                                } as IContextualMenuItem)))
                            }}

                            onRenderMenuIcon={(props: IButtonProps): JSX.Element => {
                                return <Icon className={css("bowtie-icon", "bowtie-chevron-down-light", "sortby-button-chevron")} />;
                            }} />
                    </TooltipHost>
                </span>);
        }
        else {
            return <div/>
        }
    }

    public componentDidMount(): void {
        this.props.storesHub.searchResultsStore.addChangedListener(this._onResultsStoreChanged.bind(this));
        this.props.storesHub.sortCriteriaStore.addChangedListener(this._onSortCriteriaStoreChanged.bind(this));
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onResultsStoreChanged.bind(this));
        this.props.storesHub.filterStore.addChangedListener(this._onFiltersStoreChanged.bind(this));
    }

    private _onFiltersStoreChanged(): void {
        let totalResults = this.props.storesHub.searchResultsStore.totalResultsCount;
        this._state.visible = totalResults > 1;
        this.setState(this._state);
    }

    /**
     * Method is invoked whenever there is a change in the ResultsInfo store's state(flux component)
     * It updates the state of the component after compiling it from the results info store.
     */
    private _onResultsStoreChanged(): void {
        this._state.totalResultsCount = this.props.storesHub.searchResultsStore.totalResultsCount;

        // Update the sort criteria.
        this._state.sortOption = this.props.storesHub.sortCriteriaStore.firstSortOption;
        this.setState(this._state);
    }

    private _onSortCriteriaStoreChanged(): void {
        this._state.sortOption = this.props.storesHub.sortCriteriaStore.firstSortOption;
        this.setState(this._state);
    }

    /**
     * Method is called upon selection of an item from the drop down list.
     * It updates components state after setting the selectedItem property.
     * @param item
     */
    @autobind
    private _onSelection(ev?: any, item?: IContextualMenuItem): void {
        // Create action only if the sort field changes.
        if (Utils_String.ignoreCaseComparer(
            this.state.sortOption.field,
            item.key) !== 0) {
            // invoke sort option for new field with existing sort order.
            this._invokeSortAction(item.key, this.state.sortOption.sortOrder, false)
        }
    }

    /**
     * Method is called upon clicking the button to change the sort order.
     * It modifies the state to update the sort order appropriately.
     */
    @autobind
    private _onSortButtonClick(): void {
        this._invokeSortAction(this.state.sortOption.field, this.state.sortOption.sortOrder, true);
    }

    private _invokeSortAction(field: string, order: string, toggleOrder: boolean): void {
        let isRelevanceField = Utils_String.ignoreCaseComparer(field, WorkItemConstants.RELEVANCE_FIELD_REFERENCE_NAME) === 0,
            // If field is "relevance" order is always descending.
            clientSortResultLimit = this.props.searchEntity === SearchConstants.CodeEntityTypeId ? SearchConstants.CodeSearchClientSortLimit : SearchConstants.WorkItemSearchTakeResults,
            sortOrder = isRelevanceField ? "desc" : (toggleOrder ? (order === "asc" ? "desc" : "asc") : order),
            suppressNavigate = this.state.totalResultsCount <= clientSortResultLimit,
            replaceHistory = this.props.searchEntity === SearchConstants.CodeEntityTypeId ? true : false,
            currentSearchProvider = this.props.storesHub.searchProvidersStore.CurrentProvider;

        this.props
            .actionCreator
            .changeSearchResultsSortCriteria([{
                field: field,
                sortOrder: sortOrder
            }],
            this.props.isServerSortEnabled,
            currentSearchProvider,
            suppressNavigate,
            replaceHistory);

        TelemetryHelper.traceLog({
            "SearchResultsSortControlColumnV2": field,
            "SearchResultsSortControlSortOrderV2": sortOrder
        });
    }
}

function getCurrentSelectedItem(items: Array<ISortField>, refName: string): ISortField {
    let currentSelectedItemIndex: number;
    for (let i = 0; i < items.length; i++) {
        if (Utils_String.ignoreCaseComparer(
            items[i].referenceName,
            refName) === 0) {
            currentSelectedItemIndex = i;
            break;
        }
    }

    return items[currentSelectedItemIndex];
}
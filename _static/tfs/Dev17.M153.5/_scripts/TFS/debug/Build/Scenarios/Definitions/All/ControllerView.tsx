/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import {
    ConstrainMode,
    DetailsListLayoutMode,
    DetailsList,
    IColumn,
    SelectionMode,
    CheckboxVisibility
} from "OfficeFabric/DetailsList";
import { BaseComponent, IBaseProps } from 'OfficeFabric/Utilities';
import { IDragDropContext } from "OfficeFabric/utilities/dragdrop/interfaces";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

import { AllDefinitionsActionCreator, createFilterTextForFuzzySearch } from "Build/Scenarios/Definitions/All/Actions/AllDefinitionsActionCreator";
import { NameColumn } from "Build/Scenarios/Definitions/All/Components/NameColumn";
import { getStore, Store, IRow, IItemType } from "Build/Scenarios/Definitions/All/Stores/AllDefinitions";
import { getInstance as getViewStateInstance, ViewStateStore } from "Build/Scenarios/Definitions/ViewState";
import { Component as BuildMetricPassRateComponent } from "Build/Scripts/Components/BuildMetricPassRate";
import { GettingStarted } from "Build/Scripts/Components/GettingStarted";
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import { LoadingComponent } from "Build/Scripts/Components/Loader";
import { raiseSearchResultsAvailableMessage } from "Build/Scripts/Events/AllDefinitionsSearchEvents";
import { UserActions, WellKnownBuiltFilterValues } from "Build/Scripts/Constants";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import { getPathData, onFolderClick } from "Build/Scripts/Folders";
import { getDefinitionLink } from "Build/Scripts/Linking";
import { focusFocusableElement, focusDetailsListRow } from "Build/Scripts/ReactFocus";
import { hasDefinitionPermission } from "Build/Scripts/Security";
import { Features, Properties, publishEvent } from "Build/Scripts/Telemetry";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";

import { GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildPermissions, DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import { RootPath } from "Build.Common/Scripts/Security";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildMetric, BuildDefinitionReference, DefinitionQuality, DefinitionQueryOrder, Folder } from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import { logError, logInfo } from "VSS/Diag";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";
import { EventService, getService as getEventService } from "VSS/Events/Services";
import { getCollectionService } from "VSS/Service";
import { friendly } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";
import { using } from "VSS/VSS";

import "VSS/LoaderPlugins/Css!fabric";

import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/All/AllDefinitions";

export interface IStores {
    agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    allDefinitionsStore: Store;
}

namespace ListColumnKeys {
    export const Name = "name";
    export const BranchSummary = "branchSummary";
    export const Queued = "queued";
    export const Running = "running";
    export const PassRate = "passRate";
    export const LastBuilt = "lastBuilt";
}

interface ISortDefinitionsEventArgs {
    queryOrder: DefinitionQueryOrder;
}

export interface IProps extends IBaseProps {
    stores?: IStores;
}

export interface IState {
    agents: AgentExistenceStore_NO_REQUIRE.IAgents;
    continuationToken: string;
    rows: IRow[];
    favoritesFirst: boolean;
    folderPath: string;
    filter: GetDefinitionsOptions;
    hasDefinitions: boolean;
    hasFolders: boolean;
    initializing: boolean;
    noAutoFocus: boolean;
}

// Parent component for Definition's All Definitions tab
export class ControllerView extends BaseComponent<IProps, IState> {
    private _tfsContext: TfsContext;

    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    private _allDefinitionsActionCreator: AllDefinitionsActionCreator;
    private _allDefinitionsStore: Store;
    private _eventManager: EventService;
    private _viewState: ViewStateStore;

    private _favoritesFirst: boolean = false;
    private _isMounted: boolean = false;
    private _list: ListComponent;

    constructor(props: IProps) {
        super(props);

        this._tfsContext = TfsContext.getDefault();

        this._agentExistenceStore = (props.stores && props.stores.agentExistenceStore) ? props.stores.agentExistenceStore : null;

        this._allDefinitionsStore = (props.stores && props.stores.allDefinitionsStore) ? props.stores.allDefinitionsStore : getStore();
        this._viewState = getViewStateInstance();
        this._eventManager = getEventService();
        this._allDefinitionsActionCreator = getCollectionService(AllDefinitionsActionCreator);

        this.state = this._getState();

        let telemetryProperties = {};
        telemetryProperties[Properties.HasFolders] = this._allDefinitionsStore.hasFolders();
        publishEvent(Features.AllDefinitionsTabLoaded, null, telemetryProperties);
    }

    public render(): JSX.Element {
        document.title = BuildResources.AllDefinitionsPageTitle;

        let rows = this.state.rows;
        let gettingStarted: JSX.Element = null;
        let showList = this.state.hasDefinitions || this.state.hasFolders;

        let queryOrder = DefinitionQueryOrder.DefinitionNameAscending;

        if (this.state.filter.queryOrder) {
            queryOrder = this.state.filter.queryOrder;
        }

        if (this.state.initializing || !this.state.agents.initialized) {
            return <LoadingComponent />;
        }

        if ((!this.state.hasDefinitions && !this.state.hasFolders) || !this.state.agents.exists) {
            gettingStarted = <GettingStarted projectName={getPageContext().webContext.project.name} showDefinitionHelper={!this.state.hasDefinitions && !this.state.hasFolders} showAgentHelper={!this.state.agents.exists} />;
        }

        const isSearchActive = !!this.state.filter.name;
        // don't try to focus any rows by default if the search is active or "more" is clicked or when store decides it's not an event to reset focus
        const noAutoFocus = this.state.noAutoFocus || isSearchActive || !!this.state.filter.continuationToken;

        if (showList) {
            return <div>
                {gettingStarted}
                <ListComponent
                    ref={this._resolveRef('_list')}
                    rows={rows}
                    queryOrder={queryOrder}
                    hasMore={!!this.state.continuationToken}
                    folderPath={this.state.folderPath}
                    isSearchActive={isSearchActive}
                    noAutoFocus={noAutoFocus}
                />
            </div>;
        }
        else {
            return gettingStarted;
        }
    }

    public componentDidMount() {
        this._isMounted = true;
        this._allDefinitionsStore.addChangedListener(this._onStoresUpdated);
        this._viewState.addChangedListener(this._onStoresUpdated);

        this._eventManager.attachEvent(UserActions.GetMoreAllDefinitions, this._moreClicked);
        this._eventManager.attachEvent(UserActions.SortDefinitions, this._sortClicked);
        this._eventManager.attachEvent(UserActions.FolderClicked, this._folderClicked);
        this._eventManager.attachEvent(UserActions.ToggleFavoritesFirst, this._onToggleFavoritesFirst);
        this._eventManager.attachEvent(UserActions.ApplyBuiltFilter, this._onApplyBuiltFilter);
        this._eventManager.attachEvent(UserActions.SearchDefinitions, this._onSearchDefinitions);

        if (this.state.filter) {
            if (this.state.filter.name && !this._viewState.getSearchText()) {
                // if store has filtered data, but the view state has no context of search, we should make sure store has latest state information
                // this happens when user switches to different tab after when search is triggered on all definitions tab
                let filter = { ...this.state.filter };
                filter.name = undefined;
                this._allDefinitionsActionCreator.getAllDefinitions(filter);
            }
        }
    }

    public componentWillUnmount() {
        this._isMounted = false;
        this._eventManager.detachEvent(UserActions.GetMoreAllDefinitions, this._moreClicked);
        this._eventManager.detachEvent(UserActions.SortDefinitions, this._sortClicked);
        this._eventManager.detachEvent(UserActions.FolderClicked, this._folderClicked);
        this._eventManager.detachEvent(UserActions.ToggleFavoritesFirst, this._onToggleFavoritesFirst);
        this._eventManager.detachEvent(UserActions.ApplyBuiltFilter, this._onApplyBuiltFilter);
        this._eventManager.detachEvent(UserActions.SearchDefinitions, this._onSearchDefinitions);

        this._allDefinitionsStore.removeChangedListener(this._onStoresUpdated);
        this._viewState.removeChangedListener(this._onStoresUpdated);

        if (this._agentExistenceStore) {
            this._agentExistenceStore.removeChangedListener(this._onStoresUpdated);
        }
    }

    public componentWillUpdate(nextProps: IProps, nextState: IState) {
        const filter = this.state.filter;
        if (this._list && filter && filter.continuationToken) {
            const key = getKeyToSelectFromGridWithMoreButton(this.state.rows, nextState.rows);
            key && this._list.selectRow(key);
        }
    }

    private _folderClicked = (sender: any, path: string) => {
        let filter = this.state.filter;
        filter.continuationToken = "";
        filter.path = path;
        this._allDefinitionsActionCreator.getAllDefinitions(filter);
    };

    private _getAgents(): AgentExistenceStore_NO_REQUIRE.IAgents {
        let initialized = true;
        if (this._agentExistenceStore) {
            return this._agentExistenceStore.agents();
        }

        if (!this._tfsContext.isHosted && !this._tfsContext.isDevfabric) {
            // initialize only for onprem
            this._initializeAgentStore();
            initialized = false;
        }

        return {
            exists: true,
            initialized: initialized
        };
    }

    private _getState(noAutoFocus?: boolean): IState {
        let folderPath = this._viewState.getFolderPath() || RootPath;

        let filter = this._allDefinitionsStore.getFilter();
        let queryOrder = DefinitionQueryOrder.DefinitionNameAscending;
        let showFolders = true;

        if (filter) {
            queryOrder = filter.queryOrder || DefinitionQueryOrder.DefinitionNameAscending;
            // if search is active, we don't show any folders
            showFolders = !filter.name;
        }

        return {
            agents: this._getAgents(),
            continuationToken: this._allDefinitionsStore.getContinuationToken(),
            rows: this._allDefinitionsStore.getRows(folderPath, this._favoritesFirst, showFolders, queryOrder),
            favoritesFirst: this.state ? !!this.state.favoritesFirst : false,
            filter: this._allDefinitionsStore.getFilter(),
            folderPath: folderPath,
            hasDefinitions: this._allDefinitionsStore.hasDefinitions(),
            hasFolders: this._allDefinitionsStore.hasFolders(),
            initializing: this._allDefinitionsStore.isInitializing(),
            noAutoFocus: !!noAutoFocus
        };
    }

    private _initializeAgentStore() {
        using(["Build/Scripts/Stores/AgentExistence"], (_AgentExistenceStore: typeof AgentExistenceStore_NO_REQUIRE) => {
            if (!this._agentExistenceStore) {
                this._agentExistenceStore = _AgentExistenceStore.getStore();
                this._agentExistenceStore.addChangedListener(this._onStoresUpdated);

                // first time
                this._onStoresUpdated();
            }
        });
    }

    private _moreClicked = (sender: any, eventArgs: any) => {
        let filter = this.state.filter;
        let path = this._viewState.getFolderPath() || RootPath;
        filter.continuationToken = this.state.continuationToken;
        filter.path = path;
        this._allDefinitionsActionCreator.getAllDefinitions(filter);
    };

    private _onApplyBuiltFilter = (sender: any, filterName: string) => {
        let filter = this.state.filter;
        filter.continuationToken = "";

        switch (filterName) {
            case WellKnownBuiltFilterValues.Last7Days:
                filter.builtAfter = getUtcDateString(7);
                filter.notBuiltAfter = null;
                break;
            case WellKnownBuiltFilterValues.Last30Days:
                filter.builtAfter = getUtcDateString(30);
                filter.notBuiltAfter = null;
                break;
            case WellKnownBuiltFilterValues.Today:
                filter.builtAfter = getUtcDateString();
                filter.notBuiltAfter = null;
                break;
            case WellKnownBuiltFilterValues.Yesterday:
                filter.builtAfter = getUtcDateString(1);
                filter.notBuiltAfter = null;
                break;
            case WellKnownBuiltFilterValues.Never:
                filter.notBuiltAfter = getUtcDateString(0, true);
                filter.builtAfter = null;
                break;
            case WellKnownBuiltFilterValues.NotInLast7Days:
                filter.notBuiltAfter = getUtcDateString(7);
                filter.builtAfter = null;
                break;
            case WellKnownBuiltFilterValues.NotInLast30Days:
                filter.notBuiltAfter = getUtcDateString(30);
                filter.builtAfter = null;
                break;
            default:
                filter.builtAfter = null;
                filter.notBuiltAfter = null;
        }

        this._allDefinitionsActionCreator.getAllDefinitions(filter);
    };

    private _onSearchDefinitions = (sender: any, searchText: string) => {
        let path = null;
        if (!searchText) {
            // search is cleared, in which case we need to honor the path to get existing results
            path = this._viewState.getFolderPath() || RootPath;
        }

        let filter = this.state.filter || {};
        filter.name = createFilterTextForFuzzySearch(searchText);
        filter.path = path;

        this._allDefinitionsActionCreator.searchDefinitions(filter);
    };

    private _onStoresUpdated = (store?: any, behavior?: IDefinitionsBehavior) => {
        if (this._isMounted) {
            this.setState(this._getState(behavior && behavior.preventAutoFocus));
        }
    }

    private _onToggleFavoritesFirst = (sender: any, favoritesFirst: boolean) => {
        this._favoritesFirst = favoritesFirst;

        if (favoritesFirst) {
            this._allDefinitionsActionCreator.ensureFavoritesLoaded();
        }

        this.setState(this._getState());
    }

    private _sortClicked = (sender: any, eventArgs: ISortDefinitionsEventArgs) => {
        let filter = this.state.filter;
        filter.continuationToken = "";
        filter.queryOrder = eventArgs.queryOrder;
        this._allDefinitionsActionCreator.getAllDefinitions(filter);
    };
}

interface IRowProps extends IBaseProps {
    rows: IRow[];
    queryOrder: DefinitionQueryOrder;
    hasMore: boolean;
    folderPath: string;
    isSearchActive: boolean;
    noAutoFocus: boolean;
}

class ListComponent extends BaseComponent<IRowProps, {}> {
    private _selection: Selection;
    private _selectedKey: string;

    private _root: HTMLElement;

    private _isMounted: boolean = false;
    private _focusGridPending: boolean = false;
    private _selectRowPending: boolean = false;

    constructor(props: IRowProps) {
        super(props);

        this._selection = new Selection();

        this._selection.setItems(props.rows, false);
    }

    public render(): JSX.Element {
        if (this.props.hasMore) {
            // inject new item at the end that should render more button
            this.props.rows.push({
                isPending: false,
                itemType: IItemType.ShowMoreButton,
                item: null,
                data: null,
                key: null
            });
        }

        if (this.props.folderPath != RootPath) {
            // inject new item at the front that should render folder up row
            this.props.rows.unshift({
                isPending: false,
                itemType: IItemType.FolderUpButton,
                item: this.props.folderPath,
                data: null,
                key: null
            });
        }

        return <div ref={this._resolveRef('_root')}>
            <DetailsList
                ariaLabelForGrid={format(BuildResources.GridArrowKeysInformationLabel, BuildResources.AllDefinitionsGridLabel)}
                checkButtonAriaLabel={BuildResources.CheckButtonLabel}
                items={this.props.rows}
                columns={this._getColumns()}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                className="all-definitions-list"
                selectionMode={SelectionMode.single}
                selection={this._selection}
                onItemInvoked={(item) => this._onItemInvoked(item)}
                onRowWillUnmount={this._onRowWillUnmount}
                { ...(this.props.noAutoFocus ? {} : { initialFocusedIndex: 0 }) }
                checkboxVisibility={CheckboxVisibility.hidden}
            />
        </div>;
    }

    public componentWillUpdate() {
        if (!this._selectRowPending) {
            this._selectedKey = "";
            if (this._selection.getSelectedCount() > 0) {
                // When we update grid, we should do our best effort to reselect them, else everytime we get signalr update we will loose all selections, that's bad
                // All definitions grid doesn't support multi-select
                this._selection.getSelection().forEach((item) => {
                    this._selectedKey = "" + item.key;
                });
            }
        }
    }

    public componentWillUnmount() {
        this._isMounted = false;
    }

    public componentDidMount() {
        this._isMounted = true;
    }

    public selectRow(key: string) {
        this._selectedKey = key;
        this._selectRowPending = true;
    }

    public componentDidUpdate() {
        if (this._selectedKey) {
            this._selection.setKeySelected(this._selectedKey, true, true);

            // You would think if you select an item, focus would be good too, right? 
            // No..since office fabric uses focus zone, and since there's no way to programatically bring focus, let's churn up own stuff to bring focus
            let itemIndex = -1;
            (this.props.rows || []).some((item, index) => {
                if (item && item.key === this._selectedKey) {
                    itemIndex = index;
                    return true;
                }

                return false;
            });

            if (itemIndex != -1 && this._selectRowPending) {
                this._root && focusDetailsListRow(this._root, itemIndex);
            }

            this._selectRowPending = false
        }

        // for screen readers
        if (this.props.isSearchActive) {
            let message = "";
            if (this.props.hasMore) {
                message = BuildResources.AllDefinitionSearchResultsMoreAvailable;
            }
            else {
                message = BuildResources.AllDefinitionSearchResultsAvailable
            }

            raiseSearchResultsAvailableMessage(format(message, this.props.rows.length));
        }

        if (this._focusGridPending) {
            focusFocusableElement(this._root);
            this._focusGridPending = false;
        }
    }


    private _onRowWillUnmount = (item: IRow, index: number) => {
        if (this._isMounted && this._root && !this.props.noAutoFocus) {
            // Search isn't active
            // The component is mounted, but row is being unmounted implies a delete operation is being performed
            //  on delete, we loose focus on the list, initialFocusedIndex focuses only on row mount (which we could argue it's by design), which won't happen in delete case
            // for accessibility to regain focus on the list we do this...
            // Note that we DetailsList doesn't expose anything to bring focus to, we can't depend on refs as well per https://github.com/OfficeDev/office-ui-fabric-react/issues/926
            // So we grab the first focusable element and trigger focus on it
            this._focusGridPending = true;
        }
    }

    private _getColumns(): IColumn[] {
        let isSortedDesc = this.props.queryOrder === DefinitionQueryOrder.DefinitionNameDescending;
        return [
            {
                key: ListColumnKeys.Name,
                name: BuildResources.DefinitionFolderNameColumnHeader,
                isSorted: true,
                isSortedDescending: isSortedDesc,
                fieldName: null,
                maxWidth: 500,
                minWidth: 400,
                isResizable: true,
                className: "primary-column",
                onColumnClick: (column: IColumn) => {
                    let eventArgs: ISortDefinitionsEventArgs = {
                        queryOrder: this.props.queryOrder === DefinitionQueryOrder.DefinitionNameAscending ? DefinitionQueryOrder.DefinitionNameDescending : DefinitionQueryOrder.DefinitionNameAscending
                    };

                    getEventService().fire(UserActions.SortDefinitions, this, eventArgs);
                },
                onRender: (itemRow: IRow, index: number) => {
                    return <NameColumn
                        item={itemRow}
                        folderPath={this.props.folderPath}
                        onMoreDefinitionsClick={this._onMoreDefinitionsClicked}
                        showFolderContext={this.props.isSearchActive}
                        showFavoriteToggle={itemRow.itemType === IItemType.Definition && hasDefinitionPermission((itemRow.item as BuildDefinitionReference), BuildPermissions.EditBuildDefinition)}
                    />;
                }
            },
            {
                key: ListColumnKeys.BranchSummary,
                name: BuildResources.AllDefinitionsBranchSummaryColumnHeader,
                fieldName: null,
                maxWidth: 200,
                minWidth: 200,
                className: "branch-summary",
                onRender: (itemRow: IRow, index: number) => {
                    if (!this._shouldRenderColumn(itemRow)) {
                        return null;
                    }

                    return getBranchSummaryItems(itemRow.data.aggregatedMetrics);
                }
            },
            {
                key: ListColumnKeys.Queued,
                name: BuildResources.QueuedLabel,
                fieldName: null,
                maxWidth: 100,
                minWidth: 100,
                className: "queued-column",
                headerClassName: "queued-column",
                onRender: (itemRow: IRow, index: number) => {
                    if (!this._shouldRenderColumn(itemRow)) {
                        return null;
                    }

                    if (itemRow.data.queuedMetric > 0) {
                        return <div className="content" aria-label={DefinitionMetrics.CurrentBuildsInQueue + itemRow.data.queuedMetric}>
                            <span className="metric-icon bowtie-icon icon build-muted-icon-color bowtie-build-queue"></span>
                            <span className="metric-number">{itemRow.data.queuedMetric}</span>
                        </div>
                    }

                    return null;
                }
            },
            {
                key: ListColumnKeys.Running,
                name: BuildResources.RunningLabel,
                fieldName: null,
                maxWidth: 100,
                minWidth: 100,
                onRender: (itemRow: IRow, index: number) => {
                    if (!this._shouldRenderColumn(itemRow)) {
                        return null;
                    }

                    if (itemRow.data.runningMetric > 0) {
                        return <div aria-label={DefinitionMetrics.CurrentBuildsInProgress + itemRow.data.queuedMetric}>
                            <span className="metric-icon bowtie-icon bowtie-media-play-fill"></span>
                            <span className="metric-number">{itemRow.data.runningMetric}</span>
                        </div>
                    }

                    return null;
                }
            },
            {
                key: ListColumnKeys.PassRate,
                name: BuildResources.PassRateLabel,
                fieldName: null,
                maxWidth: 100,
                minWidth: 100,
                onRender: (itemRow: IRow, index: number) => {
                    if (!this._shouldRenderColumn(itemRow)) {
                        return null;
                    }

                    return <BuildMetricPassRateComponent metrics={itemRow.data.metrics} aggregatedMetrics={itemRow.data.aggregatedMetrics} />;
                }
            },
            {
                key: ListColumnKeys.LastBuilt,
                name: BuildResources.LastBuiltText,
                fieldName: null,
                minWidth: 200,
                maxWidth: 500,
                onRender: (itemRow: IRow, index: number) => {
                    if (!this._shouldRenderColumn(itemRow)) {
                        return null;
                    }

                    let data = itemRow.data;

                    let lastBuiltElement: JSX.Element = null;
                    if (data.build && data.build.finishTime) {
                        const text = friendly(data.build.finishTime);
                        lastBuiltElement = <LinkWithKeyBinding title={format(BuildResources.ViewLatestBuildText, text)} text={text} href={BuildLinks.getBuildDetailLink(data.build.id)} />;
                    }
                    else if (data.recentRequestors.length > 0) {
                        // this means the build is not finished yet
                        return <span>{BuildResources.BuildNotFinishedText}</span>;
                    }

                    return <div>
                        {lastBuiltElement}
                    </div>;

                }
            }
        ] as IColumn[];
    }

    private _onItemInvoked(row: IRow) {
        if (!row) {
            logError("Row cannot be null");
            return;
        }

        if (row.itemType === IItemType.Folder) {
            let folder = row.item as Folder;
            onFolderClick(folder.path);
        }
        else if (row.itemType === IItemType.Definition) {
            let definition = row.item as BuildDefinitionReference;
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: getDefinitionLink(definition, row.data.isMyFavorite)
            });
        }
        else if (row.itemType === IItemType.ShowMoreButton) {
            this._onMoreDefinitionsClicked();
        }
        else if (row.itemType === IItemType.FolderUpButton) {
            let pathData = getPathData(row.item as string);
            onFolderClick(pathData.upLevelPath);
        }
    }

    private _onMoreDefinitionsClicked = () => {
        getEventService().fire(UserActions.GetMoreAllDefinitions, this);
    }

    private _shouldRenderColumn(item: IRow): boolean {
        if (item.isPending || item.itemType === IItemType.Folder || item.itemType === IItemType.ShowMoreButton) {
            return false;
        }

        return true;
    }
}

function getBranchSummaryItems(aggregatedMetrics: BuildMetric[]): JSX.Element[] {
    let summaryItems: JSX.Element[] = [];
    // these are aggregated metrics for the default branch, so there won't be multiple metrics with same name
    aggregatedMetrics.forEach((metric, index) => {
        if (metric.intValue <= 0) {
            return false;
        }

        let status = "";

        if (metric.name === DefinitionMetrics.SuccessfulBuilds) {
            status = "success";
        }
        else if (metric.name === DefinitionMetrics.FailedBuilds) {
            status = "failure";
        }
        else if (metric.name === DefinitionMetrics.PartiallySuccessfulBuilds) {
            status = "warning";
        }
        if (status) {
            if (summaryItems.length > 0) {
                summaryItems.push(<span key={metric.name + status + "separator"} className="separator"></span>);
            }

            summaryItems.push(<span tabIndex={0} data-is-focusable={true} key={metric.name + " " + status} aria-label={metric.intValue + " " + metric.name}>
                <span className={status + " bowtie-icon bowtie-status-" + status + "-outline"}></span>
                <span className="value">{metric.intValue}</span>
            </span>);
        }
    });

    return summaryItems;
}

/**
 * Assumed oldRows has "showmore" button and get the index to select based on that
 * @param oldRows existing rows
 * @param newRows new rows that will be updated
 */
export function getKeyToSelectFromGridWithMoreButton(oldRows: IRow[], newRows: IRow[]): string {
    //get the last index, since we are here implies we have "showmore" row, so subtract 2
    //since we need to get the new item, add 1. So we just need "- 1"
    let key = "";
    let newIndex = oldRows.length - 1;
    if (newIndex > 0 && newRows.length > oldRows.length && newRows.length > newIndex) {
        const item = newRows[newIndex];
        if (item) {
            key = item.key;
        }
    }

    return key;
}
/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { getInstance as getViewStateInstance, ViewStateStore } from "Build/Scenarios/Definitions/ViewState";
import { getDefinitionContextualMenuItems, getFolderContextualMenuItems, getSearchColumns, getColumns } from "Build/Scenarios/Definitions/All2/ColumnHelper";
import { AllDefinitionsActionCreator, createFilterTextForFuzzySearch } from "Build/Scenarios/Definitions/All2/Actions/AllDefinitionsActionCreator";
import { Activity } from "Build/Scenarios/Definitions/All2/Components/Activity";
import { LatestBuild } from "Build/Scenarios/Definitions/All2/Components/LatestBuild";
import { getStore, Store, IDefinitionRow, IFolderRow } from "Build/Scenarios/Definitions/All2/Stores/AllDefinitions";
import { raiseSearchResultsAvailableMessage } from "Build/Scripts/Events/AllDefinitionsSearchEvents";
import { UserActions, WellKnownBuiltFilterValues } from "Build/Scripts/Constants";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as AgentExistenceStore_NO_REQUIRE from "Build/Scripts/Stores/AgentExistence";
import { Features, Properties, publishEvent } from "Build/Scripts/Telemetry";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";
import { hasDefinitionPermission } from "Build/Scripts/Security";
import { FavoriteToggle } from "Build/Scripts/Components/FavoriteToggle";

import { GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { RootPath } from "Build.Common/Scripts/Security";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { FolderDetailsList, IProps as IFolderComponentProps } from "DistributedTaskControls/SharedControls/Folders/FolderDetailsList";
import { IFolderItem, IChildItem } from "DistributedTaskControls/SharedControls/Folders/Types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { DefinitionQueryOrder } from "TFS/Build/Contracts";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IColumn } from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";

import { getPageContext } from "VSS/Context";
import { EventService, getService as getEventService } from "VSS/Events/Services";
import { getCollectionService } from "VSS/Service";
import { using } from "VSS/VSS";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Build/Scenarios/Definitions/All2/AllDefinitions";

export interface IStores {
    agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    allDefinitionsStore: Store;
}

namespace ListColumnKeys {
    export const LastBuilt = "lastBuilt";
    export const ModifiedBy = "modifiedBy";
    export const CurrentActivity= "currentActivity"
}

export interface IAllDefinitionsProps extends IProps {
    stores?: IStores;
}

export interface IState {
    folderRows: IFolderRow[];
    definitionRows: IDefinitionRow[];
    agents: AgentExistenceStore_NO_REQUIRE.IAgents;
    continuationToken: string;
    folderPath: string;
    filter: GetDefinitionsOptions;
    hasDefinitions: boolean;
    hasFolders: boolean;
    initializing: boolean;
}


// Parent component for new Definitions tab
export class ControllerView extends Component<IAllDefinitionsProps, IState> {
    private _tfsContext: TfsContext;

    private _agentExistenceStore: AgentExistenceStore_NO_REQUIRE.AgentExistenceStore;
    private _allDefinitionsActionCreator: AllDefinitionsActionCreator;
    private _allDefinitionsStore: Store;
    private _eventManager: EventService;
    private _viewState: ViewStateStore;
    private _isMounted: boolean = false;
    private _detailsListContainerRef: HTMLDivElement;

    constructor(props: IAllDefinitionsProps) {
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

        let gettingStarted: JSX.Element = null;
        const showList = this.state.hasDefinitions || this.state.hasFolders;

        if (this.state.initializing || !this.state.agents.initialized) {
            return <Spinner className={"detailslist-root-loading"} key={"Spinner"} size={SpinnerSize.medium} ariaLabel={BuildResources.Loading} label={BuildResources.Loading} />;
        }

        if ((!this.state.hasDefinitions && !this.state.hasFolders)) {
            //placeholder for new getting started element
            gettingStarted = <div>{BuildResources.AddTemplatesDialogTitle}</div>
        }

        let detailsList: JSX.Element = null;
        
        if (showList) {
            detailsList = <FolderDetailsList {...this._getFolderDetailsListProps() } />
        }

        return (<div onScroll={this._fetchMoreRootDefinitionsIfNeeded} className="all-definitions-details-list2" ref={this._resolveRef("_detailsListContainerRef")} >
            {gettingStarted}
            {detailsList}
        </div>);
    }

    public componentDidMount() {
        this._isMounted = true;
        this._allDefinitionsStore.addChangedListener(this._onStoresUpdated);
        this._viewState.addChangedListener(this._onStoresUpdated);

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

    public componentDidUpdate(prevProps, prevState: IState): void {
        // We might need to fetch more definitions on first load itself such as in the case when the page is zoomed in
        if (this.state.definitionRows && prevState.definitionRows) {
            this._fetchMoreRootDefinitionsIfNeeded();
        }
    }

    public componentWillUnmount() {
        this._isMounted = false;
        this._eventManager.detachEvent(UserActions.ApplyBuiltFilter, this._onApplyBuiltFilter);
        this._eventManager.detachEvent(UserActions.SearchDefinitions, this._onSearchDefinitions);

        this._allDefinitionsStore.removeChangedListener(this._onStoresUpdated);
        this._viewState.removeChangedListener(this._onStoresUpdated);

        if (this._agentExistenceStore) {
            this._agentExistenceStore.removeChangedListener(this._onStoresUpdated);
        }
    }

    private _folderClicked = (folder: IFolderItem) => {
        let filter = this.state.filter;
        filter.continuationToken = "";
        filter.path = folder.path;
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

    private _getState(): IState {

        const filter = this._allDefinitionsStore.getFilter();
        const isSearchActive: boolean = !!filter.name;
        const queryOrder = DefinitionQueryOrder.DefinitionNameAscending;

        return {
            folderRows: this._allDefinitionsStore.getFolderRows("", isSearchActive),
            definitionRows: this._allDefinitionsStore.getDefinitionRows(RootPath),
            agents: this._getAgents(),
            continuationToken: this._allDefinitionsStore.getContinuationToken(),
            filter: this._allDefinitionsStore.getFilter(),
            folderPath: RootPath,
            hasDefinitions: this._allDefinitionsStore.hasDefinitions(),
            hasFolders: this._allDefinitionsStore.hasFolders(),
            initializing: this._allDefinitionsStore.isInitializing(),
        };
    }

    private _getFolderDetailsListProps(): IFolderComponentProps<IFolderRow, IDefinitionRow> {
        return {
            showRootFolder: false,
            rootFolderName: "",
            folders: this.state.folderRows,
            childItems: this.state.definitionRows,
            childItemIcon: "bowtie-build",
            showMoreInFolder: (itemRow: IFolderItem) => { this._fetchMoreDefinitionsForFolder(itemRow) },
            onFetchChildItems: (itemRow: IFolderItem) => { this._folderClicked(itemRow); },
            columns: this._getFolderDetailsListColumns(),
            actionsColumnKey: BuildResources.FavoritesText,
            classNameForDetailsList: "all-definitions-details-list-content",
            classNameForDetailsRow: "all-definitions-details-row",
            onGetFolderMenuItems: this._getFolderMenuItems,
            onGetChildMenuItems: this._getDefinitionMenuItems,
            onRenderChildItemColumn: this._onRenderDefinitionColumn,
            onActiveItemChanged: null
        };
    }

    private _getFolderDetailsListColumns(): IColumn[] {
        const isSearchActive = !!this.state.filter.name;
        if(isSearchActive) {
            return getSearchColumns();
        }
        return getColumns();
    }

    private _onRenderDefinitionColumn = (itemRow: IDefinitionRow, index: number, column?: IColumn): JSX.Element => {
        if (column) {
            switch (column.fieldName) {
                case ListColumnKeys.LastBuilt:
                    return <LatestBuild build={itemRow.latestBuild} />
                case BuildResources.BuildPathLabel:
                    return (<span>{itemRow.path}</span>);

                case BuildResources.FavoritesText:
                    if (hasDefinitionPermission((itemRow.reference), BuildPermissions.EditBuildDefinition)) {
                        return (<FavoriteToggle
                            definition={itemRow.reference} isMyFavorite={itemRow.isMyFavorite}
                        />);
                    }
                   else {
                        return null;
       
                        }
                        
                case ListColumnKeys.ModifiedBy:
                    if (itemRow.reference.authoredBy && itemRow.reference.authoredBy.displayName) {
                        return (<span className="last-triggered-by">
                            <TooltipHost content={itemRow.reference.authoredBy.displayName} directionalHint={DirectionalHint.rightCenter}>
                                <img src={itemRow.reference.authoredBy.imageUrl} className="allDefinitions-identity-image" alt={itemRow.reference.authoredBy.displayName} />
                            </TooltipHost>
                            <div className="allDefinitions-identity-name">{itemRow.reference.authoredBy.displayName}</div>
                        </span>);
                    }
                    else {
                        return null;
                    }
                case ListColumnKeys.CurrentActivity:
                    return <Activity queuedBuilds={itemRow.queuedMetric} runningBuilds={itemRow.runningMetric} />
            }
        }
    }

    private _getDefinitionMenuItems = (itemRow: IDefinitionRow): IContextualMenuItem[] => {
        return getDefinitionContextualMenuItems(itemRow.reference, itemRow.favoriteInfo);
    }

    private _getFolderMenuItems = (itemRow: IFolderRow): IContextualMenuItem[] => {
        return getFolderContextualMenuItems(itemRow.path, itemRow.description);
    }

    private _fetchMoreRootDefinitionsIfNeeded = (): void => {
        if (this._detailsListContainerRef && this.state.continuationToken) {
            // adding margin of 40 pixels to handle zoom-in and zoom-out scenarios
            let scrollPositionFromBottom = this._detailsListContainerRef.clientHeight + this._detailsListContainerRef.scrollTop - this._detailsListContainerRef.scrollHeight;
            if (scrollPositionFromBottom >= -20 && scrollPositionFromBottom <= 20) {
                if (this._allDefinitionsStore.canLoadMore()) {
                    this._allDefinitionsStore.setCanLoadMore(false);
                    let filter = this.state.filter;
                    filter.continuationToken = this.state.continuationToken;
                    filter.path = RootPath;
                    this._allDefinitionsActionCreator.getAllDefinitions(filter);
                }
            }
        }
    }

    private _fetchMoreDefinitionsForFolder(folder: IFolderItem): void {
        let filter = this.state.filter;
        let id: number = folder.id;
        let token = this._allDefinitionsStore.getTokenForFolder(id);
        filter.continuationToken = token;
        filter.path = folder.path;
        this._allDefinitionsActionCreator.getAllDefinitions(filter);
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

        this._allDefinitionsActionCreator.filterDefinitions(filter);
    };

    private _onSearchDefinitions = (sender: any, searchText: string) => {
        let path = null;

        let filter = this.state.filter || {};
        filter.name = createFilterTextForFuzzySearch(searchText);
        filter.path = path;

        this._allDefinitionsActionCreator.filterDefinitions(filter);
    };

    private _onStoresUpdated = (store?: any) => {
        if (this._isMounted) {
            this.setState(this._getState());
        }
    }

}


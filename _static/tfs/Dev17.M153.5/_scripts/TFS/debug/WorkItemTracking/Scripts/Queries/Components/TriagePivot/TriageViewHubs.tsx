import { ArtifactScope, Favorite } from "Favorites/Contracts";
import { FavoriteItemPicker, IFavoriteItem, IFavoriteItemPickerProps, IFavoritePickListItem } from "Favorites/Controls/FavoriteItemPicker";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind, css } from "OfficeFabric/Utilities";
import { PivotBarActionHelper } from "Presentation/Scripts/TFS/FeatureRef/NewWorkItem";
import { LicenseFeatureIds, FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { FeatureLicenseService } from "Presentation/Scripts/TFS/TFS.FeatureLicenseService";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import * as React from "react";
import { QueryType } from "TFS/WorkItemTracking/Contracts";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import * as Notifications from "VSS/Controls/Notifications";
import * as Events_Services from "VSS/Events/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/TriageViewHubs";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import * as Telemetry from "VSS/Telemetry/Services";
import { DelayedFunction, equals as deepEquals } from "VSS/Utils/Core";
import { getDirectoryName, getPathParts } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode, KeyUtils } from "VSS/Utils/UI";
import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { Hub } from "VSSUI/Hub";
import { HubHeader, HubTextTile, HubTileRegion } from "VSSUI/HubHeader";
import { IChoiceGroupViewActionProps, IPivotBarAction, PivotBarItem, PivotBarItemDeselectionBehavior, PivotBarViewActionType } from "VSSUI/PivotBar";
import { IUserAction } from "VSSUI/Utilities/IUserAction";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { VssIconType } from "VSSUI/VssIcon";
import { ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { QueryResultInfoBar } from "WorkItemTracking/Scripts/Controls/Query/QueryResultInfoBar";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { PerformanceEvents, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature, WITPerformanceScenario, WITPerformanceScenarioEvent } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { QueryDefinition, QueryItemFactory } from "WorkItemTracking/Scripts/OM/QueryItem";
import { WorkItemPaneMode } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IQueriesHubState, QueriesHub } from "WorkItemTracking/Scripts/Queries/Components/QueriesHub";
import * as ChartsView_Async from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/ChartsView";
import * as EditorView_Async from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/EditorView";
import { QueriesShortcutGroup } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/QueriesShortcutGroup";
import { ResultsView } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/ResultsView";
import * as WorkItemEditViewAsync from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditView";
import { QueriesHubConstants, TriageViewPivotsKey, QueryItemFavoriteConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { IQueryCommandContributionContext, IQueryParameters, IQueryPivotContributionContext, IQueryStatus, QueryContribution } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryActions } from "WorkItemTracking/Scripts/Queries/QueryActions";
import { QueryProviderCreator } from "WorkItemTracking/Scripts/Queries/QueryProviderCreator";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { IWorkItemFilterData } from "WorkItemTracking/Scripts/Queries/Stores/WorkItemFilterStore";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemSettingsService } from "WorkItemTracking/Scripts/Services/WorkItemSettingsService";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { IWorkItemPermissionData } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { WorkItemViewActions } from "WorkItemTracking/Scripts/Utils/WorkItemViewActions";
import { publishErrorToTelemetry } from "VSS/Error";
import { canUseFavorites } from "Favorites/FavoritesService";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getLocalService } from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";

const eventService = Events_Services.getService();

export interface ITriageViewHubsProps {
}

export interface IWorkItemNavigationState {
    preWorkItemAvailable: boolean;
    nextWorkItemAvailable: boolean;
    statusText: string;
}

export interface ITriageViewState extends IQueriesHubState {
    queryParameters: IQueryParameters;
    isDirty?: boolean;
    workItemPaneMode?: string;
    workItemNavigationState: IWorkItemNavigationState;
    isAnyWorkItemDirty?: boolean;
    queryProvider?: QueryResultsProvider;
    queryPrimaryStatus?: string;
    querySecondaryStatus?: string;
    workItemFilterData: IWorkItemFilterData;
    commandProvider?: ContributablePivotBarActionProvider<IQueryCommandContributionContext>;
    infoMessages: { [queryId: string]: string };
    anySelectedRecycleBin: boolean; // only used for whether to enable restore/delete toolbar items on recyclebin
    hasDestroyWorkItemPermission: boolean; // only used for whether to show perm delete toolbar items on recyclebin
    hasDeleteWorkItemPermission: boolean; // only used for whether to show restore toolbar items on recyclebin
}

// Component to display while delay loading async modules
const LoadingComponent: React.StatelessComponent<{}> = (): JSX.Element => {
    return <div className="hub-loading-spinner-overlay">
        <Spinner type={SpinnerType.large} />
    </div>;
};

const AsyncEditorViewComponent = getAsyncLoadedComponent(
    ["WorkItemTracking/Scripts/Queries/Components/TriagePivot/EditorView"],
    (m: typeof EditorView_Async) => m.EditorView,
    () => <LoadingComponent />);

const AsyncChartsViewComponent = getAsyncLoadedComponent(
    ["WorkItemTracking/Scripts/Queries/Components/TriagePivot/ChartsView"],
    (m: typeof ChartsView_Async) => m.ChartsView,
    () => <LoadingComponent />);

const AsyncWorkItemsView = getAsyncLoadedComponent(
    ["WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditView"],
    (m: typeof WorkItemEditViewAsync) => m.WorkItemEditView,
    () => <LoadingComponent />);

export class TriageViewHubs extends QueriesHub<ITriageViewHubsProps, ITriageViewState> {
    private readonly _bowtieIconColor: string = "#333333"; // $secondary-dark-2
    private readonly _pivotBarItemClasses: string = "customPadding hub-flex";
    private readonly _pivotBarClassName: string = "triage-view-hub-pivot-bar";
    private readonly _pivotContentClassName: string = "triage-view-hub-pivot-content";
    private _favoritePicker: FavoriteItemPicker;
    private readonly _workItemsNavigator: WorkItemsNavigator;
    private _lastSelectedPivot: string;
    private _lastQueryParameter: IQueryParameters;
    private readonly _pivotProviders: ContributablePivotItemProvider<IQueryPivotContributionContext>[];
    private readonly _queryProviderCreator: QueryProviderCreator;
    private _selectedIds: number[] = [];
    private _shortcutGroup: QueriesShortcutGroup;
    private _delayUpdateWorkItemsNavigator: DelayedFunction;
    private readonly _canUseFavorite = canUseFavorites();

    constructor(props: ITriageViewHubsProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this._queryProviderCreator = this._createQueryProviderCreator();
        this._workItemsNavigator = new WorkItemsNavigator();

        // Will delay load favorites if open query results scenario is currently active to minimize additional network load during TTI.
        const isOpenQueryResultsWithWorkItemScenarioActive = PerfScenarioManager.isScenarioActive(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS);
        if (!isOpenQueryResultsWithWorkItemScenarioActive) {
            this._queriesHubContext.actionsCreator.initializeFavorites();
        }

        this.state = {
            queryParameters: QueryUtilities.getQueryParametersFromViewOptions(this._hubViewState),
            workItemPaneMode: this._getWorkItemPaneInitialMode(),
            errorMessage: null,
            workItemNavigationState: {
                preWorkItemAvailable: false,
                nextWorkItemAvailable: false,
                statusText: "",
            },
            queryProvider: null,
            anySelectedRecycleBin: false,
            workItemFilterData: {
                isFiltering: false,
                filteredWorkItemIds: [],
                filterState: null
            },
            hasDestroyWorkItemPermission: false,
            hasDeleteWorkItemPermission: false,
            commandProvider: !isOpenQueryResultsWithWorkItemScenarioActive ? this._initializeCommandBarProvider() : null,
            infoMessages: {},
            queryPrimaryStatus: "",
            querySecondaryStatus: ""
        };

        this._pivotProviders = this._getContributedPivots();

        if (QueryUtilities.isRecycleBinQuery(this.state.queryParameters.id || this.state.queryParameters.path)) {
            this._queriesHubContext.triageViewActionCreator.initializeWorkItemPermissions();
        }

        // When we come directly to the edit view we want the last selected pivot to be correct
        this._lastSelectedPivot = this._hubViewState.selectedPivot.value;
    }

    public componentWillMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_TRIAGEVIEW_COMPONENT_MOUNT, true);
    }

    @autobind
    private _eventServiceSetMessageDelegate(
        sender: JQuery,
        args: { message: string | JQuery, messageType: Notifications.MessageAreaType }
    ) {
        const msg = args.message;
        const strMessage = typeof msg === "string" ? String(msg) : msg.text();

        this.setState({ errorMessage: strMessage });
    }

    public componentDidMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_TRIAGEVIEW_COMPONENT_MOUNT, false);

        this._setWorkItemPaneViewOption();
        eventService.attachEvent(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, this._eventServiceSetMessageDelegate);
        eventService.attachEvent(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, this._onInfo);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._queriesHubContext.stores.queryErrorMessageStore.addChangedListener(this._onError);
        this._queriesHubContext.triageViewActions.QueryInResultViewUpdated.addListener(this._onNavigatorUpdated);
        this._queriesHubContext.triageViewActions.WorkItemInEditViewUpdated.addListener(this._onNavigatorUpdated);
        this._queriesHubContext.triageViewActions.WorkItemDirtyStatusChanged.addListener(this._onWorkItemDirtyStatusChanged);
        this._queriesHubContext.triageViewActions.OnSelectedWorkItemsChange.addListener(this._onSelectedWorkItemsChange);
        this._queriesHubContext.triageViewActions.OnQueryStatusChanged.addListener(this._onQueryStatusChange);
        this._queriesHubContext.triageViewActions.WorkItemFilterApplied.addListener(this._workItemFilterChanged);
        this._queriesHubContext.triageViewActions.WorkItemFilterCleared.addListener(this._workItemFilterChanged);
        this._queriesHubContext.triageViewActions.WorkItemPermissionDataRetrieved.addListener(this._onWorkItemPermissionDataRetrieved);
        this._queriesHubContext.stores.queryResultsProviderStore.addChangedListener(this._onProviderChanged);
        this._initializeShortcut();

        this._queriesHubContext.triageViewActionCreator.ensureProvider(
            this._queryProviderCreator, QueryUtilities.getQueryParametersFromViewOptions(this._hubViewState));

        this._delayUpdateWorkItemsNavigator = new DelayedFunction(
            this, 250, "updateWorkItemsNavigator",
            () => {
                const workItemNavigationState = this._getWorkItemNavigationState();
                // Don't fire unnecessary updates
                if (!deepEquals(this.state.workItemNavigationState, workItemNavigationState)) {
                    this.setState({ workItemNavigationState });
                }
            });

        eventService.attachEvent(
            WITPerformanceScenarioEvent.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS_COMPLETE,
            this._onOpenQueryResultsScenarioCompleted);
    }

    private _getQueryId() {
        const provider = this._getQueryDefinitionFromProvider();
        return provider && provider.id;
    }

    private _onInfo = (sender: null, infoMessage: string) => {
        const queryId = this._getQueryId();
        if ((!!infoMessage || !!this.state.infoMessages[queryId]) && infoMessage !== this.state.infoMessages[queryId]) {
            this.setState({
                infoMessages: {
                    ...this.state.infoMessages,
                    [queryId]: infoMessage
                }
            });
        }
    }

    public componentWillUnmount() {
        eventService.detachEvent(
            WITPerformanceScenarioEvent.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS_COMPLETE,
            this._onOpenQueryResultsScenarioCompleted);

        // Reset query performance scenarios
        QueryUtilities.resetQueryPerformanceScenarios();

        this._delayUpdateWorkItemsNavigator.cancel();
        this._delayUpdateWorkItemsNavigator = undefined;

        this._removeShortcut();
        if (this._favoritePicker) {
            this._favoritePicker.dispose();
        }

        eventService.detachEvent(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, this._eventServiceSetMessageDelegate);
        eventService.attachEvent(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, this._onInfo);
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
        this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._queriesHubContext.actionsCreator.dismissErrorMessageForTriageView();
        this._queriesHubContext.stores.queryErrorMessageStore.removeChangedListener(this._onError);
        this._queriesHubContext.triageViewActions.QueryInResultViewUpdated.removeListener(this._onNavigatorUpdated);
        this._queriesHubContext.triageViewActions.WorkItemInEditViewUpdated.removeListener(this._onNavigatorUpdated);
        this._queriesHubContext.triageViewActions.WorkItemDirtyStatusChanged.removeListener(this._onWorkItemDirtyStatusChanged);
        this._queriesHubContext.triageViewActions.OnSelectedWorkItemsChange.removeListener(this._onSelectedWorkItemsChange);
        this._queriesHubContext.triageViewActions.OnQueryStatusChanged.removeListener(this._onQueryStatusChange);
        this._queriesHubContext.triageViewActions.WorkItemFilterApplied.removeListener(this._workItemFilterChanged);
        this._queriesHubContext.triageViewActions.WorkItemFilterCleared.removeListener(this._workItemFilterChanged);
        this._queriesHubContext.triageViewActions.WorkItemPermissionDataRetrieved.removeListener(this._onWorkItemPermissionDataRetrieved);
        this._queriesHubContext.stores.queryResultsProviderStore.removeChangedListener(this._onProviderChanged);
    }

    private _onOpenQueryResultsScenarioCompleted = () => {
        // ResultsPivot: delay load content after query perf scenario is completed
        // If it is already loaded, there will be no op
        this._queriesHubContext.actionsCreator.initializeFavorites();

        if (!this.state.commandProvider) {
            this.setState({
                commandProvider: this._initializeCommandBarProvider()
            });
        }
    }

    private _initializeCommandBarProvider(): ContributablePivotBarActionProvider<IQueryCommandContributionContext> {
        return new ContributablePivotBarActionProvider(
            ["ms.vss-work-web.work-item-query-results-toolbar-menu"],
            (contribution: Contribution) => {
                const queryDefinition = this._getQueryDefinitionFromProvider();
                return {
                    query: queryDefinition && QueryItemFactory.queryItemToQueryHierarchyItem(queryDefinition),
                    queryText: queryDefinition && queryDefinition.queryText,
                    workItemIds: this._selectedIds
                };
            });
    }

    private _initializeShortcut(): void {
        this._shortcutGroup = new QueriesShortcutGroup(
            this._queriesHubContext,
            this.state.queryParameters.id,
            this._navigateNext,
            this._navigatePrev,
            this._onGoBackToQuery);
    }

    private _removeShortcut(): void {
        if (this._shortcutGroup) {
            this._shortcutGroup.removeShortcutGroup();
            this._shortcutGroup = undefined;
        }
    }

    private _createQueryProviderCreator(): QueryProviderCreator {
        const tfsContext = TfsContext.getDefault();
        const projectId = tfsContext.navigation.projectId;
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);

        const creatorData = {
            projectId: projectId,
            store: store,
            queriesHubContext: this._queriesHubContext
        };

        return new QueryProviderCreator(creatorData);
    }

    private _getHub(): React.ReactNode {
        if (!this._hubViewState.selectedPivot.value) {
            return null;
        }

        const isWorkItemHubView = this._isWorkItemHubView(this._hubViewState.selectedPivot.value);
        const isNewQuery = this.state.queryParameters.newQuery ||
            (isWorkItemHubView && this.state.queryProvider && QueryUtilities.isNewQuery(this.state.queryProvider.queryDefinition));
        const hubClassName = css("triage-view-hub", isNewQuery && "new-query-hub");

        if (isWorkItemHubView) {
            // If its a work item edit view, we only want to show Work item edit pivot
            return this._getWorkItemViewHub(hubClassName);
        } else {
            // If its not a work item edit view, we want to show query pivots as well as contributed pivots
            return this._getTriageViewHub(hubClassName);
        }
    }

    private _getContributedPivots(): ContributablePivotItemProvider<IQueryPivotContributionContext>[] {
        return [new ContributablePivotItemProvider(["ms.vss-work-web.query-tabs"], (contribution: Contribution) => {
            const queryDefinition = this._getQueryDefinitionFromProvider();
            return {
                query: queryDefinition && QueryItemFactory.queryItemToQueryHierarchyItem(queryDefinition)
            };
        })];
    }

    private _getWorkItemViewHub(hubClassName: string): JSX.Element {

        const queryName = this.state.queryProvider && this.state.queryProvider.getTitle();
        const previousLabel = Utils_String.format(WITResources.TriagePreviousWorkItemToolTip, queryName);
        const nextLabel = Utils_String.format(WITResources.TriageNextWorkItemToolTip, queryName);
        const backToQueryLabel = Utils_String.format(WITResources.BackToQueryResults, queryName);

        return <Hub
            key="work-item-edit-hub"
            className={hubClassName}
            pivotBarClassName={this._pivotBarClassName}
            pivotBarContentClassName={this._pivotContentClassName}
            hubViewState={this._hubViewState}
            minDisplayedBreadcrumbItems={this._getMinDisplayedBreadcrumbItems()}
            breadcrumbIsExpandable>
            {this._getHubHeader()}
            <PivotBarItem
                className={this._pivotBarItemClasses}
                name="Edit"
                itemKey={TriageViewPivotsKey.WorkItemEdit}
                commands={[
                    {
                        key: "back-to-query",
                        name: WITResources.BackToQuery,
                        important: true,
                        iconProps: { iconName: "RevToggleKey", iconType: VssIconType.fabric },
                        onClick: this._onGoBackToQuery,
                        ariaLabel: backToQueryLabel,
                        title: backToQueryLabel
                    }
                ]}
                viewActions={[
                    {
                        key: "work-item-status",
                        name: this.state.workItemNavigationState.statusText,
                        important: true
                    },
                    {
                        key: "pre-work-item",
                        actionType: PivotBarViewActionType.Command,
                        ariaLabel: previousLabel,
                        title: previousLabel,
                        iconProps: { iconName: "Up", iconType: VssIconType.fabric },
                        important: true,
                        disabled: !this.state.workItemNavigationState.preWorkItemAvailable,
                        onClick: this._onPreviousWorkItemClickInWorkItemEditView
                    },
                    {
                        key: "next-work-item",
                        actionType: PivotBarViewActionType.Command,
                        ariaLabel: nextLabel,
                        title: nextLabel,
                        iconProps: { iconName: "Down", iconType: VssIconType.fabric },
                        important: true,
                        disabled: !this.state.workItemNavigationState.nextWorkItemAvailable,
                        onClick: this._onNextWorkItemClickInWorkItemEditView
                    }
                ]}>
                {this._getWorkItemEditView()}
            </PivotBarItem>
        </Hub>;
    }

    private _canCreateNewChart(): boolean {
        const queryDefinition = this._getQueryDefinitionFromProvider();
        if (this.state.queryParameters.newQuery || !queryDefinition) {
            return false;
        }

        const query = queryDefinition.id ? this._queriesHubContext.stores.queryHierarchyItemStore.getItem(queryDefinition.id) : null;
        if (!query) {
            return false;
        }

        return FeatureLicenseService.isFeatureActive(LicenseFeatureIds.ChartViewing) &&
            FeatureLicenseService.isFeatureActive(LicenseFeatureIds.ChartAuthoring) &&
            !this.state.queryParameters.searchText &&
            (query.queryType === QueryType.Flat || queryDefinition.queryType === QueryType[QueryType.Flat]) &&
            !this.state.isDirty;
    }

    private _getTriageViewHub(hubClassName: string): JSX.Element {
        // recycle bin only can not show editor or charts
        const isRecycleBinQuery = QueryUtilities.isRecycleBinQuery(this.state.queryParameters.id || this.state.queryParameters.path);
        const showEditorView = !isRecycleBinQuery;
        const showChartsView = !isRecycleBinQuery
            && FeatureLicenseService.isFeatureActive(LicenseFeatureIds.ChartViewing);
        const queryName = this.state.queryProvider && this.state.queryProvider.getTitle();

        // recycle bin cannot email query results or save work items
        const canEmailQueryResults = !isRecycleBinQuery;
        const canSaveWorkItems = !isRecycleBinQuery;
        const canShareQueryUrl = !isRecycleBinQuery;
        const canDestroyWorkItems = isRecycleBinQuery && this.state.hasDestroyWorkItemPermission;
        const canRestoreWorkItems = isRecycleBinQuery && this.state.hasDeleteWorkItemPermission;

        const previousLabel = Utils_String.format(WITResources.TriagePreviousWorkItemToolTip, queryName);
        const nextLabel = Utils_String.format(WITResources.TriageNextWorkItemToolTip, queryName);

        return <Hub
            key="triage-view-hub"
            pivotProviders={this._pivotProviders}
            className={hubClassName}
            pivotBarClassName={this._pivotBarClassName}
            pivotBarContentClassName={this._pivotContentClassName}
            hubViewState={this._hubViewState}
            pivotHeaderAriaLabel={queryName}
        >
            {this._getHubHeader()}
            {this._getHubTitleText()}
            <PivotBarItem
                className={this._pivotBarItemClasses}
                key={TriageViewPivotsKey.QueryResults}
                name={WITResources.WorkItemsHubResultsTabTitle}
                itemKey={TriageViewPivotsKey.QueryResults}
                deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}
                url={this._hubViewState.createObservableUrl({ view: TriageViewPivotsKey.QueryResults })}
                viewActions={[
                    {
                        key: "work-item-status",
                        name: this.state.workItemNavigationState.statusText,
                        important: true,
                    },
                    {
                        key: "pre-work-item",
                        actionType: PivotBarViewActionType.Command,
                        ariaLabel: previousLabel,
                        title: previousLabel,
                        iconProps: { iconName: "Up", iconType: VssIconType.fabric },
                        important: true,
                        disabled: !this.state.workItemNavigationState.preWorkItemAvailable,
                        onClick: this._onPreviousWorkItemClickInTriageView
                    },
                    {
                        key: "next-work-item",
                        actionType: PivotBarViewActionType.Command,
                        ariaLabel: nextLabel,
                        title: nextLabel,
                        iconProps: { iconName: "Down", iconType: VssIconType.fabric },
                        important: true,
                        disabled: !this.state.workItemNavigationState.nextWorkItemAvailable,
                        onClick: this._onNextWorkItemClickInTriageView
                    },
                    {
                        key: "work-item-filter-bar",
                        actionType: PivotBarViewActionType.Command,
                        ariaLabel: WITResources.WorkItemPaneFilter_FilterWorkItems,
                        title: WITResources.WorkItemPaneFilter_FilterWorkItems,
                        iconProps: { iconName: this.state.workItemFilterData.isFiltering ? "FilterSolid" : "Filter", iconType: VssIconType.fabric },
                        important: true,
                        onClick: this._onFilterToggle
                    },
                    {
                        key: QueriesHubConstants.WorkItemPaneViewOptionKey,
                        name: QueriesHubConstants.WorkItemPaneViewOptionKey,
                        actionType: PivotBarViewActionType.ChoiceGroup,
                        iconProps: { iconName: "Equalizer", iconType: VssIconType.fabric },
                        important: true,
                        actionProps: {
                            options: [{
                                key: WorkItemPaneMode.Bottom,
                                text: WITResources.WorkItemPaneFilter_Bottom,
                                ariaLabel: WITResources.WorkItemPaneFilter_BottomAriaLabel,
                                checked: this.state.workItemPaneMode === "bottom"
                            },
                            {
                                key: WorkItemPaneMode.Right,
                                text: WITResources.WorkItemPaneFilter_Right,
                                ariaLabel: WITResources.WorkItemPaneFilter_RightAriaLabel,
                                checked: this.state.workItemPaneMode === "right"
                            },
                            {
                                key: WorkItemPaneMode.Off,
                                text: WITResources.WorkItemPaneFilter_Off,
                                ariaLabel: WITResources.WorkItemPaneFilter_OffAriaLabel,
                                checked: this.state.workItemPaneMode === "off"
                            }]
                        } as IChoiceGroupViewActionProps
                    },
                ]}
                commandProviders={this.state.commandProvider ? [this.state.commandProvider] : []}
                commands={this._getResultsViewCommands(canSaveWorkItems, canEmailQueryResults, canRestoreWorkItems, canDestroyWorkItems, canShareQueryUrl)}
            >
                <ResultsView
                    isSelected={this._hubViewState.selectedPivot.value === TriageViewPivotsKey.QueryResults}
                    filterState={this.state.workItemFilterData.filterState}
                    newQuery={this.state.queryParameters.newQuery}
                    workItemsNavigator={this._workItemsNavigator}
                    queryId={this.state.queryParameters.id}
                    path={this.state.queryParameters.path}
                    wiql={this.state.queryParameters.wiql}
                    queryProvider={this.state.queryProvider}
                    tempQueryId={this.state.queryParameters.tempQueryId}
                    workItemPaneMode={this.state.workItemPaneMode}
                    workItemId={this.state.queryParameters.workItemId}
                    isVSOpen={this.state.queryParameters.isVSOpen}
                    queryContextId={this.state.queryParameters.queryContextId}
                    parentId={this.state.queryParameters.parentId}
                    searchText={this.state.queryParameters.searchText}
                />
            </PivotBarItem>
            {showEditorView &&
                <PivotBarItem
                    className={this._pivotBarItemClasses}
                    commandProviders={this.state.commandProvider ? [this.state.commandProvider] : []}
                    key={TriageViewPivotsKey.QueryEdit}
                    name={WITResources.WorkItemsHubEditorTabTitle}
                    itemKey={TriageViewPivotsKey.QueryEdit}
                    deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}
                    commands={this._getEditorViewCommands()}
                    url={this._hubViewState.createObservableUrl({ view: TriageViewPivotsKey.QueryEdit })} >
                    <AsyncEditorViewComponent
                        isSelected={this._hubViewState.selectedPivot.value === TriageViewPivotsKey.QueryEdit}
                        workItemsNavigator={this._workItemsNavigator}
                        parentId={this.state.queryParameters.parentId}
                        newQuery={this.state.queryParameters.newQuery}
                        queryId={this.state.queryParameters.id}
                        path={this.state.queryParameters.path}
                        wiql={this.state.queryParameters.wiql}
                        tempQueryId={this.state.queryParameters.tempQueryId}
                        queryProvider={this.state.queryProvider}
                        searchText={this.state.queryParameters.searchText} />
                </PivotBarItem>
            }
            {showChartsView &&
                <PivotBarItem
                    className={this._pivotBarItemClasses}
                    key={TriageViewPivotsKey.QueryCharts}
                    name={WITResources.WorkItemsChartsTabTitle}
                    itemKey={TriageViewPivotsKey.QueryCharts}
                    deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}
                    commands={[
                        { key: "refresh-charts", disabled: !this._canCreateNewChart(), name: WITResources.RefreshCharts, important: true, iconProps: { iconName: "Refresh", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.RefreshCharts },
                        { key: "new-chart", disabled: !this._canCreateNewChart(), name: WITResources.NewChartText, important: true, iconProps: { iconName: "Add", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.NewChartText }
                    ]}
                    url={this._hubViewState.createObservableUrl({ view: TriageViewPivotsKey.QueryCharts })}
                >
                    <AsyncChartsViewComponent
                        isSelected={this._hubViewState.selectedPivot.value === TriageViewPivotsKey.QueryCharts}
                        parentId={this.state.queryParameters.parentId}
                        newQuery={this.state.queryParameters.newQuery}
                        queryId={this.state.queryParameters.id}
                        path={this.state.queryParameters.path}
                        wiql={this.state.queryParameters.wiql}
                        tempQueryId={this.state.queryParameters.tempQueryId}
                        queryProvider={this.state.queryProvider}
                        searchText={this.state.queryParameters.searchText} />
                </PivotBarItem>
            }
        </Hub>;
    }

    private _getHubHeader(): React.ReactNode {
        const queryDefinition = this._getQueryDefinitionFromProvider();
        // check if any error exist after the running the query
        const queryHasError = this.state.queryProvider && this.state.queryProvider.queryResultsModel && !!this.state.queryProvider.queryResultsModel.error;

        // If we don't have a query definition, we don't render this so it doesn't
        // flash a wrong value before switching to the correct one.
        const headerItemPicker = queryDefinition ?
            this._getFavoriteItemPicker(queryDefinition.id, queryDefinition.name) :
            null;

        const hubHeaderIconName = (this.state.queryParameters.newQuery && (!queryDefinition || !queryDefinition.queryType)) ?
            "query-type-icon bowtie-icon bowtie-view-list" :
            QueryUtilities.getQueryIconClassName(queryDefinition, queryHasError);

        const parentPath = getDirectoryName(queryDefinition.storedPath) || queryDefinition.parentPath;
        const queryItemPath = queryDefinition.path(true);
        const breadcrumbItems = this._getBreadCrumbItems(parentPath, queryItemPath, this._workItemsNavigator);

        return <HubHeader
            maxBreadcrumbItemWidth={QueriesHubConstants.MaxBreadcrumbItemWidth}
            iconProps={{
                iconType: VssIconType.bowtie,
                iconName: hubHeaderIconName,
                styles: { root: { color: this._bowtieIconColor } }
            }}
            breadcrumbItems={breadcrumbItems}
            headerItemPicker={headerItemPicker}
            breadcrumbProps={this._getBreadCrumbProps(breadcrumbItems.length)}
            pickListMaxWidth={QueriesHubConstants.PickListMaxWidth}
            pickListMaxHeight={QueriesHubConstants.PickListMaxHeight}
            pickListClassName={"queries-breadcrumb-picker"}
        />;
    }

    private _getNewQueryAndWorkItemCommand(): IPivotBarAction {
        const commands: IPivotBarAction[] = [];
        commands.push({ key: "new-query", name: WITResources.NewQuery, disabled: this.state.queryParameters.newQuery, iconProps: { iconName: "Add", iconType: VssIconType.fabric }, onClick: this._onNewQueryClick, title: WITResources.NewQueryHotkey, ariaLabel: WITResources.NewQuery });
        commands.push({ key: "new-query-separator", separator: true });
        const newWorkItemCommands = PivotBarActionHelper.getNewWorkItemPivotBarActions({
            addNewItem: this._onNewWorkItemClick
        });
        commands.push(...newWorkItemCommands);

        return { key: "new", name: WITResources.NewMenuTitle, important: true, children: commands, iconProps: { iconName: "Add", iconType: VssIconType.fabric } };
    }

    private _getEditorViewCommands(): IPivotBarAction[] {

        const usesCommandKey = KeyUtils.shouldUseMetaKeyInsteadOfControl();
        const titleText = usesCommandKey ? WITResources.SaveHotkeyWithCommand : WITResources.SaveHotkeyWithControl;

        const commands: IPivotBarAction[] = [
            { key: "run-query", name: WITResources.RunQuery, important: true, iconProps: { iconName: "Play", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, title: WITResources.RefreshHotkey, ariaLabel: WITResources.RunQuery },
            this._getNewQueryAndWorkItemCommand(),
            { key: "save-query", name: WITResources.SaveQuery, important: true, disabled: this._shouldDisableSaveButton(), iconProps: { iconName: "Save", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, title: titleText, ariaLabel: WITResources.SaveQuery }
        ];

        if (this._isExistingStoredQuery()) {
            commands.push({ key: "save-query-as", name: WITResources.SaveQueryAs, important: true, iconProps: { iconName: "SaveAs", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.SaveQueryAs });
            commands.push({ key: "rename-query", name: WITResources.RenameQuery, important: true, iconProps: { iconName: "Rename", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.RenameQuery });
        }

        commands.push({ key: "revert-query-changes", name: WITResources.RevertQueryChanges, important: true, disabled: !this.state.isDirty, iconProps: { iconName: "Undo", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.RevertQueryChanges });
        commands.push({ key: "column-options", name: WITResources.ColumnOptions, important: true, iconProps: { iconName: "Repair", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.ColumnOptions });
        commands.push({ key: "save-work-items", name: WITResources.SaveItems, important: true, disabled: !this.state.isAnyWorkItemDirty, iconProps: { iconName: "bowtie-save-all", iconType: VssIconType.bowtie }, onClick: this._onCommandExecute, ariaLabel: WITResources.SaveItems });
        commands.push({ key: "email-query-result", name: WITResources.EmailQuery, important: true, iconProps: { iconName: "Mail", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.EmailQuery });
        commands.push({ key: "share-link", name: WITResources.CopyQueryURL, important: true, iconProps: { iconName: "Copy", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.CopyQueryURL });

        return commands;
    }

    private _getResultsViewCommands(
        canSaveWorkItems: boolean,
        canEmailQueryResults: boolean,
        canRestoreWorkItems: boolean,
        canDestroyWorkItems: boolean,
        canShareQueryUrl: boolean): IPivotBarAction[] {

        const usesCommandKey = KeyUtils.shouldUseMetaKeyInsteadOfControl();
        const titleText = usesCommandKey ? WITResources.SaveHotkeyWithCommand : WITResources.SaveHotkeyWithControl;

        const commands: IPivotBarAction[] = [];

        commands.push({ key: "refresh-work-items", name: WITResources.RunQuery, important: true, iconProps: { iconName: "Play", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, title: "(R)", ariaLabel: WITResources.RunQuery });
        commands.push(this._getNewQueryAndWorkItemCommand());
        commands.push({ key: "save-query", name: WITResources.SaveQuery, important: true, disabled: this._shouldDisableSaveButton(), iconProps: { iconName: "Save", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.SaveQuery });

        if (this._isExistingStoredQuery()) {
            commands.push({ key: "rename-query", name: WITResources.RenameQuery, important: true, iconProps: { iconName: "Rename", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.RenameQuery });
        }

        if (canRestoreWorkItems) {
            commands.push({ key: QueryActions.RestoreWorkItem, name: WITResources.RestoreWorkItemDeleteButtonText, disabled: !this.state.anySelectedRecycleBin, important: true, iconProps: { iconName: "bowtie-recycle-bin-restore", iconType: VssIconType.bowtie }, onClick: this._onCommandExecute, ariaLabel: WITResources.RestoreWorkItemDeleteButtonText });
        }

        if (canDestroyWorkItems) {
            commands.push({ key: QueryActions.DestroyWorkItem, name: WITResources.DestroyWorkItemDeleteButtonText, disabled: !this.state.anySelectedRecycleBin, important: true, iconProps: { iconName: "bowtie-edit-delete", iconType: VssIconType.bowtie }, onClick: this._onCommandExecute, ariaLabel: WITResources.DestroyWorkItemDeleteButtonText });
        }

        if (canSaveWorkItems) {
            commands.push({ key: "save-work-items", name: WITResources.SaveItems, disabled: !this.state.isAnyWorkItemDirty, important: true, iconProps: { iconName: "bowtie-save-all", iconType: VssIconType.bowtie }, onClick: this._onCommandExecute, title: titleText, ariaLabel: WITResources.SaveItems });
        }

        commands.push({ key: "column-options", name: WITResources.ColumnOptions, important: true, iconProps: { iconName: "Repair", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.ColumnOptions });

        if (canEmailQueryResults) {
            commands.push({ key: "email-query-result", name: WITResources.EmailQuery, important: true, iconProps: { iconName: "Mail", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.EmailQuery });
        }

        if (canShareQueryUrl) {
            commands.push({ key: "share-link", name: WITResources.CopyQueryURL, important: true, iconProps: { iconName: "Copy", iconType: VssIconType.fabric }, onClick: this._onCommandExecute, ariaLabel: WITResources.CopyQueryURL });
        }

        return commands;
    }

    /**
     * Indicates whether the currently opened query is an existing stored query.
     * Some functions only available for this type of queries:
     * 1. Rename query
     * 2. Save as query (Save button will show up instead).
     */
    private _isExistingStoredQuery(): boolean {
        return !this.state.queryParameters.newQuery
            && !this.state.queryParameters.wiql
            && !this.state.queryParameters.tempQueryId
            && !this.state.queryParameters.searchText
            && !QueryUtilities.isRecycleBinQuery(this.state.queryParameters.id || this.state.queryParameters.path);
    }

    private _shouldDisableSaveButton(): boolean {
        // Dont disable save button for new query, search text query, wiql query and tempQuery
        return !this.state.queryParameters.newQuery
            && !this.state.queryParameters.wiql
            && !this.state.queryParameters.tempQueryId
            && !this.state.queryParameters.searchText
            && !this.state.isDirty;
    }

    private _getHubTitleText(): React.ReactNode {
        if (this.state.queryPrimaryStatus && this._isTriageViewHubView(this._hubViewState.selectedPivot.value)) {
            return <HubTileRegion>
                <HubTextTile
                    text={this.state.queryPrimaryStatus}
                    secondaryText={this.state.querySecondaryStatus}
                />
            </HubTileRegion>;
        }

        return null;
    }

    private _getWorkItemEditView(): JSX.Element {
        return <AsyncWorkItemsView id={this.state.queryParameters.id}
            witd={this.state.queryParameters.witd}
            templateId={this.state.queryParameters.templateId}
            isNew={Utils_String.equals(this._hubViewState.selectedPivot.value, TriageViewPivotsKey.NewWorkItem, true)}
            onWorkItemDeleted={this._onWorkItemDeletedOnEditView} />;
    }

    @autobind
    private _onWorkItemDeletedOnEditView(): void {
        if (!this._workItemsNavigator || !this._workItemsNavigator.getProvider()) {
            // Navigate to queries view if work item was not opened from query results
            this._queriesHubContext.navigationActionsCreator.navigateToQueriesPage(false);
        } else {
            const selectedWorkItemIndex = this._workItemsNavigator.getSelectedIndex();
            const selectedWorkItemId = this._workItemsNavigator.getSelectedWorkItemId();
            const workItemsCount = this._workItemsNavigator.getWorkItemsCount();
            const queryResultsProvider = this._workItemsNavigator.getProvider() as QueryResultsProvider;

            // Remove work item from the provider to update the data source for the navigator.
            // Since the provider is now updated, the grid will update itself once user navigates back to the grid.
            queryResultsProvider.removeWorkItem(selectedWorkItemId);

            if (workItemsCount === 1) {
                // Reset navigator
                this._workItemsNavigator.reset();
                this._onGoBackToQuery();
            } else {
                // As there are still work items left, update navigator selection
                const nextWorkItemIndex = workItemsCount > selectedWorkItemIndex + 1 ? selectedWorkItemIndex : selectedWorkItemIndex - 1;
                const nextWorkItemId = queryResultsProvider.getWorkItemIdAtDataIndex(nextWorkItemIndex);
                this._workItemsNavigator.update(workItemsCount - 1, nextWorkItemIndex, nextWorkItemId);
                this._hubViewState.updateNavigationState(HistoryBehavior.replace, () => {
                    this._hubViewState.viewOptions.setViewOption(ActionParameters.ID, this._workItemsNavigator.getSelectedWorkItemId());
                });
            }
        }
    }

    private _getQueryDefinitionFromProvider(): QueryDefinition {
        return this.state.queryProvider && this.state.queryProvider.queryDefinition;
    }

    public render(): JSX.Element {
        return this.state.queryProvider && <div className="triage-view-hub-container" onKeyDown={this._onKeyDown} tabIndex={-1}>
            {this._renderMessages()}
            {this._getHub()}
        </div>;
    }

    @autobind
    private _onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.keyCode === KeyCode.S) {
            if (Utils_String.equals(this._hubViewState.selectedPivot.value, TriageViewPivotsKey.QueryEdit, true)) {
                e.preventDefault();
                // save query
                this._onCommandExecute(null, { key: "save-query" } as IUserAction, true);
            } else if (Utils_String.equals(this._hubViewState.selectedPivot.value, TriageViewPivotsKey.QueryResults, true)) {
                e.preventDefault();
                // save work items
                this._onCommandExecute(null, { key: "save-work-items" } as IUserAction, true);
            }
        }
    }

    @autobind
    private _workItemFilterChanged() {
        this.setState({
            workItemFilterData: this._queriesHubContext.stores.workItemFilterStore.getWorkItemFilterData()
        });
    }

    @autobind
    private _onWorkItemPermissionDataRetrieved(data: IWorkItemPermissionData) {
        this.setState({
            hasDestroyWorkItemPermission: data && data.workItemDestroyPermission && data.workItemDestroyPermission.hasPermission,
            hasDeleteWorkItemPermission: data && data.workItemDeletePermission && data.workItemDeletePermission.hasPermission
        });
    }

    @autobind
    private _onQueryStatusChange(queryStatus: IQueryStatus) {
        const primaryStatus = queryStatus.primaryStatus;
        const secondaryStatus = queryStatus.secondaryStatus;

        // the header doesn't do a very good job of re-rendering
        // when there are no changes, so we will check if anything
        // is different before setting state.
        if (this.state.queryPrimaryStatus !== primaryStatus ||
            this.state.querySecondaryStatus !== secondaryStatus) {
            this.setState({ queryPrimaryStatus: primaryStatus, querySecondaryStatus: secondaryStatus });
        }
    }

    @autobind
    private _onProviderChanged(handler: IEventHandler) {
        const provider = this._queriesHubContext.stores.queryResultsProviderStore.getValue();
        const queryParameters = QueryUtilities.getQueryParametersFromViewOptions(this._hubViewState);
        this.setState({
            isDirty: provider.isDirty(),
            queryParameters: queryParameters,
            queryProvider: provider
        }, () => {
            // when provider changes, title needs to change
            document.title = getDefaultPageTitle(provider.getTitle());
        });

        // Store the lastquery state, to be used when coming back from workitemedit view
        this._lastQueryParameter = this.state.queryParameters;
    }

    @autobind
    private _onSelectedWorkItemsChange(workItemIds: number[]) {
        this._selectedIds = workItemIds || [];

        if (QueryUtilities.isRecycleBinQuery(this.state.queryParameters.id || this.state.queryParameters.path)) {
            this.setState({ anySelectedRecycleBin: workItemIds.length > 0 });
        }

        this._onNavigatorUpdated();
    }

    @autobind
    private _onWorkItemDirtyStatusChanged(isAnyWorkItemDirty: boolean) {
        if (isAnyWorkItemDirty !== this.state.isAnyWorkItemDirty) {
            this.setState({ isAnyWorkItemDirty: isAnyWorkItemDirty });
        }
    }

    @autobind
    private _onFilterToggle() {
        this._queriesHubContext.triageViewActionCreator.toggleFilterBar();
    }

    @autobind
    private _onNewQueryClick() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_TRIAGEVIEWHUB_PIVOTCOMMAND,
                {
                    "command": "new-query",
                    "source": "TriageView",
                    "selectedPivot": this._hubViewState.selectedPivot.value,
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN),
                }));
        this._queriesHubContext.navigationActionsCreator.navigateToNewQuery(true);
    }

    @autobind
    private _onNewWorkItemClick(e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction, workItemTypeName: string) {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_TRIAGEVIEWHUB_PIVOTCOMMAND,
                {
                    "command": "new-work-item",
                    "source": "TriageView",
                    "selectedPivot": this._hubViewState.selectedPivot.value,
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN),
                }));
        this._queriesHubContext.triageViewActionCreator.showNewWorkItemDialog(workItemTypeName);
    }

    @autobind
    private _onCommandExecute(ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, action: IUserAction, viaKeyboard: boolean = false) {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_TRIAGEVIEWHUB_PIVOTCOMMAND,
                {
                    "command": action.key,
                    "selectedPivot": this._hubViewState.selectedPivot.value,
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN),
                    "viaKeyboard": viaKeyboard
                }));

        if (action.key === QueryActions.RefreshWorkItems || action.key === QueryActions.RunQuery || action.key === QueryActions.RevertQueryChanges) {
            const revertQueryChanges = action.key === QueryActions.RevertQueryChanges;

            this._queriesHubContext.actionsCreator.checkAndPromptForUnsavedItems(
                () => this._queriesHubContext.triageViewActionCreator.onCommandExecute(action.key),
                () => {
                    // Revert all work item changes before refresh the query result
                    this._queriesHubContext.actionsCreator.revertAllWorkItemChanges();
                    this._queriesHubContext.triageViewActionCreator.onCommandExecute(action.key);
                },
                () => {
                    // Do nothing as the action was canceled
                },
                () => {
                    // No additional handling after dialog prompt
                },
                !revertQueryChanges,
                revertQueryChanges ? WITResources.EditQuery_PromptQueryRevert_MessageTitle : WITResources.RunQuery_PromptUnsavedWorkItemChanges_MessageTitle,
                revertQueryChanges ? WITResources.EditQuery_PromptQueryRevert_MessageContentText : WITResources.RunQuery_PromptUnsavedWorkItemChanges_MessageContentText,
                WITResources.RunQuery_PromptUnsavedWorkItemChanges_ProceedButtonText,
                WITResources.RunQuery_PromptUnsavedWorkItemChanges_RejectButtonText);
        } else {
            this._queriesHubContext.triageViewActionCreator.onCommandExecute(action.key);
        }
    }

    @autobind
    private _onGoBackToQuery() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR,
                {
                    "command": "GoBackToQuery",
                    "source": "WorkItemView",
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN)
                }));

        const state = {};
        if (this._lastQueryParameter.tempQueryId) {
            state[ActionParameters.TEMPQUERYID] = this._lastQueryParameter.tempQueryId;
        } else if (this._lastQueryParameter.searchText) {
            state[ActionParameters.SEARCHTEXT] = this._lastQueryParameter.searchText;
        } else if (this._lastQueryParameter.newQuery) {
            state[ActionParameters.NEW_QUERY] = this._lastQueryParameter.newQuery;
            state[ActionParameters.PARENTID] = this._lastQueryParameter.parentId;
        } else if (this._lastQueryParameter.wiql) {
            state[ActionParameters.WIQL] = this._lastQueryParameter.wiql;
        } else {
            state[ActionParameters.ID] = this.state.queryProvider.queryDefinition.id;
        }

        this._queriesHubContext.navigationActionsCreator.navigateToView(this._lastSelectedPivot || TriageViewPivotsKey.QueryResults, false, state);
    }

    @autobind
    private _navigateNext() {
        if (this.state.workItemNavigationState.nextWorkItemAvailable) {
            if (this._isWorkItemHubView(this._hubViewState.selectedPivot.value)) {
                this._onNextWorkItemClickInWorkItemEditView();
            } else {
                this._onNextWorkItemClickInTriageView();
            }
        }
    }

    @autobind
    private _navigatePrev() {
        if (this.state.workItemNavigationState.preWorkItemAvailable) {
            if (this._isWorkItemHubView(this._hubViewState.selectedPivot.value)) {
                this._onPreviousWorkItemClickInWorkItemEditView();
            } else {
                this._onPreviousWorkItemClickInTriageView();
            }
        }
    }

    @autobind
    private _onPreviousWorkItemClickInTriageView() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR,
                {
                    "command": "NavigatePrevious",
                    "source": "TriageView",
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN)
                }));

        this._workItemsNavigator.navigatePrevious();
    }

    @autobind
    private _onNextWorkItemClickInTriageView() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR,
                {
                    "command": "NavigateNext",
                    "source": "TriageView",
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN)
                }));

        this._workItemsNavigator.navigateNext();
    }

    @autobind
    private _onPreviousWorkItemClickInWorkItemEditView() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR,
                {
                    "command": "NavigatePrevious",
                    "source": "WorkItemView",
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN)
                }));

        this._workItemsNavigator.navigatePrevious();
        this._updateNavigatorWorkItem(-1);
        this._hubViewState.updateNavigationState(HistoryBehavior.replace, () => {
            this._hubViewState.viewOptions.setViewOption(ActionParameters.ID, this._workItemsNavigator.getSelectedWorkItemId());
        });
    }

    @autobind
    private _onNextWorkItemClickInWorkItemEditView() {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR,
                {
                    "command": "NavigateNext",
                    "source": "WorkItemView",
                    "isFullScreen": this._hubViewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN)
                }));

        this._workItemsNavigator.navigateNext();
        this._updateNavigatorWorkItem(1);
        this._hubViewState.updateNavigationState(HistoryBehavior.replace, () => {
            this._hubViewState.viewOptions.setViewOption(ActionParameters.ID, this._workItemsNavigator.getSelectedWorkItemId());
        });
    }

    // Moves the naviagtor to the work item in the results positionChange away from the current position
    // +1 is next, -1 is previous
    private _updateNavigatorWorkItem(positionChange: number) {
        const isFiltering = this.state.workItemFilterData.isFiltering;
        const queryResultsProvider = this.state.queryProvider;
        const filteredWorkItemIds = this.state.workItemFilterData.filteredWorkItemIds;

        const currentItemId = parseInt(this.state.queryParameters.id, 10);
        let currentItemPos;
        if (isFiltering) {
            currentItemPos = filteredWorkItemIds.indexOf(currentItemId);
        } else {
            // getWorkItemIndicesById returns array of indices, for links query same workitem can be at different index
            // To navigate to correct index we need to look for the current selected index and compare with the indices of the workitem
            const indices = queryResultsProvider.getWorkItemIndicesById(currentItemId);
            if (indices.length > 1) {
                const currentSelectedIndex = this._workItemsNavigator.getSelectedIndex();
                const index = indices.indexOf(currentSelectedIndex);
                currentItemPos = index === -1 ? indices[0] : indices[index];
            } else {
                currentItemPos = indices[0];
            }
        }

        const newWorkItemId = isFiltering ? filteredWorkItemIds[currentItemPos + positionChange] : queryResultsProvider.getWorkItemIdAtDataIndex(currentItemPos + positionChange);
        const count = isFiltering ? filteredWorkItemIds.length : queryResultsProvider.getResultsCount();
        this._workItemsNavigator.update(count, currentItemPos + positionChange, newWorkItemId);
    }

    private _getWorkItemNavigationState(): IWorkItemNavigationState {
        return {
            nextWorkItemAvailable: this._workItemsNavigator.isNextAvailable(),
            preWorkItemAvailable: this._workItemsNavigator.isPreviousAvailable(),
            statusText: this._workItemsNavigator.getStatusText(),
        };
    }

    @autobind
    private _onNavigatorUpdated() {
        const workItemNavigationState = this._getWorkItemNavigationState();

        // if we're at the top/bottom of the list, immediately update the
        // navigation state otherwise let the delayed update update the state.
        if (workItemNavigationState.nextWorkItemAvailable !== this.state.workItemNavigationState.nextWorkItemAvailable ||
            workItemNavigationState.preWorkItemAvailable !== this.state.workItemNavigationState.preWorkItemAvailable) {
            this._delayUpdateWorkItemsNavigator.cancel();
            this.setState({ workItemNavigationState });
        } else if (this._delayUpdateWorkItemsNavigator) {
            this._delayUpdateWorkItemsNavigator.reset();
        }
    }

    private _onError = () => {
        const errorMessage = this._queriesHubContext.stores.queryErrorMessageStore.getErrorForContribution(QueryContribution.Triage);
        if ((!!errorMessage || !!this.state.errorMessage) && errorMessage !== this.state.errorMessage) {
            this.setState({ errorMessage });
        }
    }

    protected _renderMessages(): JSX.Element {
        const { infoMessages, errorMessage } = this.state;
        const infoMessage = infoMessages[this._getQueryId()];
        return <div className="messages" key="messages">
            {
                infoMessage ? <MessageBar className="info" messageBarType={MessageBarType.info} onDismiss={() => this._onInfo(null, "")}>
                    {QueryResultInfoBar.processLinks(infoMessage)}
                </MessageBar> : null
            }
            {
                errorMessage ? <MessageBar messageBarType={MessageBarType.error}>
                    {typeof errorMessage === "string" ? QueryResultInfoBar.processLinks(errorMessage) : errorMessage}
                </MessageBar> : null
            }
        </div>;
    }

    @autobind
    private _onPivotChanged(pivotKey: string) {
        this._lastSelectedPivot = this._isTriageViewHubView(pivotKey) ? pivotKey : this._lastSelectedPivot;

        // Whenever pivot changed, reset query performance scenarios
        QueryUtilities.resetQueryPerformanceScenarios();

        // Try load favorites when switching pivots. If it is already loaded, there will be no op
        this._queriesHubContext.actionsCreator.initializeFavorites();
        // Set command bar provider if it hasn't been initialized
        if (!this.state.commandProvider) {
            this.setState({
                commandProvider: this._initializeCommandBarProvider()
            });
        }
    }

    private _setWorkItemPaneViewOption() {
        const viewOption = this._hubViewState.viewOptions.getViewOption(QueriesHubConstants.WorkItemPaneViewOptionKey);
        const paneMode = this._getWorkItemPaneInitialMode();
        if (viewOption !== paneMode) {
            this._hubViewState.viewOptions.setViewOption(QueriesHubConstants.WorkItemPaneViewOptionKey, paneMode);
        }
    }

    private _getFavoriteItemPicker(id: string, name: string): FavoriteItemPicker {
        // Creating selected item based on query parameters, if in workitems view, we check corresponding id matching for custom query to ensure fav
        // icon is not shown in workitems view. Not using last query parameter here because it is disposed and could cause error.
        if (!this._favoritePicker) {
            this._favoritePicker = this.createFavoriteItemPicker(id, name);
        } else if (this.state.queryParameters.newQuery) {
            this._favoritePicker.setSelectedItem(this.getNewQueryItem());
        } else if (this.state.queryParameters.tempQueryId || QueryUtilities.isCustomQuery(id)) {
            this._favoritePicker.setSelectedItem(this.getConstantStringQueryItem(WITResources.AdhocQueryDefaultName));
        } else if (this.state.queryParameters.searchText || QueryUtilities.isSearchTextQuery(id)) {
            this._favoritePicker.setSelectedItem(this.getConstantStringQueryItem(Utils_String.format("{0}: {1}", WITResources.SearchResults, this.state.queryParameters.searchText || this._lastQueryParameter.searchText)));
        } else if (this.state.queryParameters.name && this.state.queryParameters.wiql) {
            this._favoritePicker.setSelectedItem(this.getConstantStringQueryItem(name));
        } else if (Utils_String.equals(id, QueryDefinition.RECYCLE_BIN_QUERY_ID, true)) {
            this._favoritePicker.setSelectedItem(this.getConstantStringQueryItem(WITResources.RecycleBin));
        } else if (this.state.queryParameters.wiql) {
            this._favoritePicker.setSelectedItem(this.getConstantStringQueryItem(WITResources.AdhocQueryDefaultName));
        } else if (name) {
            this._favoritePicker.setSelectedItem({ id: id, name: name });
        }

        return this._favoritePicker;
    }

    private createFavoriteItemPicker(id: string, name: string): FavoriteItemPicker {
        const tfsContext = TfsContext.getDefault();
        const artifactScope: ArtifactScope = {
            id: tfsContext.navigation.projectId,
            name: tfsContext.navigation.project,
            type: QueryItemFavoriteConstants.FavoriteArtifactScopeType,
        };

        const props: IFavoriteItemPickerProps = {
            /** Favorite artifact details */
            favoritesContext: {
                artifactTypes: [FavoriteTypes.WIT_QUERYITEM],
                artifactScope: artifactScope,
                actionsCreator: this._queriesHubContext.actionsCreator.favoritesActionsCreator
            },
            /** Favorite item click */
            onFavoriteClick: (item: IFavoriteItem) => {
                // We want to reset the work items navigator when switching between queries
                if (this.state.queryProvider && !Utils_String.equals(this.state.queryProvider.queryDefinition.id, item.id, true)) {
                    this._workItemsNavigator.reset();
                    PerfScenarioManager.startScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENBREADCRUMBQUERYRESULTS, false);
                    this._queriesHubContext.navigationActionsCreator.navigateToQueryPreservingSupportedState(item.id, true);
                    QueryUtilities.recordBreadcrumbTelemetry();

                    return true;
                }
            },
            /** Visible favorite indicator. If it is a special query or if the user doesn't have permission to use favorite (Stakeholder) then we hide the icon.
             * Otherwise we will see icon come and go
             */
            shouldHideFavoriteSelectedItemIndicator: (item: IFavoritePickListItem) => QueryUtilities.isSpecialQueryId(item.id) || !this._canUseFavorite,
            selectedItem: (name ? { id: id, name: name } : this.getNewQueryItem()),
            getTooltipTextForPickerItem: (item: Favorite) => {
                const query = item.artifactId ? this._queriesHubContext.stores.queryHierarchyItemStore.getItem(item.artifactId) : null;

                // If query is invalid, let's ensure the user sees this in the tooltip
                if (query && query.path) {
                    const prefix = QueryUtilities.getQueryTypeShortText(query.queryType, query.isInvalidSyntax);
                    return `${prefix} - ${query.path}`;
                }

                return undefined;
            },
            onRenderItemText: (item: IFavoritePickListItem): JSX.Element => {
                const queryItem = item.id ? this._queriesHubContext.stores.queryHierarchyItemStore.getItem(item.id) : null;
                if (!queryItem) {
                    return <span className="query-name-part">{item.name}</span>;
                }

                const pathParts = getPathParts(queryItem.path);
                let folderPath = "";
                if (pathParts.length > 2) {
                    folderPath = `.../${pathParts[pathParts.length - 2]}`;
                } else if (pathParts.length === 2) {
                    folderPath = pathParts[0];
                } else {
                    // Not possible so log error instead...
                    publishErrorToTelemetry(new Error(`Query path "${queryItem.path}" contains less than 2 path parts.`));
                }

                if (folderPath.length > 30) {
                    // If folder path is too long, truncate it.
                    folderPath = folderPath.substr(0, 30) + "...";
                }

                return <span>
                    <span className="query-folder-part">{folderPath}</span>
                    <span className="query-path-separator-part">/</span>
                    <span className="query-name-part">{queryItem.name}</span>
                </span>;
            },
            compareFavorites: (favorite1: IFavoriteItem, favorite2: IFavoriteItem) => {
                return Utils_String.localeIgnoreCaseComparer(favorite1.name, favorite2.name);
            },
            getFavoriteItemIcon: (item: IFavoriteItem) => {
                const query = item.id ? this._queriesHubContext.stores.queryHierarchyItemStore.getItem(item.id) : null;
                // default to flat if we have no query in the store.
                const queryType = query && query.queryType || QueryType.Flat;

                return {
                    iconType: VssIconType.bowtie,
                    iconName: QueryUtilities.getQueryTypeIconClassName(queryType),
                    styles: { root: { color: this._bowtieIconColor } }
                };
            },
            getFavoriteItemHref: (item: IFavoriteItem) => {
                return QueryUtilities.createUrlForQuery(item.id);
            },
            onBrowseAllClick: this._onBrowseAllClicked,
            browseAllText: WITResources.BrowseAllQueries,
            showPickerGroupName: true
        };

        return new FavoriteItemPicker(props);
    }

    private _onBrowseAllClicked = () => {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.QueryDirectoryNewWebPlatform, false)) {
            const tfsContext: TfsContext = TfsContext.getDefault();
            const href: string = tfsContext.getPublicActionUrl(
                QueriesHubConstants.AllQueriesPageAction,
                QueriesHubConstants.ControllerName,
                {
                    project: tfsContext.navigation.project,
                    team: tfsContext.navigation.team
                });

            getLocalService(HubsService).getHubNavigateHandler("ms.vss-work-web.query:hub", href)(null);
        } else {
            this._queriesHubContext.navigationActionsCreator.navigateToQueriesHub(QueriesHubConstants.AllQueriesPageAction, true);
        }
    }

    private _willProviderChange(queryParameters: IQueryParameters): boolean {
        if (!this.state.queryProvider) {
            // If we don't have a provider, it has to be changing
            return true;
        } else if (queryParameters.newQuery) {
            return queryParameters.newQuery !== Utils_String.isEmptyGuid(this.state.queryProvider.getId());
        } else if (queryParameters.path) {
            return !Utils_String.equals(queryParameters.path, this.state.queryParameters.path, true);
        } else if (queryParameters.wiql) {
            return !Utils_String.equals(queryParameters.wiql, this.state.queryParameters.wiql, true);
        } else if (queryParameters.searchText) {
            return !Utils_String.equals(queryParameters.searchText, this.state.queryParameters.searchText, true);
        } else {
            const incomingId = queryParameters.tempQueryId || queryParameters.id;
            return !Utils_String.equals(incomingId, this.state.queryProvider.getUniqueId(), true);
        }
    }

    @autobind
    private _onViewOptionsChanged(changedState: IViewOptionsValues): void {
        // Whenever view options changed, reset query performance scenarios
        QueryUtilities.resetQueryPerformanceScenarios();

        const queryParameters = QueryUtilities.getQueryParametersFromViewOptions(this._hubViewState);
        if (!queryParameters.triage
            && QueryUtilities.isTriageViewPivot(queryParameters)
            && this._willProviderChange(queryParameters)) {
            const deferred = Q.defer<void>();
            const currentState = { ...this._hubViewState.viewOptions.getViewOptions() };

            // Prompt dialog for unsaved items
            this._queriesHubContext.actionsCreator.checkAndPromptForUnsavedItems(
                () => {
                    // provider changes, update the params and then ensureProvider will take care of the rest
                    this.setState(
                        {
                            queryParameters: queryParameters,
                            queryProvider: null // If the provider is changed, make previous provider null so that ensure provider will take care of creating new provider
                        },
                        () => this._queriesHubContext.triageViewActionCreator.ensureProvider(this._queryProviderCreator, this.state.queryParameters));
                },
                () => {
                    // Revert all changes when user choose to leave the page
                    this._queriesHubContext.actionsCreator.revertAllWorkItemChanges();
                    this._queriesHubContext.actionsCreator.revertQueryChanges();
                    deferred.resolve(null);
                },
                () => deferred.reject(null),
                (hasUnsavedItems: boolean) => {
                    if (!hasUnsavedItems) {
                        Q(deferred.promise).done(() => { }, () => { });
                        deferred.resolve(null);
                    } else {
                        Q(() => { }).done(() => {
                            // Quietly switch to previous state.
                            // This is chained after a promise because you cannot push a new state while in view options changed event callback
                            const previousState = QueryUtilities.getViewStateFromQueryResultsProvider(
                                this._queriesHubContext, this._hubViewState);
                            this._queriesHubContext.navigationActionsCreator.updateNavigationState(previousState, true);
                        });

                        // Handle user selection from dialog
                        Q(deferred.promise).done(
                            () => this._queriesHubContext.navigationActionsCreator.updateNavigationState(currentState, true),
                            () => {
                                // Do nothing if user cancels the navigation
                            });
                    }
                });
        } else if (queryParameters.triage !== this.state.queryParameters.triage) {
            // transitioning between triage and pivot view, just update the queryParameters and title
            // since the provider cannot change in this transition.
            this.setState({
                queryParameters: queryParameters
            }, () => {
                document.title = getDefaultPageTitle(this.state.queryProvider.getTitle());
            });
        } else {
            // just a normal view option change
            this.setState({
                workItemPaneMode: this._hubViewState.viewOptions.getViewOption(QueriesHubConstants.WorkItemPaneViewOptionKey),
                queryParameters: queryParameters
            }, () => {
                // if id or newquery haven't changed that means we're exiting triage view and
                // should just update the title
                if (!this.state.queryParameters.triage &&
                    this.state.queryProvider) {
                    document.title = getDefaultPageTitle(this.state.queryProvider.getTitle());
                }
            });
        }
    }

    private getNewQueryItem() {
        return this.getConstantStringQueryItem(WITResources.UntitledQuery);
    }

    private getConstantStringQueryItem(name: string) {
        return { name: name, id: null };
    }

    private _getWorkItemPaneInitialMode(): string {
        const settings = WorkItemSettingsService.getInstance().getUserSettings();
        return settings.workItemPaneMode;
    }

    private _isTriageViewHubView(view: string): boolean {
        return Utils_String.equals(view, TriageViewPivotsKey.QueryCharts, true)
            || Utils_String.equals(view, TriageViewPivotsKey.QueryEdit, true)
            || Utils_String.equals(view, TriageViewPivotsKey.QueryResults, true);
    }

    private _isWorkItemHubView(view: string): boolean {
        return Utils_String.equals(view, TriageViewPivotsKey.NewWorkItem, true)
            || Utils_String.equals(view, TriageViewPivotsKey.WorkItemEdit, true);
    }

    private _isWorkItemOnlyView(): boolean {
        const queryDefinition = this._getQueryDefinitionFromProvider();
        return (Utils_String.equals(this._hubViewState.selectedPivot.value, TriageViewPivotsKey.WorkItemEdit) && (!this.state.queryParameters.triage || !queryDefinition)) ||
            (Utils_String.equals(this._hubViewState.selectedPivot.value, TriageViewPivotsKey.NewWorkItem) && !queryDefinition);
    }
}

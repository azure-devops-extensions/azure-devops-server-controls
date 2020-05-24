/// <reference types="jquery" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { Fabric } from "OfficeFabric/Fabric";
import { autobind } from "OfficeFabric/Utilities";

import { delegate } from "VSS/Utils/Core";
import { domElem } from "VSS/Utils/UI";
import Controls = require("VSS/Controls");
import Telemetry = require("VSS/Telemetry/Services");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import { FilterPanelToggleButton, FilterPanelToggleButtonProps } from "Presentation/Scripts/TFS/Controls/Filters/FilterPanelToggleButton";
import { FilterHelpers } from "Presentation/Scripts/TFS/Controls/Filters/FilterHelpers";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import VCHistoryChangesSearchFilter = require("VersionControl/Scripts/Controls/HistoryChangesSearchFilter");
import { HistoryListContainer } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import { HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { GraphToggleCallout } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphToggleCallout";
import { GitHistoryDataOptions, IMessage } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import Performance = require("VSS/Performance");
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import { GitHistoryFilter, GitFilterSearchCriteria, GitFilterProps, GitFilterState } from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryFilter";
import * as HistoryUtils from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";
import { getBranchFullName } from "VersionControl/Scripts/VersionSpecUtils";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/HistoryTab";

export interface IHistoryTabSearchProps {
    historySearchCriteria?: any;
    repositoryContext: GitRepositoryContext;
    dataOptions?: GitHistoryDataOptions;
    itemPath?: string;
    itemVersion?: string;
    path?: string;
    version?: string;
    item?: any;
}

export interface IHistoryTabOptions {
    onFilterUpdated?(searchCriteria: string): boolean;
    scenarioComplete?(tabName: string): void;
    showOldPathControl?: boolean;
    columns?: HistoryListColumnMapper[];
}

/**
 * Rendering engine used to inject history tab view into older page lifecycle.
 */
export function renderTab(element: HTMLElement, historyTabProps: IHistoryTabProps): void {
    ReactDOM.render(
        <HistoryTab {...historyTabProps} />,
        element);
}

export interface IHistoryTabProps {
    actionCreator: HistoryTabActionCreator;
    storesHub: HistoryTabStoresHub;
    historySearchProps: IHistoryTabSearchProps;
    tabOptions: IHistoryTabOptions;
    customerIntelligenceData?: CustomerIntelligenceData;
}

export interface IStateless { }

/**
 * The history commits/changesets tab.
 */
export class HistoryTab extends React.Component<IHistoryTabProps, IStateless> {

    private _searchFilterElement: HTMLElement;
    private _searchFilter: VCHistoryChangesSearchFilter.ChangesSearchFilter;
    private _gitHistoryFilter: GitHistoryFilter;

    private _repositoryContext: RepositoryContext;
    private _$historyFilters: JQuery;
    private _$pivotFilters: HTMLElement;
    private _searchCriteria: any = {};
    private _dataOptions: GitHistoryDataOptions;
    private _tabName = "";
    private _scenario: Performance.IScenarioDescriptor;
    private _applySearchCriteriaScenario: Performance.IScenarioDescriptor;
    private _scenarioName: string = "";
    private _isHistoryListDrawComplete = false;
    private _isSearchFilterRenderComplete = false;
    private _pivotColumnFiltersCssClass = "vc-history-graph-toggle";
    private _isGitGraphEnabled: boolean;
    private _gitGraphMessage: IMessage;
    private _filterButton: FilterPanelToggleButton;

    constructor(props: IHistoryTabProps, context?: any) {
        super(props, context);
        if (this.props.customerIntelligenceData) {
            const ciDataView = this.props.customerIntelligenceData.getView();
            this._scenarioName = ciDataView ? ciDataView.concat(".") : "";
        }
        this._tabName = this.props.historySearchProps.repositoryContext.getRepositoryType() === RepositoryType.Git ? "CommitsTab" : "ChangesetsTab";
        this._scenarioName = this._scenarioName.concat(this._tabName);
        this._scenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, this._scenarioName);
    }

    public render(): JSX.Element {
        const currentBranchFullname = getBranchFullName(this._getCurrentVersionSpec());

        return (
            
            <div className={"vc-history-tab-root"}>
                <div className={"history-tab-filters"}></div>
                <div ref={element => this._searchFilterElement = element} />
                <HistoryListContainer
                    actionCreator={this.props.actionCreator}
                    repositoryContext={this.props.historySearchProps.repositoryContext}
                    onScenarioComplete={(splitTimingName: string) => {
                        this._onHistoryListScenarioComplete(splitTimingName);
                    } }
                    historyListStore={this.props.storesHub.historyListStore}
                    permissionStore={this.props.storesHub.permissionsStore}
                    telemetryEventData={this.props.customerIntelligenceData}
                    columns={this.props.tabOptions.columns}
                    currentBranchFullname={currentBranchFullname}
                    infiniteScroll={true}
                    className={"history-tab-history-list"}
                    shouldDisplayError={true} />
            </div>);
    }

    public componentWillMount(): void {
        this._calculateSearchCriteria();
        this._calculateDataOptions();
        this._addSplitTiming("loadHistoryItems");
        this.props.actionCreator.loadHistoryItems(this._searchCriteria, this._dataOptions);
    }

    public componentDidMount(): void {
        this.props.storesHub.historyListStore.addChangedListener(this._renderPivotFilters);
        this.props.storesHub.settingPermissionStore.addChangedListener(this._renderGraphToggleButton);
        this._renderGraphToggleButton();
        this._renderNewSearchFilter();

        this._endScenario();
        this._recordTelemetry(this._searchCriteria);
    }

    public componentWillUnmount(): void {
        if (this.props.storesHub){
            if (this.props.storesHub.historyListStore) {
                this.props.storesHub.historyListStore.removeChangedListener(this._renderPivotFilters);
            }
            if (this.props.storesHub.settingPermissionStore){
                this.props.storesHub.settingPermissionStore.removeChangedListener(this._renderGraphToggleButton);
            }
        }
        
        this._searchFilterElement = null;
        ReactDOM.unmountComponentAtNode(this._$pivotFilters);
        const filterPanelToggleButtonContainer = this._getFilterPanelToggleButtonContainer();
        if (filterPanelToggleButtonContainer) {
            ReactDOM.unmountComponentAtNode(filterPanelToggleButtonContainer);
        }

        if (document.getElementsByClassName(this._pivotColumnFiltersCssClass)[0]) {
            ReactDOM.unmountComponentAtNode(document.getElementsByClassName(this._pivotColumnFiltersCssClass)[0]);
        }
    }

    public componentDidUpdate(): void {
        this._applyDelayedSearchCriteria();
    }

    public getSearchCriteria(): any {
        return this._searchCriteria;
    }

    public getSearchFilter(): GitHistoryFilter {
        return this._gitHistoryFilter;
    }

    /*Public for UTs*/
    public _getApplySearchCriteriaScenario(): Performance.IScenarioDescriptor {
        return this._applySearchCriteriaScenario;
    }

    private _renderPivotFilters = (): void => {
        this._renderNewSearchFilter();
        this._renderGraphToggleButton();
    }

    private _getGitFilterSearchCriteria = (): GitFilterSearchCriteria => {
        // Construct filterSearchCriteria by distilling only the filters parameters. 
        // Do not add properties like itemPath , path etc.
        return {
                user: this._searchCriteria.user,
                alias: this._searchCriteria.alias,
                fromDate: this._searchCriteria.fromDate,
                toDate: this._searchCriteria.toDate,
                gitLogHistoryMode: this._searchCriteria.gitLogHistoryMode,
            }
    }

    private _renderNewSearchFilter = (): void => {
        if (this._searchFilterElement) {
            this._addSplitTiming("SearchFilter.startRendering")
            // Switched tabs from branch updates to commits
            if (this._repositoryContext !== this.props.historySearchProps.repositoryContext) {
                this._repositoryContext = this.props.historySearchProps.repositoryContext;
                this._$pivotFilters = this._getFilterContainer();
            }

            const filterSearchCriteria = this._getGitFilterSearchCriteria();

            const filterProps: GitFilterProps = {
                initialSearchCriteria: filterSearchCriteria,
                filterUpdatedCallback: (searchCriteria: GitFilterSearchCriteria) => this._onFilterUpdated(null, searchCriteria),
                repositoryId: this._repositoryContext.getRepositoryId(),
                mruAuthors: HistoryUtils.calculateMruAuthors(this.props.storesHub.historyListStore.state.historyResults),
                isFilterPanelVisible: this.props.storesHub.historyListStore.state.isFilterPanelVisible
            };
            this._gitHistoryFilter = ReactDOM.render(<GitHistoryFilter {...filterProps} />, this._getFilterContainer()) as GitHistoryFilter;

            const filterPanelToggleButtonProps: FilterPanelToggleButtonProps = {
                isFilterPanelVisible: this.props.storesHub.historyListStore.state.isFilterPanelVisible,
                filterState: FilterHelpers.hasNonEmptyProperties(filterSearchCriteria) ? FilterState.FILTER_APPLIED : FilterState.FILTER_CLEARED,
                toggleFilterPanel: this.toggleFilterPanel.bind(this)
            }

            const filterPanelToggleButtonContainer = this._getFilterPanelToggleButtonContainer();
            if (filterPanelToggleButtonContainer) {
                this._filterButton = ReactDOM.render(<FilterPanelToggleButton {...filterPanelToggleButtonProps} />, filterPanelToggleButtonContainer) as FilterPanelToggleButton;
            }

            this._isSearchFilterRenderComplete = true;
            this._addSplitTiming("SearchFilter.endRendering");
        }
    }

    private toggleFilterPanel(): void {
        this.props.actionCreator.toggleFilterPanelVisibility();
    }

    private _getCurrentVersionSpec(): VersionSpec {
        const itemVersion = this.props.historySearchProps.itemVersion || this.props.historySearchProps.version;
        return VersionSpec.parse(itemVersion);
    }

    private _getFilterPanelToggleButtonContainer(): HTMLElement {
        const container = $(".vc-history-pivot-filters");
        return container ? container.get(0) : null;
    }

    private _getFilterContainer(): HTMLElement {
        return $(".history-tab-filters").get(0);
    }

    private _renderSearchFilter(): void {
        if (this._searchFilterElement) {
            this._addSplitTiming("SearchFilter.startRendering")
            if (this._repositoryContext !== this.props.historySearchProps.repositoryContext) {
                this._repositoryContext = this.props.historySearchProps.repositoryContext;
                if (!this._$historyFilters) {
                    const $pivotFilters = $(this._searchFilterElement).closest(".right-hub-content").find(".vc-history-pivot-filters");

                    this._$historyFilters = $($pivotFilters.find(".vc-history-tab-filters")[0]);
                    if (!this._$historyFilters.length) {
                        this._$historyFilters = $(domElem("div", "vc-history-tab-filters")).appendTo($pivotFilters);
                    }
                    else {
                        this._$historyFilters.empty();
                    }
                }
            }

            const repoType = this._repositoryContext.getRepositoryType();

            this._searchFilter = Controls.BaseControl.createIn(VCHistoryChangesSearchFilter.ChangesSearchFilter, this._searchFilterElement, {
                tfsContext: TfsContext.getDefault(),
                $filterPaneLocation: this._$historyFilters,
                showBranches: false,
                showFromToRange: repoType !== RepositoryType.Git,
                showHistoryMode: repoType === RepositoryType.Git,
                showOldPathControl: this.props.tabOptions.showOldPathControl || false,
                repositoryContext: this.props.historySearchProps.repositoryContext,
                myChangesLabel: repoType === RepositoryType.Git ? VCResources.MyCommits : VCResources.MyChanges,
                allChangesLabel: repoType === RepositoryType.Git ? VCResources.AllCommits : VCResources.AllChanges,
                itemPath: this.props.historySearchProps.path || "",
                itemVersion: this.props.historySearchProps.version || ""
            }) as VCHistoryChangesSearchFilter.ChangesSearchFilter

            this._searchFilter._bind("filter-updated", delegate(this, this._onFilterUpdated));
            this._isSearchFilterRenderComplete = true;
            this._addSplitTiming("SearchFilter.endRendering");
        }
    }

    private _onFilterUpdated(e?: JQueryEventObject, searchCriteria?: any): void {
        //Merge current searchCriteria with their searchCriteria if new filters.
        let currentSearchCriteria = searchCriteria;
        currentSearchCriteria = $.extend(this._searchCriteria, searchCriteria);

        let queryHistory = true;
        if (this.props.tabOptions.onFilterUpdated) {
            queryHistory = this.props.tabOptions.onFilterUpdated(currentSearchCriteria) !== false;
        }
        if (queryHistory && currentSearchCriteria) {
            this._searchCriteria = currentSearchCriteria;
            this.props.actionCreator.fetchHistory(this._searchCriteria, this._dataOptions);
        }
    }

    private _calculateSearchCriteria(): void {
        if (this.props.historySearchProps.historySearchCriteria) {
            this._searchCriteria = $.extend({}, this.props.historySearchProps.historySearchCriteria);
        }
        else {
            this._searchCriteria = { itemPath: "", itemVersion: "" };
        }

        if (this._searchCriteria) {
            this._searchCriteria.itemPath = this.props.historySearchProps.item ? this.props.historySearchProps.item.serverItem : this.props.historySearchProps.path || this.props.historySearchProps.itemPath || "";
            this._searchCriteria.itemVersion = this.props.historySearchProps.itemVersion || this.props.historySearchProps.version || "";
        }
    }

    private _calculateDataOptions(): void {
        if (this.props.historySearchProps.dataOptions) {
            this._dataOptions = this.props.historySearchProps.dataOptions;
        }
        else {
            this._dataOptions = {
                fetchBuildStatuses: true,
                fetchPullRequests: true,
                fetchTags: true,
                fetchGraph: true
            } as GitHistoryDataOptions;
        }
    }

    // when inside a react life-cycle method, we must not invoke any action - as its highly likely that rendering is happening 
    // as a reaction of some other action, all such actions should be either called asynchronously or as a aprt of user action after ensuring 
    // that we are not in any action stack
    private _applyDelayedSearchCriteria(): void {
        setTimeout(() => this._applySearchCriteria(), 0);
    }

    /* Applies the search criteria to the filter and the history list
    */
    // Public for UTs
    public _applySearchCriteria(): void {
        this._applySearchCriteriaScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, this._scenarioName + ".ApplySearchCriteria");
        this._calculateSearchCriteria();
        if (this._searchCriteria) {
            this._renderNewSearchFilter();
            this.props.actionCreator.fetchHistory(this._searchCriteria, this._dataOptions);
            this._recordTelemetry(this._searchCriteria);
        }
    }

    private _setSearchCriteriaForFilter(disableApplybutton?: boolean): void {
        if (this._searchFilter) {
            this._addSplitTiming("SetFilterSearchCriteria.start")
            this._searchFilter.setSearchCriteria(this._searchCriteria, disableApplybutton);
            this._addSplitTiming("SetFilterSearchCriteria.end");
        }
    }

    private _endScenario(): void {
        if (this._isHistoryListDrawComplete && this._isSearchFilterRenderComplete) {
            if (this._scenario && this._scenario.isActive()) {
                this._scenario.addSplitTiming(this._tabName.concat("complete"));
                this._scenario.end();
            }
            if (this.props.tabOptions.scenarioComplete) {
                this.props.tabOptions.scenarioComplete(this._tabName.concat("Complete"));
            }
        }
    }

    private _addSplitTiming(splitTimingName: string): void {
        if (this._scenario && this._scenario.isActive()) {
            this._scenario.addSplitTiming(splitTimingName)
        }
    }

    private _recordTelemetry(searchCriteria: any): void {
        // Gather some telemetry: Record there was a navigation, what refname it was to, and whether some advanced search options were active
        const path = searchCriteria.path || searchCriteria.itemPath || "";
        const restrictedToPath = path && path !== "/";
        const navigationEvent = new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            this._scenarioName + ".Navigate",
            {
                "AdvancedSearch.WasRestrictedToPath": restrictedToPath,
                "AdvancedSearch.WasRestrictedToUser": !!searchCriteria.user,
                "AdvancedSearch.WasRestrictedToMine": !!searchCriteria.user && SearchCriteriaUtil.compareUser(searchCriteria.user, TfsContext.getDefault().currentIdentity),
                "AdvancedSearch.WasRestrictedFromDate": !!searchCriteria.fromDate,
                "AdvancedSearch.WasRestrictedToDate": !!searchCriteria.toDate,
                "AdvancedSearch.WasRestrictedHistoryMode": !!searchCriteria.gitLogHistoryMode,
            });
        if (this.props.customerIntelligenceData) {
            navigationEvent.area = this.props.customerIntelligenceData.area ? this.props.customerIntelligenceData.area : navigationEvent.area;
            navigationEvent.properties = $.extend({}, navigationEvent.properties, this.props.customerIntelligenceData.properties);
        }
        Telemetry.publishEvent(navigationEvent);
    }

    @autobind
    private _renderGraphToggleButton(): void {
        const state = this.props.storesHub.historyListStore.state;
        const settings = this.props.storesHub.settingPermissionStore.getPermissions();
        if (settings.Write && this._shouldUpdateGraphToggle()) {
            this._isGitGraphEnabled = state.isGitGraphFeatureEnabled;
            this._gitGraphMessage = state.gitGraphMessage;

            if (document.getElementsByClassName(this._pivotColumnFiltersCssClass)[0]) {
                ReactDOM.render(
                    <Fabric>
                        <GraphToggleCallout
                            onGraphColumnToggleClick={(checked: boolean) => {
                                this.props.actionCreator.setGraphColumnDisplay(checked, this._searchCriteria, this._dataOptions, false, true);
                            }}
                            onDismissMessage={() => this.props.actionCreator.dismissGraphMessage(state.gitGraphMessage.key)}
                            isChecked={state.isGitGraphFeatureEnabled}
                            message={state.gitGraphMessage} />
                    </Fabric>
                    , document.getElementsByClassName(this._pivotColumnFiltersCssClass)[0]);
            }
        }
    }

    private _shouldUpdateGraphToggle(): boolean {
        const state = this.props.storesHub.historyListStore.state;
        const currentGraphMessageKey = this._gitGraphMessage && this._gitGraphMessage.key;
        const newGraphMessageKey = state.gitGraphMessage && state.gitGraphMessage.key;

        return (this._isGitGraphEnabled != state.isGitGraphFeatureEnabled)
            || (currentGraphMessageKey != newGraphMessageKey);
    }

    // Public for UTs
    public _onHistoryListScenarioComplete(splitTimingName: string): void {
        this._isHistoryListDrawComplete = true;
        if (this._scenario && this._scenario.isActive()) {
            this._scenario.addSplitTiming(splitTimingName);
        }
        if (this._applySearchCriteriaScenario && this._applySearchCriteriaScenario.isActive()) {
            this._applySearchCriteriaScenario.addSplitTiming(splitTimingName);
            this._applySearchCriteriaScenario.end();
        }
        this._endScenario();
    }
}

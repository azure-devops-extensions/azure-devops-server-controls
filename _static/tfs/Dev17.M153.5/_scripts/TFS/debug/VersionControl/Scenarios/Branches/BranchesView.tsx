/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDom from "react-dom";

import { Enhancement, BaseControl } from "VSS/Controls";
import { NavigationViewTab } from "VSS/Controls/Navigation";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as NavigationServices from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import { delegate } from "VSS/Utils/Core";
import * as StringUtils from "VSS/Utils/String";
import { domElem, KeyCode } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import { CommandEventArgs } from "VSS/Events/Handlers";
import * as VSS_Events from "VSS/Events/Services";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData, CustomerIntelligenceProperty } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import * as MessageAction from "VersionControl/Scenarios/Branches/Actions/Message";
import * as RepoContext from "VersionControl/Scenarios/Branches/Stores/RepoContextStore";
import { ViewBase } from "VersionControl/Scripts/Views/BaseView";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { BranchesTreeControllerView } from "VersionControl/Scenarios/Branches/BranchesTreeControllerView";
import { GitRef, GitRefFavorite, RefFavoriteType, GitCommitRef } from "TFS/VersionControl/Contracts";
import { getMyBranchNames, getBranchesCompareUrlFragment } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { SelectionObject } from "VersionControl/Scenarios/Branches/Stores/TabSelectionStore";
import { BranchStoreFactory, StoreIds } from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import { GitRefWithState } from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import { CompareBranch } from "VersionControl/Scenarios/Branches/Stores/CompareBranchStore";
import { DefaultBranchStore } from "VersionControl/Scenarios/Branches/Stores/DefaultBranchesStore";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import { ValueStore } from "VersionControl/Scenarios/Branches/Stores/ValueStore";
import * as Message from "VersionControl/Scenarios/Branches/Stores/MessageStore";
import { IMessage } from "VersionControl/Scenarios/Shared/MessageArea";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import "VSS/LoaderPlugins/Css!VersionControl/Branches/BranchesView";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { BranchMenuActions, BranchRowActions } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import * as StaleBranches from "VersionControl/Scenarios/Branches/Stores/StaleBranchesStore";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { AggregateState } from "VersionControl/Scenarios/Branches/Stores/StoresHub";
import * as BranchesTabsOnDemand from "VersionControl/Scripts/Views/Tabs/BranchesTabsOnDemand";
import { HistoryNavigationTab as NewHistoryTab } from "VersionControl/Scenarios/Shared/HistoryNavigationTab";
import * as HistoryTabActionsHub_Async from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { MessageArea } from "VersionControl/Scenarios/Shared/MessageArea";
import { Fabric } from "OfficeFabric/Fabric";

export module TabActionIds {
    export const MY_BRANCHES_TAB = "mine";
    export const ALL_BRANCHES_TAB = "all";
    export const STALE_BRANCHES_TAB = "stale";
    export const Summary = "summary";   // legacy action Id will now map to Mine.
    export const CommitDiff = "commits";
    export const FileDiff = "files";
}

/**
 * Encapsulates common code for the new Branches view tabs
 */
class BranchesTab extends NavigationViewTab {
    protected _contentArea: HTMLDivElement;

    public initialize() {
        super.initialize();

        this._contentArea = document.createElement("div");

        this._element[0].appendChild(this._contentArea);
    }

    protected _render() {
        ReactDom.render(
            <Fabric>
                <MessageControllerView />
                <BranchesTreeControllerView permissions={this._options.navigationView._permissions} />
            </Fabric>,
            this._contentArea);
    }

    /**
     * Publish Customer Intelligence telemetry data with additional context from the navigation tab.
     * @param feature the main feature name for telemetry
     * @param actionSource an optional name of the source of the action.  Examples: ContextMenu, Button, Toolbar, etc.
     * @param immediate if false (default) then queue for a batch call.  Set to true when page navigation will occur.
     */
    public publishCustomerIntelligenceData(feature: string, actionSource?: string, immediate: boolean = false, properties?: CustomerIntelligenceProperty[]) {
        const ci = this._options.customerIntelligenceData as CustomerIntelligenceData;
        ci.clone().publish(feature, false, actionSource, immediate, properties);
    }

    public getCustomerIntelligenceTabName(): string {
        return (this._options.customerIntelligenceData as CustomerIntelligenceData).getTab();
    }

    protected _dispose(): void {
        ReactDom.unmountComponentAtNode(this._contentArea);
        super._dispose();
    }
}

class BranchesAllTab extends BranchesTab {
    public initialize() {
        super.initialize();
    }

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("AllBranchesTab", parsedState, this._options);

        //Avoid calling init on all if we don't have to
        const filterStoreText: string = BranchStoreFactory.get<ValueStore<string>>(StoreIds.FILTER).get();
        if (!filterStoreText) {
            Branch.Creators.initializeAllBranches();
        }

        const perf = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "Git.NewBranches.Tab.AllBranches");
        BranchActions.TabSelection.invoke({
            selection: TabActionIds.ALL_BRANCHES_TAB, 
            branchesStore: BranchStoreFactory.get<SmartTree.TreeStore>(StoreIds.ALL_TREE), 
            folderCollapsedAction: BranchActions.AllFolderCollapsed, 
            folderExpandedAction: BranchActions.AllFolderExpanded,
            displayFlat: false,
        } as SelectionObject);
        this._render();
        perf.end();
    }
}

class BranchesMyTab extends BranchesTab {

    public initialize() {
        super.initialize();
        Branch.Creators.initializeMyBranches();
    }

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("MyBranchesTab", parsedState, this._options);

        Branch.Creators.resetFilter();
        const perf = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "Git.NewBranches.Tab.MyBranches");
        BranchActions.TabSelection.invoke({
            selection: TabActionIds.MY_BRANCHES_TAB,
            branchesStore: BranchStoreFactory.get<SmartTree.TreeStore>(StoreIds.MY_TREE), 
            folderCollapsedAction: BranchActions.MyFolderCollapsed, 
            folderExpandedAction: BranchActions.MyFolderExpanded,
            displayFlat: false,
        } as SelectionObject);
        this._render();
        perf.end();
    }
}

class BranchesStaleTab extends BranchesTab {

    public initialize() {
        super.initialize();
        Branch.Creators.initializeStaleBranches();
    }

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("StaleBranchesTab", parsedState, this._options);

        Branch.Creators.resetFilter();
        var perf = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "Git.NewBranches.Tab.StaleBranches");
        var branchesStore = BranchStoreFactory.get<StaleBranches.StaleBranchesStore>(StoreIds.STALE_LIST);
        BranchActions.TabSelection.invoke({
            selection: TabActionIds.STALE_BRANCHES_TAB, 
            branchesStore, 
            folderCollapsedAction: BranchActions.MyFolderCollapsed, 
            folderExpandedAction: BranchActions.MyFolderExpanded,
            displayFlat: true,
        } as SelectionObject);
        this._render();
        // If no results show no branches messages  
        if (branchesStore.isLoaded() && branchesStore.get().length === 0) {
            MessageAction.Creators.showNoBranchesMessage(BranchResources.NoStaleBranches);
        }
        perf.end();
    }

    public onNavigateAway(): void {
        MessageAction.Creators.dismissNoBranchesMessage(BranchResources.NoStaleBranches);
    }
}

export interface IMessageControllerViewProperties {
}

export interface IMessageControllerViewState {
    messages: IMessage[];
}

export interface IStateless { }

export class MessageControllerView extends React.Component<IStateless, IMessageControllerViewState> {

    private _changeDelegate = this._onChange.bind(this);

    constructor(props: IStateless) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        BranchStoreFactory.get<KeyValue.DictionaryStore<IMessage>>(StoreIds.MESSAGE).addChangedListener(this._changeDelegate);
    }

    public componentWillUnmount() {
        BranchStoreFactory.get<KeyValue.DictionaryStore<IMessage>>(StoreIds.MESSAGE).removeChangedListener(this._changeDelegate);
    }

    public render() {
        const dismissMessage = (key: number) => Branch.Creators.dismissMessage(key);

        return <MessageArea
            messages={this.state.messages}
            dismissMessage={dismissMessage} />
    }

    private _getStateFromStores(): IMessageControllerViewState {
        const messages = BranchStoreFactory.get<KeyValue.DictionaryStore<IMessage>>(StoreIds.MESSAGE).getAll();
        if (messages === null)
            return {
                messages: undefined
            }
        return {
            messages: messages
        }
    }

    private _onChange() {
        this.setState(this._getStateFromStores());
    }

}

interface INewBranchesState {
    repositoryContext: any,
    baseVersion: VersionSpecs.VersionSpec,
    targetVersion: VersionSpecs.VersionSpec
    historySearchCriteria: any;
    version: string;
}

export class NewBranchesView extends ViewBase {
    private static _branchCommitDiffTab = "BranchCommitDiffTab";

    private _performance = Performance.getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "Git.NewBranches.View", true);
    private _filterIconSearch: HTMLSpanElement;
    private _filterIconEditRemove: HTMLSpanElement;
    private _filterInput: HTMLInputElement;
    private _tabIdBeforeFiltering: string;
    private _eventService: VSS_Events.EventService;
    private _ciFilterData: CustomerIntelligenceData;
    private _permissions: BranchPermissions;

    // Page title elements shown/hidden based on selected tab
    private _$branchSelectorContainer: JQuery;
    private _$branchFilterContainer: JQuery;
    private _$contentTitle: JQuery;
    private _$historyFilters: JQuery;

    // Migrated from legacy branches view for branch comparisons
    private _tabIds: string[];

    //Event Handlers
    private _createBranchButton: HTMLButtonElement;
    private _createBranchDelegate: IArgsFunctionR<any>;
    private _clearFilterButton: HTMLButtonElement;
    private _filterKeyUpEvent: IArgsFunctionR<any>;
    private _filterSearchClickEvent: IArgsFunctionR<any>;
    private _filterClearClickEvent: IArgsFunctionR<any>;
    private _removeFilterClickEvent: IArgsFunctionR<any>;
    private _eventExploreFiles: IArgsFunctionR<any>;
    private _eventViewLastUpdate: IArgsFunctionR<any>;
    private _eventNewPullRequest: IArgsFunctionR<any>;
    private _eventViewPullRequest: IArgsFunctionR<any>;
    private _eventBranchAddFavorite: IArgsFunctionR<any>;
    private _eventBranchRemoveFavorite: IArgsFunctionR<any>;
    private _eventFolderAddFavorite: IArgsFunctionR<any>;
    private _eventFolderRemoveFavorite: IArgsFunctionR<any>;
    private _eventMenu: any;

    initializeOptions(options?: any) {
        this._permissions = options.permissions;

        const tabs = {};
        tabs[TabActionIds.MY_BRANCHES_TAB] = BranchesMyTab;
        tabs[TabActionIds.ALL_BRANCHES_TAB] = BranchesAllTab;
        tabs[TabActionIds.STALE_BRANCHES_TAB] = BranchesStaleTab;
        tabs[TabActionIds.CommitDiff] = NewHistoryTab;
        tabs[TabActionIds.FileDiff] = BranchesTabsOnDemand.BranchFileDiffTab;

        const tabOptions = {};
        tabOptions[TabActionIds.CommitDiff] = {
            tabName: NewBranchesView._branchCommitDiffTab,
            columns: DefaultColumns.BasicColumnsFileLevel,
            useHistoryCriteriaFromState: true,
            dataOptions: {
                fetchTags: true,
                fetchPullRequests: false,
                fetchGraph: false,
                fetchBuildStatuses: false,
            } as HistoryTabActionsHub_Async.GitHistoryDataOptions,
        };
        this._tabIds = Object.keys(tabs);
        
        BranchStoreFactory.createStaticInstances();

        super.initializeOptions($.extend({
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: ".vc-newbranches-content",
            pivotTabsSelector: ".vc-newbranches-tabs",
            titleElementSelector: ".vc-newbranches-title",
            tabCssClass: "vc-tab",
        }, options));
    }

    initialize() {
        this._performance.addSplitTiming("StartInitialize");
        this._customerIntelligenceData.setView("NewBranchesView");
        this._ciFilterData = this._customerIntelligenceData.clone();

        const $hubPivot = $(".hub-content .hub-pivot");
        this._$historyFilters = $(domElem("span", "vc-history-pivot-filters"))
            .css("display", "none")
            .appendTo($hubPivot);

        if (this._emptyRepository) {
            $('.vc-branch-selector', this._element).children().hide();
        }
        else {
            this._$branchSelectorContainer = $('.vc-branch-selector', this._element);
            this._$branchFilterContainer = $('.vc-newbranches-actions', this._element);
            this._$contentTitle = $('.vc-newbranches-title', this._element);

            // Switch Base and Target Git refs
            const button = $(domElem('div', 'switch-branch-button')).appendTo($('.vc-branch-selector', this._element));
            $(domElem('a', 'bowtie-icon bowtie-switch')).attr({
                href: '#',
                title: BranchResources.SwitchBaseTargetBranches
            }).appendTo(button).click(() => {
                const historySvc = NavigationServices.getHistoryService();
                const state = historySvc.getCurrentState();
                historySvc.addHistoryPoint(null, $.extend(state, {
                    targetVersion: state.baseVersion || '',
                    baseVersion: state.targetVersion
                }));
                return false;
            });

        }

        super.initialize();

        $(".vc-page-title-area").show();
        this._attachEventHandlers();
       
        this._performance.addSplitTiming("EndInitialize");
        this._performance.end();
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {

        if (this._emptyRepository) {
            this._showEmptyRepositoryView();
            this.setHubPivotVisibility(false);
            return;
        }

        action = this._resolveActionString(action);

        const state = {} as INewBranchesState;
        this.setState(state);
        state.repositoryContext = this._repositoryContext;
        state.baseVersion = rawState.baseVersion ? VersionSpecs.VersionSpec.parse(rawState.baseVersion) : new VersionSpecs.GitBranchVersionSpec(this._defaultGitBranchName);
        state.targetVersion = rawState.targetVersion ? VersionSpecs.VersionSpec.parse(rawState.targetVersion) : new VersionSpecs.GitBranchVersionSpec(this._defaultGitBranchName);
        state.version = state.baseVersion.toVersionString();
        state.historySearchCriteria = {
            compareVersion: state.targetVersion.toVersionString()
        };

        this._tabIdBeforeFiltering = (action === TabActionIds.ALL_BRANCHES_TAB) ? TabActionIds.ALL_BRANCHES_TAB : TabActionIds.MY_BRANCHES_TAB;
        Branch.Creators.initialize(this._repositoryContext as GitRepositoryContext, this._tabIdBeforeFiltering === TabActionIds.ALL_BRANCHES_TAB, this.getAggregateState);

        callback(action, state);
    }

    private getAggregateState = (): AggregateState => {
        return {
            defaultBranch: BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).get(),
            compareBranch: BranchStoreFactory.get<ValueStore<CompareBranch>>(StoreIds.COMPARE_BRANCH).get(),
            permissions: this._permissions,
        };
    }

    protected _dispose(): void {
        //Dispose tabs
        this._disposeTabs();

        //Detach Menu
        this._detachEventHandlers();

        //Reset State of all Stores
        BranchStoreFactory.disposeStaticInstances();
        Branch.Creators.dispose();
        super._dispose();
    }

    private _disposeTabs(): void {
        if (this._tabIds) {
            this._tabIds.forEach((tabId: string) => {
                const tab = this.getTab(tabId);
                if (tab) {
                    tab.dispose();
                }
            });
            this._tabIds = null;
        }
    }

    public onNavigate(state: any) {
        /// <summary>Function invoked when a page/hash navigation has occurred</summary>
        /// <param name="state" type="Object">Hash object containing the hash-url parameters</param>

        if (this._emptyRepository) {
            return;
        }

        const action = this._resolveActionString(this.getCurrentAction());
        const tabIsBranchList = this._isMyOrAllOrStaleAction(action);
        let contentTitle: string;
        let windowTitle: string;

        this._$branchFilterContainer.toggle(tabIsBranchList);
        this._$branchSelectorContainer.toggle(!tabIsBranchList);
        this._$historyFilters.toggle(action === TabActionIds.CommitDiff);

        // Set the page/window title based on the context of listing branches or comparing them.
        if (tabIsBranchList) {
            contentTitle = BranchResources.TitleText;
            windowTitle = StringUtils.format(BranchResources.RepositoryBranches, (this._repositoryContext as GitRepositoryContext).getRepository().name);
        }
        else {
            this.renderBranchPickers(state);

            contentTitle = BranchResources.BranchesComparingTitle;
            windowTitle = StringUtils.format(BranchResources.BranchesComparingText,
                $('.vc-branches-container-target .selected-item-text').text(),
                $('.vc-branches-container-base .selected-item-text').text());
        }
        this.setViewTitleContent(windowTitle, contentTitle);
    }

    private renderBranchPickers({ baseVersion, targetVersion }: { baseVersion: VersionSpecs.GitBranchVersionSpec, targetVersion: VersionSpecs.GitBranchVersionSpec }) {
        ReactDom.render(
            <GitRefDropdownSwitch
                repositoryContext={this._repositoryContext as GitRepositoryContext}
                viewMyBranches={this._permissions.viewMyBranches}
                viewTagsPivot={true}
                versionSpec={baseVersion}
                ariaLabelledBy={this._element.find(".vc-branch-selector-text").attr("id")}
                onSelectionChanged={delegate(this, this._onBaseBranchChanged)}
            />,
            this._element.find(".vc-branches-container-base")[0]);

        ReactDom.render(
            <GitRefDropdownSwitch
                repositoryContext={this._repositoryContext as GitRepositoryContext}
                viewMyBranches={this._permissions.viewMyBranches}
                viewTagsPivot={true}
                versionSpec={targetVersion}
                ariaLabelledBy={this._$contentTitle.attr("id")}
                onSelectionChanged={delegate(this, this._onTargetBranchChanged)}
            />,
            this._element.find(".vc-branches-container-target")[0]);
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        /// <summary>
        /// Get the visibility state of the specified tab based on the current tab/navigation state. True to show this tab. False to hide it.
        /// </summary>
        /// <param name="tabId" type="Object">The Id to get the visiblility state for</param>
        /// <param name="currentTabId" type="String">Id of the currently selected tab</param>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>
        /// <returns type="Boolean">True to show the tab. False to hide it.</returns>

        /// If StaleBranches FF is off always return false for that tab
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlStaleBranches, false) 
            && tabId === TabActionIds.STALE_BRANCHES_TAB) {
            return false;
        }

        // If the current user doesn't have permissions to view the mine tab, disable it
        if (!this._permissions.viewMyBranches && tabId === TabActionIds.MY_BRANCHES_TAB) {
            return false;
        }

        if (this._isMyOrAllOrStaleAction(currentTabId) !== this._isMyOrAllOrStaleAction(tabId)) {
            return false;
        }
        return super.getTabVisibility(tabId, currentTabId, rawState, parsedState);
    }

    private _resolveActionString(action: string): string {
        // null and legacy actions will default to the mine tab
        if (!action || action === TabActionIds.Summary) {
            action = TabActionIds.MY_BRANCHES_TAB;
        }

        // if the current user has no permissoons to view my branches, switch to all
        if (action === TabActionIds.MY_BRANCHES_TAB && !this._permissions.viewMyBranches) {
            action = TabActionIds.ALL_BRANCHES_TAB;
        }
        
        return action.toLowerCase();
    }

    private _isMyOrAllOrStaleAction(action: string): boolean {
        return action === TabActionIds.ALL_BRANCHES_TAB || action === TabActionIds.MY_BRANCHES_TAB || action === TabActionIds.STALE_BRANCHES_TAB;
    }

    private _attachEventHandlers() {
        this._createBranchButton = document.querySelector("button.vc-newbranches-create-branch") as HTMLButtonElement;
        if (this._createBranchButton) {
            this._createBranchDelegate = delegate(this, this._createBranch);
            this._createBranchButton.addEventListener("click", this._createBranchDelegate);
        }

        this._filterInput = document.querySelector("input.vc-newbranches-filter") as HTMLInputElement;
        this._filterKeyUpEvent = delegate(this, this._onKeyUp);
        this._filterInput.addEventListener("keyup", this._filterKeyUpEvent);

        this._filterIconSearch = document.querySelector("div.vc-newbranches-actions span.vc-newbranches-filter-icon.bowtie-icon.bowtie-search") as HTMLSpanElement;
        this._filterSearchClickEvent = delegate(this, this._onClickSearchIcon);
        this._filterIconSearch.addEventListener("click", this._filterSearchClickEvent);

        this._filterIconEditRemove = document.querySelector("div.vc-newbranches-actions span.vc-newbranches-filter-icon.bowtie-icon.bowtie-edit-remove") as HTMLSpanElement;
        this._filterClearClickEvent = delegate(this, this._onClickEditRemoveIcon);
        this._filterIconEditRemove.addEventListener("click", this._filterClearClickEvent);

        this._clearFilterButton = document.querySelector("button.clear-filter-button") as HTMLButtonElement;
        this._removeFilterClickEvent = delegate(this, this._onClickClearFilter);
        this._clearFilterButton.addEventListener("click", this._removeFilterClickEvent);

        // Publish telemetry data on clicks within the branch rows.
        this._eventService = VSS_Events.getService();

        this._eventExploreFiles = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_COMPARE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, true);
        };
        this._eventService.attachEvent(BranchRowActions.ExploreFiles, this._eventExploreFiles);

        this._eventViewLastUpdate = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_VIEWLASTUPDATE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, true);
        };
        this._eventService.attachEvent(BranchRowActions.ViewLastUpdate, this._eventViewLastUpdate);

        this._eventNewPullRequest = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_NEWPULLREQUEST, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, true);
        };
        this._eventService.attachEvent(BranchRowActions.NewPullRequest, this._eventNewPullRequest);

        this._eventViewPullRequest = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_VIEWPULLREQUEST, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, true);
        }
        this._eventService.attachEvent(BranchRowActions.ViewPullRequest, this._eventViewPullRequest);

        this._eventBranchAddFavorite = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_BRANCH_ADDFAVORITE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, false);
        };
        this._eventService.attachEvent(BranchRowActions.BranchAddFavorite, this._eventBranchAddFavorite);

        this._eventBranchRemoveFavorite = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_BRANCH_REMOVEFAVORITE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, false);
        };
        this._eventService.attachEvent(BranchRowActions.BranchRemoveFavorite, this._eventBranchRemoveFavorite);

        this._eventFolderAddFavorite = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_FOLDER_ADDFAVORITE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, false);
        };
        this._eventService.attachEvent(BranchRowActions.FolderAddFavorite, this._eventFolderAddFavorite);

        this._eventFolderRemoveFavorite = () => {
            this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_FOLDER_REMOVEFAVORITE, CustomerIntelligenceConstants.ACTIONSOURCE_ROW_ACTION, false);
        };
        this._eventService.attachEvent(BranchRowActions.FolderRemoveFavorite, this._eventFolderRemoveFavorite);

        this._eventMenu = (sender: any, args?: CommandEventArgs) => {
            const command: string = args.get_commandName();
            const commandArgument: any = args.get_commandArgument();
            switch (command) {
                case BranchMenuActions.New: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_NEW, false);
                    Branch.Creators.createNewBranch(commandArgument.branchName, commandArgument.objectId);
                    break;
                }
                case BranchMenuActions.Compare: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_COMPARE, true);
                    window.location.href = getBranchesCompareUrlFragment(
                        GitRefUtility.getRefFriendlyName(commandArgument.compareBranchName),
                        GitRefUtility.getRefFriendlyName(commandArgument.branchName));
                    break;
                }
                case BranchMenuActions.PullRequest: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_NEWPULLREQUEST, true);
                    window.location.href = VersionControlUrls.getCreatePullRequestUrl(BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(), GitRefUtility.getRefFriendlyName(commandArgument.sourceBranchName), GitRefUtility.getRefFriendlyName(commandArgument.targetBranchName));
                    break;
                }
                case BranchMenuActions.SetCompareBranch: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_SETCOMPARE,
                        false,
                        [{ name: CustomerIntelligenceConstants.BRANCHESVIEW_PROPERTY_COMPAREISDEFAULT, value: commandArgument.newCompareBranchIsDefault } as CustomerIntelligenceProperty]);
                    //Determine if new new compare branch is on the Mine page
                    const newCompareBranchName: string = GitRefUtility.getRefFriendlyName(commandArgument.newCompareBranch.name);
                    const newCompareIsMine: boolean = ((getMyBranchNames().filter(r => r === newCompareBranchName).length === 1)
                        && !commandArgument.newCompareBranchIsDefault);
                    //Send all the commit data to compute ahead/behind
                    const metadata: GitCommitRef[] = BranchStoreFactory.get<KeyValue.DictionaryStore<GitCommitRef>>(StoreIds.COMMIT_METADATA).getAll();
                    Branch.Creators.setCompareBranch(commandArgument.newCompareBranch, newCompareIsMine, commandArgument.oldCompareBranch, commandArgument.oldCompareIsMine, commandArgument.oldCompareIsDefault, metadata);
                    break;
                }
                case BranchMenuActions.Add_Favorite: {
                    const favoriteType = commandArgument.type as RefFavoriteType;
                    const addFavorite = (favoriteType === RefFavoriteType.Folder) ? CustomerIntelligenceConstants.BRANCHESVIEW_FOLDER_ADDFAVORITE : CustomerIntelligenceConstants.BRANCHESVIEW_BRANCH_ADDFAVORITE;
                    this._publishCIDataForContextMenu(addFavorite, false);
                    Branch.Creators.addToMyFavorites(commandArgument.name, commandArgument.isCompare, commandArgument.type, getMyBranchNames());
                    break;
                }
                case BranchMenuActions.Remove_Favorite: {
                    const favorite = commandArgument.favorite as GitRefFavorite;
                    const removeFavorite = (favorite.type === RefFavoriteType.Folder) ? CustomerIntelligenceConstants.BRANCHESVIEW_FOLDER_REMOVEFAVORITE : CustomerIntelligenceConstants.BRANCHESVIEW_BRANCH_REMOVEFAVORITE;
                    this._publishCIDataForContextMenu(removeFavorite, false);
                    Branch.Creators.removeFromMyFavorites(commandArgument.favorite, getMyBranchNames());
                    break;
                }
                case BranchMenuActions.Explore: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_EXPLORE, true);
                    window.location.href = VersionControlUrls.getBranchExplorerUrl(BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(), GitRefUtility.getRefFriendlyName(commandArgument.branchName));
                    break;
                }
                case BranchMenuActions.History: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_HISTORY, true);
                    window.location.href = VersionControlUrls.getBranchHistoryUrl(BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(), GitRefUtility.getRefFriendlyName(commandArgument.branchName));
                    break;
                }
                case BranchMenuActions.Delete: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_DELETE, false);
                    commandArgument.delegate(commandArgument.branchName);
                    break;
                }
                case BranchMenuActions.Lock: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_LOCK, false);
                    Branch.Creators.lockBranch(commandArgument.branch);
                    break;
                }
                case BranchMenuActions.Unlock: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_UNLOCK, false);
                    Branch.Creators.unlockBranch(commandArgument.branch);
                    break;
                }
                case BranchMenuActions.BranchSecurity: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_SECURITY, true);
                    Branch.Creators.showBranchSecurityPermissions(commandArgument.branchName, this._projectGuid, this._options.repositoryPermissionSet);
                    break;
                }
                case BranchMenuActions.BranchPolicies: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_POLICIES, true);
                    window.location.href = VersionControlUrls.getBranchPolicyUrl(BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(), GitRefUtility.getRefFriendlyName(commandArgument.branchName));
                    break;
                }
                case BranchMenuActions.RestoreBranch: {
                    this._publishCIDataForContextMenu(CustomerIntelligenceConstants.BRANCHESVIEW_RESTOREBRANCH, true);
                    break;
                }
            }
        }
        this._eventService.attachEvent(BranchRowActions.Menu, this._eventMenu);
    }

    private _detachEventHandlers() {
        if (this._createBranchButton) {
            this._createBranchButton.removeEventListener("click", this._createBranchDelegate);
        }
        this._filterInput.removeEventListener("keyup", this._filterKeyUpEvent);
        this._filterIconSearch.removeEventListener("click", this._filterSearchClickEvent);
        this._filterIconEditRemove.removeEventListener("click", this._filterClearClickEvent);
        this._clearFilterButton.removeEventListener("click", this._removeFilterClickEvent);

        this._eventService.detachEvent(BranchRowActions.ExploreFiles, this._eventExploreFiles);
        this._eventService.detachEvent(BranchRowActions.ViewLastUpdate, this._eventViewLastUpdate);
        this._eventService.detachEvent(BranchRowActions.NewPullRequest, this._eventNewPullRequest);
        this._eventService.detachEvent(BranchRowActions.ViewPullRequest, this._eventViewPullRequest);
        this._eventService.detachEvent(BranchRowActions.BranchAddFavorite, this._eventBranchAddFavorite);
        this._eventService.detachEvent(BranchRowActions.BranchRemoveFavorite, this._eventBranchRemoveFavorite);
        this._eventService.detachEvent(BranchRowActions.FolderAddFavorite, this._eventFolderAddFavorite);
        this._eventService.detachEvent(BranchRowActions.FolderRemoveFavorite, this._eventFolderRemoveFavorite);
        this._eventService.detachEvent(BranchRowActions.Menu, this._eventMenu);
    }

    private _filterBranches(): void {
        this._publishCIDataForFirstFilter();

        const allTree: SmartTree.TreeStore = BranchStoreFactory.get<SmartTree.TreeStore>(StoreIds.ALL_TREE);
        const defaultBranch: GitRef = BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).get();
        const compareBranch: CompareBranch = BranchStoreFactory.get<ValueStore<CompareBranch>>(StoreIds.COMPARE_BRANCH).get();

        /* set styles for filter boxes based on input */
        const value = (this._filterInput.value || "").trim();
        this._filterInput.value = value;
        const hasValue: boolean = !!value;
        const $clearFilterButton: JQuery = $(this._clearFilterButton);
        $clearFilterButton.toggleClass("disabled", !hasValue);
        $clearFilterButton.toggleClass("btn-cta", hasValue);
        $clearFilterButton.toggleClass("bowtie-search-filter", !hasValue);
        $clearFilterButton.toggleClass("bowtie-clear-filter", hasValue);
        $clearFilterButton.attr("aria-disabled", hasValue ? "false" : "true");
        this._toggleClearIconIfNeeded();

        Branch.Creators.filterBranch(value, BranchStoreFactory.get<KeyValue.DictionaryStore<GitRefWithState>>(StoreIds.BRANCHES), BranchStoreFactory.get<SmartTree.TreeStore>(StoreIds.
            FILTER_TREE), allTree, BranchStoreFactory.get<ValueStore<string>>(StoreIds.FILTER).get(), this.getCurrentAction(), defaultBranch, compareBranch ? compareBranch.ref : null);
    }

    private _onClickSearchIcon(): void {
        this._filterBranches();
    }

    private _onClickEditRemoveIcon(): void {
        this._clearFilter();
    }

    private _onClickClearFilter(): void {
        this._clearFilter();
        this._filterBranches();
    }

    private _onFilterChange(): void {
        const filterStoreText: string = BranchStoreFactory.get<ValueStore<string>>(StoreIds.FILTER).get();
        if (!filterStoreText) {
            this._filterInput.value = "";
        }
    }

    private _clearFilter(): void {
        this._filterInput.value = "";
        this._toggleClearIconIfNeeded();
    }

    private _onKeyUp(e: KeyboardEvent): void {
        this._toggleClearIconIfNeeded();
        if (e.keyCode == KeyCode.ESCAPE) {
            this._clearFilter();
        }
        else if (e.keyCode === KeyCode.ENTER) {
            this._filterBranches();
        }
    }

    private _toggleClearIconIfNeeded(): void {
        $(this._filterIconEditRemove).toggleClass("disabled", !this._filterInput.value);
    }

    private _publishCIData(feature: string, actionSource: string, immediate: boolean, properties?: CustomerIntelligenceProperty[]) {
        (this.getTab(this.getCurrentAction()) as BranchesTab).publishCustomerIntelligenceData(feature, actionSource, immediate, properties);
    }

    private _publishCIDataForContextMenu(feature: string, immediate: boolean, properties?: CustomerIntelligenceProperty[]) {
        this._publishCIData(feature, CustomerIntelligenceConstants.ACTIONSOURCE_CONTEXT_MENU, immediate, properties);
    }

    private _publishCIDataForFirstFilter() {
        if (!this._ciFilterData.isPublished()) {
            this._ciFilterData.setTab((this.getTab(this.getCurrentAction()) as BranchesTab).getCustomerIntelligenceTabName());
            this._ciFilterData.publish(CustomerIntelligenceConstants.BRANCHESVIEW_FIRSTFILTER, true, CustomerIntelligenceConstants.ACTIONSOURCE_VIEW_SEARCH_INPUT, false);
        }
    }

    /**
     * Handles the mouse click event and redirects the call
     * @param e
     */
    private _createBranch(e: MouseEvent) {
        this._publishCIData(CustomerIntelligenceConstants.BRANCHESVIEW_NEW, CustomerIntelligenceConstants.ACTIONSOURCE_VIEW_CTA_BUTTON, false);
        e.preventDefault();
        const defaultBranch = BranchStoreFactory.get<DefaultBranchStore>(StoreIds.DEFAULT_BRANCH).get();
        const compareBranch: CompareBranch = BranchStoreFactory.get<ValueStore<CompareBranch>>(StoreIds.COMPARE_BRANCH).get();
        if (compareBranch) {
            Branch.Creators.createNewBranch(compareBranch.ref.name, compareBranch.ref.objectId);
        }
        else if (defaultBranch) {
            Branch.Creators.createNewBranch(defaultBranch.name, defaultBranch.objectId);
        }
        else {
            Branch.Creators.createNewBranch("", "");
        }
    }

    private _onBaseBranchChanged(selectedVersion: VersionSpecs.VersionSpec) {
        if (selectedVersion) {
            this._updateUserDefaultBranchName(selectedVersion);
        }

        const selectedVersionText = selectedVersion ? selectedVersion.toVersionString() : "";

        NavigationServices.getHistoryService().addHistoryPoint(null, { baseVersion: selectedVersionText });
    }

    private _onTargetBranchChanged(selectedVersion: VersionSpecs.VersionSpec) {

        const selectedVersionText = selectedVersion ? selectedVersion.toVersionString() : "";

        NavigationServices.getHistoryService().addHistoryPoint(null, { targetVersion: selectedVersionText });
    }
}

VSS.classExtend(NewBranchesView, TfsContext.ControlExtensions);
Enhancement.registerEnhancement(NewBranchesView, ".vc-newbranches-view");

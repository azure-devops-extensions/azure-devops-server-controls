/// <reference types="react" />

import * as React from "react";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { TwoPanelSelectorComponent, ITwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import { canUseFavorites } from "Favorites/FavoritesService";

import { ScrollToMode } from "OfficeFabric/List";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import { ActiveReleasesFilterBar } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterBar";
import { ActiveDefinitionsStore, IActiveDefinitionsStoreState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsStore";
import { ActiveDefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsActionsCreator";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { MessageBarParentKeyConstants, ActiveDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { FavoritesActionsCreator } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActionsCreator";
import { ReleasesHubServiceDataHelper } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsHubStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsHubStore";
import { PerfTelemetryManager, PerfScenarios } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { ActiveDefinitionsSectionItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsSectionItem";
import { ActiveDefinitionsPanelItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsPanelItem";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { Release, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";
import * as ReleaseEventManager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.ReleaseHub.ConnectionManager";

import { AddToDashboardMessage } from "TFSUI/Dashboards/AddToDashboardMessage";

import * as NavigationService from "VSS/Navigation/Services";
import Utils_Array = require("VSS/Utils/Array");
import * as Utils_String from "VSS/Utils/String";
import { FilterBar } from "VSSUI/FilterBar";
import { TextFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Filter, IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";

export interface IActiveDefinitionsContentProps extends Base.IProps {
    showActiveReleasesFilterBar: boolean;
}

export interface IActiveDefinitionsContentState extends IActiveDefinitionsStoreState {
    selectedDefinition: IActiveDefinitionReference;
}

export class ActiveDefinitionsContent extends Base.Component<IActiveDefinitionsContentProps, IActiveDefinitionsContentState> {

    constructor(props: IActiveDefinitionsContentProps) {
        super(props);
        PerfTelemetryManager.instance.startTTIScenario(PerfScenarios.Mine);
        this._definitionsHubStore = StoreManager.GetStore<DefinitionsHubStore>(DefinitionsHubStore);
        this._activeDefinitionsStore = StoreManager.GetStore<ActiveDefinitionsStore>(ActiveDefinitionsStore);
        this._activeDefinitionsActionsCreator = ActionCreatorManager.GetActionCreator<ActiveDefinitionsActionsCreator>(ActiveDefinitionsActionsCreator);
        this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
        this._favoritesActionCreator = ActionCreatorManager.GetActionCreator<FavoritesActionsCreator>(FavoritesActionsCreator);
        this._definitionsSubscribed = [];
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);

        this._filter = new Filter();
        this._filter.subscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
    }

    public render(): JSX.Element {
        const items = this.state.showSearchResults ? this.state.searchResults : (this.state.activeDefinitions as Item[]).concat(this.state.sections);

        return (
            <div className={"active-definitions-two-panel-component"}>
                <InformationBar parentKey={MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey} cssClass="active-definitions-message-bar" />
                <InformationBar parentKey={MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey} cssClass="active-definitions-message-bar" />
                {this._renderAddToDashboardMessage()}
                {
                    this.state.isLoadingDefinitions &&
                    <Spinner className={"active-definitions-loading-spinner"} key={"Spinner"} size={SpinnerSize.large} label={Resources.Loading} ariaLabel={Resources.Loading} />
                }
                {
                    // This check is crucial to avoid error in getKey() of TwoPanelSelectorComponent on item selection
                    (!this.state.isLoadingDefinitions && (this.state.showSearchResults || items.length > 0))
                    && <TwoPanelSelectorComponent
                        componentRef={(x: ITwoPanelSelectorComponent) => { this._twoPanelSelector = x; }}
                        items={items}
                        defaultItemKey={this._activeDefinitionsStore.getDefaultKey()}
                        leftClassName="active-definitions-left-pane"
                        rightClassName="active-definitions-right-pane"
                        leftHeader={this._getLeftPaneHeader()}
                        rightHeader={this._getRightPaneHeader()}
                        leftPaneARIARegionRoleLabel={Resources.ActiveDefinitionsLeftPaneARIALabel}
                        rightPaneARIARegionRoleLabel={Resources.ActiveDefinitionsRightPaneARIALabel}
                        leftPaneInitialWidth={this._leftPanelInitialWidth}
                        leftPaneMaxWidth={this._leftPanelMaxWidth}
                        collapsedLabel={Resources.ActiveDefinitionsCollapsedLeftPaneLabel}
                        enableToggleButton={true}
                        toggleButtonExpandedTooltip={Resources.ActiveDefinitionsExpandButtonTooltip}
                        toggleButtonCollapsedTooltip={Resources.ActiveDefinitionsCollapseButtonTooltip}
                        isLeftPaneScrollable={true}
                        setFocusOnLastSelectedItem={false} />
                }
            </div>
        );
    }

    public componentWillMount(): void {
        // Clear the messages on tab change
        this._messageHandlerActionCreator.dismissMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey);
        this._messageHandlerActionCreator.dismissMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey);
        this._activeDefinitionsActionsCreator.setAddToDashboardMessageState(null);

        this._activeDefinitionsActionsCreator.fetchActiveDefinitions();
        this._activeReleasesActionCreator.fetchAllTags();

        // Add favorite action from All-Definitions page should not trigger any animation for Active
        this._activeDefinitionsActionsCreator.clearFavoriteInProgressId();

        // Read the url here and set the selectedItemId
        const urlState = NavigationService.getHistoryService().getCurrentState();

        let selectedItemId: number = -1;
        if (urlState.definitionId) {
            selectedItemId = parseInt(urlState.definitionId);
        }
        // If no id is specified in url, then get the id for the rd that was last selected 
        else {
            selectedItemId = this._definitionsHubStore.getSelectedPanelItemId();
        }

        if (selectedItemId > -1) {
            this._activeDefinitionsActionsCreator.setInitialSelectedDefinition(selectedItemId);
        }

        ReleaseSignalRManager.instance().attachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_CREATED, this._releaseCreatedEvent);
        ReleaseSignalRManager.instance().attachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_UPDATED, this._releaseUpdatedEvent);
        ReleaseSignalRManager.instance().attachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_ENVIRONMENT_UPDATED, this._releaseEnvironmentUpdatedEvent);
        ReleaseSignalRManager.instance().attachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_ENVIRONMENT_DEPLOYJOB_STARTED, this._releaseEnvironmentDeployJobStartedEvent);

        this._setState();
    }

    public componentDidMount(): void {
        this._activeDefinitionsStore.addChangedListener(this._onStoreUpdate);
        this._definitionsHubStore.addListener(DefinitionsHubStore.DefinitionSelectionChangedEvent, this._onDefinitionSelectionChanged);
    }

    public componentDidUpdate(prevProps: IActiveDefinitionsContentProps, prevState: IActiveDefinitionsContentState): void {
        // Intent here is to explicitly trigger select item action only when we first land on page,i.e. when prevState has isLoading true and current state has isLoading false
        // so that we can select the definition specified in the url

        if (prevState.isLoadingDefinitions && !this.state.isLoadingDefinitions) {
            this._selectActiveItem(this._activeDefinitionsStore.getCurrentDefinitionPanelItem());
        }

        // When shifting from search results view to regular view, select the RD that was last selected
        if (prevState.showSearchResults && !this.state.showSearchResults) {
            let itemLastSelected = this._activeDefinitionsStore.getItemById(this._definitionsHubStore.getSelectedPanelItemId());
            // If the id returned by DefinitionsHubStore corresponds to a RD which was deleted in search view then select the default item
            if (!itemLastSelected) {
                itemLastSelected = this._activeDefinitionsStore.getCurrentDefinitionPanelItem();
            }
            this._selectActiveItem(itemLastSelected);
        }
    }

    public componentWillUnmount() {
        this._activeDefinitionsStore.removeChangedListener(this._onStoreUpdate);
        this._definitionsHubStore.removeListener(DefinitionsHubStore.DefinitionSelectionChangedEvent, this._onDefinitionSelectionChanged);
        this._filter.unsubscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        ReleaseSignalRManager.instance().detachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_CREATED, this._releaseCreatedEvent);
        ReleaseSignalRManager.instance().detachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_UPDATED, this._releaseUpdatedEvent);
        ReleaseSignalRManager.instance().detachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_ENVIRONMENT_UPDATED, this._releaseEnvironmentUpdatedEvent);
        ReleaseSignalRManager.instance().detachEvent(ReleaseEventManager.ReleaseHubEvents.ACTIVEDEFINITIONS_RELEASE_ENVIRONMENT_DEPLOYJOB_STARTED, this._releaseEnvironmentDeployJobStartedEvent);
        this._unsubscribeFromDefinitionsReleases();
        // Do not kill signalr connection here by calling into ReleaseSignalRManager.dispose()
        // When switching from Active to All, the componentWillMount of All gets called first
        // followed by componentWillUnmount of Active. So killing SignalR connection in 
        // componentUnMount of Active will mean that any signalR connection needed in All page (hypothetically)
        // would be terminated. 
    }

    private _onStoreUpdate = () => {
        this._setState();
        this._subscribeToDefinitionReleases();
    }

    /** Renders a message bar indicating success/failure of add to dashboard operation after it is performed */
    private _renderAddToDashboardMessage(): JSX.Element {
        return this.state.addToDashboardState &&
            <AddToDashboardMessage
                cssClass={"active-definitions-dashboard-message"}
                dashboardName={this.state.addToDashboardState.dashboardName}
                groupId={this.state.addToDashboardState.groupId}
                dashboardId={this.state.addToDashboardState.dashboardId}
                currentDashboardId={"-1"} // currentDashboardId has no context for Releases hub
                widgetName={this.state.addToDashboardState.widgetName}
                messageBarType={this.state.addToDashboardState.messageType}
                onDismiss={() => { this._activeDefinitionsActionsCreator.setAddToDashboardMessageState(null); }}
            />;
    }

    private _selectActiveItem(data: Item): void {
        // TODO : Introducing this as a temporary work around to get it out in M131.
        // Make Two Panel Selector take a set of items, which form a part of the selectable list.
        // So that it doesn't compare the default key only against its rendered items
        const itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
        setTimeout(() => {
            itemSelectorActions.clearSelection.invoke({});
            itemSelectorActions.selectItem.invoke({
                data: data
            });
            this._scrollToSelectedIndex();
        }, 10);
    }

    private _scrollToSelectedIndex(): void {
        // Get the selected item index from the Mine section and scroll it into view
        let selectedItemIndex = this._activeDefinitionsStore.getMineSectionSelectedItemIndex();
        if (selectedItemIndex >= 0 && this._twoPanelSelector) {
            // Get the leftPanelList from twoPanel
            const mineSectionlList = this._twoPanelSelector.getLeftPanelListReferenceComponent();
            if (mineSectionlList) {
                mineSectionlList.scrollToIndex(selectedItemIndex, this._measureLeftPanelItem, ScrollToMode.center);
            }
        }
        // If the selected item is not in Mine section, then look in the Recent section
        else {
            selectedItemIndex = this._activeDefinitionsStore.getRecentSectionSelectedItemIndex();
            if (this.state.sections && this.state.sections.length > 0 && selectedItemIndex >= 0) {
                // First scroll to the last item of twoPanel(which is nothing but the whole of the recent section)
                if (this._twoPanelSelector) {
                    const mineSectionlList = this._twoPanelSelector.getLeftPanelListReferenceComponent();
                    if (mineSectionlList) {
                        mineSectionlList.scrollToIndex(this.state.activeDefinitions.length, this._measureLeftPanelItem, ScrollToMode.center);
                    }
                }
                // Second, get the list in the Recent section and scroll to selected item within this list
                const recentSectionList = this.state.sections[0].getScrollableList();
                if (recentSectionList) {
                    recentSectionList.scrollToIndex(selectedItemIndex, this._measureLeftPanelItem, ScrollToMode.center);
                }
            }
        }
    }

    private _onDefinitionSelectionChanged = (sender: any) => {
        // Clear releases filter on definition selection change
        let filterState = this._filter.getState();
        filterState["nameFilterKey"] = { value: "" };
        filterState["statusFilterKey"] = { value: [] };
        filterState["branchFilterKey"] = { value: null };
        filterState["tagFilterKey"] = { value: "" };
        filterState["createdByFilterKey"] = { value: "" };
        this._filter.setState(filterState, true);

        this._executeIfDefinitionIsNotNull(this.state.selectedDefinition, d => this._unsubscribeRecentDefinitionFromLiveliness(d.id));

        let selectedDefinition = this._definitionsHubStore.getHubStoreState().selectedDefinition;
        this.setState({
            selectedDefinition: selectedDefinition
        });

        this._executeIfDefinitionIsNotNull(selectedDefinition, d => this._subscribeDefinitionForLiveliness(d.id));
    }

    private _executeIfDefinitionIsNotNull(definition: IActiveDefinitionReference, executeFunction: (definition: IActiveDefinitionReference) => void) {
        if (!!definition) {
            executeFunction(definition);
        }
    }

    private _setState = () => {
        let state = { selectedDefinition: this._definitionsHubStore.getHubStoreState().selectedDefinition, ...this._activeDefinitionsStore.getState() };
        this.setState(state);
    }

    private _getRightPaneHeader(): JSX.Element {
        let selectedDefinition = this.state.selectedDefinition;
        if (!selectedDefinition) {
            return null;
        }

        return <ActiveReleasesFilterBar
            instanceId={this._filterBarInstanceId}
            key={selectedDefinition.id}
            isVisible={this.props.showActiveReleasesFilterBar} />;
    }

    private _getLeftPaneHeader(): JSX.Element {
        // Putting a temporary check on favorties permissions
        // TODO -  Use a new permission for this.
        const showMineHeader = !this.state.showSearchResults && canUseFavorites(); // User should be logged in, and we shouldn't be showing search results

        const resourcePath = ReleasesHubServiceDataHelper.getResourcePath();

        return (
            <div className={"active-rds-left-pane-header"}>
                <div className={"active-rds-search"}>
                    <span className={"search-icon bowtie-icon bowtie-search"} />
                    <FilterBar
                        filter={this._filter}
                        className={"active-rds-left-pane-filter-bar"}>
                        <TextFilterBarItem
                            filterItemKey={ActiveDefinitionsContentKeys.ActiveDefinitionsSearchKey}
                            placeholder={Resources.ActiveDefinitionsFilterBarItemPlaceholderText}
                            throttleWait={500} />
                    </FilterBar>
                </div >
                {
                    showMineHeader
                    && this.state.activeDefinitions.length === 0
                    && (
                        <MessageBarComponent
                            className={"no-favorites-message"}
                            messageBarType={MessageBarType.info}
                        >
                            {Resources.ActiveTabNoFavoritesText}
                        </MessageBarComponent>
                    )
                }
                {
                    this.state.showSearchResults && this.state.searchResultsLoading &&
                    <Spinner className={"all-definitions-loading-spinner"} key={"Spinner"} size={SpinnerSize.large} label={Resources.Searching} ariaLabel={Resources.Searching} />
                }
                {
                    this.state.showSearchResults && this.state.searchResults.length === 0 && !this.state.searchResultsLoading &&
                    <div className={"no-results-container"}>
                        <MessageBarComponent
                            className={"no-definitions-found-message"}
                            messageBarType={MessageBarType.info}
                        >
                            {Resources.NoDefinitionsMatchYourFilterText}
                        </MessageBarComponent>
                    </div>
                }
            </div>
        );
    }

    private _onSearchTextChanged = (filterState: IFilterState): void => {
        if (filterState && filterState[ActiveDefinitionsContentKeys.ActiveDefinitionsSearchKey]) {
            const curentSearchText: string = filterState[ActiveDefinitionsContentKeys.ActiveDefinitionsSearchKey].value;
            // This gets called for every render, resulting in slow search performance, we want to limit the search calls to only those cases where search text has changed
            if (!Utils_String.equals(curentSearchText, this._lastSearchedText)) {
                this._lastSearchedText = curentSearchText;
                this._activeDefinitionsActionsCreator.searchReleaseDefinitions(curentSearchText, this._activeDefinitionsStore.getSelectDefinitionPanelItem());
            }
        }
    }

    private _releaseCreatedEvent = (sender: any, release: Release): void => {
        if (this.state.selectedDefinition.id === release.releaseDefinition.id) {
            this._activeReleasesActionCreator.onCreateRelease(release);
        }
    }

    private _releaseUpdatedEvent = (sender: any, release: Release): void => {
        if (this.state.selectedDefinition.id === release.releaseDefinition.id) {
            this._activeReleasesActionCreator.updateRelease(release, null);
        }
    }

    private _releaseEnvironmentDeployJobStartedEvent = (sender: any, releaseEnvironment: ReleaseEnvironment): void => {
        if (this.state.selectedDefinition.id === releaseEnvironment.releaseDefinition.id) {
            this._activeReleasesActionCreator.updateReleaseEnvironment(releaseEnvironment);
        }
        this._activeDefinitionsActionsCreator.environmentLastDeploymentUpdated(releaseEnvironment);
    }

    private _releaseEnvironmentUpdatedEvent = (sender: any, releaseEnvironment: ReleaseEnvironment): void => {
        if (this.state.selectedDefinition.id === releaseEnvironment.releaseDefinition.id) {
            this._activeReleasesActionCreator.updateReleaseEnvironment(releaseEnvironment);
        }
        this._activeDefinitionsActionsCreator.releaseEnvironmentUpdated(releaseEnvironment);
    }

    private _subscribeToDefinitionReleases() {
        if (FeatureAvailabilityService.isFeatureEnabled(ActiveDefinitionsContent._definitionReleasesSignalRFeatureFlag, false)) {
            let newDefinitions = [];
            this.state.activeDefinitions.forEach((definition: ActiveDefinitionsPanelItem) => {
                let definitionId = definition.getDefinition().id;
                if (!Utils_Array.contains(this._definitionsSubscribed, definitionId)) {
                    newDefinitions.push(definitionId);
                }
            });

            if (newDefinitions.length > 0) {
                ReleaseSignalRManager.instance().subscribeToDefinitionsReleases(newDefinitions);
                this._definitionsSubscribed = this._definitionsSubscribed.concat(newDefinitions);
            }
        }
    }

    private _subscribeDefinitionForLiveliness(definitionId: number) {
        if (FeatureAvailabilityService.isFeatureEnabled(ActiveDefinitionsContent._definitionReleasesSignalRFeatureFlag, false)) {
            if (!this._definitionsSubscribed.find(id => definitionId === id)) {
                ReleaseSignalRManager.instance().subscribeToDefinitionsReleases([definitionId]);
                this._definitionsSubscribed = this._definitionsSubscribed.concat([definitionId]);
            }
        }
    }

    private _unsubscribeFromDefinitionsReleases() {
        if (FeatureAvailabilityService.isFeatureEnabled(ActiveDefinitionsContent._definitionReleasesSignalRFeatureFlag, false)) {
            ReleaseSignalRManager.instance().unsubscribeFromDefinitionsReleases(this._definitionsSubscribed);
            this._definitionsSubscribed = [];
        }
    }

    private _unsubscribeRecentDefinitionFromLiveliness(definitionId: number) {
        let index = this._definitionsSubscribed.indexOf(definitionId);
        if (index > -1 && this._isRecentDefinition(definitionId) && FeatureAvailabilityService.isFeatureEnabled(ActiveDefinitionsContent._definitionReleasesSignalRFeatureFlag, false)) {
            ReleaseSignalRManager.instance().unsubscribeFromDefinitionsReleases([definitionId]);
            this._definitionsSubscribed.splice(index, 1);
        }
    }

    private _isRecentDefinition(definitionId: number): boolean {
        return !!this.state.sections.find(recentSection => 
                                            !!(recentSection as ActiveDefinitionsSectionItem).getChildItems().find(recentDefinitionItem =>
                                                    (recentDefinitionItem as ActiveDefinitionsPanelItem).getDefinition().id === definitionId));
    }

    private _measureLeftPanelItem = (itemIndex: number): number => {
        // Returning the panel item height to enable proper scrolling according to screen size.
        // In absence of this parameter, the List assumes a default item count for the page as 10
        return this._defaultLeftPanelItemHeight;
    }

    private _leftPanelInitialWidth: string = "360px";
    private _leftPanelMaxWidth: string = "600px";
    private _defaultLeftPanelItemHeight: number = 70;
    private _definitionsHubStore: DefinitionsHubStore;
    private _activeDefinitionsStore: ActiveDefinitionsStore;
    private _activeDefinitionsActionsCreator: ActiveDefinitionsActionsCreator;
    private _activeReleasesActionCreator: ActiveReleasesActionCreator;
    private _favoritesActionCreator: FavoritesActionsCreator;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _twoPanelSelector: ITwoPanelSelectorComponent;
    private _filter: Filter;
    private _lastSearchedText: string = Utils_String.empty;
    private _definitionsSubscribed: number[];

    private readonly _filterBarInstanceId: string = "active-releases-filter-bar";
    private static _definitionReleasesSignalRFeatureFlag: string = "WebAccess.ReleaseManagement.DefinitionReleasesSignalR";
}

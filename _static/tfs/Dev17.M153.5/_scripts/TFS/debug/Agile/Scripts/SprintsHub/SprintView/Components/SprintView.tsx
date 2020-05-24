import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile";
import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/SprintMarker/SprintMarker";
import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintView/Components/SprintView";
import { Notifications } from "Admin/Scripts/TFS.Admin";
import { BacklogPaneIds } from "Agile/Scripts/BacklogsHub/BacklogPivot/BacklogPivotContracts";
import { AgileContext } from "Agile/Scripts/Common/Agile";
import { HubError, IHubErrorProps } from "Agile/Scripts/Common/Components/AgileHubError";
import { SprintBurndownChartComponent } from "Agile/Scripts/Common/Components/ChartControls";
import { DelayTTIComponent } from "Agile/Scripts/Common/Components/DelayTTIComponent";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { SprintPickerCallout } from "Agile/Scripts/Common/Components/SprintMarker/SprintPickerCallout";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { getHubDisplayName } from "Agile/Scripts/Common/HubContributionUtils";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BacklogsUrls, SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { PivotItemProvider } from "Agile/Scripts/Common/PivotItemProvider";
import {
    AgileRouteParameters,
    BacklogsHubConstants,
    FavoriteConstants,
    SprintsHubConstants,
    SprintsHubRoutingConstants
} from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { SprintsNavigationSettingsService } from "Agile/Scripts/SprintsHub/Common/SprintsNavigationSettingsService";
import * as SprintEditorPane_NO_REQUIRE from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorPane";
import { SprintsContentViewState } from "Agile/Scripts/SprintsHub/SprintsHubViewState";
import { SprintsViewActionsCreator } from "Agile/Scripts/SprintsHub/SprintView/ActionsCreator/SprintsViewActionsCreator";
import { SprintViewCommonViewActions, SprintPickerViewActionClassName } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewCommonViewActions";
import { ISprintViewState, SprintViewSelectors } from "Agile/Scripts/SprintsHub/SprintView/Selectors/SprintViewSelectors";
import { ISprintViewActionContext, ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";
import { SprintsViewStore } from "Agile/Scripts/SprintsHub/SprintView/Store/SprintsViewStore";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import { ArtifactScope, Favorite } from "Favorites/Contracts";
import { ArtifactPickerProvider, IArtifactPickerProviderOptions } from "Favorites/Controls/ArtifactPickerProvider";
import { FavoriteItemPicker } from "Favorites/Controls/FavoriteItemPicker";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { DateRange } from "TFS/Work/Contracts";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getDefaultWebContext } from "VSS/Context";
import { showConfirmNavigationDialog } from "VSS/Controls/Dialogs";
import { ObservableArray } from "VSS/Core/Observable";
import { getRunningDocumentsTable } from "VSS/Events/Document";
import * as Event_Service from "VSS/Events/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { Component, Props } from "VSS/Flux/Component";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import { getService } from "VSS/Service";
import { delay } from "VSS/Utils/Core";
import { normalizePath } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { Hub, IHub, IHubProps } from "VSSUI/Hub";
import { HubHeader, HubTileRegion } from "VSSUI/HubHeader";
import { IPivotBarAction, IPivotBarViewAction, IVssPivotBarItemProvider, PivotBarFocusItem } from "VSSUI/PivotBar";
import { IUserAction } from "VSSUI/Utilities/IUserAction";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { ITeamSource } from "Agile/Scripts/Sources/TeamSource";
import { IPickListGroup } from "VSSUI/PickList";

const MINE_GROUP = "MINE";

export interface ISprintViewProps extends Props {
    sprintId: string;
    selectedPivot: string;
    store: SprintsViewStore;
    actionsCreator: SprintsViewActionsCreator;
    teamSource: ITeamSource;
}

export class SprintView extends Component<ISprintViewProps, ISprintViewState> {
    private _pivots: IVssPivotBarItemProvider;
    // Flag to indicate if data providers should be fetched asynchronously
    private _shouldReloadDataProviders: boolean = false;
    private _thirdPartyPivots: ContributablePivotItemProvider<{
        iterationId: string;
        foregroundInstance: boolean;
        team: {
            id: string;
            name: string;
        };
    }>;

    private _artifactPickerProvider: ArtifactPickerProvider<Team>;
    private _sprintPickerCalloutTarget: HTMLElement;
    private _pivotCommands: ObservableArray<IPivotBarAction> = new ObservableArray();
    private _pivotViewActions: ObservableArray<IPivotBarViewAction> = new ObservableArray();
    private _favoritesPicker: FavoriteItemPicker;
    private _shortcuts: AgileHubShortcutGroup;
    private _searchTelemetryPublished: boolean;
    private _iterationPickerLearningBubble = React.createRef<LearningBubble>();

    private _hubRef: IHub;

    protected _hubViewState: SprintsContentViewState;

    constructor(props: ISprintViewProps) {
        super(props);
        this._hubViewState = new SprintsContentViewState(this.props.selectedPivot);
        this.state = SprintViewSelectors.getSprintViewState(this.props.store);
    }

    public componentWillMount() {
        // Create Observable URLS
        this._hubViewState.createObservableUrl({
            [AgileRouteParameters.Pivot]: SprintsHubRoutingConstants.SprintBacklogPivot
        });

        this._hubViewState.createObservableUrl({
            [AgileRouteParameters.Pivot]: SprintsHubRoutingConstants.CapacityPivot
        });

        this._hubViewState.createObservableUrl({
            [AgileRouteParameters.Pivot]: SprintsHubRoutingConstants.TaskboardPivot
        });

        // Listen to iteration update event from iteration edit dialog
        Event_Service.getService().attachEvent(Notifications.CLASSIFICATION_CHANGED, this._onClassificationUpdated);

        this.props.store.addChangedListener(this._onStoreChanged);

        this._pivots = new PivotItemProvider(
            "ms.vss-work-web.sprints-hub:content:pivots",
            this._getPivotContext,
            {
                hubViewState: this._hubViewState,
                routeValueKey: AgileRouteParameters.Pivot,
                actionContext: this._getViewActionContext
            });

        this._thirdPartyPivots = new ContributablePivotItemProvider(
            ["ms.vss-work-web.iteration-backlog-tabs"],
            this._getContributedPivotContext);

        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        // Set currentPivot on navigation service
        const svc = getService(SprintsNavigationSettingsService);
        svc.contentPivot = this._hubViewState.selectedPivot.value;

        // Initialize the data provider
        this.props.actionsCreator.initializeHeaderData();

        this._shortcuts = new AgileHubShortcutGroup(this._hubViewState.viewOptions);
    }

    public componentDidMount() {
        this._setDocumentTitle();
        this._initializeArtifactPicker();

        // Future renders of this component will be XHR navigation events, so we need to reload data providers at that time
        this._shouldReloadDataProviders = true;

        if (this._iterationPickerLearningBubble.current) {
            this._iterationPickerLearningBubble.current.showIfNeededAfterDelay();
        }
    }

    public componentDidUpdate(prevProps: ISprintViewProps, prevState: ISprintViewState) {
        if (this.state.team && (!prevState.team || this.state.team.name !== prevState.team.name || this.state.selectedIteration !== prevState.selectedIteration)) {
            this._setDocumentTitle();
        }

        this._initializeArtifactPicker();
    }

    public componentWillUnmount() {
        if (this.props.store) {
            this.props.store.removeChangedListener(this._onStoreChanged);
        }

        if (this._hubViewState) {

            if (this._hubViewState.viewOptions) {
                this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
            }

            this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
            this._hubViewState.dispose();
            this._hubViewState = null;
        }

        if (this._favoritesPicker) {
            this._favoritesPicker.dispose();
            this._favoritesPicker = null;
        }

        if (this._shortcuts) {
            this._shortcuts.removeShortcutGroup();
            this._shortcuts = null;
        }

        Event_Service.getService().detachEvent(Notifications.CLASSIFICATION_CHANGED, this._onClassificationUpdated);
        getService<AgileContext>(AgileContext).setContext(null);

        if (this._iterationPickerLearningBubble.current) {
            this._iterationPickerLearningBubble.current.cancelDelayedShow();
        }
    }

    public render(): JSX.Element {
        const { exceptionInfo, status } = this.state;

        if (status === LoadingStatus.Loading) {
            return <LoadingComponent />;
        }

        if (status === LoadingStatus.ErrorLoadingData) {
            const props: IHubErrorProps = {
                exceptionsInfo: [exceptionInfo]
            };

            document.title = getDefaultPageTitle(`${getHubDisplayName()} - ${exceptionInfo.exceptionMessage}`)
            return <HubError {...props} />;
        }

        const hubProps: IHubProps = {
            hubViewState: this._hubViewState,
            componentRef: this._resolveHubElement,
            pivotProviders: [this._pivots, this._thirdPartyPivots],
            commands: this._pivotCommands,
            viewActions: this._pivotViewActions,
            onPivotBarRenderComplete: this._onPivotBarRenderComplete
        };

        return (
            <Hub
                {...hubProps}
            >
                {this._renderHubHeader(this._getSprintIcon())}
                {this._renderHubTileRegion()}
                {this._renderSprintEditorPane()}
                {this._renderSprintPickerCallout()}
                {this._renderIterationPickerLearningBubble()}
            </Hub>
        );
    }

    private _onPivotBarRenderComplete = () => {
        // For the contributed pivots show the Sprint picker
        const iterationName = this.state.selectedIteration.name
        switch (this._hubViewState.selectedPivot.value) {
            case SprintsHubRoutingConstants.CapacityPivot:
            case SprintsHubRoutingConstants.SprintBacklogPivot:
            case SprintsHubRoutingConstants.TaskboardPivot:
                break;
            default:
                this._pivotViewActions.value = SprintViewCommonViewActions.getSprintPickerViewActions(iterationName, this._onSprintPickerClicked);
        }
    }

    private _renderSprintEditorPane(): JSX.Element {
        const {
            isSprintEditorPaneOpen,
            team
        } = this.state;

        if (isSprintEditorPaneOpen) {
            const asyncNewSprint: (props: any) => JSX.Element = getAsyncLoadedComponent(["Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorPane"], (m: typeof SprintEditorPane_NO_REQUIRE) => m.SprintEditorPane);
            const newSprintProps = {
                onDismiss: this._onSprintEditorPaneDismissed,
                onCompleted: this._onSprintEditorPaneCompleted,
                currentTeam: new Team({ id: team.id, name: team.name }),
                hideTeamSelection: true
            };

            return React.createElement(asyncNewSprint, newSprintProps);
        }

        return null;
    }

    private _renderSprintPickerCallout(): JSX.Element {
        const {
            isSprintPickerCalloutOpen,
            teamIterations,
            selectedIteration
        } = this.state;

        if (isSprintPickerCalloutOpen) {
            return (
                <SprintPickerCallout
                    teamIterations={teamIterations}
                    selectedIteration={selectedIteration}
                    calloutTarget={this._sprintPickerCalloutTarget}
                    onIterationChanged={this._onSprintPickerIterationChanged}
                    onNewSprint={this._onNewSprint}
                    onDismiss={this._onSprintPickerDismissed}
                />
            );
        }

        return null;
    }

    private _renderIterationPickerLearningBubble(): JSX.Element {
        return (
            <LearningBubble
                ref={this._iterationPickerLearningBubble}
                settingsKey={LearningBubbleSettingsKeys.Iterations}
                target={`.${SprintPickerViewActionClassName}`}
                text={SprintsHubResources.IterationPickerLearningBubbleText}
                buttonLabel={PresentationResources.LearningBubbleButtonLabel} />
        );
    }

    private _renderHubHeader(sprintIcon: IVssIconProps): JSX.Element {
        const {
            team
        } = this.state;

        const webContext = getDefaultWebContext();
        const teamPanelIcon = <TeamPanelIconButton
            projectName={webContext.project.name}
            projectId={webContext.project.id}
            teamId={this.state.team.id}
            teamName={this.state.team.name}
        />;

        return (
            <HubHeader
                title={`${team.name}`}
                iconProps={sprintIcon}
                headerItemPicker={this._artifactPickerProvider}
                pickListClassName="sprints-hub-content-pick-list"
                pickListMinWidth={400}
            >
                {teamPanelIcon}
            </HubHeader>
        );
    }

    private _initializeArtifactPicker(): void {
        const {
            team
        } = this.state;

        if (team && team.id && team.name && !this._artifactPickerProvider) {
            const sprintArtifact = new Team({ id: team.id, name: team.name });
            const props: IArtifactPickerProviderOptions<Team> = {
                favoritesContext: {
                    artifactTypes: [FavoriteTypes.WORK_ITERATION],
                    artifactScope: this._getArtifactScope()
                },
                selectedArtifact: sprintArtifact,
                artifactComparer: (item1, item2) => Utils_String.localeIgnoreCaseComparer(item1.name, item2.name),
                searchNoResultsText: SprintsHubResources.SearchNoResultsText,
                searchTextPlaceholder: SprintsHubResources.SearchTextPlaceholder,
                loadingText: SprintsHubResources.LoadingSprints,
                browseAllText: SprintsHubResources.BrowseAllSprints,
                searchResultsLoadingText: SprintsHubResources.SearchResultsLoading,
                onBrowseAllClick: this._onBrowseAllClicked,
                getArtifacts: () => this.props.actionsCreator.getPickListData(),
                getArtifactId: (team) => team.id,
                getArtifactName: (team) => team.name,
                getArtifactFromFavorite: (favoriteItem) => new Team({ id: favoriteItem.artifactId, name: favoriteItem.artifactProperties[FavoriteConstants.TeamName] }),
                getFavoriteFromArtifact: this._getFavoriteFromArtifact,
                getArtifactIcon: () => this._getSprintIcon(),
                getArtifactHref: this._getArtifactHref,
                getSearchResults: (searchText) => {
                    // All data is local and already loaded in the control, so no need to do any remote search
                    // If returning [], the picker provider will filter the existing teams
                    if (!this._searchTelemetryPublished) {
                        SprintsHubTelemetryHelper.publishTelemetry(SprintViewUsageTelemetryConstants.SEARCH_TEAM, {});
                        this._searchTelemetryPublished = true;
                    }
                    return [];
                },
                favoriteGroupHeader: SprintsHubResources.FavoriteGroupHeader,
                groups: this.getGroups(),
                onArtifactClicked: (artifact) => {
                    if (!getDefaultWebContext().team) {
                        const url = this._getArtifactHref(artifact);
                        SprintsUrls.navigateToSprintsHubUrl(url);

                        // Prevent default navigation
                        return true;
                    }

                    if (Utils_String.equals(artifact.id, sprintArtifact.id, true /* Ignore case */)) {
                        // Return true to prevent navigation
                        return true;
                    }
                },
                getArtifactListGroupId: () => {
                    return MINE_GROUP;
                }
            };

            this._artifactPickerProvider = new ArtifactPickerProvider(props);
            // Re-render the component
            this.forceUpdate();
        }
    }

    private getGroups(): IPickListGroup[] {
        let groups: IPickListGroup[] = [{
            key: MINE_GROUP,
            name: SprintsHubResources.MyTeamGroupHeader
        }];

        return groups;
    }

    private _onBrowseAllClicked = () => {
        SprintsHubTelemetryHelper.publishTelemetry(SprintViewUsageTelemetryConstants.NAVIGATE_TO_DIRECTORY, {}, /*immediate*/ true);

        const url = SprintsUrls.getSprintDirectoryUrl();
        delay(this, 0, () => SprintsUrls.navigateToSprintsHubUrl(url));
    }

    private _onClassificationUpdated = (sender: any, updatedIterationPath: string): void => {
        // Note: As defined in sprintDates control, "CLASSIFICATION_UPDATED" is raised whenever something about iteration is changed
        // Check if path and/or dates were updated and handle accordingly
        const {
            selectedIteration
        } = this.state;

        const normalizedUpdatedPath = normalizePath(updatedIterationPath);

        const hasIterationPathChanged = !Utils_String.equals(selectedIteration.normalizedIterationPath, updatedIterationPath, /* ignore case */ true);

        if (hasIterationPathChanged) {
            // If iteration path got updated, handle this action similar to changeIteration
            this.props.actionsCreator.clearNodeCache();
            this._changeIteration(normalizedUpdatedPath);
        }

        this.props.actionsCreator.reloadHeaderData();
    }

    private _onNewSprint = (): void => {
        this.props.actionsCreator.closeSprintPickerCallout();
        this.props.actionsCreator.openSprintEditorPane();
    }

    protected _onPlanSprintClicked = (event: React.MouseEvent<HTMLElement>): void => {
        const {
            team
        } = this.state;

        SprintsHubTelemetryHelper.publishTelemetry(SprintViewUsageTelemetryConstants.PLAN_SPRINT, {}, /*immediate*/ true);

        const requirementBacklogLevel = BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.name;
        const targetUrl = BacklogsUrls.getBacklogContentUrlWithRightPaneOption(
            team.name,
            BacklogsHubConstants.BacklogPivot,
            requirementBacklogLevel,
            BacklogPaneIds.Planning);

        //  Delay avoids violating React invariant: "React DOM tree root should always have a node reference."
        delay(null, 0, () => BacklogsUrls.navigateToBacklogsHubUrl(targetUrl));
    }

    private _onSprintEditorPaneDismissed = (): void => {
        const {
            actionsCreator
        } = this.props;

        actionsCreator.closeSprintEditorPane();
    }

    private _onSprintEditorPaneCompleted = (team: Team, iteration: Iteration): void => {
        this._onSprintEditorPaneDismissed();
        SprintsUrls.navigateToSprintsHubUrl(SprintsUrls.getExternalSprintContentUrl(team.name, iteration.normalizedIterationPath));
    }

    private _onPivotChanged = (newPivotKey: string) => {
        if (this._firstPartyContributedPivot(newPivotKey)) {
            // Start Pivot switch perf telemetry scenario
            const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);

            if (telemetryHelper.isActive()) {
                telemetryHelper.abort();
            }
            telemetryHelper.startTabSwitch(SprintsHubConstants.HUB_NAME, newPivotKey);

            // Set currentPivot on navigation service
            const svc = getService(SprintsNavigationSettingsService);
            svc.contentPivot = this._hubViewState.selectedPivot.value;
            this._setDocumentTitle();
        }
    }

    private _onStoreChanged = () => {
        const {
            selectedIteration
        } = this.state;

        const newState = SprintViewSelectors.getSprintViewState(this.props.store);
        if ((!selectedIteration) && newState.selectedIteration) {
            // Update the URL to make sure we do not have a GUID in the path
            // This can happen when clicking a favorite item from the breadcrumb
            // This will only happen on initial calls
            const webContext = getDefaultWebContext();

            this._hubViewState.viewOptions.setViewOptions({
                [AgileRouteParameters.Team]: webContext.team && newState.team.name,
                [AgileRouteParameters.Iteration]: newState.selectedIteration.normalizedIterationPath,
                [AgileRouteParameters.TeamName]: newState.team.name
            }, /*surpressChangeEvent*/ true);
        }

        this.setState(newState);
    }

    protected _onViewOptionsChanged = (value: IViewOptionsValues, action?: string) => {
        if (value.hasOwnProperty(AgileRouteParameters.Iteration)) {
            const {
                selectedIteration
            } = SprintViewSelectors.getSprintViewState(this.props.store);

            if (!selectedIteration ||
                (
                    !Utils_String.equals(normalizePath(value[AgileRouteParameters.Iteration]), selectedIteration.normalizedIterationPath, /* ignoreCase*/ true) &&
                    !Utils_String.equals(value[AgileRouteParameters.Iteration], selectedIteration.id, /* ignoreCase*/ true)
                )) {
                this.props.actionsCreator.reloadHeaderData();
            }
        }
    }

    protected _openSettings = () => {
        this.props.actionsCreator.openSettings();
    }

    protected _renderHubTileRegion = (): JSX.Element => {
        const {
            selectedIteration,
            teamDaysOff,
            teamWeekends,
            team
        } = this.state;

        return (
            <HubTileRegion>
                <DelayTTIComponent>
                    {() =>
                        <SprintBurndownChartComponent
                            iteration={selectedIteration}
                            teamDaysOff={teamDaysOff}
                            teamWeekends={teamWeekends}
                            teamId={team.id}
                        />
                    }
                </DelayTTIComponent>
            </HubTileRegion>
        );
    }

    private _onSprintPickerClicked = (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, action?: IUserAction) => {
        this._sprintPickerCalloutTarget = ev.currentTarget;
        this.props.actionsCreator.openSprintPickerCallout();
    }

    private _onSprintPickerIterationChanged = (iteration: Iteration) => {
        this.props.actionsCreator.closeSprintPickerCallout();
        this._changeIteration(iteration.normalizedIterationPath);
    }

    private _onSprintPickerDismissed = () => {
        this.props.actionsCreator.closeSprintPickerCallout();
    }

    private _getFavoriteFromArtifact = (sprintArtifact: Team): Favorite => {
        return {
            artifactId: sprintArtifact.id,
            artifactName: sprintArtifact.name,
            artifactType: FavoriteTypes.WORK_ITERATION,
            artifactScope: this._getArtifactScope(),
            artifactProperties: {
                [FavoriteConstants.TeamName]: sprintArtifact.name
            },
            artifactIsDeleted: false,
            creationDate: undefined,
            id: undefined,
            owner: undefined,
            url: undefined,
            _links: undefined
        };
    }

    private _firstPartyContributedPivot(pivotKey: string): boolean {
        return (Utils_String.equals(pivotKey, SprintsHubRoutingConstants.TaskboardPivot, /*ignoreCase*/ true)
            || Utils_String.equals(pivotKey, SprintsHubRoutingConstants.SprintBacklogPivot, /*ignoreCase*/ true)
            || Utils_String.equals(pivotKey, SprintsHubRoutingConstants.CapacityPivot, /*ignoreCase*/ true));
    }

    private _setFocusOnHub = (): void => {
        if (this._hubRef) {
            this._hubRef.focus(PivotBarFocusItem.commands);
        }
    }

    private _changeIteration = (iterationPath: string) => {
        SprintsHubTelemetryHelper.publishTelemetry(SprintViewUsageTelemetryConstants.SWITCH_SPRINT, {});
        if (getRunningDocumentsTable().isModified()) {
            showConfirmNavigationDialog(SprintsHubResources.UnsavedChangesDialog_Message, SprintsHubResources.UnsavedChangesDialog_Title)
                .then(() => {
                    this._hubViewState.viewOptions.setViewOption(AgileRouteParameters.Iteration, iterationPath);
                });
        } else {
            this._hubViewState.viewOptions.setViewOption(AgileRouteParameters.Iteration, iterationPath);
        }
    }

    private _setDocumentTitle(state: ISprintViewState = this.state): void {
        if (state.team &&
            state.team.name &&
            state.selectedIteration &&
            state.selectedIteration.name) {

            const defaultTitle = `${state.team.name} ${state.selectedIteration.name}`;
            if (this._firstPartyContributedPivot(this._hubViewState.selectedPivot.value)) {
                document.title = getDefaultPageTitle(`${defaultTitle} ${this._getPivotTitle()}`);
            } else {
                document.title = getDefaultPageTitle(`${defaultTitle}`);
            }
        }
    }

    private _getArtifactHref = (artifact: Team): string => {
        return SprintsUrls.getExternalSprintContentUrl(artifact.name, null /* iteration */, this._hubViewState.selectedPivot.value);
    }

    private _getArtifactScope(): ArtifactScope {
        const webContext = getDefaultWebContext();
        return {
            id: webContext.project.id,
            name: webContext.project.name,
            type: "Project"
        };
    }

    private _getSprintIcon(): IVssIconProps {
        return { iconName: "sprint", iconType: VssIconType.fabric, className: "sprint-title-icon" };
    }

    private _getViewActionContext = (): ISprintViewActionContext => {
        const { selectedIteration, team } = this.state;
        return {
            iteration: {
                name: selectedIteration.name,
                path: selectedIteration.iterationPath,
                id: selectedIteration.id,
                start: selectedIteration.startDateUTC,
                finish: selectedIteration.finishDateUTC
            },
            team: {
                id: team.id,
                name: team.name
            }
        };
    }

    private _getContributedPivotContext = (contribution: Contribution) => {
        const {
            selectedIteration,
            team
        } = this.state;

        return {
            iterationId: selectedIteration.id,
            team: {
                id: team.id,
                name: team.name
            },
            foregroundInstance: true //do not use it. This is something pivotContribution is providing as background. Keeping property for backcompat
        };
    }

    private _getPivotTitle(): string {
        if (Utils_String.equals(this._hubViewState.selectedPivot.value, SprintsHubRoutingConstants.TaskboardPivot)) {
            return SprintsHubResources.TaskboardPivot;
        } else if (Utils_String.equals(this._hubViewState.selectedPivot.value, SprintsHubRoutingConstants.SprintBacklogPivot)) {
            return SprintsHubResources.BacklogPivot;
        } else if (Utils_String.equals(this._hubViewState.selectedPivot.value, SprintsHubRoutingConstants.CapacityPivot)) {
            return SprintsHubResources.CapacityPivot;
        }
    }

    private _getPivotContext = (): ISprintViewPivotContext => {
        const {
            team,
            teamIterations,
            teamWeekends,
            teamDaysOff,
            selectedIteration,
            selectedIterationTimeframe,
            nextIteration,
            previousIteration,
            backlogIterationFriendlyPath,
            exceptionInfo
        } = this.state;

        return {
            shouldReloadDataProviders: this._shouldReloadDataProviders,
            team,
            teamIterations,
            teamWeekends,
            teamDaysOff,
            selectedIteration,
            selectedIterationTimeframe,
            nextIteration,
            previousIteration,
            backlogIterationFriendlyPath,
            exceptionInfo,
            pivotName: this._hubViewState.selectedPivot.value,
            commands: this._pivotCommands,
            filter: this._hubViewState.filter,
            viewActions: this._pivotViewActions,
            viewOptions: this._hubViewState.viewOptions,

            setFocusOnHub: this._setFocusOnHub,
            onOpenSettings: this._openSettings,
            onPlanSprint: this._onPlanSprintClicked,
            onSprintPickerClicked: this._onSprintPickerClicked,
            onTeamDaysOffUpdated: this._onTeamDaysOffUpdated
        };
    }

    private _onTeamDaysOffUpdated = (newTeamDaysOff: DateRange[]): void => {
        this.props.actionsCreator.updateTeamDaysOff(newTeamDaysOff);
    }

    private _resolveHubElement = (hub: IHub): void => {
        this._hubRef = hub;
    }
}
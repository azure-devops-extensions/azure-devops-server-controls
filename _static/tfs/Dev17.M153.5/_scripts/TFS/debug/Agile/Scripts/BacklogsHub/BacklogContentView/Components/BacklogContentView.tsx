import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/BacklogContentView/Components/BacklogContentView";
import { IBacklogContentViewActionsCreator } from "Agile/Scripts/BacklogsHub/BacklogContentView/ActionsCreator/BacklogContentViewActionsCreator";
import { getState, IBacklogContentViewState } from "Agile/Scripts/BacklogsHub/BacklogContentView/Selectors/BacklogContentViewSelectors";
import { IBacklogContentViewStore } from "Agile/Scripts/BacklogsHub/BacklogContentView/Store/BacklogContentViewStore";
import { IBacklogPivotContext, IContributedPivotContext } from "Agile/Scripts/BacklogsHub/BacklogHubContracts";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { BacklogsHubViewState } from "Agile/Scripts/BacklogsHub/BacklogsHubViewState";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { CumulativeFlowChartComponent, VelocityChartComponent } from "Agile/Scripts/Common/Components/ChartControls";
import { DelayTTIComponent } from "Agile/Scripts/Common/Components/DelayTTIComponent";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { getHubDisplayName } from "Agile/Scripts/Common/HubContributionUtils";
import { BacklogsUrls, IBacklogUrlOptions } from "Agile/Scripts/Common/HubUrlUtilities";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { PivotItemProvider } from "Agile/Scripts/Common/PivotItemProvider";
import { getLevelSelectorViewAction, BacklogLevelSelectorClass } from "Agile/Scripts/Common/ViewActions/BacklogLevelSelectorViewAction";
import { AgileRouteParameters, BacklogsHubConstants, FavoriteConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as BacklogHubResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { ITeamSource } from "Agile/Scripts/Sources/TeamSource";
import { FavoriteStorageScopes } from "Favorites/Constants";
import { Favorite } from "Favorites/Contracts";
import { ArtifactPickerProvider, IArtifactPickerProviderOptions } from "Favorites/Controls/ArtifactPickerProvider";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getDefaultWebContext } from "VSS/Context";
import { Contribution } from "VSS/Contributions/Contracts";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import { delay } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { IFilterBarProps } from "VSSUI/FilterBar";
import { Hub, IHubProps } from "VSSUI/Hub";
import { HubHeader, HubTileRegion } from "VSSUI/HubHeader";
import { IPivotBarAction, IPivotBarViewAction, IVssPivotBarItemProvider } from "VSSUI/PivotBar";
import { ObservableArray, ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { IPickListGroup } from "VSSUI/PickList";

const MINE_GROUP = "MINE";

export interface IBacklogContentViewProps {
    backlogActionsCreator: IBacklogContentViewActionsCreator;
    backlogStore: IBacklogContentViewStore;
    backlogLevel: string;
    teamSource: ITeamSource;
}

export class BacklogContentView extends React.Component<IBacklogContentViewProps, IBacklogContentViewState> {
    private _artifactPickerProvider: ArtifactPickerProvider<Team>;
    // Flag to indicate if data providers should be fetched asynchronously
    private _shouldReloadDataProviders: boolean = false;
    private _pivotProviders: IVssPivotBarItemProvider[];
    private _hubViewState: VssHubViewState;
    private _onRenderFilterBar: ObservableValue<() => React.ReactElement<IFilterBarProps> | undefined> = new ObservableValue(undefined);
    private _pivotCommands: ObservableArray<IPivotBarAction> = new ObservableArray();
    private _shortcuts: AgileHubShortcutGroup;
    private _viewActions: ObservableArray<IPivotBarViewAction> = new ObservableArray();
    private _externalPivotContributionsProvider: ContributablePivotItemProvider<IContributedPivotContext>;
    private _searchTelemetryPublished: boolean;
    private _backlogLevelLearningBubble = React.createRef<LearningBubble>();

    private readonly BACKLOG_PIVOT_KEY = "backlog";

    constructor(props: IBacklogContentViewProps) {
        super(props);

        this._hubViewState = new BacklogsHubViewState(BacklogsHubConstants.BacklogPivot);
        this.state = getState(this.props.backlogStore);
    }

    public componentWillMount(): void {
        this.props.backlogStore.addChangedListener(this._onStoreChanged);
        // Update when the filter function updates
        this._onRenderFilterBar.subscribe(this._onRenderFilterBarUpdated);

        this._pivotProviders = [];
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        // OOB pivot
        this._pivotProviders.push(new PivotItemProvider(
            "ms.vss-work-web.backlogs-hub:content:pivots",
            this._getBacklogPivotContext,
            {
                hubViewState: this._hubViewState,
                routeValueKey: AgileRouteParameters.Pivot
            }));

        this._externalPivotContributionsProvider = new ContributablePivotItemProvider(
            ["ms.vss-work-web.product-backlog-tabs"],
            this._getContributedPivotContext,
            {
                hubViewState: this._hubViewState,
                routeValueKey: AgileRouteParameters.Pivot
            });

        this._pivotProviders.push(this._externalPivotContributionsProvider);

        this.props.backlogActionsCreator.initializeHeaderData();

        this._shortcuts = new AgileHubShortcutGroup(this._hubViewState.viewOptions);
    }

    public componentWillUnmount(): void {
        this.props.backlogStore.removeChangedListener(this._onStoreChanged);
        this._onRenderFilterBar.unsubscribe(this._onRenderFilterBarUpdated);
        this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);

        if (this._shortcuts) {
            this._shortcuts.removeShortcutGroup();
            this._shortcuts = null;
        }

        this._hubViewState.dispose();

        if (this._backlogLevelLearningBubble.current) {
            this._backlogLevelLearningBubble.current.cancelDelayedShow();
        }
    }

    public render(): JSX.Element {
        const {
            headerDataReady,
            exceptionInfo
        } = this.state;

        if (!headerDataReady) {
            return <LoadingComponent />;
        }

        if (exceptionInfo) {
            document.title = getDefaultPageTitle(`${getHubDisplayName()} - ${exceptionInfo.exceptionMessage}`);
            return (
                <HubError
                    exceptionsInfo={[exceptionInfo]}
                />
            );
        }

        const hubProps: IHubProps = {
            commands: this._pivotCommands,
            viewActions: this._viewActions,
            hubViewState: this._hubViewState,
            hideFullScreenToggle: false,
            pivotProviders: this._pivotProviders,
            onRenderFilterBar: this._onRenderFilterBar.value,
            onPivotBarRenderComplete: this._onPivotBarRenderComplete,
            className: "backlog-content-view"
        };

        return (
            <Hub {...hubProps}>
                {this._getHubHeader()}
                {this._renderHubTileRegion()}
                {this._renderBacklogLevelLearningBubble()}
            </Hub>
        );
    }

    public componentDidMount(): void {
        this._initializeArtifactPicker();
        if (this.state.headerDataReady) {
            this._setDocumentTitle();
        }

        if (this._backlogLevelLearningBubble.current) {
            this._backlogLevelLearningBubble.current.showIfNeededAfterDelay();
        }

        this._shouldReloadDataProviders = true;
    }

    public componentDidUpdate(prevProps: IBacklogContentViewProps, prevState: IBacklogContentViewState): void {
        this._initializeArtifactPicker();
        if ((this.state.headerDataReady && !prevState.headerDataReady) ||
            this.state.currentBacklog && prevState.currentBacklog && this.state.currentBacklog.id !== prevState.currentBacklog.id) {
            this._setDocumentTitle();
        }
    }

    private _onPivotBarRenderComplete = () => {
        const {
            visibleBacklogLevels
        } = this.state;

        const selectedPivotKey = this._hubViewState.selectedPivot.value;
        if (selectedPivotKey !== this.BACKLOG_PIVOT_KEY) {
            this._viewActions.value = [
                getLevelSelectorViewAction(
                    visibleBacklogLevels,
                    this._hubViewState.viewOptions,
                    /* canSwitchLevels */ null,
                    "Backlog",
                    {
                        iconName: "BacklogList",
                        iconType: VssIconType.fabric
                    }
                )];
        }
    }

    private _getBacklogPivotContext = (): IBacklogPivotContext => {
        const {
            visibleBacklogLevels,
            currentBacklog,
            nextBacklog,
            team,
            newBacklogLevelsSignature,
            hasIterations
        } = this.state;

        return {
            shouldReloadDataProviders: this._shouldReloadDataProviders,
            visibleBacklogLevels,
            currentBacklog,
            nextBacklog,
            team,
            pivotName: this._hubViewState.selectedPivot.value,
            commands: this._pivotCommands,
            filter: this._hubViewState.filter,
            viewActions: this._viewActions,
            viewOptions: this._hubViewState.viewOptions,
            newBacklogLevelsSignature,
            hasIterations
        };
    }

    private _getContributedPivotContext = (contribution: Contribution): IContributedPivotContext => {
        const {
            currentBacklog,
            team
        } = this.state;

        return {
            level: currentBacklog.name,
            workItemTypes: currentBacklog.workItemTypes,
            team: {
                id: team.id,
                name: team.name
            },
            foregroundInstance: this._hubViewState.selectedPivot.value === contribution.id
        };
    }

    private _onRenderFilterBarUpdated = (): void => {
        this.forceUpdate();
    }

    private _onPivotChanged = (newPivotKey: string) => {
        if (newPivotKey === BacklogsHubConstants.BacklogPivot) {
            //Start Pivot switch perf telemetry scenario
            const telemetryHelper = PerformanceTelemetryHelper.getInstance(BacklogsHubConstants.HUB_NAME);

            if (telemetryHelper.isActive()) {
                telemetryHelper.abort();
            }

            telemetryHelper.startTabSwitch(BacklogsHubConstants.HUB_NAME, newPivotKey);
        }
    }

    private _onStoreChanged = (): void => {
        this.setState(getState(this.props.backlogStore));
    }

    private _onViewOptionsChanged = (value: IViewOptionsValues, action?: string) => {
        if (value.hasOwnProperty(AgileRouteParameters.BacklogLevel)) {
            const telemetryHelper = PerformanceTelemetryHelper.getInstance(BacklogsHubConstants.HUB_NAME);

            if (telemetryHelper.isActive()) {
                telemetryHelper.abort();
            }

            telemetryHelper.startScenario(BacklogsHubTelemetryConstants.LEVEL_CHANGE);
            this.props.backlogActionsCreator.changeBacklogLevel(value[AgileRouteParameters.BacklogLevel], this.state.team.id);

            // The pivot provider needs to be refreshed as the pivot can decide to be displayed or not based on the new context
            if (this._externalPivotContributionsProvider) {
                this._externalPivotContributionsProvider.refresh();
            }
        }
    }

    private _getHubHeader() {
        const webContext = getDefaultWebContext();
        const teamPanelIcon = <TeamPanelIconButton
            projectName={webContext.project.name}
            projectId={webContext.project.id}
            teamId={this.state.team.id}
            teamName={this.state.team.name}
        />;

        return (
            <HubHeader
                headerItemPicker={this._artifactPickerProvider}
                pickListMinWidth={400}
                iconProps={this._getBacklogIcon()} //This is the icon that appears in the picker when collapsed (upper left)
            >
                {teamPanelIcon}
            </HubHeader>
        );
    }

    private _renderHubTileRegion = (): JSX.Element => {
        const {
            currentBacklog,
            hasIterations,
            isRequirementBacklog,
            team
        } = this.state;

        const pivot = this._hubViewState.selectedPivot.value;

        if (Utils_String.equals(pivot, BacklogsHubConstants.BacklogPivot, /*ignoreCase*/ true)) {
            return (
                <HubTileRegion>
                    <DelayTTIComponent>
                        {() =>
                            <div className="backlog-hub-tile-region">
                                {isRequirementBacklog && hasIterations && <VelocityChartComponent teamId={team.id} />}
                                <CumulativeFlowChartComponent
                                    teamId={team.id}
                                    backlogLevelId={currentBacklog.id}
                                />
                            </div>
                        }
                    </DelayTTIComponent>
                </HubTileRegion>
            );
        }

        return null;
    }

    private _renderBacklogLevelLearningBubble(): JSX.Element {
        return (
            <LearningBubble
                ref={this._backlogLevelLearningBubble}
                settingsKey={LearningBubbleSettingsKeys.BacklogLevels}
                target={`.${BacklogLevelSelectorClass}`}
                text={BacklogHubResources.BacklogLevelLearningBubbleText}
                buttonLabel={PresentationResources.LearningBubbleButtonLabel} />
        );
    }

    private _getArtifactName(backlogItem: Team): string {
        return backlogItem.name;
    }

    private _getBacklogIcon(): IVssIconProps {
        return {
            iconName: "BacklogList",
            iconType: VssIconType.fabric,
            className: "backlog-title-icon"
        };
    }

    private _getFavoriteForBacklog(backlogItem: Team): Favorite {
        const webContext = getDefaultWebContext();
        return {
            artifactId: backlogItem.id,
            artifactName: backlogItem.name,
            artifactType: FavoriteTypes.WORK_TEAMBACKLOG,
            artifactScope: {
                id: webContext.project.id,
                name: webContext.project.name,
                type: FavoriteStorageScopes.Project
            },
            artifactProperties: {
                [FavoriteConstants.TeamName]: backlogItem.name
            },
            artifactIsDeleted: false,
            creationDate: undefined,
            id: undefined,
            owner: undefined,
            url: undefined,
            _links: undefined
        };
    }

    private _initializeArtifactPicker(): void {
        const {
            headerDataReady,
            team
        } = this.state;

        if (headerDataReady && team && !this._artifactPickerProvider) {
            const webContext = getDefaultWebContext();

            const props: IArtifactPickerProviderOptions<Team> = {
                favoritesContext: {
                    artifactTypes: [FavoriteTypes.WORK_TEAMBACKLOG],
                    artifactScope: {
                        id: webContext.project.id,
                        name: webContext.project.name,
                        type: FavoriteStorageScopes.Project
                    }
                },
                browseAllText: BacklogHubResources.BrowseAllBacklogsText,
                onBrowseAllClick: this._onBrowseAllClicked,
                selectedArtifact: team,
                artifactComparer: (item1, item2) => Utils_String.localeIgnoreCaseComparer(item1.name, item2.name),
                searchNoResultsText: BacklogHubResources.SearchNoResultsText,
                searchTextPlaceholder: BacklogHubResources.SearchTextPlaceholder,
                loadingText: BacklogHubResources.LoadingBacklogsText,
                searchResultsLoadingText: BacklogHubResources.SearchResultsLoadingText,
                getArtifacts: () => this.props.teamSource.fetchMemberTeams(),
                getArtifactId: (backlogItem) => backlogItem.id,
                getArtifactName: (backlogItem) => this._getArtifactName(backlogItem),
                getArtifactFromFavorite: (favoriteItem) => new Team({ id: favoriteItem.artifactId, name: favoriteItem.artifactName }),
                getFavoriteFromArtifact: (backlogItem) => this._getFavoriteForBacklog(backlogItem),
                getArtifactIcon: (backlogItem) => this._getBacklogIcon(),
                getArtifactHref: this._getArtifactHrefHandler,
                getSearchResults: (searchText) => {
                    if (!this._searchTelemetryPublished) {
                        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.SEARCH_TEAM, {});
                        this._searchTelemetryPublished = true;
                    }
                    // All data is local and already loaded in the control, so no need to do any remote search
                    // If returning [], the picker provider will filter the existing backlogs
                    return [];
                },
                favoriteGroupHeader: BacklogHubResources.FavoriteGroupHeader,
                groups: this.getGroups(),
                onArtifactClicked: (artifact) => this._onArtifactClickedHandler(artifact, team.id),
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
            name: BacklogHubResources.MyTeamGroupHeader
        }];

        return groups;
    }

    private _getArtifactHrefHandler(artifact: Team): string {
        const teamId = artifact.id;
        const backlogsUrlOptions: IBacklogUrlOptions = {
            teamIdOrName: teamId,
            preserveQueryParameters: true
        };

        return BacklogsUrls.getBacklogContentUrl(backlogsUrlOptions);
    }

    private _setDocumentTitle(): void {
        if (this.state.team && this.state.currentBacklog) {
            document.title = getDefaultPageTitle(`${this.state.team.name} ${this.state.currentBacklog.name} ${BacklogHubResources.Backlog}`);
        }
    }

    private _onArtifactClickedHandler(artifact: Team, selectedBacklogItemId: string): boolean {

        if (Utils_String.equals(artifact.id, selectedBacklogItemId, true /* Ignore case */)) {
            // Return true to prevent navigation.
            return true;
        }

        if (!getDefaultWebContext().team) {
            const url = this._getArtifactHrefHandler(artifact);
            BacklogsUrls.navigateToBacklogsHubUrl(url);
            return true;
        }
    }

    private _onBrowseAllClicked = (): void => {
        const url = BacklogsUrls.getBacklogDirectoryUrl();
        delay(this, 0, () => BacklogsUrls.navigateToBacklogsHubUrl(url));
    }
}
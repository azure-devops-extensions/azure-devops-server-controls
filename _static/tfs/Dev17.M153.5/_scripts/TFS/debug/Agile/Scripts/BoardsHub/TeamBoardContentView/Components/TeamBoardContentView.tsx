import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BoardsHub/TeamBoardContentView/Components/TeamBoardContentView";
import { ITeamBoardContentViewActionsCreator } from "Agile/Scripts/BoardsHub/TeamBoardContentView/ActionsCreator/TeamBoardContentViewActionsCreator";
import { getState, ITeamBoardContentViewState } from "Agile/Scripts/BoardsHub/TeamBoardContentView/Selectors/TeamBoardContentViewSelectors";
import { ITeamBoardContentViewStore } from "Agile/Scripts/BoardsHub/TeamBoardContentView/Store/TeamBoardContentViewStore";
import { ITeamBoardPivotContext, IContributableViewActionContext, IContributedPivotContext } from "Agile/Scripts/BoardsHub/BoardsHubContracts";
import { TeamBoardContentViewState } from "Agile/Scripts/BoardsHub/BoardsHubViewState";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { CumulativeFlowChartComponent, VelocityChartComponent } from "Agile/Scripts/Common/Components/ChartControls";
import { DelayTTIComponent } from "Agile/Scripts/Common/Components/DelayTTIComponent";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { getHubDisplayName } from "Agile/Scripts/Common/HubContributionUtils";
import { BoardsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { getLevelSelectorViewAction, BacklogLevelSelectorClass } from "Agile/Scripts/Common/ViewActions/BacklogLevelSelectorViewAction";
import { AgileRouteParameters, BoardsHubConstants, FavoriteConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as BoardsHubResources from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardView";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { ITeamSource } from "Agile/Scripts/Sources/TeamSource";
import { ArtifactScope, Favorite } from "Favorites/Contracts";
import { ArtifactPickerProvider, IArtifactPickerProviderOptions } from "Favorites/Controls/ArtifactPickerProvider";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getDefaultWebContext } from "VSS/Context";
import { Contribution } from "VSS/Contributions/Contracts";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import { publishEvent as publishTelemetryEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { delay } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub, IHubProps } from "VSSUI/Hub";
import { HubHeader, HubTileRegion } from "VSSUI/HubHeader";
import { IPivotBarAction, IPivotBarViewAction, IVssPivotBarItemProvider } from "VSSUI/PivotBar";
import { ObservableArray, ObservableValue } from "VSS/Core/Observable";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";
import { PivotItemProvider } from "Agile/Scripts/Common/PivotItemProvider";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { IPickListGroup } from "VSSUI/PickList";
import { IBoardSource } from "Agile/Scripts/Sources/BoardSource";
import { BoardArtifact } from "Agile/Scripts/Models/Board/BoardArtifact";
import {FeatureAvailabilityService} from "VSS/FeatureAvailability/Services";
import {FeatureAvailabilityFlags} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface ITeamBoardContentViewProps {
    actionsCreator: ITeamBoardContentViewActionsCreator;
    store: ITeamBoardContentViewStore;
    backlogLevel: string;
    teamSource: ITeamSource;
    boardSource: IBoardSource;
    /**
     * Whether the board is in embedded mode or not.
     * For example, when hosting a board in microsoft team tab, it should be in embedded mode.
     */
    embedded?: boolean;
}

export class TeamBoardContentView extends React.Component<ITeamBoardContentViewProps, ITeamBoardContentViewState> {
    private _artifactPickerProvider: ArtifactPickerProvider<BoardArtifact>;
    // Flag to indicate if data providers should be fetched asynchronously
    private _shouldReloadDataProviders: boolean = false;
    private _pivotProviders: IVssPivotBarItemProvider[];
    private _hubViewState: VssHubViewState;
    private _pivotCommands: ObservableArray<IPivotBarAction> = new ObservableArray();
    private _shortcuts: AgileHubShortcutGroup;
    private _viewActions: ObservableArray<IPivotBarViewAction> = new ObservableArray();
    private _contributableViewActionContext: ObservableValue<IContributableViewActionContext | undefined> = new ObservableValue(undefined);
    private _boardArtifactScope: ArtifactScope;
    private _externalPivotContributionsProvider: ContributablePivotItemProvider<ITeamBoardPivotContext>;
    private _backlogLevelLearningBubble = React.createRef<LearningBubble>();

    private readonly BOARD_PIVOT_KEY = "board";
    private _idBoardFFEnabled: boolean;

    constructor(props: ITeamBoardContentViewProps) {
        super(props);

        this._hubViewState = new TeamBoardContentViewState();
        this._idBoardFFEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileIdBoard);

        const webContext = getDefaultWebContext();
        this._boardArtifactScope = {
            id: webContext.project.id,
            name: webContext.project.name,
            type: "Project"
        };

        this.state = getState(this.props.store);
    }

    public componentWillMount(): void {
        this.props.store.addChangedListener(this._onStoreChanged);

        this._pivotProviders = [];
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        // OOB pivot
        this._pivotProviders.push(new PivotItemProvider(
            "ms.vss-work-web.team-board-content-pivots",
            this._getBoardPivotContext,
            {
                hubViewState: this._hubViewState,
                routeValueKey: AgileRouteParameters.Pivot,
                actionContext: () => this._contributableViewActionContext.value
            }));

        if (!this.props.embedded) {
            // Tab contributions doesn't exist in embedded mode 
            this._externalPivotContributionsProvider = new ContributablePivotItemProvider(
                ["ms.vss-work-web.product-backlog-tabs"],
                this._getContributedPivotContext,
                {
                    hubViewState: this._hubViewState,
                    routeValueKey: AgileRouteParameters.Pivot
                }
            );
            this._pivotProviders.push(this._externalPivotContributionsProvider);
        }

        this.props.actionsCreator.initializeHeaderData();

        this._shortcuts = new AgileHubShortcutGroup(this._hubViewState.viewOptions);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
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

        if (exceptionInfo) {
            document.title = getDefaultPageTitle(`${getHubDisplayName()} - ${exceptionInfo.exceptionMessage}`);
            return (
                <HubError
                    exceptionsInfo={[exceptionInfo]}
                />
            );
        }

        if (!headerDataReady) {
            return <LoadingComponent />;
        }

        const hubProps: IHubProps = {
            commands: this._pivotCommands,
            viewActions: this._viewActions,
            hubViewState: this._hubViewState,
            pivotProviders: this._pivotProviders,
            onPivotBarRenderComplete: this._onPivotBarRenderComplete,
            className: "board-content-view"
        };

        if (this.props.embedded) {
            return (
                <Hub {...hubProps}>
                    {this._getEmbeddedHubHeader()}
                </Hub>
            );
        } else {
            return (
                <Hub {...hubProps}>
                    {this._getHubHeader()}
                    {this._renderHubTileRegion()}
                    {this._renderBacklogLevelLearningBubble()}
                </Hub>
            );
        }
    }

    public componentDidMount() {
        this._initializeArtifactPicker();
        if (this.state.headerDataReady) {
            this._setDocumentTitle();
        }

        if (this._backlogLevelLearningBubble.current) {
            this._backlogLevelLearningBubble.current.showIfNeededAfterDelay();
        }

        this._shouldReloadDataProviders = true;
    }

    public componentDidUpdate(prevProps: ITeamBoardContentViewProps, prevState: ITeamBoardContentViewState) {
        this._initializeArtifactPicker();
        if ((this.state.headerDataReady && !prevState.headerDataReady) ||
            this.state.backlogId !== prevState.backlogId) {
            this._setDocumentTitle();
        }
    }

    private _onPivotBarRenderComplete = () => {
        const {
            visibleBacklogLevels
        } = this.state;

        const selectedPivotKey = this._hubViewState.selectedPivot.value;
        if (selectedPivotKey !== this.BOARD_PIVOT_KEY && !this.props.embedded) {
            this._viewActions.value = [
                getLevelSelectorViewAction(
                    visibleBacklogLevels,
                    this._hubViewState.viewOptions,
                    /* canSwitchLevels */ null,
                    "Boards",
                    {
                        iconName: "BacklogBoard",
                        iconType: VssIconType.fabric
                    }
                )];
        }
    }

    private _getBoardPivotContext = (): ITeamBoardPivotContext => {
        const {
            currentBacklog,
            team,
            newBacklogLevelsSignature,
            visibleBacklogLevels
        } = this.state;

        return {
            currentBacklog,
            team,
            shouldReloadDataProviders: this._shouldReloadDataProviders,
            newBacklogLevelsSignature,
            visibleBacklogLevels,
            pivotName: this._hubViewState.selectedPivot.value,
            commands: this._pivotCommands,
            filter: this._hubViewState.filter,
            viewActions: this._viewActions,
            contributableViewActionContext: this._contributableViewActionContext,
            viewOptions: this._hubViewState.viewOptions,
            embedded: this.props.embedded
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

    private _onPivotChanged = (newPivotKey: string) => {
        if (newPivotKey === this.BOARD_PIVOT_KEY) {
            //Start Pivot switch perf telemetry scenario
            const telemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);

            if (telemetryHelper.isActive()) {
                telemetryHelper.abort();
            }

            telemetryHelper.startTabSwitch(BoardsHubConstants.HUB_NAME, newPivotKey);
        }
    }

    private _onStoreChanged = (): void => {
        this.setState(getState(this.props.store));
    }

    private _onViewOptionsChanged = (value: IViewOptionsValues, action?: string) => {
        if (value.hasOwnProperty(AgileRouteParameters.BacklogLevel)) {
            this.props.actionsCreator.changeBacklogLevel(value[AgileRouteParameters.BacklogLevel], this.state.team.id);

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
                iconProps={this._getBoardIcon()}           //This is the icon that appears in the picker when collapsed (upper left)
            >
                {teamPanelIcon}
            </HubHeader>
        );
    }

    private _getEmbeddedHubHeader(): JSX.Element {
        const title = Utils_String.format(
            BoardsHubResources.EmbeddedBoardHeaderTitle,
            this.state.team.name,
            this.state.currentBacklog.name
        );
        return <HubHeader title={title} />;
    }

    private _renderHubTileRegion = (): JSX.Element => {
        const {
            currentBacklog,
            hasIterations,
            isRequirementBacklog,
            team
        } = this.state;

        const pivot = this._hubViewState.selectedPivot.value;

        if (Utils_String.equals(pivot, this.BOARD_PIVOT_KEY, /*ignoreCase*/ true)) {
            return (
                <HubTileRegion>
                    <DelayTTIComponent>
                        {
                            () =>
                                <div className="board-hub-tile-region">
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
        if (this.props.embedded) {
            return null;
        }

        return (
            <LearningBubble
                ref={this._backlogLevelLearningBubble}
                settingsKey={LearningBubbleSettingsKeys.BacklogLevels}
                target={`.${BacklogLevelSelectorClass}`}
                text={BoardsHubResources.BacklogLevelLearningBubbleText}
                buttonLabel={PresentationResources.LearningBubbleButtonLabel} />
        );
    }

    private _getArtifactName = (backlogItem: Team): string => {
        return backlogItem.name;
    }

    private _getBoardIcon(): IVssIconProps {
        return {
            iconName: "BacklogBoard",
            iconType: VssIconType.fabric,
            className: "board-title-icon"
        };
    }

    private _getFavoriteForBoard = (boardItem: BoardArtifact): Favorite => {
        if(!this._idBoardFFEnabled && boardItem.isIdBoard) {
            return;
        }
        return {
            artifactId: boardItem.id,
            artifactName: boardItem.name,
            artifactType: boardItem.favoriteType,
            artifactScope: this._boardArtifactScope,
            artifactProperties: {
                [FavoriteConstants.TeamName]: boardItem.name
            },
            artifactIsDeleted: false,
            creationDate: undefined,
            id: undefined,
            owner: undefined,
            url: undefined,
            _links: undefined
        };
    }

    private _getArtifactFromFavorite = (favoriteItem: Favorite): BoardArtifact => {
        if(!this._idBoardFFEnabled && favoriteItem.artifactType === FavoriteTypes.WORK_IDBOARD) {
            return;
        }
        return new BoardArtifact({ id: favoriteItem.artifactId, name: favoriteItem.artifactName });
    }

    private _initializeArtifactPicker(): void {
        const {
            headerDataReady,
            team
        } = this.state;

        if (headerDataReady && team && !this._artifactPickerProvider) {
            const teamArtifact = new BoardArtifact({ id: team.id, name: team.name});

            const props: IArtifactPickerProviderOptions<BoardArtifact> = {
                favoritesContext: {
                    artifactTypes: [FavoriteTypes.WORK_IDBOARD, FavoriteTypes.WORK_TEAMBOARD],
                    artifactScope: this._boardArtifactScope
                },
                selectedArtifact: teamArtifact,
                artifactComparer: (item1, item2) => Utils_String.localeIgnoreCaseComparer(item1.name, item2.name),
                searchNoResultsText: BoardsHubResources.SearchNoResultsText,
                searchTextPlaceholder: BoardsHubResources.SearchTextPlaceholder,
                loadingText: BoardsHubResources.LoadingBoards,
                browseAllText: BoardsHubResources.BrowseAllBoards,
                searchResultsLoadingText: BoardsHubResources.SearchResultsLoading,
                onBrowseAllClick: this._onBrowseAllClick,
                getArtifacts: () => this.getTeamBoardArtifacts(),
                getArtifactId: (backlogItem) => backlogItem.id,
                getArtifactName: this._getArtifactName,
                getArtifactFromFavorite: this._getArtifactFromFavorite,
                getFavoriteFromArtifact: this._getFavoriteForBoard,
                getArtifactIcon: (boardItem: BoardArtifact) => {
                    return { iconName: "BacklogBoard", iconType: VssIconType.fabric, className: "board-title-icon" };
                },
                getArtifactHref: this._getArtifactHref,
                getSearchResults: (searchText) => {
                    // All data is local and already loaded in the control, so no need to do any remote search
                    // If returning [], the picker provider will filter the existing backlogs
                    return [];
                },
                favoriteGroupHeader: BoardsHubResources.FavoriteGroupHeader,
                groups: this.getGroups(),
                onArtifactClicked: (artifact) => {
                    if (Utils_String.equals(artifact.id, teamArtifact.id, true /* Ignore case */)) {
                        // Return true to prevent navigation
                        return true;
                    }

                    if (!getDefaultWebContext().team) {
                        const url = this._getArtifactHref(artifact);
                        BoardsUrls.navigateToBoardsHubUrl(url);
                        return true;
                    }
                },
                getArtifactListGroupId: (artifactItem: BoardArtifact) => {
                    return artifactItem.favoriteType;
                }
            };

            this._artifactPickerProvider = new ArtifactPickerProvider(props);
            // Re-render the component
            this.forceUpdate();
        }
    }

    private getGroups(): IPickListGroup[] {
        let groups: IPickListGroup[] = [{
            key: FavoriteTypes.WORK_TEAMBOARD,
            name: BoardsHubResources.MyTeamGroupHeader
        }, {
            key: FavoriteTypes.WORK_IDBOARD,
            name: BoardsHubResources.IdBoardsGroupHeader
        }];

        return groups;
    }

    private getTeamBoardArtifacts(): Promise<BoardArtifact[]> {
        const teamArtifactsPromise: Promise<Team[]> = this.props.teamSource.fetchMemberTeams();
        let boardArtifactsPromise: Promise<BoardArtifact[]> = Promise.resolve([]);

        // fetch id boards if id board feature flag is enabled.
        if(this._idBoardFFEnabled) {
            boardArtifactsPromise = this.props.boardSource.fetchIdBoards();
        }

        return Promise.all([teamArtifactsPromise, boardArtifactsPromise]).then(([teamArtifacts, boardArtifacts]) => {
            teamArtifacts.forEach(team => {
                boardArtifacts.push(new BoardArtifact({id: team.id, name: team.name, isIdBoard: false}));
            })
            return boardArtifacts;
        });
    }

    private _setDocumentTitle(): void {
        if (this.state.team && this.state.currentBacklog) {
            document.title = getDefaultPageTitle(`${this.state.team.name} ${this.state.currentBacklog.name} ${BoardsHubResources.BoardPivotDisplayName}`);
        }
    }

    private _getArtifactHref = (boardItem: BoardArtifact): string => {
        if(boardItem.isIdBoard) {
            let boardId = parseInt(boardItem.id);
            return BoardsUrls.getIdBoardUrl(boardId);
        }
        return BoardsUrls.getBoardsContentUrl(boardItem.name, null, this._hubViewState.viewOptions.getViewOption(AgileRouteParameters.Pivot));
    }

    private _onBrowseAllClick = () => {
        publishTelemetryEvent(new TelemetryEventData(
            BoardsHubConstants.HUB_NAME,
            "MoveToBoardsDirectoryFromContent",
                /* properties */{})
            , /*immediate*/ true);

        const url = BoardsUrls.getBoardsDirectoryUrl();
        delay(this, 0, () => BoardsUrls.navigateToBoardsHubUrl(url));
    }
}
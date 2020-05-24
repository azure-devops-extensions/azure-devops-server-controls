import * as BoardViewToolbarContracts from "Agile/Scripts/Board/Common/BoardViewToolbarContracts";
import { BoardsHubPerformanceTelemetryConstants, BoardsHubUsageTelemetryConstants } from "Agile/Scripts/BoardsHub/Constants";
import { BoardContentParser } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/BoardContentParser";
import { TeamBoardPivotActions } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/TeamBoardPivotActions";
import { ITeamBoardPivotContentDataProviderData } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { BoardsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BoardsHubConstants, BoardsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import * as ConfigurationsConstants from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_Core_Contracts from "TFS/Core/Contracts";
import * as Work_WebApi from "TFS/Work/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import * as Events_Services from "VSS/Events/Services";
import * as Performance from "VSS/Performance";
import * as Service from "VSS/Service";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import * as Utils_String from "VSS/Utils/String";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export class TeamBoardPivotActionsCreator {
    private _actions: TeamBoardPivotActions;

    constructor(actions: TeamBoardPivotActions) {
        this._actions = actions;
    }

    public static isContributedPivot(pivotKey: string): boolean {
        return !Utils_String.equals(pivotKey, BoardsHubRoutingConstants.BoardPivot, /*ignore case*/ true);
    }

    /**
     * Invoke board criteria filter changed action
     * @param filterState new filter state object
     */
    public invokeBoardCriteriaFilterChanged(filterState: FilterState): void {
        this._actions.boardCriteriaFilterChanged.invoke(filterState);
    }

    /**
     * Launch common-settings-configuration dialog
     * @param defaultTabId default tab to select
     */
    public openSettings(defaultTabId: string) {
        Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, { defaultTabId: defaultTabId });
    }

    /**
     * Toggle live-updates on the board
     * @param eventScopeId current event scope id
     * @param toggleOn true if live-updates has to be turned ON
     * @param teamId current teamId guid as string
     * @param boardId current boardId guid as string
     */
    public toggleLiveUpdates(eventScopeId: string, toggleOn: boolean, teamId: string, boardId: string) {
        // Save user setting
        const perfScenario = Performance.getScenarioManager().startScenario(BoardsHubConstants.HUB_NAME, BoardsHubPerformanceTelemetryConstants.ACTIONSCREATOR_TOGGLE_LIVEUPDATE);
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const tfsConnection = new Service.VssConnection(tfsContext.contextData);
        const workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        const teamContext: TFS_Core_Contracts.TeamContext = {
            projectId: tfsContext.contextData.project.id,
            teamId: teamId,
            project: null,
            team: null
        };
        const data: IDictionaryStringTo<string> = {
            autoRefreshState: toggleOn ? "true" : "false"
        };
        workHttpClient.updateBoardUserSettings(data, teamContext, boardId).then(() => {
            // Successfully updated user settings, fire events to update board
            if (toggleOn) {
                Events_Services.getService().fire(BoardViewToolbarContracts.Notifications.BoardAutoRefreshEnabled, null, null, eventScopeId);
            } else {
                Events_Services.getService().fire(BoardViewToolbarContracts.Notifications.BoardAutoRefreshDisabled, null, null, eventScopeId);
            }
            perfScenario.end();
        }, (reason) => {
            // Publish to telemetry and eat error
            reason.name = "UserSettingsNotUpdatedError";
            publishErrorToTelemetry(reason);
            perfScenario.abort();
        });
    }

    /**
     * Fetch boardView header and content data, invoke appropriate actions
     */
    public initializeBoardPivot(teamId: string, backlogLevelName: string) {
        // Set MRU every time we re-initialize a board page
        this._setBacklogMRU(teamId, backlogLevelName);
        this._fetchBoardContentData();
    }

    public setFilterBarVisible(isVisible: boolean): void {
        this._actions.toggleFilterBarVisible.invoke(isVisible);
    }

    /**
     * Invokes change board action
     * @param backlogId new board's backlog level id
     * @param backlogName new board's backlog level name
     * @param pivotKey pivot id
     * @param teamId current teamId
     */
    public changeBoard(backlogId: string, backlogName: string, pivotKey: string, teamId: string) {
        const perfTelemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);
        if (perfTelemetryHelper.isActive()) {
            perfTelemetryHelper.abort();
        }

        perfTelemetryHelper.startScenario(BoardsHubPerformanceTelemetryConstants.Boards_LevelChange);

        // Set mru when board is changed
        this._setBacklogMRU(teamId, backlogName);

        const boardChangedPayload = {
            backlogId: backlogId,
            backlogName: backlogName
        };
        this._actions.resetBoard.invoke(null);

        BoardsHubTelemetryHelper.publishTelemetry(BoardsHubUsageTelemetryConstants.SWITCH_BOARD_USING_FAVORITE, boardChangedPayload);

        const pageDataService = Service.getService(WebPageDataService);
        pageDataService.reloadCachedProviderData(BoardsHubConstants.TEAM_BOARD_CONTENT_DATAPROVIDER_ID, () => {
            this._fetchBoardContentData();
        });
    }

    private _fetchBoardContentData(): void {
        // Get board content from the data provider
        const pageDataService = Service.getService(WebPageDataService);
        const boardContentData = pageDataService.getPageData<ITeamBoardPivotContentDataProviderData>(BoardsHubConstants.TEAM_BOARD_CONTENT_DATAPROVIDER_ID);
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);
        pageDataService.removePageData(BoardsHubConstants.TEAM_BOARD_CONTENT_DATAPROVIDER_ID);
        if (boardContentData) {
            BoardContentParser.processBoardContent(boardContentData);
            this._actions.boardContentAvailable.invoke(boardContentData);
            telemetryHelper.split(BoardsHubPerformanceTelemetryConstants.ACTIONSCREATOR_CONTENT_DATA_FETCHED);
        } else {
            pageDataService.reloadCachedProviderData(BoardsHubConstants.TEAM_BOARD_CONTENT_DATAPROVIDER_ID, () => {
                this._fetchBoardContentData();
            });
        }
    }

    private _setBacklogMRU(teamId: string, backlogName: string) {
        this._setBoardsMruItem(TfsSettingsScopeNames.WebTeam, teamId, BoardsHubConstants.MruBacklogKey, backlogName);
    }

    private _setBoardsMruItem(scopeName: string, scopeValue: string, key: string, value: string) {
        const settingsToUpdate = { [key]: value };
        getSettingsService().setEntries(settingsToUpdate, SettingsUserScope.Me, scopeName, scopeValue)
            .then(null, (reason) => publishErrorToTelemetry(new Error(`BoardsHub - Could not store mru '${reason}'`)));
    }
}

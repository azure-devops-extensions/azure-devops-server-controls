import { BoardsDirectoryConstants } from "Agile/Scripts/BoardsHub/Constants";
import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { DirectoryDataProvider, IDirectoryDataProvider } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryDataProvider";
import { DirectoryFavoriteService, IDirectoryFavoriteService } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryFavoriteService";
import { IDirectoryData, IFavoriteData, FavoriteState, IMyDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { FilterStatePersistenceManager } from "Agile/Scripts/Common/FilterStatePersistenceManager";
import { BoardsHubConstants, SprintsHubConstants, DirectoryConstants, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Team } from "Agile/Scripts/Models/Team";
import { Favorite } from "Favorites/Contracts";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getPageContext } from "VSS/Context";
import { publishErrorToTelemetry } from "VSS/Error";
import { getErrorMessage } from "VSS/VSS";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { SprintsDirectoryConstants } from "Agile/Scripts/SprintsHub/Directory/SprintsHubDirectoryConstants";
import { HubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { DirectoryUsageTelemetryConstants, DirectoryPerformanceTelemetryConstants } from "Agile/Scripts/Common/Directory/DirectoryConstants";
import { BacklogsHubDirectoryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubConstants";

export interface IDirectoryActionsCreator {
    /** Initialize the data for the all pivot */
    initializeAllData(): Promise<void>;
    /** Initialize the data for the my pivot */
    initializeMyData(): Promise<void>;
    /** Reload data for the all pivot */
    reloadAllData(): Promise<void>;
    reloadMyData(): Promise<void>;
    invalidateData(): void;
    /** Toggle favorite status for a team */
    toggleFavorite(team: Team, currentFavoriteState?: FavoriteState, currentFavorite?: IFavoriteData): void;
    /** Call when the filter changes */
    filterChanged(filterState: IFilterState, pivot: DirectoryPivotType): void;
    /** Call when a row group is expanded/collapsed */
    groupToggled(groupKey: string): void;
    /** Call when the pivot is changed */
    pivotChanged(pivot: DirectoryPivotType): void;
}

export class DirectoryActionsCreator implements IDirectoryActionsCreator {
    private _actionsHub: DirectoryActions;
    private _dataProvider: IDirectoryDataProvider;
    private _telemetryHelper: HubTelemetryHelper;

    private _area: string;

    private _favoritesService: IDirectoryFavoriteService;

    private _allFilterStatePersistenceManager: FilterStatePersistenceManager;
    private _myFilterStatePersistenceManager: FilterStatePersistenceManager;

    constructor(
        dataProvider: IDirectoryDataProvider,
        favoritesService: IDirectoryFavoriteService,
        actionsHub: DirectoryActions,
        area: string
    ) {
        this._dataProvider = dataProvider;
        this._favoritesService = favoritesService;

        this._actionsHub = actionsHub;
        this._area = area;

        this._allFilterStatePersistenceManager = new FilterStatePersistenceManager(TfsSettingsScopeNames.Project, getPageContext().webContext.project.id, this._area, DirectoryPivotType.all);
        this._myFilterStatePersistenceManager = new FilterStatePersistenceManager(TfsSettingsScopeNames.Project, getPageContext().webContext.project.id, this._area, DirectoryPivotType.mine);

        this._telemetryHelper = new HubTelemetryHelper(this._area);
    }

    /**
     * Initialize control and invoke dataAvailable action
     */
    public initializeAllData(): Promise<void> {
        const errorHandler = this._handlePageDataFailed(DirectoryUsageTelemetryConstants.DIRECTORY_ALL_DATA_INITIALIZE_FAILED, DirectoryPivotType.all);
        return this._dataProvider.getAllDirectoryData().then((data: IDirectoryData) => {
            this._handleAllPageData(data, errorHandler);
        }, (error: Error) => {
            errorHandler(error);
        });
    }

    public initializeMyData(): Promise<void> {
        const errorHandler = this._handlePageDataFailed(DirectoryUsageTelemetryConstants.DIRECTORY_MY_DATA_INITIALIZE_FAILED, DirectoryPivotType.mine);
        return this._dataProvider.getMyDirectoryData().then((data: IMyDirectoryData) => {
            this._handleMyPageData(data, errorHandler);
        }, (error: Error) => {
            errorHandler(error);
        });
    }

    public reloadAllData(): Promise<void> {
        const errorHandler = this._handlePageDataFailed("ReloadAllData", DirectoryPivotType.all);
        return this._dataProvider.reloadAllDirectoryData().then((data: IDirectoryData) => {
            this._handleAllPageData(data, errorHandler);
        }, (error: Error) => {
            errorHandler(error);
        });
    }

    public reloadMyData(): Promise<void> {
        const errorHandler = this._handlePageDataFailed("ReloadMyData", DirectoryPivotType.mine);
        return this._dataProvider.reloadMyDirectoryData().then((data: IMyDirectoryData) => {
            this._handleMyPageData(data, errorHandler);
        }, (error: Error) => {
            errorHandler(error);
        });
    }

    public invalidateData(): void {
        this._actionsHub.invalidateData.invoke(null);
    }

    public toggleFavorite(team: Team, currentFavoriteState?: FavoriteState, currentFavorite?: IFavoriteData): Promise<void> {
        if (currentFavoriteState &&
            (currentFavoriteState === FavoriteState.Favoriting || currentFavoriteState === FavoriteState.Unfavoriting)
        ) {
            // We are saving, ignore
            return Promise.resolve();
        }

        if (!currentFavoriteState || currentFavoriteState === FavoriteState.Unfavorited) {
            return this._favoriteTeam(team);
        } else if (currentFavorite) {
            return this._unfavoriteTeam(currentFavorite.id, team);
        } else {
            // Invalid data was passed, ignore
            return Promise.resolve();
        }
    }

    public filterChanged(filterState: IFilterState, activePivot: DirectoryPivotType): void {
        if (activePivot === DirectoryPivotType.all) {
            this._allFilterStatePersistenceManager.immediateSaveFilterStateToServer(filterState);
        } else {
            this._myFilterStatePersistenceManager.immediateSaveFilterStateToServer(filterState);
        }

        this._actionsHub.filterChanged.invoke(filterState);
    }

    public groupToggled(groupKey: string): void {
        this._actionsHub.groupToggled.invoke(groupKey);
    }

    public pivotChanged(pivot: DirectoryPivotType): void {
        this._actionsHub.pivotChanged.invoke(pivot);
    }

    private _favoriteTeam(team: Team): Promise<void> {
        this._actionsHub.beginAddFavorite.invoke(team.id);
        return this._favoritesService.createFavorite(team.id, team.name).then(
            (favorite: Favorite) => {
                const favoriteData: IFavoriteData = {
                    id: favorite.id,
                    artifactId: favorite.artifactId,
                    artifactName: favorite.artifactName,
                    artifactProperties: favorite.artifactProperties as IDictionaryStringTo<string>,
                    isDeleted: favorite.artifactIsDeleted
                };

                this._actionsHub.addFavoriteSuccessful.invoke(favoriteData);
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }

                this._actionsHub.addFavoriteFailed.invoke({ error, teamId: team.id });
            }
        );
    }

    private _unfavoriteTeam(favoriteId: string, team: Team): Promise<void> {
        this._actionsHub.beginRemoveFavorite.invoke(team.id);
        return this._favoritesService.deleteFavorite(favoriteId).then(
            () => {
                this._actionsHub.removeFavoriteSuccessful.invoke(team.id);
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }
                this._actionsHub.removeFavoriteFailed.invoke({ error, teamId: team.id });
            }
        );
    }

    private _handleAllPageData(pageData: IDirectoryData, errorHandler: (error: Error, exceptionInfo?: ExceptionInfo) => void): void {
        if (this._verifyAndReportValidData(pageData, errorHandler)) {
            const parsedFilterState = this._parseFilterState(pageData.filterStateJson);
            pageData.filterState = parsedFilterState;

            this._actionsHub.allDataAvailableAction.invoke(pageData);

            // Publish telemetry
            const perfTelemetryHelper = PerformanceTelemetryHelper.getInstance(this._area);
            perfTelemetryHelper.split(DirectoryPerformanceTelemetryConstants.ACTIONSCREATOR_DIRECTORY_DATA_AVAILABLE);

            this._telemetryHelper.publishTelemetry(DirectoryUsageTelemetryConstants.DIRECTORY_ALL_DATA_INITIALIZED, {
                [DirectoryUsageTelemetryConstants.ALL_TEAMS_COUNT]: pageData.teams.length,
                [DirectoryUsageTelemetryConstants.FAVORITE_COUNT]: pageData.favorites.length,
                ...this._getFilterTelemetryValues(parsedFilterState)
            });
        }
    }

    private _handleMyPageData(pageData: IMyDirectoryData, errorHandler: (error: Error, exceptionInfo?: ExceptionInfo) => void): void {
        if (this._verifyAndReportValidData(pageData, errorHandler)) {
            const parsedFilterState = this._parseFilterState(pageData.filterStateJson);
            pageData.filterState = parsedFilterState;

            this._actionsHub.myDataAvailableAction.invoke(pageData);

            // Publish telemetry
            const perfTelemetryHelper = PerformanceTelemetryHelper.getInstance(this._area);
            perfTelemetryHelper.split(DirectoryPerformanceTelemetryConstants.ACTIONSCREATOR_DIRECTORY_DATA_AVAILABLE);

            this._telemetryHelper.publishTelemetry(DirectoryUsageTelemetryConstants.DIRECTORY_MY_DATA_INITIALIZED, {
                [DirectoryUsageTelemetryConstants.MY_TEAMS_COUNT]: pageData.teams.length,
                [DirectoryUsageTelemetryConstants.FAVORITE_COUNT]: pageData.favorites.length,
                ...this._getFilterTelemetryValues(parsedFilterState)
            });
        }
    }

    private _handlePageDataFailed(errorCode: string, pivot: DirectoryPivotType): (error: Error, exceptionInfo?: ExceptionInfo) => void {
        return (error: Error, exceptionInfo?: ExceptionInfo) => {
            publishErrorToTelemetry({
                name: errorCode,
                message: getErrorMessage(error)
            });

            const exception = exceptionInfo ? exceptionInfo : {
                exceptionMessage: getErrorMessage(error)
            };

            if (pivot === DirectoryPivotType.all) {
                this._actionsHub.loadAllDataFailedAction.invoke(exception);
            } else {
                this._actionsHub.loadMyDataFailedAction.invoke(exception);
            }
        };
    }

    private _verifyAndReportValidData(pageData: IDirectoryData, errorHandler: (error: Error, exceptionInfo?: ExceptionInfo) => void) {
        if (!pageData) {
            errorHandler(new Error("The data provider didn't return any data"), { exceptionMessage: "Server returned no response" });
            return false;
        } else if (pageData.exceptionInfo) {
            errorHandler(new Error(`The data provider contained exception info: ${JSON.stringify(pageData.exceptionInfo)}`), pageData.exceptionInfo);
            return false;
        } else if (!pageData.teams) {
            errorHandler(new Error("The data provider returned invalid data. Teams is null"), { exceptionMessage: "The server returned an invalid response" });
            return false;
        } else if (!pageData.favorites) {
            errorHandler(new Error("The data provider returned invalid data. Favorites is null"), { exceptionMessage: "The server returned an invalid response" });
            return false;
        }

        return true;
    }

    private _parseFilterState(filterStateJson: string): IFilterState {
        let result: IFilterState = {};

        if (filterStateJson && filterStateJson.trim()) {
            try {
                result = JSON.parse(filterStateJson);
            } catch (error) {
                publishErrorToTelemetry(error);
            }
        }

        return result;
    }

    private _getFilterTelemetryValues(filterState: IFilterState): object {
        const isKeywordOn = !!filterState[DirectoryConstants.KeywordFilterItemKey] && filterState[DirectoryConstants.KeywordFilterItemKey].value && filterState[DirectoryConstants.KeywordFilterItemKey].value.trim();
        const teamCount = filterState[DirectoryConstants.TeamFilterItemKey] && filterState[DirectoryConstants.TeamFilterItemKey].value ? Object.keys(filterState[DirectoryConstants.TeamFilterItemKey].value).length : 0;

        return {
            [DirectoryUsageTelemetryConstants.FILTER_STATE_ON]: isKeywordOn || teamCount > 0,
            [DirectoryUsageTelemetryConstants.KEYWORD_FILTER_ON]: isKeywordOn,
            [DirectoryUsageTelemetryConstants.TEAM_FILTER_COUNT]: teamCount
        };
    }
}

export function createBoardsDirectoryActionCreator(actionsHub: DirectoryActions) {
    return new DirectoryActionsCreator(
        new DirectoryDataProvider(BoardsDirectoryConstants.BOARD_DIRECTORY_ALL_DATA_PROVIDER, BoardsDirectoryConstants.BOARD_DIRECTORY_MINE_DATA_PROVIDER),
        new DirectoryFavoriteService(FavoriteTypes.WORK_TEAMBOARD),
        actionsHub,
        BoardsHubConstants.HUB_NAME
    );
}

export function createBacklogsDirectoryActionCreator(actionsHub: DirectoryActions) {
    return new DirectoryActionsCreator(
        new DirectoryDataProvider(BacklogsHubDirectoryConstants.BACKLOG_DIRECTORY_ALL_DATA_PROVIDER, BacklogsHubDirectoryConstants.BACKLOG_DIRECTORY_MINE_DATA_PROVIDER),
        new DirectoryFavoriteService(FavoriteTypes.WORK_TEAMBACKLOG),
        actionsHub,
        BacklogsHubConstants.HUB_NAME
    );
}

export function createSprintsDirectoryActionCreator(actionsHub: DirectoryActions) {
    return new DirectoryActionsCreator(
        new DirectoryDataProvider(SprintsDirectoryConstants.SPRINT_DIRECTORY_ALL_DATA_PROVIDER, SprintsDirectoryConstants.SPRINT_DIRECTORY_MINE_DATA_PROVIDER),
        new DirectoryFavoriteService(FavoriteTypes.WORK_ITERATION),
        actionsHub,
        SprintsHubConstants.HUB_NAME
    );
}
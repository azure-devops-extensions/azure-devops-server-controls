import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { FavoriteState, IDirectoryData, IFavoriteData, IMyDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ITeam, Team } from "Agile/Scripts/Models/Team";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { Debug } from "VSS/Diag";
import { IStore, Store } from "VSS/Flux/Store";
import { mergeSorted } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { getErrorMessage } from "VSS/VSS";
import { FavoriteConstants } from "Agile/Scripts/Generated/HubConstants";

export interface IDirectoryStore extends IStore {
    /** The sorted teams to display in the all pivot */
    readonly allTeams: Team[];
    /** The sorted member teams */
    readonly myTeams: Team[];
    /** The sortedfavorite teams */
    readonly favoriteTeams: Team[];
    /** The sorted merger of the member and favorite teams */
    readonly myAndFavoriteTeams: Team[];
    /** The favorite objects */
    readonly favorites: IFavoriteData[];
    /** Is all data initialized */
    readonly isAllDataInitialized: boolean;
    /** Is my data initialized */
    readonly isMyDataInitialized: boolean;
    /** The exception info for the all pivot */
    readonly allExceptionInfo: ExceptionInfo;
    /** The exception info for the my pivot */
    readonly myExceptionInfo: ExceptionInfo;

    /**
     * Get a favorite by team id
     * @param teamId Team id
     * @param onlyActive Only return active favorites if set to true
     */
    getFavorite(teamId: string, onlyActive?: boolean): IFavoriteData;

    /**
     * Get a favorite state by team id
     * @param teamId The team id
     */
    getFavoriteState(teamId: string): FavoriteState;

    /** Get a team */
    getTeam(teamId: string): Team;
    /** Get an error for a team */
    getTeamError(teamId: string): string;
    /** Get the collapsed state for a group */
    isGroupCollapsed(groupKey: string): boolean;
}

/** 
 * Contains all the team and favorite information required for Directory pages 
 */
export class DirectoryStore extends Store implements IDirectoryStore {
    private _actionsHub: DirectoryActions;

    // Data
    private _teams: IDictionaryStringTo<Team>;
    private _deletedTeams: IDictionaryStringTo<Team>;

    private _sortedAllTeamIds: string[];
    private _sortedMyTeamIds: string[];

    private _favorites: IDictionaryStringTo<IFavoriteData>;
    private _favoriteStateMap: IDictionaryStringTo<FavoriteState>;

    private _teamErrors: IDictionaryStringTo<string>;

    private _groupCollapsedState: IDictionaryStringTo<boolean>;

    private _allExceptionInfo: ExceptionInfo;
    private _myExceptionInfo: ExceptionInfo;

    // Flags
    private _isAllDataInitialized: boolean;
    private _isMyDataInitialized: boolean;

    public get allTeams(): Team[] {
        return (this._sortedAllTeamIds || []).map(id => this._teams[id]);
    }

    public get myTeams(): Team[] {
        return (this._sortedMyTeamIds || []).map(id => this._teams[id]);
    }

    public get myAndFavoriteTeams(): Team[] {
        let myTeams = this.myTeams;
        const favoriteTeams = this.favoriteTeams;

        // Filter out teams that are already in the favorites list
        myTeams = myTeams.filter((team) => !this.getFavorite(team.id, true /* only active */));

        // Merge the sorted lists
        return mergeSorted(myTeams, favoriteTeams, this._teamComparator);
    }

    public get favorites(): IFavoriteData[] {
        return Object.keys(this._favorites || {}).map((key) => this._favorites[key]);
    }

    public get favoriteTeams(): Team[] {
        return this.favorites
            // Get the teams
            .map((favorite) => favorite.isDeleted ? this._deletedTeams[favorite.artifactId] : this._teams[favorite.artifactId])
            // Sort the resulting teams
            .sort(this._teamComparator);
    }

    public get isAllDataInitialized(): boolean {
        return this._isAllDataInitialized;
    }

    public get isMyDataInitialized(): boolean {
        return this._isMyDataInitialized;
    }

    public get allExceptionInfo(): ExceptionInfo {
        return this._allExceptionInfo;
    }

    public get myExceptionInfo(): ExceptionInfo {
        return this._myExceptionInfo;
    }

    public getFavorite(teamId: string, onlyActive: boolean = false): IFavoriteData {
        const favoriteData: IFavoriteData = this._favorites[teamId];
        if (onlyActive &&
            this._favoriteStateMap[teamId] !== FavoriteState.Favorited && this._favoriteStateMap[teamId] !== FavoriteState.Favoriting) {
            return undefined;
        }

        return favoriteData;
    }

    public getFavoriteState(teamId: string): FavoriteState {
        return this._favoriteStateMap[teamId];
    }

    public getTeam(teamId: string): Team {
        return this._teams[teamId];
    }

    public getTeamError(teamId: string): string {
        return this._teamErrors[teamId];
    }

    public isGroupCollapsed(groupKey: string): boolean {
        return !!this._groupCollapsedState[groupKey];
    }

    constructor(actionsHub: DirectoryActions) {
        super();
        this._actionsHub = actionsHub;

        this._deletedTeams = {};
        this._teams = {};
        this._favorites = {};
        this._favoriteStateMap = {};
        this._teamErrors = {};
        this._groupCollapsedState = {};
        this._isAllDataInitialized = false;
        this._isMyDataInitialized = false;

        // Register listeners
        this._actionsHub.allDataAvailableAction.addListener(this._handleAllDataAvailableAction);
        this._actionsHub.myDataAvailableAction.addListener(this._handleMyDataAvailableAction);
        this._actionsHub.loadAllDataFailedAction.addListener(this._handleLoadAllDataFailedAction);
        this._actionsHub.loadMyDataFailedAction.addListener(this._handleLoadMyDataFailedAction);
        this._actionsHub.invalidateData.addListener(this._handleDataInvalidation);

        this._actionsHub.beginAddFavorite.addListener(this._handleBeginAddFavoriteAction);
        this._actionsHub.addFavoriteFailed.addListener(this._handleAddFavoritesFailedAction);
        this._actionsHub.addFavoriteSuccessful.addListener(this._handleAddFavoriteSucceededAction);
        this._actionsHub.beginRemoveFavorite.addListener(this._handleBeginRemoveFavoriteAction);
        this._actionsHub.removeFavoriteFailed.addListener(this._handleRemoveFavoritesFailedAction);
        this._actionsHub.removeFavoriteSuccessful.addListener(this._handleRemoveFavoriteSucceededAction);

        this._actionsHub.groupToggled.addListener(this._handleGroupToggled);
    }

    private _handleAllDataAvailableAction = (payload: IDirectoryData): void => {
        Debug.assertIsNotNull(payload, "Payload must not be null. A failure action should have been invoked");
        Debug.assertIsArray(payload.teams, "Teams must be not null and an array");

        // Add the teams to the map
        this._addOrUpdateTeams(payload.teams);

        // Get a sorted list of team ids
        this._sortedAllTeamIds = payload.teams
            .sort(this._teamComparator)
            .map(t => t.id);

        // Set the favorites
        this._initializeFavorites(payload.favorites);

        this._isAllDataInitialized = true;
        this.emitChanged();
    }

    private _handleMyDataAvailableAction = (payload: IMyDirectoryData): void => {
        Debug.assertIsNotNull(payload, "Payload must not be null. A failure action should have been invoked");
        Debug.assertIsArray(payload.teams, "Teams must be not null and an array");

        // Add the teams to the map
        this._addOrUpdateTeams(payload.teams);
        this._addOrUpdateTeams(payload.nonMemberTeams);

        // Get a sorted list of team ids
        this._sortedMyTeamIds = payload.teams
            .sort(this._teamComparator)
            .map(t => t.id);

        // Set the favorites
        this._initializeFavorites(payload.favorites);
        this._isMyDataInitialized = true;
        this.emitChanged();
    }

    private _handleLoadAllDataFailedAction = (exceptionInfo: ExceptionInfo): void => {
        this._allExceptionInfo = exceptionInfo;
        this._isAllDataInitialized = true;
        this.emitChanged();
    }

    private _handleLoadMyDataFailedAction = (exceptionInfo: ExceptionInfo): void => {
        this._myExceptionInfo = exceptionInfo;
        this._isMyDataInitialized = true;
        this.emitChanged();
    }

    private _handleDataInvalidation = (): void => {
        this._sortedAllTeamIds = [];
        this._sortedMyTeamIds = [];
        this._teams = {};
        this._favorites = {};
        this._favoriteStateMap = {};
        this._teamErrors = {};
        this._groupCollapsedState = {};
        this._isAllDataInitialized = false;
        this._isMyDataInitialized = false;

        this.emitChanged();
    }

    private _handleBeginAddFavoriteAction = (teamId: string): void => {
        this._favoriteStateMap[teamId] = FavoriteState.Favoriting;
        delete this._teamErrors[teamId];
        this.emitChanged();
    }

    private _handleAddFavoriteSucceededAction = (favoriteData: IFavoriteData): void => {
        this._favorites[favoriteData.artifactId] = favoriteData;
        this._favoriteStateMap[favoriteData.artifactId] = FavoriteState.Favorited;
        this.emitChanged();
    }

    private _handleAddFavoritesFailedAction = (payload: { error: TfsError, teamId: string }): void => {
        this._favoriteStateMap[payload.teamId] = FavoriteState.Unfavorited;
        this._teamErrors[payload.teamId] = `${AgileResources.Directory_FavoriteFailed}: ${getErrorMessage(payload.error)}`;
        this.emitChanged();
    }

    private _handleBeginRemoveFavoriteAction = (teamId: string): void => {
        this._favoriteStateMap[teamId] = FavoriteState.Unfavoriting;
        delete this._teamErrors[teamId];
        this.emitChanged();
    }

    private _handleRemoveFavoriteSucceededAction = (teamId: string): void => {
        const favorite = this._favorites[teamId];
        delete this._favorites[teamId];

        if (favorite.isDeleted) {
            // Remove board-row from view if user is unfavoriting a deleted item
            delete this._favoriteStateMap[teamId];
            delete this._deletedTeams[teamId];
        } else {
            this._favoriteStateMap[teamId] = FavoriteState.Unfavorited;
        }

        this.emitChanged();
    }

    private _handleRemoveFavoritesFailedAction = (payload: { error: TfsError, teamId: string }): void => {
        this._favoriteStateMap[payload.teamId] = FavoriteState.Favorited;
        this._teamErrors[payload.teamId] = `${AgileResources.Directory_UnfavoriteFailed}: ${getErrorMessage(payload.error)}`;
        this.emitChanged();
    }

    private _handleGroupToggled = (groupKey: string): void => {
        if (groupKey) {
            this._groupCollapsedState[groupKey] = !this._groupCollapsedState[groupKey];
            this.emitChanged();
        }
    }

    private _addOrUpdateTeams(teams: ITeam[]): void {
        for (const team of teams) {
            this._teams[team.id] = new Team({ id: team.id, name: team.name });
        }
    }

    private _initializeFavorites(favorites: IFavoriteData[]): void {
        this._favorites = {};
        this._favoriteStateMap = {};
        if (favorites && favorites.length > 0) {
            for (const favorite of favorites) {
                this._favorites[favorite.artifactId] = { ...favorite };
                this._favoriteStateMap[favorite.artifactId] = FavoriteState.Favorited;

                if (favorite.isDeleted) {
                    // Create a fake team from the favorite data
                    this._deletedTeams[favorite.artifactId] = new Team({
                        id: favorite.artifactId,
                        name: favorite.artifactProperties[FavoriteConstants.TeamName] || favorite.artifactName
                    });
                }
            }
        }
    }

    private _teamComparator(teamA: Team, teamB: Team): number {
        if (teamA == null && teamB == null) {
            return 0;
        }

        if (teamA == null) {
            return 1;
        }

        if (teamB == null) {
            return -1;
        }

        return localeIgnoreCaseComparer(teamA.name, teamB.name);
    }
}
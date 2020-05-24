import { Favorite } from "Favorites/Contracts";
import { autobind } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestPlanDirectoryActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsCreator";
import { TestPlanDirectoryActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsHub";
import { TestPlanFilterManager } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanFilterManager";
import { DirectoryPivotType, FavoriteState, Filters, IAllTestPlanComponentState, IAllTestPlanPayload, IAllTestPlanInitialPayload, IDirectoryRow, IFavoriteTestPlanData, IMineTestPlanComponentState, IMyFavoriteTestPlanPayload, IMyTestPlanPayload, IMyTestPlanSkinnyPayload, IPivotFilterState, ITeamTestPlanData, ITestPlan, ITestPlanDirectoryFilterBarComponentState, ITestPlanFields, ITestPlanRow, MineTestPlanPivotGroupKeys, TestPlanFilterFieldType, WorkItemField } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";
import { TestPlanDirectoryViewState } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/TestPlanHubViewState";
import { Store as VSSStore } from "VSS/Flux/Store";
import { getService } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { IPickListItem } from "VSSUI/PickList";
import { IFilter } from "VSSUI/Utilities/Filter";

export class TestPlanDirectoryStore extends VSSStore {

    public static getInstance() {
        if (!TestPlanDirectoryStore._instance) {
            TestPlanDirectoryStore._instance = new TestPlanDirectoryStore(TestPlanDirectoryActionsHub.getInstance());
        }
        return TestPlanDirectoryStore._instance;
    }

    public static MY_FAVORITES_EMPTY_CONTENT_ID = "MY_FAVORITES-EMPTY_CONTENT";
    private static _instance: TestPlanDirectoryStore;

    // actions hub
    private _actionsHub: TestPlanDirectoryActionsHub;

    // ArtifactId -> FavoriteId
    private _favoritesMap: IDictionaryStringTo<IFavoriteTestPlanData>;

    // ArtifactId -> Favorite state (i.e., favorited/unfavorited/favoriting/unfavoriting)
    private _favoriteStateMap: IDictionaryStringTo<FavoriteState>;

    // TeamId -> ITeamData
    private _teamsMap: IDictionaryStringTo<ITeamTestPlanData>;

    // TestPlanId -> ITestPlan
    // This is source of truth for test plan meta data
    private _testPlanMap: IDictionaryStringTo<ITestPlan>;

    // pre calculated all pivot test plan rows
    private _allPivotTestPlanRow: ITestPlanRow[];

    // pre calculated all pivot filter state
    private _allPivotFilterState: ITestPlanDirectoryFilterBarComponentState;

    // List of teams for 'All' pivot
    private _allTestPlanData: ITeamTestPlanData[];

    // List of teams for 'Mine' pivot
    private _mineTestPlanData: ITeamTestPlanData[];

    // Loading states for initial loading experience
    private _isMineTestPlanPivotLoading: boolean;
    private _isAllTestPlanPivotLoading: boolean;

    // Default states for 'Mine' pivot groups (groupId => isExpanded)
    private _expansionStatesMap: IDictionaryStringTo<boolean>;

    // Filter manager.
    private _filterManager: TestPlanFilterManager;

    // Current pivot.
    private _currentPivot: DirectoryPivotType;

    constructor(actionsHub: TestPlanDirectoryActionsHub) {
        super();
        this._resetToUninitializedState();

        this._actionsHub = actionsHub;
        this._addActionListeners();
    }

    public dispose() {
        this._removeActionListeners();
    }

    public initializeCurrentPivot(pivot: DirectoryPivotType): void {
        this._currentPivot = pivot;
    }

    public initializeFilterManager(
        actionsCreator: TestPlanDirectoryActionsCreator,
        hubViewState: TestPlanDirectoryViewState) {

        if (!this._filterManager) {
            this._filterManager = new TestPlanFilterManager(actionsCreator, hubViewState, this._currentPivot);
        } else {
            this._filterManager.update(actionsCreator, hubViewState, this._currentPivot);
        }
    }

    public getFilterManager(): TestPlanFilterManager {
        return this._filterManager;
    }

    /**
     *  get requried state for all test plan view
     */
    public getAllTestPlanState(): IAllTestPlanComponentState {
        const pivotFilterInitialized: boolean = (this._filterManager) ?
            this._filterManager.isPivotFilterInitialized(DirectoryPivotType.all) :
            false;

        // Return loading state if the data is being fetched
        if (this._isAllTestPlanPivotLoading) {
            return {
                isLoading: true,
                isPivotFilterInitialized: pivotFilterInitialized,
                items: [],
                sortedColumn: null,
                isSortedDescending: null
            };
        }

        const activeFilter: IFilter = this._filterManager.getFilter();
        const items: IDirectoryRow[] = []; //result items
        const rows: IDirectoryRow[] = [];

        for (const row of this._allPivotTestPlanRow) {
            const testPlan = this._testPlanMap[row.testPlanId];
            const favoriteId = (this._favoritesMap && this._favoritesMap[testPlan.id]) ? this._favoritesMap[testPlan.id].id : null;
            const testPlanRow = {
                isGroupRow: false,
                directoryRow: {
                    title: testPlan.name,
                    favoriteId: favoriteId,
                    color: Utils_String.empty,
                    favoriteState: this._favoriteStateMap[testPlan.id] || FavoriteState.Unfavourited,
                    teamName: row.teamName,
                    teamId: row.teamId,
                    testPlanId: testPlan.id,
                    fields: testPlan.fields
                } as ITestPlanRow
            };

            // Add to items if the filter criteria is met
            if (this._itemMatchesFilter(activeFilter, testPlanRow.directoryRow)) {
                rows.push(testPlanRow);
            }
        }

        // Column sorting is disabled in this view, so sort ascending by default
        items.push(...rows);

        const comparer: IComparer<IDirectoryRow> = (a: IDirectoryRow, b: IDirectoryRow) => {
            return (a.directoryRow as ITestPlanRow).testPlanId - (b.directoryRow as ITestPlanRow).testPlanId;
        };

        // Return result
        return {
            isLoading: false,
            isPivotFilterInitialized: pivotFilterInitialized,
            items: Utils_Array.unique(items, comparer),
            sortedColumn: null,
            isSortedDescending: false,
            isFiltered: this._filterManager.isFilterOn(activeFilter)
        };
    }

    /**
     * get requried state for mine test plan view
     */
    public getMineTestPlanState(): IMineTestPlanComponentState {

        const pivotFilterInitialized: boolean = (this._filterManager) ?
            this._filterManager.isPivotFilterInitialized(DirectoryPivotType.mine) :
            false;

        // Return loading state if the data is being fetched
        if (this._isMineTestPlanPivotLoading) {
            return {
                isLoading: true,
                isPivotFilterInitialized: pivotFilterInitialized,
                items: [],
                sortedColumn: null,
                isSortedDescending: null
            };
        }

        let items: IDirectoryRow[] = []; //result items
        const teamToTestPlanMap = this._getMineTeamToTestPlanMap();
        const activeFilter: IFilter = this._filterManager.getFilter();

        if (this._filterManager.isFilterOn(activeFilter)) {
            // Flattern the list if view is filtered

            for (const team of Object.keys(teamToTestPlanMap)) {
                items.push(...teamToTestPlanMap[team]);
            }

            // Add favorites from other teams (teamToTestPlanMap above only has testplan from 'my' teams)
            const favorites: IDirectoryRow[] = this._getMineTestPlanFavorites();
            items = items.concat(favorites.filter(fav => fav.directoryRow.title));

            const comparer: IComparer<IDirectoryRow> = (a: IDirectoryRow, b: IDirectoryRow) => {
                return (a.directoryRow as ITestPlanRow).testPlanId - (b.directoryRow as ITestPlanRow).testPlanId;
            };

            // Return result
            return {
                isLoading: false,
                isPivotFilterInitialized: pivotFilterInitialized,
                items: Utils_Array.unique(items, comparer),
                sortedColumn: null,
                isSortedDescending: false,
                isFiltered: true
            };
        }

        /**
         * FAVORITES GROUP
         */

        // Check expansion state, 'My Favorites' is expanded by default
        if (!this._expansionStatesMap.hasOwnProperty(MineTestPlanPivotGroupKeys.FavoritesGroupKey)) {
            this._expansionStatesMap[MineTestPlanPivotGroupKeys.FavoritesGroupKey] = true;
        }

        // Push group header rows into items.  We are pushing all rows (even Favorite/Team row groups) as items
        // to be rendered as DetailsRows.
        items.push({
            isGroupRow: true,
            directoryRow: {
                title: Resources.MyFavoritesText,
                isCollapsed: !this._expansionStatesMap[MineTestPlanPivotGroupKeys.FavoritesGroupKey],
                teamId: MineTestPlanPivotGroupKeys.FavoritesGroupKey,
                showTeamIcon: false
            }
        } as IDirectoryRow);

        // Get mine test plan favorites
        const favorites: IDirectoryRow[] = this._getMineTestPlanFavorites();

        if (this._expansionStatesMap[MineTestPlanPivotGroupKeys.FavoritesGroupKey]) {
            // Column sorting is disabled in this view, so sort ascending by default
            items.push(...favorites.sort((i1, i2) => {
                const row1 = i1.directoryRow as ITestPlanRow;
                const row2 = i2.directoryRow as ITestPlanRow;
                return Utils_String.ignoreCaseComparer(row1.title, row2.title);
            }));
        }

        /**
         * OTHER GROUPS
         */

        for (const teamInfo of this._mineTestPlanData) {
            const teamId = teamInfo.id;
            if (!this._expansionStatesMap.hasOwnProperty(teamId)) {
                // All group rows except favorites are collapsed by default
                this._expansionStatesMap[teamId] = false;
            }

            const teamName = teamInfo.name;

            items.push({
                isGroupRow: true,
                directoryRow: {
                    isCollapsed: !this._expansionStatesMap[teamId],
                    showTeamIcon: true,
                    teamId: teamId,
                    title: teamName
                }
            }
            );
            if (this._expansionStatesMap[teamId] === true) {
                items.push(...teamToTestPlanMap[teamId]);
            }
        }

        // Return result
        return {
            isLoading: false,
            isPivotFilterInitialized: pivotFilterInitialized,
            items: items,
            sortedColumn: null,
            isSortedDescending: false,
            isFiltered: false
        };
    }

    public getPivotFilterBarState(): ITestPlanDirectoryFilterBarComponentState {
        let teamData: ITeamTestPlanData[] = [];
        let favoriteIds: string[] = [];
        let isLoading: boolean = null;
        const activeFilter: IFilter = this._filterManager.getFilter();

        switch (this._currentPivot) {
            case DirectoryPivotType.all:
                if (this._allPivotFilterState) {
                    return this._allPivotFilterState;
                }
                teamData = this._allTestPlanData;
                isLoading = this._isAllTestPlanPivotLoading;
                break;
            case DirectoryPivotType.mine:
                teamData = this._mineTestPlanData;
                favoriteIds = Object.keys(this._favoritesMap);
                isLoading = this._isMineTestPlanPivotLoading;
                break;
            default:
                //  Can't build state for a non-supported pivot type.
                return null;
        }

        return this._getPivotFilterState(teamData, favoriteIds, isLoading, activeFilter);
    }

    private _addActionListeners(): void {

        // Attach data available events
        this._actionsHub.allTestPlanPageInitialDataAvailableAction.addListener(this._handleAllTestPlanPageInitialDataAvailableAction);
        this._actionsHub.allTestPlanPageDataAvailableAction.addListener(this._handleAllTestPlanPageDataAvailableAction);
        this._actionsHub.myTestPlanPageDataAvailableAction.addListener(this._handleMyTestPlanDataAvailable);
        this._actionsHub.mySkinnyTestPlanPageDataAvailableAction.addListener(this._handleMySkinnyTestPlanDataAvailable);
        this._actionsHub.myFavoriteTestPlanDataAvailableAction.addListener(this._handleMyFavoriteTestPlanDataAvailable);
        this._actionsHub.testPlanMetaDataAvailableAction.addListener(this._handletestPlanMetaDataAvailableAction);
        this._actionsHub.favoritesDataAvailableAction.addListener(this._handleFavoritesDataAvailableAction);

        // Attach expand/collapse actions
        this._actionsHub.expandGroupRow.addListener(this._handleExpandGroupRow);
        this._actionsHub.collapseGroupRow.addListener(this._handleCollapseGroupRow);

        // Attach favorites action events
        this._actionsHub.beginAddToFavorites.addListener(this._handleBeginAddToFavorites);
        this._actionsHub.endAddToFavorites.addListener(this._handleEndAddToFavorites);
        this._actionsHub.addToFavoritesFailed.addListener(this._handleAddToFavoritesFailed);
        this._actionsHub.beginRemoveFromFavorites.addListener(this._handleBeginRemoveFromFavorites);
        this._actionsHub.endRemoveFromFavorites.addListener(this._handleEndRemoveFromFavorites);
        this._actionsHub.removeFromFavoritesFailed.addListener(this._handleRemoveFromFavoritesFailed);
        this._actionsHub.planPatched.addListener(this._handlePlanPatched);
        this._actionsHub.planDeleted.addListener(this._handlePlanDeleted);

        // Attach pivotSwitched action
        this._actionsHub.pivotSwitched.addListener(this._handlePivotSwitched);

        // Attach filter changed action
        this._actionsHub.pivotFilterChanged.addListener(this._handlePivotFilterChanged);
    }

    private _removeActionListeners(): void {

        // remove data available events listener
        this._actionsHub.allTestPlanPageDataAvailableAction.removeListener(this._handleAllTestPlanPageDataAvailableAction);
        this._actionsHub.myFavoriteTestPlanDataAvailableAction.removeListener(this._handleMyFavoriteTestPlanDataAvailable);
        this._actionsHub.myTestPlanPageDataAvailableAction.removeListener(this._handleMyTestPlanDataAvailable);
        this._actionsHub.mySkinnyTestPlanPageDataAvailableAction.removeListener(this._handleMySkinnyTestPlanDataAvailable);
        this._actionsHub.testPlanMetaDataAvailableAction.removeListener(this._handletestPlanMetaDataAvailableAction);
        this._actionsHub.favoritesDataAvailableAction.removeListener(this._handleFavoritesDataAvailableAction);

        // remove expand/collapse actions listener
        this._actionsHub.expandGroupRow.removeListener(this._handleExpandGroupRow);
        this._actionsHub.collapseGroupRow.removeListener(this._handleCollapseGroupRow);

        // remove favorites action events listener
        this._actionsHub.beginAddToFavorites.removeListener(this._handleBeginAddToFavorites);
        this._actionsHub.endAddToFavorites.removeListener(this._handleEndAddToFavorites);
        this._actionsHub.addToFavoritesFailed.removeListener(this._handleAddToFavoritesFailed);
        this._actionsHub.beginRemoveFromFavorites.removeListener(this._handleBeginRemoveFromFavorites);
        this._actionsHub.endRemoveFromFavorites.removeListener(this._handleEndRemoveFromFavorites);
        this._actionsHub.removeFromFavoritesFailed.removeListener(this._handleRemoveFromFavoritesFailed);
        this._actionsHub.planPatched.removeListener(this._handlePlanPatched);

        // remove pivotSwitched action listener
        this._actionsHub.pivotSwitched.removeListener(this._handlePivotSwitched);

        // remove filter changed action
        this._actionsHub.pivotFilterChanged.removeListener(this._handlePivotFilterChanged);

    }

    /**
     *  get mine team and test plan mapping
     */
    private _getMineTeamToTestPlanMap(): IDictionaryStringTo<IDirectoryRow[]> {

        // Each team corresponds to a group in the view. Use map (teamId -> testplanRow) for quick retreival
        const teamToTestPlanMap: IDictionaryStringTo<IDirectoryRow[]> = {};
        const activeFilter: IFilter = this._filterManager.getFilter();

        for (const teamInfo of this._mineTestPlanData) {

            const testPlans = teamInfo.testPlans;
            for (let testPlan of testPlans) {

                if (this._testPlanMap[testPlan.id].loaded) {
                    testPlan = this._testPlanMap[testPlan.id];
                    const favoriteId = (this._favoritesMap && this._favoritesMap[testPlan.id]) ? this._favoritesMap[testPlan.id].id : null;
                    const testPlanRow = {
                        isGroupRow: false,
                        directoryRow: {
                            title: testPlan.name,
                            favoriteId: favoriteId,
                            color: Utils_String.empty,
                            favoriteState: this._favoriteStateMap[testPlan.id] || FavoriteState.Unfavourited,
                            teamName: teamInfo.name,
                            teamId: teamInfo.id,
                            testPlanId: testPlan.id,
                            fields: testPlan.fields
                        } as ITestPlanRow
                    };

                    // Add row to lookup if filter criteria is met
                    if (this._itemMatchesFilter(activeFilter, testPlanRow.directoryRow as ITestPlanRow)) {
                        if (!teamToTestPlanMap[teamInfo.id]) {
                            teamToTestPlanMap[teamInfo.id] = [testPlanRow];
                        } else {
                            teamToTestPlanMap[teamInfo.id].push(testPlanRow);
                        }
                    }

                }
            }
        }

        return teamToTestPlanMap;
    }

    /**
     * @param favorites
     */
    private _getMineTestPlanFavorites(): IDirectoryRow[] {
        const favorites: IDirectoryRow[] = [];
        const favoritedItemsIds = Object.keys(this._favoritesMap);
        if (!favoritedItemsIds || favoritedItemsIds.length === 0) {
            // Handle empty favorites
            return [{
                isGroupRow: false,
                directoryRow: {
                    title: null,
                    favoriteState: FavoriteState.Unfavourited,
                    favoriteId: null,
                    teamName: null,
                    teamId: TestPlanDirectoryStore.MY_FAVORITES_EMPTY_CONTENT_ID
                } as ITestPlanRow
            }];
        }

        const activeFilter: IFilter = this._filterManager.getFilter();

        for (const artifactId of Object.keys(this._favoritesMap)) {

            const artifact = this._favoritesMap[artifactId].testPlan;
            const testPlanRow = {
                isGroupRow: false,
                directoryRow: {
                    title: artifact.name,
                    favoriteId: this._favoritesMap[artifactId] ? this._favoritesMap[artifactId].id : null,
                    color: Utils_String.empty,
                    favoriteState: this._favoriteStateMap[artifactId] || FavoriteState.Unfavourited,
                    teamName: null,
                    teamId: null,
                    testPlanId: artifact.id,
                    fields: artifact.fields
                } as ITestPlanRow
            };

            if (this._itemMatchesFilter(activeFilter, testPlanRow.directoryRow)) {
                favorites.push(testPlanRow);
            }

        }

        return favorites;
    }

    /**
     * Handle data available action
     * This will save the new rows for the pivot and update loading to false
     * Note: The rows are sorted ascending on 'name' column by default
     * @param data IAllTestPlanPayload
     */
    @autobind
    private _handleAllTestPlanPageInitialDataAvailableAction(data: IAllTestPlanInitialPayload): void {

        this._isAllTestPlanPivotLoading = false;

        this._allTestPlanData = data.teams;

        this._initializeTeamAndTestPlanMap(this._allTestPlanData);

        this.emitChanged();
    }

    /**
     * Handle data available action
     * This will append the new rows for the pivot
     * Note: The rows are sorted ascending on 'name' column by default
     * @param data IAllTestPlanPayload
     */
    @autobind
    private _handleAllTestPlanPageDataAvailableAction(data: IAllTestPlanPayload): void {

        this._isAllTestPlanPivotLoading = false;

        this._allTestPlanData = data.teams;
        this._filterManager.initializePivotFilterState(
            DirectoryPivotType.all,
            getService(TestPlansHubSettingsService).userOptions.allPlansFilterState);

        this._initializeTeamAndTestPlanMap(this._allTestPlanData);

        this.emitChanged();
    }

    /**
     * Handle data available action
     * This will save the new rows for the pivot and update loading to false
     * Note: The rows are sorted ascending on 'name' column by default
     * @param data IMineTestPlanPayload
     */
    @autobind
    private _handleMyFavoriteTestPlanDataAvailable(data: IMyFavoriteTestPlanPayload): void {

        this._isMineTestPlanPivotLoading = false;
        this._onFavoriteTestPlansAvailable(data.favorites);
        this.emitChanged();
    }

    @autobind
    private _handleMyTestPlanDataAvailable(data: IMyTestPlanPayload): void {
        this._isMineTestPlanPivotLoading = false;

        this._onTestPlanDataAvailable(data.teams);
        this._onFavoriteTestPlansAvailable(data.favorites);

        this.emitChanged();
    }  

    @autobind
    private _handleMySkinnyTestPlanDataAvailable(data: IMyTestPlanSkinnyPayload) {
        this._onTestPlanDataAvailable(data.teams);
        this.emitChanged();
    }

    private _onFavoriteTestPlansAvailable(favorites: IFavoriteTestPlanData[]) {
        if (favorites && favorites.length > 0) {
            for (const favorite of favorites) {
                this._favoritesMap[favorite.testPlan.id] = {
                    testPlan: favorite.testPlan,
                    id: favorite.id
                };

                // updating test plan map based on favorites data
                this._updateTestPlanMapWhenLoaded(favorite.testPlan);

                this._favoriteStateMap[favorite.testPlan.id] = FavoriteState.Favorited;
            }
        }

    }

    private _onTestPlanDataAvailable(data: ITeamTestPlanData[]) {
        this._mineTestPlanData = data;
        this._filterManager.initializePivotFilterState(
            DirectoryPivotType.mine,
            getService(TestPlansHubSettingsService).userOptions.myPlansFilterState);
        this._initializeTeamAndTestPlanMap(this._mineTestPlanData);
    }


    /**
     * Handle action when testplan meta data is fetched
     * This will reload test plan details for teams
     * @param testPlanMap
     */
    @autobind
    private _handletestPlanMetaDataAvailableAction(testPlanMap: IDictionaryStringTo<ITestPlan>): void {

        for (const planId of Object.keys(testPlanMap)) {
            this._updateTestPlanMapWhenLoaded(testPlanMap[planId]);
        }

        this._updateStoreWithTestPlanMetaData();
        this.emitChanged();
    }

    /**
     * Handle favorites data available action
     * @param favorites
     */
    @autobind
    private _handleFavoritesDataAvailableAction(favorites: Favorite[]): void {
        this._favoritesMap = {}; // Clear favorites map and repopulate with latest favorites
        this._favoriteStateMap = {}; // Clear favorites state map
        if (favorites && favorites.length > 0) {
            for (const favorite of (favorites)) {
                this._favoritesMap[favorite.artifactId] = this._getFavoriteTestPlanData(favorite);
                this._favoriteStateMap[favorite.artifactId] = FavoriteState.Favorited;
            }
        }
        this.emitChanged();
    }

    /**
     * Handle expand group row
     * @param groupKey
     */
    @autobind
    private _handleExpandGroupRow(groupKey: string): void {
        // Update expansions state map and emit changed to update the UI components
        this._expansionStatesMap[groupKey] = true;
        this.emitChanged();
    }

    /**
     * Handle collapse group row
     * @param groupKey
     */
    @autobind
    private _handleCollapseGroupRow(groupKey: string): void {
        // Update expansions state map and emit changed to update the UI components
        this._expansionStatesMap[groupKey] = false;
        this.emitChanged();
    }

    /**
     * Handle begin add to favorites
     * @param teamId
     */
    @autobind
    private _handleBeginAddToFavorites(item: ITestPlanRow): void {
        const key = item.testPlanId;
        this._favoriteStateMap[key] = FavoriteState.Favoriting;
        this.emitChanged();
    }

    /**
     * Handle end add to favorites
     * @param favorite
     */
    @autobind
    private _handleEndAddToFavorites(favorite: Favorite): void {
        this._favoritesMap[favorite.artifactId] = this._getFavoriteTestPlanData(favorite);
        this._favoriteStateMap[favorite.artifactId] = FavoriteState.Favorited;
        this.emitChanged();
    }

    /**
     * Handle add to favorites failed action
     * @param favorite
     */
    @autobind
    private _handleAddToFavoritesFailed(item: ITestPlanRow): void {
        const key = item.testPlanId;
        this._favoriteStateMap[key] = FavoriteState.Unfavourited;
        this.emitChanged();
    }

    /**
     * Handle begin remove from favorites
     * @param favoriteId
     */
    @autobind
    private _handleBeginRemoveFromFavorites(item: ITestPlanRow): void {
        const key = item.testPlanId;
        this._favoriteStateMap[key] = FavoriteState.Unfavoriting;
        this.emitChanged();
    }

    /**
     * Handle end remove from favorites
     * @param favoriteId
     */
    @autobind
    private _handleEndRemoveFromFavorites(item: ITestPlanRow): void {
        const key = item.testPlanId;
        if (item.isDeleted) {
            // Remove testplan-row from view if user is unfavoriting a deleted item
            delete this._favoritesMap[key];
            delete this._favoriteStateMap[key];
        }
        else {
            this._favoriteStateMap[key] = FavoriteState.Unfavourited;
        }
        this.emitChanged();
    }

    /**
     * Handle remove from favorites failed action
     * @param favorite
     */
    @autobind
    private _handleRemoveFromFavoritesFailed(item: ITestPlanRow): void {
        const key = item.testPlanId;
        this._favoriteStateMap[key] = FavoriteState.Favorited;
        this.emitChanged();
    }

    @autobind
    private _handlePlanPatched(row: ITestPlanRow): void {
        const key = row.testPlanId;

        Object.assign<ITestPlan, Partial<ITestPlan>>(this._testPlanMap[key], { name: row.title });
        Object.assign<ITestPlanFields, Partial<ITestPlanFields>>(this._testPlanMap[key].fields, row.fields);

        if (this._favoritesMap && this._favoritesMap[key]) {
            Object.assign<ITestPlan, Partial<ITestPlan>>(this._favoritesMap[key].testPlan, { name: row.title });
            Object.assign<ITestPlanFields, Partial<ITestPlanFields>>(this._favoritesMap[key].testPlan.fields, row.fields);
        }

        this.emitChanged();
    }

    @autobind
    private _handlePlanDeleted(testPlanId: number): void {

        delete this._testPlanMap[testPlanId];

        const rowIndex = this._allPivotTestPlanRow.findIndex(row => row.testPlanId === testPlanId);
        this._allPivotTestPlanRow.splice(rowIndex, 1);

        this._allTestPlanData.forEach(planData => {
            planData.testPlans = planData.testPlans.filter(plan => plan.id !== testPlanId);
        });

        this._mineTestPlanData.forEach(planData => {
            planData.testPlans = planData.testPlans.filter(plan => plan.id !== testPlanId);
        });

        if (this._favoritesMap && this._favoritesMap[testPlanId]) {
            delete this._favoritesMap[testPlanId];
        }

        this.emitChanged();
    }

    /**
     * Handle pivot switched event
     * @param pivotKey
     */
    @autobind
    private _handlePivotSwitched(pivotKey: string): void {
        // Cleanup favorites map
        const keys = Object.keys(this._favoritesMap);
        for (const key of keys) {
            if (this._favoriteStateMap[key] === FavoriteState.Unfavourited) {
                delete this._favoritesMap[key];
            }
        }

        const newPivot: DirectoryPivotType = pivotKey === DirectoryPivotType.all ? DirectoryPivotType.all : DirectoryPivotType.mine;

        if (newPivot !== this._currentPivot) {
            const oldPivot: DirectoryPivotType = this._currentPivot;
            this._currentPivot = newPivot;
            this._filterManager.setCurrentPivot(newPivot);

            //  Pivot changed. Need to refresh filter bar.
            this.emitChanged();
        }
    }

    /**
     * Handle pivot filter changed event
     * @param filter
     */
    @autobind
    private _handlePivotFilterChanged(pivotState: IPivotFilterState): void {
        this.emitChanged();
    }

    /**
     * All view data would be static and big compared to mine view.
       pre calculating grid and filter state for all view
     */
    private _updateStoreWithTestPlanMetaData() {

        this._allPivotFilterState = this._getPivotFilterState(this._allTestPlanData,
            [],
            this._isAllTestPlanPivotLoading,
            this._filterManager.getFilter());

        const rows: ITestPlanRow[] = [];
        // Iterate through all the teams and popluate row items
        for (const teamInfo of this._allTestPlanData) {
            let testPlans = teamInfo.testPlans;
            for (let testPlan of testPlans) {

                if (this._testPlanMap[testPlan.id].loaded) {
                    testPlan = this._testPlanMap[testPlan.id];
                    const testPlanRow = {
                        title: testPlan.name,
                        favoriteId: Utils_String.empty,
                        color: Utils_String.empty,
                        favoriteState: null,
                        teamName: teamInfo.name,
                        teamId: teamInfo.id,
                        testPlanId: testPlan.id,
                        fields: null
                    } as ITestPlanRow;

                    rows.push(testPlanRow);
                }
            }
        }

        this._allPivotTestPlanRow = [];
        // Column sorting is disabled in this view, so sort ascending by default
        this._allPivotTestPlanRow.push(...rows.sort((i1, i2) => {
            return Utils_String.ignoreCaseComparer(i1.title, i2.title);
        }));

    }

    /**
     * Get favoriteTestPlanData from favorite artifact
     * @param favorite
     */
    private _getFavoriteTestPlanData(favorite: Favorite): IFavoriteTestPlanData {
        return {
            testPlan: this._testPlanMap[favorite.artifactId],
            id: favorite.id
        } as IFavoriteTestPlanData;
    }

    private _initializeTeamAndTestPlanMap(teams: ITeamTestPlanData[]): void {

        for (const team of teams) {
            this._teamsMap[team.id] = team;

            const testPlans = team.testPlans;
            for (let testPlan of testPlans) {
                if (!this._testPlanMap[testPlan.id]) {
                    this._testPlanMap[testPlan.id] = testPlan;
                }
            }
        }
    }

    private _updateTestPlanMapWhenLoaded(testPlan: ITestPlan): void {
        this._testPlanMap[testPlan.id] = testPlan;
        this._testPlanMap[testPlan.id].loaded = true;
    }

    /**
     * Returns true if the testplan item matches the filter
     * @param testPlanRow testplan row-item
     */
    private _itemMatchesFilter(
        activeFilter: IFilter,
        testPlanRow: ITestPlanRow): boolean {
        let result: boolean = true;

        if (this._filterManager.isFilterOn(activeFilter)) {

            for (const filterItem of Filters.Items) {

                let tempResult: boolean;
                const filterValue: string[] | string = this._filterManager.getSelectedFilterItemValue(activeFilter, filterItem);

                if (filterItem.displayType === TestPlanFilterFieldType.Text) {

                    tempResult = (filterValue) ?
                        (
                            Utils_String.caseInsensitiveContains(testPlanRow.title, filterValue as string)
                        ) : true;

                } else {
                    const fieldValue = this._getFieldValue(filterItem.fieldName, testPlanRow);

                    tempResult = (filterValue) ?
                        Utils_Array.arrayContains<string, string>(
                            fieldValue,
                            filterValue as string[],
                            (a, b) => Utils_String.equals(a, b, /* ignoreCase */ true)) :
                        true;
                }

                result = result && tempResult;
            }
        }

        return result;
    }

    private _getFieldValue(fieldName: string, testPlanRow: ITestPlanRow): string {
        switch (fieldName) {
            case Filters.TeamFilterItemKey:
                return testPlanRow.teamName;
            case Filters.StateFilterItemKey:
                return testPlanRow.fields.state;
            case Filters.IterationFilterItemKey:
                return testPlanRow.fields.iterationPath;
        }
    }

    private _getPivotFilterState(
        teams: ITeamTestPlanData[],
        favoriteIds: string[],
        isLoading: boolean,
        activeFilter: IFilter): ITestPlanDirectoryFilterBarComponentState {

        let result: ITestPlanDirectoryFilterBarComponentState = null;
        let fields: IDictionaryStringTo<IPickListItem[]> = {};

        // Return loading state if the data is being fetched
        if (!isLoading) {
            fields = this._getFieldsForFilter(teams, favoriteIds);
        }

        result = <ITestPlanDirectoryFilterBarComponentState>{
            isLoading: isLoading,
            selectedPivot: this._currentPivot,
            fields: fields,
            activeFilter: activeFilter
        };

        return result;
    }

    private _getFieldsForFilter(teams: ITeamTestPlanData[],
        favoriteIds: string[]): IDictionaryStringTo<IPickListItem[]> {
        let fields: IDictionaryStringTo<IPickListItem[]> = {};

        for (const filterItem of Filters.Items) {
            if (filterItem.displayType === TestPlanFilterFieldType.CheckboxList) {

                switch (filterItem.fieldName) {
                    case Filters.TeamFilterItemKey:
                        fields[Filters.TeamFilterItemKey] = this._getTeamsForFilter(teams);
                        break;

                    case Filters.StateFilterItemKey:
                        fields[Filters.StateFilterItemKey] = this._getWorkItemFieldForFilter(teams, favoriteIds, WorkItemField.workItemState);
                        break;

                    case Filters.IterationFilterItemKey:
                        fields[Filters.IterationFilterItemKey] = this._getWorkItemFieldForFilter(teams, favoriteIds, WorkItemField.iterationPath);
                        break;

                }
            }
        }
        return fields;
    }

    private _getTeamsForFilter(teamsData: ITeamTestPlanData[]): IPickListItem[] {
        let result: IPickListItem[] = [];

        if (teamsData && teamsData.length > 0) {
            result = teamsData.map((team) => {
                return <IPickListItem>{
                    name: team.name,
                    key: team.name
                };
            });
        }

        //  Sort team names for display.
        result = result.sort(
            (a, b) => {
                return Utils_String.ignoreCaseComparer(a.name, b.name);
            });

        return result;
    }

    private _getWorkItemFieldForFilter(teamsData: ITeamTestPlanData[], favoriteIds: string[], field: string): IPickListItem[] {
        let pickListResult: IPickListItem[] = [];
        let result: string[] = [];
        let testPlanIds: string[] = [];

        // get all test plan ids from favroites and teams information
        for (const team of teamsData) {
            testPlanIds.push(...(team.testPlans.map((testPlan) => {
                return testPlan.id.toString();
            })));
        }
        testPlanIds.push(...favoriteIds);

        for (const id of testPlanIds) {
            if (this._testPlanMap[id] && this._testPlanMap[id].loaded) {

                switch (field) {
                    case WorkItemField.workItemState:
                        result.push(this._testPlanMap[id].fields.state);
                        break;

                    case WorkItemField.iterationPath:
                        result.push(this._testPlanMap[id].fields.iterationPath);
                        break;
                }
            }
        }
        result = result.filter((value, index, self) => self.indexOf(value) === index && value);

        if (result.length > 0) {
            pickListResult = result.map((value) => {
                return <IPickListItem>{
                    name: value,
                    key: value
                };
            });

            //  Sort filter values for display.
            pickListResult = pickListResult.sort(
                (a, b) => {
                    return Utils_String.ignoreCaseComparer(a.name, b.name);
                });
        }

        return pickListResult;
    }

    private _resetToUninitializedState(): void {
        this._favoritesMap = {};
        this._favoriteStateMap = {};
        this._teamsMap = {};
        this._testPlanMap = {};
        this._mineTestPlanData = [];
        this._allTestPlanData = [];
        this._isMineTestPlanPivotLoading = true;
        this._isAllTestPlanPivotLoading = true;
        this._expansionStatesMap = {};
        this._currentPivot = null;
        this._actionsHub = null;
        this._allPivotTestPlanRow = [];
        this._filterManager = null;
        this._allPivotFilterState = null;
    }
}
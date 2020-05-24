import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import * as Favorites_RestClient from "Favorites/RestClient";
import { IFilterState } from "VSSUI/Utilities/Filter";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";

import * as Contracts from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { TestPlanDirectoryActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsHub";
import { TestPlanDirectorySource } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Sources/TestPlanDirectorySource";
import { TestPlanFavoritesSource } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Sources/TestPlanFavoritesSource";
import { TestPlanDirectoryStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";

export class TestPlanDirectoryActionsCreator {

    public static getInstance(): TestPlanDirectoryActionsCreator {
        if (!TestPlanDirectoryActionsCreator._instance) {
            TestPlanDirectoryActionsCreator._instance = new TestPlanDirectoryActionsCreator(
                TestPlanDirectoryActionsHub.getInstance(),
                TestPlanDirectorySource.getInstance(),
                TestPlanFavoritesSource.getInstance());
        }
        return TestPlanDirectoryActionsCreator._instance;
    }
    private static _instance: TestPlanDirectoryActionsCreator;

    private _allTestPlanPromise: IPromise<any>;
    private _myTestPlanPromise: IPromise<any>;
    private _actionsHub: TestPlanDirectoryActionsHub;
    private _source: TestPlanDirectorySource;
    private _favoritesSource: TestPlanFavoritesSource = null;
    private readonly batchSize: number = 200;
    private _isFirstBatch: boolean;

    constructor(actionsHub: TestPlanDirectoryActionsHub,
        source: TestPlanDirectorySource,
        favoritesSource: TestPlanFavoritesSource) {
        this._actionsHub = actionsHub;
        this._source = source;
        this._favoritesSource = favoritesSource;
        this._isFirstBatch = true;
    }

    /**
     * fetch and invoke dataAvailable action
     * 1. fetch page data for all pivot
     * 2. fetch test plan work item details
     */
    public initializeAllTestPlan(): void {
        if (LicenseAndFeatureFlagUtils.isAllTestPlanSkinnyProviderEnabled()) {
            this._source.getAllTestPlanInitialPageData().then((initialPageData: Contracts.IAllTestPlanInitialPayload) => {
                this._publishTelemetry(Contracts.DirectoryPivotType.all, initialPageData.teams);
                this._actionsHub.allTestPlanPageInitialDataAvailableAction.invoke(initialPageData);
                this._actionsHub.testPlanMetaDataAvailableAction.invoke(initialPageData.testPlanMap);
                this._source.getAllTestPlanPageData().then((pageData: Contracts.IAllTestPlanPayload) => {
                    this._publishTelemetry(Contracts.DirectoryPivotType.all, pageData.teams);
                    this._actionsHub.allTestPlanPageDataAvailableAction.invoke(pageData);
                    this._loadTestPlanMetaData(this._getTestplanIdsFromTeams(pageData.teams));
                },
                this._showErrorMessage);
            },
            this._showErrorMessage);
        }
        else {
            this._source.getAllTestPlanPageData().then((pageData: Contracts.IAllTestPlanPayload) => {
                this._publishTelemetry(Contracts.DirectoryPivotType.all, pageData.teams);
                this._actionsHub.allTestPlanPageDataAvailableAction.invoke(pageData);
                this._loadTestPlanMetaData(this._getTestplanIdsFromTeams(pageData.teams));
            },
            this._showErrorMessage);
        }

        this.refreshFavorites();
    }

    /**
     * fetch and invoke dataAvailable action
     * 1. fetch page data for mine pivot
     * 2. fetch test plan work item details
     */
    public initializeMineTestPlan(): void {
        if (LicenseAndFeatureFlagUtils.isMyTestPlanSkinnyProviderEnabled()) {
            this._source.getMyFavoriteTestPlanData().then((pageData: Contracts.IMyFavoriteTestPlanPayload) => {
                this._actionsHub.myFavoriteTestPlanDataAvailableAction.invoke(pageData);
                this._source.getMySkinnyTestPlanData().then((myTestPlans: Contracts.IMyTestPlanSkinnyPayload) => {
                    this._actionsHub.mySkinnyTestPlanPageDataAvailableAction.invoke(myTestPlans);
                    this._loadTestPlanMetaData(this._getTestplanIdsFromTeams(myTestPlans.teams));
                }, (error: Error) => {
                    this.showErrorMessage(error);
                });

            },
                (error: Error) => {
                    this.showErrorMessage(error);
                });
        }
        else {
            this._source.getMyTestPlanPageData().then((pageData: Contracts.IMyTestPlanPayload) => {
                this._publishTelemetry(Contracts.DirectoryPivotType.mine, pageData.teams, pageData.favorites.length);
                this._actionsHub.myTestPlanPageDataAvailableAction.invoke(pageData);
                this._loadTestPlanMetaData(this._getTestplanIdsFromTeams(pageData.teams));
            },
                (error: Error) => {
                    this.showErrorMessage(error);
                });
        }
    }
    /**
     * Initialize favorites and invoke favoritesDataAvailable action
     */
    public refreshFavorites() {
        this._favoritesSource.getFavorites(true).then(
            (favorites: Favorite[]) => {
                this._actionsHub.favoritesDataAvailableAction.invoke(favorites);
            },
            (error: Error) => {
                this.showErrorMessage(error);
            }
        );
    }

    public patchPlan(row: Contracts.ITestPlanRow): void {
        this._actionsHub.planPatched.invoke(row);
    }

    public deletePlan(testPlanId: number): void {
        this._actionsHub.planDeleted.invoke(testPlanId);
    }

    /**
     * Invokes column clicked action
     * @param columnName
     */
    public changeColumnSort(columnName: string): void {
        this._actionsHub.changeColumnSortingAction.invoke(columnName);
    }

    /**
     * Invokes add to favorites action
     * @param item testplan directory row-item
     */
    public favoriteTeamTestPlan(item: Contracts.ITestPlanRow): void {
        // Avoid favoriting the item multiple times. The favorites service allows favoriting
        // the same artifact again, in which case we need to unfavorite multiple times to
        // remove all the favorites
        if (!this._isRowSaving(item)) {
            this._actionsHub.beginAddToFavorites.invoke(item);
            this._favoritesSource.createFavorite(item.title, item.testPlanId.toString()).then(
                (favorite: Favorite) => {
                    this._actionsHub.endAddToFavorites.invoke(favorite);
                },
                (error: Error) => {
                    this.showErrorMessage(error);
                    this._actionsHub.addToFavoritesFailed.invoke(item);
                }
            );
        }

    }

    /**
     * Invokes remove from favorites action
     * @param item testplan directory row-item
     */
    public unfavoriteTeamTestPlan(item: Contracts.ITestPlanRow): void {
        // Avoid favoriting the item multiple times. The favorites service allows favoriting
        // the same artifact again, in which case we need to unfavorite multiple times to
        // remove all the favorites
        if (!this._isRowSaving(item)) {
            this._actionsHub.beginRemoveFromFavorites.invoke(item);
            this._favoritesSource.deleteFavorite(item.favoriteId).then(
                () => {
                    this._actionsHub.endRemoveFromFavorites.invoke(item);
                },
                (error: Error) => {
                    this.showErrorMessage(error);
                    this._actionsHub.removeFromFavoritesFailed.invoke(item);
                }
            );
        }
    }

    /**
     * Pivot is switched
     * initialte all/mine data fetching for first time only
     * @param key
     */
    public pivotSwitched(key: string): void {
        this._actionsHub.pivotSwitched.invoke(key);

        let state: Contracts.ITestPlanDirectoryListComponentState;
        switch (key) {

            case Contracts.DirectoryPivotType.all:
                state = TestPlanDirectoryStore.getInstance().getAllTestPlanState();
                if (state.isLoading) {
                    this.initializeAllTestPlan();
                }
                break;

            case Contracts.DirectoryPivotType.mine:
                state = TestPlanDirectoryStore.getInstance().getMineTestPlanState();
                if (state.isLoading) {
                    this.initializeMineTestPlan();
                }
                break;

        }
    }

    /**
     * Expand group row
     * @param groupId
     */
    public expandGroupRow(groupId: string): void {
        this._actionsHub.expandGroupRow.invoke(groupId);
    }

    /**
     * Collapse group row
     * @param groupId
     */
    public collapseGroupRow(groupId: string): void {
        this._actionsHub.collapseGroupRow.invoke(groupId);
    }

    /**
     * Filter boards in directory view for a given pivot.
     * @param pivot
     * @param filter
     */
    public filterPivotItems(
        pivot: Contracts.DirectoryPivotType,
        filter: IFilterState): void {

        const pivotFilterState: Contracts.IPivotFilterState = {
            filterState: filter,
            pivot: pivot
        };

        this._actionsHub.pivotFilterChanged.invoke(pivotFilterState);
    }

    /**
     * Invoke show error message action and record telemetry
     * @param message
     */
    public showErrorMessage(error: Error): void {
        this._actionsHub.showErrorMessage.invoke(error);
    }
    /**
     * fetching workitem in batches of 200
     * @param ids
     */
    private _loadTestPlanMetaData(ids: number[]): void{
        const idsToFetch = ids.splice(0, this.batchSize);
        if (idsToFetch.length > 0) {

            if (this._isFirstBatch) {
                // Start measuring time taken to fetch metadata for the 1st batch of test plans
                PerformanceUtils.startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.FetchTestPlansMetadata);
                PerformanceUtils.addDataToScenario(TMUtils.TcmPerfScenarios.FetchTestPlansMetadata, { "idsCount": idsToFetch.length });
            }

            this._source.getTestPlanMetaData(idsToFetch).then((testPlanMap: IDictionaryStringTo<Contracts.ITestPlan>) => {

                if (this._isFirstBatch) {
                    // Stop measuring time taken to fetch metadata for the 1st batch
                    PerformanceUtils.endScenario(TMUtils.TcmPerfScenarios.FetchTestPlansMetadata);
                    this._isFirstBatch = false;
                }

                this._actionsHub.testPlanMetaDataAvailableAction.invoke(testPlanMap);
                if (ids.length > 0) {
                    this._loadTestPlanMetaData(ids);
                }
            },
            (error: Error) => {
                PerformanceUtils.abortScenario(TMUtils.TcmPerfScenarios.FetchTestPlansMetadata);
                this.showErrorMessage(error);
            });
        }
    }

    private _getTestplanIdsFromTeams(teams: Contracts.ITeamTestPlanData[]): number[] {
        let idsToFetch: number[] = [];
        for (const team of teams) {
            const testPlans = team.testPlans;
            for (const testPlan of testPlans) {
                const testPlanId = testPlan.id;
                if (!isNaN(testPlanId)) {
                    idsToFetch.push(testPlanId);
                }
            }
        }

        return idsToFetch;
    }

    private _isRowSaving(item: Contracts.ITestPlanRow): boolean {
        return item.favoriteState === Contracts.FavoriteState.Favoriting ||
            item.favoriteState === Contracts.FavoriteState.Unfavoriting;
    }

    private _publishTelemetry(tab: string, teams: Contracts.ITeamTestPlanData[], favorites?: number) {
        let count = 0;
        teams.forEach(team => {
            count += team.testPlans.length;
        });

        TelemetryService.publishEvents(TelemetryService.featureNewTestPlan_Payload, {
            "Tab": tab,
            "TestPlansCount": count,
            "TeamsCount": teams.length,
            "Favorites": favorites
        });
    }

    private _showErrorMessage = (error: Error) => {
        this.showErrorMessage(error);
    }
}

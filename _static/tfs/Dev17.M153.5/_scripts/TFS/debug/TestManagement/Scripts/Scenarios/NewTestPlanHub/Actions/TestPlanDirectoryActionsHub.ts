import { Action } from "VSS/Flux/Action";
import { Favorite } from "Favorites/Contracts";
import {
    IMyTestPlanPayload,
    IAllTestPlanPayload,
    IAllTestPlanInitialPayload,
    ITestPlan,
    ITestPlanRow,
    IMyFavoriteTestPlanPayload,
    IMyTestPlanSkinnyPayload,
    IPivotFilterState
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class TestPlanDirectoryActionsHub {

    public static getInstance(): TestPlanDirectoryActionsHub {
        if (!TestPlanDirectoryActionsHub._instance) {
            TestPlanDirectoryActionsHub._instance = new TestPlanDirectoryActionsHub();
        }
        return TestPlanDirectoryActionsHub._instance;
    }
    private static _instance: TestPlanDirectoryActionsHub;

    public allTestPlanPageInitialDataAvailableAction = this._createAction<IAllTestPlanInitialPayload>();

    public allTestPlanPageDataAvailableAction = this._createAction<IAllTestPlanPayload>();

    public myTestPlanPageDataAvailableAction = this._createAction<IMyTestPlanPayload>();

    public mySkinnyTestPlanPageDataAvailableAction = this._createAction<IMyTestPlanSkinnyPayload>();

    public myFavoriteTestPlanDataAvailableAction = this._createAction<IMyFavoriteTestPlanPayload>();

    public favoritesDataAvailableAction = this._createAction<Favorite[]>();

    public testPlanMetaDataAvailableAction = this._createAction<IDictionaryStringTo<ITestPlan>>();

    public changeColumnSortingAction = this._createAction<string>();

    public expandGroupRow = this._createAction<string>();

    public collapseGroupRow = this._createAction<string>();

    public pivotSwitched = this._createAction<string>();

    public beginAddToFavorites = this._createAction<ITestPlanRow>();

    public endAddToFavorites = this._createAction<Favorite>();

    public addToFavoritesFailed = this._createAction<ITestPlanRow>();

    public beginRemoveFromFavorites = this._createAction<ITestPlanRow>();

    public endRemoveFromFavorites = this._createAction<ITestPlanRow>();

    public removeFromFavoritesFailed = this._createAction<ITestPlanRow>();

    public showErrorMessage = this._createAction<Error>();

    public pivotFilterChanged = this._createAction<IPivotFilterState>();

    public planPatched = this._createAction<ITestPlanRow>();

    public planDeleted = this._createAction<number>();

    private _createAction<T>(): Action<T> {
        return new Action<T>();
    }

}
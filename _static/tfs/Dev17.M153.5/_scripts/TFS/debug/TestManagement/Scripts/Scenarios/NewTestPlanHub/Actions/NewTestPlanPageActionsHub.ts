import { Action } from "VSS/Flux/Action";
import { INewTestPlanFields } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class NewTestPlanPageActionsHub {
    public static getInstance(): NewTestPlanPageActionsHub {
        if (!NewTestPlanPageActionsHub._instance) {
            NewTestPlanPageActionsHub._instance = new NewTestPlanPageActionsHub();
        }
        return NewTestPlanPageActionsHub._instance;
    }

    private static _instance: NewTestPlanPageActionsHub;

    public InitializeTestPlanFields: Action<INewTestPlanFields> = this._createAction<INewTestPlanFields>();
    public beginCreateTestPlan: Action<void> = this._createAction<void>();
    public createTestPlanFailed: Action<Error> = this._createAction<Error>();
    public createTestPlanSucceeded: Action<void> = this._createAction<void>();

    private _createAction<T>(): Action<T> {
        return new Action<T>();
    }
}

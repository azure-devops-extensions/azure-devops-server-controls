import { Action } from "VSS/Flux/Action";
import { TestPlan } from "TFS/TestManagement/Contracts";

export class TestPlanActionsHub {
    public static getInstance(): TestPlanActionsHub {
        if (!TestPlanActionsHub._instance) {
            TestPlanActionsHub._instance = new TestPlanActionsHub();
        }
        return TestPlanActionsHub._instance;
    }
    
    public navigateToPlan: Action<TestPlan> = this._createAction<TestPlan>();

    private _createAction<T>(): Action<T> {
        return new Action<T>();
    }
    private static _instance: TestPlanActionsHub;
}
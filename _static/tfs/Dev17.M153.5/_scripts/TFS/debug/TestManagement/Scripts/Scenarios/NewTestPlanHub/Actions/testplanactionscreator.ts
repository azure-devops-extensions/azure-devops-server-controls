import { TestPlan } from "TFS/TestManagement/Contracts";
import { TestPlanActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanActionsHub";

export class TestPlanActionsCreator {
    public static getInstance(): TestPlanActionsCreator {
        if (!TestPlanActionsCreator._instance) {
            TestPlanActionsCreator._instance = new TestPlanActionsCreator(
                TestPlanActionsHub.getInstance());
        }
        return TestPlanActionsCreator._instance;
    }

    constructor(actionsHub: TestPlanActionsHub) {
        this._actionsHub = actionsHub;
    }

    public navigateToPlan(plan: TestPlan): void {
        this._actionsHub.navigateToPlan.invoke(plan);
    }

    private _actionsHub: TestPlanActionsHub;
    private static _instance: TestPlanActionsCreator;
}
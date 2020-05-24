import { autobind } from "OfficeFabric/Utilities";

import { Store as VSSStore } from "VSS/Flux/Store";
import { TestPlan } from "TFS/TestManagement/Contracts";
import { TestPlanActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanActionsHub";

export class TestPlanStore extends VSSStore {
    public static getInstance() {
        if (!TestPlanStore._instance) {
            TestPlanStore._instance = new TestPlanStore(TestPlanActionsHub.getInstance());
        }
        return TestPlanStore._instance;
    }

    constructor(actionsHub: TestPlanActionsHub) {
        super();

        this._actionsHub = actionsHub;
        this._addListeners();
    }

    public getData(): TestPlan {
        return Object.assign({}, this._plan);
    }
    
    private _addListeners(): void {
        this._actionsHub.navigateToPlan.addListener(this._setPlan);
    }

    @autobind
    private _setPlan(plan: TestPlan): void {
        this._plan = Object.assign({}, plan);

        this.emitChanged();
    }

    private _plan: TestPlan;
    private static _instance: TestPlanStore;
    private _actionsHub: TestPlanActionsHub;
}
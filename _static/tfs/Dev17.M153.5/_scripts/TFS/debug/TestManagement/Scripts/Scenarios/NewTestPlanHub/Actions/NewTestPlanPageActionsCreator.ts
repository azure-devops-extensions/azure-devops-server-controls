
import { NewTestPlanPageActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsHub";
import { NewTestPlanPageSource } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Sources/NewTestPlanPageSource";
import { INewTestPlanFields } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { TestPlan } from "TFS/TestManagement/Contracts";

export class NewTestPlanPageActionsCreator {
    public static getInstance(): NewTestPlanPageActionsCreator {
        if (!NewTestPlanPageActionsCreator._instance) {
            NewTestPlanPageActionsCreator._instance = new NewTestPlanPageActionsCreator(
                NewTestPlanPageActionsHub.getInstance(),
                NewTestPlanPageSource.getInstance());
        }
        return NewTestPlanPageActionsCreator._instance;
    }

    private _actionsHub: NewTestPlanPageActionsHub;
    private _source: NewTestPlanPageSource;
    private static _instance: NewTestPlanPageActionsCreator;

    constructor(actionsHub: NewTestPlanPageActionsHub,
        source: NewTestPlanPageSource) {
        this._actionsHub = actionsHub;
        this._source = source;
    }

    public initialize(): void {
        

        this._source.getNewTestPlanFields().then((fields: INewTestPlanFields) => {
            this._actionsHub.InitializeTestPlanFields.invoke(fields);
        });

    }

    public createTestPlan(name: string, projectId: string, areaPath: string, iteration: string): IPromise<number> {
        this._actionsHub.beginCreateTestPlan.invoke(null);

        return new Promise((resolve, reject) => {
            this._source.createTestPlan(name,
                projectId,
                areaPath,
                iteration).then((testPlan: TestPlan) => {
                    this._actionsHub.createTestPlanSucceeded.invoke(null);
                    resolve(testPlan.id);
                },
                (error: Error) => {
                    this._actionsHub.createTestPlanFailed.invoke(error);
                });
        });
    }
}

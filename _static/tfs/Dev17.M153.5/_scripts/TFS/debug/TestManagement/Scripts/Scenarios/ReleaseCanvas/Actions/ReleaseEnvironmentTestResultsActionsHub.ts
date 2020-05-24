import { Action } from "VSS/Flux/Action";
import * as Utils_String from "VSS/Utils/String";

import { TestResultSummary } from "TFS/TestManagement/Contracts";

export class ReleaseEnvironmentTestResultsActions {

    public static getInstance(instanceId?: string): ReleaseEnvironmentTestResultsActions {
        instanceId = instanceId || Utils_String.empty;
        if (!this._instanceMap[instanceId]) {
            this._instanceMap[instanceId] = new ReleaseEnvironmentTestResultsActions();
        }
        return this._instanceMap[instanceId];
    }

    public testSummaryFetched = new Action<TestResultSummary>();
    public isEnvironmentInProgress = new Action<boolean>();

    private static _instanceMap: IDictionaryStringTo<ReleaseEnvironmentTestResultsActions> = {};
}

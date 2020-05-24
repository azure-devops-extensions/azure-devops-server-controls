import * as Q from "q";

import * as VSS from "VSS/VSS";
import Utils_Array = require("VSS/Utils/Array");
import * as Utils_Date from "VSS/Utils/Date";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

import { ReleaseReportingKeys } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { ReleaseReportingPanelActions } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelActions";


export class ReleaseReportingPanelActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseReportingKeys.ActionsCreatorKey_ReleaseReportingPanelActionsCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub(ReleaseReportingPanelActions, instanceId);
        this._instanceId = instanceId;
    }

    public initializeData(): void {

        ContributionSource.instance().getContributions("ms.vss-releaseManagement-web.report-catalog").then((contributions: Contribution[]) => {
            this._actions.initializeContributions.invoke(contributions);
        }, (error: any) => {
            this.updateErrorMessage(VSS.getErrorMessage(error));
        });
    }

    public updateErrorMessage(errorMessage: string): void {
        this._actions.updateErrorMessage.invoke(errorMessage);
    }

    private _actions: ReleaseReportingPanelActions;
    private _instanceId: string;
}

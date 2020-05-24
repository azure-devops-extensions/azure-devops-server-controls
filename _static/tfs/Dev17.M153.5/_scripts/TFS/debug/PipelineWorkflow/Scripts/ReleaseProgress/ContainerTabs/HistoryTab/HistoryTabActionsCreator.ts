import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { HistoryActions } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";

import { HistoryTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { HistoryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/HistoryTab/HistoryUtils";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class HistoryTabActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return HistoryTabKeys.HistoryTabActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
    }

    public getRevisions(releaseId: number): IPromise<ReleaseContracts.ReleaseRevision[]> {
        return ReleaseSource.instance().getReleaseHistory(releaseId).then(
            (releaseRevisions: ReleaseContracts.ReleaseRevision[]) => {
                this._historyActions.UpdateRevisions.invoke(HistoryUtils.convertReleaseRevisionToColumn((releaseRevisions)));
                return Q.resolve(releaseRevisions);
            }, (error) => {
                return Q.resolve(null);
            }
        );
    }

    private _historyActions: HistoryActions; 
}
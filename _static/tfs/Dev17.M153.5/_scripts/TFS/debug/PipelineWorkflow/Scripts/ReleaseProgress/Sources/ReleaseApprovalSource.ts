import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { ApprovalStatus, ReleaseApproval } from "ReleaseManagement/Core/Contracts";
import { getDefaultWebContext } from "VSS/Context";


export class ReleaseApprovalSource extends ReleaseManagementSourceBase {

    public getMyPendingApprovals(releaseId: number, forceUpdateCache: boolean = false): IPromise<ReleaseApproval[]> {
        if (!this._cachedMyPendingApprovals) {
            this._cachedMyPendingApprovals = {};
        }

        if (forceUpdateCache ||
            !this._cachedMyPendingApprovals.hasOwnProperty(releaseId.toString())) {
            this._cachedMyPendingApprovals[releaseId.toString()] = this.getClient().getReleaseApprovals(getDefaultWebContext().user.id, ApprovalStatus.Pending, [releaseId]);
        }
        return this._cachedMyPendingApprovals[releaseId];
    }

    public static getKey(): string {
        return "ReleaseApprovalSource";
    }

    public static instance(): ReleaseApprovalSource {
        return SourceManager.getSource(ReleaseApprovalSource);
    }

    private _cachedMyPendingApprovals: IDictionaryStringTo<IPromise<ReleaseApproval[]>>;
}

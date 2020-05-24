import { ReleaseApprovalStatusIndicator, IIndicatorViewInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export class ReleaseApprovalStatusHelper {

    public static getApprovalInfo(statusIndicator: ReleaseApprovalStatusIndicator): IIndicatorViewInfo {
        const approvalInfo = this._approvalMap[statusIndicator];
        return approvalInfo ? approvalInfo : { iconName: "Contact" };
    }

    private static _initializeApprovalsMap(): IDictionaryStringTo<IIndicatorViewInfo> {
        let approvalsMap: IDictionaryStringTo<IIndicatorViewInfo> = {};
        approvalsMap[ReleaseApprovalStatusIndicator.Pending] = { iconName: "Contact" };
        approvalsMap[ReleaseApprovalStatusIndicator.ReadyForAction] = { iconName: "Contact" };
        approvalsMap[ReleaseApprovalStatusIndicator.Rejected] = { iconName: "UserRemove" };
        approvalsMap[ReleaseApprovalStatusIndicator.Approved] = { iconName: "UserFollowed" };
        return approvalsMap;
    }

    private static _approvalMap: IDictionaryStringTo<IIndicatorViewInfo> = ReleaseApprovalStatusHelper._initializeApprovalsMap();
}
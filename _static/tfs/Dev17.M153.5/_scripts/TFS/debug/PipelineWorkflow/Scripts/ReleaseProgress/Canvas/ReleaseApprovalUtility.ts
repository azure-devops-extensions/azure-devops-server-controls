import * as Q from "q";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Context from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Context";
import * as Manager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as DistributedTask from "TFS/DistributedTask/Contracts";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IDetailedReleaseApprovalData } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActions";
import { ApprovalOrderKeys} from "PipelineWorkflow/Scripts/Common/Types";

import { IdentityRef } from "VSS/WebApi/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

export interface IApproveapprovalArgs {
    snapshot: RMContracts.ReleaseDefinitionApprovals;
    approval: RMContracts.ReleaseApproval;
    environment: RMContracts.ReleaseEnvironment;
    isFirstPreDeployApprover: boolean;
}

export class ReleaseApprovalUtility {

    constructor(private _defaultPollingInterval: number = 500) {
        this._approvalManager = Context.serviceContext.releaseApprovalManager();
        this._deploymentAuthorizationManager = Context.serviceContext.deploymentAuthorizationManager();
    }

    /**
     * Approve flow
     * 
     * @param {RMContracts.ReleaseDefinitionApprovals} snapshot 
     * @param {RMContracts.ReleaseApproval} approval 
     * @memberof ReleaseApprovalUtility
     */
    public approve(approvalArgs: IApproveapprovalArgs): IPromise<RMContracts.ReleaseApproval> {

        if (approvalArgs && approvalArgs.approval && approvalArgs.snapshot) {
            // pre approval
            if (approvalArgs.approval.approvalType === RMContracts.ApprovalType.PreDeploy) {

                // go via re-authenticate flow , if the ff is set and the policy is set in pre approvals
                if (RMUtilsCore.FeatureFlagUtils.isRevalidateApproverIdentityFeatureEnabled() &&
                    this._shouldEnforceIdentityValidation(approvalArgs.snapshot, RMContracts.ApprovalType.PreDeploy)) {

                    return this._updateApprovalStatusWithIdentityValidation(approvalArgs.approval, RMContracts.ApprovalStatus.Approved);
                }
                else {
                    return this._createApprovalModelPromise(approvalArgs.approval, RMContracts.ApprovalStatus.Approved);
                }
            }

            // post approval
            else {

                // go via re-authenticate flow , if the ff is set and the policy is set in post approvals
                if (RMUtilsCore.FeatureFlagUtils.isRevalidateApproverIdentityFeatureEnabled() &&
                    this._shouldEnforceIdentityValidation(approvalArgs.snapshot, RMContracts.ApprovalType.PostDeploy)) {

                    return this._updateApprovalStatusWithIdentityValidation(approvalArgs.approval, RMContracts.ApprovalStatus.Approved);
                }
                else {
                    return this._createApprovalModelPromise(approvalArgs.approval, RMContracts.ApprovalStatus.Approved);
                }
            }
        }
    }

    /**
     * Mutliple Approve flow
     * 
     * @param {RMContracts.IDetailedReleaseApprovalData[]} approvalsData 
     * @memberof ReleaseApprovalUtility
     */
    public multipleApprove(approvalsData: IDetailedReleaseApprovalData[]): IPromise<RMContracts.ReleaseApproval[]> {
        return this._multipleActions(approvalsData, RMContracts.ApprovalStatus.Approved);
    }

    /**
     * Reject flow
     * 
     * @param {RMContracts.ReleaseDefinitionApprovals} snapshot 
     * @param {RMContracts.ReleaseApproval} approval 
     * @memberof ReleaseApprovalUtility
     */
    public reject(snapshot: RMContracts.ReleaseDefinitionApprovals, approval: RMContracts.ReleaseApproval): IPromise<RMContracts.ReleaseApproval> {

        // go via re-authenticate flow , if the ff is set and the policy is set in approvals
        if (RMUtilsCore.FeatureFlagUtils.isRevalidateApproverIdentityFeatureEnabled() &&
            this._shouldEnforceIdentityValidation(snapshot, approval.approvalType)) {

            return this._updateApprovalStatusWithIdentityValidation(approval, RMContracts.ApprovalStatus.Rejected);
        }
        else {
            return this._createApprovalModelPromise(approval, RMContracts.ApprovalStatus.Rejected);
        }
    }

    /**
     * Mutliple Reject flow
     * 
     * @param {RMContracts.IDetailedReleaseApprovalData[]} approvalsData 
     * @memberof ReleaseApprovalUtility
     */
    public multipleReject(approvalsData: IDetailedReleaseApprovalData[]): IPromise<RMContracts.ReleaseApproval[]> {
        return this._multipleActions(approvalsData, RMContracts.ApprovalStatus.Rejected);
    }

    /**
     * Reassign flow
     * 
     * @param {RMContracts.ReleaseDefinitionApprovals} snapshot 
     * @param {RMContracts.ReleaseApproval} approval 
     * @memberof ReleaseApprovalUtility
     */
    public reassign(snapshot: RMContracts.ReleaseDefinitionApprovals, approval: RMContracts.ReleaseApproval, reassignedIdentity: IdentityRef, reassignComment: string): IPromise<RMContracts.ReleaseApproval> {

        //  Put the reassign comment in the approval object   
        if (reassignComment) {
            approval.comments = reassignComment;
        }

        // go via re-authenticate flow , if the ff is set and the policy is set in approvals
        if (RMUtilsCore.FeatureFlagUtils.isRevalidateApproverIdentityFeatureEnabled() &&
            this._shouldEnforceIdentityValidation(snapshot, approval.approvalType)) {

            return this._updateApprovalStatusWithIdentityValidation(approval, RMContracts.ApprovalStatus.Reassigned, reassignedIdentity);
        }
        else {
            return this._createApprovalModelPromise(approval, RMContracts.ApprovalStatus.Reassigned, reassignedIdentity);
        }
    }

    private _multipleActions(approvalsData: IDetailedReleaseApprovalData[], 
        approvalStatus: RMContracts.ApprovalStatus): IPromise<RMContracts.ReleaseApproval[]> {

        if (approvalsData) {
            let revalidateIdentityEnabled = RMUtilsCore.FeatureFlagUtils.isRevalidateApproverIdentityFeatureEnabled();
            let approvalList: RMContracts.ReleaseApproval[] = [];
            let revalidateList: string[] = [];
            for (let approvalData of approvalsData) {
                for (let approvalItem of approvalData.approvalData.approvalItems){
                    if (approvalItem.isItemActionable) {
                        if (revalidateIdentityEnabled && this._shouldEnforceIdentityValidation(approvalItem.snapshot, approvalItem.approval.approvalType)){
                                revalidateList.push(approvalItem.approval.releaseEnvironment.name);
                        }
                        else {
                            approvalList.push(approvalItem.approval);
                            
                            //we will approve all items associated with the user, unless the approval order is anyone, 
                            //in which case, only one is sufficient, so we break
                            if (approvalData.approvalData.approvalOrder ===  ApprovalOrderKeys.anyOneUserKey){
                                break;
                            }
                        }                        
                    }
                }
            }
            if (approvalList.length > 0){
                return this._createApprovalsModelPromise(approvalList, approvalStatus);
            }
            else {
                let approvalPromise: Q.Deferred<RMContracts.ReleaseApproval[]> = Q.defer<RMContracts.ReleaseApproval[]>();
                approvalPromise.reject(Utils_String.localeFormat(Resources.RevalidateIdentityUnexpected, revalidateList.join(" ,")));
                return approvalPromise.promise;
            }
        }
    }

    private _updateApprovalStatusWithIdentityValidation(approval: RMContracts.ReleaseApproval, expectedApprovalStatus: RMContracts.ApprovalStatus, reassignedIdentity?: IdentityRef): IPromise<RMContracts.ReleaseApproval> {
        let deploymentAuthorizationForReValidateIdentity = this._getIdentityRevalidationAuthInfo(approval, expectedApprovalStatus, reassignedIdentity);
        return deploymentAuthorizationForReValidateIdentity.then((authInfoListReValidateIdentity: RMContracts.DeploymentAuthorizationInfo[]) => {

            return this._pollServiceForApprovalStatus(approval, expectedApprovalStatus);
        });
    }

    /**
     * Get the identityrevalidationauthinfo promise
     * only if the promise is resolved we can go ahead with setting status on the approval
     * 
     * @private
     * @param {RMContracts.ReleaseApproval} approval 
     * @param {RMContracts.ApprovalStatus} status 
     * @returns {IPromise<RMContracts.DeploymentAuthorizationInfo[]>} 
     * @memberof ReleaseApprovalUtility
     */
    private _getIdentityRevalidationAuthInfo(approval: RMContracts.ReleaseApproval, status: RMContracts.ApprovalStatus, reassignedIdentity?: IdentityRef): IPromise<RMContracts.DeploymentAuthorizationInfo[]> {
        let deploymentAuthorizationPromise = Q.defer<RMContracts.DeploymentAuthorizationInfo[]>();

        let deploymentAuthorizationManager: Manager.DeploymentAuthorizationManager = Context.serviceContext.deploymentAuthorizationManager();

        // get vsts-aad tenantId
        deploymentAuthorizationManager.getVstsAadTenantId().then((tenantId: any) => {

            // create a new approval object with required properties from approval
            let patchedApproval = this._createApprovalModel(approval, status, reassignedIdentity);
            patchedApproval.id = approval.id;

            // convert to json string
            let approvalAsString: string = JSON.stringify(patchedApproval);

            let deploymentAuthInfoInput: RMContracts.DeploymentAuthorizationInfo[] = [];
            deploymentAuthInfoInput.push({
                tenantId: tenantId.value,
                resources: null,
                vstsAccessTokenKey: Utils_String.empty,
                authorizationHeaderFor: RMContracts.AuthorizationHeaderFor.RevalidateApproverIdentity
            });

            deploymentAuthorizationManager.authenticateToAad(deploymentAuthInfoInput, approvalAsString).then((authInfoList: RMContracts.DeploymentAuthorizationInfo[]) => {

                deploymentAuthorizationPromise.resolve(authInfoList);
            }, (error) => {

                deploymentAuthorizationPromise.reject(error);
            });
        }, (error) => {

            deploymentAuthorizationPromise.reject(error);
        });

        return deploymentAuthorizationPromise.promise;
    }

    /**
     * Poll for the latest details about the approval
     * 
     * @private
     * @param {RMContracts.ReleaseApproval} approval 
     * @param {RMContracts.ApprovalStatus} expectedApprovalStatus 
     * @memberof ReleaseApprovalUtility
     */
    private _pollServiceForApprovalStatus(approval: RMContracts.ReleaseApproval, expectedApprovalStatus: RMContracts.ApprovalStatus): IPromise<RMContracts.ReleaseApproval> {
        let pollPromise = Q.defer<RMContracts.ReleaseApproval>();
        this._handlePollServiceForApprovalStatus(approval, expectedApprovalStatus, 1000, this._defaultPollingInterval, pollPromise);
        return pollPromise.promise;
    }

    /**
     * Pool for the latest details about the given approval till it's status matches the expected status or retries are over
     * 
     * @private
     * @param {RMContracts.ReleaseApproval} approval 
     * @param {RMContracts.ApprovalStatus} expectedStatus 
     * @param {number} maxRetry 
     * @param {number} delay 
     * @param {Q.Deferred<RMContracts.ReleaseApproval>} pollPromise [promise to keep track of whether polling is completed or not]
     * @memberof ReleaseApprovalUtility
     */
    private _handlePollServiceForApprovalStatus(approval: RMContracts.ReleaseApproval, expectedStatus: RMContracts.ApprovalStatus, maxRetry: number, delay: number, pollPromise: Q.Deferred<RMContracts.ReleaseApproval>): void {

        this._monitorApprovalProgess = new Utils_Core.DelayedFunction(this, delay, "monitorApprovalProgress", () => {

            // fetch the latest data for the given approval
            let approvalPromise: Q.Promise<RMContracts.ReleaseApproval> = <Q.Promise<RMContracts.ReleaseApproval>>this._getApprovalPromise(approval.id, true);

            approvalPromise.then((approvalResponse: RMContracts.ReleaseApproval) => {

                // if the approval status matches the expected status, i.e. approval has been successfully approved or rejected
                if (approvalResponse.status === expectedStatus) {

                    if (approvalResponse.status === RMContracts.ApprovalStatus.Approved) {
                        pollPromise.resolve(approvalResponse);
                    }
                    else if (approvalResponse.status === RMContracts.ApprovalStatus.Rejected) {
                        pollPromise.resolve(approvalResponse);
                    }
                    this._stopApprovalProgessMonitor();
                }

                // check if the approval has been successfully reassigned 
                else if (approvalResponse.status === RMContracts.ApprovalStatus.Pending
                    && approvalResponse.history.length > 0
                    && approvalResponse.history.some(historyRef => Utils_String.equals(historyRef.approver.id, approval.approver.id, true))) {

                    pollPromise.resolve(approvalResponse);
                    this._stopApprovalProgessMonitor();
                }
                else {
                    if (maxRetry > 0) {
                        this._handlePollServiceForApprovalStatus(approval, expectedStatus, --maxRetry, delay * 2, pollPromise);
                    }
                }
            }, (error) => {

                pollPromise.reject(error);
                this._stopApprovalProgessMonitor();
            });
        });

        this._monitorApprovalProgess.start();
    }

    /**
     * Stop polling approval for the latest details
     * 
     * @private
     * @memberof ReleaseApprovalUtility
     */
    private _stopApprovalProgessMonitor(): void {

        if (this._monitorApprovalProgess) {
            this._monitorApprovalProgess.cancel();
            delete this._monitorApprovalProgess;
        }
    }

    private _createApprovalModelPromise(approval, approvalStatus: RMContracts.ApprovalStatus, reassignedIdentity?: IdentityRef): IPromise<RMContracts.ReleaseApproval> {
        let approvalPatch = this._createApprovalModel(approval, approvalStatus, reassignedIdentity);
        return <Q.Promise<RMContracts.ReleaseApproval>>this._approvalManager.beginPatchApproval(approval.id, approvalPatch);
    }

    private _createApprovalsModelPromise(approvals, approvalStatus: RMContracts.ApprovalStatus): IPromise<RMContracts.ReleaseApproval[]> {
        let approvalPatches: RMContracts.ReleaseApproval[] = [];
        for (let approval of approvals){
            approvalPatches.push(this._createApprovalModel(approval, approvalStatus));
        }
        return <Q.Promise<RMContracts.ReleaseApproval[]>>this._approvalManager.beginPatchApprovals(approvalPatches);
    }

    /**
     * Get the promise to fetch details about the approval
     * 
     * @private
     * @param {number} approvalId [Id associated with the approval]
     * @param {boolean} [includeHistory] 
     * @returns {IPromise<RMContracts.ReleaseApproval>} 
     * @memberof ReleaseApprovalUtility
     */
    private _getApprovalPromise(approvalId: number, includeHistory?: boolean): IPromise<RMContracts.ReleaseApproval> {
        return this._approvalManager.beginGetReleaseApproval(approvalId, includeHistory);
    }

    /**
     * Based on approval type, check whether the policy to enforce identity validation is set or not
     * 
     * @param {RMContracts.ReleaseEnvironment} environment 
     * @param {RMContracts.ApprovalType} approvalType 
     * @returns {boolean} 
     * @memberof ReleaseApprovalUtility
     */
    private _shouldEnforceIdentityValidation(snapshot: RMContracts.ReleaseDefinitionApprovals, approvalType: RMContracts.ApprovalType): boolean {
        return !!snapshot
            && !!snapshot.approvalOptions
            && (snapshot.approvalOptions.enforceIdentityRevalidation === true);
    }

    /**
     * Creates release approval model object from approval object 
     * copies few properties from approval object, also passes assigned to 
     * if approval status is reassigned
     * 
     * @private
     * @param {RMContracts.ReleaseApproval} approval 
     * @param {RMContracts.ApprovalStatus} approvalStatus 
     * @returns {Model.ReleaseApproval} 
     * @memberof ReleaseApprovalUtility
     */
    private _createApprovalModel(approval: RMContracts.ReleaseApproval, approvalStatus: RMContracts.ApprovalStatus, reassignedIdentity?: IdentityRef): RMContracts.ReleaseApproval {

        let patchedApproval = {} as RMContracts.ReleaseApproval;

        // if the approval is being reassigned, then update the approver in the patched approval
        if (approvalStatus === RMContracts.ApprovalStatus.Reassigned) {

            // assignedTo property is set if the approver has been reassigned in the current session
            let assignedTo = (!!reassignedIdentity && !!reassignedIdentity.id) ?
                reassignedIdentity.id :
                Utils_String.empty;

            patchedApproval.approver = <IdentityRef>{ id: assignedTo };
        }

        // copy other properties
        patchedApproval.status = approvalStatus;
        patchedApproval.comments = approval.comments;
        patchedApproval.id = approval.id;
        patchedApproval.release = approval.release;
        patchedApproval.releaseEnvironment = approval.releaseEnvironment;

        return patchedApproval;
    }

    private _deploymentAuthorizationRequiredEnvironments: IDictionaryStringTo<DistributedTask.ServiceEndpoint[]> = {};
    private _deploymentAuthorizationManager: Manager.DeploymentAuthorizationManager;
    private _approvalManager: Manager.ReleaseApprovalManager;
    private _monitorApprovalProgess: Utils_Core.DelayedFunction;
    private _deploymentAuthorizationDeferred: IDictionaryStringTo<IPromise<void>> = {};
}
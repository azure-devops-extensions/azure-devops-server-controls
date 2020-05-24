import Q = require("q");

import PolicyService = require("Policy/Scripts/TFS.Policy.ClientServices");
import PolicyContracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import PolicyClientServices = require("Policy/Scripts/TFS.Policy.ClientServices");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");

export interface IPolicyEvaluationSource {
    queryPolicyEvaluationsAsync(pullRequestId: number, codeReviewId: number): IPromise<PolicyContracts.PolicyEvaluationRecord[]>;
    queryPolicyEvaluationAsync(evaluationId: string): IPromise<PolicyContracts.PolicyEvaluationRecord>;
    requeuePolicyEvaluation(evaluationId: string): IPromise<PolicyContracts.PolicyEvaluationRecord>;
    resetCache(): void;
}

export class PolicyEvaluationSource extends CachedSource implements IPolicyEvaluationSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _repositoryContext: GitRepositoryContext;

    private _projectGuid: string;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        super(PolicyEvaluationSource.DATA_ISLAND_PROVIDER_ID, PolicyEvaluationSource.DATA_ISLAND_CACHE_PREFIX);

        this._tfsContext = tfsContext;
        this._projectGuid = tfsContext.contextData.project.id;
    }

    public queryPolicyEvaluationsAsync(pullRequestId: number, codeReviewId: number): IPromise<PolicyContracts.PolicyEvaluationRecord[]> {

        // check for cached value before going to REST
        const cached = this.fromCache<PolicyContracts.PolicyEvaluationRecord[]>("PolicyEvaluations." + pullRequestId, PolicyContracts.TypeInfo.PolicyEvaluationRecord);
        if (cached && cached.length) {
            return Promise.resolve(cached);
        }

        const pullRequestArtifactId: string = this._buildPullRequestArtifactId(this._projectGuid, pullRequestId, codeReviewId);
        const policyClientService = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext).getService(PolicyService.PolicyClientService);

        return policyClientService.getArtifactPolicyEvaluationsAsync(this._projectGuid, pullRequestArtifactId);
    }

    public queryPolicyEvaluationAsync(evaluationId: string): IPromise<PolicyContracts.PolicyEvaluationRecord> {
        const policyClientService = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext).getService(PolicyService.PolicyClientService);

        return policyClientService.getArtifactPolicyEvaluationAsync(this._projectGuid, evaluationId);
    }

    public requeuePolicyEvaluation(evaluationId: string): IPromise<PolicyContracts.PolicyEvaluationRecord> {
        const policyClientService = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext).getService(PolicyClientServices.PolicyClientService);

        return Q.Promise((resolve, reject) => {
            policyClientService.beginRequeuePolicyEvaluation(this._projectGuid, evaluationId, null,
                (context, updatedEvaluation) => resolve(updatedEvaluation),
                reject
            );
        });
    }

    private _buildPullRequestArtifactId(projectId: string, pullRequestId: number, codeReviewId?: number): string {
        const artifact = new VCOM.CodeReviewArtifact({
            projectGuid: projectId,
            pullRequestId: pullRequestId,
            codeReviewId: codeReviewId ? codeReviewId : 0
        });

        return artifact.getUri();
    }
}
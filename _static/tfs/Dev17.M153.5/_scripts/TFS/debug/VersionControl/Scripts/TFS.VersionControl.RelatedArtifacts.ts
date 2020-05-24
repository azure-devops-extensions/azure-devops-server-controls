import Q = require("q");

import Utils_String = require("VSS/Utils/String");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import VSS = require("VSS/VSS");
import Telemetry = require("VSS/Telemetry/Services");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");
import Utils_Date = require("VSS/Utils/Date");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Artifacts_Plugins = require("Presentation/Scripts/TFS/TFS.ArtifactPlugins");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
import LicenseConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import {CommitArtifact} from "VersionControl/Scripts/CommitArtifact";
import {GitRefArtifact} from "VersionControl/Scripts/GitRefArtifact";
import {PullRequestArtifact} from "VersionControl/Scripts/PullRequestArtifact";

/**
 * Version Control Artifact Data Provider
 */

export class VCArtifactPlugin implements Artifacts_Plugins.IRelatedArtifactsPlugin {

    private _httpClient: VCWebApi.GitHttpClient;

    private static readonly _pullRequestTypeIcon: string = "bowtie-icon bowtie-tfvc-pull-request";
    private static readonly _branchTypeIcon: string = "bowtie-icon bowtie-tfvc-branch";
    private static readonly _tagTypeIcon: string = "bowtie-icon bowtie-tag";
    private static readonly _commitTypeIcon: string = "bowtie-icon bowtie-tfvc-commit";

    private static readonly _successIcon: string = "bowtie-icon bowtie-check";
    private static readonly _waitingIcon: string = "bowtie-icon bowtie-status-waiting";
    private static readonly _failureIcon: string = "bowtie-icon bowtie-edit-delete";

    private static readonly _successClass: string = "vc-pullrequest-rollupstatus-success-text";
    private static readonly _infoClass: string = "vc-pullrequest-rollupstatus-info-text";
    private static readonly _failureClass: string = "vc-pullrequest-rollupstatus-failure-text";

    readonly supportedTool: string = "git";

    public requiredFeaturesForActions = [LicenseConstants.LicenseFeatureIds.Code];
    private _artifactMap: IDictionaryStringTo<Artifacts_Services.IArtifactData>;

    public beginGetDisplayData(artifacts: Artifacts_Services.IArtifactData[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData): IPromise<Artifacts_Plugins.IArtifactDisplayData[]> {
        const deferred = Q.defer<Artifacts_Plugins.IArtifactDisplayData[]>();
        const retValue: Artifacts_Plugins.IArtifactDisplayData[] = [];

        this._httpClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);

        const promiseList: Q.Promise<Object>[] = [];
        if (artifacts) {
            const deferredList: Q.Deferred<Object>[] = [];

            this._artifactMap = {};
            for (let i = 0; i < artifacts.length; i++) {
                if (artifacts[i] == null) {
                    continue;
                }

                this._artifactMap[decodeURIComponent(artifacts[i].uri)] = artifacts[i];
            }

            for (let i = 0; i < artifacts.length; i++) {

                try {
                    if (artifacts[i] == null) {
                        continue;
                    }

                    if (Utils_String.ignoreCaseComparer(artifacts[i].type, Artifacts_Constants.ArtifactTypeNames.Ref) === 0) {
                        this._getRefData(artifacts[i], retValue, deferredList, promiseList, tfsContext, hostArtifact);
                    }
                    else if (Utils_String.ignoreCaseComparer(artifacts[i].type, Artifacts_Constants.ArtifactTypeNames.Commit) === 0) {
                        this._getCommitData(artifacts[i], retValue, deferredList, promiseList, tfsContext, hostArtifact);
                    }
                    else if (Utils_String.ignoreCaseComparer(artifacts[i].type, Artifacts_Constants.ArtifactTypeNames.PullRequestId) === 0) {
                        this._getPullRequestData(artifacts[i], retValue, deferredList, promiseList, tfsContext, hostArtifact);
                    }
                    else if (Utils_String.ignoreCaseComparer(artifacts[i].type, Artifacts_Constants.ArtifactTypeNames.Changeset) === 0) {
                        // do nothing for now
                    }
                }
                catch (error) {
                    Diag.logError(error);
                }
            }
        }

        Q.all(promiseList).then(() => {
            deferred.resolve(retValue);
        }).fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /**
    * It returns an appropriate title text for the artifact type
    */
    private _getArtifactTitleText(artifactType: string) {
        if (Utils_String.ignoreCaseComparer(artifactType, Artifacts_Constants.ArtifactTypeNames.Ref) === 0) {
            return VCResources.RelatedArtifactBranchTitle;
        }
        else if (Utils_String.ignoreCaseComparer(artifactType, Artifacts_Constants.ArtifactTypeNames.Commit) === 0) {
            return VCResources.RelatedArtifactCommitTitle;
        }
        else if (Utils_String.ignoreCaseComparer(artifactType, Artifacts_Constants.ArtifactTypeNames.PullRequestId) === 0) {
            return VCResources.RelatedArtifactPullRequestTitle;
        }
        else if (Utils_String.ignoreCaseComparer(artifactType, Artifacts_Constants.ArtifactTypeNames.Changeset) === 0) {
            return VCResources.RelatedArtifactChangesetTitle;
        }

        return "";
    }

    private _getPullRequestData(artifact: Artifacts_Services.IArtifactData, relatedData: Artifacts_Plugins.IArtifactDisplayData[], deferredList: Q.Deferred<Object>[], promiseList: Q.Promise<Object>[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData) {

        const prArtifact = new PullRequestArtifact(artifact);
        // have to call getTitle to initialize the values?
        prArtifact.getTitle();

        const projId = prArtifact.projectGuid;
        const repoId = prArtifact.repositoryId;
        const prId = prArtifact.pullRequestId;

        const deferredArtifact: Q.Deferred<Object> = Q.defer<Object>();
        deferredList.push(deferredArtifact);
        promiseList.push(deferredArtifact.promise);

        this._httpClient.beginGetPullRequest(projId, repoId, prId, true).then((pr: VCContracts.GitPullRequest) => {
            const prTitle: string = pr.title;
            const prState: { state: string, iconClass: string, stateClass: string } = this._computePullRequestState(pr);
            const prUrl = VersionControlUrls.getPullRequestUrlUsingRepoId(pr.repository.id, pr.repository.project.id, pr.pullRequestId, tfsContext, { project: projId, includeTeam: false });

            let dateAdditionalData: Artifacts_Plugins.IRelatedArtifactAdditionalData = null;
            if (pr.creationDate != null) {
                dateAdditionalData = {
                    text: Utils_String.format(VCResources.PullRequests_RelatedArtifactsDescription, Utils_Date.friendly(pr.creationDate)),
                    title: Utils_Date.localeFormat(pr.creationDate, "F")
                }
            }

            const prData: Artifacts_Plugins.IArtifactDisplayData = <Artifacts_Plugins.IArtifactDisplayData>{
                tool: artifact.tool,
                id: artifact.id,
                type: artifact.type,
                uri: artifact.uri,
                primaryData: {
                    typeIcon: {
                        type: Artifacts_Plugins.ArtifactIconType.icon,
                        descriptor: VCArtifactPlugin._pullRequestTypeIcon,
                        title: this._getArtifactTitleText(artifact.type)
                    },
                    href: prUrl,
                    title: prTitle,
                    user: {
                        displayName: pr.createdBy.displayName,
                        id: pr.createdBy.id,
                        uniqueName: pr.createdBy.uniqueName
                    },
                    callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                        const executedEvent = new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.VIEW_PR_FROM_ARTIFACT, {
                                "pullRequestId": miscData.prId,
                                "repositoryId": miscData.repoId,
                                "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                                "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                                "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                            });
                        Telemetry.publishEvent(executedEvent);
                    },
                    miscData: {
                        prId: prArtifact.pullRequestId,
                        repoId: repoId
                    }
                },
                additionalData: [dateAdditionalData, {
                    icon: prState.iconClass != null ? {
                        type: Artifacts_Plugins.ArtifactIconType.icon,
                        descriptor: prState.iconClass,
                        title: prState.state
                    } : null,
                    text: prState.state,
                    title: prState.state
                }],
                miscData: {
                    date: pr.creationDate
                }
            };

            relatedData.push(prData);
            
            deferredArtifact.resolve(null);

        }, (error) => {
            relatedData.push(this._createDisplayArtifactWithError(artifact, error));
            deferredArtifact.resolve(null);
        });
        
    }
    private _computePullRequestState(pr: VCContracts.GitPullRequest): { state: string, iconClass: string, stateClass: string } {

        if (pr.status === VCContracts.PullRequestStatus.Completed) {
            return {
                state: VCResources.PullRequest_PullRequestDetailsStatusCompleted,
                iconClass: VCArtifactPlugin._successIcon,
                stateClass: VCArtifactPlugin._successClass
            };
        }
        else if (pr.status === VCContracts.PullRequestStatus.Abandoned) {
            return {
                state: VCResources.PullRequest_PullRequestDetailsStatusAbandoned,
                iconClass: null,
                stateClass: null
            };
        }
        else {
            // not completed or abandoned so active. First check for merge conflicts
            if (pr.mergeStatus === VCContracts.PullRequestAsyncStatus.Conflicts) {
                return {
                    state: VCResources.PullRequest_PullRequestDetailsMergeStatus_Conflicts,
                    iconClass: VCArtifactPlugin._failureIcon,
                    stateClass: VCArtifactPlugin._failureClass
                };
            }

            // active and no merge conflicts so get the minimum vote
            let minVote: number = 0;
            if (pr.reviewers != null && pr.reviewers.length > 0) {
                minVote = pr.reviewers[0].vote;
                let allRequiredApproved = true;
                for (let j = 1; j < pr.reviewers.length; ++j) {

                    if (pr.reviewers[j].isRequired && pr.reviewers[j].vote <= 0) {
                        allRequiredApproved = false;
                    }

                    if (pr.reviewers[j].vote === 0) {
                        continue;
                    }

                    if (pr.reviewers[j].vote < minVote) {
                        minVote = pr.reviewers[j].vote;
                    }
                }

                if (minVote >= 0 && !allRequiredApproved) {
                    minVote = 0;
                }
            }

            if (minVote === PullRequestVoteStatus.REJECT) {
                return {
                    state: VCResources.PullRequest_Reject,
                    iconClass: VCArtifactPlugin._failureIcon,
                    stateClass: VCArtifactPlugin._failureClass
                };
            }
            else if (minVote === PullRequestVoteStatus.NOT_READY) {
                return {
                    state: VCResources.PullRequest_NotReady,
                    iconClass: VCArtifactPlugin._waitingIcon,
                    stateClass: VCArtifactPlugin._infoClass
                };
            }
            else if (minVote === PullRequestVoteStatus.APPROVE_WITH_COMMENT) {
                return {
                    state: VCResources.PullRequest_ApproveWithComment,
                    iconClass: VCArtifactPlugin._successIcon,
                    stateClass: VCArtifactPlugin._successClass
                };
            }
            else if (minVote === PullRequestVoteStatus.APPROVE) {
                return {
                    state: VCResources.PullRequest_Approve,
                    iconClass: VCArtifactPlugin._successIcon,
                    stateClass: VCArtifactPlugin._successClass
                };
            }

            // nothing interesting to say so just active
            return {
                state: VCResources.PullRequest_PullRequestDetailsStatusActive,
                iconClass: null,
                stateClass: VCArtifactPlugin._infoClass
            };
        }
    }

    private _getRefData(artifact: Artifacts_Services.IArtifactData, relatedData: Artifacts_Plugins.IArtifactDisplayData[], deferredList: Q.Deferred<Object>[], promiseList: Q.Promise<Object>[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData) {

        const tempArtifact: Artifacts_Services.IArtifactData = {
            uri: artifact.uri,
            tool: artifact.tool,
            type: artifact.type,
            id: encodeURIComponent(artifact.id) // we need to re-encode this id because it was previously decoded
        };
        const refArtifact = new GitRefArtifact(tempArtifact);
        const refTitle = refArtifact.getTitle();
        const repoId = refArtifact.repositoryId;
        const projId = refArtifact.projectGuid;

        let refName = refArtifact.refName;
        //branch names should all begin with GB, "GB[branchname]" and so should never be less than 3 characters or else something has gone wrong
        if (refName == null || refName.length < 3) {
            return;
        }

        let isBranch = false;
        if (Utils_String.ignoreCaseComparer(refName.substr(0, 2), "GB") === 0) {
            refName = "refs/heads/" + refTitle;
            isBranch = true;
        }
        else if (Utils_String.ignoreCaseComparer(refName.substr(0, 2), "GT") === 0) {
            //skip tags for now
            return;
        }
        else {
            return;
        }

        const deferredArtifact: Q.Deferred<Object> = Q.defer<Object>();
        deferredList.push(deferredArtifact);
        promiseList.push(deferredArtifact.promise);

        this._httpClient.beginGetGitRef(projId, repoId, refName).then((refs: VCContracts.GitRef[]) => {

            if (refs != null) {

                const refMatches = refs.filter((ref) => Utils_String.ignoreCaseComparer(ref.name, refName) === 0);
                if (refMatches != null && refMatches.length === 1) {

                    const ref = refMatches[0];
                    let refDisplayName = ref.name;
                    const refUrl = refArtifact.getUrl(tfsContext.contextData);

                    if (isBranch) {
                        if ((refDisplayName || "").indexOf("refs/heads/") === 0) {
                            refDisplayName = refDisplayName.substr("refs/heads/".length);
                        }
                    }
                    else {
                        if ((refDisplayName || "").indexOf("refs/tags/") === 0) {
                            refDisplayName = refDisplayName.substr("refs/tags/".length);
                        }
                    }

                    const search = <VCContracts.GitQueryCommitsCriteria>{
                        $top: 1,
                        itemVersion: {
                            version: refDisplayName,
                            versionType: VCContracts.GitVersionType.Branch,
                            versionOptions: VCContracts.GitVersionOptions.None
                        }
                    };

                    this._httpClient.beginGetCommits(repoId, projId, search).then((results: VCWebApi.GitCommitSearchResults) => {
                        if (results != null && results.commits.length === 1) {
                            const commit = results.commits[0];
                            let dateAdditionalData: Artifacts_Plugins.IRelatedArtifactAdditionalData = null;
                            if (commit.author.date != null) {
                                dateAdditionalData = {
                                    text: Utils_String.format(VCResources.Refs_RelatedArtifactsDescription, Utils_Date.friendly(commit.author.date)),
                                    title: Utils_Date.localeFormat(commit.author.date, "F")
                                }
                            }

                            const refData: Artifacts_Plugins.IArtifactDisplayData = <Artifacts_Plugins.IArtifactDisplayData>{
                                tool: artifact.tool,
                                id: artifact.id,
                                type: artifact.type,
                                uri: artifact.uri,
                                primaryData: {
                                    typeIcon: isBranch ? {
                                        type: Artifacts_Plugins.ArtifactIconType.icon,
                                        descriptor: VCArtifactPlugin._branchTypeIcon,
                                        title: this._getArtifactTitleText(artifact.type)
                                    } : {
                                            type: Artifacts_Plugins.ArtifactIconType.icon,
                                            descriptor: VCArtifactPlugin._tagTypeIcon,
                                            title: this._getArtifactTitleText(artifact.type)
                                        },
                                    href: refUrl,
                                    title: refDisplayName,
                                    user: {
                                        displayName: commit.author.name,
                                        email: commit.author.email
                                    },
                                    callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                                        const executedEvent = new Telemetry.TelemetryEventData(
                                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                                            CustomerIntelligenceConstants.VIEW_BRANCH_FROM_ARTIFACT, {
                                                "repositoryId": miscData.repoId,
                                                "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                                                "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                                                "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                                            });
                                        Telemetry.publishEvent(executedEvent);
                                    },
                                    miscData: {
                                        refName: refName,
                                        repoId: repoId
                                    }
                                },
                                additionalData: [dateAdditionalData],
                                miscData: {
                                    date: commit.author.date
                                }
                            };

                            if (hostArtifact != null) {

                                this._beginGetRefAction(repoId, projId, ref.name, refDisplayName, tfsContext, hostArtifact).then((action: Artifacts_Plugins.IRelatedArtifactAction) => {

                                    if (action != null) {
                                        refData.action = action;
                                    }

                                    relatedData.push(refData);
                                    deferredArtifact.resolve(null);

                                }, (error) => {
                                    relatedData.push(this._createDisplayArtifactWithError(artifact, error));
                                    deferredArtifact.resolve(null);
                                });
                            }
                            else {
                                relatedData.push(refData);
                                deferredArtifact.resolve(null);
                            }
                        }
                        else {
                            relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindBranch));
                            deferredArtifact.resolve(null);
                        }
                    }, (error) => {
                        relatedData.push(this._createDisplayArtifactWithError(artifact, error));
                        deferredArtifact.resolve(null);
                    });
                }
                else {
                    relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindBranch));
                    deferredArtifact.resolve(null);
                }
            }
            else {
                relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindBranch));
                deferredArtifact.resolve(null);
            }
        }, (error) => {
            relatedData.push(this._createDisplayArtifactWithError(artifact, error));
            deferredArtifact.resolve(null);
        });
    }

    private _beginGetRefAction(repoId: string, projId: string, refName: string, refDisplayName: string, tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData): IPromise<Artifacts_Plugins.IRelatedArtifactAction> {

        let alreadyExists = false;
        const existingPr = null;

        const deferredAction = Q.defer<Artifacts_Plugins.IRelatedArtifactAction>();

        this._httpClient.beginGetAllPullRequests(repoId, projId, VCContracts.PullRequestStatus.Active, null, null, refName, null, 1, 0).then((prs: VCContracts.GitPullRequest[]) => {
            if (prs.length > 0) {
                alreadyExists = true;
                const pr = prs[0];
                const prUrl = VersionControlUrls.getPullRequestUrlUsingRepoId(repoId, projId, pr.pullRequestId, tfsContext, { project: projId, includeTeam: false });

                const prArtifact = new PullRequestArtifact({
                    projectGuid: projId,
                    repositoryId: repoId,
                    pullRequestId: pr.pullRequestId,
                    refName: pr.pullRequestId
                });
                const prUri = prArtifact.getUri();

                if (this._artifactMap[decodeURIComponent(prUri)] != null) {
                    //the pr is already linked, so there is no action
                    deferredAction.resolve(null);
                }
                else {
                    const refAction = <Artifacts_Plugins.IRelatedArtifactAction>{
                        href: prUrl,
                        callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                            const executedEvent = new Telemetry.TelemetryEventData(
                                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                                CustomerIntelligenceConstants.VIEW_PR_FROM_ARTIFACT_ACTION, {
                                    "branchRef": miscData.refName,
                                    "pullRequestId": miscData.prId,
                                    "repositoryId": miscData.repoId,
                                    "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                                    "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                                    "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                                });
                            Telemetry.publishEvent(executedEvent);
                        },
                        miscData: {
                            refName: refName,
                            prId: prArtifact.pullRequestId,
                            repoId: repoId
                        },
                        text: VCResources.RelatedArtifactViewPullRequest,
                        title: VCResources.RelatedArtifactViewPullRequest
                    };

                    deferredAction.resolve(refAction);
                }
            }
            else {
                const gitRepository = <VCContracts.GitRepository>{
                    id: repoId,
                    name: repoId,
                    project: {
                        id: projId
                    }
                };

                const repoContext = new GitRepositoryContext(tfsContext, gitRepository);
                const createUrl = VersionControlUrls.getCreatePullRequestUrl(repoContext, refDisplayName, null, false, null, { project: projId });
                const refAction = <Artifacts_Plugins.IRelatedArtifactAction>{
                    href: createUrl,
                    callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                        const executedEvent = new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.CREATE_PR_FROM_ARTIFACT_ACTION, {
                                "branchRef": miscData.refName,
                                "repositoryId": miscData.repoId,
                                "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                                "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                                "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                            });
                        Telemetry.publishEvent(executedEvent);
                    },
                    miscData: {
                        refName: refName,
                        repoId: repoId
                    },
                    text: VCResources.RelatedArtifactCreatePullRequest,
                    title: VCResources.RelatedArtifactCreatePullRequest
                };

                deferredAction.resolve(refAction);
            }
        }, (error) => {
            deferredAction.reject(error);
        });

        return deferredAction.promise;
    }

    private _getCommitData(artifact: Artifacts_Services.IArtifactData, relatedData: Artifacts_Plugins.IArtifactDisplayData[], deferredList: Q.Deferred<Object>[], promiseList: Q.Promise<Object>[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData) {

        const commitArtifact = new CommitArtifact(artifact);
        const refTitle = commitArtifact.getTitle();
        const repoId = commitArtifact.repositoryId;
        const projId = commitArtifact.projectGuid;

        const commitId = commitArtifact.commitId;
        if (commitId == null || commitId.length == 0) {
            return;
        }

        const search = <VCContracts.GitQueryCommitsCriteria>{
            fromCommitId: commitId,
            toCommitId: commitId
        };

        const deferredArtifact: Q.Deferred<Object> = Q.defer<Object>();
        deferredList.push(deferredArtifact);
        promiseList.push(deferredArtifact.promise);

        this._httpClient.beginGetCommits(repoId, projId, search).then((results: VCWebApi.GitCommitSearchResults) => {

            for (let i = 0; i < results.commits.length; ++i) {

                const commit = results.commits[i];
                this._pushCommitData(relatedData, commit, repoId, projId, { date: commit.author.date }, tfsContext);
            }

            deferredArtifact.resolve(null);

        }, (error) => {
            relatedData.push(this._createDisplayArtifactWithError(artifact, error));
            deferredArtifact.resolve(null);
        });

    }

    private _pushCommitData(relatedData: Artifacts_Plugins.IArtifactDisplayData[], commit: VCContracts.GitCommitRef, repoId: string, projId: string, miscData: any, tfsContext: TFS_Host_TfsContext.TfsContext) {

        const gitRepository = <VCContracts.GitRepository>{
            id: repoId,
            name: repoId,
            project: {
                id: projId
            }
        };

        const repositoryContext = new GitRepositoryContext(tfsContext, gitRepository);

        const commitUrl = VersionControlUrls.getCommitUrl(repositoryContext, commit.commitId, null, null, null, {project: projId, includeTeam: false});
        const commitArtifact = new CommitArtifact({ projectGuid: projId, repositoryId: repoId, commitId: commit.commitId });

        let dateAdditionalData: Artifacts_Plugins.IRelatedArtifactAdditionalData = null;
        if (commit.author.date != null) {
            dateAdditionalData = {
                text: Utils_String.format(VCResources.PullRequests_RelatedArtifactsDescription, Utils_Date.friendly(commit.author.date)),
                title: Utils_Date.localeFormat(commit.author.date, "F")
            }
        }

        const commitData: Artifacts_Plugins.IArtifactDisplayData = <Artifacts_Plugins.IArtifactDisplayData>{
            tool: commitArtifact.getTool(),
            id: commitArtifact.getId(),
            type: commitArtifact.getType(),
            uri: commitArtifact.getUri(),
            primaryData: {
                typeIcon: {
                    type: Artifacts_Plugins.ArtifactIconType.icon,
                    descriptor: VCArtifactPlugin._commitTypeIcon,
                    title: this._getArtifactTitleText(commitArtifact.getType())
                },
                href: commitUrl,
                title: commit.comment,
                user: {
                    displayName: commit.author.name,
                    email: commit.author.email
                },
                callback: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => {
                    const executedEvent = new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.VIEW_COMMIT_FROM_ARTIFACT, {
                            "commitId": miscData.commitId,
                            "repositoryId": miscData.repoId,
                            "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                            "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                            "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                        });
                    Telemetry.publishEvent(executedEvent);
                },
                miscData: {
                    commitId: commit.commitId,
                    repoId: repoId
                }
            },
            additionalData: [dateAdditionalData, {
                text: CommitIdHelper.getShortCommitId(commit.commitId),
                title: commit.commitId
            }],
            miscData: miscData
        };

        relatedData.push(commitData);
    }

    public comparer(a: Artifacts_Plugins.IArtifactDisplayData, b: Artifacts_Plugins.IArtifactDisplayData): number {
        let aType = 0;
        if (Utils_String.ignoreCaseComparer(a.type, Artifacts_Constants.ArtifactTypeNames.Ref) === 0) {
            aType = 1;
        }
        else if (Utils_String.ignoreCaseComparer(a.type, Artifacts_Constants.ArtifactTypeNames.Commit) === 0) {
            aType = 2;
        }

        let bType = 0;
        if (Utils_String.ignoreCaseComparer(b.type, Artifacts_Constants.ArtifactTypeNames.Ref) === 0) {
            bType = 1;
        }
        else if (Utils_String.ignoreCaseComparer(b.type, Artifacts_Constants.ArtifactTypeNames.Commit) === 0) {
            bType = 2;
        }

        //first, sort by pull requests < branches < commits
        if (aType < bType) {
            return -1;
        }
        else if (aType > bType) {
            return 1;
        }

        //Then by sort date newest to oldest
        if (a.miscData.date > b.miscData.date) {
            return -1;
        }
        else if (a.miscData.date < b.miscData.date) {
            return 1;
        }

        return 0;
    }

    public getArtifactDisplayString(count: number, artifactType: string): string {
        if (count === 1) {
            if (Utils_String.ignoreCaseComparer(artifactType, "git/ref") === 0) {
                return VCResources.SingleBranch_RelatedArtifactsDisplayString;
            }
            else if (Utils_String.ignoreCaseComparer(artifactType, "git/commit") === 0) {
                return VCResources.SingleCommit_RelatedArtifactsDisplayString;
            }
            else if (Utils_String.ignoreCaseComparer(artifactType, "git/pullrequestid") === 0) {
                return VCResources.SinglePullRequest_RelatedArtifactsDisplayString;
            }

            return "";
        }

        if (Utils_String.ignoreCaseComparer(artifactType, "git/ref") === 0) {
            return Utils_String.format(VCResources.MultipleBranches_RelatedArtifactsDisplayString, count);
        }
        else if (Utils_String.ignoreCaseComparer(artifactType, "git/commit") === 0) {
            return Utils_String.format(VCResources.MultipleCommits_RelatedArtifactsDisplayString, count);
        }
        else if (Utils_String.ignoreCaseComparer(artifactType, "git/pullrequestid") === 0) {
            return Utils_String.format(VCResources.MultiplePullRequests_RelatedArtifactsDisplayString, count);
        }

        return "";
    }

    private _createDisplayArtifactWithError(artifact: Artifacts_Services.IArtifactData, error: any): Artifacts_Plugins.IArtifactDisplayData {
        const errorArtifact = <Artifacts_Plugins.IArtifactDisplayData>{
            tool: artifact.tool,
            id: artifact.id,
            type: artifact.type,
            uri: artifact.uri,
            error: <Error>{
                message: error,
                name: "VCArtifactPlugin Error"
            }
        }
        return errorArtifact;
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.RelatedArtifacts", exports);

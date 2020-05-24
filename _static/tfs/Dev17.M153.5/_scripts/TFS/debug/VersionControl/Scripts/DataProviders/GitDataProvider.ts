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
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import LinkedArtifacts_DataProvider = require("Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider");
import LinkedArtifacts = require("Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts");
import {ILinkedArtifact, ILinkedArtifactAdditionalData, ArtifactIconType} from "TFS/WorkItemTracking/ExtensionContracts";

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
import {AvatarUtils} from "VersionControl/Scenarios/Shared/AvatarUtils";

export default class GitDataProvider implements LinkedArtifacts_DataProvider.ILinkedArtifactsDataProvider {
    private _httpClient: VCWebApi.GitHttpClient;

    private static readonly _pullRequestTypeIcon: string = "bowtie-tfvc-pull-request";
    private static readonly _branchTypeIcon: string = "bowtie-tfvc-branch";
    private static readonly _tagTypeIcon: string = "bowtie-tag";
    private static readonly _commitTypeIcon: string = "bowtie-tfvc-commit";

    private static readonly _successIcon: string = "bowtie-check";
    private static readonly _waitingIcon: string = "bowtie-status-waiting-fill";
    private static readonly _failureIcon: string = "bowtie-edit-delete";

    private static readonly _successClass: string = "vc-pullrequest-rollupstatus-success-text";
    private static readonly _infoClass: string = "vc-pullrequest-rollupstatus-info-text";
    private static readonly _failureClass: string = "vc-pullrequest-rollupstatus-failure-text";

    readonly supportedTool: string = "git";

    public requiredFeaturesForActions = [LicenseConstants.LicenseFeatureIds.Code];
    private _artifactMap: IDictionaryStringTo<LinkedArtifacts.IHostArtifact>;

    public artifactLimit = 45;

    public beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: LinkedArtifacts.IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData []> {
        const deferred = Q.defer<LinkedArtifacts.IInternalLinkedArtifactDisplayData []>();
        const retValue: LinkedArtifacts.IInternalLinkedArtifactDisplayData [] = [];

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
                        //do nothing for now
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

    private _getRouteDataForLink(projectId: string, projectName: string, tfsContext: TFS_Host_TfsContext.TfsContext) {
        const referencesCurrentProject = tfsContext && tfsContext.contextData && tfsContext.contextData.project && tfsContext.contextData.project.id === projectId;
        const includeTeam = referencesCurrentProject;

        return {
            project: referencesCurrentProject ? tfsContext.contextData.project.name : projectName,
            includeTeam: includeTeam
        };
    }

    /** Get user visible link to pull request. If the PR is for a repository within the current (tfsContext) project, the current team context will be preserved */
    private _getPullRequestUrl(id: number, repoName: string, projectId: string, projectName: string, tfsContext: TFS_Host_TfsContext.TfsContext): string {
        return VersionControlUrls.getPullRequestUrlUsingRepoId(
            repoName, projectId, id, tfsContext, this._getRouteDataForLink(projectId, projectName, tfsContext));
    }

    private _getPullRequestData(
        artifact: ILinkedArtifact,
        relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData [],
        deferredList: Q.Deferred<Object>[],
        promiseList: Q.Promise<Object>[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact) {

        const prArtifact = new PullRequestArtifact(artifact);
        //have to call getTitle to initialize the values?
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

            const prUrl = this._getPullRequestUrl(pr.pullRequestId, pr.repository.name, pr.repository.project.id, pr.repository.project.name, tfsContext);

            let dateAdditionalData: ILinkedArtifactAdditionalData = null;
            if (pr.creationDate != null) {
                dateAdditionalData = {
                    styledText: { text: Utils_String.format(VCResources.PullRequests_RelatedArtifactsDescription, Utils_Date.friendly(pr.creationDate)) },
                    title: Utils_Date.localeFormat(pr.creationDate, "F"),
                    rawData: pr.creationDate
                }
            }

            const prData = <LinkedArtifacts.IInternalLinkedArtifactDisplayData >{
                tool: artifact.tool,
                id: artifact.id,
                type: artifact.type,
                linkType: artifact.linkType,
                linkTypeDisplayName: VCResources.RelatedArtifactPullRequestTitle,
                uri: artifact.uri,
                comment: artifact.comment,
                primaryData: {
                    typeIcon: {
                        type: ArtifactIconType.icon,
                        descriptor: GitDataProvider._pullRequestTypeIcon,
                        title: this._getArtifactTitleText(artifact.type)
                    },
                    href: prUrl,
                    title: prTitle,
                    user: {
                        displayName: pr.createdBy.displayName,
                        id: pr.createdBy.id,
                        uniqueName: pr.createdBy.uniqueName,
                        imageUrl: AvatarUtils.getAvatarUrl(pr.createdBy)
                    },
                    callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
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

                        return false;
                    },
                    miscData: {
                        prId: prArtifact.pullRequestId,
                        repoId: repoId
                    }
                },
                additionalData: {
                    [LinkedArtifacts.InternalKnownColumns.LastUpdate.refName]: dateAdditionalData, //TODO: Do not fill when not in column
                    [LinkedArtifacts.InternalKnownColumns.State.refName]: {
                        icon: prState.iconClass != null ? {
                            type: ArtifactIconType.icon,
                            descriptor: prState.iconClass,
                            title: prState.state
                        } : null,
                        styledText: { text: prState.state },
                        title: prState.state
                    }
                },
                miscData: {
                    date: pr.creationDate
                }
            };

            relatedData.push(prData);

            deferredArtifact.resolve(null);

        }, (error) => {
            Diag.logError(error);
            relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindPullRequest));
            deferredArtifact.resolve(null);
        });

    }
    private _computePullRequestState(pr: VCContracts.GitPullRequest): { state: string, iconClass: string, stateClass: string } {

        if (pr.status === VCContracts.PullRequestStatus.Completed) {
            return {
                state: VCResources.PullRequest_PullRequestDetailsStatusCompleted,
                iconClass: GitDataProvider._successIcon,
                stateClass: GitDataProvider._successClass
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
            //not completed or abandoned so active. First check for merge conflicts
            if (pr.mergeStatus === VCContracts.PullRequestAsyncStatus.Conflicts) {
                return {
                    state: VCResources.PullRequest_PullRequestDetailsMergeStatus_Conflicts,
                    iconClass: GitDataProvider._failureIcon,
                    stateClass: GitDataProvider._failureClass
                };
            }

            //active and no merge conflicts so get the minimum vote
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
                    iconClass: GitDataProvider._failureIcon,
                    stateClass: GitDataProvider._failureClass
                };
            }
            else if (minVote === PullRequestVoteStatus.NOT_READY) {
                return {
                    state: VCResources.PullRequest_NotReady,
                    iconClass: GitDataProvider._waitingIcon,
                    stateClass: GitDataProvider._infoClass
                };
            }
            else if (minVote === PullRequestVoteStatus.APPROVE_WITH_COMMENT) {
                return {
                    state: VCResources.PullRequest_ApproveWithComment,
                    iconClass: GitDataProvider._successIcon,
                    stateClass: GitDataProvider._successClass
                };
            }
            else if (minVote === PullRequestVoteStatus.APPROVE) {
                return {
                    state: VCResources.PullRequest_Approve,
                    iconClass: GitDataProvider._successIcon,
                    stateClass: GitDataProvider._successClass
                };
            }

            //nothing interesting to say so just active
            return {
                state: VCResources.PullRequest_PullRequestDetailsStatusActive,
                iconClass: null,
                stateClass: GitDataProvider._infoClass
            };
        }
    }

    private _getRefData(artifact: ILinkedArtifact, relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData [], deferredList: Q.Deferred<Object>[], promiseList: Q.Promise<Object>[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: LinkedArtifacts.IHostArtifact) {

        const tempArtifact: LinkedArtifacts.IHostArtifact = {
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
            refName = `refs/tags/${refTitle}`;
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
                    const refUrl = VersionControlUrls.getExplorerUrl(new GitRepositoryContext(tfsContext, <VCContracts.GitRepository>{
                        id: repoId,
                        name: repoId,
                        project: {
                            id: projId
                        }
                    }), null, null, { version: refArtifact.refName }, this._getRouteDataForLink(projId, projId, tfsContext));

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
                        includeUserImageUrl: true,
                        itemVersion: {
                            version: refDisplayName,
                            versionType: isBranch ? VCContracts.GitVersionType.Branch : VCContracts.GitVersionType.Tag,
                            versionOptions: VCContracts.GitVersionOptions.None
                        }
                    };

                    this._httpClient.beginGetCommits(repoId, projId, search).then((results: VCWebApi.GitCommitSearchResults) => {
                        if (results != null && results.commits.length === 1) {
                            const commit = results.commits[0];
                            let dateAdditionalData: ILinkedArtifactAdditionalData = null;
                            if (commit.author.date != null) {
                                dateAdditionalData = {
                                    styledText: { text: Utils_String.format(VCResources.Refs_RelatedArtifactsDescription, Utils_Date.friendly(commit.author.date)) },
                                    title: Utils_Date.localeFormat(commit.author.date, "F"),
                                    rawData: commit.author.date
                                }
                            }

                            const refData = <LinkedArtifacts.IInternalLinkedArtifactDisplayData >{
                                tool: artifact.tool,
                                id: artifact.id,
                                type: artifact.type,
                                linkType: artifact.linkType,
                                linkTypeDisplayName: isBranch ? VCResources.RelatedArtifactBranchTitle : VCResources.RelatedArtifactTagTitle,
                                uri: artifact.uri,
                                comment: artifact.comment,
                                primaryData: {
                                    typeIcon: isBranch ? {
                                        type: ArtifactIconType.icon,
                                        descriptor: GitDataProvider._branchTypeIcon,
                                        title: this._getArtifactTitleText(artifact.type)
                                    } : {
                                            type: ArtifactIconType.icon,
                                            descriptor: GitDataProvider._tagTypeIcon,
                                            title: this._getArtifactTitleText(artifact.type)
                                        },
                                    href: refUrl,
                                    title: refDisplayName,
                                    user: {
                                        displayName: commit.author.name,
                                        email: commit.author.email,
                                        imageUrl: commit.author.imageUrl
                                    },
                                    callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
                                        const executedEvent = new Telemetry.TelemetryEventData(
                                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                                            CustomerIntelligenceConstants.VIEW_BRANCH_FROM_ARTIFACT, {
                                                "repositoryId": miscData.repoId,
                                                "hostArtifactId": hostArtifact ? hostArtifact.id.toLowerCase() : null,
                                                "hostArtifactTool": hostArtifact ? hostArtifact.tool.toLowerCase() : null,
                                                "hostArtifactType": hostArtifact ? hostArtifact.type.toLowerCase() : null
                                            });
                                        Telemetry.publishEvent(executedEvent);

                                        return false;
                                    },
                                    miscData: {
                                        refName: refName,
                                        repoId: repoId
                                    }
                                },
                                additionalData: {
                                    [LinkedArtifacts.InternalKnownColumns.LastUpdate.refName]: dateAdditionalData
                                },
                                miscData: {
                                    date: commit.author.date
                                }
                            };

                            if (hostArtifact != null && isBranch) {
                                this._beginGetRefAction(repoId, projId, ref.name, refDisplayName, tfsContext, hostArtifact).then((action: LinkedArtifacts.ILinkedArtifactAction) => {

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
            Diag.logError(error);
            relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindBranch));
            deferredArtifact.resolve(null);
        });
    }

    private _beginGetRefAction(
        repoId: string, projId: string, refName: string, refDisplayName: string, tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: LinkedArtifacts.IHostArtifact): IPromise<LinkedArtifacts.ILinkedArtifactAction> {

        let alreadyExists = false;
        const existingPr = null;

        const deferredAction = Q.defer<LinkedArtifacts.ILinkedArtifactAction>();

        this._httpClient.beginGetAllPullRequests(repoId, projId, VCContracts.PullRequestStatus.Active, null, null, refName, null, 1, 0).then((prs: VCContracts.GitPullRequest[]) => {
            if (prs.length > 0) {
                alreadyExists = true;
                const pr = prs[0];

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
                    // beginGetAllPullRequests does not include the project/repository name, so fall back to ids.
                    const prUrl = this._getPullRequestUrl(pr.pullRequestId, repoId, projId, projId, tfsContext);

                    const refAction = <LinkedArtifacts.ILinkedArtifactAction>{
                        href: prUrl,
                        callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
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
                        styledText: { text: VCResources.RelatedArtifactViewPullRequest },
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
                const createUrl = VersionControlUrls.getCreatePullRequestUrl(repoContext, refDisplayName, null, false, null, this._getRouteDataForLink(projId, projId, tfsContext));
                const refAction = <LinkedArtifacts.ILinkedArtifactAction>{
                    href: createUrl,
                    callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
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
                    styledText: { text: VCResources.RelatedArtifactCreatePullRequest },
                    title: VCResources.RelatedArtifactCreatePullRequest
                };

                deferredAction.resolve(refAction);
            }
        }, (error) => {
            deferredAction.reject(error);
        });

        return deferredAction.promise;
    }

    private _getCommitData(artifact: ILinkedArtifact, relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData [], deferredList: Q.Deferred<Object>[], promiseList: Q.Promise<Object>[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: LinkedArtifacts.IHostArtifact) {

        const commitArtifact = new CommitArtifact(artifact);
        const refTitle = commitArtifact.getTitle();
        const repoId = commitArtifact.repositoryId;
        const projId = commitArtifact.projectGuid;

        const commitId = commitArtifact.commitId;
        if (commitId == null || commitId.length == 0) {
            return;
        }

        const search = <VCContracts.GitQueryCommitsCriteria>{
            includeUserImageUrl: true,
            fromCommitId: commitId,
            toCommitId: commitId
        };

        const deferredArtifact: Q.Deferred<Object> = Q.defer<Object>();
        deferredList.push(deferredArtifact);
        promiseList.push(deferredArtifact.promise);

        this._httpClient.beginGetCommits(repoId, projId, search).then((results: VCWebApi.GitCommitSearchResults) => {

            for (let i = 0; i < results.commits.length; ++i) {
                const commit = results.commits[i];
                this._pushCommitData(artifact, relatedData, commit, repoId, projId, { date: commit.author.date }, tfsContext);
            }

            deferredArtifact.resolve(null);
        }, (error) => {
            Diag.logError(error);
            relatedData.push(this._createDisplayArtifactWithError(artifact, VCResources.RelatedArtifacts_FailedToFindCommit));
            deferredArtifact.resolve(null);
        });

    }

    private _pushCommitData(artifact: ILinkedArtifact, relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData [], commit: VCContracts.GitCommitRef, repoId: string, projId: string, miscData: any, tfsContext: TFS_Host_TfsContext.TfsContext) {
        const gitRepository = <VCContracts.GitRepository>{
            id: repoId,
            name: repoId,
            project: {
                id: projId
            }
        };

        const repositoryContext = new GitRepositoryContext(tfsContext, gitRepository);

        const commitUrl = VersionControlUrls.getCommitUrl(repositoryContext, commit.commitId, null, null, null, this._getRouteDataForLink(projId, projId, tfsContext));
        const commitArtifact = new CommitArtifact({ projectGuid: projId, repositoryId: repoId, commitId: commit.commitId });

        let dateAdditionalData: ILinkedArtifactAdditionalData = null;
        if (commit.author.date != null) {
            dateAdditionalData = {
                styledText: { text: Utils_String.format(VCResources.PullRequests_RelatedArtifactsDescription, Utils_Date.friendly(commit.author.date)) },
                title: Utils_Date.localeFormat(commit.author.date, "F"),
                rawData: commit.author.date
            }
        }

        const commitData = <LinkedArtifacts.IInternalLinkedArtifactDisplayData >{
            tool: commitArtifact.getTool(),
            id: commitArtifact.getId(),
            type: commitArtifact.getType(),
            linkType: artifact.linkType,
            linkTypeDisplayName: VCResources.RelatedArtifactCommitTitle,
            uri: commitArtifact.getUri(),
            comment: artifact.comment,
            primaryData: {
                typeIcon: {
                    type: ArtifactIconType.icon,
                    descriptor: GitDataProvider._commitTypeIcon,
                    title: this._getArtifactTitleText(commitArtifact.getType())
                },
                displayId: {
                    text: CommitIdHelper.getShortCommitId(commit.commitId),
                    title: commit.commitId
                },
                href: commitUrl,
                title: commit.comment,
                user: {
                    displayName: commit.author.name,
                    email: commit.author.email,
                    imageUrl: commit.author.imageUrl
                },
                callback: (miscData: any, hostArtifact?: LinkedArtifacts.IHostArtifact) => {
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

                    return false;
                },
                miscData: {
                    commitId: commit.commitId,
                    repoId: repoId
                }
            },
            additionalData: {
                [LinkedArtifacts.InternalKnownColumns.LastUpdate.refName]: dateAdditionalData
            },
            miscData: miscData
        };

        relatedData.push(commitData);
    }

    public comparer(a: LinkedArtifacts.IInternalLinkedArtifactDisplayData , b: LinkedArtifacts.IInternalLinkedArtifactDisplayData ): number {
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

    private _createDisplayArtifactWithError(artifact: ILinkedArtifact, error: any): LinkedArtifacts.IInternalLinkedArtifactDisplayData  {
        return {
            tool: artifact.tool,
            id: artifact.id,
            type: artifact.type,
            linkType: artifact.linkType,
            linkTypeDisplayName: artifact.linkTypeDisplayName,
            uri: artifact.uri,
            error: <Error>{
                message: VSS.getErrorMessage(error),
                name: "VCArtifactPlugin Error"
            }
        };
    }
}
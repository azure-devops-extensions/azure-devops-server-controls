import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { IReleaseState } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { IReleaseSummaryArtifact, IReleaseSummaryViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ArtifactDefinitionConstants, ArtifactTypes } from "ReleaseManagement/Core/Constants";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import { TfsContext } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Host.TfsContext";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";


export class ReleaseSummaryViewHelper {

    public static getReleaseSummaryViewStoreState(release: ReleaseContracts.Release, releaseState: IReleaseState): IReleaseSummaryViewState {
        let friendlyStartDate: string = release.createdOn ? DateTimeUtils.getLocaleTimestamp(release.createdOn) : Utils_String.empty;
        let startDateTooltip: string = release.createdOn ?
            DateTimeUtils.getLocaleTimestamp(release.createdOn, DateTimeUtils.longFormatOptions) : Utils_String.empty;
        let state: IReleaseSummaryViewState;
        state = {
            release: release,
            releaseName: release.name,
            releaseReason: release.reason,
            description: releaseState.description,
            friendlyStartDate: friendlyStartDate,
            startDateTooltip: startDateTooltip,
            triggerReasonText: ReleaseSummaryViewHelper._getTriggerReasonText(release.reason),
            triggerCreatedBy: (release.createdBy ? release.createdBy.displayName : Utils_String.empty),
            createdByAvatarUrl: IdentityHelper.getIdentityAvatarUrl(release.createdBy),
            triggerIcon: ReleaseSummaryViewHelper._getTriggerIcon(release.reason),
            tags: releaseState.tags ? Utils_Array.clone(releaseState.tags) : [],
            allTags: releaseState.allTags ? Utils_Array.clone(releaseState.allTags) : [],
            artifacts: ReleaseSummaryViewHelper.getReleaseSummaryArtifacts(releaseState.artifacts)
        } as IReleaseSummaryViewState;
        return state;
    }

    private static _getTriggerReasonText(releaseReason: ReleaseContracts.ReleaseReason): string {
        let triggerReasonText: string = Utils_String.empty;

        switch (releaseReason) {
            case ReleaseContracts.ReleaseReason.ContinuousIntegration:
                triggerReasonText = Resources.ReleaseSummaryContinuousIntegrationText;
                break;
            case ReleaseContracts.ReleaseReason.PullRequest:
                triggerReasonText = Resources.ReleaseSummaryPullRequestTriggeredText;
                break;
            case ReleaseContracts.ReleaseReason.Schedule:
                triggerReasonText = Resources.ReleaseSummaryScheduleTriggeredText;
                break;
            default:
                triggerReasonText = Resources.ReleaseSummaryManualTriggeredText;
                break;
        }
        return triggerReasonText;
    }

    private static _getTriggerIcon(releaseReason: ReleaseContracts.ReleaseReason): string {
        let triggerIcon: string = Utils_String.empty;

        switch (releaseReason) {
            case ReleaseContracts.ReleaseReason.ContinuousIntegration:
            case ReleaseContracts.ReleaseReason.PullRequest:
                triggerIcon = "bowtie-trigger-auto";
                break;
            case ReleaseContracts.ReleaseReason.Schedule:
                triggerIcon = "bowtie-navigate-history";
                break;
            default:
                triggerIcon = "bowtie-user";
                break;
        }
        return triggerIcon;
    }

    public static getReleaseSummaryArtifacts(artifacts: ReleaseContracts.Artifact[]): IReleaseSummaryArtifact[] {
        let releaseSummaryArtifacts: IReleaseSummaryArtifact[] = [];

        if (artifacts) {
            for (let artifact of artifacts) {
                let releaseSummaryArtifact: IReleaseSummaryArtifact = ReleaseSummaryViewHelper._getReleaseSummaryArtifactFromReleaseArtifact(artifact);
                if (releaseSummaryArtifact) {
                    releaseSummaryArtifacts.push(releaseSummaryArtifact);
                }
            }
        }
        return releaseSummaryArtifacts;
    }


    private static _getReleaseSummaryArtifactFromReleaseArtifact(artifact: ReleaseContracts.Artifact): IReleaseSummaryArtifact {
        let releaseSummaryArtifact: IReleaseSummaryArtifact;
        if (artifact) {
            let artifactSource: { [key: string]: ReleaseContracts.ArtifactSourceReference } = artifact.definitionReference;
            if (artifactSource) {
                // Get the branch name
                let sourceBranchName: string = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.BranchId) ?
                    this._getBranchDisplayString(artifactSource[ArtifactDefinitionConstants.BranchId].name) : Utils_String.empty;

                // Get details of artifact source
                let artifactSourceName: string = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.DefinitionId) ?
                    artifactSource[ArtifactDefinitionConstants.DefinitionId].name : Utils_String.empty;
                let artifactSourceId: string = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.DefinitionId) ?
                    artifactSource[ArtifactDefinitionConstants.DefinitionId].id : Utils_String.empty;
                let artifactSourceUrl: string = ReleaseSummaryViewHelper._getArtifactSourceUrl(artifact.type, artifactSourceId, artifactSource);

                // Get details of artifact version
                let artifactVersionValue: string = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.Version) ?
                    artifactSource[ArtifactDefinitionConstants.Version].name : Utils_String.empty;

                if (artifactSource.hasOwnProperty(ArtifactDefinitionConstants.Version)
                    && artifactSource.hasOwnProperty(ArtifactDefinitionConstants.DefinitionId)
                    && artifactSource[ArtifactDefinitionConstants.DefinitionId]
                    && ArtifactUtility.isMultiDefinitionType(artifactSource)) {
                    artifactVersionValue = Utils_String.localeFormat("{0} ({1})", artifactSource[ArtifactDefinitionConstants.Version].name, artifactSource[ArtifactDefinitionConstants.DefinitionId].name);
                }

                let artifactVersionId: string = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.Version) ?
                    artifactSource[ArtifactDefinitionConstants.Version].id : Utils_String.empty;
                let artifactVersionUrl: string = ReleaseSummaryViewHelper._getArtifactVersionUrl(artifact.type, artifactSourceId, artifactVersionId, artifactSource);

                // Get Details if artifact is triggering artifact
                let isTriggeringArtifact: boolean = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.IsTriggeringArtifact) ?
                    DtcUtils.getBoolValue(artifactSource[ArtifactDefinitionConstants.IsTriggeringArtifact].id) : false;

                // Get artifact icon
                let artifactIcon: string = ArtifactUtility.getArtifactBowtieIcon(artifact.type);

                releaseSummaryArtifact = {
                    sourceBranchText: sourceBranchName,
                    artifactSourceText: artifactSourceName,
                    artifactSourceUrl: artifactSourceUrl,
                    artifactVersionText: artifactVersionValue,
                    artifactVersionUrl: artifactVersionUrl,
                    icon: artifactIcon,
                    alias: artifact.alias,
                    isTriggeringArtifact: isTriggeringArtifact
                };
            }
        }
        return releaseSummaryArtifact;
    }

    private static _getArtifactVersionUrl(artifactType: string, sourceId: string, versionId: string, artifactSource: { [key: string]: ReleaseContracts.ArtifactSourceReference }): string {
        let artifactVersionUrl: string = Utils_String.empty;
        if (artifactSource) {
            switch (artifactType) {
                case ArtifactTypes.GitArtifactType:
                    const gitProjectId = this._getProjectId(artifactSource);
                    artifactVersionUrl = ReleaseSummaryViewHelper._getCommitUrl(gitProjectId, sourceId, versionId);
                    break;

                case ArtifactTypes.BuildArtifactType:
                    const projectId = this._getProjectId(artifactSource);
                    artifactVersionUrl = this._getBuildSummaryUrl(projectId, versionId);
                    break;

                default:
                    artifactVersionUrl = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.ArtifactSourceVersionUrl) ?
                        artifactSource[ArtifactDefinitionConstants.ArtifactSourceVersionUrl].id : Utils_String.empty;
                    break;
            }
        }
        return artifactVersionUrl;
    }

    private static _getBranchDisplayString(branch: string): string {
        let trimmedBranch: string = branch;

        if (!!branch && Utils_String.startsWith(branch, this._branchPrefix)) {
            trimmedBranch = branch.substr(this._branchPrefix.length);
        }

        return trimmedBranch;
    }

    private static _getArtifactSourceUrl(artifactType: string, sourceId: string, artifactSource: { [key: string]: ReleaseContracts.ArtifactSourceReference }): string {
        let artifactSourceUrl: string = Utils_String.empty;
        if (artifactSource) {
            switch (artifactType) {
                case ArtifactTypes.GitArtifactType:
                    const gitProjectId = this._getProjectId(artifactSource);
                    artifactSourceUrl = ReleaseSummaryViewHelper._getRepositoryUrl(gitProjectId, sourceId);
                    break;

                case ArtifactTypes.BuildArtifactType:
                    const projectId = this._getProjectId(artifactSource);
                    artifactSourceUrl = this._getBuildDefinitionSummaryUrl(projectId, sourceId);
                    break;

                default:
                    artifactSourceUrl = artifactSource.hasOwnProperty(ArtifactDefinitionConstants.ArtifactSourceDefinitionUrl) ?
                        artifactSource[ArtifactDefinitionConstants.ArtifactSourceDefinitionUrl].id : Utils_String.empty;
                    break;
            }
        }
        return artifactSourceUrl;
    }

    private static _getProjectId(artifactSource: { [key: string]: ReleaseContracts.ArtifactSourceReference }): string {
        return artifactSource.hasOwnProperty(ArtifactDefinitionConstants.ProjectId) ? artifactSource[ArtifactDefinitionConstants.ProjectId].id : Utils_String.empty;
    }

    private static _getBuildDefinitionSummaryUrl(projectId: string, definitionId: string): string {
        const defaultTfsContext = TfsContext.getDefault();
        return defaultTfsContext.getPublicActionUrl(this.c_buildSummaryViewDefaultAction, this.c_buildSummaryViewController, { project: projectId, definitionId: definitionId });
    }

    private static _getBuildSummaryUrl(projectId: string, buildId: string): string {
        const defaultTfsContext = TfsContext.getDefault();
        return defaultTfsContext.getPublicActionUrl(this.c_buildSummaryViewDefaultAction, this.c_buildSummaryViewController, { project: projectId, buildId: buildId });
    }

    private static _getCommitUrl(projectId: string, repositoryId: string, commitId: string): string {
        const defaultTfsContext = TfsContext.getDefault();
        return defaultTfsContext.getPublicActionUrl(repositoryId, this.c_gitViewController, { parameters: ["commit", commitId], project: projectId });
    }

    private static _getRepositoryUrl(projectId: string, repositoryId: string): string {
        const defaultTfsContext = TfsContext.getDefault();
        return defaultTfsContext.getPublicActionUrl(repositoryId, this.c_gitViewController, { project: projectId });
    }

    private static readonly _branchPrefix = "refs/heads/";
    private static readonly c_buildSummaryViewDefaultAction = "index";
    private static readonly c_buildSummaryViewController = "build";
    private static readonly c_gitViewController = "git";
}
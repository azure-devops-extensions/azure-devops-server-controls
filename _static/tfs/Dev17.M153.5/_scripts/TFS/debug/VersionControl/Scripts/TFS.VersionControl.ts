/// <reference types="jquery" />

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_String = require("VSS/Utils/String");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Locations = require("VSS/Locations");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import {ChangesetArtifact} from "VersionControl/Scripts/ChangesetArtifact";
import {ChangeListType} from "VersionControl/Scripts/ChangeListType";
import {CommitArtifact} from "VersionControl/Scripts/CommitArtifact";
import {GitRefArtifact} from "VersionControl/Scripts/GitRefArtifact";
import {PullRequestArtifact} from "VersionControl/Scripts/PullRequestArtifact";

let queueRequest = VSS.queueRequest;
let latestVersion;

export enum RecursionType {
    None = 0,
    OneLevel = 1,
    Full = 120,
}

export import GitObjectType = VCLegacyContracts.GitObjectType;

export enum FileDiffBlockChangeType {
    None = 0,
    Add = 1,
    Delete = 2,
    Edit = 3
}

export module LegacyConverters {
    export function convertChangeList(changeList: VCLegacyContracts.ChangeList): VCContracts.ChangeList<VCContracts.GitItem> | VCContracts.ChangeList<VCContracts.TfvcItem> {
        return <VCContracts.ChangeList<VCContracts.GitItem> | VCContracts.ChangeList<VCContracts.TfvcItem>> {
            allChangesIncluded: changeList.allChangesIncluded,
            changeCounts: changeList.changeCounts,
            changes: <any>changeList.changes,
            comment: changeList.comment,
            commentTruncated: false,
            creationDate: changeList.creationDate,
            owner: changeList.owner,
            ownerDisplayName: changeList.ownerDisplayName,
            ownerId: changeList.ownerId,
            sortDate: changeList.sortDate,
            version: changeList.version
        };
    }
}

export module ChangeListTypeHelper {
    export function getChangeListType(changeList: VCLegacyContracts.ChangeList) {
        let changeListType = ChangeListType.Unknown;
        if ((<VCLegacyContracts.GitCommit>changeList).commitId) {
            changeListType = ChangeListType.Commit;
        }
        else if ((<VCLegacyContracts.TfsChangeList>changeList).changesetId) {
            changeListType = ChangeListType.Changeset;
        }
        else if ((<VCLegacyContracts.TfsChangeList>changeList).shelvesetName) {
            changeListType = ChangeListType.Shelveset;
        }
        return changeListType;
    }
}

export module ChangeType {

    let cachedChangeTypeTexts: { [changeType: number]: string; } = <any>{};

    export function getDisplayText(changeType: VCLegacyContracts.VersionControlChangeType) {
        let text = cachedChangeTypeTexts[<number>changeType];

        if (typeof text === "undefined") {

            if (!changeType) {
                text = VCResources.ChangeTypeNone;
            }
            else {
                let pieces: string[] = [];

                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Merge)) {
                    pieces.push(VCResources.ChangeTypeMerge);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add)) {
                    pieces.push(VCResources.ChangeTypeAdd);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Branch)) {
                    pieces.push(VCResources.ChangeTypeBranch);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                    pieces.push(VCResources.ChangeTypeDelete);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Encoding) &&
                    !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Branch) &&
                    !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add)) {

                    pieces.push(VCResources.ChangeTypeFileType);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Lock)) {
                    pieces.push(VCResources.ChangeTypeLock);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
                    pieces.push(VCResources.ChangeTypeRename);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Undelete)) {
                    pieces.push(VCResources.ChangeTypeUndelete);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Edit) &&
                    !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add)) {

                    pieces.push(VCResources.ChangeTypeEdit);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Rollback)) {
                    pieces.push(VCResources.ChangeTypeRollback);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.SourceRename)) {
                    pieces.push(VCResources.ChangeTypeSourceRename);
                }
                if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Property)) {
                    pieces.push(VCResources.ChangeTypeProperty);
                }

                text = pieces.join(", ");
            }

            cachedChangeTypeTexts[<number>changeType] = text;
        }

        return text;
    }

    export function getDecorationText(changeType: VCLegacyContracts.VersionControlChangeType, usePlusSignForAdds: boolean) {

        let changeTypeText = "";

        if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add) && usePlusSignForAdds) { // only Add
            changeTypeText = "+";
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Edit) { // only Edit
            changeTypeText = "";
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Delete) { // only Delete
            changeTypeText = "";
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Merge) { // only Merge
            changeTypeText = VCResources.ChangeTypeMerge;
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Branch) { // only Branch
            changeTypeText = VCResources.ChangeTypeBranch;
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Undelete) { // only Undelete
            changeTypeText = VCResources.ChangeTypeUndelete;
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Rollback) { // only Rollback
            changeTypeText = VCResources.ChangeTypeRollback;
        }
        else if (changeType === VCLegacyContracts.VersionControlChangeType.Encoding) { // only Encoding
            changeTypeText = VCResources.ChangeTypeFileType;
        }
        else if (ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Branch)) { // for Branch, ignore Edit and Encoding
            changeTypeText = ChangeType.getDisplayText(changeType);
        }
        else {
            changeTypeText = ChangeType.getDisplayText(changeType);
        }

        return changeTypeText;
    }

    export function isEdit(changeType: VCLegacyContracts.VersionControlChangeType) {
        return ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Edit) &&
            !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add);
    }

    export function isSourceRenameDelete(changeType: VCLegacyContracts.VersionControlChangeType) {
        return ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.SourceRename) &&
            ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Delete);
    }

    export function hasChangeFlag(changeType: VCLegacyContracts.VersionControlChangeType, changeTypeFlag: VCLegacyContracts.VersionControlChangeType) {
        /*jslint bitwise: false*/
        let returnValue = ((changeType & changeTypeFlag) !== 0);
        /*jslint bitwise: true*/
        return returnValue;
    }
}

export module GitRefUpdateNameUtility {

    export function getFriendlyRefName(refUpdate: VCContracts.GitRefUpdate): string {
        let refName = refUpdate.name;
        if (refName.indexOf("refs/heads/") === 0) {
            refName = Utils_String.format(VCResources.PushBranchRefFormat, refName.substring("refs/heads/".length));
        }
        else if (refName.indexOf("refs/tags/") === 0) {
            refName = Utils_String.format(VCResources.PushTagRefFormat, refName.substring("refs/tags/".length));
        }
        return refName;
    }

    export function getRefUpdateDescription(refUpdate: VCContracts.GitRefUpdate): string {
        let refName = getFriendlyRefName(refUpdate);

        if (CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId)) {
            return Utils_String.format(VCResources.PushRefCreatedFormat, refName, CommitIdHelper.getShortCommitId(refUpdate.newObjectId));
        }
        else if (CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId)) {
            return Utils_String.format(VCResources.PushRefDeletedFormat, refName);
        }
        else {
            return Utils_String.format(VCResources.PushRefUpdateFormat, refName, CommitIdHelper.getShortCommitId(refUpdate.newObjectId));
        }
    }

    export function getRefUpdateDescriptionShortFormat(refUpdate: VCContracts.GitRefUpdate): string {

        if (CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId)) {
            return Utils_String.format(VCResources.PushRefCreatedShortFormat, CommitIdHelper.getShortCommitId(refUpdate.newObjectId));
        }
        else if (CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId)) {
            return VCResources.PushRefDeletedShortFormat;
        }
        else {
            return Utils_String.format(VCResources.PushRefUpdateShortFormat, CommitIdHelper.getShortCommitId(refUpdate.newObjectId));
        }
    }

}

export class GitCommitCommentFetcher {

    private static COMMIT_FETCH_BATCH_SIZE = 250;

    private _commitCommentsById: { [commitId: string]: string };

    constructor() {
        this._commitCommentsById = {};
    }

    public beginFetchingCommitComments(repositoryContext: GitRepositoryContext, commitIds: string[], callback: (commitCommentsById: { [commitId: string]: string }) => void) {

        if (!commitIds || commitIds.length === 0) {
            return;
        }

        let toFetchIds: string[] = [];
        let results: { [commitId: string]: string } = {};
        let forNextBatch: string[] = [];

        $.each(commitIds, (i: number, commitId: string) => {
            if (toFetchIds.length === GitCommitCommentFetcher.COMMIT_FETCH_BATCH_SIZE) {
                forNextBatch.push(commitId);
            }
            else {
                // Skip duplicate commit ids
                if (!results.hasOwnProperty(commitId)) {
                    let comment = this._commitCommentsById[commitId];
                    if (comment) {
                        results[commitId] = comment;
                    }
                    else {
                        toFetchIds.push(commitId);
                        results[commitId] = "";
                    }
                }
            }
        });

        // If commitIds is not empty and tofetchIds is empty, then all the commit ids already have comments in the results populated from the cache(_commitCommentsById)
        if (toFetchIds.length === 0) {
            callback(results);
            return;
        }

        repositoryContext.getGitClient().beginGetCommitsById(repositoryContext, toFetchIds, (commits: VCContracts.GitCommitRef[]) => {

            // Store the commit comments for those fetched
            $.each(commits, (i: number, commit: VCContracts.GitCommitRef) => {
                let parsedComment = VCCommentParser.Parser.getShortComment(commit.comment, null, true) || "";
                results[commit.commitId] = parsedComment;
                this._commitCommentsById[commit.commitId] = parsedComment;
            });

            // Invoke the callback
            callback.call(this, results);

            // Fetch the next batch
            this.beginFetchingCommitComments(repositoryContext, forNextBatch, callback);
        });
    }
}

// Encapsulates a TFVC version control path
// This parses properties about the path like the project name, project relative path, etc.
export class VersionedItemArtifact extends Artifacts_Services.Artifact {

    public path: string;
    public changesetId: string;
    public project: string;

    constructor (data: any) {
        /// <summary> Decodes versioned item details of an artifact URI like:
        /// vstfs:///VersionControl/VersionedItem/{path}&changesetVersion={changeset-number}&deletionId=0
        /// </summary>
        super(data);

        this._ensureDetails();
    }

    public getTitle(): string {
        /// <returns type="string" />

        this._ensureDetails();

        // Latest version of {0}
        if (this.changesetId == "T") {
            return Utils_String.format(VCResources.LatestVersionedItemLinkText, this.path);
        }

        // Version {0} of {1}
        return Utils_String.format(VCResources.VersionedItemLinkText, this.changesetId, this.path);
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" />

        this._ensureDetails();

        let actionUrl = Locations.urlHelper.getMvcUrl({
            webContext: webContext,
            controller: "versionControl",
            project: this.project,
            level: Contracts_Platform.NavigationContextLevels.Project
        });

        actionUrl += Navigation_Services.getHistoryService().getFragmentActionLink("contents", {
            path: this.path,
            version: this.changesetId
        });

        return actionUrl;
    }

    private _ensureDetails() {
        let parts: string[];

        if (!this.path) {
            // For the versioned item, id is in a form of
            // {path}&changesetVersion={changeset-number}&deletionId=0

            // Getting parameters of id
            parts = decodeURIComponent(this._data.id).split('&');

            this.path = Artifacts_Services.LinkingUtilities.legacyDecodeURIComponent(parts[0]);

            // If path doesn't start with $/, we should add it
            if (this.path && this.path.substring(0, 2) !== "$/") {
                this.path = "$/" + this.path;
            }

            this.project = this.path.split('/')[1];

            // Getting the changeset number
            this.changesetId = parts[1].split('=')[1];
        }
    }
}

export class CodeReviewArtifact extends Artifacts_Services.Artifact {
    public projectGuid: string;
    public pullRequestId: number;
    public codeReviewId: number;

    constructor(data: any) {
        if (data.projectGuid && data.pullRequestId) {
            if (data.supportsIterations) {
                $.extend(data, {
                    tool: Artifacts_Constants.ToolNames.CodeReview,
                    type: Artifacts_Constants.ArtifactTypeNames.CodeReviewSdkId,
                    id: Utils_String.format('{0}/{1}', data.projectGuid, data.codeReviewId)
                });
            }
            else {
                $.extend(data, {
                    tool: Artifacts_Constants.ToolNames.CodeReview,
                    type: Artifacts_Constants.ArtifactTypeNames.CodeReviewId,
                    id: Utils_String.format('{0}/{1}', data.projectGuid, data.pullRequestId)
                });
            }
        }

        super(data);
        if (data.projectGuid && data.pullRequestId) {
            this.projectGuid = data.projectGuid;
            this.pullRequestId = data.pullRequestId;
            this.codeReviewId = data.codeReviewId;
        }
    }

    public getTitle(): string {
        this._ensureDetails();

        // Code review
        return Utils_String.format('Code review {0}', this.pullRequestId);
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        this._ensureDetails();

        // TODO: return url for code review
        return null;
    }

    private _ensureDetails() {
        let parts: string[];
        if (!this.projectGuid || !this.pullRequestId) {
            parts = decodeURIComponent(this._data.id).split('/');

            this.projectGuid = parts[0];
            this.pullRequestId = parseInt(parts[1], 10);
        }
    }
}

export class LatestItemVersionArtifact extends Artifacts_Services.Artifact {

    public path: string;

    constructor (data: any, path: string) {
        /// <summary>Decodes details of a version control item from its latest version
        /// which has an artifact URI like:
        /// vstfs:///VersionControl/LatestItemVersion/{item-id}
        /// </summary>
        super(data);
        this.path = path;
    }

    public getTitle(): string {
        /// <returns type="string" />

        // Latest version of {0}
        return Utils_String.format(VCResources.LatestVersionedItemLinkText, this.path || this.getId());
    }

    public getUrl(webContext: Contracts_Platform.WebContext): string {
        /// <returns type="string" />
        let actionUrl =  Locations.urlHelper.getMvcUrl({
            webContext: webContext,
            controller: "versionControl"
        });

        actionUrl += Navigation_Services.getHistoryService().getFragmentActionLink("contents", {
            path: this.path,
            version: "T"
        });

        return actionUrl;
    }
}

export class VersionControlArtifactHandler {

    public static beginResolve(artifactIds: any[], options?: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let tfsContext = (options && options.tfsContext) || TFS_Host_TfsContext.TfsContext.getDefault(),
            artifacts: any[] = [],
            serverArtifacts: any[] = [],
            serverArtifactMap = {},
            apiLocation: string;

        function finalize() {
            callback({ success: true, artifacts: artifacts });
        }

        $.each(artifactIds, (i: number, artifactId: any) => {
            if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.Changeset) === 0) {
                artifacts[artifacts.length] = new ChangesetArtifact(artifactId);
            }
            else if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.VersionedItem) === 0) {
                artifacts[artifacts.length] = new VersionedItemArtifact(artifactId);
            }
            else if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.LatestItemVersion) === 0) {
                serverArtifactMap[artifactId.id] = artifactId;
                serverArtifacts[serverArtifacts.length] = artifactId.id;
            }
            else {
                artifacts[artifacts.length] = new Artifacts_Services.Artifact(artifactId);
            }
        });

        if (serverArtifacts.length) {
            apiLocation = tfsContext.getActionUrl("itemsById", "versioncontrol", { area: "api" });
            Ajax.getMSJSON(apiLocation, { ids: serverArtifacts.join(",") }, (items) => {
                $.each(items, (i: number, item: any) => {
                    artifacts[artifacts.length] = new LatestItemVersionArtifact(serverArtifactMap[item.id], item.serverItem);
                });
                finalize();
            }, errorCallback);
        }
        else {
            finalize();
        }
    }
}

export class GitArtifactHandler {

    public static beginResolve(artifactIds: any[], options?: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let artifacts: any[] = [];

        $.each(artifactIds, (i: number, artifactId: any) => {
            if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.Commit) === 0) {
                artifacts.push(new CommitArtifact(artifactId));
            }
            else if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.Ref) === 0) {
                artifacts.push(new GitRefArtifact(artifactId));
            }
            else if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.PullRequestId) === 0) {
                artifacts.push(new PullRequestArtifact(artifactId));
            }
            else {
                artifacts.push(new Artifacts_Services.Artifact(artifactId));
            }
        });

        callback({ success: true, artifacts: artifacts });
    }
}

/**
 * Provides a VC-specific wrapper around Telemetry events and methods for publishing CI data with consistent context
 * including the current View, Tab, and RepositoryId for each event.
 */
VSS.tfsModuleLoaded("TFS.VersionControl", exports);

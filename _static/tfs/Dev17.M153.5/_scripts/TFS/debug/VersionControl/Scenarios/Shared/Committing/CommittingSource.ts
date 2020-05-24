import * as Q from "q";
import { FileInputControlResult } from "VSS/Controls/FileInput";
import { FileEncoding } from "VSS/Utils/File";
import * as StringUtils from "VSS/Utils/String";

import { VersionControlChangeType, ItemContentType, Change } from "TFS/VersionControl/Contracts";
import { GitCommitRef, GitChange, GitPush, GitRefUpdate } from "TFS/VersionControl/Contracts";
import { TfvcChange, TfvcChangeset } from "TFS/VersionControl/Contracts";
import { ChangesetArtifact } from "VersionControl/Scripts/ChangesetArtifact";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import { EditingEnablement, TfvcEncodingConstants } from "VersionControl/Scripts/Controls/SourceEditing";
import { ItemModel, TfsItem } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitRefArtifact } from "VersionControl/Scripts/GitRefArtifact";
import { specToRefName } from "VersionControl/Scripts/GitRefUtility";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec, GitCommitVersionSpec, GitBranchVersionSpec, ChangesetVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { TfvcClientService } from "VersionControl/Scripts/TfvcClientService";
import { addWorkItemsBatchAsync } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";

/**
 * A source to push modifications to the current repository.
 */
export class CommittingSource {
    public allowEditingVersion(version: string, repositoryContext: RepositoryContext): boolean {
        return EditingEnablement.isEditableVersionType(repositoryContext, version);
    }

    public commitUploadFiles(
        path: string,
        currentVersionSpec: VersionSpec,
        realVersionSpec: VersionSpec,
        comment: string,
        filesToUpload: FileInputControlResult[],
        existingFileList: ItemModel[],
        repositoryContext: RepositoryContext,
        newBranchVersionSpec?: VersionSpec,
    ): IPromise<VersionSpec> {
        const writeManager = this.getWriteManager(currentVersionSpec, realVersionSpec, repositoryContext);
        const change = writeManager.createUploadFilesChange(path, filesToUpload, existingFileList);
        const commit = writeManager.createCommit(change, comment);
        return writeManager.push(commit, newBranchVersionSpec);
    }

    public commitEditingFile(
        item: ItemModel,
        currentVersionSpec: VersionSpec,
        realVersionSpec: VersionSpec,
        isNewFile: boolean,
        content: string,
        comment: string,
        currentEncoding: number,
        repositoryContext: RepositoryContext,
        newBranchVersionSpec?: VersionSpec,
    ): IPromise<VersionSpec> {
        const writeManager = this.getWriteManager(currentVersionSpec, realVersionSpec, repositoryContext);
        const newEncoding = currentEncoding || TfvcEncodingConstants.UTF8;
        const change = writeManager.createAddOrEditChange(item, isNewFile, content, newEncoding);
        const commit = writeManager.createCommit([change], comment);
        return writeManager.push(commit, newBranchVersionSpec);
    }

    public commitEmptyFolder(
        parentItem: ItemModel,
        newFolderPath: string,
        currentVersionSpec: VersionSpec,
        realVersionSpec: VersionSpec,
        comment: string,
        repositoryContext: RepositoryContext,
        newBranchVersionSpec?: VersionSpec,
    ): IPromise<VersionSpec> {
        const writeManager = this.getWriteManager(currentVersionSpec, realVersionSpec, repositoryContext);
        const change = writeManager.createEmptyFolderChange(parentItem, newFolderPath);
        const commit = writeManager.createCommit([change], comment);
        return writeManager.push(commit, newBranchVersionSpec);
    }

    public commitRenameItem(
        item: ItemModel,
        newPath: string,
        currentVersionSpec: VersionSpec,
        realVersionSpec: VersionSpec,
        comment: string,
        repositoryContext: RepositoryContext,
        newBranchVersionSpec?: VersionSpec,
    ): IPromise<VersionSpec> {
        const writeManager = this.getWriteManager(currentVersionSpec, realVersionSpec, repositoryContext);
        const change = writeManager.createRenameChange(item, newPath);
        const commit = writeManager.createCommit([change], comment);
        return writeManager.push(commit, newBranchVersionSpec);
    }

    public commitDeleteItem(
        item: ItemModel,
        currentVersionSpec: VersionSpec,
        realVersionSpec: VersionSpec,
        comment: string,
        repositoryContext: RepositoryContext,
        newBranchVersionSpec?: VersionSpec,
    ): IPromise<VersionSpec> {
        const writeManager = this.getWriteManager(currentVersionSpec, realVersionSpec, repositoryContext);
        const change = writeManager.createDeleteChange(item);
        const commit = writeManager.createCommit([change], comment);
        return writeManager.push(commit, newBranchVersionSpec);
    }

    public linkWorkItems(
        linkedWorkItemIds: number[],
        newRealVersionSpec: VersionSpec,
        newBranchVersionSpec: GitBranchVersionSpec,
        repositoryContext: RepositoryContext,
    ): IPromise<void> {
        if (!linkedWorkItemIds.length) {
            return Q(undefined);
        }
        const projectGuid = this.isGit(repositoryContext) && repositoryContext.getRepository().project.id;
        const repositoryId = repositoryContext.getRepositoryId();

        const linkName = this.isGit(repositoryContext) ? RegisteredLinkTypeNames.Commit : RegisteredLinkTypeNames.Changeset;
        const changeArtifact = this.isGit(repositoryContext)
            ? new CommitArtifact({
                projectGuid,
                repositoryId,
                commitId: (newRealVersionSpec as GitCommitVersionSpec).commitId,
            })
            : new ChangesetArtifact(newRealVersionSpec);

        let promise = addWorkItemsBatchAsync(changeArtifact.getUri(), linkName, linkedWorkItemIds);

        if (newBranchVersionSpec) {
            const newBranchArtifact =
                new GitRefArtifact({
                    projectGuid,
                    repositoryId,
                    refName: newBranchVersionSpec.toVersionString(),
                });

            // addWorkItemsBatchAsync doesn't support linking commit and branch at once, so we need 2 REST calls.
            // It would yield error "The same work item is being updated multiple times..."
            promise = promise.then(() => addWorkItemsBatchAsync(newBranchArtifact.getUri(), "Branch", linkedWorkItemIds));
        }

        return promise;
    }

    private getWriteManager(currentVersionSpec: VersionSpec, realVersionSpec: VersionSpec, repositoryContext: RepositoryContext): CommonWriteManager {
        return this.isGit(repositoryContext)
            ? new GitWriteManager(repositoryContext, currentVersionSpec, realVersionSpec as GitCommitVersionSpec)
            : new TfvcWriteManager(repositoryContext);
    }

    private isGit(repositoryContext: RepositoryContext): boolean {
        return repositoryContext.getRepositoryType() === RepositoryType.Git;
    }
}

function fetchItemFromArray(fileList: ItemModel[], folderPath: string, fileToCheck: string): ItemModel {
    const items = fileList.filter(
        (item) => {
            return StringUtils.localeIgnoreCaseComparer(item.serverItem, VersionControlPath.combinePaths(folderPath, fileToCheck)) === 0;
        });

    return items.length > 0 ? items[0] : null;
}

export interface WriteManager<TChange, TChangeset> {
    createAddOrEditChange(item: ItemModel, isNewFile: boolean, content: string, encoding: number): TChange;
    createEmptyFolderChange(parentItem: ItemModel, newFolderPath: string): TChange;
    createRenameChange(item: ItemModel, newPath: string): TChange;
    createDeleteChange(item: ItemModel): TChange;
    createUploadFilesChange(folderPath: string, filesToUpload: FileInputControlResult[], existingFileList: ItemModel[]): TChange[];
    createCommit(changes: TChange[], comment: string): TChangeset;
    push(commit: TChangeset, newBranchVersionSpec?: VersionSpec): IPromise<VersionSpec>;
}

interface CommonWriteManager extends WriteManager<Change<{}>, CommonChangeset> { }

interface CommonChangeset {
    changes: Change<{}>[];
    comment: string;
}

export class GitWriteManager implements WriteManager<GitChange, GitCommitRef> {
    private readonly gitClient: GitClientService;

    constructor(
        private readonly repositoryContext: RepositoryContext,
        private readonly currentVersionSpec: VersionSpec,
        private readonly realVersionSpec: GitCommitVersionSpec,
    ) {
        this.gitClient = this.repositoryContext.getClient() as GitClientService;
    }

    public createAddOrEditChange(item: ItemModel, isNewFile: boolean, content: string, encoding: number): GitChange {
        return {
            changeType: isNewFile ? VersionControlChangeType.Add : VersionControlChangeType.Edit,
            item: {
                path: item.serverItem,
            },
            newContent: {
                content,
                contentType: ItemContentType.RawText,
            },
        } as GitChange;
    }

    public createEmptyFolderChange(parentItem: ItemModel, newFolderPath: string): GitChange {
        throw new Error("Empty folders are not supported in Git.");
    }

    public createRenameChange(item: ItemModel, newPath: string): GitChange {
        return {
            changeType: VersionControlChangeType.Rename,
            sourceServerItem: item.serverItem,
            item: {
                path: newPath,
            },
        } as GitChange;
    }

    public createDeleteChange(item: ItemModel): GitChange {
        return {
            changeType: VersionControlChangeType.Delete,
            item: {
                path: item.serverItem,
            },
        } as GitChange;
    }

    public createUploadFilesChange(folderPath: string, filesToUpload: FileInputControlResult[], existingFileList: ItemModel[]): GitChange[] {
        const changes: GitChange[] = [];
        for (let i = 0, l = filesToUpload.length; i < l; i++) {
            changes.push({
                changeType: fetchItemFromArray(existingFileList, folderPath, filesToUpload[i].name.toLowerCase()) ? VersionControlChangeType.Edit : VersionControlChangeType.Add,
                item: {
                    path: VersionControlPath.combinePaths(folderPath, filesToUpload[i].name)
                },
                newContent: {
                    content: filesToUpload[i].content,
                    contentType: ItemContentType.Base64Encoded
                }
            } as GitChange);
        }

        return changes;
    }

    public createCommit(changes: GitChange[], comment: string): GitCommitRef {
        return { changes, comment } as GitCommitRef;
    }

    public push(commit: GitCommitRef, newBranchVersionSpec?: VersionSpec): IPromise<VersionSpec> {
        const pushToCreate = {
            refUpdates: [{
                name: specToRefName(newBranchVersionSpec || this.currentVersionSpec),
                oldObjectId: this.realVersionSpec.commitId,
            } as GitRefUpdate],
            commits: [commit],
        } as GitPush;

        return Q.Promise<VersionSpec>((resolve, reject) =>
            this.gitClient.beginPushChanges(
                this.repositoryContext.getRepository(),
                pushToCreate,
                newPush => resolve(new GitCommitVersionSpec(newPush.refUpdates[0].newObjectId)),
                reject));
    }
}

export class TfvcWriteManager implements WriteManager<TfvcChange, TfvcChangeset> {
    private readonly tfvcClient: TfvcClientService;

    constructor(
        private readonly repositoryContext: RepositoryContext,
    ) {
        this.tfvcClient = repositoryContext.getClient() as TfvcClientService;
    }

    public createAddOrEditChange(item: TfsItem, isNewFile: boolean, content: string, encoding: number): TfvcChange {
        return {
            changeType: isNewFile ? VersionControlChangeType.Add : VersionControlChangeType.Edit,
            item: {
                path: item.serverItem,
                contentMetadata: {
                    encoding,
                },
                version: item.changeset,
            },
            newContent: {
                content,
                contentType: ItemContentType.RawText,
            },
        } as TfvcChange;
    }

    public createRenameChange(item: TfsItem, newPath: string): TfvcChange {
        return {
            changeType: VersionControlChangeType.Rename,
            sourceServerItem: item.serverItem,
            item: {
                path: newPath,
                version: item.changeset,
            },
        } as TfvcChange;
    }

    public createEmptyFolderChange(parentItem: ItemModel, newFolderPath: string): TfvcChange {
        const changeset = getChangesetVersion(parentItem as TfsItem);

        return {
            changeType: VersionControlChangeType.Add,
            item: {
                path: newFolderPath,
                isFolder: true,
                version: changeset,
            },
        } as TfvcChange;
    }

    public createDeleteChange(item: TfsItem): TfvcChange {
        return {
            changeType: VersionControlChangeType.Delete,
            item: {
                path: item.serverItem,
                version: item.changeset,
            },
        } as TfvcChange;
    }

    public createCommit(changes: TfvcChange[], comment: string): TfvcChangeset {
        return { changes, comment } as TfvcChangeset;
    }

    public createUploadFilesChange(folderPath: string, filesToUpload: FileInputControlResult[], existingFileList: ItemModel[]): TfvcChange[] {
        const tfvcChanges: TfvcChange[] = [];

        for (let i = 0, l = filesToUpload.length; i < l; i++) {

            const existingItem = fetchItemFromArray(existingFileList, folderPath, filesToUpload[i].name.toLowerCase());
            tfvcChanges.push({
                changeType: existingItem ? VersionControlChangeType.Edit : VersionControlChangeType.Add,
                item: {
                    path: VersionControlPath.combinePaths(folderPath, filesToUpload[i].name),
                    contentMetadata: {
                        encoding: this._getEncodingCodePage(filesToUpload[i].encoding)
                    },
                    version: getChangesetVersion(existingItem as TfsItem),
                },
                newContent: {
                    content: filesToUpload[i].content,
                    contentType: ItemContentType.Base64Encoded
                }
            } as TfvcChange);
        }

        return tfvcChanges;
    }

    public push(changeset: TfvcChangeset): IPromise<VersionSpec> {
        return Q.Promise<VersionSpec>((resolve, reject) =>
            this.tfvcClient.beginCreateChangeset(
                changeset,
                savedChangeset => resolve(new ChangesetVersionSpec(savedChangeset.changesetId)),
                reject));
    }

    private _getEncodingCodePage(encoding: FileEncoding): number {
        switch (encoding) {
            case FileEncoding.Binary:
                return TfvcEncodingConstants.Binary;

            case FileEncoding.UTF16_BE:
                return TfvcEncodingConstants.UTF16_BE;

            case FileEncoding.UTF16_LE:
                return TfvcEncodingConstants.UTF16_LE;

            case FileEncoding.UTF32_BE:
                return TfvcEncodingConstants.UTF32_BE;

            case FileEncoding.UTF32_LE:
                return TfvcEncodingConstants.UTF32_LE;

            default:
                return TfvcEncodingConstants.UTF8;
        }
    }
}

function getChangesetVersion(item: TfsItem): number {
    return item ? item.changeset : 0;
}

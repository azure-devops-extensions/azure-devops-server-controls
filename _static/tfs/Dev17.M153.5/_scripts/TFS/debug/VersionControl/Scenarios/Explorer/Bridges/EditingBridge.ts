import * as Q from "q";
import { FileInputControlResult } from "VSS/Controls/FileInput";
import { Debug } from "VSS/Diag";
import { first } from "VSS/Utils/Array";
import { ensureTrailingSeparator } from "VSS/Utils/File";
import { format, ignoreCaseComparer, startsWith } from "VSS/Utils/String";

import { ContentRenderingDefaultBehavior } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { GitPullRequest, VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { ActionsHub, ChangeItemOptions, FilePreviewAvailabilityChangedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { GetItemAndFetchExtraData } from "VersionControl/Scenarios/Explorer/Bridges/ItemExtraDataBridge";
import { GetItemResult } from "VersionControl/Scenarios/Explorer/Bridges/ItemRetrievalBridge";
import { getKnownItem, checkPathContainsFileUsedAsFolder, getDeepestExistingFolder, isKnownNonexistent } from "VersionControl/Scenarios/Explorer/Bridges/KnownItemsUtils";
import { PageSource } from "VersionControl/Scenarios/Explorer/Sources/PageSource";
import { RepositorySource } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { getLatestGitVersionSpec } from "VersionControl/Scenarios/Explorer/Stores/VersionStore";
import { CommittingSource } from "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import { ItemModel, GitItem, FileContentMetadata } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { combinePaths, getFolderName, getFileExtension, getParentPaths, calculateNewSubfolderPath } from "VersionControl/Scripts/VersionControlPath";

export interface NewCommitDescriptor {
    comment: string;
    /**
     *  True if the comment was not changed by the user.
     */
    isCommentDefault: boolean;
    newBranchName: string;
    hasToCreatePullRequest: boolean;
    /**
     *  The new name of the item. Used only for renames.
     */
    newItemName?: string;
    /**
     *  The list of files to be uploaded. Used only for uploads.
     */
    filesToBeUploaded?: FileInputControlResult[];
    linkedWorkItemIds: number[];
}

interface CommitPartialPayload {
    existingPullRequest: GitPullRequest;
    hasLinkedWorkitems: boolean;
    newRealVersionSpec: VersionSpec;
    comment: string;
    isCommentDefault: boolean;
    userName: string;
    newBranchVersionSpec: GitBranchVersionSpec;
    newBranchVersionAllowEditing: boolean;
    postCommitError: Error;
}

/**
 * Implementation of action creators that handle editing operations on items.
 */
export class EditingBridge {
    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly repositorySource: RepositorySource,
        private readonly committingSource: CommittingSource,
        private readonly pageSource: PageSource,
        private readonly getItemAndFetchExtraData: GetItemAndFetchExtraData,
        private readonly getItem: (path: string, versionSpec: VersionSpec) => GetItemResult,
        private readonly getAggregateState: () => AggregateState) {
    }

    public promptAddNewFile(folderPath: string, uiSource: string, isCreatingFolder: boolean = false): void {
        this.discardIfEditingFile(uiSource);

        this.actionsHub.newFileAsked.invoke({
            ...this.getChildrenOfFolder(folderPath),
            folderPath,
            uiSource,
            isCreatingFolder,
        });
    }

    /**
     * Creates a new file locally. It has to be committed afterwards.
     */
    public addNewFile = (newFilePath: string, version: string, scenario?: string, retrievedItems: ItemModel[] = []): void => {
        queueModulePreload("VersionControl/Scenarios/Shared/Committing/CommitDialog");

        newFilePath = this.normalizeCasingToExistingParent(newFilePath, retrievedItems);

        const newFileItem = createNewFileItem(newFilePath, version);

        this.actionsHub.newFileAdded.invoke({
            newFileItem,
            allRetrievedItems: retrievedItems,
            newFolders: this.createNewFolderItems(newFilePath, retrievedItems),
            ...this.getFilePreviewAvailability(newFilePath, newFileItem),
        });

        this.fetchInitialContent(newFileItem, scenario);
    }

    private normalizeCasingToExistingParent(newPath: string, retrievedItems: ItemModel[]): string {
        const lastParentItem = this.getDeepestExistingParentItem(newPath, retrievedItems);
        return lastParentItem.serverItem + newPath.substring(lastParentItem.serverItem.length);
    }

    private createNewFolderItems(newFilePath: string, retrievedItems: ItemModel[]): ItemModel[] {
        const newFolderItems = [];
        for (const path of getParentPaths(newFilePath)) {
            if (this.getKnownOrRetrievedItem(path, retrievedItems)) {
                break;
            }

            newFolderItems.push(createNewFolderItem(path));
        }

        return newFolderItems;
    }

    private getDeepestExistingParentItem(newFilePath: string, retrievedItems: ItemModel[]): ItemModel {
        for (const path of getParentPaths(newFilePath)) {
            const item = this.getKnownOrRetrievedItem(path, retrievedItems);
            if (item) {
                return item;
            }
        }
    }

    private getKnownOrRetrievedItem(path: string, retrievedItems: ItemModel[]): ItemModel {
        return this.getKnownItem(path) || findItem(retrievedItems, path);
    }

    private fetchInitialContent(newFileItem: ItemModel, scenario: string): void {
        this.repositorySource.getInitialContent(newFileItem, scenario)
            .then(initialContent => this.actionsHub.initialContentRetrieved.invoke(initialContent));
    }

    public promptAddNewFolder(parentPath: string, uiSource: string): void {
        const isCreatingFolder = true;
        if (this.getAggregateState().isGit) {
            this.promptAddNewFile(parentPath, uiSource, isCreatingFolder);
        } else {
            this.discardIfEditingFile(uiSource);

            this.actionsHub.commitPrompted.invoke({
                ...this.getChildrenOfFolder(parentPath),
                path: parentPath,
                changeType: VersionControlChangeType.Add,
                isCreatingFolder,
                uiSource,
            } as any);
        }
    }

    public changeAddNewTargetFolder(newSubfolder: string): void {
        const { addNewFilePromptState: { folderPath }, knownItemsState } = this.getAggregateState();
        const combinedPath = combinePaths(folderPath, newSubfolder);
        this.actionsHub.newFileTargetFolderChanged.invoke({
            ...this.getChildrenOfFolder(combinedPath),
            newSubfolder,
            fileUsedAsFolder: checkPathContainsFileUsedAsFolder(combinedPath, knownItemsState),
        });
    }

    public editFile(path: string, uiSource: string): void {
        this.discardIfEditingFile(uiSource);

        queueModulePreload("VersionControl/Scenarios/Shared/Committing/CommitDialog");

        const editItem = this.getKnownItem(path);

        const isItemReady = editItem && (editItem.contentMetadata || editItem.isFolder);
        const itemPromise =
            isItemReady
                ? Q.resolve([editItem])
                : this.repositorySource.getItems([{ path, version: this.getAggregateState().version }], true);

        itemPromise.then(items => {
            const item = items[0];
            const isEditable = !item.isFolder && !item.contentMetadata.isBinary;
            if (isEditable) {
                const hasChangedPath = path !== this.getAggregateState().path;

                this.actionsHub.editFileStarted.invoke({
                    fileItem: item,
                    uiSource,
                    ...this.getFilePreviewAvailability(path, item),
                });
            } else {
                const message = format(VCResources.EditFileNotEditable, path);
                this.actionsHub.itemRetrievalFailed.invoke({
                    resumableError: new Error(message),
                    allRetrievedItems: items,
                });
            }
        });
    }

    public getFilePreviewAvailability(path: string, item: ItemModel): FilePreviewAvailabilityChangedPayload {
        if (item && item.isFolder) {
            return;
        }

        const fileExtension = getFileExtension(path);
        const contentRenderer = this.repositorySource.getRendererForExtensionSync(fileExtension);
        return {
            isPreviewAvailable: Boolean(contentRenderer),
            isPreviewDefault: contentRenderer && contentRenderer.defaultBehavior === ContentRenderingDefaultBehavior.ShowRenderedContent,
        };
    }

    public promptSaveEditingFile(uiSource: string): void {
        const {
            pathState: { isDirty, path },
            fileContentState: { isNewFile },
            knownItemsState: { creatingItemPaths },
        } = this.getAggregateState();

        Debug.assert(isDirty || isNewFile, "If content has not changed, this method must not be available.");

        this.actionsHub.commitPrompted.invoke({
            path,
            newSubfolder: creatingItemPaths ? calculateNewSubfolderPath(path, creatingItemPaths) : "",
            changeType: isNewFile
                ? VersionControlChangeType.Add
                : VersionControlChangeType.Edit,
            uiSource,
        });

        this.fetchExistingBranches();
    }

    public saveEditingFile(descriptor: NewCommitDescriptor): void {
        const {
            path,
            versionSpec,
            itemContentState: { item },
            fileContentState: { isNewFile, editingContent },
            repositoryContext,
        } = this.getAggregateState();

        this.commit(
            path,
            descriptor,
            realVersionSpec =>
                this.committingSource.commitEditingFile(
                    item,
                    versionSpec,
                    realVersionSpec,
                    isNewFile,
                    editingContent,
                    descriptor.comment,
                    item.contentMetadata && item.contentMetadata.encoding,
                    repositoryContext,
                    getNewBranchVersionSpec(descriptor.newBranchName)),
            partialPayload =>
                this.actionsHub.commitSaved.invoke({
                    path,
                    changeType: isNewFile ? VersionControlChangeType.Add : VersionControlChangeType.Edit,
                    isFolder: false,
                    navigatePath: undefined,
                    ...partialPayload,
                }));
    }

    public addNewFolder(parentPath: string, descriptor: NewCommitDescriptor): void {
        const parentItem = this.getKnownItem(parentPath);
        const newFolderPath = combinePaths(parentPath, descriptor.newItemName);

        const {
            versionSpec,
            repositoryContext,
        } = this.getAggregateState();

        this.commit(
            newFolderPath,
            descriptor,
            realVersionSpec =>
                this.committingSource.commitEmptyFolder(
                    parentItem,
                    newFolderPath,
                    versionSpec,
                    realVersionSpec,
                    descriptor.comment,
                    repositoryContext,
                    getNewBranchVersionSpec(descriptor.newBranchName)),
            partialPayload =>
                this.actionsHub.commitSaved.invoke({
                    path: newFolderPath,
                    changeType: VersionControlChangeType.Add,
                    isFolder: true,
                    navigatePath: newFolderPath,
                    ...partialPayload,
                }));
    }

    public promptUploadFiles(folderPath: string, initialDrop: DataTransfer, uiSource: string): void {
        this.actionsHub.commitPrompted.invoke({
            path: folderPath,
            changeType: VersionControlChangeType.Add,
            isUploading: true,
            initialDrop,
            existingFileList: this.getChildrenOfFolder(folderPath).childItems,
            uiSource,
        });

        this.fetchExistingBranches();
    }

    public uploadFiles(
        folderPath: string,
        descriptor: NewCommitDescriptor,
        existingFileList: ItemModel[],
    ) {
        const {
            versionSpec,
            repositoryContext,
        } = this.getAggregateState();

        this.commit(
            folderPath,
            descriptor,
            realVersionSpec =>
                this.committingSource.commitUploadFiles(
                    folderPath,
                    versionSpec,
                    realVersionSpec,
                    descriptor.comment,
                    descriptor.filesToBeUploaded,
                    existingFileList,
                    repositoryContext,
                    getNewBranchVersionSpec(descriptor.newBranchName)),
            partialPayload =>
                this.actionsHub.filesUploaded.invoke({
                    newPaths: descriptor.filesToBeUploaded.map(file => combinePaths(folderPath, file.name)),
                    ...partialPayload,
                }));
    }

    public discardEditingFile(uiSource: string, navigatePath?: string, navigateVersion?: string, options?: ChangeItemOptions): void {
        const { tab, path, versionSpec, knownItemsState, repositoryContext } = this.getAggregateState();

        navigatePath = getDeepestExistingFolder(navigatePath || path, knownItemsState);

        const navigateVersionSpec = navigateVersion && VersionSpec.parse(navigateVersion);
        const fetchVersionSpec = navigateVersionSpec || versionSpec;
        const findResult = this.getItemAndFetchExtraData(tab, navigatePath, fetchVersionSpec, { createIfNew: options && options.createIfNew });

        this.actionsHub.editingFileDiscarded.invoke({
            path,
            coercedTab: tab === VersionControlActionIds.HighlightChanges ? VersionControlActionIds.Contents : undefined,
            creatingItemPaths: knownItemsState.creatingItemPaths,
            navigatePath,
            navigateVersionSpec,
            navigateVersionAllowEditing: navigateVersion && this.committingSource.allowEditingVersion(navigateVersion, repositoryContext),
            navigateItemInfo: {
                item: findResult.item,
                readMeItem: findResult.readMeItem,
                areFolderLatestChangesRequested: findResult.areFolderLatestChangesRequested,
            },
            uiSource,
            ...this.getFilePreviewAvailability(navigatePath, findResult.item),
        });
    }

    public promptRenameItem(path: string, uiSource: string): void {
        this.discardIfEditingFile(uiSource);

        this.actionsHub.commitPrompted.invoke({
            ...this.getChildrenOfFolder(getFolderName(path)),
            path,
            changeType: VersionControlChangeType.Rename,
            uiSource,
        } as any);

        this.fetchExistingBranches();
    }

    public renameItem(path: string, descriptor: NewCommitDescriptor): void {
        const { path: currentPath, versionState: { versionSpec }, repositoryContext } = this.getAggregateState();
        const item = this.getKnownItem(path);

        const newPath = combinePaths(getFolderName(path), descriptor.newItemName);

        const wasCurrentPathDescendantOrThis = path === currentPath || isPathAncestor(path, currentPath);
        const navigatePath = wasCurrentPathDescendantOrThis ? newPath : undefined;

        this.commit(
            newPath,
            descriptor,
            realVersionSpec =>
                this.committingSource.commitRenameItem(
                    item,
                    newPath,
                    versionSpec,
                    realVersionSpec,
                    descriptor.comment,
                    repositoryContext,
                    getNewBranchVersionSpec(descriptor.newBranchName)),
            partialPayload =>
                this.actionsHub.commitSaved.invoke({
                    path,
                    changeType: VersionControlChangeType.Rename,
                    newPath,
                    isFolder: item.isFolder,
                    navigatePath,
                    ...partialPayload,
                }));
    }

    public promptDeleteItem(path: string, uiSource: string): void {
        this.discardIfEditingFile(uiSource);

        this.actionsHub.commitPrompted.invoke({ path, changeType: VersionControlChangeType.Delete, uiSource });

        this.fetchExistingBranches();
    }

    public deleteItem(path: string, descriptor: NewCommitDescriptor): void {
        const { path: currentPath, versionState: { versionSpec }, repositoryContext } = this.getAggregateState();
        const item = this.getKnownItem(path);

        const navigatePath = this.getPathToNavigateAfterDelete(path);

        const coercedTab = navigatePath ? VersionControlActionIds.Contents : undefined;

        const fetchPath = navigatePath || isPathAncestor(currentPath, path) && currentPath;

        this.commit(
            fetchPath,
            descriptor,
            realVersionSpec =>
                this.committingSource.commitDeleteItem(
                    item,
                    versionSpec,
                    realVersionSpec,
                    descriptor.comment,
                    repositoryContext,
                    getNewBranchVersionSpec(descriptor.newBranchName)),
            partialPayload =>
                this.actionsHub.commitSaved.invoke({
                    path,
                    changeType: VersionControlChangeType.Delete,
                    isFolder: item.isFolder,
                    navigatePath,
                    coercedTab,
                    ...partialPayload,
                }));
    }

    private discardIfEditingFile(uiSource: string): void {
        // TODO v-panu editingFileDiscarded action happens simultaneously to either commitPrompted or newFileAsked.
        // We should only invoke one action to keep Flux history clean and prevent inconsistent states.
        // editingFileDiscarded should not be an action on itself, instead should be a behavior than can happen
        // as a response to itemChanged, commitPrompted, or newFileAsked.
        // But commitPrompted can happen either to commit current edit, or as an unrelated action to rename/delete/create folder (TFVC).
        // So it requires a more elaborate solution, thus I'm staying with this bad smell here by now.
        if (this.getAggregateState().pathState.isDirty || this.getAggregateState().fileContentState.isNewFile) {
            this.discardEditingFile(uiSource);
        }
    }

    private getPathToNavigateAfterDelete(path: string): string {
        const { path: currentPath, isGit, knownItemsState: { knownItems } } = this.getAggregateState();
        const wasCurrentPathDescendantOrThis = path === currentPath || isPathAncestor(path, currentPath);
        const wasCurrentPathAncestor = isPathAncestor(currentPath, path);
        const survivorParent = findFirstSurvivorParent(path, knownItems, isGit);

        if (wasCurrentPathDescendantOrThis) {
            return survivorParent;
        } else if (wasCurrentPathAncestor && isPathAncestor(survivorParent, currentPath)) {
            return survivorParent;
        }
    }

    private fetchExistingBranches(): void {
        if (this.getAggregateState().commitPromptState.existingBranches) {
            return;
        }

        this.repositorySource.getExistingBranches().then(branches =>
            this.actionsHub.existingBranchesLoaded.invoke(branches));
    }

    private commit(
        fetchPath: string,
        descriptor: NewCommitDescriptor,
        doCommit: (realVersionSpec: VersionSpec) => IPromise<VersionSpec>,
        doInvokeAction: (partialPayload: CommitPartialPayload) => void,
    ): void {
        this.actionsHub.commitStarted.invoke(undefined);

        let payloadOnError: CommitPartialPayload;
        let promise: Q.Promise<any> = Q(this.getAggregateState().versionState.realVersionSpec)
            .then(doCommit)
            .then(null, error => this.handleConflict(error, doCommit))
            .then(newRealVersionSpec => {
                if (descriptor.newBranchName) {
                    this.repositorySource.invalidateBranchesCache();
                }

                payloadOnError = {
                    comment: descriptor.comment,
                    isCommentDefault: descriptor.isCommentDefault,
                    newRealVersionSpec,
                } as CommitPartialPayload;

                return newRealVersionSpec;
            })
            .then(newRealVersionSpec => this.linkWorkItemsAndFindPullRequest(newRealVersionSpec, descriptor));

        if (descriptor.hasToCreatePullRequest) {
            promise = promise
                .then(partialPayload => {
                    // Right now, we only support editing on branches. We can safely make this assumption
                    // since the user is not currently allowed to start an edit operation unless they are
                    // on a branch, not a commit or a tag.
                    const baseBranchName = getBranchName(this.getAggregateState().versionSpec);

                    // We need to invoke the action before navigating to avoid the dirty check.
                    doInvokeAction(partialPayload);

                    this.pageSource.navigateToCreatePullRequest(descriptor.newBranchName, baseBranchName);
                });
        } else {
            promise = promise
                .then(preserveResult<CommitPartialPayload>(() => fetchPath && this.fetchFreshItem(fetchPath, getNewBranchVersionSpec(descriptor.newBranchName))))
                .then(doInvokeAction);
        }

        promise.catch(error => {
            if (payloadOnError) {
                doInvokeAction({
                    ...payloadOnError,
                    postCommitError: error,
                });
            }
            else if (error.serverError && error.serverError.isGatedCheckin) {
                this.actionsHub.commitGatedCheckin.invoke(error.serverError);
            } else {
                this.actionsHub.commitFailed.invoke(error);
            }
        });
    }

    private handleConflict(
        error: Error,
        doCommit: (realVersionSpec: VersionSpec) => IPromise<VersionSpec>,
    ): IPromise<VersionSpec> {
        const { isGit, path, fileContentState: { isNewFile } } = this.getAggregateState();
        if (isGit && startsWith(error.message, "TF401028:")) {
            const gitRoot = "/";
            const pathToCheck = isNewFile ? gitRoot : path;

            return this.fetchItem(pathToCheck)
                .then(items => this.checkThisItemChangedByOthers(items)
                    ? Q.reject(error)
                    : items)
                .then(getLatestGitVersionSpec)
                .then<VersionSpec>(doCommit);
        } else {
            return Q.reject(error);
        }
    }

    private fetchItem(path: string): IPromise<ItemModel[]> {
        return this.repositorySource.getItems([{ path, version: this.getAggregateState().version }], false);
    }

    private checkThisItemChangedByOthers(items: ItemModel[]): boolean {
        if (this.getAggregateState().fileContentState.isNewFile) {
            return false;
        }

        const isDeleted = !items[0];
        if (isDeleted) {
            return true;
        }

        const retrievedItem = items[0] as GitItem;
        const item = this.getAggregateState().itemContentState.item as GitItem;
        return item.objectId.full !== retrievedItem.objectId.full;
    }

    private linkWorkItemsAndFindPullRequest(
        newRealVersionSpec: VersionSpec,
        { comment, isCommentDefault, linkedWorkItemIds, newBranchName }: NewCommitDescriptor,
    ): IPromise<CommitPartialPayload> {
        const { repositoryContext, versionSpec, isGit } = this.getAggregateState();
        const newBranchVersionSpec = getNewBranchVersionSpec(newBranchName);
        const newBranchVersionAllowEditing = newBranchVersionSpec &&
            this.committingSource.allowEditingVersion(newBranchVersionSpec.toVersionString(), this.getAggregateState().repositoryContext);
        const dedupedLinkedWorkItemIds = filterOutIdsPresentOnComment(linkedWorkItemIds, comment);

        return Q.all([
            isGit && !newBranchVersionSpec &&
                this.repositorySource.getPullRequest(versionSpec),
            dedupedLinkedWorkItemIds.length > 0 &&
                this.committingSource.linkWorkItems(dedupedLinkedWorkItemIds, newRealVersionSpec, newBranchVersionSpec, repositoryContext),
        ]).then<CommitPartialPayload>(([existingPullRequest]) => ({
            existingPullRequest,
            hasLinkedWorkitems: linkedWorkItemIds.length > 0,
            newRealVersionSpec,
            comment,
            isCommentDefault,
            userName: this.repositorySource.getCurrentUserName(),
            newBranchVersionSpec,
            newBranchVersionAllowEditing,
        }) as any);
    }

    private fetchFreshItem(path: string, newBranchVersionSpec: VersionSpec) {
        const { tab, versionSpec } = this.getAggregateState();
        this.getItemAndFetchExtraData(tab, path, newBranchVersionSpec || versionSpec, { forceFetch: true });
    }

    private getChildrenOfFolder(folderPath: string) {
        const { knownItemsState, versionSpec } = this.getAggregateState();
        const folderItem = this.getItem(folderPath, versionSpec).item;
        return {
            childItems: folderItem && folderItem.childItems || [],
            isLoadingChildItems: !folderItem && !isKnownNonexistent(folderPath, knownItemsState),
        };
    }

    private getKnownItem(path: string) {
        return getKnownItem(path, this.getAggregateState().knownItemsState);
    }
}

function getNewBranchVersionSpec(newBranchName: string): GitBranchVersionSpec {
    return newBranchName && new GitBranchVersionSpec(newBranchName);
}

function getBranchName(versionSpec: VersionSpec): string {
    return (versionSpec as GitBranchVersionSpec).branchName;
}

/**
 * Whether the ancestorPath is an ancestor of the given path.
 * If both paths are the same, it's false.
 * If ancestorPath is included on path, it's true, like "a/b" in "a/b/c/d".
 * It takes care of partial wrong matches, so "a/b" in "a/bbb/c" is false.
 */
function isPathAncestor(ancestorPath: string, path: string): boolean {
    if (ancestorPath.length >= path.length) {
        return false;
    }

    ancestorPath = ensureTrailingSeparator(ancestorPath);
    return ancestorPath === path.substring(0, ancestorPath.length);
}

/**
 * Returns the first path that won't be deleted by the current removal.
 * In Git, any folder containing only one child won't exist after this delete,
 * as it only existed because of the deleted item.
 * For TFVC, it just returns the parent path.
 * @param path Path to start searching from its parent.
 * @param knownItems The items to check number of children.
 */
function findFirstSurvivorParent(path: string, knownItems: IDictionaryStringTo<ItemModel>, isGit: boolean): string {
    let survivorParentPath = getFolderName(path);

    if (isGit) {
        while (survivorParentPath !== "/" && !hasMoreThanOneChild(knownItems[survivorParentPath])) {
            survivorParentPath = getFolderName(survivorParentPath);
        }
    }

    return survivorParentPath;
}

function hasMoreThanOneChild(item: ItemModel): boolean {
    return item && item.childItems && item.childItems.length > 1;
}

const workItemInCommentRegex = /#[\d]+/g;

function filterOutIdsPresentOnComment(ids: number[], comment: string): number[] {
    const parts = comment.match(workItemInCommentRegex);
    return parts
        ? ids.filter(id => parts.indexOf("#" + id) < 0)
        : ids;
}

/**
 * Gets a function that runs the given action and returns the received argument which was not used.
 * Helpful to chain calls in promises. Example:
 * @example
 *   .then(() => "Pablo")
 *   .then(preserveResult(() => console.log("We don't care about Pablo but let it go through.")))
 *   .then(name => `Hola ${name}`)
 */
function preserveResult<T>(doAction: () => void) {
    return (value: T): T => {
        doAction();
        return value;
    };
}

function createNewFileItem(path: string, version: string): ItemModel {
    const extension = getFileExtension(path);

    return {
        serverItem: path,
        version,
        isFolder: false,
        contentMetadata: {
            extension,
        } as FileContentMetadata,
    } as ItemModel;
}

function createNewFolderItem(path: string): ItemModel {
    return {
        serverItem: path,
        isFolder: true,
        childItems: [],
    } as ItemModel;
}

function findItem(items: ItemModel[], path: string): ItemModel | undefined {
    return first(items, item => item && ignoreCaseComparer(item.serverItem, path) === 0);
}

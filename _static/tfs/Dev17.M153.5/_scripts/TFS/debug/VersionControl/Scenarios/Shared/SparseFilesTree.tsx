import * as React from "react";
import * as ReactDOM from "react-dom";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { format, ignoreCaseComparer } from "VSS/Utils/String";
import { CompactMode, DEFAULT_SEPARATOR, IItem, Node as TreeNode } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { SparseFilesTreeCell } from "VersionControl/Scenarios/Shared/SparseFilesTreeCell";
import { StatefulTree } from "Presentation/Scripts/TFS/Components/Tree/StatefulTree";
import { RenderItemOptions } from "Presentation/Scripts/TFS/Components/Tree/Tree";
import { DiscussionThread, DiscussionComment, DiscussionPosition } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiagnosticComponent } from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import { Change, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IDiscussionContextItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionContextItemActionCreator";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { getIconNameForFile } from "VersionControl/Scripts/VersionControlFileIconPicker";
import * as PullRequestCommands from "VersionControl/Scenarios/PullRequestDetail/PullRequestCommands";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!VersionControl/FilesTree";
import "VSS/LoaderPlugins/Css!VersionControl/SparseFilesTree";

export interface SparseFilesTreeProps {
    repositoryContext: RepositoryContext;
    tfsContext: TfsContext;
    changes?: Change[];
    version?: string;
    isShelveset?: boolean;
    displayMode?: ChangeExplorerGridDisplayMode;
    threads?: DiscussionThread[];
    rootName: string;
    sourceBranchName?: string;
    useBranchForNavigation?: boolean;
    selectedFullPath?: string;
    pathComparer?: (a: string, b: string) => number;
    selectedDiscussion?: number;
    isVisible: boolean;
    isFullPageNavigate?: boolean;
    disableAddThread?: boolean;
    onItemSelected?: SparseFilesTreeItemSelectedCallback;
    discussionActionCreator?: IDiscussionContextItemActionCreator;
    searchText?: string;
    isLoading?: boolean;
}

export interface SparseFilesTreeState {
    knownChangeItems: ItemMap; // the change items we know about
    knownThreadItems: ItemMap; // the thread items we know about
    knownPaths: IDictionaryStringTo<boolean>; // folder/file names with parent paths removed
    addedPaths?: string[]; // the paths we need to add to the tree this render pass
    modifiedPaths?: string[]; // the paths we need to modify in the tree this render pass
    removedPaths?: string[]; // the paths we need to remove in the tree this render pass
    shouldReset?: boolean; // whether or not the underlying tree should be cleared for a reset
    hasNoItems?: boolean; // whether or not there are items to be shown in the tree currently (0-data case)
}

export interface SparseFilesTreeItemTextData {
    name: string; // text to be displayed on the tree
    title: string; // text to be associated with the title or tooltip of the tree item
}

export interface SparseFilesTreeItemData extends SparseFilesTreeItemTextData {
    path: string; // full path of the item
    iconClass?: string; // class to add to the item icon - defaults to a file icon
    iconUrl?: string; // url of the item icon - if provided, overrides the class as the source of the icon image
    isDirty?: boolean; // whether or not to show the item as dirty in the tree
    change?: Change; // change associated with the item
    thread?: DiscussionThread; // thread associated with the item
}

export type ItemMap = IDictionaryStringTo<SparseFilesTreeItemData>;
export type SparseFilesTreeItemSelectedCallback = (path: string, discussionId?: number, depth?: number) => void;
export const MAX_COMMENT_DISPLAY_LENGTH: number = 100;

/**
 * Rendering SparseFilesTree in given container element
 */
export function renderSparseFilesTree(element: HTMLElement, fileTreeProps: SparseFilesTreeProps): void {
    ReactDOM.render(
        <SparseFilesTree {...fileTreeProps} />,
        element);
}

/**
 * Implementation of a stateful file tree. Includes rendering for showing both
 * discussions and file change types.
 */
export class SparseFilesTree extends DiagnosticComponent<SparseFilesTreeProps, SparseFilesTreeState> {
    constructor(props: SparseFilesTreeProps) {
        super(props);
        this.state = {
            knownChangeItems: {},
            knownThreadItems: {},
            knownPaths: {},
        };
    }

    public render(): JSX.Element {
        return (
            <div className="vc-sparse-files-tree">
                <StatefulTree
                    addedPaths={this.state.addedPaths || []}
                    modifiedPaths={this.state.modifiedPaths || []}
                    removedPaths={this.state.removedPaths || []}
                    shouldReset={this.state.shouldReset}
                    selectedFullPath={getSelectedPath(this.props)}
                    pathComparer={this.props.pathComparer}
                    compareChildren={this._compareChildren}
                    canCompactNodeIntoChild={this._canCompactNodeIntoChild}
                    getItemHasCommands={this._getItemHasCommands}
                    getItemCommands={this._getItemCommands}
                    onItemSelected={this._onItemSelected}
                    onRenderItem={this._onRenderItem} />
                {
                    this.props.isLoading &&
                    <Spinner label={VCResources.LoadingText}/>
                }
            </div>
        );
    }

    public componentDidMount(): void {
        this._updateTreeState({} as SparseFilesTreeProps, this.props, this.state);
    }

    public componentWillReceiveProps(nextProps: SparseFilesTreeProps): void {
        this._updateTreeState(this.props, nextProps, this.state);
    }

    public shouldComponentUpdate(nextProps: SparseFilesTreeProps, nextState: SparseFilesTreeState): boolean {
        return nextProps.isVisible !== this.props.isVisible
            || nextProps.displayMode !== this.props.displayMode
            || nextProps.selectedFullPath !== this.props.selectedFullPath
            || nextProps.selectedDiscussion !== this.props.selectedDiscussion
            || (nextProps.discussionActionCreator && !this.props.discussionActionCreator)
            || (nextProps.isLoading !== this.props.isLoading)
            || (nextState.addedPaths !== this.state.addedPaths && nextState.addedPaths.length !== 0)
            || (nextState.modifiedPaths !== this.state.modifiedPaths && nextState.modifiedPaths.length !== 0)
            || (nextState.removedPaths !== this.state.removedPaths && nextState.removedPaths.length !== 0);
    }

    @autobind
    private _updateTreeState(thisProps: SparseFilesTreeProps, nextProps: SparseFilesTreeProps, currentState: SparseFilesTreeState) {
        const newState: SparseFilesTreeState = getFileTreeState(thisProps, nextProps, currentState);
        this.setState(newState);
    }

    @autobind
    private _onItemSelected(path: string, depth?: number): void {
        if (this.state.hasNoItems) {
            return;
        }

        const itemData: SparseFilesTreeItemData = this.state.knownChangeItems[path] || this.state.knownThreadItems[path];
        const thread: DiscussionThread = itemData && itemData.thread;
        const navigateToPath: string = (thread && thread.itemPath) || path;
        const navigateToThread: number = (thread && thread.id) || null;

        this.props.onItemSelected && this.props.onItemSelected(navigateToPath, navigateToThread, depth);
    }

    @autobind
    private _onRenderItem(item: IItem, options?: RenderItemOptions): JSX.Element {
        return fileTreeNode(this.props, this.state, item, this._getItemData(item), options);
    }

    @autobind
    private _compareChildren(parentPath: string, a: string, b: string): number {
        return compareChildren(this.state, parentPath, a, b);
    }

    @autobind
    private _canCompactNodeIntoChild(node: TreeNode, depth: number): boolean {
        return canCompactNodeIntoChild(this.state, this.props, node, depth);
    }

    @autobind
    private _getItemHasCommands(item: IItem): boolean {
        const itemData = this._getItemData(item);
        return !(itemData && itemData.thread);
    }

    @autobind
    private _getItemCommands(item: IItem): IContextualMenuItem[] {
        return getContextMenuItems(this.props, item.fullName, this._getItemData(item));
    }

    private _getItemData(item: IItem): SparseFilesTreeItemData {
        return this.state.knownChangeItems[item.fullName || DEFAULT_SEPARATOR] ||
            this.state.knownThreadItems[item.fullName];
    }
}

/**
 * An item in the tree with appropriate decorators and context menu items.
 */
function fileTreeNode(treeProps: SparseFilesTreeProps, treeState: SparseFilesTreeState, item: IItem, itemData: SparseFilesTreeItemData, options: RenderItemOptions): JSX.Element {
    const isTFVCRepo: boolean = treeProps.repositoryContext.getRepositoryType() === RepositoryType.Tfvc;
    const isRoot: boolean = isTFVCRepo
        ? (item.fullName === treeProps.rootName)
        : (itemData && itemData.path === DEFAULT_SEPARATOR) || (item.fullName === DEFAULT_SEPARATOR);
    const rootIconClass = treeProps.repositoryContext.getRepositoryClass();

    return (
        <SparseFilesTreeCell
            {...options}
            title={itemData && itemData.title}
            name={(isRoot && treeProps.rootName) || (itemData && ((itemData.isDirty ? "* " : "") + itemData.name)) || item.name}
            iconClass={(isRoot && rootIconClass) || (itemData && itemData.iconClass) || "bowtie-folder"}
            iconUrl={itemData && itemData.iconUrl}
            changeType={itemData && itemData.change && itemData.change.changeType}
            hasUnseenContent={itemData && itemData.thread && itemData.thread.hasUnseenContent}
            numReplies={itemData && itemData.thread && Math.max(0, itemData.thread.comments.filter(comment => comment.id > 0).length - 1)}
            highlightText={treeProps.searchText} />);
}

/**
 * Get the current file tree state given a change in changeList or threads.
 * Finds which items have been added/removed/changed so we can tell the tree.
 * TODO: This logic could be moved to a store instead. See if we can do that but maintain reusability with history.
 */
export const getFileTreeState = (thisProps: SparseFilesTreeProps, nextProps: SparseFilesTreeProps, currentState: SparseFilesTreeState): SparseFilesTreeState => {
    const treeNeedsRefresh: boolean = (thisProps.changes !== nextProps.changes || thisProps.version !== nextProps.version);
    const hasNoItems: boolean = !nextProps.changes || !nextProps.changes.length;

    const knownChangeItems: ItemMap = treeNeedsRefresh ? getChangeItemsData(nextProps, hasNoItems) : currentState.knownChangeItems;
    const knownThreadItems: ItemMap = getThreadItemsData(nextProps, knownChangeItems);
    const threadCountsPerFile: IDictionaryStringTo<number> = {};

    // find added/modified threads
    const addedPaths: string[] = [];
    const modifiedPaths: string[] = [];
    const removedPaths: string[] = [];
    Object.keys(knownThreadItems).forEach(path => {
        const parentPath: string = knownThreadItems[path].thread.itemPath;
        threadCountsPerFile[parentPath] = (threadCountsPerFile[parentPath] || 0) + 1;

        if (treeNeedsRefresh || !currentState.knownThreadItems[path]) {
            // remove the parent path if we're adding its first thread (if we're updating not initializing)
            (threadCountsPerFile[parentPath] === 1) && removedPaths.push(parentPath);
            addedPaths.push(knownThreadItems[path].path);
        }
        else {
            const thisItem: SparseFilesTreeItemData = currentState.knownThreadItems[path];
            const nextItem: SparseFilesTreeItemData = knownThreadItems[path];
            const itemWasModified: boolean = 
                thisItem.thread.comments.length !== nextItem.thread.comments.length
                || thisItem.thread.hasUnseenContent !== nextItem.thread.hasUnseenContent
                || thisItem.name !== nextItem.name
                || thisItem.isDirty !== nextItem.isDirty;
            itemWasModified && modifiedPaths.push(path);
        }
    });

    // find removed threads
    if (!treeNeedsRefresh) {
        Object.keys(currentState.knownThreadItems).forEach(path => {
            const parentPath: string = currentState.knownThreadItems[path].thread.itemPath;
            if (!knownThreadItems[path]) {
                // add back the parent path if we removed the last thread under it
                !threadCountsPerFile[parentPath] && addedPaths.push(parentPath);
                removedPaths.push(path);
            }
        });
    }

    // find added changes (only add an item for a change if it doesn't have an associated thread)
    let knownPaths: IDictionaryStringTo<boolean> = currentState.knownPaths;
    if (treeNeedsRefresh) {
        knownPaths = {};
        Object.keys(knownChangeItems).forEach(path => {
            knownPaths[path.split(DEFAULT_SEPARATOR).pop()] = true;
            if (!threadCountsPerFile[path]) {
                addedPaths.push(path);
            }
        });
    }

    return {
        knownChangeItems: knownChangeItems,
        knownThreadItems: knownThreadItems,
        knownPaths: knownPaths,
        addedPaths: addedPaths,
        modifiedPaths: (treeNeedsRefresh && []) || modifiedPaths,
        removedPaths: (treeNeedsRefresh && []) || removedPaths,
        shouldReset: treeNeedsRefresh || (thisProps.displayMode !== nextProps.displayMode),
        hasNoItems: hasNoItems,
    };
}

/**
 * Get the change items that the file tree knows about given a new set of props.
 */
export const getChangeItemsData = (nextProps: SparseFilesTreeProps, isZeroData: boolean = false): ItemMap => {
    const knownItems: ItemMap = {};

    // add an item for every change
    if (!isZeroData) {
        nextProps.changes.forEach(change => {
            // skip files of type sourceRename and delete, as we show renamed file anyways.
            if (!ChangeType.isSourceRenameDelete(change.changeType)) {
                const path: string = (change.item.serverItem || change.sourceServerItem);
                if (path) {
                    const itemTextData: SparseFilesTreeItemTextData = getItemTextDataForChange(path, change);
                    knownItems[path] = {
                        path: path,
                        name: itemTextData.name,
                        title: itemTextData.title,
                        iconClass: change.item.isFolder ? "bowtie-folder" : getIconNameForFile(path),
                        change: change,
                    };
                }
            }
        });
    }
    // zero data experience, just show the root node
    else {
        knownItems[DEFAULT_SEPARATOR] = {
            path: DEFAULT_SEPARATOR,
            name: DEFAULT_SEPARATOR,
            title: DEFAULT_SEPARATOR,
        }
    }

    return knownItems;
}

/**
 * Get the thread items that the file tree knows about given a new set of props.
 */
export const getThreadItemsData = (nextProps: SparseFilesTreeProps, knownChangeItems: ItemMap): ItemMap => {
    const knownItems: ItemMap = {};

    // add an item for every thread
    if (nextProps.threads) {
        nextProps.threads.forEach(thread => {
            const shouldAddThreadForFile: boolean = !!thread.itemPath
                && !!knownChangeItems[thread.itemPath] // don't add thread items if we don't have the corresponding change item
                && !!thread.comments
                && !!thread.comments.length;

            if (shouldAddThreadForFile) {
                const threadComment: DiscussionComment = thread.comments[0];
                const threadPath: string = thread.itemPath + DEFAULT_SEPARATOR + threadComment.threadId;

                const itemTextData: SparseFilesTreeItemTextData = getItemTextDataForThread(thread.itemPath, thread, threadComment);
                const iconUrl: string = 
                    AvatarUtils.getAvatarUrl(threadComment.author)
                    || nextProps.tfsContext.getIdentityImageUrl(threadComment.author.id);

                knownItems[threadPath] = {
                    path: threadPath,
                    name: itemTextData.name,
                    title: itemTextData.title,
                    iconClass: "identity-picture x-small",
                    iconUrl: iconUrl,
                    isDirty: thread.comments.some(comment => comment.isDirty),
                    thread: thread,
                };
            }
        });
    }

    return knownItems;
}

/**
 * Used to customize the sorting of elements in the tree. Usually elements on the same tree level are
 * sorted by name with the folders and items in their own groups. Since we convert file items to folders when
 * they have nested discussions, we need to make sure these are sorted correctly to prevent jumping.
 */
export const compareChildren = (state: SparseFilesTreeState, parentPath: string, a: string, b: string): number => {
    const aItemData: SparseFilesTreeItemData = state.knownChangeItems[parentPath + a] || state.knownThreadItems[parentPath + a];
    const bItemData: SparseFilesTreeItemData = state.knownChangeItems[parentPath + b] || state.knownThreadItems[parentPath + b];

    // both items are unknown (folders) so sort alphabetically like normal
    if (!aItemData && !bItemData) {
        return ignoreCaseComparer(a, b);
    }

    // one of the items is unknown, sort the unknown (folder) item above
    if (!aItemData || !bItemData) {
        return +!!aItemData - +!!bItemData;
    }

    const thread1: DiscussionThread = aItemData.thread;
    const thread2: DiscussionThread = bItemData.thread;

    // both items are threads
    if (thread1 && thread2) {
        const position1: DiscussionPosition = thread1.position;
        const position2: DiscussionPosition = thread2.position;

        // one of the threads is file-level, sort the file-level thread above since it's at the top of the file
        if (!position1 || !position2) {
            return +!!position1 - +!!position2;
        }

        if (position1.endLine !== position2.endLine) {
            return position1.endLine - position2.endLine;
        }

        const date1: Date = thread1.publishedDate || thread1.createdDate || new Date(Date.now());
        const date2: Date = thread2.publishedDate || thread2.createdDate || new Date(Date.now());

        return date2.getTime() - date1.getTime();
    }

    return ignoreCaseComparer(a, b);
}

/**
 * Return whether or not we will allow a given tree item to be compacted/merged with its child.
 */
export const canCompactNodeIntoChild = (state: SparseFilesTreeState, props: SparseFilesTreeProps, node: TreeNode, depth: number): boolean => {
    let canCompact: boolean = true;
    const isUnknownItem: boolean = !state.knownPaths[node.folders[0] && node.folders[0].name];

    switch (props.displayMode) {
        case ChangeExplorerGridDisplayMode.FullTree:
            // Full tree view
            canCompact = CompactMode.none(node, depth);
            break;
        case ChangeExplorerGridDisplayMode.FilesOnly:
            // TODO: List view
            canCompact = true;
            break;
        case ChangeExplorerGridDisplayMode.SingleFoldersExceptFirstlevel:
            // Smart tree/grouped view except for the root
            canCompact = CompactMode.singleFoldersExceptFirstlevel(node, depth) && isUnknownItem;
            break;
        default:
        case ChangeExplorerGridDisplayMode.FilesByFolder:
            // Smart tree/grouped view
            canCompact = CompactMode.singleFolders(node, depth) && isUnknownItem;
            break;
    }

    return canCompact;
}

/**
 * Get context menu items for a given item in the tree.
 */
export function getContextMenuItems(props: SparseFilesTreeProps, path: string, itemData?: SparseFilesTreeItemData): IContextualMenuItem[] {
    const branch = props.useBranchForNavigation && props.sourceBranchName;
    return PullRequestCommands.getTreeItemCommands({
        tfsContext: props.tfsContext,
        repositoryContext: props.repositoryContext,
        path,
        version: branch ? "GB" + branch : props.version,
        isFolder: itemData && itemData.change && itemData.change.item.isFolder,
        isGit: props.repositoryContext.getRepositoryType() === RepositoryType.Git,
        isFullPageNavigate: props.isFullPageNavigate,
        isShelveset: props.isShelveset,
        change: itemData && itemData.change,
        thread: itemData && itemData.thread,
        disableAddThread: props.disableAddThread,
        discussionActionCreator: props.discussionActionCreator,
    });
}

/**
 * Get the currently selected path in the tree.
 */
export const getSelectedPath = (props: SparseFilesTreeProps): string => {
    let selectedPath: string = props.selectedFullPath;

    if (props.selectedDiscussion && props.threads) {
        for (const thread of props.threads) {
            if (thread.id === props.selectedDiscussion) {
                selectedPath = thread.itemPath + DEFAULT_SEPARATOR + thread.id;
                break;
            }
        }
    }

    return selectedPath;
}

/**
 * Get the display and tooltip text for a given change that will be rendered in the tree.
 */
export const getItemTextDataForChange = (path: string, change: Change): SparseFilesTreeItemTextData => {
    let title: string = path;
    const changeType: string = ChangeType.getDisplayText(change.changeType);
    if (changeType) {
        title += " [" + changeType + "]";

        // if change was a rename, include the previous filename
        if (change.sourceServerItem && ChangeType.hasChangeFlag(change.changeType, VersionControlChangeType.Rename)) {
            title += "\r\n\r\n" + format(VCResources.RenamedFromFormat, change.sourceServerItem);
        }
    }

    return { 
        name: path.split(DEFAULT_SEPARATOR).pop(),
        title: title,
    };
}

/**
 * Get the display and tooltip text for a given thread that will be rendered in the tree.
 */
export const getItemTextDataForThread = (path: string, thread: DiscussionThread, comment: DiscussionComment): SparseFilesTreeItemTextData => {
    let name: string = 
        (comment.isDeleted && VCResources.PullRequest_ChangeExplorer_DiscussionThreadDeleted_Text) ||
        (comment.isDirty && comment.newContent) || 
        comment.content || " ";

    const title: string = 
        (!comment.author && " ") || (comment.isDeleted && " ") ||
        format(VCResources.PullRequest_ChangeExplorer_DiscussionThread_Title, comment.author.displayName, name);

    name = (name.length > MAX_COMMENT_DISPLAY_LENGTH) ? name.substr(0, MAX_COMMENT_DISPLAY_LENGTH) + "..." : name;

    return {
        name: name,
        title: title,
    };
}

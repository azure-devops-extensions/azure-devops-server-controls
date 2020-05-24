import * as React from "react";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { CommentFilterSelector } from "VersionControl/Scripts/Components/PullRequestReview/CommentFilterSelector";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import { ChangeExplorerItemType } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";

import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import {
    ChangeExplorerGridCommentsMode,
    ChangeExplorerGridDisplayMode,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

import { SearchableSparseFilesTree } from "VersionControl/Scenarios/Shared/Trees/SearchableSparseFilesTree";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";

import * as ChangeDetailsTelemetry from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import * as ChangeDetailsUtils from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { ParentSelectorContainer } from "VersionControl/Scenarios/ChangeDetails/Components/ParentSelectorContainer";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { UrlParameters } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { Pagination } from "VersionControl/Scenarios/Shared/Pagination";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";

export interface IChangeListLeftPanelProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

export interface IChangeListLeftPanelState {
    isLoading: boolean;
    isLoadingMoreResults: boolean; // only captures the loading for 'more changes' unlike 'isLoading' which includes user preferences as well
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    changeList: VCLegacyContracts.ChangeList;
    originalChangeList: VCLegacyContracts.ChangeList;
    displayMode: ChangeExplorerGridDisplayMode;
    commentsMode: ChangeExplorerGridCommentsMode;
    isGitMergeCommit: boolean;
    numChangesDownloaded: number;
    hasMoreResults: boolean;
    parentIndex: number;
    selectedPath: string;
    selectedDiscussionId: number;
    discussionThreads?: DiscussionThread[]; // keeping it optional because it's currently behind FF
    changeListWithoutFolderEntries?: VCLegacyContracts.ChangeList; // optional because it's behind FF
    allowViewOrEditComment: boolean;
}

/**
 *  Container for components present in the Left panel of the ChangeListView
 */
export class ChangeListLeftPanel extends React.Component<IChangeListLeftPanelProps, IChangeListLeftPanelState> {
    /* TODO:
     * Following two static methods are copied from PullRequestReview/ChangeTransformer.
     * We should reuse those methods writing a convertor from Legacy Artifacts and ChangeTransformer Artifacts
     */
    private static isChangeTypeRename(change: VCLegacyContracts.Change) {
        if (!change) {
            return false;
        }

        return ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Rename);
    }

    private static isPathInChangeList(path: string, changeList: VCLegacyContracts.ChangeList): boolean {
        if (!path) {
            return true;
        }

        if (!changeList) {
            return false;
        }

        let pathIsInChangeList: boolean = false;

        $.each(changeList.changes, (index, change) => {
            // use lastIndexOf to see if the path is wholly contained at the start of the change path
            const pathContainedInOriginal = change && change.sourceServerItem && change.sourceServerItem.lastIndexOf(path, 0) === 0;
            const pathContainedInModified = change && change.item && change.item && change.item.serverItem && change.item.serverItem.lastIndexOf(path, 0) === 0;

            // if path is a folder and matches the beginning substring, path is in changelist
            if (pathContainedInModified || (pathContainedInOriginal && ChangeListLeftPanel.isChangeTypeRename(change))) {
                pathIsInChangeList = true;
                return false;
            }
        });

        return pathIsInChangeList;
    }

    constructor(props: IChangeListLeftPanelProps, context?: {}) {
        super(props, context);

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.addChangedListener(this._onChange);
        this.props.storesHub.changeListStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.addChangedListener(this._onChange);
        this.props.storesHub.discussionsStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionsStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    public componentDidUpdate(): void {
        if (!ChangeListLeftPanel.isPathInChangeList(this.state.selectedPath, this.state.changeList)) {
            setTimeout(() => {
                this._navigateToTreeItem(null, ChangeExplorerItemType.Folder, true, null, null, true);
            },         0);
        }
    }

    public shouldComponentUpdate(nextProps: IChangeListLeftPanelProps, nextState: IChangeListLeftPanelState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false;
        }

        return true;
    }

    public render(): JSX.Element {
        const currentCommit = this.state.originalChangeList as VCLegacyContracts.GitCommit;
        const isGitCommit = ChangeDetailsUtils.isGitCommit(this.state.changeList);

        return (
            !this.state.isLoading &&
            <div className="vc-leftpane-section">
                <div className="filter-section">
                    {currentCommit.parents.length > 0 &&
                        <ParentSelectorContainer
                            actionCreator={this.props.actionCreator}
                            currentCommit={currentCommit}
                            storesHub={this.props.storesHub}
                            parentIndex={this.state.parentIndex}
                            repositoryContext={this.state.repositoryContext}
                            customerIntelligenceData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
                    }
                    <div className="spacer" />
                    { this.state.allowViewOrEditComment && 
                        <CommentFilterSelector
                        commentsMode={this.state.commentsMode}
                        onUpdateChangeExplorerOptions={this._updateChangeExplorerOptionsCallback} />
                    }
                </div>

                <Pagination
                    showMoreButtonTitle={VCResources.ClickForMoreChangesText}
                    showMoreButtonTextWhenEnabled={VCResources.PullRequest_LoadMore}
                    showMoreButtonTextWhenDisabled={VCResources.PullRequest_FetchingChanges}
                    showMoreMessageText={Utils_String.format(VCResources.PullRequest_MoreItemsMessage, this.state.numChangesDownloaded)}
                    disabled={this.state.isLoadingMoreResults}
                    hasMoreResults={this.state.hasMoreResults}
                    onShowMoreClick={this._onShowMoreClick} />
                <SearchableSparseFilesTree
                    tfsContext={this.state.tfsContext}
                    repositoryContext={this.state.repositoryContext}
                    changes={this.state.changeListWithoutFolderEntries.changes}
                    version={this.state.changeList.version}
                    allChangesIncluded={this.state.changeList.allChangesIncluded}
                    threads={this.state.discussionThreads}
                    rootName={this.state.repositoryContext && this.state.repositoryContext.getRepository().name}
                    sourceBranchName={null}
                    selectedFullPath={this.state.selectedPath}
                    pathComparer={Utils_String.defaultComparer}
                    selectedDiscussion={this.state.selectedDiscussionId}
                    displayMode={this.state.displayMode}
                    isVisible={true}
                    useBranchForNavigation={false}
                    onItemSelected={this._onItemSelectedInFileTree}
                    discussionActionCreator={this.state.discussionManager && ServiceRegistry.getService(IDiscussionActionCreator)}
                    onContentPrefetch={isGitCommit ? this._onPrefetchContent : null}
                    onContentPrefetchCancelled={isGitCommit ? this.props.actionCreator.changeListActionCreator.stopLoadAllChanges : null}
                    isLoadingMore={this.state.isLoadingMoreResults}
                    disableAddThread={!this.state.allowViewOrEditComment}/>
            </div>
        );
    }

    private _onItemSelectedInFileTree = (path: string, discussionId?: number, depth?: number): void => {
        const selectedChange: VCLegacyContracts.Change = this.state.changeList.changes.filter(
            (change: VCLegacyContracts.Change) => {
                return change.item.serverItem === path;
            }
        )[0];

        let itemType: ChangeExplorerItemType;
        if (!!discussionId) {
            itemType = ChangeExplorerItemType.DiscussionComment;
        } else if (!selectedChange) {
            itemType = ChangeExplorerItemType.Folder;
        } else {
            if (selectedChange.item.isFolder) {
                itemType = ChangeExplorerItemType.Folder;
            } else {
                itemType = ChangeExplorerItemType.File;
            }
        }

        const isRootFolder = (path === "/"); // for git, "/" is the root

        this._navigateToTreeItem(selectedChange, itemType, isRootFolder, path, discussionId);
    }

    // public for testing
    public _onShowMoreClick = (): void => {
        const baseVersion = this.props.storesHub.changeListStore.compareToVersionSpec ?
            this.props.storesHub.changeListStore.compareToVersionSpec.toVersionString() : "";
        const targetVersion = this.props.storesHub.changeListStore.versionSpec ?
            this.props.storesHub.changeListStore.versionSpec.toVersionString() : "";

        // Logging CI for showMoreClick
        const ciData = ChangeDetailsTelemetry.getCustomerIntelligenceData(this.props.customerIntelligenceData);
        ciData.publish(ChangeDetailsTelemetry.ChangeDetailsTelemetryFeatures.showMore, false);

        this.props.actionCreator.changeListActionCreator.loadMoreChanges(
            this.state.changeList,
            baseVersion,
            targetVersion);
    }

    // public for UTs
    public _navigateToTreeItem = (change: VCLegacyContracts.Change,
        itemType: ChangeExplorerItemType,
        isRootFolder: boolean,
        path: string,
        discussionId?: number,
        replaceHistoryEntry?: boolean): void => {

        const state = this.props.storesHub.urlParametersStore.UrlParameters;

        if (!state || itemType === ChangeExplorerItemType.InformationMessage) {
            return;
        }

        let action = state.action;
        let doNavigate = false;
        const newState = {
            path: null,
            gridItemType: null,
            mpath: null,
            opath: null,
            mversion: null,
            oversion: null,
            discussionId: null,
            diffParent: null,
        } as UrlParameters;

        newState.gridItemType = itemType;
        if (state.gridItemType !== itemType) {
            doNavigate = true;
        }

        if (itemType === ChangeExplorerItemType.Folder) {

            if (action !== VersionControlActionIds.Summary && state.path) {
                doNavigate = true;
            }

            if (isRootFolder) {

                if (state.path) {
                    doNavigate = true;
                }

                newState.path = null;
            } else {

                if (state.path !== path) {
                    doNavigate = true;
                }

                newState.path = path;
            }

            action = this.props.storesHub.changeListStore.currentGitMergeParentId;
        } else {

            if (state.path !== path) {
                doNavigate = true;
            }

            newState.diffParent = this.props.storesHub.changeListStore.currentGitMergeParentId;
            newState.path = path;
            if (change && ChangeType.isEdit(change.changeType)) {

                // Edited file - show compare tab
                if (action !== VersionControlActionIds.Compare) {
                    doNavigate = true;
                }
                action = VersionControlActionIds.Compare;

                newState.opath = ChangeDetailsUtils.getOriginalPath(this.props.storesHub.changeListStore.currentChangeList, path);
                newState.mpath = path;
                newState.oversion = this.props.storesHub.changeListStore.getPreviousVersionSpec(
                    this.props.storesHub.changeListStore.isGitMergeCommit &&
                    this.props.storesHub.urlParametersStore.gitParentDiffIndex > 0);
                newState.mversion = this.props.storesHub.changeListStore.currentChangeList.version;

                if (newState.opath !== state.opath ||
                    newState.mpath !== state.mpath ||
                    newState.oversion !== state.oversion ||
                    newState.mversion !== state.mversion) {

                    doNavigate = true;
                }
            } else if (discussionId && !path) {
                // artifact-level thread
                if (action !== VersionControlActionIds.Summary) {
                    doNavigate = true;
                }
                action = VersionControlActionIds.Summary;
                newState.path = null;
            } else {
                // Non-edit files, show the Contents tab
                if (action !== VersionControlActionIds.Contents) {
                    doNavigate = true;
                }
                action = VersionControlActionIds.Contents;
            }

            if (discussionId) {
                if (("" + state.discussionId) !== ("" + discussionId)) {
                    doNavigate = true;
                }
                newState.discussionId = discussionId;
            } else {
                if (state.discussionId) {
                    doNavigate = true;
                }
            }
        }

        if (doNavigate) {
            this.props.actionCreator.navigationStateActionCreator.navigateWithState(action, newState, replaceHistoryEntry);
        }

    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IChangeListLeftPanelState {
        const userPreferences = this.props.storesHub.userPreferencesStore.getPreferences();
        const currentDisplayMode = ChangeExplorerGridDisplayMode.FilesByFolder;
        const changeList = ChangeDetailsUtils.getChangeListForDisplayMode(
            currentDisplayMode,
            this.props.storesHub.changeListStore.currentChangeList);

        const changeListSkipCount = this.props.storesHub.changeListStore.changeListSkipCount;
        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.userPreferencesStore.isLoading() ||
            this.props.storesHub.changeListStore.isLoading();

        const isGitMergeCommit = this.props.storesHub.changeListStore.isGitMergeCommit;
        const hasMoreResults = this.props.storesHub.changeListStore.hasMoreChanges;
        const maxChangesToInclude = this.props.storesHub.changeListStore.maxChangesToInclude;
        const numChangesDownloaded = this.props.storesHub.changeListStore.downloadedChangesCount;
        const isLoadingMoreResults: boolean = this.props.storesHub.changeListStore.changeListMoreChangesLoading ||
            this.props.storesHub.changeListStore.loadAllInProgress;
        const selectedPath = this.props.storesHub.urlParametersStore.path;
        const selectedDiscussionId = this.props.storesHub.urlParametersStore.discussionId;
        const commentsMode = userPreferences ? userPreferences.changeExplorerGridCommentsMode : ChangeExplorerGridCommentsMode.Default;
        const discussionManager = this.props.storesHub.discussionManagerStore.discussionManager;

        let discussionThreads: DiscussionThread[];
        if (discussionManager) { // show discussion threads only if discussionManager is available
            let discussionType: DiscussionType = DiscussionType.All;
            if (commentsMode === ChangeExplorerGridCommentsMode.Off) {
                discussionType = DiscussionType.None;
            } else if (commentsMode === ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles) {
                discussionType = DiscussionType.AllActiveComments;
            }
            discussionThreads = this.props.storesHub.discussionsStore.getDiscussionThreads({ types: discussionType, includePending: true });
        }

        return {
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
            discussionManager: discussionManager,
            displayMode: currentDisplayMode,
            commentsMode: commentsMode,
            isLoading: isLoading,
            changeList: changeList,
            isGitMergeCommit: isGitMergeCommit,
            numChangesDownloaded: numChangesDownloaded,
            hasMoreResults: hasMoreResults,
            isLoadingMoreResults: isLoadingMoreResults,
            originalChangeList: this.props.storesHub.changeListStore.originalChangeList,
            parentIndex: this._getParentIndex(),
            selectedPath: selectedPath,
            selectedDiscussionId: selectedDiscussionId > 0 ? selectedDiscussionId : null,
            discussionThreads: discussionThreads,
            changeListWithoutFolderEntries: this.props.storesHub.changeListStore.currentChangeListWithoutNonEmptyFolders,
            allowViewOrEditComment: this.props.storesHub.permissionsStore.getPermissions().addEditComment,
        } as IChangeListLeftPanelState;
    }

    // public for UTs
    // We read from changeListStore when we fetch results for getting diff to parent n
    public _getParentIndex = (): number => {
        const gitMergeParentId = this.props.storesHub.changeListStore.currentGitMergeParentId;
        const urlParamDiffParentIndex = this.props.storesHub.urlParametersStore.gitParentDiffIndex;
        let parentIndex = -1;

        if (gitMergeParentId) {
            parentIndex = Utils_Number.parseInvariant(gitMergeParentId.substr(VersionControlActionIds.DiffParent.length)) 
                || urlParamDiffParentIndex;
        }
        else if (urlParamDiffParentIndex) {
            parentIndex = urlParamDiffParentIndex;
        }

        return parentIndex;
    }

    private _updateChangeExplorerOptionsCallback = (options: ChangeExplorerGridModeChangedEventArgs, shouldUpdatePrefs?: boolean): void => {
        if (options) {
            this.props.actionCreator.userPreferenceActionCreator.updateChangeExplorerDisplayOptions(options, shouldUpdatePrefs);
        }
    }

    private _onPrefetchContent = (): void => {
        if (this.state.hasMoreResults) {
            const baseVersion: string = this.props.storesHub.changeListStore.compareToVersionSpec ?
                this.props.storesHub.changeListStore.compareToVersionSpec.toVersionString() : "";
            const targetVersion: string = this.props.storesHub.changeListStore.versionSpec ?
                this.props.storesHub.changeListStore.versionSpec.toVersionString() : "";

            this.props.actionCreator.changeListActionCreator.loadAllChanges(
                this.state.changeList,
                baseVersion,
                targetVersion);
        }
    }
}

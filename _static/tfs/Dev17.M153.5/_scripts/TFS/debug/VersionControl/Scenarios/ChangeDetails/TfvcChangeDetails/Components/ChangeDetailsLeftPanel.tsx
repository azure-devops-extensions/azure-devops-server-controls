 import * as React from "react";
import * as Utils_String from "VSS/Utils/String";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { SearchableSparseFilesTree } from "VersionControl/Scenarios/Shared/Trees/SearchableSparseFilesTree";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { CommentFilterSelector } from "VersionControl/Scripts/Components/PullRequestReview/CommentFilterSelector";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import { ChangeExplorerItemType } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";

import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import {
    ChangeExplorerGridCommentsMode,
    ChangeExplorerGridDisplayMode,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";

import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import { UrlParameters } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import * as ChangeDetailsTelemetry from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import * as ChangeDetailsUtils from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { Pagination } from "VersionControl/Scenarios/Shared/Pagination";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";

export interface IChangeListLeftPanelProps extends IChangeDetailsPropsBase {
    storesHub: StoresHub;
    actionCreator: ActionCreator;
}

export interface IChangeListLeftPanelState {
    isLoading: boolean;
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    changeList: VCLegacyContracts.ChangeList;
    originalChangeList: VCLegacyContracts.ChangeList;
    displayMode: ChangeExplorerGridDisplayMode;
    commentsMode: ChangeExplorerGridCommentsMode;
    numChangesDownloaded: number;
    hasMoreResults: boolean;
    isPaginationDisabled: boolean;
    selectedPath: string;
    selectedDiscussionId: number;
    discussionThreads?: DiscussionThread[]; // keeping it optional because it's currently behind FF
    changeListWithoutNonEmptyFolders?: VCLegacyContracts.ChangeList; // optional because it is behind FF
}

/**
 *  Container for components present in the Left panel of the ChangeListView
 */
export class ChangeListLeftPanel extends React.Component<IChangeListLeftPanelProps, IChangeListLeftPanelState> {
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
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionsStore.removeChangedListener(this._onChange);
    }

    public componentDidUpdate(): void {
        if (!isPathInChangeList(this.state.selectedPath, this.state.changeList)) {
            setTimeout(() => {
                navigateToTreeItem(null, ChangeExplorerItemType.Folder, true, null, null, this.props.storesHub, this.props.actionCreator);
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
        return (
            !this.state.isLoading &&
            <div className="vc-leftpane-section">
                <div className="filter-section">
                    <CommentFilterSelector
                        commentsMode={this.state.commentsMode}
                        onUpdateChangeExplorerOptions={this._updateChangeExplorerOptionsCallback} />
                </div>
                <Pagination
                    showMoreButtonTitle={VCResources.ClickForMoreChangesText}
                    showMoreButtonTextWhenEnabled={VCResources.PullRequest_LoadMore}
                    showMoreButtonTextWhenDisabled={VCResources.PullRequest_FetchingChanges}
                    showMoreMessageText={Utils_String.format(VCResources.PullRequest_MoreItemsMessage, this.state.numChangesDownloaded)}
                    disabled={this.state.isPaginationDisabled}
                    hasMoreResults={this.state.hasMoreResults}
                    onShowMoreClick={this._onShowMoreClick} />
                    <SearchableSparseFilesTree
                        tfsContext={this.state.tfsContext}
                        repositoryContext={this.state.repositoryContext}
                        changes={this.state.changeListWithoutNonEmptyFolders.changes}
                        version={this.state.changeList.version}
                        allChangesIncluded={this.state.changeList.allChangesIncluded}
                        isShelveset={(this.state.changeList as VCLegacyContracts.TfsChangeList).isShelveset}
                        threads={this.state.discussionThreads}
                        rootName={this.state.repositoryContext && this.state.repositoryContext.getRootPath()}
                        sourceBranchName={null}
                        selectedFullPath={this.state.selectedPath}
                        selectedDiscussion={this.state.selectedDiscussionId}
                        displayMode={this.state.displayMode}
                        isVisible={true}
                        useBranchForNavigation={false}
                        onItemSelected={this._onItemSelectedInFileTree}
                        discussionActionCreator={this.state.discussionManager && ServiceRegistry.getService(IDiscussionActionCreator)} />
               
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

        const isRootFolder = (depth === 0);

        navigateToTreeItem(selectedChange, itemType, isRootFolder, path, discussionId, this.props.storesHub, this.props.actionCreator);
    }

    // public for testing
    public _onShowMoreClick = (): void => {
        const baseVersion = "";
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

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IChangeListLeftPanelState {
        const repositoryContext = this.props.storesHub.contextStore.getRepositoryContext();
        const userPreferences = this.props.storesHub.userPreferencesStore.getPreferences();
        const currentDisplayMode = ChangeExplorerGridDisplayMode.FilesByFolder;

        const changeList = ChangeDetailsUtils.getChangeListForDisplayMode(
            currentDisplayMode,
            this.props.storesHub.changeListStore.currentChangeList);

        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.userPreferencesStore.isLoading() ||
            this.props.storesHub.changeListStore.isLoading();

        const hasMoreResults = this.props.storesHub.changeListStore.hasMoreChanges;
        const numChangesDownloaded = this.props.storesHub.changeListStore.downloadedChangesCount;
        const isPaginationDisabled = this.props.storesHub.changeListStore.changeListMoreChangesLoading;
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
            repositoryContext: repositoryContext,
            discussionManager: discussionManager,
            displayMode: currentDisplayMode,
            commentsMode: commentsMode,
            isLoading: isLoading,
            changeList: changeList,
            numChangesDownloaded: numChangesDownloaded,
            hasMoreResults: hasMoreResults,
            isPaginationDisabled: isPaginationDisabled,
            originalChangeList: this.props.storesHub.changeListStore.originalChangeList,
            selectedPath: selectedPath,
            selectedDiscussionId: selectedDiscussionId > 0 ? selectedDiscussionId : null,
            discussionThreads: discussionThreads,
            changeListWithoutNonEmptyFolders: this.props.storesHub.changeListStore.currentChangeListWithoutNonEmptyFolders,
        } as IChangeListLeftPanelState;
    }

    private _updateChangeExplorerOptionsCallback = (options: ChangeExplorerGridModeChangedEventArgs, shouldUpdatePrefs?: boolean): void => {
        if (options) {
            this.props.actionCreator.userPreferenceActionCreator.updateChangeExplorerDisplayOptions(options, shouldUpdatePrefs);
        }
    }
}

/* TODO:
 * Following two functions are copied from PullRequestReview/ChangeTransformer.
 * We should reuse those methods writing a convertor from Legacy Artifacts and ChangeTransformer Artifacts
 */
function isChangeTypeRename(change: VCLegacyContracts.Change) {
    if (!change) {
        return false;
    }

    return ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Rename);
}

function isPathInChangeList(path: string, changeList: VCLegacyContracts.ChangeList): boolean {
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
        if (pathContainedInModified || (pathContainedInOriginal && isChangeTypeRename(change))) {
            pathIsInChangeList = true;
            return false;
        }
    });

    return pathIsInChangeList;
}

export function navigateToTreeItem(
    change: VCLegacyContracts.Change,
    itemType: ChangeExplorerItemType,
    isRootFolder: boolean,
    path: string,
    discussionId: number,
    storesHub: StoresHub,
    actionCreator: ActionCreator): void {
    const state = storesHub.urlParametersStore.UrlParameters;

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
        ss: null,
    } as UrlParameters;

    newState.gridItemType = itemType;
    newState.ss = state.ss;

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

        action = VersionControlActionIds.Summary;
    } else {

        if (state.path !== path) {
            doNavigate = true;
        }

        newState.path = path;
        if (change && ChangeType.isEdit(change.changeType)) {

            // Edited file - show compare tab
            if (action !== VersionControlActionIds.Compare) {
                doNavigate = true;
            }
            action = VersionControlActionIds.Compare;

            newState.opath = ChangeDetailsUtils.getOriginalPath(storesHub.changeListStore.currentChangeList, path);
            newState.mpath = path;
            newState.oversion = storesHub.changeListStore.getPreviousVersionSpec();
            newState.mversion = storesHub.changeListStore.currentChangeList.version;

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
        actionCreator.navigationStateActionCreator.navigateWithState(action, newState);
    }
}

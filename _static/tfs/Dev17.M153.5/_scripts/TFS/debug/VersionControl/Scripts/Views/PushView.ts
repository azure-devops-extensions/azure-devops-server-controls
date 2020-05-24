/// <reference types="knockout" />
/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!PushView' />

import * as ReactDOM from "react-dom";

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCContracts = require("TFS/VersionControl/Contracts");
import { Filter } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitClientService } from "VersionControl/Scripts/GitClientService"
import { gitChangesToLegacyChanges } from "VersionControl/Scripts/GitItemUtils";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCViewBase = require("VersionControl/Scripts/Views/BaseView");
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import VCCommonPivotFilters = require("VersionControl/Scripts/Controls/CommonPivotFiltersControl");
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import VCChangeListNavigator = require("VersionControl/Scripts/Controls/ChangeListNavigator");
import VCChangeListNavigatorChangeExplorerGrid = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import { ChangeExplorerItemType } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";

import { renderSearchableSparseFilesTree, SearchableSparseFilesTreeProps } from "VersionControl/Scenarios/Shared/Trees/SearchableSparseFilesTree";
import { getChangeListForDisplayMode } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";

import VCCompareTab = require("VersionControl/Scripts/Views/Tabs/CompareTab");
import VCContentsTab = require("VersionControl/Scripts/Views/Tabs/ContentsTab");
import VCPushCommitsTab = require("VersionControl/Scripts/Views/Tabs/PushCommitsTab");
import VCPushSummaryTab = require("VersionControl/Scripts/Views/Tabs/PushSummaryTab");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

function actionSupportsFiles(action: string): boolean {
    return Utils_String.localeIgnoreCaseComparer(action, VersionControlActionIds.Contents) === 0 ||
        Utils_String.localeIgnoreCaseComparer(action, VersionControlActionIds.Compare) === 0;
}

interface PushViewData {
    pushId: number;
    refName: string;
}

export class PushView extends VCViewBase.ViewBase {

    public static MAX_TREE_VIEW_CHANGES: number = 1000;
    private static INITIAL_MAX_CHANGES_TO_FETCH: number = 1000;
    private static readonly CHANGE_EXPLORER_SELECTION_CHANGED_EVENT = "change-explorer-selection-changed";
    private static readonly CHANGE_EXPLORER_GRID_DISPLAY_OPTIONS_CHANGED_EVENT = "display-options-changed";

    private _gitClient: GitClientService;
    private _pushViewData: PushViewData;
    private _push: VCContracts.GitPush;
    private _currentRefUpdate: VCContracts.GitRefUpdate;
    private _currentChangeList: VCLegacyContracts.ChangeList;
    private _currentCommitDiffs: VCContracts.GitCommitDiffs;
    private _currentItem: VCLegacyContracts.ItemModel;
    private _commitCommentsById: { [commitId: string]: string; };

    private _changeListNavigator: VCChangeListNavigator.ChangeListNavigator;
    private _commonPivotFilters: VCCommonPivotFilters.VersionControlCommonPivotFilters;
    private _changeExplorer: VCChangeListNavigatorChangeExplorer.ChangeExplorer;

    public initializeOptions(options?) {
        const tabs = {};
        const tabOptions = {};

        tabs[VersionControlActionIds.Summary] = VCPushSummaryTab.PushSummaryTab;
        tabs[VersionControlActionIds.Contents] = VCContentsTab.ContentsTab;
        tabs[VersionControlActionIds.Compare] = VCCompareTab.CompareTab;

        tabs[VersionControlActionIds.Commits] = VCPushCommitsTab.PushCommitsTab;
        tabOptions[VersionControlActionIds.Commits] = { tabId: VersionControlActionIds.Commits };

        tabs[VersionControlActionIds.CommitsRemoved] = VCPushCommitsTab.PushCommitsTab;
        tabOptions[VersionControlActionIds.CommitsRemoved] = { tabId: VersionControlActionIds.CommitsRemoved };

        super.initializeOptions($.extend({
            tabs: tabs,
            tabOptions: tabOptions,
            hubContentSelector: ".version-control-item-right-pane",
            pivotTabsSelector: ".vc-explorer-tabs",
            titleElementSelector: ".vc-page-title"
        }, options));
    }

    public initialize() {
        this._customerIntelligenceData.setView("PushView");

        this._gitClient = (<GitRepositoryContext>this._repositoryContext).getGitClient();
        this._commitCommentsById = {};

        this._commonPivotFilters = <VCCommonPivotFilters.VersionControlCommonPivotFilters>Controls.Enhancement.enhance(VCCommonPivotFilters.VersionControlCommonPivotFilters, this._element.find(".right-hub-content .hub-pivot > .filters"), {
            repositoryContext: this._repositoryContext,
            showLeftPaneInFullScreenMode: true,
            showCloneButton: !this._options.showCloneButtonOnL2Header
        });

        super.initialize();
    }

    protected _dispose(): void {
        if (this._changeExplorer) {
            this._changeExplorer._unbind(PushView.CHANGE_EXPLORER_SELECTION_CHANGED_EVENT, this._onChangeExplorerSelectionChanged);
            this._changeExplorer.getGrid()._unbind(PushView.CHANGE_EXPLORER_GRID_DISPLAY_OPTIONS_CHANGED_EVENT, this._onChangeExplorerGridDisplayOptionsChanged);

            if (this._changeListNavigator) {
                this._changeListNavigator.detachNavigateEvent(this._onChangeListNavigatorNavigateEvent);
                this._changeListNavigator = null;
            }
            this._changeExplorer.dispose();
            this._changeExplorer = null;
        }

        ReactDOM.unmountComponentAtNode(this._element.find(".vc-push-items-container")[0]);

        if (this._commonPivotFilters) {
            this._commonPivotFilters.dispose();
            this._commonPivotFilters = null;
        }

        super._dispose();
    }

    private _onChangeExplorerSelectionChanged = (sender: any, selectedItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem): void => {
        this.navigateToChangeExplorerItem(selectedItem);
    }

    private _onChangeListNavigatorNavigateEvent = (sender: VCChangeListNavigator.ChangeListNavigator, selectedItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem): void => {
        this.navigateToChangeExplorerItem(selectedItem);
    }

    private _onChangeExplorerGridDisplayOptionsChanged = (sender: any, eventArgs: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGridModeChangedEventArgs): void => {
        if (this._repositoryContext) {
            this._repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
                preferences.changeExplorerGridDisplayMode = this._changeExplorer.getGrid().getDisplayMode();
                this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);
            });
        }
        if (eventArgs.displayModeChanged && this.getCurrentAction() === VersionControlActionIds.Summary && this.getState().path) {
            // Refresh the summary view mode when filtered since the mode can change which files are displayed (recursive or not)
            this.refreshCurrentTab();
        }
    }

    private getPushData(): PushViewData {
        if (!this._pushViewData) {
            if (this._options.pushId) {
                this._pushViewData = <PushViewData>{ pushId: this._options.pushId };
            }
            else {
                const $dataElement = this._element.find(".vc-push-data");
                this._pushViewData = Utils_Core.parseMSJSON($dataElement.html(), false);

                if (this._pushViewData) {
                    $dataElement.remove();
                }
            }
        }
        return this._pushViewData;
    }

    private beginGetPush(callback: (push: VCContracts.GitPush) => void, errorCallback: IErrorCallback) {
        if (this._push) {
            callback.call(this, this._push);
        }
        else {
            this._gitClient.beginGetPush(this._repositoryContext, this.getPushData().pushId, 0, true, (push: VCContracts.GitPush) => {
                this._push = push;
                callback.call(this, push);
            }, errorCallback);
        }
    }

    private beginGetPushAndChanges(
        refName: string,
        maxChanges: number,
        callback: (push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate, changeList: VCLegacyContracts.ChangeList, commitDiffs: VCContracts.GitCommitDiffs) => void,
        errorCallback: IErrorCallback) {

        this.beginGetPush((push: VCContracts.GitPush) => {

            if (this._currentRefUpdate &&
                (!refName || this._currentRefUpdate.name === refName) &&
                (!this._currentChangeList || this._currentChangeList.allChangesIncluded || this._currentChangeList.changes.length === maxChanges)) {
                callback.call(this, push, this._currentRefUpdate, this._currentChangeList, this._currentCommitDiffs);
            }
            else {
                let refUpdate: VCContracts.GitRefUpdate,
                    changeList: VCLegacyContracts.ChangeList;

                $.each(push.refUpdates || [], (i: number, update: VCContracts.GitRefUpdate) => {
                    if (update.name === refName || !refName) {
                        refUpdate = update;
                        if (refName || update.name.indexOf("refs/heads/") === 0) {
                            // Matching ref or the first branch found.
                            return false;
                        }
                    }
                });

                if (refUpdate) {
                    if (GitRefUtility.isRefTag(refUpdate.name) && this._repositoryContext) {
                        
                        this._gitClient.beginGetGitRefsBatch(
                            this._repositoryContext.getRepository(),
                            [refUpdate.name],
                            (tag: VCContracts.GitRef[]) => {

                                refUpdate.newObjectId = tag[0].peeledObjectId;
                                this._onRefUpdate(refUpdate, maxChanges, push, callback, errorCallback);

                            }, (error: any) => {
                                errorCallback.call(this, error);
                            });
                    }
                    else {
                        this._onRefUpdate(refUpdate, maxChanges, push, callback, errorCallback);
                    }
                }
                else {
                    errorCallback.call(this, Utils_String.format(VCResources.RefUpdateNotFoundFormat, refName));
                }
            }
        }, errorCallback);
    }

    private _onRefUpdate(
        refUpdate: VCContracts.GitRefUpdate,
        maxChanges: number,
        push: VCContracts.GitPush,
        callback: (push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate, changeList: VCLegacyContracts.ChangeList, commitDiffs: VCContracts.GitCommitDiffs) => void,
        errorCallback: IErrorCallback): void {

        if (CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId) || CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId)) {
            this._currentRefUpdate = refUpdate;
            this._currentChangeList = null;
            this._currentCommitDiffs = null;
            this._fetchCommitComment(refUpdate.newObjectId);
            callback.call(this, push, refUpdate, null, null);
        }
        else {
            this._gitClient.beginGetCommitDiffs(
                this._repositoryContext.getRepositoryId(),
                this._repositoryContext.getProjectId(),
                new VCSpecs.GitCommitVersionSpec(refUpdate.oldObjectId).toVersionString(),
                new VCSpecs.GitCommitVersionSpec(refUpdate.newObjectId).toVersionString(),
                false, maxChanges, 0, (commitDiffs: VCContracts.GitCommitDiffs) => {

                    this._currentRefUpdate = refUpdate;
                    this._currentCommitDiffs = commitDiffs;
                    this._currentChangeList = this._createChangeList(push, refUpdate, commitDiffs);

                    callback.call(this, push, refUpdate, this._currentChangeList, commitDiffs);

                }, errorCallback);
        }
    }

    private _createChangeList(push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate, commitDiffs: VCContracts.GitCommitDiffs): VCLegacyContracts.ChangeList {
        const version = new VCSpecs.GitCommitVersionSpec(refUpdate.newObjectId).toVersionString();

        const changeList: any = {
            allChangesIncluded: commitDiffs.allChangesIncluded,
            changeCounts: commitDiffs.changeCounts,
            changes: gitChangesToLegacyChanges(commitDiffs.changes, version),
            comment: "",
            commitId: refUpdate.oldObjectId,
            creationDate: push.date,
            owner: push.pushedBy.uniqueName,
            ownerDisplayName: push.pushedBy.displayName,
            ownerId: push.pushedBy.id,
            sortDate: push.date,
            version: version
        };

        this._fetchCommitComment(refUpdate.newObjectId, changeList);

        return changeList;
    }

    private _fetchCommitComment(commitId: string, changeList?: VCLegacyContracts.ChangeList) {
        const comment = this._commitCommentsById[commitId];
        if (!comment && !CommitIdHelper.isEmptyObjectId(commitId)) {
            this._gitClient.beginGetCommitsById(this._repositoryContext, [commitId], (commits: VCContracts.GitCommitRef[]) => {
                if (commits.length && commits[0].comment) {
                    this._commitCommentsById[commitId] = commits[0].comment;
                    if (changeList) {
                        changeList.comment = commits[0].comment;
                    }
                    this._updatePageTitle(this.getState());
                }
            }, (error: any) => {
                Diag.logError("Failed to get commit message." + error ? error.message : "");
            });
        }
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        /// <summary>
        /// Parse the state info and fetch any artificacts necessary to render the tab/view. Invoke the 'callback'
        /// method with the new state info object when the state information has been successfully parsed.
        /// </summary>
        /// <param name="action" type="String">The action parameter (_a) in the url hash</param>
        /// <param name="rawState" type="Object">The raw state info from the hash url for the new navigation</param>
        /// <param name="callback" type="IResultCallback">
        ///    Callback that should be called when the state was successfully parsed. The callback takes 2 parameters: the tab id (typically
        ///    the action), and the parsed state info object.
        ///
        ///    callback(tabId, parsedStateInfo);
        ///
        /// </param>

        const state: any = {};

        this.setState(state);

        if (!action) {
            action = VersionControlActionIds.Summary;
        }

        this.beginGetPushAndChanges(
            rawState.refName,
            rawState.maxChanges || PushView.INITIAL_MAX_CHANGES_TO_FETCH,
            (push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate, changeList: VCLegacyContracts.ChangeList, commitDiffs: VCContracts.GitCommitDiffs) => {

                state.push = push;
                state.refUpdate = refUpdate;
                state.changeList = changeList;
                state.changeListWithoutFolders = getChangeListForDisplayMode(VCWebAccessContracts.ChangeExplorerGridDisplayMode.FilesOnly, changeList);
                state.path = rawState.path;
                state.versionSpec = new VCSpecs.GitCommitVersionSpec(refUpdate.newObjectId);
                state.version = state.versionSpec.toVersionString();
                state.oversionSpec = new VCSpecs.GitCommitVersionSpec(state.refUpdate.oldObjectId);
                state.oversion = rawState.oversion || state.oversionSpec.toVersionString();
                state.commitDiffs = commitDiffs;
                state.repositoryContext = this._repositoryContext;

                state.refAdded = CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId);
                state.refDeleted = CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId);

                if (state.path) {
                    let recursive: boolean = true;
                    state.summaryFilter = <Filter>{
                        path: state.path,
                        recursive: recursive
                    };
                }

                state.fullScreenMode = Utils_String.localeIgnoreCaseComparer(rawState.fullScreen, "true") === 0;
                state.annotate = Utils_String.localeIgnoreCaseComparer(rawState.annotate, "true") === 0;

                if (state.path && changeList && actionSupportsFiles(action)) {

                    state.change = this._findChange(changeList, state.path);
                    state.itemVersion = state.version;

                    if (state.change && VCOM.ChangeType.hasChangeFlag(state.change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                        state.itemVersion = "P" + state.itemVersion;
                    }

                    if (this._currentItem && this._currentItem.serverItem === state.path && this._currentItem.version === state.itemVersion) {
                        state.item = this._currentItem;
                        callback(action, state);
                    }
                    else {
                        this._repositoryContext.getClient().beginGetItem(this._repositoryContext, state.path, state.itemVersion, <VCLegacyContracts.ItemDetailsOptions>{
                            includeContentMetadata: true,
                            includeVersionDescription: true
                        }, (item: VCLegacyContracts.ItemModel) => {
                            this._currentItem = item;
                            state.item = item;
                            callback(action, state);
                        }, delegate(this, this.showError));
                    }
                }
                else {
                    callback(action, state);
                }

            }, (error: any) => {
                this.showError(error);
            });
    }

    public onNavigate(state: any) {
        /// <summary>Function invoked when a page/hash navigation has occurred</summary>
        /// <param name="state" type="Object">Hash object containing the hash-url parameters</param>

        this._updatePageTitle(state);
        this._commonPivotFilters.updateViewFilters(this);

        // Tabs:
        // root: Summary | Commits - or Summary | Commits Added | Commits Removed
        // with a file selected: No tabs
        // with a folder selected (filtered summary): No tabs
        this.setHubPivotVisibility(!state.path);

        // Don't show left pane when not showing file diffs
        this.setLeftHubPaneVisibility(state.commitDiffs ? true : false);

        // Update the left pane
        // we don't want to pass folder items to the FileTree, as it creates separate nodes for these items in the tree. Hence the below filter
        const changeList = state.changeList;
        const changeListWithoutFolders = state.changeListWithoutFolders;

        const fileTreeProps: SearchableSparseFilesTreeProps = {
            repositoryContext: this._repositoryContext,
            tfsContext: this._tfsContext,
            changes: changeListWithoutFolders ? changeListWithoutFolders.changes : null,
            version: changeList ? changeList.version : null,
            allChangesIncluded: changeList ? changeList.allChangesIncluded : null,
            displayMode: VCWebAccessContracts.ChangeExplorerGridDisplayMode.SingleFoldersExceptFirstlevel,
            rootName: this._repositoryContext && this._repositoryContext.getRepository().name,
            selectedFullPath: state.path,
            pathComparer: Utils_String.defaultComparer,
            isVisible: true,
            onItemSelected: this._navigateToSelectedTreeItem,
        };
        renderSearchableSparseFilesTree(this._element.find(".vc-push-items-container")[0], fileTreeProps);
    }

    private _updatePageTitle(state: any) {
        let fileName: string,
            changeDescription: string,
            $pageTitleContent: JQuery,
            currentAction = this.getCurrentAction(),
            isSummaryTab = Utils_String.localeIgnoreCaseComparer(currentAction, VersionControlActionIds.Summary) === 0,
            refName: string,
            commitId: string;

        if (state.refUpdate) {
            refName = GitRefUtility.getRefFriendlyName(state.refUpdate.name);
            commitId = CommitIdHelper.getShortCommitId(state.refUpdate.newObjectId);
        }

        if (state.path) {

            $pageTitleContent = $(domElem("div"));

            $(domElem("span"))
                .text(Utils_String.format(VCResources.PushTitleFormat, refName, commitId))
                .appendTo($pageTitleContent);

            $(domElem("span"))
                .text(" / ")
                .appendTo($pageTitleContent);

            if (isSummaryTab) {
                fileName = state.path;
                if (fileName[0] === "/") {
                    fileName = fileName.substr(1);
                }
            }
            else {
                fileName = this._getFriendlyPathTitle(state.path);
            }
            if (state.change) {
                changeDescription = VCOM.ChangeType.getDisplayText(state.change.changeType);
                if (changeDescription) {
                    fileName += " [" + changeDescription + "]";
                }
            }

            const pathElementId = "fullpath" + Controls.getId();
            $(domElem("span"))
                .attr("id", pathElementId)
                .attr("title", "")
                .text(fileName)
                .appendTo($pageTitleContent);

            this.setViewTitleContent($pageTitleContent.text(), $pageTitleContent.html());
            RichContentTooltip.add(state.path, $("#" + pathElementId));
        }
        else if (state.refDeleted) {
            this.setViewTitle(Utils_String.format(VCResources.RefDeletedTitleFormat, refName));
        }
        else if (state.refUpdate) {
            const comment = this._commitCommentsById[state.refUpdate.newObjectId];
            if (comment) {
                this.setViewTitle(Utils_String.format(VCResources.PushTitleFormatWithComment, refName, commitId,
                    VCCommentParser.Parser.getShortComment(comment)));
            }
            else {
                this.setViewTitle(Utils_String.format(VCResources.PushTitleFormat, refName, commitId));
            }
        }
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        /// <summary>
        /// Get the visibility state of the specified tab based on the current tab/navigation state. True to show this tab. False to hide it.
        /// </summary>
        /// <param name="tabId" type="Object">The Id to get the visiblility state for</param>
        /// <param name="currentTabId" type="String">Id of the currently selected tab</param>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>
        /// <returns type="Boolean">True to show the tab. False to hide it.</returns>

        if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.Summary) === 0) {
            // Summary tab is only visible if no file is selected
            if (parsedState.item) {
                return false;
            }
        }
        else if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.Commits) === 0) {
            const commitDiffs: VCContracts.GitCommitDiffs = parsedState.commitDiffs;

            // Commits added tab is available when no path is selected AND there were 1 or more commits added
            if (parsedState.path) {
                return false;
            }
            if (!parsedState.refAdded && (!commitDiffs || commitDiffs.aheadCount === 0)) {
                return false;
            }
        }
        else if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.CommitsRemoved) === 0) {
            const commitDiffs: VCContracts.GitCommitDiffs = parsedState.commitDiffs;

            // Commits removed tab is available when no path is selected AND there were 1 or more commits removed
            if (parsedState.path) {
                return false;
            }
            if (!parsedState.refDeleted && (!commitDiffs || commitDiffs.behindCount === 0)) {
                return false;
            }
        }
        else {
            // Contents/Compare tabs are only visible if a file is selected
            if (!parsedState.item) {
                return false;
            }
            else if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.Compare) === 0 &&
                Utils_String.localeIgnoreCaseComparer(currentTabId, VersionControlActionIds.Compare) !== 0) {

                if (parsedState.change && VCOM.ChangeType.hasChangeFlag(parsedState.change.changeType, VCLegacyContracts.VersionControlChangeType.Add)) {
                    // Hide the Compare tab for adds
                    return false;
                }
            }
        }

        return super.getTabVisibility(tabId, currentTabId, rawState, parsedState);
    }

    public getTabLabel(tabId: any, currentTabId: string, rawState: any, parsedState: any) {
        /// <summary>
        /// Get the updated tab label for the specified tab based on the current tab/navigation state. null/undefined to keep the existing label.
        /// </summary>
        /// <param name="tabId" type="Object">The Id to get the tab label for</param>
        /// <param name="currentTabId" type="String">Id of the currently selected tab</param>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>
        if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.Commits) === 0) {
            const commitDiffs: VCContracts.GitCommitDiffs = parsedState.commitDiffs;

            if (commitDiffs && (commitDiffs.behindCount > 0 || !commitDiffs.commonCommit)) {
                if (commitDiffs.aheadCount > 0) {
                    return Utils_String.format(VCResources.CommitsAddedTabWithCountFormat, commitDiffs.aheadCount);
                }
                else {
                    return VCResources.CommitsAddedTabName;
                }
            }
            else {
                if (commitDiffs && commitDiffs.aheadCount > 0) {
                    return Utils_String.format(VCResources.CommitsTabWithCountFormat, commitDiffs.aheadCount);
                }
                else {
                    return VCResources.Commits;
                }
            }
        }
        else if (Utils_String.localeIgnoreCaseComparer(tabId, VersionControlActionIds.CommitsRemoved) === 0) {
            const commitDiffs: VCContracts.GitCommitDiffs = parsedState.commitDiffs;

            if (commitDiffs && commitDiffs.behindCount > 0) {
                return Utils_String.format(VCResources.CommitsRemovedTabWithCountFormat, commitDiffs.behindCount);
            }
            else {
                return VCResources.CommitsRemovedTabName;
            }
        }
    }

    private _findChange(changeList: any, path: string): any {
        /// <summary>
        /// Try to find a change in a change list with the given path
        /// </summary>
        /// <param name="changeList" type="Object">ChangeList model</param>
        /// <param name="path" type="String">Server path of the item to find</param>
        /// <returns type="Object">Change or null if not found</returns>

        let matchingChange = null;
        $.each(changeList.changes, (index, change) => {
            if (Utils_String.localeComparer(change.item.serverItem, path) === 0) {
                matchingChange = change;
                return false;
            }
        });
        return matchingChange;
    }

    private _navigateToSelectedTreeItem = (path: string, discussionId?: number, depth?: number): void => {
        let doNavigate = false,
            rawState = this.getRawState(),
            state = this.getState(),
            action = this.getCurrentAction(),
            newState: any = {
                path: null,
                mpath: null,
                opath: null,
                mversion: null,
                oversion: null
            };

        const change: VCLegacyContracts.Change = state.changeList.changes.filter(
            (change: VCLegacyContracts.Change) => {
                return change.item.serverItem === path;
            }
        )[0];

        let itemType: ChangeExplorerItemType;
        if (!change) {
            itemType = ChangeExplorerItemType.Folder;
        } else {
            if (change.item.isFolder) {
                itemType = ChangeExplorerItemType.Folder;
            } else {
                itemType = ChangeExplorerItemType.File;
            }
        }

        let isRootFolder: boolean = false;
        if (path === "/") {
            isRootFolder = true;
        }

        if (state) {
            if (itemType === ChangeExplorerItemType.Folder) {

                if (action !== VersionControlActionIds.Summary && state.path) {
                    doNavigate = true;
                }

                if (isRootFolder) {
                    if (state.path) {
                        doNavigate = true;
                    }
                    newState.path = null;
                }
                else {
                    if (state.path !== path) {
                        doNavigate = true;
                    }
                    newState.path = path;
                }
                action = VersionControlActionIds.Summary;
            }
            else {
                if (state.path !== path) {
                    doNavigate = true;
                }

                newState.path = path;
                if (change && VCOM.ChangeType.isEdit(change.changeType)) {
                    // Edited file - show compare tab
                    if (action !== VersionControlActionIds.Compare) {
                        doNavigate = true;
                    }
                    action = VersionControlActionIds.Compare;
                    newState.opath = path;
                    newState.mpath = path;
                    newState.oversion = state.oversion;
                    newState.mversion = state.version;

                    if (newState.opath !== rawState.opath || newState.mpath !== rawState.mpath ||
                        newState.oversion !== rawState.oversion || newState.mversion !== rawState.mversion) {

                        doNavigate = true;
                    }
                }
                else {
                    // Non-edit files, show the Contents tab
                    if (action !== VersionControlActionIds.Contents) {
                        doNavigate = true;
                    }
                    action = VersionControlActionIds.Contents;
                }
            }

            if (doNavigate) {
                Navigation_Services.getHistoryService().addHistoryPoint(action, newState);
            }
        }
    }

    // This method should be removed during clean up of newFileTree FF.
    private navigateToChangeExplorerItem(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        let doNavigate = false,
            rawState = this.getRawState(),
            state = this.getState(),
            action = this.getCurrentAction(),
            newState: any = {
                path: null,
                mpath: null,
                opath: null,
                mversion: null,
                oversion: null
            };

        if (gridItem && state && gridItem.type !== ChangeExplorerItemType.InformationMessage) {
            if (gridItem.type === ChangeExplorerItemType.Folder) {

                if (action !== VersionControlActionIds.Summary && state.path) {
                    doNavigate = true;
                }

                if (gridItem.isRootFolder) {
                    if (state.path) {
                        doNavigate = true;
                    }
                    newState.path = null;
                }
                else {
                    if (state.path !== gridItem.path) {
                        doNavigate = true;
                    }
                    newState.path = gridItem.path;
                }
                action = VersionControlActionIds.Summary;
            }
            else {
                if (state.path !== gridItem.path) {
                    doNavigate = true;
                }

                newState.path = gridItem.path;
                if (gridItem.change && VCOM.ChangeType.isEdit(gridItem.change.changeType)) {
                    // Edited file - show compare tab
                    if (action !== VersionControlActionIds.Compare) {
                        doNavigate = true;
                    }
                    action = VersionControlActionIds.Compare;
                    newState.opath = gridItem.path;
                    newState.mpath = gridItem.path;
                    newState.oversion = state.oversion;
                    newState.mversion = state.version;

                    if (newState.opath !== rawState.opath || newState.mpath !== rawState.mpath ||
                        newState.oversion !== rawState.oversion || newState.mversion !== rawState.mversion) {

                        doNavigate = true;
                    }
                }
                else {
                    // Non-edit files, show the Contents tab
                    if (action !== VersionControlActionIds.Contents) {
                        doNavigate = true;
                    }
                    action = VersionControlActionIds.Contents;
                }
            }

            if (doNavigate) {
                Navigation_Services.getHistoryService().addHistoryPoint(action, newState);
            }
        }
    }
}

VSS.classExtend(PushView, TFS_Host_TfsContext.TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(PushView, ".versioncontrol-push-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.VersionControl.View.Push", exports);

import * as Utils_String from "VSS/Utils/String";
import * as VSSStore from "VSS/Flux/Store";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { Change, ChangeList, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { LatestVersionSpec, VersionSpec, GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import {
    ActionsHub,
    IChangeListLoadedPayload,
    IChangeListMoreChangesPayload,
} from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { getChangeListWithoutNonEmptyFolders, getChangeListForDisplayMode } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";

const INITIAL_SKIP_COUNT = 1000;

/**
 * ChangeList for change details page.
 */
export class ChangeListStore extends VSSStore.RemoteStore {
    protected _originalChangeList: ChangeList;
    protected _currentChangeList: ChangeList;
    protected _currentChangeListWithoutNonEmptyFolders: ChangeList;
    protected _versionSpec: LatestVersionSpec;
    protected _changeListMoreChangesLoading: boolean;
    protected _loadAllInProgress: boolean;
    protected _isSearchInBranchesDialogLoading: boolean = false;
    private _changeListSkipCount: number = 0;
    private _changeListCountMultiplier: number = 2;
    private _resetSummaryView: boolean;

    constructor(protected _actionsHub: ActionsHub) {
        super();
        this._originalChangeList = null;
        this._currentChangeList = null;
        this._currentChangeListWithoutNonEmptyFolders = null;
        this._resetSummaryView = true;
        this._loadAllInProgress = false;
        this._actionsHub.changeListLoaded.addListener(this._onChangeListLoaded);
        this._actionsHub.changeListMoreChangesLoaded.addListener(this._onChangeListMoreChangesLoaded);
        this._actionsHub.changeListMoreChangesLoading.addListener(this._onChangeListMoreChangesLoading);
        this._actionsHub.changeListMoreChangesLoadFailed.addListener(this._onChangeListMoreChangesLoadFailed);
        this._actionsHub.changeListAutoLoadAllStarted.addListener(this._onChangeListAutoLoadAllStarted);
        this._actionsHub.changeListAutoLoadAllStopped.addListener(this._onChangeListAutoLoadAllStopped);
        this._actionsHub.urlParametersChanged.addListener(this._onUrlParametersChange);
        this._actionsHub.searchInBranchesDialogLoading.addListener(this.onSearchInBranchesDialogStateUpdated);
    }

    public get originalChangeList(): ChangeList {
        return this._originalChangeList;
    }

    public get currentChangeList(): ChangeList {
        return this._currentChangeList;
    }

    public get changeListSkipCount(): number {
        return this._changeListSkipCount;
    }

    public get currentChangeListWithoutNonEmptyFolders(): ChangeList {
        return this._currentChangeListWithoutNonEmptyFolders;
    }

    public get versionSpec(): LatestVersionSpec {
        return this._versionSpec;
    }

    public get hasMoreChanges(): boolean {
        if (this.currentChangeList) {
            return !this.currentChangeList.allChangesIncluded;
        }

        return false;
    }

    public get changeListMoreChangesLoading(): boolean {
        return this._changeListMoreChangesLoading;
    }

    public get resetSummaryView(): boolean {
        return this._resetSummaryView;
    }

    public get loadAllInProgress(): boolean {
        return this._loadAllInProgress;
    }

    public get maxChangesToInclude(): number {
        // Getting the multiplier times the number of result fetched previously,
        // Using skip count to make calculations agnostic to the number of results received
        // As there can be case that few more files are fetched than maxCount when file path is given
        return this._changeListCountMultiplier * this._changeListSkipCount;
    }

    public get maxDiffsToShow(): number {
        return undefined; //  no upper limit for tfvc
    }

    public get downloadedChangesCount(): number {
        if (this._currentChangeList && this._currentChangeList.changes) {
            return this._currentChangeList.changes.length;
        }

        return 0;
    }

    public get changeListTitle(): string {
        if (!this._originalChangeList) {
            return "";
        }

        let title = VCCommentParser.Parser.getChangeListDescription(this._originalChangeList, false);

        const changeList = (this._originalChangeList as TfsChangeList);
        if (changeList.changesetId && changeList.comment) {
            const parsedComment = VCCommentParser.Parser.parseComment(changeList.comment, 0, 1);
            title = Utils_String.format("{0}: {1}", title, parsedComment.text);
        }

        return title;
    }

    public getPreviousVersionSpec(): string {
        const changeList = this.originalChangeList;
        return !changeList ? "" : "P" + changeList.version;
    }

    public get isSearchInBranchesDialogLoading(): boolean {
        return this._isSearchInBranchesDialogLoading;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.changeListLoaded.removeListener(this._onChangeListLoaded);
            this._actionsHub.changeListMoreChangesLoaded.removeListener(this._onChangeListMoreChangesLoaded);
            this._actionsHub.changeListMoreChangesLoading.removeListener(this._onChangeListMoreChangesLoading);
            this._actionsHub.changeListMoreChangesLoadFailed.removeListener(this._onChangeListMoreChangesLoadFailed);
            this._actionsHub.changeListAutoLoadAllStarted.removeListener(this._onChangeListAutoLoadAllStarted);
            this._actionsHub.changeListAutoLoadAllStopped.removeListener(this._onChangeListAutoLoadAllStopped);
            this._actionsHub.urlParametersChanged.removeListener(this._onUrlParametersChange);
            this._actionsHub.searchInBranchesDialogLoading.removeListener(this.onSearchInBranchesDialogStateUpdated);
            this._actionsHub = null;
        }

        this._originalChangeList = null;
        this._currentChangeList = null;
        this._currentChangeListWithoutNonEmptyFolders = null;
        this._versionSpec = null;
    }

    protected _onChangeListAutoLoadAllStarted = (): void => {
        this._resetSummaryView = true;
        this._loadAllInProgress = true;
        this.emitChanged();
    }

    protected _onChangeListAutoLoadAllStopped = (): void => {
        this._loadAllInProgress = false;
        this.emitChanged();
    }

    /**
     * Called when changeList is loaded for the first time.
     */
    protected _onChangeListLoadHandler(payload: IChangeListLoadedPayload): void {
        this._originalChangeList = payload.originalChangeList;
        this._versionSpec = VersionSpec.parse(this._originalChangeList.version);
        this._currentChangeList = this._originalChangeList;
        this._changeListSkipCount = this._getInitialSkipCount();
        this._updateFilteredChangeList();

        this._loading = false;
        this._resetSummaryView = true;
        this.emitChanged();
    }

    protected _updateChangeList(newChangeList: ChangeList): void {
        this._currentChangeList = this._getChangeListWithUniqueChanges(newChangeList);
        this._updateFilteredChangeList();
    }

    protected onSearchInBranchesDialogStateUpdated = (dialogLoading: boolean): void => {
        this._isSearchInBranchesDialogLoading = dialogLoading;
        this.emitChanged();
    }

    private _getChangeListWithUniqueChanges(changeList: ChangeList): ChangeList {
        if (changeList && changeList.changes) {
            let hashMap: { [key: string]: number } = {};
            // Using reduce to get the unique count of changes
            changeList.changes = changeList.changes.filter(function (value: Change) {
                if (!hashMap[value.item.serverItem]) {
                    hashMap[value.item.serverItem] = 1;
                    return true;
                }
                return false;
            });
        }

        return changeList;
    }

    private _onChangeListMoreChangesLoading = (): void => {
        this._changeListMoreChangesLoading = true;
        this._resetSummaryView = true;
        this.emitChanged();
    }

    private _onChangeListLoaded = (payload: IChangeListLoadedPayload) => {
        this._onChangeListLoadHandler(payload);
    }

    /**
     * Called when more changes have been fetched for a changeList.
     */
    private _onChangeListMoreChangesLoaded = (payload: IChangeListMoreChangesPayload): void => {
        const newChangeList = $.extend(true, {}, this._currentChangeList);
        newChangeList.changes = (newChangeList.changes || []).concat(payload.changes);
        newChangeList.allChangesIncluded = payload.allChangesIncluded;

        if (payload.changeCounts) {
            // Clone payload.changeCounts as moreChangeCounts to avoid updating the payload changeCounts.
            const moreChangeCounts = $.extend(true, {}, payload.changeCounts);

            if (newChangeList.changeCounts) {
                $.each(newChangeList.changeCounts, (changeType: number, count: number) => {
                    moreChangeCounts[changeType] = (moreChangeCounts[changeType] || 0) + count;
                });
            }

            newChangeList.changeCounts = moreChangeCounts;
        }
        
        this._changeListSkipCount += payload.changes.length;
        this._updateChangeList(newChangeList);
        this._changeListMoreChangesLoading = false;
        this._resetSummaryView = false;
        this.emitChanged();
    }

    private _onChangeListMoreChangesLoadFailed = (): void => {
        // If there is an error while loading more changes, we have to change the state from loading to loaded.
        // The error message will be displayed in the error notifications pane by the errorRaised action handler.
        if (this._changeListMoreChangesLoading === true) {
            this._changeListMoreChangesLoading = false;
            this._resetSummaryView = true;
            this.emitChanged();
        }
    }

    private _updateFilteredChangeList(): void {
        if (this._versionSpec instanceof GitCommitVersionSpec) {
            this._currentChangeListWithoutNonEmptyFolders = getChangeListForDisplayMode(ChangeExplorerGridDisplayMode.FilesOnly, this._currentChangeList);
        } else {
            this._currentChangeListWithoutNonEmptyFolders = getChangeListWithoutNonEmptyFolders(this._currentChangeList);
        }
    }

    private _getInitialSkipCount(): number {
        if (!!this._currentChangeList && this._currentChangeList.changes) {
            return INITIAL_SKIP_COUNT;
        }
        else {
            return 0;
        }
    }

    private _onUrlParametersChange = (): void => {
        this._resetSummaryView = true;
        this.emitChanged();
    }
}

/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import { autobind } from "OfficeFabric/Utilities";

import * as Controls from "VSS/Controls";
import * as Menus from "VSS/Controls/Menus";
import { NavigationLink } from "VSS/Controls/Navigation";
import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";
import * as PopupContent from "VSS/Controls/PopupContent";
import { HubsService } from "VSS/Navigation/HubsService";
import { getHistoryService } from "VSS/Navigation/Services";
import * as  Service from "VSS/Service";
import { subtract, remove } from "VSS/Utils/Array";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { domElem, Positioning } from "VSS/Utils/UI";

import { DiscussionThread, DiscussionThreadsUpdateEvent } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionManager, DiscussionThreadControlManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { VersionSpec, PreviousVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { compareFolderPaths, doesFilterMatchFile } from "VersionControl/Scripts/Utils/DiffSummaryUtils";
import * as MenuItemUtils from "VersionControl/Scripts/Utils/MenuItemUtils";

import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { Filter, summaryFilterEquals } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { BuiltInDiffViewer } from "VersionControl/Scripts/Controls/DiffBuiltInDiffViewer";
import { DiffItemsImageData } from "VersionControl/Scripts/Controls/DiffViewer";
import * as VCVersionControlDiscussionThreadControl from "VersionControl/Scripts/Controls/VersionControlDiscussionThreadControl";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

interface QueuedFetchDiffInfo {
    change: any;
    $container: JQuery;
}

interface ImageDimensions {
    [fileName: string]: ImageDimension;
}

interface ImageDimension {
    origAdded?: boolean;
    modAdded?: boolean;
    leftWidth?: number;
    rightWidth?: number;
    leftHeight?: number;
    rightHeight?: number;
}

export interface Folder {
    name: string;
    items: FolderItem[];
    folderEntry: VCLegacyContracts.Change;
}

export interface FolderItem {
    name: string;
    entry: VCLegacyContracts.Change;
    index: number;
}

const actionMenuItemIds = {
    changeDiffOrientation: "diff-orientation",
    addFileDiscussion: "add-file-discussion",
    showComments: "show-comments",
}

export class FilesSummaryControl extends Controls.BaseControl {

    private static MIN_REQUESTED_BY_DEFAULT = 8;
    private static MAX_SIMULTANEOUS_FETCH_DIFF_CALLS = 2;
    private static MAX_QUEUED_FETCH_DIFF_CALLS = 20;
    private static VIEWABLE_THRESHOLD_IN_PIXELS = 200;
    private static MAX_CLIENT_SORTING_THRESHOLD = 1000;

    // protected members
    public _repositoryContext: RepositoryContext;
    public _changeListModel: VCLegacyContracts.ChangeList;
    public _allChanges: VCLegacyContracts.Change[];
    public _oversion: string;
    public _mversion: string;
    public _changeCtxMenu: Menus.PopupMenu;

    private _diffOrientation: VCWebAccessContracts.DiffViewerOrientation;
    private _displayMode: VCWebAccessContracts.ChangeExplorerGridDisplayMode;
    private _diffViewers: BuiltInDiffViewer[];
    private _$filesSummary: JQuery;
    private _$moreChangesSection: JQuery;
    private _$filesContainer: JQuery;
    private _$filesScrollContainer: JQuery;
    private _$diffSummaryHeader: JQuery;
    private _actionsMenu: Menus.Toolbar;
    private _queuedDiffFetchInfos: QueuedFetchDiffInfo[];
    private _outstandingFetchDiffCalls: QueuedFetchDiffInfo[];
    public _discussionManager: DiscussionManager;
    private _discussionThreadControlManager: DiscussionThreadControlManager;
    private _discussionUpdatedListener: any;
    private _$artifactLevelDiscussionsContainer: JQuery;
    private _$otherDiscussionsContainer: JQuery;
    private _$otherDiscussionsHeader: JQuery;
    private _$otherDiscussionsContents: JQuery;
    private _artifactThreadControls: any[];
    private _activeState: boolean;
    private _imageDimensions: ImageDimensions;
    private _currentFilter: Filter;
    private _additionalMenuItemsCallBack: () => Menus.IMenuItemSpec[];
    private _additionalMenuItems: Menus.IMenuItemSpec[];
    private _emptyGitCommitMessageControl: MessageAreaControl;
    private _navigationLinks: NavigationLink[];
    private _delayAnnounceHelper: DelayAnnounceHelper;
    private _maxChangesToBeShown: number;
    private _hideArtifactLevelDiscussion: boolean;

    // folder items indexed by path
    private _currentGroups: IDictionaryStringTo<Folder>;

       private _allowHideComments: boolean = true;

    public initialize() {
        super.initialize();

        this._diffOrientation = VCWebAccessContracts.DiffViewerOrientation.Inline;
        this._displayMode = VCWebAccessContracts.ChangeExplorerGridDisplayMode.FullTree;
        this._diffViewers = [];
        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);
        this._activeState = true;
        this._imageDimensions = <ImageDimensions>{};

        this._additionalMenuItemsCallBack = this._options.additionalMenuItems;
        if (this._options.additionalMenuItems) {
            this._additionalMenuItems = this._options.additionalMenuItems();
        }

         // Do not use if filtering (by path) is used
         // filtering logic only filters from files rendered
         // setting a maximum count will not render some files, and they will not come in filtered results
        this._maxChangesToBeShown = this._options.maxChangesCount || Number.MAX_VALUE;
        this._hideArtifactLevelDiscussion = this._options.hideArtifactLevelDiscussions;

        this._discussionThreadControlManager = new DiscussionThreadControlManager(this._options.tfsContext);
        this._delayAnnounceHelper = new DelayAnnounceHelper();
    }

    public _dispose() {

        if (this._artifactThreadControls) {
            this._artifactThreadControls.forEach(artifactControl => artifactControl.dispose());
            this._artifactThreadControls = null;
        }

        if (this._diffViewers) {
            this._diffViewers.forEach(viewer => viewer.dispose());
            this._diffViewers = null;
        }

        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            this._discussionManager = null;
        }

        if (this._discussionThreadControlManager) {
            this._discussionThreadControlManager.dispose();
            this._discussionThreadControlManager = null;
        }

        if (this._actionsMenu) {
            this._actionsMenu.dispose();
            this._actionsMenu = null;
        }

        if (this._emptyGitCommitMessageControl) {
            this._emptyGitCommitMessageControl.dispose();
            this._emptyGitCommitMessageControl = null;
        }

        if (this._navigationLinks) {
            this._navigationLinks.forEach((navigationLink: NavigationLink) => {
                navigationLink.dispose();
            });
            this._navigationLinks = null;
        }

        if (this._options.additionalMenuItems) {
            this._options.additionalMenuItems = null;
        }

        if (this._additionalMenuItemsCallBack) {
            this._additionalMenuItemsCallBack = null;
        }

        if (this._additionalMenuItems) {
            this._additionalMenuItems = null;
        }

        if (this._delayAnnounceHelper) {
            this._delayAnnounceHelper.stopAndCancelAnnounce('');
            this._delayAnnounceHelper = null;
        }

        if (this._$filesScrollContainer) {
            this._$filesScrollContainer.unbind("scroll.tfs-files-container");
        }
        $(window).unbind("resize.tfs-files-container");

        super._dispose();
    }

    public setActiveState(active: boolean, skipUpdateView?: boolean) {
        this._activeState = active;
        $.each(this._diffViewers, (i: number, diffViewer: BuiltInDiffViewer) => {
            diffViewer.setActiveState(active, skipUpdateView);
            if (active) {
                diffViewer.updateLayout();
            }
        });
    }

    public setModel(
        repositoryContext: RepositoryContext,
        changeModel: VCLegacyContracts.ChangeList,
        oversion?: string,
        mversion?: string,
        filter?: Filter,
        orientation?: VCWebAccessContracts.DiffViewerOrientation,
        displayMode?: VCWebAccessContracts.ChangeExplorerGridDisplayMode) {
        /// <summary>
        /// Set the current change list model
        /// </summary>
        /// <param name="repository" type="Object">Repository that contains the change model</param>
        /// <param name="changeModel" type="Object">Model representing the change list to display</param>

        this._element.empty();

        this._repositoryContext = repositoryContext;
        this._changeListModel = changeModel;
        this._oversion = oversion;
        this._mversion = mversion;
        this._displayMode = displayMode;

        this._queuedDiffFetchInfos = [];
        this._outstandingFetchDiffCalls = [];
        this._diffViewers = [];
        this._$diffSummaryHeader = null;

        this._currentFilter = filter;
        this._currentGroups = {};

        if (!changeModel) {
            // No selected change list - don't draw anything
            return;
        }

        this._$moreChangesSection = $(domElem("div", "vc-more-changes-warning")).appendTo(this._element);
        this._updateShowMoreChangesSection();

        this._$filesSummary = $(domElem("div", "vc-change-summary-files")).appendTo(this._element);
        if (orientation) {
            this._diffOrientation = orientation
            this._populateFilesSummary();
        } else {
            this._repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
                this._diffOrientation = preferences.summaryDiffOrientation;
                this._populateFilesSummary();
            });
        }
    }

    public setAllowHideComments(allowHideComments: boolean = true) {
        this._allowHideComments = allowHideComments;
        this._updateMenuItems();
    }

    public getCurrentFilter(): Filter {
        return this._currentFilter;
    }

    public getCurrentChangeModel(): VCLegacyContracts.ChangeList {
        return this._changeListModel;
    }

    public getCurrentDisplayMode(): VCWebAccessContracts.ChangeExplorerGridDisplayMode {
        return this._displayMode;
    }

    public setFilter(filter: Filter) {

        if (summaryFilterEquals(filter, this._currentFilter)) {
            // no change
            return;
        }

        this._currentFilter = filter;
        this.applyFilter(filter);
        this._updateMenuItems();
        this._fetchDiffsForViewableChanges();
    }

    public hideMoreChangesSection(): void {
        this._$moreChangesSection.hide();
    }

    private applyFilter(filter: Filter) {

        let filterPath: string,
            filteredChanges: VCLegacyContracts.Change[];

        if (this._$filesContainer) {
            if (filter && filter.path) {

                filterPath = filter.path;
                if (filterPath[filterPath.length - 1] !== "/") {
                    filterPath = filterPath + "/";
                }

                filteredChanges = [];

                $.each(this._$filesContainer.find(".file-container"), (i: number, fileContainer: HTMLElement) => {
                    let $fileContainer = $(fileContainer),
                        changeEntry = this._allChanges[$fileContainer.data("changeIndex")],
                        matchesPath: boolean;

                    if (changeEntry) {
                        // recursive (show files in subfolders) if not part of a group
                        const recursive: boolean = filter.recursive || !this._currentGroups[filter.path];
                        matchesPath = doesFilterMatchFile(
                            this._repositoryContext,
                            filterPath,
                            changeEntry.item.serverItem,
                            recursive);

                        $fileContainer.toggle(matchesPath);
                        if (matchesPath) {
                            filteredChanges.push(changeEntry);
                            $fileContainer.data("hiddenByFilter", false);
                        } else {
                            $fileContainer.data("hiddenByFilter", true);
                        }
                    }
                });

                this._updateShowingSummary(filteredChanges, filterPath);

                if (this._$artifactLevelDiscussionsContainer) {
                    this._$artifactLevelDiscussionsContainer.hide();
                    this._$otherDiscussionsContainer.hide();
                }
            }
            else {
                this._$filesContainer.find(".file-container").data("hiddenByFilter", false);
                this._$filesContainer.find(".file-container").show();

                this._updateShowingSummary(this._allChanges);

                if (this._$artifactLevelDiscussionsContainer) {
                    this._$artifactLevelDiscussionsContainer.show();
                    this._$otherDiscussionsContainer.show();
                }
            }
        }
    }

    private _updateShowMoreChangesSection() {
        let messageFormat: string;

        if (!this._changeListModel || this._changeListModel.allChangesIncluded) {
            this._$moreChangesSection.hide();
        }
        else {
            this._$moreChangesSection.empty();

            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                messageFormat = VCResources.CommitMoreItemsMessage;
            }
            else {
                messageFormat = (<VCLegacyContracts.TfsChangeList>this._changeListModel).isShelveset ? VCResources.ShelvesetMoreItemsMessage : VCResources.ChangesetMoreItemsMessage;
            }

            $(domElem("span")).text(Utils_String.format(messageFormat, this._changeListModel.changes.length)).appendTo(this._$moreChangesSection);

            $(domElem("a", "more-changes-link"))
                .text(VCResources.ClickForMoreChangesText)
                .click(delegate(this, this._onMoreChangesClick))
                .appendTo($(domElem("span")).appendTo(this._$moreChangesSection));

            this._$moreChangesSection.show();
        }
    }

    public _onMoreChangesClick() {
        // Double the number of changes (fetch at least 1000 items)
        const maxChanges = Math.max(1000, 2 * this._changeListModel.changes.length);
        const historySvc = getHistoryService();
        const gitDiffParentAction = this._getGitDiffParentAction(historySvc.getCurrentState());
        historySvc.addHistoryPoint(gitDiffParentAction || VersionControlActionIds.Summary, { maxChanges: maxChanges });
    }

    public getFileGroups(changes: VCLegacyContracts.Change[], folderChangesByPath: IDictionaryStringTo<VCLegacyContracts.Change>): Folder[] {
        const groups: Folder[] = [];
        this._currentGroups = {};

        if (!changes || !changes.length) {
            return groups;
        }

        changes.forEach((historyEntry, historyEntryIndex) => {
            const folderName: string = historyEntry.item.isFolder ? historyEntry.item.serverItem : VersionControlPath.getFolderName(historyEntry.item.serverItem);
            const fileName: string = historyEntry.item.isFolder ? null : VersionControlPath.getFileName(historyEntry.item.serverItem);

            let group: Folder = this._currentGroups[folderName];
            if (!group) {
                group = {
                    name: folderName,
                    items: [],
                    folderEntry: folderChangesByPath[folderName]
                };
                this._currentGroups[folderName] = group;
            }

            if (historyEntry.item.isFolder) {
                group.folderEntry = historyEntry;
            }
            else {
                group.items.push({
                    name: fileName,
                    entry: historyEntry,
                    index: historyEntryIndex,
                });
            }
        });

        // convert groups hash to array and sort files within each folder
        Object.keys(this._currentGroups).forEach(folderName => {
            const folder: Folder = this._currentGroups[folderName];

            if (folder.items && folder.items.length <= FilesSummaryControl.MAX_CLIENT_SORTING_THRESHOLD) {
                folder.items.sort((item1, item2) => {
                    return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
                });
            }

            groups.push(folder);
        });

        // sort the folders
        if (groups.length <= FilesSummaryControl.MAX_CLIENT_SORTING_THRESHOLD) {
            groups.sort((group1, group2) => compareFolderPaths(group1.name, group2.name));
        }

        return groups;
    }

    private _populateFilesSummary() {

        const folderChangesByPath: IDictionaryStringTo<VCLegacyContracts.Change> = {};
        let groups: Folder[];
        let $sectionHeader: JQuery;
        let $sectionContent: JQuery;
        const $filesSummary = this._$filesSummary;

        $filesSummary.empty();
        this._diffViewers = [];

        if (!this._changeListModel || !this._changeListModel.changes) {
            // No changes
            return;
        }

        // Filter out changes that we don't want to include
        this._allChanges = $.grep(this._changeListModel.changes, (change, i) => {

            // Skip source-rename entries (would otherwise show up as delete's). 
            if (ChangeType.isSourceRenameDelete(change.changeType)) {
                return false;
            }

            // Don't include folder entries for git. We show folder entries in TFS since
            // you can have folder-only changes (like add a folder with no content). In git,
            // there are no empty folders, so a change to a folder will always carry one or
            // more child files that goes with it.
            if (change.item.isFolder) {

                folderChangesByPath[change.item.serverItem] = change;

                if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    return false;
                }
            }

            return true;
        });

        groups = this.getFileGroups(this._allChanges, folderChangesByPath);

        $sectionHeader = $(domElem("div", "changed-files-summary-header"));

        const elements = [];

        if (groups.length === 0) {
            $sectionContent = this.getEmptyResultContainer();
            this._$artifactLevelDiscussionsContainer = $(domElem("div", "artifact-level-discussion-container")).appendTo($sectionContent);
            this._$otherDiscussionsContainer = $(domElem("div", "other-discussions-container")).appendTo($sectionContent);
        }
        else {
            this._$diffSummaryHeader = $(domElem("div", "diff-showing-summary")).appendTo($sectionHeader);
            this._updateShowingSummary(this._allChanges);

            const $diffSummaryViewerToolbar = $(domElem("div", "changed-files-summary-toolbar toolbar"))
                .appendTo($sectionHeader);
            this._actionsMenu = <Menus.Toolbar>Controls.BaseControl.create(
                Menus.Toolbar,
                $diffSummaryViewerToolbar,
                {
                    items: [],
                    cssClass: "actions-menu"
                },
                {
                    ariaAttributes: {
                        label: VCResources.DiffSummaryToolbarAriaLabel
                    }
                });

            // Add menu items after the diff orientation menu
            this._updateMenuItems();

            this._$filesContainer = $(domElem("div", "files-container"));
            $sectionContent = this._$filesContainer;

            this._$artifactLevelDiscussionsContainer = $(domElem("div", "artifact-level-discussion-container")).appendTo(this._$filesContainer);
            this._$otherDiscussionsContainer = $(domElem("div", "other-discussions-container")).appendTo(this._$filesContainer);

            if (this._discussionManager) {
                const discussionThreads = this._discussionManager.getCurrentThreadsForItemPath(null);
                $.each(discussionThreads, (index, thread: DiscussionThread) => {
                    this._addArtifactLevelThread(thread);
                });
            }

            let idx = 0;

            $.each(groups, (groupIndex, group) => {
                if (idx >= this._maxChangesToBeShown) {
                    return false;
                }

                $.each(group.items, (i, changeEntry) => {

                    if (idx >= this._maxChangesToBeShown) {
                        return false;
                    }

                    // note that we use a string here
                    // so we can build a lot of elements quickly
                    elements[idx++] =
                        `<div class="file-container" data-change-index='` + changeEntry.index + `'>
                            <div class="file-row">
                                <div class="file-icon bowtie-icon"></div>
                                <div class="file-cell">
                                    <div class="file-name"></div>
                                    <div class="file-path"></div>
                                </div>
                            </div>
                            <div class="item-details">
                                <div class="loading-container">
                                    <span class="big-status-progress"></span>
                                    <span class="loading-message">` + VCResources.LoadingText + `</span>
                                </div>
                            </div>
                        </div>`;
                });
            });
        }

        $filesSummary.append($sectionHeader);
        $filesSummary.append($sectionContent);

        if (elements.length > 0) {
            // if there are files we should append them after the headers
            this._$filesContainer.append(elements.join(""));
        }

        // apply filter first to prevent unnecessary drawing/fetching
        if (this._currentFilter) {
            this.applyFilter(this._currentFilter);
        }

        if (this._$filesContainer) {
            this._$filesScrollContainer = Positioning.getVerticalScrollContainer(this._$filesContainer);
            this._$filesScrollContainer.unbind("scroll.tfs-files-container");
            $(window).unbind("resize.tfs-files-container");

            this._$filesScrollContainer.bind("scroll.tfs-files-container", delegate(this, this._handleResize));
            $(window).bind("resize.tfs-files-container", delegate(this, this._handleResize));
            this._fetchDiffsForViewableChanges();
        }
    }

    private _createFileRow(changeEntry: any, changeIndex: number, currentState: any): JQuery {
        let $fileCell: JQuery;
        let $fileNameCell: JQuery;
        let $expandedContentRow: JQuery;
        let $expandedContent: JQuery;
        let changeText: string;
        let fileNameText: string;
        let $item: JQuery;
        let folderName: string;
        let fullPath: string;
        let hasDetails: boolean;
        let isRename: boolean;
        let isBranch: boolean;
        let fileExtension: string;

        // Get file name, folder path, and create full path
        fileNameText = VersionControlPath.getFileName(changeEntry.item.serverItem);
        folderName = VersionControlPath.getFolderName(changeEntry.item.serverItem);
        fullPath = VersionControlPath.combinePaths(folderName, fileNameText);

        changeText = ChangeType.getDisplayText(changeEntry.changeType);

        const $itemContainer = $(domElem("div", "file-container"));
        $itemContainer.data("changeEntry", changeEntry);
        $itemContainer.data("changeIndex", changeIndex);

        // Listen to event from image diff to show the image dimensions
        $itemContainer.bind("image-dimensions-calculated", $itemContainer, delegate(this, this._imageDimensionsHandler));

        $item = $(domElem("div", "file-row")).appendTo($itemContainer);

        isRename = (changeEntry.sourceServerItem && ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Rename)) ? true : false;
        isBranch = (changeEntry.sourceServerItem && ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Branch)) ? true : false;
        hasDetails = !changeEntry.item.isFolder &&
            (ChangeType.isEdit(changeEntry.changeType) ||
                isRename ||
                isBranch ||
                ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Add) ||
                ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Delete) ||
                ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Undelete));

        const icon = VCFileIconPicker.getIconNameForFile(fullPath);
        $(domElem("div", "file-icon bowtie-icon " + icon)).appendTo($item);

        $fileCell = $(domElem("div", "file-cell")).appendTo($item);

        $fileNameCell = $(domElem("div", "file-name")).appendTo($fileCell);

        if (!changeEntry.item.isFolder) {
            this._createFileLink($fileNameCell, changeEntry, fileNameText, currentState);
        }
        else {
            $fileNameCell.text(fileNameText || "");
        }

        fileNameText = Utils_String.htmlEncode(changeEntry.item.serverItem);
        if (changeText) {
            fileNameText += " [" + changeText + "]";
        }
        const $fileLink = $fileNameCell.children("a");
        if ($fileLink && $fileLink.length > 0) {
            $fileLink.data("filename", fileNameText || "");
            const fileNameDescriptionClassName = "filename-description";
            const fileNameDescriptionElementId = fileNameDescriptionClassName + "-" + Controls.getId();
            $(domElem("div", fileNameDescriptionClassName + " hidden"))
                .attr("id", fileNameDescriptionElementId)
                .text(Utils_String.format(
                    VCResources.DiffFileNameAriaDescription,
                    changeText || ""))
                .appendTo($fileNameCell);

            $fileLink.attr("aria-describedby", fileNameDescriptionElementId);
            $fileLink.attr("aria-label", Utils_String.format(
                VCResources.DiffFileNameLinkAriaLabel,
                Utils_String.htmlEncode(changeEntry.item.serverItem || "")));
        }
        this._imageDimensions[fileNameText] = {};

        const $filePathDiv = $(domElem("div", "file-path"))
            .appendTo($fileCell)
            .text(fullPath);
        PopupContent.RichContentTooltip.add(fullPath, $filePathDiv);

        if (hasDetails) {
            $expandedContentRow = $(domElem("div", "item-details")).appendTo($itemContainer);

            if (isRename) {
                const $itemDetailsHeaderDiv = $(domElem("div", "item-details-header"))
                    .text(Utils_String.format(VCResources.RenamedFromFormat, changeEntry.sourceServerItem))
                    .appendTo($expandedContentRow);
                PopupContent.RichContentTooltip.add(
                    Utils_String.format(VCResources.RenamedFromFormat, changeEntry.sourceServerItem),
                    $itemDetailsHeaderDiv);
            }

            // Insert loading icon
            const $loadingContainer = $(domElem("div", "loading-container"))
                .appendTo($(domElem("div", "item-details-body")).appendTo($expandedContentRow));

            $(domElem("span", "big-status-progress")).appendTo($loadingContainer);
            $(domElem("span", "loading-message")).text(VCResources.LoadingText).appendTo($loadingContainer);

            $itemContainer.data("fetching-diff", false);
        }

        return $itemContainer;
    }

    public getEmptyResultContainer(): JQuery {
        const $emptyResult = $(domElem("div", "no-changes-message"));
        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
            const gitChangeList = <VCLegacyContracts.GitCommit>this._changeListModel;
            this._emptyGitCommitMessageControl = Controls.BaseControl.createIn(MessageAreaControl, $emptyResult, {
                closeable: false,
                message: {
                    type: MessageAreaType.Info,
                    header: this._getEmptyGitCommitMessage(gitChangeList)
                }
            }) as MessageAreaControl;
        }

        return $emptyResult;
    }

    /** Returns the JQuery with links for diffing the parents of a Git merge commit, if applicable */
    private _getEmptyGitCommitMessage(gitCommit: VCLegacyContracts.GitCommit): JQuery {
        const $emptyGitCommitMessage = $(domElem("span"));

        if (gitCommit.parents && gitCommit.parents.length > 1) {
            const currentState = getHistoryService().getCurrentState() || {};

            $emptyGitCommitMessage.append(VCResources.NoUniqueChangeInMergeCommitMsgFormat);
            const parentsCount = gitCommit.parents.length;
            $.each(gitCommit.parents, (index: number, parent: VCLegacyContracts.GitObjectReference) => {
                $emptyGitCommitMessage.append(this._getDiffParentJQuery(currentState, gitCommit, index + 1));
                if ((index + 1) < parentsCount) {
                    $emptyGitCommitMessage.append(" | ");
                }
            });
        }
        else {
            const innerHtml = this._options.noChangesMessage || VCResources.NoChangesInCommitMessage;
            $emptyGitCommitMessage.append(innerHtml);
        }

        return $emptyGitCommitMessage;
    }

    /** Returns the JQuery link to view the summary page of the Git merge commit diffed with the specified parent index */
    private _getDiffParentJQuery(currentState: any, gitCommit: VCLegacyContracts.GitCommit, index: number): JQuery {
        const linkHref = this._getDiffParentUrl(currentState, gitCommit, index);

        return $(domElem("a"))
            .attr("href", linkHref)
            .text(Utils_String.format(VCResources.DiffParentCommitTitleFormat, index, gitCommit.parents[index - 1].objectId.short))
            .click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.historyHub, linkHref));
    }

    /** Returns the URL to view the summary page of the Git merge commit diffed with the specified parent index */
    private _getDiffParentUrl(currentState: any, gitCommit: VCLegacyContracts.GitCommit, index: number): string {
        const stateParams: any = {
            action: VersionControlActionIds.DiffParent + index
        };
        if (currentState.fullScreen) {
            stateParams.fullScreen = currentState.fullScreen;
        }
        return VersionControlUrls.getChangeListUrl(this._repositoryContext, gitCommit, true, null, stateParams);
    }

    private _imageDimensionsHandler(event: JQueryEventObject, data: DiffItemsImageData) {
        let $itemContainer: JQuery = event.data,
            $linkDiv: JQuery = $itemContainer.find(".file-cell .file-name a"),
            filename: string = $linkDiv.data("filename"),
            origDimensions: string,
            modDimensions: string,
            $dimSpan: JQuery,
            $expandedContentRow: JQuery;

        if (data.leftWidth) {
            this._imageDimensions[filename].leftWidth = data.leftWidth;
        }
        if (data.leftHeight) {
            this._imageDimensions[filename].leftHeight = data.leftHeight;
        }
        if (data.rightWidth) {
            this._imageDimensions[filename].rightWidth = data.rightWidth;
        }
        if (data.rightHeight) {
            this._imageDimensions[filename].rightHeight = data.rightHeight;
        }
        if (this._imageDimensions[filename].rightWidth && this._imageDimensions[filename].rightHeight) {
            // Always show modified image dimensions after the file link
            if (this._imageDimensions[filename].modAdded !== true) {
                modDimensions = Utils_String.format(
                    VCResources.ImageDimensions,
                    this._imageDimensions[filename].rightWidth,
                    this._imageDimensions[filename].rightHeight);
                $dimSpan = $(domElem("span", "image-dimensions")).text(modDimensions).insertAfter($linkDiv);
                PopupContent.RichContentTooltip.add(modDimensions, $dimSpan);
                this._imageDimensions[filename].modAdded = true;
            }

            if (this._imageDimensions[filename].origAdded !== true &&
                this._imageDimensions[filename].leftWidth &&
                this._imageDimensions[filename].leftHeight &&
                (this._imageDimensions[filename].leftWidth !== this._imageDimensions[filename].rightWidth ||
                    this._imageDimensions[filename].leftHeight !== this._imageDimensions[filename].rightHeight)) {
                // Dimensions are different. Show modified image dimensions on main row, original dimensions below
                $expandedContentRow = $(domElem("div", "item-details")).appendTo($itemContainer.find(".file-row"));
                origDimensions = Utils_String.format(
                    VCResources.OriginalImageDimensions,
                    this._imageDimensions[filename].leftWidth,
                    this._imageDimensions[filename].leftHeight);
                const $itemDetailsHeader = $(domElem("div", "item-details-header"))
                    .text(origDimensions)
                    .appendTo($expandedContentRow);
                PopupContent.RichContentTooltip.add(origDimensions, $itemDetailsHeader);
                this._imageDimensions[filename].origAdded = true;
            }
        }
    }

    public _createFileLink($container: JQuery, changeEntry: VCLegacyContracts.Change, linkText: string, initialState: any) {
        const diffParent = this._getGitDiffParentAction(initialState);

        const navigationLink = Controls.BaseControl.createIn(NavigationLink, $container, {
            cssClass: "file-name-link",
            text: linkText,
            initialState: initialState,
            state: {
                action: ChangeType.isEdit(changeEntry.changeType) ? VersionControlActionIds.Compare : VersionControlActionIds.Contents,
                path: changeEntry.item.serverItem,
                oversion: ChangeType.isEdit(changeEntry.changeType) ? this._oversion : undefined,
                diffParent: diffParent
            }
        }) as NavigationLink;

        if (!this._navigationLinks) {
            this._navigationLinks = [];
        }
        this._navigationLinks.push(navigationLink);
    }

    /** For a Git merge commit, we may be diffing against a particular parent, so we need to propogate that action in state information. */
    private _getGitDiffParentAction(state: any): string {
        return ((state.action || "").indexOf(VersionControlActionIds.DiffParent) === 0) ? state.action : null;
    }

    private _handleResize() {
        this.delayExecute("resizeHandler", 200, true, () => {
            this._fetchDiffsForViewableChanges();
        });
    }

    public handleSelectionChange() {
        this._fetchDiffsForViewableChanges();
    }

    private _changeDiffViewerOrientation(): void {
        const newDiffOrientation = (this._diffOrientation === VCWebAccessContracts.DiffViewerOrientation.Inline) ?
            VCWebAccessContracts.DiffViewerOrientation.SideBySide :
            VCWebAccessContracts.DiffViewerOrientation.Inline;

        if (newDiffOrientation !== this._diffOrientation) {
            if (newDiffOrientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
                if (this._options.customerIntelligenceData) {
                    this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTSUMMARY_FILES_INLINE_DIFF, false);
                }
            }
            else {
                if (this._options.customerIntelligenceData) {
                    this._options.customerIntelligenceData.publish(CustomerIntelligenceConstants.CHANGELISTSUMMARY_FILES_SIDE_BY_SIDE_DIFF, false);
                }
            }
            this._diffOrientation = newDiffOrientation;
            this._repositoryContext.getClient().beginGetUserPreferences((preferences) => {
                preferences.summaryDiffOrientation = this._diffOrientation;
                this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);
            });
            this._updateMenuItems();

            $.each(this._diffViewers, (i: number, diffViewer: BuiltInDiffViewer) => {
                diffViewer.setOrientation(this._diffOrientation, true);
            });

            if (this._options && this._options.orientationChangeCallback) {
                this._options.orientationChangeCallback(this._diffOrientation);
            }

            // retain focus on diff orientation menu item
            this._focusActionMenuItemById(actionMenuItemIds.changeDiffOrientation);
        }
    }

    public refreshChangedFiles() {
        this._updateShowMoreChangesSection();
        this._populateFilesSummary();
    }

    public setDiscussionManager(discussionManager: DiscussionManager, redraw?: boolean) {
        if (this._discussionManager !== discussionManager && (discussionManager || this._discussionManager)) {
            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManager = discussionManager;
            if (discussionManager) {
                this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionThreadControlManager.setDiscussionManager(this._discussionManager);
            if (this._diffViewers && redraw) {
                $.each(this._diffViewers, (i: number, diffViewer: BuiltInDiffViewer) => {
                    diffViewer.setDiscussionManager(discussionManager, true);
                });
            }
        }
        else if (redraw && discussionManager) {
            // No change but redraw requested. Make sure discussion threads are up to date
            if (this._diffViewers) {
                $.each(this._diffViewers, (i: number, diffViewer: BuiltInDiffViewer) => {
                    diffViewer.updateDiscussionThreads();
                });
            }
        }
    }

    private onDiscussionCommentsUpdated(sender: DiscussionManager, eventData: DiscussionThreadsUpdateEvent) {
        const filteredEventData = sender.filterEventData(eventData, null);

        if (filteredEventData.currentThreads) {
            if (this._artifactThreadControls) {
                this._$artifactLevelDiscussionsContainer.empty();
                this._$otherDiscussionsContainer.empty();
                this._$otherDiscussionsHeader = null;
                this._$otherDiscussionsContents = null;
                $.each(this._artifactThreadControls, (i: number, threadControl: any) => {
                    threadControl.dispose();
                });
            }
            $.each(filteredEventData.currentThreads, (index, thread) => {
                this._addArtifactLevelThread(thread);
            });
        }
        else if (filteredEventData.newThreads) {
            $.each(filteredEventData.newThreads, (index, newThread: DiscussionThread) => {
                this._addArtifactLevelThread(newThread, index === 0);
            });
        }

        if (eventData.currentThreads ||
            (eventData.deletedThreads && eventData.deletedThreads.length) ||
            (eventData.newThreads && eventData.newThreads.length)) {

            // Update the state of the comments show/hide menu item
            this._updateMenuItems();
        }
    }

    private _addArtifactLevelThread(thread: DiscussionThread, focus?: boolean) {
        if (this._hideArtifactLevelDiscussion) {
            return;
        }

        let threadControl = null;
        if (thread.isDeleted) {
            return;
        }

        threadControl = new VCVersionControlDiscussionThreadControl.VersionControlDiscussionThreadControlReact($(domElem("div")).appendTo(this._$artifactLevelDiscussionsContainer), thread);

        if (!this._artifactThreadControls) {
            this._artifactThreadControls = [];
        }
        this._artifactThreadControls.push(threadControl);
    }

    private _queueFetchDiffs(changes: QueuedFetchDiffInfo[], moveToTop: boolean) {

        let queuePosition;

        // Remove the items already being fetched
        changes = subtract(changes, this._outstandingFetchDiffCalls, (item1, item2) => {
            return item1.change === item2.change ? 0 : -1;
        });

        if (moveToTop) {
            ;
            this._queuedDiffFetchInfos = changes.concat(<QueuedFetchDiffInfo[]>subtract(this._queuedDiffFetchInfos, changes, (item1, item2) => {
                return item1.change === item2.change ? 0 : -1;
            }));
        }
        else {
            this._queuedDiffFetchInfos.concat(<QueuedFetchDiffInfo[]>subtract(changes, this._queuedDiffFetchInfos, (item1, item2) => {
                return item1.change === item2.change ? 0 : -1;
            }));
        }

        if (this._queuedDiffFetchInfos.length >= FilesSummaryControl.MAX_QUEUED_FETCH_DIFF_CALLS) {
            this._queuedDiffFetchInfos = this._queuedDiffFetchInfos.splice(0, FilesSummaryControl.MAX_QUEUED_FETCH_DIFF_CALLS);
        }
    }

    private _processFetchDiffQueue() {

        let fetchInfo: QueuedFetchDiffInfo,
            $detailsContainer: JQuery;

        while (this._outstandingFetchDiffCalls.length < FilesSummaryControl.MAX_SIMULTANEOUS_FETCH_DIFF_CALLS && this._queuedDiffFetchInfos.length > 0) {

            fetchInfo = this._queuedDiffFetchInfos.splice(0, 1)[0];
            this._outstandingFetchDiffCalls.push(fetchInfo);

            this._fetchDiff(fetchInfo);
        }
    }

    private _fetchDiff(fetchInfo) {

        let diffViewer: BuiltInDiffViewer,
            $detailsContainer: JQuery,
            originalPath: string,
            modifiedPath: string,
            originalVersion = this._oversion,
            originalVersionSpec: VersionSpec,
            changeType: number,
            skipDiff: boolean,
            handleDiffComplete: any;

        fetchInfo.$container.data("fetching-diff", true);

        $detailsContainer = fetchInfo.$container.find(".item-details-body");
        $detailsContainer.empty();
        const $summaryRow: JQuery = fetchInfo.$container.find(".file-name");

        changeType = fetchInfo.change.changeType;
        skipDiff = !ChangeType.isEdit(changeType) &&
        !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Add) &&
        !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Delete) &&
        !ChangeType.hasChangeFlag(changeType, VCLegacyContracts.VersionControlChangeType.Undelete);

        diffViewer = <BuiltInDiffViewer>Controls.BaseControl.createIn(BuiltInDiffViewer, $detailsContainer, {
            tfsContext: this._options.tfsContext,
            partialDiff: true,
            fixedSize: false,
            orientation: this._diffOrientation,
            discussionThreadControlManager: this._discussionThreadControlManager,
            supportCommentStatus: this._options.supportCommentStatus,
            contentTruncatedMessage: this._options.contentTruncatedMessage,
            $summaryRow: $summaryRow
        });
        diffViewer.setDiscussionManager(this._discussionManager, false);
        diffViewer.setActiveState(this._activeState, true);

        fetchInfo.$container.data("diff-viewer", diffViewer);

        this._diffViewers.push(diffViewer);

        handleDiffComplete = () => {
            // Remove this fetch info and process the queue again
            remove(this._outstandingFetchDiffCalls, fetchInfo);

            if (this._outstandingFetchDiffCalls.length === 0 && this._delayAnnounceHelper) {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ContentLoadedText);
            }

            this._processFetchDiffQueue();
            this._fetchDiffsForViewableChanges();
        };

        if (skipDiff) {
            if (diffViewer && !diffViewer.isDisposed) {
                diffViewer.setDiffModel(<VCLegacyContracts.FileDiff>{
                    modifiedFile: fetchInfo.change.item
                });
            }
            handleDiffComplete();
        }
        else {

            if (ChangeType.hasChangeFlag(fetchInfo.change.changeType, VCLegacyContracts.VersionControlChangeType.Add) ||
                ChangeType.hasChangeFlag(fetchInfo.change.changeType, VCLegacyContracts.VersionControlChangeType.Undelete)) {
                originalPath = "";
            }
            else {
                originalPath = fetchInfo.change.item.serverItem;

                if (fetchInfo.change.sourceServerItem) {
                    originalVersionSpec = VersionSpec.parse(this._oversion);

                    if (ChangeType.hasChangeFlag(fetchInfo.change.changeType, VCLegacyContracts.VersionControlChangeType.Branch) ||
                        !(originalVersionSpec instanceof PreviousVersionSpec)) {

                        originalPath = fetchInfo.change.sourceServerItem;

                        if (fetchInfo.change.pendingVersion && originalVersionSpec instanceof PreviousVersionSpec) {
                            originalVersion = fetchInfo.change.pendingVersion;
                        }
                    }
                }
            }

            if (ChangeType.hasChangeFlag(fetchInfo.change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                modifiedPath = "";
            }
            else {
                modifiedPath = fetchInfo.change.item.serverItem;
            }

            diffViewer.beginShowDiff(this._repositoryContext, {
                opath: originalPath,
                oversion: originalVersion,
                mpath: modifiedPath,
                mversion: this._mversion,
            }, handleDiffComplete);
        }
    }

    private _fetchDiffsForViewableChanges() {
        // _fetchDiffsForViewableChanges() should be no-op when either this._$filesContainer or this._$filesScrollContainer is undefined.
        // There are few corner cases when _fetchDiffsForViewableChanges() gets invoked when this._$filesContainer and this._$filesScrollContainer are undefined.
        // For example, for a commit with more than 2000 changes, and first 1500 changes are of change type "SourceRename | Delete", we show empty page first.
        // At this point, this._$filesContainer and this._$filesScrollContainer will be undefined. Subsequent show more action could hit this condition.
        if (this._$filesContainer == null || this._$filesScrollContainer == null) {
            return;
        }

        const currentState = getHistoryService().getCurrentState();

        const containerScrollTop = this._$filesScrollContainer.scrollTop();
        const containerScrollBottom = containerScrollTop + this._$filesScrollContainer.height();
        const fileContainerOffsetTop = this._$filesContainer[0].offsetTop;
        const filesHeight = this._$filesContainer.height();

        const viewableTopOffset = Math.min(Math.max(0, containerScrollTop - fileContainerOffsetTop - FilesSummaryControl.VIEWABLE_THRESHOLD_IN_PIXELS), filesHeight);
        const viewableBottomOffset = Math.min(Math.max(0, containerScrollBottom - fileContainerOffsetTop + FilesSummaryControl.VIEWABLE_THRESHOLD_IN_PIXELS), filesHeight);

        // All items with top or bottom offset between viewableTopOffset and viewableBottomOffset are visible

        const itemsToFetch: QueuedFetchDiffInfo[] = [];
        let shownItems: number = 0;

        $.each(this._$filesContainer.children(".file-container"), (i, item) => {
            let $item = $(item),
                topOffset = item.offsetTop,                     // dimensions for visibility calculation

                // Using $item.height() causes page hang for few seconds when there are more than 1000 changes. Especially in scenarios like,
                // selecting a folder from left pane with only 1 or 2 files in it. In that case we iterate over all changes and
                // on each item we invoke $item.height() which slows us down drastically. Using a minimum of 100px saves us from that computation.
                // 100px is the height of empty file container that we create. In the worst case (when we use 100px height) we may end up making few
                // extra file diff calls which is better compared to the page getting hanged.
                bottomOffset = topOffset + 100,
                alreadyFetching = $item.data("fetching-diff"),
                visible = $item.is(":visible"),                 // is the element visible to the user
                filtered = $item.data("hiddenByFilter");        // is the filter hiding this element

            // is the current item in the viewport
            const itemInViewPort = (topOffset >= viewableTopOffset || bottomOffset >= viewableTopOffset) &&
                (topOffset <= viewableBottomOffset || bottomOffset <= viewableBottomOffset);

            // if we have run our calculations on enough elements that we can break out of the loop
            const pastViewPortBottom = !(topOffset <= viewableBottomOffset || bottomOffset <= viewableBottomOffset);

            // definitely don't show the element if it is filtered
            if (!filtered) {

                // calculate whether we want to fetch the file item
                const shouldFetch: boolean =
                    !alreadyFetching &&                                             // we aren't already fetching it
                    ((visible && itemInViewPort) ||                                 // item is visible and in the viewport
                        shownItems < FilesSummaryControl.MIN_REQUESTED_BY_DEFAULT); // in the top 8 elements and we definitely want to download it

                if (shouldFetch) {
                    // if all we have is a loading picture we need to render the actual element
                    const changeIndex = $item.data("changeIndex");
                    if (changeIndex !== undefined && changeIndex !== null && !$item.data("changeEntry")) {
                        const $replacement = this._createFileRow(this._allChanges[changeIndex], changeIndex, currentState);
                        $item.replaceWith($replacement);
                        $item = $replacement;
                    }

                    // start fetching the data
                    if ($item.data("fetching-diff") === false) {
                        const change = $item.data("changeEntry");
                        if (change) {
                            itemsToFetch.push({
                                change: change,
                                $container: $item
                            });
                        }
                    }
                }

                // keep track of how many items we have shown (needed b/c of filter)
                shownItems++;
            }

            if (pastViewPortBottom) {
                // break out of draw if we got to the bottom of drawable elements
                // or we already drew a whole lot of elements
                return false;
            }
        });

        if (itemsToFetch.length > 0) {
            this._delayAnnounceHelper && this._delayAnnounceHelper.startAnnounce(VCResources.ContentLoadingText);
            this._queueFetchDiffs(itemsToFetch, true);
            this._processFetchDiffQueue();
        }
    }

    /*
     * Checks if additionalMenuItems are same as exisitng additionalMenuItems and updates them if not same
     */
    public updateAdditionalMenuItems(additionalMenuItems: Menus.IMenuItemSpec[]): void {
        if (!MenuItemUtils.areMenuItemsArraysEqual(this._additionalMenuItems, additionalMenuItems)) {
            this._additionalMenuItems = additionalMenuItems;
            this._additionalMenuItemsCallBack = () => { return additionalMenuItems; }
            this._updateMenuItems();
        }
    }

    public updateHideArtifactLevelDiscussionState(newValue: boolean): void {
        if (this._hideArtifactLevelDiscussion !== newValue) {
            this._hideArtifactLevelDiscussion = newValue;
            this._updateMenuItems();
        }
    }

    private _updateMenuItems() {
        if (this._actionsMenu) {
            this._updateActionsMenu();
        }
    }

    private _updateActionsMenu() {
        const menuItems: Menus.IMenuItemSpec[] = [];
        let existingState: any;
        let hidingComments: boolean;
        let addCommentTooltip: string;

        menuItems.push({
            id: actionMenuItemIds.changeDiffOrientation,
            title: (this._diffOrientation === VCWebAccessContracts.DiffViewerOrientation.Inline) ? VCResources.InlineDiffTitle : VCResources.SideBySideDiffTitle,
            icon: (this._diffOrientation === VCWebAccessContracts.DiffViewerOrientation.Inline) ? "bowtie-icon bowtie-diff-inline" : "bowtie-icon bowtie-diff-side-by-side",
            showText: true,
            text: (this._diffOrientation === VCWebAccessContracts.DiffViewerOrientation.Inline) ? VCResources.InlineDiffText : VCResources.SideBySideDiffText,
            action: () => {
                this._changeDiffViewerOrientation();
                return false;
            }
        });

        menuItems.push({ separator: true });

        if (this._discussionManager) {

            if (!this._hideArtifactLevelDiscussion) {

                if (this._changeListModel && !this._currentFilter || !this._currentFilter.path) {

                    if (this._repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
                        if ((<VCLegacyContracts.TfsChangeList>this._changeListModel).isShelveset) {
                            addCommentTooltip = VCResources.AddShelvesetOverallComment;
                        }
                        else {
                            addCommentTooltip = VCResources.AddChangesetOverallComment;
                        }
                    }
                    else {
                        addCommentTooltip = VCResources.AddCommitOverallComment;
                    }

                    // Add review-level comment (only available when no path filter is applied)
                    menuItems.push({
                        id: actionMenuItemIds.addFileDiscussion,
                        showText: false,
                        icon: "bowtie-icon bowtie-comment-add",
                        title: addCommentTooltip,
                        arguments: {
                            discussionManager: this._discussionManager
                        }
                    });
                }
            }

            if (this._discussionManager.getAllThreads().length) {

                existingState = getHistoryService().getCurrentState() || {};
                hidingComments = Utils_String.localeIgnoreCaseComparer(existingState.hideComments, "true") === 0;

                if (this._allowHideComments) {
                    menuItems.push({
                        id: actionMenuItemIds.showComments,
                        title: hidingComments ? VCResources.ShowCodeReviewComments : VCResources.HideCodeReviewComments,
                        icon: "bowtie-icon bowtie-comment-outline",
                        showText: false,
                        // HACK toggled is used by ICommand, even when IMenuItemSpec doesn't declare it.
                        toggled: hidingComments ? false : true,
                        action: () => {
                            const historySvc = getHistoryService();
                            const state = historySvc.getCurrentState() || {};
                            window.location.href = historySvc.getFragmentActionLink(state._a || null, $.extend({}, state, {
                                hideComments: hidingComments ? "false" : "true"
                            }));
                        }
                    } as Menus.IMenuItemSpec);
                }
            }
        }

        if (this._additionalMenuItemsCallBack) {
            const additionalMenuItems = this._additionalMenuItemsCallBack();
            if (!!additionalMenuItems) {
                $.each(additionalMenuItems, (i: number, item: Menus.IMenuItemSpec) => {
                    const action = item.action ? item.action : () => { };
                    item.action = () => {
                        action(undefined);
                        this._focusActionMenuItemById(item.id);
                        // Ensure the menu is up to date after the callback occurs
                        this._updateMenuItems();
                    }
                    menuItems.push(item);
                });
            }
        }

        this._actionsMenu.updateItems(menuItems);
    }

    private _focusActionMenuItemById(menuItemId: string): void {
        if (menuItemId && this._actionsMenu) {
            const menuItem = this._actionsMenu.getItem(menuItemId);
            menuItem && this._actionsMenu._selectItem(menuItem);
        }
    }

    public getTotalFileCount() {
        let counter = 0;
        if (this._allChanges) {
            $.each(this._allChanges, (i: number, change: VCLegacyContracts.Change) => {
                if (!change.item.isFolder) {
                    counter++;
                }
            });
        }

        return counter;
    }

    private _updateShowingSummary(changes: VCLegacyContracts.Change[], filterPath?: string) {
        let changeCount: number;
        let adds: number = 0;
        let edits: number = 0;
        let deletes: number = 0;
        let renames: number = 0;
        let $totalChanges: JQuery;
        let $filePath: JQuery;
        let $changeCounts: JQuery;
        let $diffSummary: JQuery;

        // Create a string that looks like:
        // Showing # files in /filter/path/: # adds # edits # deletes

        // Compute change counts
        if (this._$diffSummaryHeader) {
            this._$diffSummaryHeader.empty();

            if (changes.length) {
                changeCount = 0;
                $.each(changes, (i: number, change: VCLegacyContracts.Change) => {
                    if (i >= this._maxChangesToBeShown) {
                        return false;
                    }

                    changeCount++;
                    if (ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Add)) {
                        adds++;
                    }
                    else if (ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
                        deletes++;
                    }
                    else if (ChangeType.isEdit(change.changeType)) {
                        edits++;
                    }
                    else if (ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
                        renames++;
                    }
                });
            }

            // Create "# changed files" string
            $totalChanges = $(domElem("span", "diff-summary-prominent"))
                .text(Utils_String.format(changeCount === 1 ? VCResources.DiffSummaryChangedSingleFile : VCResources.DiffSummaryChangedFiles, changeCount));

            // Create "Showing # changed files in /folder/path/:" string
            if (filterPath) {
                // Putting the file path in a span's .text prior to calling .html below 
                // does proper html escaping to avoid potential script attacks
                $filePath = $(domElem("span", "diff-summary-filepath")).text(filterPath);
                $diffSummary = $(domElem("span")).html(Utils_String.format(VCResources.DiffSummaryShowingFilesWithFilter, $totalChanges[0].outerHTML, $filePath[0].outerHTML));
            }
            else {
                $diffSummary = $(domElem("span")).html(Utils_String.format(VCResources.DiffSummaryShowingFiles, $totalChanges[0].outerHTML));
            }

            // Append "# adds # edits # deletes" to above string
            $changeCounts = $(domElem("span")).appendTo($diffSummary);
            FilesSummaryControl.updateChangeCountsElement($changeCounts, adds, edits, deletes, renames);

            this._$diffSummaryHeader.append($diffSummary);
        }
    }

    public static updateChangeCountsElement($container: JQuery, adds: number, edits: number, deletes: number, renames?: number, totalAffectedFiles?: number) {
        let $changeCount: JQuery;

        $container.empty();
        $container.addClass("summary-change-counts");

        if (totalAffectedFiles > 0) {
            $(domElem("span", "total-affected-count"))
                .text(Utils_String.format(totalAffectedFiles === 1 ? VCResources.AffectedFilesSingular : VCResources.AffectedFilesPluralFormat, totalAffectedFiles))
                .appendTo($container);
        }

        if (adds) {
            $changeCount = $(domElem('span', 'change-count')).text("" + adds);
            $(domElem('span', 'add-change')).appendTo($container)
                .html(Utils_String.format(adds === 1 ? VCResources.ChangeCountAdd : VCResources.ChangeCountAdds, $changeCount[0].outerHTML));
        }
        if (edits) {
            $changeCount = $(domElem('span', 'change-count')).text("" + edits);
            $(domElem('span', 'edit-change')).appendTo($container)
                .html(Utils_String.format(edits === 1 ? VCResources.ChangeCountEdit : VCResources.ChangeCountEdits, $changeCount[0].outerHTML));
        }
        if (deletes) {
            $changeCount = $(domElem('span', 'change-count')).text("" + deletes);
            $(domElem('span', 'delete-change')).appendTo($container)
                .html(Utils_String.format(deletes === 1 ? VCResources.ChangeCountDelete : VCResources.ChangeCountDeletes, $changeCount[0].outerHTML));
        }
        if (renames) {
            $changeCount = $(domElem('span', 'change-count')).text("" + renames);
            $(domElem('span', 'rename-change')).appendTo($container)
                .html(Utils_String.format(renames === 1 ? VCResources.ChangeCountRename : VCResources.ChangeCountRenames, $changeCount[0].outerHTML));
        }
    }
}

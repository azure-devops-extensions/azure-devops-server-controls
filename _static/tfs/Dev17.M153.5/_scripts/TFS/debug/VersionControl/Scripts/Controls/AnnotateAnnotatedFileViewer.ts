/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Notifications = require("VSS/Controls/Notifications");
import Controls = require("VSS/Controls");
import Splitter = require("VSS/Controls/Splitter");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCAnnotateTfsAnnotationEngine = require("VersionControl/Scripts/Controls/AnnotateTfsAnnotationEngine");
import VCAnnotateGitAnnotationEngine = require("VersionControl/Scripts/Controls/AnnotateGitAnnotationEngine");
import VCAnnotateAnnotationEngine = require("VersionControl/Scripts/Controls/AnnotateAnnotationEngine");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import VCFileViewerLineAdornment = require("VersionControl/Scripts/FileViewerLineAdornment");
import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;

export class AnnotatedFileViewer extends Controls.BaseControl {

    private static ANNOTATE_GUTTER_DEFAULT_WIDTH = 250;
    private static ANNOTATE_GUTTER_ANIMATION_SPEED = 400;
    private static ANNOTATE_THROTTLED_UPDATE_DELAY = 100;

    private _annotationEngine: VCAnnotateAnnotationEngine.AnnotationEngine;
    private _splitter: Splitter.Splitter;
    private _annotateMode: boolean;
    private _$errorHost: JQuery;
    private _anyAnnotateProgress: boolean;
    private _$fileViewerContainer: JQuery;
    private _fileViewer: VCFileViewer.FileViewer;
    private _repositoryContext: RepositoryContext;
    private _item: VCLegacyContracts.ItemModel;
    private _fileEditSettings: VCFileViewer.FileEditSettings;
    private _$annotationBlocksContainer: JQuery;
    private _selectedLine: number;
    private _throttledScrollDelay: Utils_Core.DelayedFunction;
    private _throttledSelectionDelay: Utils_Core.DelayedFunction;
    private _lastDelayedScrollPosition: VCFileViewer.FileViewerScrollPosition;
    private _adornments: AdornmentCommon.Adornment[] = [];

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-annotated-file-viewer"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._$errorHost = $(domElem("div", "annotate-error-host")).appendTo(this._element);
        this._$errorHost.hide();

        this._splitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, $(domElem("div", "annotate-main-container")).appendTo(this._element), {
            fixedSide: "left",
            vertical: false,
            animationSpeed: AnnotatedFileViewer.ANNOTATE_GUTTER_ANIMATION_SPEED
        });

        // Hide the left side of the splitter initially (until we switch to annotate mode)
        this._splitter.noSplit();
        // HACK: noSplit only works if visible, so otherwise we keep _annotateMode in sync at least
        this._annotateMode = !this._splitter.getElement().is(":visible");

        this._$annotationBlocksContainer = $(domElem("div", "annotation-blocks-container")).appendTo(this._splitter.leftPane);
        this._$fileViewerContainer = this._splitter.rightPane;

        this._fileViewer = <VCFileViewer.FileViewer>Controls.BaseControl.createIn(VCFileViewer.FileViewer, this._$fileViewerContainer, <VCFileViewer.FileViewerOptions>{
            tfsContext: this._options.tfsContext,
            monitorScroll: true,
            monitorSelection: true,
            bindKeys: this._options.bindKeys,
            externalViewerCss: "default",
            allowEditing: this._options.allowEditing,
            contextMenuItems: this._options.contextMenuItems,
            getContributedViewMenuItems: () => {
                return this.getAnnotateMenuItems();
            },
            hostInIframe: this._options.hostInIframe,
            lineLinkingWidgetEnabled: this._options.lineLinkingWidgetEnabled,
            hideActionsToolbar: this._options.hideActionsToolbar,
        });

        this._fileViewer._bind(VCFileViewer.FileViewer.EVENT_PREVIEW_MODE_CHANGED, (e?: any, args?: any) => {
            if (args.previewMode && this._annotateMode) {
                // Switched to content preview mode - hide annotations
                this._annotateMode = false;
                this._splitter.noSplit();
                this._fileViewer._updateViewsToolbar();
            }
        });

        this._fileViewer.addScrollPositionListener(delegate(this, this._onFileViewerScroll));
        this._fileViewer.addSelectionListener(delegate(this, this._onFileViewerSelectionChanged));
        $(window).resize(() => {
            this._renderCurrentAnnotationBlocks();
        });
    }

    public getAnnotateMenuItems(): any[] {
        const menuItems: any[] = [];

        if (this._options.showAnnotateButton &&
            this._item &&
            (!this._item.contentMetadata || !this._item.contentMetadata.isBinary) &&
            !(VCSpecs.VersionSpec.parse(this._item.version) instanceof VCSpecs.ShelvesetVersionSpec) &&
            !(this._fileEditSettings && this._fileEditSettings.newFile)) {

            menuItems.push({
                id: "annotate-file",
                title: this._annotateMode ? VCResources.HideAnnotations : VCResources.ShowAnnotations,
                icon: "bowtie-icon bowtie-comment-urgent",
                showText: false,
                toggled: this._annotateMode,
                action: () => {
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_ANNOTATE_CLICK, {}));
                    const showAnnotations = !this._annotateMode;
                    this.viewFile(this._repositoryContext, this._item, showAnnotations, this._fileEditSettings);
                }
            });
        }
        return menuItems;
    }

    public viewFile(
        repositoryContext: RepositoryContext,
        item: VCLegacyContracts.ItemModel,
        showAnnotations: boolean,
        fileEditSettings?: VCFileViewer.FileEditSettings,
        fileViewSettings?: VCFileViewer.FileViewSettings,
        fileViewerOfflineSettings?: VCFileViewer.FileViewerOfflineSettings
    ): IPromise<void> {

        let sameFile = false,
            annotateModeChanged = false;

        if (this._repositoryContext === repositoryContext && this._item === item) {
            sameFile = true;
        }
        else {
            this._repositoryContext = repositoryContext;
            this._item = item;
        }

        if (showAnnotations !== this._annotateMode) {
            annotateModeChanged = true;
            this._annotateMode = showAnnotations;
        }

        this._fileEditSettings = fileEditSettings;

        // If showing annotations, turn off content-preview rendering (need raw source)
        if (showAnnotations) {
            this._fileViewer.setPreviewContentMode(false, sameFile);
        }

        // Update the line linking widget, and force refresh only if this is the same file and wouldn't refresh otherwise.
        this._fileViewer.setLineLinkingWidgetUrl(this._options.lineLinkingWidgetEnabled ? window.location.href : null, sameFile);

        // Show the file contents
        const promise = this._fileViewer.viewItem(repositoryContext, item, fileEditSettings, fileViewSettings, fileViewerOfflineSettings);

        this.removeLineAdornments();
        const showLineAdornments: boolean = !fileEditSettings.editMode && fileViewSettings != null && fileViewSettings.line != null;
        if (showLineAdornments) {
            const adornments = VCFileViewerLineAdornment.FileViewerLineAdornment.create(fileViewSettings.line);
            this.addAdornments(adornments);
        }

        if (sameFile && !annotateModeChanged) {
            // Viewer is already showing the correct file, nothing else to do
            return promise;
        }

        // Clear any errors
        this._setErrorMessage(null);

        // Cancel an existing annotation engine if the file has changed
        if (this._annotationEngine) {
            this._$annotationBlocksContainer.empty();
            if (!sameFile) {
                this._annotationEngine.cancel();
                this._annotationEngine = null;
            }
        }

        if (showAnnotations) {

            if (!sameFile) {
                this._selectedLine = 0;
            }

            // Start the annotation engine
            if (!this._annotationEngine && item && item.contentMetadata && !item.contentMetadata.isBinary) {
                if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    this._annotationEngine = new VCAnnotateGitAnnotationEngine.GitAnnotationEngine(<GitRepositoryContext>repositoryContext, item.serverItem, item.version);
                }
                else {
                    this._annotationEngine = new VCAnnotateTfsAnnotationEngine.TfsAnnotationEngine(<TfvcRepositoryContext>repositoryContext, item.serverItem, item.version);
                }
                this._anyAnnotateProgress = false;
                this._annotationEngine.addProgressListener(delegate(this, this._onAnnotationProgress));
                this._annotationEngine.start();
            }

            // Make the annotations visible
            if (annotateModeChanged) {

                if (sameFile) {
                    // Animate (slide-in) the annotation blocks for a file that we were already viewing.
                    this._fileViewer.suppressExternalEditorLayoutRefreshes(true);
                    this._splitter.split(true, AnnotatedFileViewer.ANNOTATE_GUTTER_DEFAULT_WIDTH);
                    Utils_Core.delay(this, AnnotatedFileViewer.ANNOTATE_GUTTER_ANIMATION_SPEED, () => {
                        this._fileViewer.suppressExternalEditorLayoutRefreshes(false);
                    });
                }
                else {
                    this._splitter.split(false, AnnotatedFileViewer.ANNOTATE_GUTTER_DEFAULT_WIDTH);
                }
            }

            this._renderCurrentAnnotationBlocks();
        }
        else {
            if (annotateModeChanged) {
                // Hide the annotations pane
                this._splitter.noSplit(true);
            }
        }

        if (annotateModeChanged) {
            this._fire("annotation-mode-changed", { showAnnotations: showAnnotations });
        }

        return promise;
    }

    public getFileViewer() {
        return this._fileViewer;
    }

    public setWarningMessage(message: string, messageType: Notifications.MessageAreaType) {
        this._setErrorMessage(message, messageType);
    }

    private _setErrorMessage(message: string, messageType?: Notifications.MessageAreaType) {
        let messageArea: Notifications.MessageAreaControl;
        this._$errorHost.empty();
        if (message) {
            this._$errorHost.show();
            this._element.addClass("with-error");
            messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._$errorHost, {
                closeable: false,
                message: {
                    type: messageType,
                    header: message
                }
            });
        }
        else {
            this._$errorHost.hide();
            this._element.removeClass("with-error");
        }
    }

    private _renderCurrentAnnotationBlocks() {
        if (this._annotationEngine) {
            this._fileViewer.beginGetScrollPosition((position: VCFileViewer.FileViewerScrollPosition) => {
                this._drawAnnotations(this._annotationEngine.getAnnotationBlocks(), this._annotationEngine.getVersionMap(), position);
            });
        }
    }

    private _onAnnotationProgress(blocks: VCAnnotateAnnotationEngine.AnnotationBlock[], versionsMap: VCAnnotateAnnotationEngine.VersionMap, complete: boolean) {
        if (!this._anyAnnotateProgress) {
            this._anyAnnotateProgress = true;
            if (this._annotationEngine) {
                if (this._annotationEngine.hasUnprocessedHistory()) {
                    this._setErrorMessage(VCResources.AnnotateUnprocessedHistoryWarningFormat, Notifications.MessageAreaType.Warning);
                }
                else if (this._annotationEngine.hasMoreHistoryAvailable()) {
                    this._setErrorMessage(Utils_String.format(VCResources.AnnotateMaxHistoryWarningFormat, this._annotationEngine.getHistoryEntries().length), Notifications.MessageAreaType.Warning);
                }
            }
        }
        this._fileViewer.beginGetScrollPosition((position: VCFileViewer.FileViewerScrollPosition) => {
            this._drawAnnotations(blocks, versionsMap, position);
        });
    }

    private _onFileViewerScroll(position: VCFileViewer.FileViewerScrollPosition) {
        if (this._annotationEngine) {
            if (this._throttledSelectionDelay) {
                this._throttledSelectionDelay.cancel();
                this._throttledSelectionDelay = null;
            }

            if (this._throttledScrollDelay) {
                this._lastDelayedScrollPosition = position;
            }
            else {
                this._drawAnnotations(this._annotationEngine.getAnnotationBlocks(), this._annotationEngine.getVersionMap(), position);

                this._lastDelayedScrollPosition = null;
                this._throttledScrollDelay = Utils_Core.delay(this, AnnotatedFileViewer.ANNOTATE_THROTTLED_UPDATE_DELAY, () => {
                    this._throttledScrollDelay = null;
                    if (this._lastDelayedScrollPosition) {
                        this._onFileViewerScroll(this._lastDelayedScrollPosition);
                    }
                });
            }
        }
    }

    private _onFileViewerSelectionChanged(selection: VCFileViewer.FileViewerSelection) {
        this._selectedLine = selection.positionLineNumber;
        if (this._annotationEngine && !this._throttledSelectionDelay) {
            this._throttledSelectionDelay = Utils_Core.delay(this, AnnotatedFileViewer.ANNOTATE_THROTTLED_UPDATE_DELAY, () => {
                this._throttledSelectionDelay = null;
                this._renderCurrentAnnotationBlocks();
            });
        }
    }

    private _onAnnotationBlockClicked(e: JQueryEventObject) {
        this._selectedLine = $(e.target).closest(".annotation-block").data("startLine");
        this._renderCurrentAnnotationBlocks();
    }

    private _drawAnnotations(blocks: VCAnnotateAnnotationEngine.AnnotationBlock[], versionsMap: VCAnnotateAnnotationEngine.VersionMap, position: VCFileViewer.FileViewerScrollPosition) {
        let viewerHeight = this._$fileViewerContainer.height(),
            startLine = 1 + (position.scrollTop / position.lineHeight),
            startLineFloor = Math.floor(startLine),
            endLine = startLine + (viewerHeight / position.lineHeight),
            endLineCeil = Math.ceil(endLine),
            firstFullyVisibleLine = Math.ceil(startLine),
            historyEntries: VCLegacyContracts.HistoryEntry[],
            firstHistoryDate = 0,
            latestHistoryDate = 0,
            annotationBlockClickDelegate = delegate(this, this._onAnnotationBlockClicked),
            selectedVersion = "";

        this._$annotationBlocksContainer.empty();
        this._$annotationBlocksContainer.css("top", (position.topOffset || 0) + "px");

        if (this._selectedLine) {
            selectedVersion = this._annotationEngine.getVersionForLineNumber(this._selectedLine);
        }

        historyEntries = this._annotationEngine.getHistoryEntries();
        if (historyEntries.length > 0) {
            latestHistoryDate = historyEntries[0].changeList.creationDate.getTime();
            firstHistoryDate = historyEntries[historyEntries.length - 1].changeList.creationDate.getTime();
        }

        $.each(blocks, (blockIndex: number, block: VCAnnotateAnnotationEngine.AnnotationBlock) => {
            let historyEntry: VCLegacyContracts.HistoryEntry,
                changeList: VCLegacyContracts.ChangeList,
                changeIdentifier: string,
                changeLinkUrl: string,
                displayName: string,
                $annotationBlock: JQuery,
                $annotationBlockDetails: JQuery,
                $selectedVersionMarker: JQuery,
                topMargin: number,
                creationDateOffsetPct: number,
                tooltip: string;

            if ((block.startLine + block.lineCount - 1) < startLineFloor ||
                block.startLine > endLineCeil) {
                // Entire block is before or after the visible range. Skip this block.
                return true;
            }

            historyEntry = versionsMap[block.version];
            if (historyEntry) {

                changeList = historyEntry.changeList;

                displayName = changeList.ownerDisplayName || "";
                if (displayName && this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    displayName = ChangeListIdentityHelper.getUserNameWithoutEmail(displayName);
                }

                tooltip = VCCommentParser.Parser.getChangeListDescription(changeList, true);
                tooltip += ("\n\n" + displayName + "\n" + Utils_Date.localeFormat(changeList.creationDate, "G"));

                $annotationBlock = $(domElem("div", "annotation-block"))
                    .css("position", "absolute")
                    .css("left", "0")
                    .css("right", "0")
                    .css("top", ((block.startLine - startLine) * position.lineHeight) + "px")
                    .css("height", (position.lineHeight * block.lineCount) + "px")
                    .attr("title", tooltip)
                    .data("version", changeList.version)
                    .data("startLine", block.startLine)
                    .data("lineCount", block.lineCount)
                    .click(annotationBlockClickDelegate)
                    .appendTo(this._$annotationBlocksContainer);

                if (changeList.version === selectedVersion) {
                    $selectedVersionMarker = $(domElem("div", "selected-annotation-block-marker")).appendTo($annotationBlock);
                    if (this._selectedLine >= block.startLine && this._selectedLine <= (block.startLine + block.lineCount - 1)) {
                        $selectedVersionMarker.addClass("selected-line");
                    }
                }

                // Shade the background of this block based on its creation date
                if (changeList.version === historyEntries[historyEntries.length - 1].changeList.version) {
                    $annotationBlock.addClass("oldest");
                }
                else if (changeList.version === historyEntries[0].changeList.version) {
                    $annotationBlock.addClass("most-recent");
                }
                else {
                    creationDateOffsetPct = (changeList.creationDate.getTime() - firstHistoryDate) / (latestHistoryDate - firstHistoryDate);
                    if (creationDateOffsetPct >= 0.5) {
                        $annotationBlock.addClass("recent");
                    }
                    else {
                        $annotationBlock.addClass("older");
                    }
                }

                $annotationBlockDetails = $(domElem("div", "annotation-details")).appendTo($annotationBlock);

                if (block.startLine < firstFullyVisibleLine && block.lineCount > 1) {
                    // The start of this block is above the first fully visible line of the viewer. Add some padding
                    // to the details/label line so that the annotation label is seen.
                    topMargin = (startLine - block.startLine) * position.lineHeight;
                    if (block.startLine + block.lineCount <= firstFullyVisibleLine) {
                        // This block doesn't actually cover the first fully visible line, so
                        // subtract a line from the padding to make the label only partially visible
                        topMargin -= Math.floor((startLine - startLineFloor) * position.lineHeight);
                    }
                    $annotationBlockDetails.css("margin-top", topMargin + "px");
                }

                // Add the Changeset/Commit link
                if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    changeIdentifier = (<VCLegacyContracts.GitCommit>changeList).commitId.short;
                    changeLinkUrl = VersionControlUrls.getCommitUrlForFile(
                        <GitRepositoryContext>this._repositoryContext,
                        (<VCLegacyContracts.GitCommit>changeList).commitId.full, historyEntry.serverItem,
                        VCOM.ChangeType.hasChangeFlag(historyEntry.itemChangeType, VCLegacyContracts.VersionControlChangeType.Edit) ? VCControlsCommon.VersionControlActionIds.Compare : VCControlsCommon.VersionControlActionIds.Contents);
                }
                else {
                    changeIdentifier = "" + (<VCLegacyContracts.TfsChangeList>changeList).changesetId;
                    changeLinkUrl = VersionControlUrls.getChangesetUrlForFile(
                        (<VCLegacyContracts.TfsChangeList>changeList).changesetId,
                        historyEntry.serverItem,
                        VCOM.ChangeType.hasChangeFlag(historyEntry.itemChangeType, VCLegacyContracts.VersionControlChangeType.Edit) ? VCControlsCommon.VersionControlActionIds.Compare : VCControlsCommon.VersionControlActionIds.Contents,
                        this._options.tfsContext);
                }

                $(domElem("a", "change-list"))
                    .text(changeIdentifier)
                    .attr("href", changeLinkUrl)
                    .appendTo($annotationBlockDetails);

                // Add the owner name
                $(domElem("span", "owner"))
                    .text(displayName)
                    .appendTo($annotationBlockDetails);

                // Add the date
                $(domElem("span", "date"))
                    .text(Utils_Date.localeFormat(changeList.creationDate, "d"))
                    .appendTo($annotationBlockDetails);
            }
        });
    }

    private addAdornments(adornments: AdornmentCommon.Adornment[]) {
        this._adornments = this._adornments.concat(adornments);

        if (this._adornments.length > 0) {
            this.getFileViewer().extendEditorConfig({
                adornmentsEnabled: true,
                adornments: this._adornments
            });
        }
    }

    private removeLineAdornments() {
        const oldLength = this._adornments.length;

        this._adornments = this._adornments.filter(adornment => {
            return !(adornment instanceof VCFileViewerLineAdornment.FileViewerLineAdornment)
        });

        // The line highlighting code was clobbering the discussion comments. This is a temporary fix
        // that should make it so that those comments won't be clobbered. The correct fix would be to
        // move the adornment management code onto the Monaco side, just like how the discussion 
        // comments are managed now. #552109
        if (oldLength !== this._adornments.length) {
            this.getFileViewer().extendEditorConfig({
                adornmentsEnabled: this._adornments.length !== 0,
                adornments: this._adornments
            });
        }
    }
}

/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionCommonUI = require("Presentation/Scripts/TFS/TFS.Discussion.Common.UI");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import Menus = require("VSS/Controls/Menus");
import * as PopupContent from "VSS/Controls/PopupContent";
import Splitter = require("VSS/Controls/Splitter");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import { NotificationType, Notification } from  "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import * as  NotificationArea  from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { BuiltInDiffViewerDiscussionThreadControlReact } from "VersionControl/Scripts/Controls/DiffBuiltInDiffViewerDiscussionThreadControlReact";
import DiscussionThread = require("VersionControl/Scripts/Components/PullRequestReview/DiscussionThread");
import * as DiffCountService from "VersionControl/Scripts/Services/DiffCountService";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import getErrorMessage = VSS.getErrorMessage;
import TfsContext = TFS_Host_TfsContext.TfsContext;

interface ImageDiff {
    diffActionsToolbar: Menus.Toolbar;
    elements: ImageDiffElements;
    flipState: string;
    fullyLoaded: boolean;
    isOverlay: boolean;
    modScaled: ImageDimensions;
    mode: number;
    modifiedImage: ImageInfo;
    origScaled: ImageDimensions;
    originalImage: ImageInfo;
    sideBySideHeight: number;
    inlineHeight: number;
    sameSize: boolean;
    standardMargin: number;
    standardBorderSize: number;
}

interface ImageDiffElements {
    $canvas: JQuery;
    $container: JQuery;
    $controls: JQuery;
    $imagesContainer: JQuery;
    $leftImageContainer: JQuery;
    $rightImageContainer: JQuery;
    $flipButton: JQuery;
}

interface ImageDimensions {
    width: number;
    height: number;
}

interface ImageInfo {
    dimensions?: ImageDimensions;
    ratio?: number;
    loaded?: boolean;
    url: string;
}

export interface DiffRowLineInfo {
    rowIndex: number;
    originalLine: number;
    modifiedLine: number;
    blockIndex: number;
    isEllipsis?: boolean;
}

export interface DiffRowLineInfoLookup {
    [rowIndex: number]: DiffRowLineInfo;
}

const imageDiffActionMenuItemIds = {
    flipper: "flipper",
    trueDiff: "true-diff",
    twoUp: "two-up",
};

interface TextDiffContentRowInfo {
    $gutterElementContainer: JQuery;
    $originalElementContainer: JQuery;
    $modifiedElementContainer: JQuery;
    $diffContentContainer: JQuery;
}

export class BuiltInDiffViewer extends Controls.BaseControl {

    private _updateDiffButtonsCallback: (prevEnabled: boolean, nextEnabled: boolean) => void;
    private _updateDiffOrientationCallback: () => void;
    private _requestIndex: number;
    private _diffModel: any;
    private _windowResizeDelegate: any;
    private _sideBySideSplitter: Splitter.Splitter;
    private _$sideBySideOriginalDiffContainer: JQuery;
    private _$sideBySideModifiedDiffContainer: JQuery;
    private _$inlineDiffContainer: JQuery;
    private _$headerContainer: JQuery;
    private _numRowsRendered: number;
    private _rowsAboveThread: number = BuiltInDiffViewer.DIFF_PADDING_ROWS;
    private _rowsBelowThread: number = BuiltInDiffViewer.DIFF_PADDING_ROWS;
    private _itemsDescription: any;
    private _maxLineNumber: number;
    private _currentlySelectedRowIndex: number;
    private _lineInfoByRowIndex: DiffRowLineInfoLookup;
    private _startRowIndexByBlockIndex: number[];
    private _repositoryContext: RepositoryContext;
    private _orientation: VCWebAccessContracts.DiffViewerOrientation;
    private _discussionManager: DiscussionOM.DiscussionManager;
    private _discussionUpdatedListener: any;
    private _$fileLevelDiscussionsContainer: JQuery;
    private _$hiddenCommentsElement: JQuery;
    private _$summaryRowElement: JQuery;
    private _discussionThreadControlManager: DiscussionOM.DiscussionThreadControlManager;
    private _currentDiscussionThreadControls: BuiltInDiffViewerDiscussionThreadControlReact[];
    private _$highlightedRowElements: JQuery[];
    private _highlightedRowIndex: number;
    private _highlightedRowIsOriginalSide: boolean;
    private _lastSelectionRange: Utils_UI.SelectionRange;
    private _selectedDiscussionId: number;
    private _activeState: boolean;
    private _ownsDiscussionThreadControlManager: boolean;
    private _imageDiff: ImageDiff;
    private _shouldDrawDiscussionThreads: boolean;
    public _shownTruncatedMessage: boolean;
    private _originalScrolling: boolean[];
    private _modifiedScrolling: boolean[];
    private _contentTruncatedMessage: string;

    private static TEXT_DIFF_GUTTER_WIDTH = 20;
    private static MAX_NUM_RENDERED_ROWS = 500;
    private static MAX_INLINE_HEIGHT = 250;
    private static DEFAULT_IMAGE_DIFF_MODE = VCWebAccessContracts.DiffViewerImageMode.TwoUp;
    private static ROWS_TO_EXPAND = 10;
    private static DIFF_PADDING_ROWS = 3;
    private static LINE_HEIGHT = 16;

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-diff-viewer"
        }, options));

        this._requestIndex = 0;
        this._numRowsRendered = 0;
        this._maxLineNumber = 0;
        this._currentlySelectedRowIndex = -1;
        this._lineInfoByRowIndex = <DiffRowLineInfoLookup>{};
        this._startRowIndexByBlockIndex = [];
        this._currentDiscussionThreadControls = [];
        this._$highlightedRowElements = [];
        this._highlightedRowIndex = -1;
        this._highlightedRowIsOriginalSide = false;
        this._updateDiffButtonsCallback = this._options.updateDiffButtonsCallback;
        this._updateDiffOrientationCallback = this._options.updateDiffOrientationCallback;
        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);
        this._windowResizeDelegate = delegate(this, this.updateLayout);
        this._selectedDiscussionId = null;
        this._activeState = true;
        this._imageDiff = <ImageDiff>{ standardMargin: 10, standardBorderSize: 1 };
        this._$summaryRowElement = this._options.$summaryRow;
        this._contentTruncatedMessage = this._options.contentTruncatedMessage || VCResources.ItemCompareContentTrimmed;

        if (this._options.discussionThreadControlManager) {
            this._discussionThreadControlManager = this._options.discussionThreadControlManager;
            this._ownsDiscussionThreadControlManager = false;
        }
        else {
            this._discussionThreadControlManager = new DiscussionOM.DiscussionThreadControlManager(this._options.tfsContext);
            this._ownsDiscussionThreadControlManager = true;
        }
    }

    public initialize() {
        super.initialize();

        if (this._options.fixedSize) {
            this._element.addClass("fixedSize");
        }

        $(window).bind("resize", this._windowResizeDelegate);

        this._element.bind("discussion-thread-resized discussion-comment-resized", () => {
            this._handleDiscussionResized();
        });

        this._element.bind("mousemove", delegate(this, this._handleMouseMove));
        this._element.bind("mouseout", delegate(this, this._handleMouseOut));

        this._orientation = this._options.orientation || VCWebAccessContracts.DiffViewerOrientation.SideBySide;
    }

    public _dispose() {
        super._dispose();

        NotificationArea.unmountComponent(this._element[0]);

        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            this._discussionManager = null;
        }

        if (this._ownsDiscussionThreadControlManager) {
            this._discussionThreadControlManager.dispose();
        }

        $.each(this._currentDiscussionThreadControls, function (i, threadControl) {
            threadControl.dispose();
        });

        $(window).unbind("resize", this._windowResizeDelegate);
    }

    public setActiveState(active: boolean, skipUpdateView?: boolean) {
        this._activeState = active;
        if (this._shouldDrawDiscussionThreads && active) {
            //if threads were updated while inactive, we need to redraw them
            this._drawDiscussionThreads();
            this._handleLayoutChanged();
            this._shouldDrawDiscussionThreads = false;
        }
    }

    private _emptyContents() {

        this._element.empty();

        this._sideBySideSplitter = null;
        this._$fileLevelDiscussionsContainer = null;
        this._currentlySelectedRowIndex = -1;
        this._numRowsRendered = 0;
        this._maxLineNumber = 0;
        this._lineInfoByRowIndex = <DiffRowLineInfoLookup>{};
        this._startRowIndexByBlockIndex = [];
        this._currentDiscussionThreadControls = [];
        this._$highlightedRowElements = [];
        this._highlightedRowIndex = -1;
        this._highlightedRowIsOriginalSide = false;
        this._$sideBySideOriginalDiffContainer = null;
        this._$sideBySideModifiedDiffContainer = null;
        this._$inlineDiffContainer = null;
        this._$headerContainer = null;
        this._selectedDiscussionId = null;
    }

    public setOrientation(orientation: VCWebAccessContracts.DiffViewerOrientation, redrawDiff: boolean, callback?: () => void) {
        const orientationChanged = this._orientation !== orientation;

        if (orientationChanged) {
            this._orientation = orientation;
            this._emptyContents();
        }

        if (redrawDiff && this._diffModel) {
            if (orientationChanged) {
                this.setDiffModel(this._diffModel);
            }
            if ($.isFunction(callback)) {
                callback.call(this);
                this._handleLayoutChanged();
            }
        }
    }

    public setDiscussionManager(discussionManager: DiscussionOM.DiscussionManager, redraw?: boolean) {
        if (this._discussionManager !== discussionManager && (discussionManager || this._discussionManager)) {
            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManager = discussionManager;
            if (!this._options.preventDiscussionCreate) {
                if (discussionManager) {
                    this._element.addClass("has-discussion-manager");
                    this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
                }
                else {
                    this._element.removeClass("has-discussion-manager");
                }
            }
            this._discussionThreadControlManager.setDiscussionManager(this._discussionManager);
            if (redraw && this._diffModel) {
                this._drawDiscussionThreads();
                this._handleLayoutChanged();
            }
        }
    }

    private onDiscussionCommentsUpdated(sender: DiscussionOM.DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        let filteredEventData: DiscussionCommon.DiscussionThreadsUpdateEvent;

        if (eventData.newThreads && !this._activeState) {
            //we only need to do this when the viewer is not active because if it was active, it was the viewer that added the thread so already has it
            $.each(eventData.newThreads, (i, thread: DiscussionCommon.DiscussionThread) => {
                if (thread.itemPath === this._getDiscussionItemPath()) {
                    this.updateDiscussionThreads();
                    return false;
                }
            });
        }

        if (this._diffModel && this._activeState) {
            if (eventData.currentThreads) {
                this._drawDiscussionThreads();
                this._handleLayoutChanged();
            }
            else if (eventData.newThreads || eventData.threadSelected) {
                filteredEventData = sender.filterEventData(eventData, (this._diffModel.modifiedFile || this._diffModel.originalFile).serverItem);
                if (filteredEventData.newThreads && filteredEventData.newThreads.length) {
                    if (this._$fileLevelDiscussionsContainer) {
                        this._$fileLevelDiscussionsContainer.show();
                    }
                    $.each(filteredEventData.newThreads, (index, newThread) => {
                        if (!newThread.position) {
                            this._addFileLevelThread(newThread, index === 0);
                        }
                    });
                }
            }
            else if(eventData.deletedComments) {
                filteredEventData = sender.filterEventData(eventData, (this._diffModel.modifiedFile || this._diffModel.originalFile).serverItem);
                if(filteredEventData.deletedComments && filteredEventData.deletedComments.length) {
                    filteredEventData.deletedComments.forEach(deletedComment => {
                        // In simplistic cases, remove the code decoration. I don't think its worth it to add a ton of complexity here to perfect this scenario.
                        if(deletedComment.threadId < 0 || deletedComment.parentId === 0) {
                            this._removeLineDecorationsForThread(deletedComment.threadId);
                        }
                    });
                }
            }
        // Update the image diff (container size needs to change)
            this._resetImageDiffConstants();
            this._afterImageLoad();
        }
        else if (this._diffModel && eventData.currentThreads) {
            //we need to redraw the discussion threads once this becomes active again
            this._shouldDrawDiscussionThreads = true;
        }
    }

    public hasDiscussionThreads(): boolean {
        if (this._discussionManager && this._diffModel) {
            if (this._discussionManager.getCurrentThreads().filter(t => t.itemPath === this._getDiscussionItemPath()).length !== 0) {
                return true;
            }
        }

        return false;
    }

    public updateDiscussionThreads() {
        this._drawDiscussionThreads();
        this._handleLayoutChanged();
    }

    public _beginGetFileDiff(itemsDescription, callback: (diffModel: VCLegacyContracts.FileDiff) => void, errorCallback?: IErrorCallback) {
        this._repositoryContext.getClient().beginGetFileDiff(this._repositoryContext,
            <VCLegacyContracts.FileDiffParameters>{
                originalPath: itemsDescription.opath,
                originalVersion: itemsDescription.oversion,
                modifiedPath: itemsDescription.mpath,
                modifiedVersion: itemsDescription.mversion,
                partialDiff: this._options.partialDiff,
                includeCharDiffs: true
            }, callback, errorCallback);
    }

    public reshowDiff(repositoryContext: RepositoryContext, itemsDescription, callback?: IResultCallback) {
        this.beginShowDiff(repositoryContext, itemsDescription, callback, this._rowsAboveThread, this._rowsBelowThread);
    }

    public beginShowDiff(repositoryContext: RepositoryContext, itemsDescription, callback?: IResultCallback, linesAbove: number = BuiltInDiffViewer.DIFF_PADDING_ROWS, linesBelow: number = BuiltInDiffViewer.DIFF_PADDING_ROWS) {
        this._itemsDescription = itemsDescription;
        let requestIndex = ++this._requestIndex,
            $statusContainer: JQuery,
            statusControl: StatusIndicator.StatusIndicator;

        this._emptyContents();

        $statusContainer = $(domElem("div", "status-container")).appendTo(this._element);
        statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $statusContainer, {
            center: true,
            imageClass: "big-status-progress",
            message: VCResources.ComparingFilesLoadMessage
        });

        this.delayExecute("showWaitIndicator", 200, true, () => {
            if (statusControl) {
                statusControl.start();
            }
        });

        this._repositoryContext = repositoryContext;

        this._beginGetFileDiff(itemsDescription,
            (diffModel: VCLegacyContracts.FileDiff) => {
                if (requestIndex === this._requestIndex && !this._disposed) {

                    $statusContainer.remove();

                    this.setDiffModel(diffModel, linesAbove, linesBelow);

                    if ($.isFunction(callback)) {
                        callback.call(this);
                        this._handleLayoutChanged();
                    }
                }
            }, (error) => {
                if (!this._disposed) {
                    $statusContainer.remove();
                    statusControl = null;

                    const notification = {
                        type: NotificationType.error,
                        message: getErrorMessage(error),
                        isDismissable: false,
                    } as Notification;

                    this.showDiffNotification(notification);

                    if ($.isFunction(callback)) {
                        callback.call(this);
                    }
                }
            });
    }

    public showDiffNotification(notification: Notification, renderers?: NotificationArea.Renderers): void {
        notification = {
            ...notification,
            key: "DiffSummary_ErrorNotification",
            isDismissable: false,
        };

        NotificationArea.renderInto(this._element[0], {
            notifications: [notification],
            renderers: renderers,
        });
    }

    public setDiffModel(diffModel: VCLegacyContracts.FileDiff, linesAbove: number = BuiltInDiffViewer.DIFF_PADDING_ROWS, linesBelow: number = BuiltInDiffViewer.DIFF_PADDING_ROWS) {
        let skipFirstDiffScroll: boolean;
        this._rowsAboveThread = Math.max(linesAbove, 0);
        this._rowsBelowThread = Math.max(linesBelow, 0);

        this._diffModel = diffModel;
        this._drawDiff(diffModel);
        skipFirstDiffScroll = this._drawDiscussionThreads();
        this._handleLayoutChanged();

        this._updateButtons();

        //goto the first diff block
        if (this._options.fixedSize && !skipFirstDiffScroll) {
            Utils_Core.delay(this, 100, () => {
                this.onNextClick();
            });
        }
    }

    // Gets a list of menu item IDs that are available (i.e. not disabled)
    private _getPossibleImageDiffModes() {
        const possibilities: string[] = [],
            menuItems = this._imageDiff.diffActionsToolbar.getItems();

        $.each(menuItems, function (index, menuItem) {
            if (!menuItem._item.disabled) {
                possibilities.push(menuItem._item.id);
            }
        });
        return possibilities;
    }

    // Changes the image diff mode to the specified mode.
    // savePreference: set false to supress saving the mode as the user's preference
    private _changeImageDiffMode(mode: VCWebAccessContracts.DiffViewerImageMode, savePreference: boolean = true, forCalculations: boolean = false, setFocusToSelectedMenuItem: boolean = true) {
        let enumValToId: { [index: string]: string; } = {},
            modeStr: string = mode + "",
            previousMode: string = this._imageDiff.mode + "",
            overlayModes: VCWebAccessContracts.DiffViewerImageMode[] = [VCWebAccessContracts.DiffViewerImageMode.Flipper, VCWebAccessContracts.DiffViewerImageMode.TrueDiff],
            clickedItem: Menus.MenuItem,
            
            // Get the integer val for each of the enum values
            flipperVal: string = VCWebAccessContracts.DiffViewerImageMode.Flipper + "",
            trueDiffVal: string = VCWebAccessContracts.DiffViewerImageMode.TrueDiff + "",
            twoUpVal: string = VCWebAccessContracts.DiffViewerImageMode.TwoUp + "";

        enumValToId[flipperVal] = imageDiffActionMenuItemIds.flipper;
        enumValToId[trueDiffVal] = imageDiffActionMenuItemIds.trueDiff;
        enumValToId[twoUpVal] = imageDiffActionMenuItemIds.twoUp;

        if (this._getPossibleImageDiffModes().indexOf(enumValToId[modeStr]) === -1) {
            // Unknown or unavailable mode, using default
            mode = BuiltInDiffViewer.DEFAULT_IMAGE_DIFF_MODE;
            modeStr = mode + "";
        }

        if (Utils_String.localeIgnoreCaseComparer(previousMode, modeStr) !== 0) {
            // Set user's image diff mode
            if (this._options.fixedSize && savePreference && mode) {
                this._repositoryContext.getClient().beginGetUserPreferences((preferences) => {
                    preferences.diffViewerImageMode = mode;
                    this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);
                });
            }

            this._imageDiff.mode = mode;
            this._imageDiff.isOverlay = overlayModes.indexOf(mode) > -1;

            this._updateImageDiffMenu();
            this._updateImageDiff(forCalculations);

            if (setFocusToSelectedMenuItem) {
                this._focusImageDiffActionMenuItemById(enumValToId[modeStr]);
            }
        }
    }

    // Returns the image dimensions for the given image dimensions, scaled to fit in the given box
    private _getScaledDimensions(boxWidth: number, boxHeight: number, imageWidth: number, imageHeight: number): ImageDimensions {
        let scaleFactor, scaledWidth = imageWidth, scaledHeight = imageHeight;

        if (imageWidth > boxWidth) {
            // Original image scaled to fit in terms of width
            scaleFactor = boxWidth / imageWidth;
            scaledWidth = scaleFactor * imageWidth;
            scaledHeight = scaleFactor * imageHeight;
        }
        if (scaledHeight > boxHeight) {
            // We caled to fit the width, but if we still need to scale the height, do it
            scaleFactor = boxHeight / scaledHeight;
            scaledWidth = scaleFactor * scaledWidth;
            scaledHeight = scaleFactor * scaledHeight;
        }
        // Did you know that the width attribute gets "floored", but the width CSS attribute gets "rounded"? Make sure we return integers...
        return { width: Math.round(scaledWidth), height: Math.round(scaledHeight) };
    }

    // Does most of the work to update the image diff view
    private _updateImageDiff(forCalculations: boolean = false) {

        if (!this._element) {
            return;
        }

        let origWidth: number,
            origHeight: number,
            modWidth: number,
            modHeight: number,
            boxWidth: number,
            boxHeight: number,
            origScaled: number,
            modScaled: number,
            origSideSpace: number,
            modSideSpace: number,
            maxInlineHeight: number,
            idealHeight: number,
            computedContainerHeight: number,
            containerWidth: number,
            containerHeight: number,
            origScaledWidth: number,
            origScaledHeight: number,
            modScaledWidth: number,
            modScaledHeight: number,
            imagesContainerMinHeight: number = parseInt(this._imageDiff.elements.$imagesContainer.css("min-height").replace("px", "")),
            discussionsHeight: number = this._$fileLevelDiscussionsContainer ? this._$fileLevelDiscussionsContainer.height() : 0;

        if (typeof this._imageDiff.sideBySideHeight === "undefined" && this._orientation === VCWebAccessContracts.DiffViewerOrientation.SideBySide) {
            this._element.removeClass("inline");
            this._element.addClass("side-by-side");
            this._imageDiff.sideBySideHeight = Math.max(
                this._imageDiff.elements.$leftImageContainer.find("img")[0].offsetHeight,
                this._imageDiff.elements.$rightImageContainer.find("img")[0].offsetHeight);
        } else if (typeof this._imageDiff.inlineHeight === "undefined" && this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
            this._element.removeClass("side-by-side");
            this._element.addClass("inline");
            this._imageDiff.inlineHeight = Math.max(
                this._imageDiff.elements.$leftImageContainer.find("img")[0].offsetHeight,
                this._imageDiff.elements.$rightImageContainer.find("img")[0].offsetHeight);
        }
        // Inline causes problems except in true inline diff, so we add it back later if necessay.
        this._element.removeClass("inline");
        this._element.addClass("side-by-side");

        this._element.toggleClass("image-diff-overlay", this._imageDiff.isOverlay);
        if (this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.Flipper) {
            this._imageDiff.elements.$flipButton.show();
        } else {
            this._imageDiff.elements.$flipButton.hide();
            this._resetFlipStates(forCalculations);
        }
        if (this._imageDiff.mode !== VCWebAccessContracts.DiffViewerImageMode.TrueDiff && typeof this._imageDiff.elements.$canvas === "object") {
            this._imageDiff.elements.$canvas.hide();
        }

        origWidth = this._imageDiff.originalImage.dimensions.width;
        origHeight = this._imageDiff.originalImage.dimensions.height;
        modWidth = this._imageDiff.modifiedImage.dimensions.width;
        modHeight = this._imageDiff.modifiedImage.dimensions.height;

        boxWidth = this._imageDiff.elements.$imagesContainer[0].offsetWidth;
        this._imageDiff.elements.$imagesContainer.css({ top: (this._imageDiff.elements.$imagesContainer.data("topValue") + (discussionsHeight > 0 ? (discussionsHeight + 15) : 0)) });
        if (this._options.fixedSize) {
            boxHeight = Math.max(imagesContainerMinHeight, document.documentElement.clientHeight - this._imageDiff.elements.$imagesContainer.offset().top - this._imageDiff.standardMargin - this._imageDiff.standardBorderSize * 2);
        } else {
            if (this._orientation === VCWebAccessContracts.DiffViewerOrientation.SideBySide) {
                boxHeight = this._imageDiff.sideBySideHeight;
            } else {
                maxInlineHeight = BuiltInDiffViewer.MAX_INLINE_HEIGHT * 2 + this._imageDiff.standardMargin;
                idealHeight = this._imageDiff.inlineHeight * 2 + this._imageDiff.standardMargin;
                boxHeight = Math.min(maxInlineHeight, idealHeight);
            }
            boxHeight += discussionsHeight;
            computedContainerHeight = boxHeight + this._imageDiff.elements.$controls.height() + this._imageDiff.standardBorderSize + this._imageDiff.standardMargin;
            this._imageDiff.elements.$container.css({ height: computedContainerHeight });
        }

        this._imageDiff.elements.$imagesContainer.css({ height: boxHeight });
        this._imageDiff.origScaled = this._getScaledDimensions(boxWidth, boxHeight, origWidth, origHeight);
        this._imageDiff.modScaled = this._getScaledDimensions(boxWidth, boxHeight, modWidth, modHeight);

        if (this._imageDiff.isOverlay) {
            // calculate the space on the left and right (if there is any)
            origSideSpace = (boxWidth - this._imageDiff.origScaled.width) / 2;
            modSideSpace = (boxWidth - this._imageDiff.modScaled.width) / 2;

            // now set the positions
            this._imageDiff.elements.$leftImageContainer.css(
                { left: origSideSpace, width: this._imageDiff.origScaled.width, height: this._imageDiff.origScaled.height });
            this._imageDiff.elements.$rightImageContainer.css(
                { left: modSideSpace, width: this._imageDiff.modScaled.width, height: this._imageDiff.modScaled.height });

            // Set the image sizes too for X-browser compat...
            this._imageDiff.elements.$leftImageContainer.find("img").css({ width: this._imageDiff.origScaled.width, height: this._imageDiff.origScaled.height });
            this._imageDiff.elements.$rightImageContainer.find("img").css({ width: this._imageDiff.modScaled.width, height: this._imageDiff.modScaled.height });

            if (this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.TrueDiff) {
                this._computeTrueDiff();
                this._imageDiff.elements.$canvas.css({ left: Math.max(origSideSpace, modSideSpace) });
            } else {
                this._flipImages();
            }
        } else {
            if (this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
                this._imageDiff.elements.$leftImageContainer.find("img").css(this._getScaledDimensions(boxWidth, (boxHeight - this._imageDiff.standardMargin) / 2, origWidth, origHeight));
                this._imageDiff.elements.$rightImageContainer.find("img").css(this._getScaledDimensions(boxWidth, (boxHeight - this._imageDiff.standardMargin) / 2, modWidth, modHeight));

                this._element.removeClass("side-by-side");
                this._element.addClass("inline");
            } else {
                ;
                this._imageDiff.elements.$leftImageContainer.find("img").css(this._getScaledDimensions((boxWidth - this._imageDiff.standardMargin) / 2, boxHeight, origWidth, origHeight));
                this._imageDiff.elements.$rightImageContainer.find("img").css(this._getScaledDimensions((boxWidth - this._imageDiff.standardMargin) / 2, boxHeight, modWidth, modHeight));
            }
            this._imageDiff.elements.$leftImageContainer.css({ width: "", height: "" });
            this._imageDiff.elements.$rightImageContainer.css({ width: "", height: "" });
        }
        this._imageDiff.elements.$imagesContainer.find("img").removeClass("hide-image-while-loading");
    }    
    
    // Computes the RGB subtraction for each pixel and renders the result in a <canvas> element
    private _computeTrueDiff() {
        if (typeof this._imageDiff.elements.$canvas === "undefined") {
            let origImage = <HTMLImageElement>this._imageDiff.elements.$leftImageContainer.find("img")[0],
                modImage = <HTMLImageElement>this._imageDiff.elements.$rightImageContainer.find("img")[0],
                fullOrigWidth = this._imageDiff.originalImage.dimensions.width,
                fullOrigHeight = this._imageDiff.originalImage.dimensions.height,
                origWidth = this._imageDiff.origScaled.width,
                origHeight = this._imageDiff.origScaled.height,

                $canvas = $(domElem("canvas", "true-image-diff")).attr({ width: origWidth, height: origHeight, title: VCResources.PixelDiffCanvasTitle }),
                canvas = <HTMLCanvasElement>$canvas[0],
                context = <CanvasRenderingContext2D>canvas.getContext("2d"),

                origImageData: ImageData,
                modImageData: ImageData,
                result: ImageData;

            context.drawImage(origImage, 0, 0, fullOrigWidth, fullOrigHeight, 0, 0, origWidth, origHeight);
            origImageData = <ImageData>context.getImageData(0, 0, origWidth, origHeight);
            context.clearRect(0, 0, origWidth, origHeight);

            context.drawImage(modImage, 0, 0, fullOrigWidth, fullOrigHeight, 0, 0, origWidth, origHeight);
            modImageData = <ImageData>context.getImageData(0, 0, origWidth, origHeight);
            result = <ImageData>context.getImageData(0, 0, origWidth, origHeight);

            // Data is a linear array, each pixel is represented by 4 sequential values (RGBa)
            for (let i = 0; i < result.data.length; i += 4) {
                result.data[i] = Math.abs(origImageData.data[i] - modImageData.data[i]);
                result.data[i + 1] = Math.abs(origImageData.data[i + 1] - modImageData.data[i + 1]);
                result.data[i + 2] = Math.abs(origImageData.data[i + 2] - modImageData.data[i + 2]);
                result.data[i + 3] = 255; // fully opaque
            }
            context.putImageData(result, 0, 0, 0, 0, origWidth, origHeight);
            $canvas.appendTo(this._imageDiff.elements.$imagesContainer);
            this._imageDiff.elements.$canvas = $canvas;
        } else {
            this._imageDiff.elements.$canvas.show();
        }
    }

    // Calculates and saves ratios and sets the first diff mode
    private _afterImageLoad() {

        // If the images were already fully loaded, don't recompute everything, just update the image containers
        // otherwise, this is a perf bottleneck where every time discussions update, a ton of image computation happens
        if (this._imageDiff.fullyLoaded) {
            this._updateImageDiff(true);
        }
        // Make sure both images have been loaded and we have recorded their width and height
        else if (this._imageDiff.originalImage && this._imageDiff.originalImage.loaded && this._imageDiff.modifiedImage && this._imageDiff.modifiedImage.loaded) {
            this._imageDiff.fullyLoaded = true;
            this._imageDiff.originalImage.ratio = this._imageDiff.originalImage.dimensions.height / this._imageDiff.originalImage.dimensions.width;
            this._imageDiff.modifiedImage.ratio = this._imageDiff.modifiedImage.dimensions.height / this._imageDiff.modifiedImage.dimensions.width;
            if (this._imageDiff.originalImage.dimensions.height === this._imageDiff.modifiedImage.dimensions.height &&
                this._imageDiff.originalImage.dimensions.width === this._imageDiff.modifiedImage.dimensions.width) {
                // Dimensions are the same, enable pixel diff
                this._imageDiff.sameSize = true;
            } else {
                this._imageDiff.sameSize = false;
            }
            this._updateImageDiffMenu();

            // First load two-up so we can make initial calculations
            this._changeImageDiffMode(VCWebAccessContracts.DiffViewerImageMode.TwoUp, false, true, false);

            // Get user's setting for image diff mode and switch to that if it's different.
            if (this._options.fixedSize) {
                this._repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
                    if (preferences.diffViewerImageMode !== VCWebAccessContracts.DiffViewerImageMode.TwoUp) {
                        this._changeImageDiffMode(preferences.diffViewerImageMode, true, false, false);
                    }
                });
            }
            this._imageDiff.elements.$imagesContainer.find("img.diff-image").css("visibility", "");
        }
    }

    // Handles clicking on the flip button
    private _flipClickHandler() {
        if (this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.Flipper) {
            this._imageDiff.flipState = this._imageDiff.flipState === "modified" ? "original" : "modified";
            this._flipImages();
        }
    }

    private _flipImages() {
        let flipState: string = this._imageDiff.flipState;
        if (flipState !== "original" && flipState !== "modified") {
            flipState = this._imageDiff.flipState = "modified";
        }

        if (this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.Flipper) {
            if (this._imageDiff.flipState === "original") {
                this._imageDiff.elements.$flipButton.text(VCResources.ShowModifiedImageButtonText);
                this._imageDiff.elements.$leftImageContainer.css({ visibility: "" });
                this._imageDiff.elements.$rightImageContainer.css({ visibility: "hidden" });
                this._fire("image-diff-version-selected", { side: "left" });
            } else {
                this._imageDiff.elements.$flipButton.text(VCResources.ShowOriginalImageButtonText);
                this._imageDiff.elements.$leftImageContainer.css({ visibility: "hidden" });
                this._imageDiff.elements.$rightImageContainer.css({ visibility: "" });
                this._fire("image-diff-version-selected", { side: "right" });
            }
        }
    }

    // Resets the flip states for when flip mode is exited
    private _resetFlipStates(rememberState: boolean = false) {
        this._imageDiff.elements.$flipButton.text(VCResources.ShowOriginalImageButtonText);
        this._imageDiff.elements.$leftImageContainer.css({ visibility: "" });
        this._imageDiff.elements.$rightImageContainer.css({ visibility: "" });
        this._fire("image-diff-version-selected", { side: "none" });
        if (!rememberState) {
            this._imageDiff.flipState = null;
        }
    }
    
    // True if <canvas> is supported
    private _isCanvasSupported() {
        const elem: HTMLCanvasElement = <HTMLCanvasElement>domElem("canvas");
        return !!(elem.getContext && elem.getContext("2d"));
    }

    public _drawDiff(diffModel: VCLegacyContracts.FileDiff) {

        let originalItemTitle: string,
            modifiedItemTitle: string,
            message: string;

        this._element.toggleClass("side-by-side", this._orientation === VCWebAccessContracts.DiffViewerOrientation.SideBySide);
        this._element.toggleClass("inline", this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline);
        this._element.removeClass("same-images showing-message");

        this._$headerContainer = $(domElem("div", "diff-header"))
            .appendTo(this._element);

        if (diffModel.imageComparison) {
            this._drawImageDiff(diffModel);
            return;
        } 

        // If it isn't an image, clear the image state and continue.
        this._clearImageDiff();
        if (diffModel.binaryContent) {

            // Binary file comparisons
            if (diffModel.originalFile && diffModel.modifiedFile) {
                originalItemTitle = Utils_String.format(VCResources.SccItemTitle, diffModel.originalFile.serverItem, diffModel.originalFile.versionDescription);
                modifiedItemTitle = Utils_String.format(VCResources.SccItemTitle, diffModel.modifiedFile.serverItem, diffModel.modifiedFile.versionDescription);

                if (diffModel.identicalContent) {
                    message = Utils_String.format(VCResources.DiffFilesAreIdentical, originalItemTitle, modifiedItemTitle);
                }
                else if (diffModel.originalFileTruncated || diffModel.modifiedFileTruncated) {
                    message = Utils_String.format(VCResources.DiffFilesAreLargeBinaryFiles, originalItemTitle, modifiedItemTitle);
                }
                else {
                    message = Utils_String.format(VCResources.DiffFilesAreDifferent, originalItemTitle, modifiedItemTitle);
                }
            }
            else if (diffModel.originalFile) {
                message = VCResources.BinaryContentDeleted;
            }
            else {
                message = VCResources.BinaryContentAdded;
            }

            $(domElem("div", "diff-message binary")).text(message).appendTo(this._$headerContainer);
        }
        else if (diffModel.emptyContent) {
            $(domElem("div", "vc-builtin-file-viewer-message")).text(VCResources.FileIsEmpty).appendTo(this._$headerContainer);
        }
        else {
            // (normal) text comparisons
            this._drawTextDiff(diffModel);
        }
    }

    private _updateImageDiffMenu() {
        if (this._imageDiff.elements.$controls) {
            this._imageDiff.elements.$controls.remove();
        }

        const $imageDiffControls = this._imageDiff.elements.$controls = $(domElem("div", "image-diff-controls")).hide().prependTo(this._imageDiff.elements.$container);
        const $imageDiffToolbar = $(domElem("div", "image-diff-toolbar toolbar")).appendTo($imageDiffControls);

        // If canvas not supported, no controls
        if (this._isCanvasSupported()) {
            $imageDiffControls.show();
        }

        // Add the flip button for "Flipper" diff mode
        this._imageDiff.elements.$flipButton = $(domElem("button", "flip-button"))
            .text(VCResources.ShowOriginalImageButtonText)
            .on("click", delegate(this, this._flipClickHandler))
            .appendTo($imageDiffToolbar);

        // Draw the image diff options menubar
        this._imageDiff.diffActionsToolbar = <Menus.Toolbar>Controls.BaseControl.createIn(Menus.Toolbar, $imageDiffToolbar, {
            cssClass: "image-diff-actions",
            items: [{
                id: imageDiffActionMenuItemIds.flipper,
                showText: false,
                icon: "bowtie-icon bowtie-diff-image-overlay",
                disabled: false,
                title: VCResources.ABFlipTitleText,
                toggled: this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.Flipper,
                action: delegate(this, function () {
                    this._changeImageDiffMode(VCWebAccessContracts.DiffViewerImageMode.Flipper);
                })
            }, {
                    id: imageDiffActionMenuItemIds.trueDiff,
                    showText: false,
                    icon: "bowtie-icon bowtie-diff-image-pixel",
                    disabled: this._imageDiff.sameSize ? false : true,
                    title: this._imageDiff.sameSize ? VCResources.PixelDiffTitleText : VCResources.PixelDiffDisabledTitle,
                    toggled: this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.TrueDiff,
                    action: delegate(this, function () {
                        this._changeImageDiffMode(VCWebAccessContracts.DiffViewerImageMode.TrueDiff);
                    })
                }, {
                    id: imageDiffActionMenuItemIds.twoUp,
                    showText: false,
                    icon: this._orientation === VCWebAccessContracts.DiffViewerOrientation.SideBySide ? "bowtie-icon bowtie-diff-side-by-side" : "bowtie-icon bowtie-diff-image",
                    disabled: false,
                    title: VCResources.TwoUpDiffTitleText,
                    toggled: this._imageDiff.mode === VCWebAccessContracts.DiffViewerImageMode.TwoUp,
                    action: delegate(this, function () {
                        this._changeImageDiffMode(VCWebAccessContracts.DiffViewerImageMode.TwoUp);
                    })
                }]
        });
    }

    private _focusImageDiffActionMenuItemById(menuItemId: string): void {
        if (menuItemId && this._imageDiff && this._imageDiff.diffActionsToolbar) {
            const menuItem = this._imageDiff.diffActionsToolbar.getItem(menuItemId);
            menuItem && this._imageDiff.diffActionsToolbar._selectItem(menuItem);
        }
    }

    /**
     *   When switching from an image comparison to a normal comparison, this
     *   method will clear the image state so that _handleLayoutChanged does not
     *   attempt to redraw images when none exist.
     */
    private _clearImageDiff() {
        this._imageDiff.originalImage = null;
        this._imageDiff.modifiedImage = null;
        this._imageDiff.fullyLoaded = false;
    }

    private _drawImageDiff(diffModel: VCLegacyContracts.FileDiff) {
        let $leftImageContainer: JQuery,
            $rightImageContainer: JQuery,
            $imagesContainer: JQuery,
            $container: JQuery,
            $imgLoad: JQuery,
            modVisibility: string = "",
            url: string,
            isDiff: boolean = (diffModel.originalFile && diffModel.modifiedFile) ? true : false,
            originalExtIsIco: boolean,
            visibility: string = isDiff ? "hidden" : "";

        this._imageDiff.elements = <ImageDiffElements>{};
        this._imageDiff.fullyLoaded = false;

        this._resetImageDiffConstants();

        $container = $(domElem("div", "image-diff-container")).appendTo(this._element);
        this._imageDiff.elements.$container = $container;
        this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo($container);
        this._$fileLevelDiscussionsContainer.hide();
        $imagesContainer = $(domElem("div", "images-container")).appendTo($container);
        $imagesContainer.data("topValue", parseInt($imagesContainer.css("top").replace("px", "")));
        this._imageDiff.elements.$imagesContainer = $imagesContainer;

        this._element.addClass("image-diff");

        if (diffModel.identicalContent) {
            $(domElem("div", "diff-message"))
                .text(VCResources.ImagesAreSameMessage)
                .appendTo(this._$headerContainer);
            this._element.addClass("same-images");
        }

        if (diffModel.originalFile) {
            if (isDiff) {
                this._updateImageDiffMenu();
            }

            url = VersionControlUrls.getFileContentUrl(this._repositoryContext, diffModel.originalFile.serverItem, diffModel.originalFile.version);
            this._imageDiff.originalImage = { url: url, dimensions: <ImageDimensions>{} };

            // Since we don't know the width and height of the image, and we can't get it until attaching
            // it to the DOM, we first load the full-sized image off of the screen and take its measurements.
            $imgLoad = $(domElem("img", "hide-image-while-loading")).attr("src", url).css({ position: "absolute", left: "-99999px" }).appendTo(document.body);
            $imgLoad.one("load", null, this, function (e) {
                e.data._imageDiff.originalImage.dimensions.width = this.width;
                e.data._imageDiff.originalImage.dimensions.height = this.height;
                e.data._imageDiff.originalImage.loaded = true;
                e.data._afterImageLoad();
                e.data._fire("image-dimensions-calculated", { leftWidth: this.width, leftHeight: this.height });
                $(this).remove();
            });

            $leftImageContainer = $(domElem("div", "left-image-container image-container")).appendTo($imagesContainer);
            this._imageDiff.elements.$leftImageContainer = $leftImageContainer;
            $(domElem("img", "diff-image"))
                .attr({ src: url, title: Utils_String.format(VCResources.ImageTitle, diffModel.originalFile.serverItem, diffModel.originalFile.versionDescription) })
                .on("click", delegate(this, this._flipClickHandler))
                .css("visibility", visibility)
                .appendTo($(domElem("div", "original-image")).appendTo($leftImageContainer));

            originalExtIsIco = Utils_String.localeIgnoreCaseComparer(diffModel.originalFile.serverItem.substr(diffModel.originalFile.serverItem.length - 4), ".ico") === 0;
            if (originalExtIsIco) {
                $(domElem("div", "diff-message ico")).text(VCResources.DiffICOFileWarning).appendTo(this._$headerContainer);
                this._element.addClass("showing-message");
            }
        }
        if (diffModel.modifiedFile) {
            url = VersionControlUrls.getFileContentUrl(this._repositoryContext, diffModel.modifiedFile.serverItem, diffModel.modifiedFile.version);
            this._imageDiff.modifiedImage = { url: url, dimensions: <ImageDimensions>{} };

            // Since we don't know the width and height of the image, and we can't get it until attaching
            // it to the DOM, we first load the full-sized image off of the screen and take its measurements.
            $imgLoad = $(domElem("img", "hide-image-while-loading")).attr("src", url).css({ position: "absolute", left: "-99999px" }).appendTo(document.body);
            $imgLoad.one("load", null, this, function (e: JQueryEventObject) {
                e.data._imageDiff.modifiedImage.dimensions.width = this.width;
                e.data._imageDiff.modifiedImage.dimensions.height = this.height;
                e.data._imageDiff.modifiedImage.loaded = true;
                e.data._afterImageLoad();
                e.data._fire("image-dimensions-calculated", { rightWidth: this.width, rightHeight: this.height });
                $(this).remove();
            });

            $rightImageContainer = $(domElem("div", "right-image-container image-container")).appendTo($imagesContainer);
            this._imageDiff.elements.$rightImageContainer = $rightImageContainer;

            const $diffImage = $(domElem("img", "diff-image"))
                .attr({ src: url })
                .on("click", delegate(this, this._flipClickHandler))
                .css("visibility", visibility)
                .appendTo($(domElem("div", "modified-image")).appendTo($rightImageContainer));
            PopupContent.RichContentTooltip.add(
                Utils_String.format(VCResources.ImageTitle, diffModel.modifiedFile.serverItem, diffModel.modifiedFile.versionDescription),
                $diffImage);

            // If we're not already showing the message, but the modified file is an ico, show the ico message
            if (!originalExtIsIco && Utils_String.localeIgnoreCaseComparer(diffModel.modifiedFile.serverItem.substr(diffModel.modifiedFile.serverItem.length - 4), ".ico") === 0) {
                $(domElem("div", "diff-message ico")).text(VCResources.DiffICOFileWarning).appendTo(this._$headerContainer);
                this._element.addClass("showing-message");
            }
        }
    }

    private _drawTextDiff(diffModel: VCLegacyContracts.FileDiff) {

        this._shownTruncatedMessage = false;

        // Show message for truncated and identical content
        if (diffModel.originalFileTruncated || diffModel.modifiedFileTruncated) {
            this._getFileTruncatedWarning().appendTo(this._$headerContainer);
            this._shownTruncatedMessage = true;
        }

        this._removeDiffBlocksFromFileTruncation(diffModel);

        if (diffModel.blocks && diffModel.blocks.length && !diffModel.whitespaceChangesOnly) {

            this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo(this._$headerContainer);
            this._$fileLevelDiscussionsContainer.hide();

            this._$hiddenCommentsElement = $(domElem("div", "hidden-comments diff-message")).appendTo(this._$headerContainer);

            if (!diffModel.originalFile || !diffModel.modifiedFile) {
                // Force "inline" draw if no original or diff side
                this._element.removeClass("side-by-side");
                this._element.addClass("inline");
                this._drawInlineDiff(diffModel);
            }
            else if (this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
                this._drawInlineDiff(diffModel);
            }
            else {
                this._drawSideBySideDiff(diffModel);
            }

            if (!this._shownTruncatedMessage && this._numRowsRendered >= BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS) {
                this._getFileTruncatedWarning().appendTo(this._$headerContainer);
                this._shownTruncatedMessage = true;
            }
        }

        if (!this._shownTruncatedMessage) {
            if (diffModel.identicalContent) {
                $(domElem("div", "diff-message identical")).text(VCResources.IdenticalFilesMessage).appendTo(this._$headerContainer);
            }
            else if (diffModel.whitespaceChangesOnly) {
                $(domElem("div", "diff-message identical")).text(VCResources.FilesDifferOnlyInWhitespaceMessage).appendTo(this._$headerContainer);
            }
        }
    }

    /** Remove the last diff blocks that are artifacts of partial diffs and truncated files (these are not real file changes) */
    private _removeDiffBlocksFromFileTruncation(diffModel: VCLegacyContracts.FileDiff) {

        // Check if a partial diff and the max file limit was exceeded. We cannot trust the last block if it is a "changed" block
        // because if the line numbers have shifted (i.e. different number of lines added than deleted), then there 
        // will be an add/delete diff-block included at the end here for lines that did not necessarily change
        if (this._options.partialDiff && (diffModel.originalFileTruncated || diffModel.modifiedFileTruncated) && diffModel.blocks) {

            // blockCount will decrement for each block that should be removed.
            let blockCount = diffModel.blocks.length;

            // First, there is the relatively rare edge case where partial diffs for truncated files will end with a block of changeType FileDiffBlockChangeType.None
            // that includes only a single line of whitespace characters that were incorrectly considered a match.  This block should be removed.
            if (blockCount > 0) {
                const lastBlock = diffModel.blocks[blockCount - 1];
                if (lastBlock.changeType === VCLegacyContracts.FileDiffBlockChangeType.None &&
                    lastBlock.oLines && lastBlock.oLines.length === 1 &&
                    lastBlock.mLines && lastBlock.mLines.length === 1) {

                    if (lastBlock.oLines[0].replace(/\s/g, "").length === 0 && lastBlock.mLines[0].replace(/\s/g, "").length === 0) {
                        blockCount--;
                    }
                }
            }

            // Next, remove the false "changed" block that results from the truncated file, as explained above.
            if (blockCount > 0 && diffModel.blocks[blockCount - 1].changeType !== VCLegacyContracts.FileDiffBlockChangeType.None) {
                blockCount--;

                // Finally, if we removed a false changed block, then remove the redundant "linesAbove" matching block that typically precedes a change.
                if (blockCount > 1 &&
                    diffModel.blocks[blockCount - 1].changeType === VCLegacyContracts.FileDiffBlockChangeType.None &&
                    diffModel.blocks[blockCount - 2].changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                    blockCount--;
                }
            }

            // Now remove the false blocks from the array
            if (blockCount < diffModel.blocks.length) {
                diffModel.blocks.splice(blockCount, diffModel.blocks.length - blockCount);

                //If we received line character blocks back, give them the same truncation
                if (diffModel.lineCharBlocks) {
                    diffModel.lineCharBlocks.splice(blockCount, diffModel.lineCharBlocks.length - blockCount);
                }
            }
        }
    }

    private _getFileTruncatedWarning() {
        const $div = $(domElem("div", "diff-message truncated"));

        if (this._updateDiffOrientationCallback && this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
            const $link = $(domElem("div")).append($(domElem("a")).text(VCResources.SideBySide));
            $div.html(Utils_String.format(VCResources.ItemCompareContentTrimmedSwitchTo, $link.html()));
            $div.find("a").click(() => {
                this._updateDiffOrientationCallback();
            });
        }
        else {
            $div.text(this._contentTruncatedMessage);
        }

        return $div;
    }

    private _addFileSummaryCount(linesAdded: number, linesDeleted: number) {
        // Add summary level info if we have a valid element and it has not been added already
        if (this._$summaryRowElement && this._$summaryRowElement.find('span.diff-line-count-container').length === 0) {
            // Cache the line counts
            const diffLineCountService: DiffCountService.IDiffCountService = DiffCountService.getDiffCountService(this._repositoryContext);
            diffLineCountService.setLineCounts({
                    opath: this._diffModel.opath,
                    oversion: this._diffModel.oversion,
                    mpath: this._diffModel.mpath,
                    mversion: this._diffModel.mversion
            } as DiffCountService.IDiffLineCountOptions, {
                    linesAdded: linesAdded,
                    linesDeleted: linesDeleted
                } as DiffCountService.DiffFileLineCount
            );

            // Add the elements
            const $fileCountContainerElement = $(domElem("span", "diff-line-count-container")).appendTo(this._$summaryRowElement);
            if (linesAdded > 0) {
                const $fileLinesAddedElement = $(domElem("span", "file-lines-added"))
                    .text(Utils_String.format(VCResources.LinesAddedHeader, linesAdded))
                    .appendTo($fileCountContainerElement);
                PopupContent.RichContentTooltip.add(
                    Utils_String.format(VCResources.LinesAddedToolTip, linesAdded),
                    $fileLinesAddedElement);
            }

            if (linesDeleted > 0) {
                const $fileLinesDeletedElement = $(domElem("span", "file-lines-deleted"))
                    .text(Utils_String.format(VCResources.LinesDeletedHeader, linesDeleted))
                    .appendTo($fileCountContainerElement);
                PopupContent.RichContentTooltip.add(
                    Utils_String.format(VCResources.LinesDeletedToolTip, linesDeleted),
                    $fileLinesDeletedElement);
            }

            if ((linesAdded > 0 || linesDeleted > 0)) {
                const fileNameDiffLinesCountDescriptionClassName = "filename-diff-lines-count-description";
                const $fileNameLink = this._$summaryRowElement.find("a.file-name-link");
                if (this._$summaryRowElement.find("." + fileNameDiffLinesCountDescriptionClassName).length === 0 &&
                    $fileNameLink.length > 0) {
                        const fileNameDiffLinesCountDescriptionElementId = fileNameDiffLinesCountDescriptionClassName + "-" + Controls.getId();
                        const $fileNameDiffLinesCountDescriptionElement = $(domElem("div", fileNameDiffLinesCountDescriptionClassName + " hidden"))
                            .attr("id", fileNameDiffLinesCountDescriptionElementId)
                            .appendTo(this._$summaryRowElement);

                        if (linesAdded > 0 && linesDeleted > 0) {
                            $fileNameDiffLinesCountDescriptionElement.text(Utils_String.format(VCResources.LinesAddedAndDeletedAriaDescription, linesAdded, linesDeleted));
                        } else if (linesAdded > 0) {
                            $fileNameDiffLinesCountDescriptionElement.text(Utils_String.format(VCResources.LinesAddedToolTip, linesAdded));
                        } else if (linesDeleted > 0) {
                            $fileNameDiffLinesCountDescriptionElement.text(Utils_String.format(VCResources.LinesDeletedToolTip, linesDeleted));
                        }

                        const fileNameLinkAriaDescribedBy = $.trim($fileNameLink.attr("aria-describedby") || "");
                        if (fileNameLinkAriaDescribedBy) {
                            $fileNameLink.attr("aria-describedby", fileNameLinkAriaDescribedBy + " " + fileNameDiffLinesCountDescriptionElementId);
                        } else {
                            $fileNameLink.attr("aria-describedby", fileNameDiffLinesCountDescriptionElementId);
                        }
                }
            }
        }
    }

    private _drawInlineDiff(diffModel: VCLegacyContracts.FileDiff) {

        let linesWidth: number,
            linesOffset = BuiltInDiffViewer.TEXT_DIFF_GUTTER_WIDTH;

        this._$inlineDiffContainer = $(domElem("div", "text-diff-container"))
            .attr("role", "presentation");

        if (this._options.fixedSize) {
            this._$inlineDiffContainer.bind('click', delegate(this, this.onContentClick));
            }

        let linesAdded: number = 0;
        let linesDeleted: number = 0;
        $.each(diffModel.lineCharBlocks, (i, lineCharBlock) => {
            const block: VCLegacyContracts.FileDiffBlock = lineCharBlock.lineChange;
            this._startRowIndexByBlockIndex[i] = this._numRowsRendered;

            if (i === 0) {
                if (this._options.expandable) {
                    this._addExpander(i, true, block.truncatedBefore, false);
                } else if (block.truncatedBefore) {
                    this._addEllipsisLineToDiffContainer(i, false, this._$inlineDiffContainer, true, diffModel, false);
                }
            }

            if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                this._addLines(block.mLines, block.oLine, block.mLine, VCOM.FileDiffBlockChangeType.None, i, diffModel, true, this._$inlineDiffContainer, false, null);
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add) {
                this._addLines(block.mLines, 0, block.mLine, VCOM.FileDiffBlockChangeType.Add, i, diffModel, true, this._$inlineDiffContainer, false, null, true);
                linesAdded += block.mLinesCount;
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Delete) {
                this._addLines(block.oLines, block.oLine, 0, VCOM.FileDiffBlockChangeType.Delete, i, diffModel, true, this._$inlineDiffContainer, false, null, true);
                linesDeleted += block.oLinesCount;
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                this._addLines(block.oLines, block.oLine, 0, VCOM.FileDiffBlockChangeType.Delete, i, diffModel, true, this._$inlineDiffContainer, false, null, false, lineCharBlock.charChange);
                this._addLines(block.mLines, 0, block.mLine, VCOM.FileDiffBlockChangeType.Add, i, diffModel, true, this._$inlineDiffContainer, false, null, false, lineCharBlock.charChange);
                linesAdded += block.mLinesCount;
                linesDeleted += block.oLinesCount;
            }

            if (i === diffModel.blocks.length - 1 && this._options.expandable) {
                this._addExpander(i, false, block.truncatedAfter, false);
            }
            else if (block.truncatedAfter) {
                this._addEllipsisLineToDiffContainer(i, i !== diffModel.blocks.length - 1, this._$inlineDiffContainer, true, diffModel, false);
            }

            if (this._numRowsRendered >= BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS) {
                return false;
            }
        });

        this.setTabIndexOnFirstAddCommentDivInDiffContainer(this._$inlineDiffContainer);

        // Add summary counts
        this._addFileSummaryCount(linesAdded, linesDeleted); 

        this._$inlineDiffContainer.appendTo(this._element);
    }

    private _drawSideBySideDiff(diffModel: VCLegacyContracts.FileDiff) {

        let $originalContainer: JQuery,
            $modifiedContainer: JQuery,
            linesWidth: number;

        this._sideBySideSplitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, this._element, {
            cssClass: "text-diff-container",
            fixedSide: "left",
            vertical: false
        });

        // Using a stack to protect from scroll event looping
        this._originalScrolling = [];
        this._modifiedScrolling = [];

        $originalContainer = $(domElem("div", "side-by-side-container original"))
            .appendTo(this._sideBySideSplitter.leftPane);

        this._sideBySideSplitter.leftPane
            .bind("scroll", delegate(this, this._onOriginalScroll));

        $modifiedContainer = $(domElem("div", "side-by-side-container modified"))
            .appendTo(this._sideBySideSplitter.rightPane);

        this._sideBySideSplitter.rightPane
            .bind("scroll", delegate(this, this._onModifiedScroll));

        this._$sideBySideOriginalDiffContainer = $(domElem("div", "side-by-side-diff-container original"))
            .attr("role", "presentation");

        this._$sideBySideModifiedDiffContainer = $(domElem("div", "side-by-side-diff-container modified"))
            .attr("role", "presentation");

        if (this._options.fixedSize) {
            this._$sideBySideOriginalDiffContainer.bind("click", delegate(this, this.onContentClick));
            this._$sideBySideModifiedDiffContainer.bind("click", delegate(this, this.onContentClick));
        }

        let linesAdded: number = 0;
        let linesDeleted: number = 0;
        $.each(diffModel.lineCharBlocks, (i: number, lineCharBlock: VCLegacyContracts.FileCharDiffBlock) => {
            const block: VCLegacyContracts.FileDiffBlock = lineCharBlock.lineChange;

            this._startRowIndexByBlockIndex[i] = this._numRowsRendered;

            if (i === 0) {
                if (this._options.expandable) {
                    this._addExpander(i, true, block.truncatedBefore, true, true);
                }
                else if (block.truncatedBefore) {
                    this._addEllipsisLineToDiffContainer(i, false, this._$sideBySideOriginalDiffContainer, false, diffModel, true, true);
                    this._addEllipsisLineToDiffContainer(i, false, this._$sideBySideModifiedDiffContainer, true, diffModel, true, false);
                }
            }

            if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.None) {
                this._addLines(block.oLines, block.oLine, 0, VCOM.FileDiffBlockChangeType.None, i, diffModel, false, this._$sideBySideOriginalDiffContainer, true, true);
                this._addLines(block.mLines, 0, block.mLine, VCOM.FileDiffBlockChangeType.None, i, diffModel, true, this._$sideBySideModifiedDiffContainer, true, false);
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Add) {
                this._addEmptyChangeLines(i, block.mLinesCount, VCOM.FileDiffBlockChangeType.Add, this._$sideBySideOriginalDiffContainer, diffModel, true);
                this._addLines(block.mLines, 0, block.mLine, VCOM.FileDiffBlockChangeType.Add, i, diffModel, true, this._$sideBySideModifiedDiffContainer, true, false, true);

                linesAdded += block.mLinesCount;
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Delete) {
                this._addLines(block.oLines, block.oLine, 0, VCOM.FileDiffBlockChangeType.Delete, i, diffModel, true, this._$sideBySideOriginalDiffContainer, true, true, true);
                this._addEmptyChangeLines(i, block.oLinesCount, VCOM.FileDiffBlockChangeType.Delete, this._$sideBySideModifiedDiffContainer, diffModel, false);
                linesDeleted += block.oLinesCount; 
            }
            else if (block.changeType === VCLegacyContracts.FileDiffBlockChangeType.Edit) {
                this._addLines(block.oLines, block.oLine, 0, VCOM.FileDiffBlockChangeType.Delete, i, diffModel, false, this._$sideBySideOriginalDiffContainer, true, true, false, lineCharBlock.charChange);
                this._addLines(block.mLines, 0, block.mLine, VCOM.FileDiffBlockChangeType.Add, i, diffModel, false, this._$sideBySideModifiedDiffContainer, true, false, false, lineCharBlock.charChange);
                linesDeleted += block.oLinesCount;
                linesAdded += block.mLinesCount;

                this._numRowsRendered += Math.min(block.oLinesCount, block.mLinesCount);

                // If different number of lines on one side of the block, add filler lines to the other side
                if (block.mLinesCount > block.oLinesCount) {
                    this._addEmptyChangeLines(i, block.mLinesCount - block.oLinesCount, VCOM.FileDiffBlockChangeType.Delete, this._$sideBySideOriginalDiffContainer, diffModel, true);
                    this._numRowsRendered += (block.mLinesCount - block.oLinesCount);
                }
                else if (block.oLinesCount > block.mLinesCount) {
                    this._addEmptyChangeLines(i, block.oLinesCount - block.mLinesCount, VCOM.FileDiffBlockChangeType.Add, this._$sideBySideModifiedDiffContainer, diffModel, false);
                    this._numRowsRendered += (block.oLinesCount - block.mLinesCount);
                }
            }
            
            if (i === diffModel.blocks.length - 1 && this._options.expandable) {
                this._addExpander(i, false, block.truncatedAfter, true, true);
            } else if (block.truncatedAfter) {
                this._addEllipsisLineToDiffContainer(i, i !== (diffModel.blocks.length - 1), this._$sideBySideOriginalDiffContainer, false, diffModel, true, true);
                this._addEllipsisLineToDiffContainer(i, i !== (diffModel.blocks.length - 1), this._$sideBySideModifiedDiffContainer, true, diffModel, true, false);
            }

            if (this._numRowsRendered >= BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS) {
                return false;
            }
        });

        this.setTabIndexOnFirstAddCommentDivInDiffContainer(this._$sideBySideOriginalDiffContainer);
        this.setTabIndexOnFirstAddCommentDivInDiffContainer(this._$sideBySideModifiedDiffContainer);

        //Add summary counts
        this._addFileSummaryCount(linesAdded, linesDeleted); 

        this._$sideBySideOriginalDiffContainer.appendTo($originalContainer);
        this._$sideBySideModifiedDiffContainer.appendTo($modifiedContainer);
    }

    /** 
    * Add plus and minus signs to expand/shrink the inline diff if possible
    * @param {boolean} start: if we are at the beginning of the diff, false indicates at end of diff.
    * @param {boolean} canExpand: if not at edge of file yet
    * canShrink: if lines shown is more than minimum
    */
    private _addExpander(
        blockIndex: number,
        start: boolean,
        canExpand: boolean,
        isSideBySideDiff: boolean,
        isOriginalSide?: boolean) {

        let $expander: JQuery,
            $shrinker: JQuery,
            $gutterElement: JQuery,
            $codeLine: JQuery,
            $codeLineContent: JQuery,
            rowIndex = this._numRowsRendered;
        let canShrink: boolean;
        if (start) {
            canShrink = this._rowsAboveThread > BuiltInDiffViewer.DIFF_PADDING_ROWS
        } else {
            canShrink = this._rowsBelowThread > BuiltInDiffViewer.DIFF_PADDING_ROWS;
        }

        const $diffRow = this._addDiffContentRowElement(isSideBySideDiff, isOriginalSide);
        const $gutterContainer = this._addDiffGutterToRowElement($diffRow);

        if ($gutterContainer && (canExpand || canShrink)) {
            if (canExpand) {
                $expander = $(domElem("div", "expander"));
                $expander.click(delegate(this, function () { this._handleExpanderClick(start, true); }));
            }
            if (canShrink) {
                $shrinker = $(domElem("div", "expander"));
                $shrinker.click(delegate(this, function () { this._handleExpanderClick(start, false); }));
            }
                
            const $gutterOverlay: JQuery = $(domElem("div", "text-diff-gutter-overlay"))
                .css("z-index", "10")
                .css("position", "absolute")
                .css("width", BuiltInDiffViewer.TEXT_DIFF_GUTTER_WIDTH + "px")
                .appendTo($gutterContainer);

            if (start) {
                $gutterOverlay.css("top", "0").css("left", "0");
                if ($expander) {
                    $(domElem("span")).addClass("bowtie-icon bowtie-chevron-up").appendTo($expander);
                    $expander.appendTo($gutterOverlay);
                }
                if ($shrinker) {
                    $(domElem("span")).addClass("bowtie-icon bowtie-chevron-down").appendTo($shrinker);
                    $shrinker.appendTo($gutterOverlay);
                }
            }
            else {
                $gutterOverlay.css("bottom", "0px").appendTo($gutterContainer);
                if ($shrinker) {
                    $(domElem("span")).addClass("bowtie-icon bowtie-chevron-up").appendTo($shrinker);
                    $shrinker.appendTo($gutterOverlay);
                }
                if ($expander) {
                    $(domElem("span")).addClass("bowtie-icon bowtie-chevron-down").appendTo($expander);
                    $expander.appendTo($gutterOverlay);
                }
            }
        }
    }

    private _addEllipsisLineToDiffContainer(
        blockIndex: number,
        middle: boolean,
        $contentsContainer: JQuery,
        incrementRowCount: boolean,
        diffModel: VCLegacyContracts.FileDiff,
        isSideBySideDiff: boolean,
        isOriginalSide?: boolean): void {

        const {$gutterElementContainer, $originalElementContainer, $modifiedElementContainer, $diffContentContainer} =
            this._addDiffContentRowWithAllColumns(diffModel, isSideBySideDiff, isOriginalSide);
        this._addEllipsisLine(blockIndex, middle, $diffContentContainer, $originalElementContainer, $modifiedElementContainer, incrementRowCount, $gutterElementContainer);
    }

    private _addEllipsisLine(blockIndex: number, middle: boolean, $contentsContainer: JQuery, $originalLines: JQuery, $modifiedLines: JQuery, incrementRowCount: boolean, $gutterContainer: JQuery) {

        let $oLineNumber: JQuery,
            $mLineNumber: JQuery,
            $gutterElement: JQuery,
            $codeLine: JQuery,
            $codeLineContent: JQuery,
            rowIndex = this._numRowsRendered;

        if (incrementRowCount) {
            this._numRowsRendered++;
        }

        this._lineInfoByRowIndex[rowIndex] = <DiffRowLineInfo>{
            rowIndex: rowIndex,
            originalLine: 0,
            modifiedLine: 0,
            blockIndex: blockIndex,
            isEllipsis: true
        };

        const ellipsisText = "...";
        if ($originalLines) {
            $oLineNumber = $(domElem("span", "ln-o ellipsis-line"))
                .attr("data-ellipsis", ellipsisText)
                .data("rowIndex", rowIndex)
                .attr("aria-label", ellipsisText)
                .appendTo($originalLines);
        }
        if ($modifiedLines) {
            $mLineNumber = $(domElem("span", "ln-m ellipsis-line"))
                .attr("data-ellipsis", ellipsisText)
                .data("rowIndex", rowIndex)
                .attr("aria-label", ellipsisText)
                .appendTo($modifiedLines);
        }

        if ($gutterContainer) {
            $gutterElement = $(domElem("span", "ln-g ellipsis-line"))
                .data("rowIndex", rowIndex)
                .appendTo($gutterContainer);
        }

        $codeLine = $(domElem("span", "code-line ellipsis-line"))
            .data("rowIndex", rowIndex)
            .appendTo($contentsContainer);

        $codeLineContent = $(domElem("span", "ellipsis-line-content")).appendTo($codeLine);

        if (middle) {
            $codeLine.addClass("middle");
            if ($oLineNumber) {
                $oLineNumber.addClass("middle");
            }
            if ($mLineNumber) {
                $mLineNumber.addClass("middle");
            }
            if ($gutterElement) {
                $gutterElement.addClass("middle");
            }
        }
    }

    /**
    * Called when expand/shrink buttons are clicked. Redraws diff, then scrolls page to appear still.
    * 
    * @param {boolean} above: If the button is above the diff; false means below.
    * @param {boolean} grow: If the button is meant to expand; false means shrink.
    */
    private _handleExpanderClick(above: boolean, grow: boolean) {
        let linesAbove: number, linesBelow: number;
        if (above) {
            linesBelow = this._rowsBelowThread;
            if (grow) {
                linesAbove = this._rowsAboveThread + BuiltInDiffViewer.ROWS_TO_EXPAND;
            } else {
                linesAbove = Math.max(this._rowsAboveThread - BuiltInDiffViewer.ROWS_TO_EXPAND, 0);
            }
        } else {
            linesAbove = this._rowsAboveThread;
            if (grow) {
                linesBelow = this._rowsBelowThread + BuiltInDiffViewer.ROWS_TO_EXPAND;
            } else {
                linesBelow = Math.max(this._rowsBelowThread - BuiltInDiffViewer.ROWS_TO_EXPAND, 0);
            }
        }

        if (this) {
            const scrollContainer = Utils_UI.Positioning.getVerticalScrollContainer($(this.getElement()));
            const top: number = scrollContainer.scrollTop();
            const height: number = scrollContainer[0].scrollHeight;

            this.beginShowDiff(this._repositoryContext, this._itemsDescription, () => {
                // if the above expander was selected
                if (above) {
                    // return the scroll position to the same spot after the new diff data was added
                    scrollContainer.scrollTop(top);
                }
                else {
                    // move the scroll position to be where it was plus the height of the additional context to keep things aligned
                    scrollContainer.scrollTop(top + scrollContainer[0].scrollHeight - height);
                }
            }, linesAbove, linesBelow);
        }
    }

    /**
     * Element containers are indexed into, so we need to add placeholder divs for any that span multiple rows
     */
    private _addPlaceholderDivs($container: JQuery, className: string, lineCount: number) {
        for (let i = 1; i < lineCount; i++) {
            $(domElem("div", className))
                .css("display", "none")
                .appendTo($container);
        }
    }

    private _addEmptyChangeLines(
        blockIndex: number,
        lineCount: number,
        changeType: VCOM.FileDiffBlockChangeType,
        $contentsContainer: JQuery,
        diffModel: VCLegacyContracts.FileDiff,
        isOriginalSide?: boolean) {
        let line: number,
            $codeLine: JQuery,
            rowIndex = this._numRowsRendered;
        const {$gutterElementContainer, $originalElementContainer, $modifiedElementContainer, $diffContentContainer} =
            this._addDiffContentRowWithAllColumns(diffModel, true, isOriginalSide);

        if (lineCount != 0) {            
            if (lineCount + rowIndex >= BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS) {
                lineCount = BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS - rowIndex;
            }

            //Span all the rows so the removed region image is clear
            const rowHeight: number = lineCount * BuiltInDiffViewer.LINE_HEIGHT;

            if ($originalElementContainer) {
                $(domElem("span", "ln-o"))
                    .data("rowIndex", rowIndex)
                    .data("side", "o")
                    .css("height", rowHeight)
                    .appendTo($originalElementContainer);

                this._addPlaceholderDivs($originalElementContainer, "ln-o", lineCount);
            }
            if ($modifiedElementContainer) {
                $(domElem("span", "ln-m"))
                    .data("rowIndex", rowIndex)
                    .data("side", "m")
                    .css("height", rowHeight)
                    .appendTo($modifiedElementContainer);

                this._addPlaceholderDivs($modifiedElementContainer, "ln-m", lineCount);
            }

            $codeLine = $(domElem("span", "code-line dashed-content"))
                .data("rowIndex", rowIndex)
                .data("side", $modifiedElementContainer ? "m" : "o")
                .css("height", rowHeight)
                .appendTo($diffContentContainer);

            this._addPlaceholderDivs($diffContentContainer, "code-line", lineCount);

            if ($gutterElementContainer) {
                $(domElem("span", "ln-g"))
                    .data("rowIndex", rowIndex)
                    .data("side", $modifiedElementContainer ? "m" : "o")
                    .css("height", rowHeight)
                    .appendTo($gutterElementContainer);

                this._addPlaceholderDivs($gutterElementContainer, "ln-g", lineCount);
            }
        }
    }

    /**
     * Draw a change sequence 
     */
    private _drawCharDiff(
        $codeLine: JQuery,
        className: string,
        line: string,
        startLine: number,
        endLine: number,
        diffStart: number,
        diffCount: number,
        spotInLine: number): number {

        //Check to see if the diff starts in this line
        if (diffStart >= startLine && diffStart < endLine) {

            //Create a span up to the diff block
            if (startLine != diffStart) {
                const newSpot = diffStart - startLine;
                $(domElem("span"))
                    .appendTo($codeLine)
                    .text(line.substr(spotInLine, newSpot - spotInLine) || "");
                spotInLine = newSpot;
            }

            //Span until the end of the diff or line, whatever comes first
            let end: number = spotInLine + diffCount;
            if (end > line.length) {
                end = line.length;
            }
            $(domElem("span", className))
                .appendTo($codeLine)
                .text(line.substr(spotInLine, end - spotInLine) || "");
                        
            //move the spot we're at
            spotInLine = end;
        }
        //The diff started on a previous line but continues here
        else if (startLine >= diffStart && (startLine < (diffStart + diffCount))) {
            const diffCharsLeft: number = diffCount - (startLine - diffStart);

            //Span until the end of the diff or line, whatever comes first
            let end: number = spotInLine + diffCharsLeft;
            if (end > line.length) {
                end = line.length;
            }
            $(domElem("span", className))
                .appendTo($codeLine)
                .text(line.substr(spotInLine, end - spotInLine) || "");
                        
            //move the spot we're at
            spotInLine = end;
        }
        return spotInLine;
    }

    /**
     * Draw the Line, breaking and highlighting change sequences
     */
    private _drawCharDiffLine(
        charDiffs: VCLegacyContracts.FileDiffBlock[],
        changeType: VCOM.FileDiffBlockChangeType,
        codeLine: JQuery,
        line: string,
        startLine: number,
        endLine: number) {

        let spotInLine: number = 0;

        for (let i = 0; i < charDiffs.length; i++) {

            if (changeType === VCOM.FileDiffBlockChangeType.Delete) {
                spotInLine = this._drawCharDiff(codeLine, "content-original", line, startLine, endLine, charDiffs[i].oLine, charDiffs[i].oLinesCount, spotInLine);
            }

            if (changeType === VCOM.FileDiffBlockChangeType.Add) {
                spotInLine = this._drawCharDiff(codeLine, "content-modified", line, startLine, endLine, charDiffs[i].mLine, charDiffs[i].mLinesCount, spotInLine);
            }
        }

        //If we didn't complete the line add a final span with the rest of the text
        if (spotInLine != line.length) {
            $(domElem("span"))
                .appendTo(codeLine)
                .text(line.substr(spotInLine) || "");
        }
    }

    private _addLines(
        lines: string[],
        oStartLine: number,
        mStartLine: number,
        changeType: VCOM.FileDiffBlockChangeType,
        blockIndex: number,
        diffModel: VCLegacyContracts.FileDiff,
        incrementRowCount: boolean,
        $contentsContainer: JQuery,
        isSideBySideDiff: boolean,
        isOriginalSide: boolean,
        highlightBackground?: boolean,
        charDiffs?: VCLegacyContracts.FileDiffBlock[]): void {

        let oLine = oStartLine,
            mLine = mStartLine,
            rowIndex = this._numRowsRendered;

        const threadPosition: DiscussionCommon.DiscussionPosition = this._options.discussionThread && this._options.discussionThread.position;

        let currCharCount = 0;
        if (lines) {
            $.each(lines, (i: number, line: string) => {
                const {$gutterElementContainer, $originalElementContainer, $modifiedElementContainer, $diffContentContainer} =
                    this._addDiffContentRowWithAllColumns(diffModel, isSideBySideDiff, isOriginalSide);

                const currentOLine = oLine;
                const currentMLine = mLine;

                let lineInfo: DiffRowLineInfo,
                    $lineElement: JQuery,
                    $codeLine: JQuery,
                    $codeLineContent: JQuery,
                    $gutterElement: JQuery;

                if (oLine > this._maxLineNumber) {
                    this._maxLineNumber = oLine;
                }
                if (mLine > this._maxLineNumber) {
                    this._maxLineNumber = mLine;
                }

                lineInfo = this._lineInfoByRowIndex[rowIndex];
                if (!lineInfo) {
                    lineInfo = <DiffRowLineInfo>{
                        rowIndex: rowIndex,
                        originalLine: oLine,
                        modifiedLine: mLine,
                        blockIndex: blockIndex
                    };
                    this._lineInfoByRowIndex[rowIndex] = lineInfo;
                }
                else {
                    if (oLine > 0) {
                        lineInfo.originalLine = oLine;
                    }
                    if (mLine > 0) {
                        lineInfo.modifiedLine = mLine;
                    }
                }

                if ($originalElementContainer) {
                    $lineElement = $(domElem("span", "ln-o"))
                        .data("rowIndex", rowIndex)
                        .data("side", "o")
                        .appendTo($originalElementContainer);

                    if (oLine > 0) {
                        const lineNumber = oLine++;
                        $lineElement
                            .attr("data-line-number", lineNumber)
                            .attr("aria-label", lineNumber);

                    }
                }
                if ($modifiedElementContainer) {
                    $lineElement = $(domElem("span", "ln-m"))
                        .data("rowIndex", rowIndex)
                        .data("side", "m")
                        .appendTo($modifiedElementContainer);

                    if (mLine > 0) {
                        const lineNumber = mLine++;
                        $lineElement
                            .attr("data-line-number", lineNumber)
                            .attr("aria-label", lineNumber);
                    }
                }

                $codeLine = $(domElem("span", "code-line"))
                    .data("rowIndex", rowIndex)
                    .appendTo($diffContentContainer);

                if (mLine > 0) {
                    $codeLine.data("side", "m");
                }
                else {
                    $codeLine.data("side", "o");
                }

                // Check to see if char level diff writing is required
                if (charDiffs) {
                    this._drawCharDiffLine(charDiffs, changeType, $codeLine, line, currCharCount, currCharCount + line.length);
                }
                else {
                    $(domElem("span"))
                        .appendTo($codeLine)
                        .text(line || "");
                }

                // If it is a sole add or delete highlight the line like monaco.
                if (highlightBackground) {
                    if (changeType === VCOM.FileDiffBlockChangeType.Delete) {
                        $codeLine.addClass("deleted-content-fullrow");
                    }
                    else if (changeType === VCOM.FileDiffBlockChangeType.Add) {
                        $codeLine.addClass("added-content-fullrow");
                    }
                }
                else if (changeType === VCOM.FileDiffBlockChangeType.Add) {
                    $codeLine.addClass("added-content");
                }
                else if (changeType === VCOM.FileDiffBlockChangeType.Delete) {
                    $codeLine.addClass("deleted-content");
                }

                if ($gutterElementContainer) {
                    if (threadPosition &&
                        ((threadPosition.positionContext === DiscussionCommon.PositionContext.LeftBuffer && threadPosition.startLine === currentOLine) ||
                            (threadPosition.positionContext !== DiscussionCommon.PositionContext.LeftBuffer && threadPosition.startLine === currentMLine))) {
                        $gutterElement = $(domElem("div", "bowtie-icon bowtie-comment-outline inline-comment-marker"))
                            .data("rowIndex", rowIndex)
                            .data("side", mLine > 0 ? "m" : "o")
                            .appendTo($gutterElementContainer);

                        $(domElem("div", "visually-hidden"))
                            .text(VCResources.DiffViewer_CommentAtLine)
                            .appendTo($gutterElement);
                    }
                    else {
                        $gutterElement = $(domElem("span", "ln-g"))
                            .data("rowIndex", rowIndex)
                            .data("side", mLine > 0 ? "m" : "o")
                            .css("width", BuiltInDiffViewer.TEXT_DIFF_GUTTER_WIDTH + "px")
                            .appendTo($gutterElementContainer);

                        const $gutterRowDivContainer = $(domElem("span", "add-comment-container")).appendTo($gutterElement);
                        if (this._discussionManager && this._discussionManager.isAddCommentEnabled() && !this._options.preventDiscussionCreate) {
                            const $addCommentButton = $(domElem("span", "add-comment"))
                                .attr("tabindex", "-1")
                                .attr("role", "button")
                                .attr("aria-label", VCResources.AddCommentButtonAriaLabel)
                                .bind("keydown", delegate(this, this._handleAddCommentButtonKeyDown))
                                .bind("mousedown", delegate(this, this._handleAddButtonMouseDown))
                                .click(delegate(this, this._handleAddButtonClick))
                                .appendTo($gutterRowDivContainer);
                            PopupContent.RichContentTooltip.add(DiscussionResources.AddCommentTooltip, $addCommentButton);
                        }
                    }
                }

                rowIndex++;

                if (rowIndex >= BuiltInDiffViewer.MAX_NUM_RENDERED_ROWS) {
                    return false;
                }

                currCharCount += line.length;
            });
        }

        if (incrementRowCount) {
            this._numRowsRendered = rowIndex;
        }
    }

    private _addDiffContentRowWithAllColumns(
        diffModel: VCLegacyContracts.FileDiff,
        isSideBySideDiff: boolean,
        isOriginalSide?: boolean): TextDiffContentRowInfo {
        const $diffRow = this._addDiffContentRowElement(isSideBySideDiff, isOriginalSide);
        const $diffGutter = this._addDiffGutterToRowElement($diffRow);

        let $originalLines: JQuery;
        if (diffModel.originalFile && (!isSideBySideDiff || (isSideBySideDiff && isOriginalSide))) {
            $originalLines = this._addOriginalDiffLineElement($diffRow);
        }

        let $modifiedLines: JQuery;
        if (diffModel.modifiedFile && (!isSideBySideDiff || (isSideBySideDiff && !isOriginalSide))) {
            $modifiedLines = this._addModifiedDiffLineElement($diffRow);
        }

        const $diffContentContainer = this._addDiffContentsContainerElement($diffRow);

        return {
            $gutterElementContainer: $diffGutter,
            $originalElementContainer: $originalLines,
            $modifiedElementContainer: $modifiedLines, 
            $diffContentContainer: $diffContentContainer
        };
    }

    private _addDiffContentRowElement(isSideBySideDiff: boolean, isOriginalSide?: boolean): JQuery {
        const $diffContentsRow = $(domElem("div", "diff-contents-row"))
            .attr("role", "presentation");

        if (!isSideBySideDiff) {
            $diffContentsRow.appendTo(this._$inlineDiffContainer);
        } else {
            isOriginalSide ?
                $diffContentsRow.appendTo(this._$sideBySideOriginalDiffContainer) :
                $diffContentsRow.appendTo(this._$sideBySideModifiedDiffContainer);
        }

        return $diffContentsRow;
    }

    private _addDiffGutterToRowElement($diffRow: JQuery): JQuery {
        const $diffGutterElement = $(domElem("span", "text-diff-gutter"))
            .attr("role", "presentation")
            .appendTo($diffRow);

        return $diffGutterElement;
    }

    private _addOriginalDiffLineElement($diffRow: JQuery): JQuery {
        const $originalDiffLineElement = $(domElem("span", "diff-lines original"))
            .attr("role", "presentation")
            .appendTo($diffRow);

        return $originalDiffLineElement;
    }

    private _addModifiedDiffLineElement($diffRow: JQuery): JQuery {
        const $modifiedDiffLineElement = $(domElem("span", "diff-lines modified"))
            .attr("role", "presentation")
            .appendTo($diffRow);

        return $modifiedDiffLineElement;
    }

    private _addDiffContentsContainerElement($diffRow: JQuery): JQuery {
        const $diffContentsContainer = $(domElem("span", "diff-contents-container"))
            .attr("role", "presentation")
            .appendTo($diffRow);

        return $diffContentsContainer;
    }

    public updateLayout() {
        this._handleLayoutChanged();
    }

    private _handleLayoutChanged() {

        // Refresh heights of discussion controls
        $.each(this._currentDiscussionThreadControls, (i: number, threadControl: BuiltInDiffViewerDiscussionThreadControlReact) => {
            threadControl.updateLayout();
        });

        this._updateSideBySideEditorHeight();

        // Redraw/calculate all image diff data
        this._resetImageDiffConstants();
        this._afterImageLoad();
    }

    private _resetImageDiffConstants() {
        if (typeof this._imageDiff.mode !== "undefined") {
            this._imageDiff.sideBySideHeight = undefined;
            this._imageDiff.inlineHeight = undefined;
            if (this._imageDiff.elements.$canvas) {
                this._imageDiff.elements.$canvas.remove();
                this._imageDiff.elements.$canvas = undefined;
            }
            if (this._imageDiff.elements.$imagesContainer) {
                this._imageDiff.elements.$imagesContainer.find("img").css({ width: "", height: "" });
            }
        }
    }

    private _handleMouseMove(e: JQueryEventObject) {
        let $rowElement = $(e.target).closest(".ln-g, .ln-o, .ln-m, .code-line"),
            rowIndex = parseInt($rowElement.data("rowIndex")),
            originalSide = $rowElement.data("side") === "o",
            rowInfo: DiffRowLineInfo,
            discussionId: number;

        if (rowIndex !== this._highlightedRowIndex || originalSide !== this._highlightedRowIsOriginalSide) {

            this._clearHighlightedRow();
            this._highlightedRowIsOriginalSide = originalSide;

            if (rowIndex >= 0) {
                rowInfo = this._lineInfoByRowIndex[rowIndex];
                if (rowInfo && !rowInfo.isEllipsis) {
                    this._highlightRow(rowIndex, originalSide);
                }
            }
        }
    }

    private _handleMouseOut(e: JQueryEventObject) {
        this._clearHighlightedRow();
    }

    private _highlightRow(rowIndex: number, originalSide: boolean) {
        this._highlightedRowIndex = rowIndex;
        this._$highlightedRowElements = this._getRowElements(rowIndex, originalSide, true);
        $.each(this._$highlightedRowElements, (i: number, $element: JQuery) => {
            $element.addClass("highlighted-row");
        });
    }

    private _clearHighlightedRow() {
        if (this._highlightedRowIndex >= 0) {
            this._highlightedRowIndex = -1;
            $.each(this._$highlightedRowElements, (i: number, $element: JQuery) => {
                $element.removeClass("highlighted-row");
            });
        }
    }

    private _updateSideBySideEditorHeight() {
        // Give a 20 px padding to account for a horizontal scroll bar
        if (this._sideBySideSplitter && !this._options.fixedSize) {
            this._sideBySideSplitter._element.css("height", (this._getDiffContainerActualHeight(this._$sideBySideOriginalDiffContainer) + 20) + "px");
        }
    }

    private _getDiffContainerActualHeight(diffContainer: JQuery) {
        if (diffContainer) {
            if (diffContainer.height() === 0) {
                //It's possible this diff container has a height but since the parent element
                //is hidden, the height isn't accurate.  Let's calculate the height from how many
                //lines it contains
                const lines = diffContainer.find(".code-line");
                if (lines && lines.length > 0) {
                    return lines.length * BuiltInDiffViewer.LINE_HEIGHT;
                }
            }

            return diffContainer.height();
        }

        return 0;
    }

    private setTabIndexOnFirstAddCommentDivInDiffContainer($diffContainer: JQuery): void {
        const $addCommentElements = $diffContainer.find(".ln-g > .add-comment-container .add-comment");
        if ($addCommentElements.length > 0) {
            $addCommentElements[0].tabIndex = 0;
        }
    }

    private _setTabIndicesForCommentButtons($diffContainer: JQuery, $gutterElement: JQuery): void {
        const $addCommentElements = $diffContainer.find(".ln-g > .add-comment-container .add-comment");
        if ($addCommentElements.length > 0) {
            for (const index in $addCommentElements) {
                $addCommentElements[index].tabIndex = -1;
            }
        }
        const $currentAddCommentElement = $gutterElement.find("> .add-comment-container .add-comment");
        if ($currentAddCommentElement.length > 0) {
            $currentAddCommentElement[0].tabIndex = 0;
        } else if ($addCommentElements.length > 0) {
            $addCommentElements[0].tabIndex = 0;
        }
    }

    private _handleDiscussionResized() {
        this._handleLayoutChanged();
    }

    private _handleAddButtonMouseDown(e: JQueryEventObject): void {
        this._lastSelectionRange = Utils_UI.SelectionUtils.getSelection();
    }

    private _handleAddCommentButtonKeyDown(event: JQueryEventObject): void {
        const $targetElement = $(event.target);
        if (!$targetElement || $targetElement.length <= 0) {
            return;
        }

        const $gutterElement = $targetElement.closest(".ln-g");
        if (!$gutterElement || $gutterElement.length <= 0) {
            return;
        }

        const gutterRowIndex = parseInt($gutterElement.data("rowIndex"));
        const isOriginalSide = $gutterElement.data("side") === "o";
        const isInlineDiff = !!this._$inlineDiffContainer;
        let eventHandled = false;

        let gutterNextRowIndex: number = -1;
        if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.SPACE) {
            this._handleAddButtonClick(event);
            eventHandled = true;
        } else if (event.keyCode === Utils_UI.KeyCode.DOWN) {
            gutterNextRowIndex = this._getNextAddCommentRowIndexOnKeyUpOrDown(gutterRowIndex, false, isInlineDiff, isOriginalSide);
        } else if (event.keyCode === Utils_UI.KeyCode.UP) {
            gutterNextRowIndex = this._getNextAddCommentRowIndexOnKeyUpOrDown(gutterRowIndex, true, isInlineDiff, isOriginalSide);
        }

        if (gutterNextRowIndex >= 0) {
            $targetElement.blur();

            const $diffContainer = this._getDiffContainer(isInlineDiff, isOriginalSide);
            if ($diffContainer && $diffContainer.length > 0) {
                const $gutterElementAtIndex = $diffContainer.find(".ln-g").eq(gutterNextRowIndex);
                if ($gutterElementAtIndex.length > 0) {
                    const $addCommentElement = $gutterElementAtIndex.find("> .add-comment-container .add-comment");
                    if ($addCommentElement && $addCommentElement.length > 0) {
                        // Set the focus to the "add comment" button and add it to tab stops.
                        $addCommentElement.focus();
                        $addCommentElement[0].tabIndex = 0;

                        // Remove the previous "add comment" button from the tab stops.
                        $targetElement[0].tabIndex = -1;
                    }
                }
            }
            eventHandled = true;
        }

        if (eventHandled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    private _getDiffContainer(isInlineDiff: boolean, isOriginalSide): JQuery {
        let $diffContainer: JQuery;
        if (isInlineDiff) {
            $diffContainer = this._$inlineDiffContainer;
        } else {
            $diffContainer = isOriginalSide ? this._$sideBySideOriginalDiffContainer : this._$sideBySideModifiedDiffContainer;
        }

        return $diffContainer;
    }

    private _getNextAddCommentRowIndexOnKeyUpOrDown(currentRowIndex: number, isKeyUp: boolean, isInlineDiff: boolean, isOriginalSide?: boolean ): number {
        let nextGutterRowIndex = isKeyUp ? (currentRowIndex - 1) : (currentRowIndex + 1);
        for (; !!this._lineInfoByRowIndex[nextGutterRowIndex]; (isKeyUp ? --nextGutterRowIndex : ++nextGutterRowIndex)) {
            const nextRowInfo = this._lineInfoByRowIndex[nextGutterRowIndex];
            if (isInlineDiff) {
                // For In-line Diff
                if (!nextRowInfo.isEllipsis) {
                    return nextGutterRowIndex;
                }
            } else {
                // For Side-by-Side Diff
                if (!nextRowInfo.isEllipsis && ((isOriginalSide && nextRowInfo.originalLine > 0) || (!isOriginalSide && nextRowInfo.modifiedLine > 0))) {
                    return nextGutterRowIndex;
                }
            }
        }

        return -1;
    }

    private _handleAddButtonClick(e: JQueryEventObject): boolean {
        let $gutterElement = $(e.target).closest(".ln-g"),
            gutterRowIndex = parseInt($gutterElement.data("rowIndex")),
            isOriginalSide = $gutterElement.data("side") === "o",
            rowInfo = this._lineInfoByRowIndex[gutterRowIndex],
            itemPath = this._getDiscussionItemPath(),
            positionResult: any,
            position: DiscussionCommon.DiscussionPosition;

        if (rowInfo && !rowInfo.isEllipsis && !this._options.preventDiscussionCreate && this._discussionManager) {

            const $diffContainer: JQuery = this._getDiffContainer(!!this._$inlineDiffContainer, isOriginalSide);
            this._setTabIndicesForCommentButtons($diffContainer, $gutterElement);

            positionResult = this._getDiscussionPosition(rowInfo, isOriginalSide, this._lastSelectionRange);
            position = positionResult.position;

            this._discussionManager.createNewDiscussionThread(itemPath, position, (newThread: DiscussionCommon.DiscussionThread) => {
                let isOriginalSide = this._isOriginalPosition(position),
                    rowIndex = positionResult.endRowIndex,
                    $rowElements = this._getRowElements(rowIndex, isOriginalSide),
                    discussionPlacement = $rowElements[0][0],
                    fillerPlacementsJQuery = $rowElements.slice(1),
                    fillerPlacementsHTML: HTMLElement[],
                    threadControl: BuiltInDiffViewerDiscussionThreadControlReact,
                    rowsLookup: DiffRowLineInfoLookup;

                fillerPlacementsHTML = $.map(fillerPlacementsJQuery, (fillerPlacement: JQuery) => {
                    return fillerPlacement[0];
                });

                rowsLookup = <DiffRowLineInfoLookup>{};
                $.each(this._lineInfoByRowIndex, (rowIndex: number, lineInfo: DiffRowLineInfo) => {
                    if (isOriginalSide && lineInfo.originalLine > 0) {
                        rowsLookup[lineInfo.originalLine] = lineInfo;
                    }
                    else if (!isOriginalSide && lineInfo.modifiedLine > 0) {
                        rowsLookup[lineInfo.modifiedLine] = lineInfo;
                    }
                });

                threadControl = this._insertLineLevelThread(newThread, discussionPlacement, fillerPlacementsHTML, rowsLookup);
                if (threadControl) {
                    this._handleLayoutChanged();

                    threadControl.setSelectedState(true);
                }
            });
        }

        return false;
    }

    private _getDiscussionPosition(rowInfo: DiffRowLineInfo, fromOriginalGutter: boolean, selection: Utils_UI.SelectionRange) {

        let position: DiscussionCommon.DiscussionPosition,
            $startCodeLine: JQuery,
            $endCodeLine: JQuery,
            startRowIndex: number,
            endRowIndex: number,
            originalSide = false,
            validSelection = false;

        position = <DiscussionCommon.DiscussionPosition>{
            startColumn: 1,
            endColumn: 1
        };

        if (rowInfo.modifiedLine > 0 && !fromOriginalGutter) {
            position.startLine = rowInfo.modifiedLine;
            position.endLine = rowInfo.modifiedLine;
            position.positionContext = DiscussionCommon.PositionContext.RightBuffer;
        }
        else {
            position.startLine = rowInfo.originalLine;
            position.endLine = rowInfo.originalLine;
            position.positionContext = DiscussionCommon.PositionContext.LeftBuffer;
        }

        if (selection) {
            $startCodeLine = selection.$startNode.closest(".code-line");
            $endCodeLine = selection.$endNode.closest(".code-line");
            startRowIndex = parseInt($startCodeLine.data("rowIndex"));
            endRowIndex = parseInt($endCodeLine.data("rowIndex"));
            if (startRowIndex >= 0 && endRowIndex >= 0) {

                validSelection = true;

                if (this._$inlineDiffContainer) {
                    originalSide = !this._lineInfoByRowIndex[endRowIndex].modifiedLine;

                    // If the start and end selection are on different "sides" of the inline viewer
                    // (e.g. start is on Deleted row and end is on Added row), then don't use the selection.
                    if (!this._lineInfoByRowIndex[startRowIndex][originalSide ? "originalLine" : "modifiedLine"]) {
                        validSelection = false;
                    }
                }
                else {
                    originalSide = this._$sideBySideOriginalDiffContainer.has(<any>$startCodeLine).length > 0;
                    if (originalSide !== (this._$sideBySideOriginalDiffContainer.has(<any>$endCodeLine).length > 0)) {
                        // Selection starts and ends on different sides of the side-by-side viewer
                        validSelection = false;
                    }
                    if (originalSide !== fromOriginalGutter) {
                        // Selection on opposite side of editor
                        validSelection = false;
                    }
                }

                if (!(rowInfo.rowIndex >= startRowIndex && rowInfo.rowIndex <= endRowIndex)) {
                    validSelection = false;
                }

                if (validSelection) {
                    position.positionContext = originalSide ? DiscussionCommon.PositionContext.LeftBuffer : DiscussionCommon.PositionContext.RightBuffer;
                    if (originalSide) {
                        position.startLine = this._lineInfoByRowIndex[startRowIndex].originalLine;
                        position.endLine = this._lineInfoByRowIndex[endRowIndex].originalLine;
                    }
                    else {
                        position.startLine = this._lineInfoByRowIndex[startRowIndex].modifiedLine;
                        position.endLine = this._lineInfoByRowIndex[endRowIndex].modifiedLine;
                    }

                    let startColumn = calculateLineOffset(selection.$startNode, selection.startNodeOffset, $startCodeLine);
                    let endColumn = calculateLineOffset(selection.$endNode, selection.endNodeOffset, $endCodeLine);

                    if (startRowIndex > endRowIndex || (startRowIndex === endRowIndex && startColumn > endColumn)) {
                        // Swap start and end (upward selection)
                        let tempIndex = startRowIndex;
                        startRowIndex = endRowIndex;
                        endRowIndex = tempIndex;

                        tempIndex = startColumn;
                        startColumn = endColumn;
                        endColumn = tempIndex;
                    }

                    position.startColumn = startColumn + 1;
                    position.endColumn = endColumn + 1;
                }
            }
        }

        if (!validSelection) {
            startRowIndex = rowInfo.rowIndex;
            endRowIndex = rowInfo.rowIndex;
            position.endColumn = this._getRowCodeLineElement(rowInfo.rowIndex, position.positionContext === DiscussionCommon.PositionContext.LeftBuffer).text().length + 1;
        }

        return {
            position: position,
            startRowIndex: startRowIndex,
            endRowIndex: endRowIndex
        }
    }

    private _getRowCodeLineElement(rowIndex: number, originalSide: boolean): JQuery {
        if (this._$inlineDiffContainer) {
            return this._$inlineDiffContainer.find(".code-line").eq(rowIndex);
        }
        else if (originalSide) {
            return this._$sideBySideOriginalDiffContainer.find(".code-line").eq(rowIndex);
        }
        else {
            return this._$sideBySideModifiedDiffContainer.find(".code-line").eq(rowIndex);
        }
    }

    private _getRowElements(rowIndex: number, originalSideFirst: boolean, onlyOneSide?: boolean): JQuery[] {
        const $elements: JQuery[] = [];

        if (this._$inlineDiffContainer) {
            $elements.push(this._$inlineDiffContainer.find(".code-line").eq(rowIndex));
            $elements.push(this._$inlineDiffContainer.find(".ln-o").eq(rowIndex));
            $elements.push(this._$inlineDiffContainer.find(".ln-m").eq(rowIndex));
            $elements.push(this._$inlineDiffContainer.find(".ln-g").eq(rowIndex));
        }
        else {
            if (originalSideFirst) {
                $elements.push(this._$sideBySideOriginalDiffContainer.find(".code-line").eq(rowIndex));
                $elements.push(this._$sideBySideOriginalDiffContainer.find(".ln-o").eq(rowIndex));
                $elements.push(this._$sideBySideOriginalDiffContainer.find(".ln-g").eq(rowIndex));

                if (!onlyOneSide) {
                    $elements.push(this._$sideBySideModifiedDiffContainer.find(".code-line").eq(rowIndex));
                    $elements.push(this._$sideBySideModifiedDiffContainer.find(".ln-m").eq(rowIndex));
                    $elements.push(this._$sideBySideModifiedDiffContainer.find(".ln-g").eq(rowIndex));
                }
            }
            else {
                $elements.push(this._$sideBySideModifiedDiffContainer.find(".code-line").eq(rowIndex));
                $elements.push(this._$sideBySideModifiedDiffContainer.find(".ln-m").eq(rowIndex));
                $elements.push(this._$sideBySideModifiedDiffContainer.find(".ln-g").eq(rowIndex));

                if (!onlyOneSide) {
                    $elements.push(this._$sideBySideOriginalDiffContainer.find(".ln-o").eq(rowIndex));
                    $elements.push(this._$sideBySideOriginalDiffContainer.find(".code-line").eq(rowIndex));
                    $elements.push(this._$sideBySideOriginalDiffContainer.find(".ln-g").eq(rowIndex));
                }
            }
        }

        return $.grep($elements, ($element: JQuery) => {
            return $element.length > 0;
        });
    }

    public _handleSelectedDiscussionIdChanged(discussionId: number) {
        if (discussionId !== this._selectedDiscussionId) {

            // Remove the selected class from the thread spans
            if (!isNaN(this._selectedDiscussionId)) {
                this._element.find(".comment.dt-" + this._selectedDiscussionId).removeClass("selected-thread");
            }

            // Add the selected class to the thread spans
            this._element.find(".comment.dt-" + discussionId).addClass("selected-thread");

            this._selectedDiscussionId = discussionId;
        }
    }

    private _drawDiscussionThreads() {

        let discussionThreads: DiscussionCommon.DiscussionThread[] = [];

        // Clear existing discussion comments
        $.each(this._currentDiscussionThreadControls, (i: number, threadControl: BuiltInDiffViewerDiscussionThreadControlReact) => {
            threadControl.dispose();
        });

        // Clear existing hidden comment counts in case they have been reduced to 0
        $('.hidden-comments', this._element).hide().empty();

        if (this._options.threadInsertMarker) {
            this._addDiscussionThreads([this._options.discussionThread], false);
        }

        if (this._discussionManager && this._diffModel) {
            discussionThreads = this._discussionManager.getCurrentThreadsForItemPath(this._getDiscussionItemPath());
            if (discussionThreads.length) {
                this._addDiscussionThreads(discussionThreads, false);
            }
        }
        else if (this._options.discussionThread && this._options.discussionThread.position) {
            //This is for the pr overview inline threads. In those cases we don't have a discussion manager but instead are dealing with a single thread
            //We call add discussion threads here so that we can highlight the text that pertains to that comment
            discussionThreads.push(this._options.discussionThread);
            this._addDiscussionThreads(discussionThreads, false, true);
        }

        return false;
    }

    private _getDiscussionItemPath() {
        let itemPath = (this._diffModel.modifiedFile || this._diffModel.originalFile).serverItem;
        if (this._diffModel.parentContainer) {
            itemPath = this._diffModel.parentContainer.serverItem + itemPath;
        }

        return itemPath;
    }

    private _isLineLevelThread(thread: DiscussionCommon.DiscussionThread) {
        return thread.position && thread.position.positionContext !== DiscussionCommon.PositionContext.InLineBuffer;
    }

    private _addDiscussionThreads(discussionThreads: DiscussionCommon.DiscussionThread[], focus: boolean, textSelectionOnly?: boolean) {

        let fileLevelThreads: DiscussionCommon.DiscussionThread[] = [],
            lineLevelThreads: DiscussionCommon.DiscussionThread[] = [],
            $originalLines: JQuery,
            $modifiedLines: JQuery,
            $originalContent: JQuery,
            $modifiedContent: JQuery,
            $gutterElements: JQuery,
            $gutterElementsOriginal: JQuery,
            originalRowsLookup: DiffRowLineInfoLookup,
            modifiedRowsLookup: DiffRowLineInfoLookup,
            maxOriginalRowIndex: number,
            maxModifiedRowIndex: number;

        fileLevelThreads = $.grep(discussionThreads, (thread: DiscussionCommon.DiscussionThread) => {
            return !this._isLineLevelThread(thread);
        });
        lineLevelThreads = $.grep(discussionThreads, this._isLineLevelThread);

        // Add file-level comments 
        if (fileLevelThreads.length > 0) {
            if (this._$fileLevelDiscussionsContainer) {
                this._$fileLevelDiscussionsContainer.show();
            }
            $.each(fileLevelThreads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                this._addFileLevelThread(thread);
            });
        }
        else {
            if (this._$fileLevelDiscussionsContainer) {
                this._$fileLevelDiscussionsContainer.hide();
            }
        }

        // Add line-level comments
        if (lineLevelThreads.length > 0 && (this._$inlineDiffContainer || this._$sideBySideModifiedDiffContainer)) {

            originalRowsLookup = <DiffRowLineInfoLookup>{};
            modifiedRowsLookup = <DiffRowLineInfoLookup>{};
            maxOriginalRowIndex = 0;
            maxModifiedRowIndex = 0;
            $.each(this._lineInfoByRowIndex, (rowIndex: number, lineInfo: DiffRowLineInfo) => {
                if (lineInfo.originalLine > 0) {
                    originalRowsLookup[lineInfo.originalLine] = lineInfo;
                    maxOriginalRowIndex = Math.max(maxOriginalRowIndex, lineInfo.originalLine);
                }
                if (lineInfo.modifiedLine > 0) {
                    modifiedRowsLookup[lineInfo.modifiedLine] = lineInfo;
                    maxModifiedRowIndex = Math.max(maxModifiedRowIndex, lineInfo.modifiedLine);
                }
            });

            if (this._$inlineDiffContainer) {
                $originalLines = this._$inlineDiffContainer.find(".ln-o");
                $modifiedLines = this._$inlineDiffContainer.find(".ln-m");
                $originalContent = this._$inlineDiffContainer.find(".code-line");
                $modifiedContent = $originalContent;
            }
            else if (this._$sideBySideModifiedDiffContainer) {
                $originalLines = this._$sideBySideOriginalDiffContainer.find(".ln-o");
                $modifiedLines = this._$sideBySideModifiedDiffContainer.find(".ln-m");
                $originalContent = this._$sideBySideOriginalDiffContainer.find(".code-line");
                $modifiedContent = this._$sideBySideModifiedDiffContainer.find(".code-line");
            }

            if (this._$inlineDiffContainer) {
                $gutterElements = this._$inlineDiffContainer.find(".ln-g");
            }
            else {
                $gutterElements = this._$sideBySideOriginalDiffContainer.find(".ln-g");
                $gutterElementsOriginal = this._$sideBySideModifiedDiffContainer.find(".ln-g");
            }

            let hiddenCommentCount = 0;
            $.each(lineLevelThreads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                let isOriginalPosition = this._isOriginalPosition(thread.position),
                    rowsLookup = isOriginalPosition ? originalRowsLookup : modifiedRowsLookup,
                    discussionPlacement: HTMLElement,
                    fillerPlacements: HTMLElement[] = [];

                const maxRowIndex = isOriginalPosition ? maxOriginalRowIndex : maxModifiedRowIndex;
                const rowIndex = (thread.position.endColumn === 1 && thread.position.endLine > thread.position.startLine)
                    ? thread.position.endLine - 1 : thread.position.endLine;
                let rowInfo: DiffRowLineInfo = rowsLookup[rowIndex];

                if (!rowInfo && !this._options.partialDiff) {
                    // The end line may exceed (by one) the last line shown in this file when
                    // the file ends in a CRLF. In that case, we will not show a final/empty
                    // line, although other viewers like monaco will.
                    rowInfo = rowsLookup[thread.position.endLine - 1];
                }

                if (rowInfo) {

                    discussionPlacement = (isOriginalPosition ? $originalContent : $modifiedContent)[rowInfo.rowIndex];

                    if ($originalLines.length > rowInfo.rowIndex) {
                        fillerPlacements.push($originalLines[rowInfo.rowIndex]);
                    }
                    if ($modifiedLines.length > rowInfo.rowIndex) {
                        fillerPlacements.push($modifiedLines[rowInfo.rowIndex]);
                    }
                    if ($gutterElements.length > rowInfo.rowIndex) {
                        fillerPlacements.push($gutterElements[rowInfo.rowIndex]);
                    }
                    if ($gutterElementsOriginal && $gutterElementsOriginal.length > rowInfo.rowIndex) {
                        fillerPlacements.push($gutterElementsOriginal[rowInfo.rowIndex]);
                    }

                    if (this._$sideBySideModifiedDiffContainer) {
                        fillerPlacements.push((isOriginalPosition ? $modifiedContent : $originalContent)[rowInfo.rowIndex]);
                    }

                    this._insertLineLevelThread(thread, discussionPlacement, fillerPlacements, rowsLookup, textSelectionOnly);
                }
                else {
                    hiddenCommentCount++;
                }
            });
            if (hiddenCommentCount) {
                $(domElem('a'))
                    .text(hiddenCommentCount === 1 ? VCResources.HiddenCommentsSingle : Utils_String.format(VCResources.HiddenComments, hiddenCommentCount))
                    .attr('href', this._element.closest('.file-container').find('.file-cell .file-name a.file-name-link').attr('href'))
                    .appendTo(this._$hiddenCommentsElement.show());
            }
        }
    }

    public _addFileLevelThread(thread: DiscussionCommon.DiscussionThread, focus?: boolean) {
        let threadControl = null;
        threadControl = new BuiltInDiffViewerDiscussionThreadControlReact(
            this,
            thread,
            this._discussionThreadControlManager,
            $(domElem("div")).appendTo(this._$fileLevelDiscussionsContainer || this._element));

        this._currentDiscussionThreadControls.push(threadControl);
    }

    public _insertLineLevelThread(thread: DiscussionCommon.DiscussionThread, discussionPlacement: HTMLElement, fillerPlacements: HTMLElement[], rowsLookup: DiffRowLineInfoLookup, textSelectionOnly?: boolean) {
        let threadControl = null;
        let isOriginalPosition = this._isOriginalPosition(thread.position),
            $lastLineRowLineElement: JQuery,
            lastLineText: string,
            lineNumber: number;

        for (lineNumber = thread.position.startLine; lineNumber <= thread.position.endLine; lineNumber++) {
            let rowInfo = rowsLookup[lineNumber];
            if (rowInfo) {
                $lastLineRowLineElement = this._getRowCodeLineElement(rowInfo.rowIndex, isOriginalPosition);
                this._decorateCodeLineWithThread(rowInfo, $lastLineRowLineElement, thread, isOriginalPosition);
            }
            else {
                $lastLineRowLineElement = null;
            }
        }

        //If we're only doing a text selection, we're done here. No need to actually build the thread controls 
        if (!textSelectionOnly) {
            if ($lastLineRowLineElement) {
                lastLineText = $lastLineRowLineElement.text();
            }

            threadControl = new BuiltInDiffViewerDiscussionThreadControlReact(
                this,
                thread,
                this._discussionThreadControlManager,
                $(domElem("div", "discussion-container")).insertAfter(discussionPlacement),
                $.map(fillerPlacements, (fillerPlacement: HTMLElement) => {
                    return $(domElem("div", "discussion-filler")).insertAfter(fillerPlacement);
                }),
            );

            this._currentDiscussionThreadControls.push(threadControl);
            return threadControl;
        }
        else {
            return null;
        }
    }

    public updateExternalThreadSize(): void {
        const externalDiscussion: NodeListOf<Element> = this.getElement()[0].getElementsByClassName("external-discussion-container");
        if (externalDiscussion.length > 0) {
            const discussionHeight: number = $(externalDiscussion[0]).outerHeight(true);
            const fillers: NodeListOf<Element> = this.getElement()[0].getElementsByClassName("discussion-filler");
            const numFillers: number = fillers.length;
            for (let fillerIndex: number = 0; fillerIndex < numFillers; ++fillerIndex) {
                $(fillers[fillerIndex]).height(discussionHeight);
            }
        }
    }

    private _decorateCodeLineWithThread(rowInfo: DiffRowLineInfo, $codeLine: JQuery, thread: DiscussionCommon.DiscussionThread, isOriginalPosition: boolean) {
        let codeText = $codeLine.text(),
            rowLineNumber = isOriginalPosition ? rowInfo.originalLine : rowInfo.modifiedLine,
            startPosition = 0,
            endPosition = 0,
            currentLineIndex: number,
            threadClass = "dt-" + thread.id;

        if (rowLineNumber === thread.position.startLine) {
            startPosition = thread.position.startColumn;
        }
        if (rowLineNumber === thread.position.endLine) {
            if (thread.position.endColumn === 1) {
                // if selection ends on new line before first character, do not render the line
                return false;
            }
            // end position here indicates the position of the last character to select
            // (this is different from how it is stored, where endColumn is > the last char to select)
            endPosition = thread.position.endColumn - 1;
        }

        if (startPosition < 1) {
            startPosition = 1;
        }
        if (endPosition === 0 || endPosition > codeText.length) {
            endPosition = codeText.length;
        }
        if (startPosition > endPosition) {
            const swap = startPosition;
            startPosition = endPosition;
            endPosition = swap;
        }

        currentLineIndex = 1;
        $.each($codeLine.children(), (childIndex: number, span: HTMLElement) => {
            let $span = $(span),
                codeText = $span.text(),
                spanStart = currentLineIndex,
                spanEnd = currentLineIndex + codeText.length,
                spanOriginalClass: string;

            if (endPosition >= spanStart && startPosition <= spanEnd) {
                spanOriginalClass = $span.attr("class") || "";
                $span.addClass("comment");
                $span.addClass(threadClass);

                if (startPosition > spanStart) {
                    $(domElem("span"))
                        .addClass(spanOriginalClass)
                        .insertBefore($span)
                        .text(codeText.substr(0, startPosition - spanStart));

                    $span.text(codeText.substr(startPosition - spanStart));
                }

                if (endPosition < spanEnd) {
                    const startPositionInSpan = Math.max(startPosition, spanStart);
                    $(domElem("span"))
                        .addClass(spanOriginalClass)
                        .insertAfter($span)
                        .text($span.text().substr((endPosition - startPositionInSpan) + 1));

                    $span.text($span.text().substr(0, (endPosition - startPositionInSpan) + 1));
                }
            }

            currentLineIndex = spanEnd;
        });
    }

    public focusCommentButton(position: DiscussionCommon.DiscussionPosition): void {
        const $diffContainer: JQuery = this._getDiffContainer(!!this._$inlineDiffContainer, this._isOriginalPosition(position));
        const $addCommentElements = $diffContainer.find(".ln-g > .add-comment-container .add-comment");
        if ($addCommentElements.length > 0) {
            for (const index in $addCommentElements) {
                if ($addCommentElements[index].tabIndex === 0) {
                    $addCommentElements[index].focus();
                    break;
                }
            }
        }
    }

    private _removeLineDecorationsForThread(discussionId: number) {
        const threadClass = "dt-" + discussionId;
        $.each(this._element.find(".comment." + threadClass), (i: number, threadSpan: HTMLElement) => {
            const $threadSpan = $(threadSpan);
            $threadSpan.removeClass(threadClass);
            $threadSpan.removeClass("selected-comment");
            if ($threadSpan.attr("class").indexOf("dt-") < 0) {
                $threadSpan.removeClass("comment");
            }
        });
    }

    public _updateLineDecorationsForSavedThread(tempDiscussionId: number, savedDiscussionId: number) {
        const oldThreadClass = "dt-" + tempDiscussionId,
            newThreadClass = "dt-" + savedDiscussionId;

        $.each(this._element.find(".comment." + oldThreadClass), (i: number, threadSpan: HTMLElement) => {
            const $threadSpan = $(threadSpan);
            $threadSpan.removeClass(oldThreadClass);
            $threadSpan.addClass(newThreadClass);
        });

        if (this._selectedDiscussionId === tempDiscussionId) {
            this._selectedDiscussionId = savedDiscussionId;
        }
    }

    private _isOriginalPosition(position: DiscussionCommon.DiscussionPosition) {
        return position.positionContext === DiscussionCommon.PositionContext.LeftBuffer;
    }

    private _onOriginalScroll(e?: JQueryEventObject): any {
        // Using a stack to prevent scroll event looping
        if (!this._modifiedScrolling.pop()) {
            this._originalScrolling.push(true);

            // Store previous scroll value
            const previousTop = this._sideBySideSplitter.rightPane.scrollTop();
            const previousLeft = this._sideBySideSplitter.rightPane.scrollLeft();

            // Set new scroll position
            this._sideBySideSplitter.rightPane.scrollTop(this._sideBySideSplitter.leftPane.scrollTop());
            this._sideBySideSplitter.rightPane.scrollLeft(this._sideBySideSplitter.leftPane.scrollLeft());

            // If the scroll bar didn't move, then the event didn't fire so manually pop
            if (previousTop == this._sideBySideSplitter.rightPane.scrollTop() &&
                previousLeft == this._sideBySideSplitter.rightPane.scrollLeft()) {
                this._originalScrolling.pop();
            }
        }
    }

    private _onModifiedScroll(e?: JQueryEventObject): any {
        // Using a stack to prevent scroll event looping
        if (!this._originalScrolling.pop()) {
            this._modifiedScrolling.push(true);

            // Store previous scroll value
            const previousTop = this._sideBySideSplitter.leftPane.scrollTop();
            const previousLeft = this._sideBySideSplitter.leftPane.scrollLeft();

            // Set new scroll position
            this._sideBySideSplitter.leftPane.scrollTop(this._sideBySideSplitter.rightPane.scrollTop());
            this._sideBySideSplitter.leftPane.scrollLeft(this._sideBySideSplitter.rightPane.scrollLeft());

            // If the scroll bar didn't move, then the event didn't fire so manually pop
            if (previousTop == this._sideBySideSplitter.leftPane.scrollTop() &&
                previousLeft == this._sideBySideSplitter.leftPane.scrollLeft()) {
                this._modifiedScrolling.pop();
            }
        }
    }

    private onContentClick(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        let $row = $(e.target).closest(".code-line, .ln-o, .ln-m"),
            blockIndex;

        if ($row.length) {
            this._selectRowByIndex(parseInt($row.data("rowIndex")), false);
        }
        else {
            this._currentlySelectedRowIndex = -1;
        }

        this._updateButtons();
    }

    public goToLine(line: number): void {
        this._selectRowByIndex(line, true);
    }

    public onNextClick() {
        this._onPrevOrNextClick(1);
    }

    public onPrevClick() {
        this._onPrevOrNextClick(-1);
    }

    private _onPrevOrNextClick(incrementer: number) {
        let blockIndex = -1,
            rowInfo: DiffRowLineInfo;

        if (this._diffModel && this._diffModel.blocks) {

            if (this._currentlySelectedRowIndex >= 0) {
                rowInfo = this._lineInfoByRowIndex[this._currentlySelectedRowIndex];
                if (rowInfo) {
                    blockIndex = rowInfo.blockIndex;
                }
            }

            for (let i = blockIndex + incrementer; i >= 0 && i < this._diffModel.blocks.length; i += incrementer) {
                if (this._diffModel.blocks[i].changeType !== VCOM.FileDiffBlockChangeType.None) {
                    this._selectRowByIndex(this._startRowIndexByBlockIndex[i], true);
                    break;
                }
            }
        }

        this._updateButtons();
    }

    private _selectRowByIndex(rowIndex: number, scrollIntoView: boolean) {

        let $selectedCodeLine: JQuery;

        if (this._$inlineDiffContainer) {
            this._$inlineDiffContainer.find(".selected-line").removeClass("selected-line");
            this._$inlineDiffContainer.find(".ln-o").eq(rowIndex).addClass("selected-line");
            this._$inlineDiffContainer.find(".ln-m").eq(rowIndex).addClass("selected-line");
            $selectedCodeLine = this._$inlineDiffContainer.find(".code-line").eq(rowIndex).addClass("selected-line");
        }
        else {
            if (this._$sideBySideOriginalDiffContainer) {
                this._$sideBySideOriginalDiffContainer.find(".selected-line").removeClass("selected-line");
                this._$sideBySideOriginalDiffContainer.find(".ln-o").eq(rowIndex).addClass("selected-line");
                this._$sideBySideOriginalDiffContainer.find(".code-line").eq(rowIndex).addClass("selected-line");
            }
            if (this._$sideBySideModifiedDiffContainer) {
                this._$sideBySideModifiedDiffContainer.find(".selected-line").removeClass("selected-line");
                this._$sideBySideModifiedDiffContainer.find(".ln-m").eq(rowIndex).addClass("selected-line");
                $selectedCodeLine = this._$sideBySideModifiedDiffContainer.find(".code-line").eq(rowIndex).addClass("selected-line");
            }
        }

        if (scrollIntoView && $selectedCodeLine && $selectedCodeLine.length) {
            Utils_UI.Positioning.scrollIntoViewVertical($selectedCodeLine, Utils_UI.Positioning.VerticalScrollBehavior.Middle, true);
        }

        this._currentlySelectedRowIndex = rowIndex;
    }

    private _updateButtons() {
        let prevEnabled = false,
            nextEnabled = false,
            blockIndex = -1,
            rowInfo: DiffRowLineInfo;

        if (this._updateDiffButtonsCallback) {

            if (this._diffModel && this._diffModel.blocks) {

                if (this._currentlySelectedRowIndex >= 0) {
                    rowInfo = this._lineInfoByRowIndex[this._currentlySelectedRowIndex];
                    if (rowInfo) {
                        blockIndex = rowInfo.blockIndex;
                    }
                }

                for (let i = blockIndex - 1; i >= 0; i--) {
                    if (this._diffModel.blocks[i].changeType !== VCOM.FileDiffBlockChangeType.None) {
                        prevEnabled = true;
                        break;
                    }
                }

                for (let i = blockIndex + 1; i < this._diffModel.blocks.length; i++) {
                    if (this._diffModel.blocks[i].changeType !== VCOM.FileDiffBlockChangeType.None) {
                        nextEnabled = true;
                        break;
                    }
                }
            }

            this._updateDiffButtonsCallback(prevEnabled, nextEnabled);
        }
    }
}

/**
 * Adjusts the provided offset relative to the `$baseNode` so it's a character offset for the whole line.
 */
function calculateLineOffset($baseNode: JQuery, nodeOffset: number, $codeLine: JQuery) {
    let column = nodeOffset;

    const startSpan = $baseNode.closest("span")[0];
    for (const child of $codeLine.children().toArray()) {
        if (child === startSpan) {
            if ($baseNode[0].nodeName !== "#text") {
                // If the base node is a Text node, offset is in characters so we're OK.
                // It may be a span though, this happens in Edge when selecting to the end of the line.
                // In this case, offset 1 means the whole span, so we have to add its characters.
                if (nodeOffset === 1) {
                    column += $baseNode.text().length;
                }
            }

            break;
        }
        else {
            column += $(child).text().length;
        }
    }

    return column;
}

VSS.classExtend(BuiltInDiffViewer, TfsContext.ControlExtensions);

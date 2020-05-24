/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import * as ReactDOM from "react-dom";

import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Events_Document = require("VSS/Events/Document");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSUtils = require("Presentation/Scripts/TFS/TFS.Core.Utils.VisualStudio");
import VSS_Context = require("VSS/Context");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Telemetry = require("VersionControl/Scripts/TFS.VersionControl.Telemetry");

import { EditorPreferences, EditorPreferencesMenuId } from "VersionControl/Scenarios/EditorPreferences/EditorPreferences";
import VCEditorExtension = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { EditorPreferences as EditorUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingDialogs = require("VersionControl/Scripts/Controls/SourceEditingDialogs");
import VCSourceEditingEvents = require("VersionControl/Scripts/Controls/SourceEditingEvents");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCSourceRendering = require("VersionControl/Scripts/TFS.VersionControl.SourceRendering");
import VCWikiLinkTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer");
import VCWikiImageTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiImageTransformer");
import VCChangeListNavigator = require("VersionControl/Scripts/Controls/ChangeListNavigator");
import VCFileViewerEditConfirmationDialog = require("VersionControl/Scripts/Controls/FileViewerEditConfirmationDialog");
import VCFileViewerEditPanel = require("VersionControl/Scripts/Controls/FileViewerEditPanel");
import VCCreateBranchDialogLazy = require("VersionControl/Scripts/Controls/CreateBranchDialogLazy");
import VCExtensionActionHandler = require("VersionControl/Scripts/ExtensionActionHandler");
import VCExtensionViewerSupport = require("VersionControl/Scripts/ExtensionViewerSupport");
import VCViewerConfigurerExtensionSupport = require("VersionControl/Scripts/Controls/ViewerConfigurerExtensionSupport");
import TFS_Dashboards_PushToDashboard_NO_REQUIRE = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_PushToDashboardInternal = require("Dashboards/Scripts/Pinning.PushToDashboardInternal");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import { MentionSyntaxProcessor } from "Mention/Scripts/MentionSyntaxProcessor";
import "Mention/Scripts/TFS.Mention.WorkItems.Registration"; // to register work-item mention parser and provider
import { LineAdornmentOptions } from "VersionControl/Scripts/FileViewerLineAdornment";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { UserContentAnchorHelper } from "ContentRendering/Markdown";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as VSS_Service from "VSS/Service";
import { ClientTheme } from "VSS/Platform/Theming";

import "VSS/LoaderPlugins/Css!FileViewerMarkdownStyles";
import Q = require("q");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface FileViewerScrollPosition {
    scrollTop: number;
    scrollLeft: number;
    lineHeight: number;
    topOffset: number;
    firstLineTop: number;
}
export interface FileViewerScrollPositionListener {
    (position: FileViewerScrollPosition): void;
}

export interface FileViewerSelection {
    startColumn: number;
    startLineNumber: number;
    endColumn: number;
    endLineNumber: number;
    positionColumn: number;
    positionLineNumber: number;
}

export interface FileEditSettings {
    allowEditing?: boolean;
    allowBranchCreation?: boolean;
    editMode?: boolean;
    newFile?: boolean;
    initialContent?: string;
}

export interface FileViewSettings {
    contentRendererOptions: ContentRendering.IContentRendererOptions;
    scrollContentTo?: string;
    line?: LineAdornmentOptions;
}

export interface FileViewerSelectionListener {
    (position: FileViewerSelection): void;
}

/*
*  To Provide Offline File Viewer Settings, to support minimum features
*  which does not have VSTS dependencies.
*  Eg- Search support for Version controls outside VSO, like Source Depot,
*  and support for feeding the pre-fetched content to preview a file(also a search scenario).
*/
export interface FileViewerOfflineSettings {
    isOffline: boolean,
    enableAddOns: boolean,
    forceRefresh: boolean,
    hitAdornments: any,
    offlineFileContent: VCLegacyContracts.FileContent,
    offlineFileContentUrl?: string
    canDownloadOffline?: boolean,
    offlineFileDownloadUrl?: string
}

export interface FileViewerOptions {
    allowEditing?: boolean,
    hostInIframe?: boolean,    // If true, then host the Monaco editor in an iframe (instead of a div) via the legacy extension model.
    monitorScroll?: boolean,
    monitorSelection?: boolean,
    /** Optionally host the toolbar in a separate container */
    separateToolbarSelector?: string,
    /** Optionally hide the actions toolbar */
    hideActionsToolbar?: boolean,
    /* Optionally hide the preview/raw sources toggle button */
    hidePreviewButton?: boolean
}

export class FileViewer extends Controls.BaseControl {

    public static EVENT_PREVIEW_MODE_CHANGED = "file-viewer-preview-mode-changed";
    public static EVENT_KEY_PRESSED = "key-pressed";

    // File Content Viewing Identifiers
    private _repositoryContext: RepositoryContext;
    private _item: VCLegacyContracts.ItemModel;
    private _$fileContentsContainer: any;
    private _$previewContentContainer: JQuery;
    private _extensionHost: Extensions.ExtensionHost;
    private _$builtInViewerContainer: JQuery;
    private _$builtInTextViewer: JQuery;
    private _extensionViewerSupport: VCExtensionViewerSupport.VersionControlExtensionViewerSupport;
    private _currentIntegration: any;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _actionsToolbar: Menus.MenuBar;
    private _viewsToolbar: Menus.MenuBar;
    private _changeListNavigator: VCChangeListNavigator.ChangeListNavigator;
    private _updateViewsToolbarDelegate: any;
    private _requestIndex: number;
    private _viewerTopOffset: number;
    private _usingFallbackEditor: boolean;
    private _viewerRefreshNeeded: boolean;
    private _activeState: boolean;
    private _showOpenInVS: boolean;
    private _showFileEdit: boolean;
    private _contentChangedCallback: (content: string) => void;
    private _editorEscapeEditCallback: () => void;
    private _editorPreferences: EditorPreferences;

    private _previewContentMode: boolean;
    private _previewContentUserModesByExt: { [fileExtension: string]: boolean; };
    private _contentRenderer: ContentRendering.IContentRenderer;
    private _pendingScrollContentTo: string;

    // File Discussion identifiers
    private _discussionManager: DiscussionOM.DiscussionManager;
    private _$fileLevelDiscussionsContainer: JQuery;
    private _discussionThreadControlManager: DiscussionOM.DiscussionThreadControlManager;
    private _discussionUpdatedListener: any;
    private _isDiscussionForLeftSide: boolean;

    // File Content Scroll Identifiers
    private _scrollPositionListeners: FileViewerScrollPositionListener[];
    private _scrollPosition: FileViewerScrollPosition;
    private _scrollPositionCallbacks: FileViewerScrollPositionListener[];

    // File Content Selection Identifiers
    private _selectionListeners: FileViewerSelectionListener[];
    private _selection: FileViewerSelection;
    private _selectionCallbacks: any;

    private _viewerConfigurerExtensionHosts: Extensions.ExtensionHost[];

    // File Editing Identifiers
    private _editSettings: FileEditSettings;
    private _editorConfig: any;
    private _editorConfigOptions: any;
    private _contentTooBigToEdit: boolean;
    private _editPanel: VCFileViewerEditPanel.FileViewerEditPanel;
    private _editorContentCallbacks: any;
    private _isEditable: boolean;
    private _isShowingDiff: boolean;
    private _showDiffInline: boolean;
    private _requiresItemRefresh: boolean;

    private _viewItemStartTime: number;

    private _viewSettings: FileViewSettings;
    private _offlineSettings: FileViewerOfflineSettings;
    private _currentTheme: ClientTheme;

    constructor(options?) {
        super(options);
        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);
        this._discussionThreadControlManager = new DiscussionOM.DiscussionThreadControlManager(this._options.tfsContext);
        this._activeState = true;
        this._isEditable = false;
        this._isShowingDiff = false;
        this._editorConfigOptions = {};
        this._previewContentUserModesByExt = {};
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend(options, {
            coreCssClass: "version-control-file-viewer vc-code-editor-viewer"
        }));
    }

    public dispose() {

        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            this._discussionManager = null;
        }

        if (this._discussionThreadControlManager) {
            this._discussionThreadControlManager.dispose();
            this._discussionThreadControlManager = null;
        }

        document.body.removeEventListener("themeChanged", this._handleThemeChangedEvent);

        super.dispose();
    }

    public initialize() {
        super.initialize();

        this._requestIndex = 0;

        const { separateToolbarSelector } = this._options as FileViewerOptions;
        if (separateToolbarSelector) {
            this._createMenus($(separateToolbarSelector))
        }
        else {
            this._createMenus($(domElem("div", "file-contents-menu toolbar")).appendTo(this._element));
        }

        this._$fileContentsContainer = $(domElem("div", "file-contents-container")).appendTo(this._element);
        this._updateViewsToolbarDelegate = delegate(this, this._updateViewsToolbar);

        this._viewerTopOffset = 0;

        this._scrollPositionListeners = [];
        this._selectionListeners = [];
        this._scrollPositionCallbacks = [];
        this._selectionCallbacks = {};
        this._editorContentCallbacks = {};

        this._showOpenInVS = true;
        this._previewContentMode = false;

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("FileViewer", this);

        document.body.addEventListener("themeChanged", this._handleThemeChangedEvent);

        // Initialize Editor User Preferences and context menu shown in Monaco.
        this._editorPreferences = new EditorPreferences();
        const contextMenuItems = (this._options.contextMenuItems || []) as Array<any>;
        contextMenuItems.push(this._editorPreferences.getContextMenuItem());
        this._options.contextMenuItems = contextMenuItems;
    }

    private _handleThemeChangedEvent = (themeChangedEvent: any) => {
        this._currentTheme = themeChangedEvent.detail;
        this._setExternalEditorConfig();
    }

    public isDirty() {
        return !!(this._editPanel && this._editPanel.isDirty());
    }

    public getDirtyDocumentTitles() {
        return this._item ? [VersionControlPath.getFileName(this._item.serverItem)] : [];
    }

    public getPreviewContentMode() {
        return this._previewContentMode;
    }

    public setPreviewContentMode(previewContentModeEnabled: boolean, refreshView: boolean = true) {
        if (this._contentRenderer && this._previewContentMode !== previewContentModeEnabled) {
            this._previewContentMode = previewContentModeEnabled;
            if (this._item && refreshView) {
                this._previewContentUserModesByExt[VersionControlPath.getFileExtension(this._item.serverItem)] = previewContentModeEnabled;
                this._updateViewer();
            }
            this._fire(FileViewer.EVENT_PREVIEW_MODE_CHANGED, { previewMode: previewContentModeEnabled });
        }
    }

    public _dispose() {
        if (this._$previewContentContainer && this._$previewContentContainer.length > 0) {
            const previewContainerElement = this._$previewContentContainer.get()[0];
            ReactDOM.unmountComponentAtNode(previewContainerElement);
        }

        this.setChangeListNavigator(null);

        if (this._extensionHost) {
            this._extensionHost.dispose();
            this._extensionHost = null;
        }

        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }

        super._dispose();
    }

    /*
    *  Returns if the file edit button is clicked and the file is in a editable mode.
    */
    public isEditable() {
        return this._isEditable;
    }

    public setActiveState(active: boolean, skipUpdateView?: boolean) {
        if (active !== this._activeState) {
            this._activeState = active;
            if (active) {
                this._viewerRefreshNeeded = true;
            }

            if (!skipUpdateView && this._extensionHost && !this._usingFallbackEditor) {
                this._setExternalEditorConfig();
            }
        }
    }

    public setChangeListNavigator(changeListNavigator: VCChangeListNavigator.ChangeListNavigator) {
        if (this._changeListNavigator !== changeListNavigator) {
            if (this._changeListNavigator) {
                this._changeListNavigator.detachSourceChangedEvent(this._updateViewsToolbarDelegate);
                this._changeListNavigator = null;
            }

            if (changeListNavigator) {
                this._changeListNavigator = changeListNavigator;
                this._changeListNavigator.attachSourceChangedEvent(this._updateViewsToolbarDelegate);
            }

            this._updateViewsToolbar();
        }
    }

    public setExternalEditorCss(editorCssClass: string, redraw?: boolean) {
        if (this._options.externalViewerCss !== editorCssClass) {
            this._options.externalViewerCss = editorCssClass;
            if (redraw && this._extensionHost) {
                this._setExternalEditorConfig();
            }
        }
    }

    public suppressExternalEditorLayoutRefreshes(suppress: boolean) {
        if (this._options.externalViewerSuppressLayout !== suppress) {
            this._options.externalViewerSuppressLayout = suppress;
            if (this._extensionHost) {
                this._setExternalEditorConfig();
                if (!suppress) {
                    this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.REFRESH_LAYOUT);
                }
            }
        }
    }

    public setDiscussionManager(discussionManager: DiscussionOM.DiscussionManager, redraw?: boolean, isDiscussionLeftSide?: boolean) {
        this._isDiscussionForLeftSide = isDiscussionLeftSide ? true : false;
        if (this._discussionManager !== discussionManager && (discussionManager || this._discussionManager)) {
            this._viewerRefreshNeeded = true;
            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManager = discussionManager;
            if (discussionManager) {
                this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionThreadControlManager.setDiscussionManager(this._discussionManager);
            if (redraw) {
                if (this._extensionHost && !this._usingFallbackEditor) {
                    this._setExternalEditorConfig();
                }
                else if (this._$builtInTextViewer && this._$builtInTextViewer.length) {
                    this._drawFileDiscussionThreads();
                }

                this._viewerRefreshNeeded = false;
            }
        }
    }

    private _addFileLevelThread(thread: DiscussionCommon.DiscussionThread, focus?: boolean) {
        if (this._$fileLevelDiscussionsContainer) {
            VSS.using(["VersionControl/Scripts/Controls/DiffBuiltInDiffViewerDiscussionThreadControlReact"], (reactControl) => {
                let newDiscussionControl = new reactControl.BuiltInDiffViewerDiscussionThreadControlReact(null, thread, this._discussionThreadControlManager, this._$fileLevelDiscussionsContainer);
            });
        }
    }

    private onDiscussionCommentsUpdated(sender: DiscussionOM.DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        let filteredEventData: DiscussionCommon.DiscussionThreadsUpdateEvent;

        if (this._activeState) {
            filteredEventData = sender.filterEventData(eventData, this._item.serverItem);

            if (this._extensionHost && !this._usingFallbackEditor) {
                this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.DISCUSSION_THREAD_UPDATED, filteredEventData);
            }
            else {
                if (filteredEventData.currentThreads) {
                    this._drawFileDiscussionThreads();
                }
                else if (filteredEventData.newThreads) {
                    if (this._$fileLevelDiscussionsContainer) {
                        $.each(filteredEventData.newThreads, (index, newThread) => {
                            if (!newThread.position) {
                                if (this._$fileLevelDiscussionsContainer) {
                                    this._$fileLevelDiscussionsContainer.show();
                                    this._addFileLevelThread(newThread, index === 0);
                                }
                            }
                        });
                    }
                }
            }
        }
    }

    /**
     * Forgets any previous item displayed in the viewer, showing an empty content instead.
     */
    public clearContent(): void {
        this._setEditable(false);

        const editSettings = {
            ...this._editSettings,
            editMode: false,
        };

        this.viewItem(this._repositoryContext, null, editSettings, this._viewSettings, this._offlineSettings);
    }

    /*
    *  Create the file item's view in the control
    *  @repositoryContext - repository context of the file that is required to be previewed
    *  @item - the file item that is required to be previewed
    *  @editSettings - FileEditSettings to configure the editing features in the viewer
    *  @viewSettings - FileViewSettings to configure the content viewing and rendering features
    *  @offlineSettings - FileViewerOfflineSettings to configure the viewer to display offline content in the viewer control
    */
    public viewItem(
        repositoryContext: RepositoryContext,
        item: VCLegacyContracts.ItemModel,
        editSettings?: FileEditSettings,
        viewSettings?: FileViewSettings,
        offlineSettings?: FileViewerOfflineSettings
    ): IPromise<void> {
        let promise: IPromise<any> = Q.resolve(null);

        this._initializeViewItemPreviewTimer();

        const editMode = editSettings ? !!editSettings.editMode : false;

        this._editSettings = editSettings;
        this._viewSettings = viewSettings || <FileViewSettings>{};
        this._offlineSettings = offlineSettings || <FileViewerOfflineSettings>{};

        // Queue up a scroll-content-to if specified in viewSettings
        if (viewSettings) {
            if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
                this._pendingScrollContentTo = UserContentAnchorHelper.convertAnchorName(viewSettings.scrollContentTo);
            }
            else {
                this._pendingScrollContentTo = viewSettings.scrollContentTo;
            }

        }

        const sameItemAsBefore = (repositoryContext === this._repositoryContext && item === this._item);

        // This handles the case when a user has made file edits, then clicked the *same* file in the Source Explorer tree which removed #editMode in the URL,
        // and discarded changes via the browser's confirmation dialog.
        if (sameItemAsBefore && !editMode && this.isEditable() && this.isDirty()) {
            this._discardChanges();
            return promise;
        }

        // This handles the case when a user has made file edits, is showing the Diffs, then clicked a *different* file in the Source Explorer tree,
        // and discarded changes via the browser's confirmation dialog.  We need to turn off the editor diff mode before proceeding to fetch the new item.
        if (!sameItemAsBefore && this._isShowingDiff) {
            this._isShowingDiff = false;
        }

        // This handles the case for changing the edit mode or other state change for the same item as before with no viewer refresh required.
        if (sameItemAsBefore && !this._viewerRefreshNeeded) {
            // Already viewing this item.
            if (this._showFileEdit && this._isEditable !== editMode) {
                this._setEditable(editMode);
            }
            else {
                // Update the actions menu.
                this._updateViewsToolbar();
            }

            this._executePendingScrollContentTo();
            return promise;
        }

        this._repositoryContext = repositoryContext;
        this._item = item;
        this._viewerRefreshNeeded = false;
        this._contentTooBigToEdit = false;
        this._requiresItemRefresh = false;
        this._$previewContentContainer = undefined;
        this._editorPreferences.setRepository(repositoryContext);

        this._showFileEdit = !!(this._options.allowEditing && editSettings && editSettings.allowEditing && this._areAdditionalFeaturesEnabled());

        if (item) {
            const fileExtension = VersionControlPath.getFileExtension(item.serverItem);
            promise = ContentRendering.ContentRendererFactory.getRendererForExtension(fileExtension).then((contentRenderer) => {
                if (contentRenderer) {
                    this._contentRenderer = contentRenderer;
                }
                else {
                    this._contentRenderer = null;
                }
            });
        }

        return promise.then(() => {
            if (item !== this._item) {
                //viewItem was called again before getContentRendererPromise was resolved.
                //Another content renderer will handle displaying the new item, so return here.
                return;
            }
            if (item) {
                this._previewContentMode = this._getPreviewMode(item, editMode);
            }

            this._updateViewer();
            this._editPanel.update(this._item, this._isGitRepository(), this._editSettings);
            this._setEditable(editMode);
        });
    }

    public isContentTooBigToEdit(): boolean {
        return this._contentTooBigToEdit;
    }

    public isPreviewModeAvailable(): boolean {
        return !!this._contentRenderer;
    }

    public isPreviewMode(): boolean {
        return this._previewContentMode;
    }

    public setContentChangedCallback(callback): void {
        if (this._contentChangedCallback) {
            throw new Error("_contentChangedCallback can only be set once. No multiple listeners supported.");
        }

        this._contentChangedCallback = callback;
    }

    public setEditorEscapeEditCallback(callback): void {
        if (this._editorEscapeEditCallback) {
            throw new Error("_editorEscapeEditCallback can only be set once. No multiple listeners supported.");
        }

        this._editorEscapeEditCallback = callback;
    }

    public scroll(scrollTop: number): void {
        if (this._extensionHost) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.SET_SCROLL_POSITION, { scrollTop });
        }
    }

    public scrollContentTo(anchorName: string) {
        this._pendingScrollContentTo = anchorName;
        this._executePendingScrollContentTo();
    }

    private _executePendingScrollContentTo() {
        if (this._pendingScrollContentTo) {
            const scrollContainer = this._$previewContentContainer;
            if (this._previewContentMode && scrollContainer) {
                const targetElement = TFS_Core_Utils.AnchorLinkUtils.findAnchorInContainer(this._pendingScrollContentTo, scrollContainer);
                if (targetElement) {
                    this._executeScrollContentTo(scrollContainer, targetElement, scrollContainer.scrollTop(), new Date());
                }

                this._pendingScrollContentTo = null;
            }
        }
    }

    private _executeScrollContentTo(scrollContainer: JQuery, targetElement: JQuery, lastScrollPosition: number, contentLoadTime: Date) {
        if (!scrollContainer || !targetElement || !contentLoadTime) {
            return;
        }
        // don't scroll if the user manually scrolled the page
        const currentScrollPosition = scrollContainer.scrollTop();
        if (currentScrollPosition != lastScrollPosition) {
            return;
        }
        // don't scroll if it's been more than 60 seconds since the contents loaded
        const timeElapsedSinceContentLoad = new Date().getTime() - contentLoadTime.getTime();
        if (timeElapsedSinceContentLoad > 60000) {
            return;
        }
        // scroll the scrollContainer to the targetElement
        const scrollDelta = targetElement.position().top - scrollContainer.position().top;
        let newScrollPosition = currentScrollPosition + scrollDelta;
        scrollContainer.scrollTop(newScrollPosition);
        newScrollPosition = scrollContainer.scrollTop();
        // scroll again after a short wait so that if the page re-layouts due to asynchronously
        // loaded resources, the targetElement would still be at the top of the page
        window.setTimeout(() => {
            this._executeScrollContentTo(scrollContainer, targetElement, newScrollPosition, contentLoadTime);
        }, 200);
    }

    private _initializeViewItemPreviewTimer() {
        this._viewItemStartTime = new Date().getTime();
    }

    private _publishViewItemPreviewTimer(content: VCLegacyContracts.FileContent) {
        // So that we only log the time on first preview, the ACTUAL fetch.
        // Must reinitialize if you want the publish to work again.
        // There are also some cases in which the content handed to you is secretly
        // Just a string.  We don't care about those in any case, so might as well be defensive.
        if (!this._viewItemStartTime || !content.metadata || !content.content || !content.content.length) {
            return;
        }

        const telemetryProperties: { [x: string]: string } = {
            "TimeInMSec": (new Date().getTime() - this._viewItemStartTime).toString(),
            "ItemSizeInBytes": content.content.length.toString(),
            "ItemExtension": content.metadata.extension
        };
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.FILEVIEWER_PREVIEW_FILE_FEATURE,
            telemetryProperties));

        this._viewItemStartTime = undefined;
    }

    private _updateViewer() {
        const requestIndex = ++this._requestIndex;

        this._updateActionsToolbar();
        this._updateViewsToolbar();

        // [jaspadie March 2016] This VIEWER_CONFIGURER stuff can probably be removed as it was originally added for FxCop-like code annotation that is likely dead.
        // It provides a way for other extensions to provide editor configuration information, but it *probably* isn't used (need to verify before removal).
        // Example: https://mseng.visualstudio.com/DefaultCollection/VSOnline_Archive/_git/Tfs/commit/9b8d57f7d9b5f377e68bb049e9cce70d60340708?_a=summary        
        if (!this._viewerConfigurerExtensionHosts) {
            this._viewerConfigurerExtensionHosts = [];

            const viewerConfigurerExtensionSupport = new VCViewerConfigurerExtensionSupport.ViewerConfigurerExtensionSupport(
                this._options.tfsContext,
                VCControlsCommon.VersionControlExtensionEndPoints.VIEWER_CONFIGURER);

            viewerConfigurerExtensionSupport.getExtensionIntegrations((integrations) => {
                if (integrations) {
                    // Ensure that all extensions are drawn in a non-displayed element inside the viewer
                    const $viewerConfigurerExtensionHostElement: JQuery = $("<div />").addClass("vc-viewer-configurer-hosts").hide().appendTo(this._$fileContentsContainer.parent());

                    $.each(integrations, (index, integration) => {
                        // Draw the host container control
                        const configurerExtensionHost = viewerConfigurerExtensionSupport.createExtensionHost($viewerConfigurerExtensionHostElement, {
                            cssClass: "vc-viewer-configurer-host",
                            integration: integration,
                            messageListener: (data) => {
                                if (data.actionId === VCControlsCommon.ConfigurerExtensionActionIds.UPDATE_EDITOR_CONFIG) {
                                    // We received editor config updates from the extension
                                    this.extendEditorConfig(data.actionData.config);
                                }
                            }
                        });

                        if (this._editorConfig) {
                            // This configurer's extension host was created after the editor was configured, 
                            // and thus didn't yet receive the editor's configuration when _setExternalEditorConfig was called
                            configurerExtensionHost.setConfiguration(this._prepareConfigForExtension());
                        }

                        this._viewerConfigurerExtensionHosts.push(configurerExtensionHost);
                    });
                }
            });
        }

        if (!this._extensionViewerSupport) {

            // Create the fileviewer extension as built-in (hosted in a div, not a separate iframe).
            this._extensionViewerSupport = new VCExtensionViewerSupport.VersionControlExtensionViewerSupport(
                this._options.tfsContext,
                VCControlsCommon.VersionControlExtensionEndPoints.FILE_VIEWER,
                delegate(this, this._getFallbackControl),
                !this._options.hostInIframe);
        }

        const items = this._item ? [this._item] : [];
        this._extensionViewerSupport.getExtensionIntegration(items, {}, (integration) => {

            const externalViewerConfig: any = {};
            const usingContentPreview = this._previewContentMode && this._contentRenderer;

            if (requestIndex !== this._requestIndex) {
                return;
            }

            if (integration !== this._currentIntegration) {
                if (this._extensionHost) {
                    this._extensionHost.dispose();
                    this._extensionHost = null;
                }
                if (this._$builtInViewerContainer) {
                    this._$builtInViewerContainer.remove();
                    this._$builtInViewerContainer = null;
                }
                this._$fileContentsContainer.empty();
                this._usingFallbackEditor = false;
            }

            this._currentIntegration = integration;
            this._scrollPosition = null;
            this._selection = null;

            if (integration && !this._usingFallbackEditor && !usingContentPreview) {

                if (this._$builtInViewerContainer) {
                    this._$builtInViewerContainer.remove();
                    this._$builtInViewerContainer = null;
                }

                if (this._extensionHost) {
                    this._extensionHost.showElement();
                }
                else {

                    if (this._options.monitorScroll) {
                        externalViewerConfig.monitorScroll = true;
                    }
                    if (this._options.monitorSelection) {
                        externalViewerConfig.monitorSelection = true;
                    }
                    if (this._options.bindKeys) {
                        externalViewerConfig.bindKeys = this._options.bindKeys;
                    }
                    if (this._options.contextMenuItems) {
                        externalViewerConfig.contextMenuItems = this._options.contextMenuItems;
                    }
                    if (this._options.externalViewerCss) {
                        externalViewerConfig.editorCss = this._options.externalViewerCss;
                    }
                    if (this._options.selectedDiscussionId) {
                        externalViewerConfig.selectedDiscussionId = this._options.selectedDiscussionId || 0;
                    }

                    externalViewerConfig.supportsDiscussionWorkItemCreation = this._areAdditionalFeaturesEnabled() && (VCControlsCommon.hasProjectContext(this._discussionManager ? this._discussionManager.getTfsContext() : null) && !this._options.disableDiscussionWorkItemCreation);
                    externalViewerConfig.supportCommentStatus = this._areAdditionalFeaturesEnabled() && (this._options.supportCommentStatus ? true : false);
                    externalViewerConfig.supportsAddComment = this._areAdditionalFeaturesEnabled() && this._discussionManager && this._discussionManager.isAddCommentEnabled();
                    externalViewerConfig.editorTheme = this._getEditorTheme();

                    // Draw the host container control
                    this._extensionHost = this._extensionViewerSupport.createExtensionHost(this._$fileContentsContainer, {
                        cssClass: "vc-external-fileviewer-host",
                        integration: integration,
                        postData: externalViewerConfig,

                        messageListener: delegate(this, (data) => {
                            if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.SCROLL_POSITION_CHANGED) {
                                this._scrollPosition = data.actionData || {};
                                this._scrollPosition.topOffset = (this._scrollPosition.topOffset || 0) + this._viewerTopOffset;
                                this._triggerScrollPositionChangedEvent();
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.GET_SCROLL_POSITION) {
                                this._scrollPosition = data.actionData || {};
                                this._scrollPosition.topOffset = (this._scrollPosition.topOffset || 0) + this._viewerTopOffset;
                                $.each(this._scrollPositionCallbacks, (callbackIndex: number, scrollCallback: FileViewerScrollPositionListener) => {
                                    scrollCallback.call(this, this._scrollPosition);
                                });
                                this._scrollPositionCallbacks = [];
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.SELECTION_CHANGED) {
                                this._selection = data.actionData || {};
                                this._triggerSelectionChangedEvent();
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.GET_SELECTION) {
                                this._selection = data.actionData || {};
                                if (this._selectionCallbacks[data.requestId]) {
                                    this._selectionCallbacks[data.requestId].call(this, this._selection);
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.GET_EDITOR_CONTENT) {
                                const content = (data.actionData || {}).content;
                                if (this._editorContentCallbacks[data.requestId]) {
                                    this._editorContentCallbacks[data.requestId].call(this, content);
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_DIRTY_STATE_CHANGED) {
                                const isDirty = (data.actionData || {}).isDirty;
                                this._onEditorDirtyStateChanged(isDirty);
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_CONTENT_CHANGED) {
                                if (this._contentChangedCallback) {
                                    this._contentChangedCallback(data.actionData.content);
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_ESCAPE_EDIT) {
                                if (this.isEditable() && this._editorEscapeEditCallback) {
                                    this._editorEscapeEditCallback();
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT) {
                                if (this._offlineSettings.isOffline) {
                                    // handle offline case. Feed the viewer with the pre-fetched content and highlighting adornments.
                                    const actionData = data.actionData || [];
                                    const contentResults = this._offlineSettings.offlineFileContent || { content: "" };
                                    this._extensionHost.postMessage(data.actionId, $.extend(actionData, contentResults), data.requestId);
                                    if (this._offlineSettings.hitAdornments) {
                                        // disable further force refreshes.
                                        if (this._editorConfig.forceRefresh) {
                                            this._editorConfig.forceRefresh = false;
                                        }

                                        // update highlighting adornments.
                                        this.extendEditorConfig({
                                            adornmentsEnabled: true,
                                            adornments: this._offlineSettings.hitAdornments.highlightingAdornments
                                        });
                                    }

                                    $.extend(contentResults, { hitAdornments: this._offlineSettings.hitAdornments });
                                    this._extensionHost._fire(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, contentResults);
                                }
                                else if (this._editSettings && this._editSettings.newFile) {
                                    const actionData = data.actionData || [];
                                    const contentResult = { content: this._editSettings.initialContent || "" };
                                    this._extensionHost.postMessage(data.actionId, $.extend(actionData, contentResult), data.requestId);
                                    this._extensionHost._fire(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, actionData, contentResult);
                                }
                                else {
                                    this._repositoryContext.getClient().beginGetItemContentJson(
                                        this._repositoryContext,
                                        data.actionData.path,
                                        data.actionData.version,
                                        (result) => {
                                            if (this._extensionHost && !this._extensionHost.isDisposed()) {
                                                this._extensionHost.postMessage(data.actionId, $.extend(data.actionData, result), data.requestId);
                                                this._extensionHost._fire(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, data.actionData, result);

                                                if (this._item && this._item.serverItem === data.actionData.path && this._item.version === data.actionData.version) {

                                                    // The encoding returned when fetching file contents is based on scanning the entire file (not just part of it).
                                                    // So, it is more likely to be correct and we should know it in case we edit the file.
                                                    if (result && result.metadata && this._item.contentMetadata) {
                                                        this._item.contentMetadata.encoding = result.metadata.encoding || 0;
                                                    }

                                                    // Check for truncated file contents, and update the UI if so.
                                                    if (result.exceededMaxContentLength ||
                                                        (result.content && result.content.length > VCSourceEditing.Constants.MAX_EDIT_FROM_WEB_CONTENT_SIZE)) {
                                                        this._contentTooBigToEdit = true;
                                                        this._setEditable(false);
                                                        this._updateActionsToolbar();
                                                    }
                                                }
                                            }
                                        },
                                        (error) => {
                                            this._extensionHost.postMessage(data.actionId, $.extend(data.actionData, {
                                                error: error.message
                                            }), data.requestId);
                                        });
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_KEY_PRESSED) {
                                const content = data.actionData || {};
                                this._fire(FileViewer.EVENT_KEY_PRESSED, <VCEditorExtension.IEditorKeybinding>content);
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_CONTEXT_MENU_ITEM_CLICKED) {
                                const content = data.actionData || {};
                                if (content.contextMenuItemId === EditorPreferencesMenuId) {
                                    this._showEditorPreferencesDialog("monaco-menu-item");
                                }
                                else {
                                    this._fire(VCEditorExtension.ContextMenuItemExtension.EVENT_CONTEXT_MENU_ITEM_CLICKED, <VCEditorExtension.ContextMenuItemClickEventArgs>{
                                        contextMenuItemId: content.contextMenuItemId,
                                        dataForAction: content.dataForAction
                                    });
                                }
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_CREATED) {
                                // Notifying that editor is created and we can update editor config if required
                                this._fire(VCEditorExtension.ContextMenuItemExtension.EDITOR_CREATED, { extensionHost: this._extensionHost });
                            }
                            else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.EDITOR_PREFERENCES_CHANGED) {
                                const preferences = (data.actionData || {}).preferences as EditorUserPreferences;
                                this._editorPreferences.updatePreferences(preferences, "monaco-toggle");
                            }
                            else {
                                VCExtensionActionHandler.versionControlExtensionActionHandler(this._repositoryContext, this._extensionHost, this._discussionManager, (this._item || <VCLegacyContracts.ItemModel>{}).serverItem, data);
                            }
                        })
                    });

                    this._extensionHost._bind(Extensions.ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, () => {
                        this._updateTopOffset();
                        if (this._options.monitorScroll) {
                            this._scrollPosition = null;
                            this.beginGetScrollPosition((position: FileViewerScrollPosition) => {
                                this._triggerScrollPositionChangedEvent();
                            });
                        }
                    });
                }

                // Setting the external editor config with forceRefresh argument.
                // This is required for search scenario where the first search result returned is the same(e.g path, version etc), as the previously selected result.
                // In that case the fileviewer won't ask to fetch content of the file, as the editor configuration hasn't changed at all.
                // But the behavior expected here is to refresh the content to show the preview of the selected result.
                const forceRefresh = this._offlineSettings.forceRefresh || false;
                this._setExternalEditorConfig(undefined, forceRefresh);
            }
            else {
                if (this._extensionHost) {
                    this._extensionHost.hideElement();
                }

                if (this._$builtInViewerContainer) {
                    this._$builtInViewerContainer.empty();
                }
                else {
                    this._$builtInViewerContainer = $(domElem("div", "version-control-builtin-viewer")).appendTo(this._$fileContentsContainer);
                }
                this._beginShowItemBuiltInEditor(this._$builtInViewerContainer, this._item);
            }
        });
    }

    private _getEditorTheme(): string {
        let editorTheme;
        if (!this._currentTheme) {
            let _webPageDataService: WebPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
            this._currentTheme = _webPageDataService.getPageData<ClientTheme>("ms.vss-web.theme-data");
        }

        if ((Utils_String.caseInsensitiveContains((VSS_Context.getPageContext().globalization.theme || ""), "HighContrast"))) {
            editorTheme = "hc-black";
        } else {
            editorTheme = this._currentTheme && this._currentTheme.isDark ? "vs-dark" : "vs";
        }

        return editorTheme;
    }

    private _getPreviewMode(item: VCLegacyContracts.ItemModel, editMode: boolean) {
        let previewContentMode = false;
        if (item && this._contentRenderer && !editMode) {
            const fileExtension = VersionControlPath.getFileExtension(item.serverItem);
            previewContentMode = this._previewContentUserModesByExt[fileExtension];
            if (typeof previewContentMode === "undefined") {
                previewContentMode = this._contentRenderer.defaultBehavior === ContentRendering.ContentRenderingDefaultBehavior.ShowRenderedContent;
                this._previewContentUserModesByExt[fileExtension] = previewContentMode;
            }
        }
        return previewContentMode;
    }

    public setLineLinkingWidgetUrl(url: string, forceRefresh = false) {
        // This method typically wouldn't get called while Monaco is in edit mode, but since Edge sometimes creates a race condition when
        // committing changes to a new branch, we need check _isEditable to avoid a focus issue between Monaco and the dialog (Bug #674025).
        this.extendEditorConfig({
            lineLinkingWidgetUrl: url
        }, forceRefresh && !this._isEditable);
    }

    public extendEditorConfig(configOptions: any, setConfig: boolean = true) {
        $.extend(this._editorConfigOptions, configOptions);
        if (setConfig) {
            this._doSetExternalEditorConfig();
        }
    }

    private _doSetExternalEditorConfig() {
        if (this._extensionHost && this._editorConfig) {
            const extendedConfig = {
                ...this._editorConfig,
                ...this._editorConfigOptions,
                userPreferences: this._editorPreferences.getPreferences(),
            };

            this._extensionHost.setConfiguration(extendedConfig);
        }
    }

    private _prepareConfigForExtension() {
        let repositoryContext = null;
        if (this._isGitRepository()) {
            repositoryContext = (<GitRepositoryContext>this._repositoryContext).getRepository();
        }
        return {
            "tfsContext": this._options.tfsContext,  // The extension needs to know the current collection
            "repositoryContext": repositoryContext,  // The extension needs to know the current repository
            "editorConfig": this._editorConfig       // The extension needs to know the current item and editor configuration
        }
    }

    // content: overrides to specify the content to show.
    // forceRefresh: force a file refetch even if path and version are the same as before (Ex: a updated file exists at version GBmaster).
    private _setExternalEditorConfig(content?: string, forceRefresh = false) {
        // Compute a new default configuration for the editor
        this._editorConfig = {
            content: content,
            path: this._item && this._item.serverItem,
            version: this._item && this._item.version,
            repositoryId: this._repositoryContext ? this._repositoryContext.getRepositoryId() : null,
            fileInfo: this._item && this._item.contentMetadata,
            editorCss: this._options.externalViewerCss,
            skipLayoutOnResize: this._options.externalViewerSuppressLayout,
            discussionThreads: this._getDiscussionThreadsForThisItem(),
            commentsEnabled: this._discussionManager ? true : false,
            commentsDefaultPositionContext: this._isDiscussionForLeftSide ? DiscussionCommon.PositionContext.LeftBuffer : DiscussionCommon.PositionContext.RightBuffer,
            selectedDiscussionId: this._options.selectedDiscussionId || 0,
            activeState: this._activeState,
            editable: this._isEditable,
            forceRefresh: forceRefresh,
            showDiff: this._isEditable && this._isShowingDiff,
            inline: this._showDiffInline,
            editorTheme: this._getEditorTheme()
        };

        // Notify the loaded configurer extensions that the editor config changed
        if (this._viewerConfigurerExtensionHosts) {
            $.each(this._viewerConfigurerExtensionHosts, (index, extensionHost) => {
                extensionHost.setConfiguration(this._prepareConfigForExtension());
            });
        }

        // Set the editor's config, knowing that any extensions may later update it
        this._doSetExternalEditorConfig();
    }

    private _getDiscussionThreadsForThisItem() {
        let threads: DiscussionCommon.DiscussionThread[] = [];
        if (this._discussionManager && this._item) {
            threads = $.grep(this._discussionManager.getCurrentThreadsForItemPath(this._item.serverItem), (thread: DiscussionCommon.DiscussionThread) => {
                return !thread.position || thread.position.positionContext === (this._isDiscussionForLeftSide ? DiscussionCommon.PositionContext.LeftBuffer : DiscussionCommon.PositionContext.RightBuffer);
            });
        }
        return threads;
    }

    private _getContentRendererOptionsOrDefaults(): ContentRendering.IContentRendererOptions {

        let rendererOptions = <ContentRendering.IContentRendererOptions>{};
        if (this._viewSettings && this._viewSettings.contentRendererOptions) {
            rendererOptions = this._viewSettings.contentRendererOptions;
        }
        if (this._item && VCSourceRendering.WikiRelativeLinkEnablement.isWikiLinkTransformationEnabled()) {
            if (typeof rendererOptions.linkTransformer === "undefined") {
                rendererOptions.linkTransformer
                    = new VCWikiLinkTransformer.CodeExplorerWikiLinkTransformer(this._repositoryContext, this._item);
            }
        }

        if (this._item && typeof rendererOptions.imageTransformer === "undefined") {
            rendererOptions.imageTransformer
                = new VCWikiImageTransformer.WikiImageTransformer(this._repositoryContext, this._item);
        }

        rendererOptions.async = true;
        rendererOptions.customSyntaxProcessor = new MentionSyntaxProcessor();
        rendererOptions.html = true;
        rendererOptions.enableYaml = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessMarkdownYamlSupport, false);

        if (this._item && typeof rendererOptions.linkClickHandler === "undefined") {
            const logProperties: { [x: string]: string } = {
                "sourceUrl": this._item.url,
                "repositoryId": this._repositoryContext.getRepositoryId(),
                "project": this._repositoryContext.getTfsContext().navigation.project,
                "item": this._item.serverItem
            };
            rendererOptions.linkClickHandler
                = Telemetry.linkClickHandlerFactory.create("VersionControl", "VersionControlMarkdownLinkOnClick", logProperties);
        }
        return rendererOptions;
    }

    private _beginShowItemBuiltInEditor($container: JQuery, item: VCLegacyContracts.ItemModel) {

        let requestIndex = ++this._requestIndex,
            $statusContainer: JQuery,
            statusControl: StatusIndicator.StatusIndicator;

        $statusContainer = $(domElem("div", "status-container")).appendTo(this._element);
        statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $statusContainer, {
            center: true,
            imageClass: "big-status-progress",
            message: VCResources.LoadingText
        });

        this.delayExecute("showWaitIndicator", 200, true, () => {
            if (statusControl) {
                statusControl.start();
            }
        });

        const usePreview = this._previewContentMode && this._contentRenderer;
        const splitContentIntoLines = !usePreview;

        const getItemContentSuccessCallback = (content: VCLegacyContracts.FileContent) => {

            let $message: JQuery,
                $imageContainer: JQuery,
                $imageLink: JQuery,
                imageUrl: string;

            $statusContainer.remove();
            statusControl = null;

            if (!this._disposed && requestIndex === this._requestIndex) {

                if (usePreview) {
                    this._$previewContentContainer = $(domElem("div", "vc-preview-content-container")).appendTo($container);
                    this._contentRenderer.renderContent(content.content, this._$previewContentContainer, this._getContentRendererOptionsOrDefaults(), true);
                }
                else if (content.metadata.isImage) {

                    $imageContainer = $(domElem("div", "vc-builtin-file-viewer-image")).appendTo($container);

                    this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo($imageContainer);
                    this._$fileLevelDiscussionsContainer.hide();
                    imageUrl = this._areAdditionalFeaturesEnabled() ? VersionControlUrls.getFileContentUrl(this._repositoryContext, item.serverItem, item.version, true) : this._offlineSettings.offlineFileContentUrl;
                    $imageLink = $(domElem("a")).attr({ "href": imageUrl, target: "_blank" }).appendTo($imageContainer);
                    $(domElem("img", "vc-builtin-file-viewer-image-img"))
                        .attr({ src: imageUrl, title: Utils_String.format(VCResources.ImageTitle, item.serverItem, item.versionDescription) })
                        .appendTo($imageLink);
                }
                else if (content.metadata.isBinary) {

                    $message = $(domElem("div"));
                    $(domElem("div"))
                        .text(Utils_String.format(VCResources.FileViewerUnableToShowContent, content.metadata.extension))
                        .appendTo($message);

                    $(domElem("br")).appendTo($message);
                    $(domElem("a"))
                        .text(VCResources.FileViewerClickToDownloadContent)
                        .attr("href", this._areAdditionalFeaturesEnabled() ? VersionControlUrls.getFileContentUrl(this._repositoryContext, item.serverItem, item.version) : this._offlineSettings.offlineFileDownloadUrl)
                        .appendTo($(domElem("div")).appendTo($message));

                    Controls.BaseControl.createIn(Notifications.MessageAreaControl, $(domElem("div", "vc-builtin-file-viewer-message-area")).appendTo($container), {
                        closeable: false,
                        message: {
                            header: $message,
                            type: Notifications.MessageAreaType.Warning
                        }
                    });

                    this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo($container);
                    this._$fileLevelDiscussionsContainer.hide();
                }
                else if (!content.content) {
                    $(domElem("div", "vc-builtin-file-viewer-message")).text(VCResources.FileIsEmpty).appendTo($container);

                    this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo($container);
                    this._$fileLevelDiscussionsContainer.hide();
                }
                else {
                    this._drawFileContent($container, content);
                }

                this._executePendingScrollContentTo();

                if (this._discussionManager) {
                    this._drawFileDiscussionThreads();
                }

                this._updateTopOffset();

                if (this._options.monitorScroll) {
                    this._scrollPosition = this._getBuiltInViewerScrollPosition();
                    this._triggerScrollPositionChangedEvent();
                }

                this._fire(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, { content: content, hitAdornments: this._offlineSettings.hitAdornments });
                this._publishViewItemPreviewTimer(content);
            }
        };

        const getItemContentErrorCallback = (error: any) => {
            $statusContainer.remove();
            statusControl = null;

            if (requestIndex === this._requestIndex) {
                Controls.BaseControl.createIn(Notifications.MessageAreaControl, $(domElem("div", "vc-builtin-file-viewer-message-area")).appendTo($container), {
                    closeable: false,
                    message: VSS.getErrorMessage(error)
                });
            }
        };

        if (this._isOfflineContentMetadataPresent(this._offlineSettings)) {
            if (!this._offlineSettings.offlineFileContent.metadata.isBinary && !this._offlineSettings.offlineFileContent.metadata.isImage && splitContentIntoLines) {
                this._offlineSettings.offlineFileContent.contentLines = this._offlineSettings.offlineFileContent.content.split('\n');
            }

            getItemContentSuccessCallback(this._offlineSettings.offlineFileContent);
        }
        else if (usePreview && this._editPanel.isVisible()) {
            // Show preview for file that is being edited. Use the edited content.
            this.beginGetEditorContent((content: string) => {
                getItemContentSuccessCallback(<VCLegacyContracts.FileContent>{
                    content: content
                });
            });
        }
        else if (this._editSettings && this._editSettings.newFile) {
            getItemContentSuccessCallback(<VCLegacyContracts.FileContent>{
                content: this._editSettings.initialContent || "",
                metadata: <VCLegacyContracts.FileContentMetadata>{
                    extension: VersionControlPath.getFileExtension(item.serverItem)
                }
            });
        }
        else if (item) {
            this._repositoryContext.getClient().beginGetItemContentJson(
                this._repositoryContext,
                item.serverItem,
                item.version,
                getItemContentSuccessCallback,
                getItemContentErrorCallback);
        }
        else if (usePreview) {
            getItemContentSuccessCallback(<VCLegacyContracts.FileContent>{
                content: "",
            });
        }
    }

    private _drawFileContent($container: JQuery, content: VCLegacyContracts.FileContent) {

        let $table: JQuery;

        this._$builtInTextViewer = $(domElem("div", "vc-builtin-file-viewer"));

        this._$fileLevelDiscussionsContainer = $(domElem("div", "file-level-discussion-container")).appendTo(this._$builtInTextViewer);
        this._$fileLevelDiscussionsContainer.hide();

        $table = $(domElem("table")).appendTo(this._$builtInTextViewer);

        if (content.exceededMaxContentLength) {
            this._$builtInTextViewer.addClass("truncated");
            $(domElem("div", "vc-builtin-file-viewer-message")).text(VCResources.FileViewerContentIsTrimmed).appendTo($container);
        }

        // Given that Monaco is always available, we should never reach this point of rendering text content ourselves, but keeping as a sanity fallback.
        content.contentLines = (content.content || "").split('\n');
        $.each(content.contentLines, (lineIndex: number, lineContent: string) => {
            const $tr = $(domElem("tr", "line-row")).appendTo($table);

            $(domElem("td", "ln"))
                .text("" + (lineIndex + 1))
                .appendTo($tr);

            $(domElem("td", "content"))
                .text(lineContent)
                .appendTo($tr);
        });

        if (this._options.monitorScroll) {
            this._$builtInTextViewer.bind("scroll", () => {
                this._scrollPosition = this._getBuiltInViewerScrollPosition();
                this._triggerScrollPositionChangedEvent();
            });
        }

        this._$builtInTextViewer.appendTo($container);
    }

    private _drawFileDiscussionThreads() {
        let discussionThreads: DiscussionCommon.DiscussionThread[] = [],
            fileLevelThreads: DiscussionCommon.DiscussionThread[] = [];

        // Clear existing review comments
        this._element.find(".discussion-thread").remove();

        discussionThreads = this._getDiscussionThreadsForThisItem();
        fileLevelThreads = $.grep(discussionThreads, (thread: DiscussionCommon.DiscussionThread) => {
            return thread.position ? false : true;
        });

        // Add file-level comments 
        if (fileLevelThreads.length > 0) {
            if (this._$fileLevelDiscussionsContainer) {
                this._$fileLevelDiscussionsContainer.show();
            }
            $.each(fileLevelThreads, (i: number, thread: DiscussionCommon.DiscussionThread) => {
                // draw discussion thread
                this._addFileLevelThread(thread);
            });
            this._element.addClass("has-file-level-discussion-threads");
        }
        else {
            if (this._$fileLevelDiscussionsContainer) {
                this._$fileLevelDiscussionsContainer.hide();
            }
            this._element.removeClass("has-file-level-discussion-threads");
        }
    }

    public beginGetScrollPosition(callback: (position: FileViewerScrollPosition) => void) {

        if (this._scrollPosition) {
            callback.call(this, this._scrollPosition);
        }
        else if (this._extensionHost && !this._usingFallbackEditor) {
            this._scrollPositionCallbacks.push(callback);
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.GET_SCROLL_POSITION, {});
        }
        else {
            this._scrollPosition = this._getBuiltInViewerScrollPosition();
            callback.call(this, this._scrollPosition);
        }
    }

    public beginGetEditorContent(callback: (content: string) => void) {
        let extensionRequestId: number;

        if (this._extensionHost && !this._usingFallbackEditor) {
            this._editorContentCallbacks[extensionRequestId] = callback;

            // If we are creating a new file for Git, then default to use LF line endings (not the default CRLF for a new file).
            let codeEditorOptions = null;
            if (this._editSettings && this._editSettings.newFile && this._isGitRepository()) {
                codeEditorOptions = <CodeEditorApi.ICodeEditorOptions>{ lineEnding: CodeEditorApi.LINE_ENDING_LF };
            }
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.GET_EDITOR_CONTENT, { codeEditorOptions: codeEditorOptions });
        }
        else {
            callback.call(this, null);
        }
    }

    public beginResetEditorDiffContent() {
        let extensionRequestId: number;

        if (this._extensionHost && !this._usingFallbackEditor) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.RESET_EDITOR_DIFF_CONTENT, {});
        }
    }

    public addScrollPositionListener(callback: FileViewerScrollPositionListener) {
        this._scrollPositionListeners.push(callback);
    }

    private _isOfflineContentMetadataPresent(offlineSettings: FileViewerOfflineSettings): boolean {
        return !!(offlineSettings && offlineSettings.isOffline && offlineSettings.offlineFileContent && offlineSettings.offlineFileContent.metadata);
    }

    private _triggerScrollPositionChangedEvent() {
        $.each(this._scrollPositionListeners, (i: number, listener: FileViewerScrollPositionListener) => {
            listener.call(this, this._scrollPosition);
        });
    }

    private _getBuiltInViewerScrollPosition(): FileViewerScrollPosition {
        if (this._$builtInTextViewer && this._$builtInTextViewer.length) {
            return <FileViewerScrollPosition>{
                scrollTop: this._$builtInTextViewer[0].scrollTop,
                scrollLeft: this._$builtInTextViewer[0].scrollTop,
                lineHeight: 16,
                topOffset: this._viewerTopOffset
            };
        }
        else {
            return <FileViewerScrollPosition>{
                scrollTop: 0,
                scrollLeft: 0,
                lineHeight: 16,
                topOffset: this._viewerTopOffset
            };
        }
    }

    public beginGetSelection(callback: (position: FileViewerSelection) => void) {
        let extensionRequestId: number;

        if (this._selection) {
            callback.call(this, this._selection);
        }
        else if (this._extensionHost) {
            this._selectionCallbacks[extensionRequestId] = callback;
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.GET_SELECTION, {});
        }
        else {
            this._selection = <FileViewerSelection>{
                startColumn: 1,
                startLineNumber: 1,
                endColumn: 1,
                endLineNumber: 1,
                positionColumn: 1,
                positionLineNumber: 1
            };
            callback.call(this, this._selection);
        }
    }

    public addSelectionListener(callback: FileViewerSelectionListener) {
        this._selectionListeners.push(callback);
    }

    private _triggerSelectionChangedEvent() {
        $.each(this._selectionListeners, (i: number, listener: FileViewerSelectionListener) => {
            listener.call(this, this._selection);
        });
    }

    private _getFallbackControl() {
        this._usingFallbackEditor = true;
        this._$builtInViewerContainer = $("<div />");
        this._beginShowItemBuiltInEditor(this._$builtInViewerContainer, this._item);
        return this._$builtInViewerContainer;
    }

    private _createMenus($container) {

        const hideActions = (<FileViewerOptions>this._options).hideActionsToolbar;

        if (!hideActions) {
            this._actionsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
                cssClass: "file-actions-menu",
                items: []
            });
        }

        this._createEditPanel($(domElem("div", "vc-file-viewer-edit-panel-container")).appendTo($container));

        if (hideActions) {
            this._editPanel.hideElement();
        }

        const $viewsMenuContainer = $(domElem("div", "file-views-menu-container"));
        this._viewsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $viewsMenuContainer, {
            cssClass: "file-views-menu",
            items: []
        });
        $viewsMenuContainer.appendTo($container);
    }

    private _updateActionsToolbar() {

        if (!this._actionsToolbar) {
            return;
        }

        const menuItems: any[] = [];

        if (this._item && !this._item.isSymLink && !this._isEditable) {
            if (this._showOpenInVS && this._areAdditionalFeaturesEnabled() && TFS_Core_Utils.UserAgentUtils.isWindowsClient() && this._item.contentMetadata && this._item.contentMetadata.vsLink) {
                // Only show "Open in VS" action for .sln files
                if (Utils_String.localeIgnoreCaseComparer(this._item.contentMetadata.extension, "sln") === 0) {
                    menuItems.push({
                        id: "open-file-in-vs",
                        title: VCResources.OpenInVisualStudioTooltip,
                        icon: "bowtie-icon bowtie-logo-visual-studio",
                        showText: false,
                        action: () => {
                            VSUtils.VSLauncher.openVSWebLink(this._item.contentMetadata.vsLink);
                        }
                    });
                    menuItems.push({ separator: true });
                }
            }

            if (this._discussionManager && !this._discussionManager.getViewOptions().hideComments) {
                menuItems.push({
                    id: "add-file-discussion",
                    text: VCResources.AddCommentAction,
                    title: VCResources.AddCommentAction,
                    icon: "bowtie-icon bowtie-comment-add",
                    action: () => {
                        this.beginGetSelection((selection: FileViewerSelection) => {
                            let position: DiscussionCommon.DiscussionPosition;
                            if (this._item && this._discussionManager) {
                                if (this._extensionHost && selection &&
                                    (selection.endLineNumber > 1 || selection.endColumn > 1) &&
                                    (selection.startLineNumber > selection.endLineNumber || selection.endColumn > selection.startColumn)) {

                                    // Selection-based comment
                                    position = <DiscussionCommon.DiscussionPosition>{
                                        startLine: selection.startLineNumber,
                                        endLine: selection.endLineNumber,
                                        startColumn: selection.startColumn,
                                        endColumn: selection.endColumn,
                                        positionContext: this._isDiscussionForLeftSide ? DiscussionCommon.PositionContext.LeftBuffer : DiscussionCommon.PositionContext.RightBuffer
                                    };
                                }

                                this._discussionManager.createNewDiscussionThread(this._item.serverItem, position);
                            }
                        });
                    }
                });
            }

            if (this._showFileEdit && (!this._item.contentMetadata || !this._item.contentMetadata.isBinary)) {
                menuItems.push({
                    id: "edit-file",
                    text: VCResources.FileViewerEditFileMenuText,
                    title: this._contentTooBigToEdit ? (this._isGitRepository() ? VCResources.MaxFileSizeExceededGit : VCResources.MaxFileSizeExceededTfvc) : VCResources.FileViewerEditFileMenuToolTip,
                    icon: "bowtie-icon bowtie-edit",
                    disabled: this._contentTooBigToEdit,
                    action: () => {
                        this._onToggleEditClick();
                    }
                });
            }

            if (!this._editSettings || !this._editSettings.newFile) {
                const fileDownloadUrl: string = this._areAdditionalFeaturesEnabled() ? VersionControlUrls.getFileContentUrl(this._repositoryContext, this._item.serverItem, this._item.version) : this._offlineSettings.offlineFileDownloadUrl;
                menuItems.push({
                    id: "download-file",
                    text: VCResources.DownloadFileMenuText,
                    title: (this._offlineSettings.isOffline && !this._offlineSettings.canDownloadOffline) ? VCResources.FileViewerClickToDownloadContentDisbled : VCResources.FileViewerClickToDownloadContent,
                    icon: "bowtie-icon bowtie-transfer-download",
                    disabled: (this._offlineSettings.isOffline && !this._offlineSettings.canDownloadOffline),
                    action: () => {
                        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_DOWNLOAD_CLICK, {}));
                        window.open(fileDownloadUrl, "_blank");
                    }
                });

                // If the fileDownloadUrl can't be construct, that mean the file doesn't exist yet. 
                // In the case of the Readme file, the file is there but not in the source depot. 
                // It doesn't make sense to allow the user to add the file to dashboard
                if (fileDownloadUrl &&
                    this._item.serverItem.toLocaleLowerCase().split(".").pop() == "md") {
                    this._buildDashboardMenuEntry(menuItems,
                        JSON.stringify({
                            path: this._item.serverItem,
                            version: this._item.version,
                            repositoryId: this._repositoryContext.getRepositoryId()
                        }));

                }
            }
        }

        this._actionsToolbar.updateItems(menuItems);
    }

    private _buildDashboardMenuEntry(menuItems: any[], artifactId: string): void {
        // lazy load to prevent pulling in dashboard data provider unnecessarily on pull request detail page
        VSS.using(
            ["Dashboards/Scripts/Pinning.PushToDashboard"],
            (TFS_Dashboards_PushToDashboard: typeof TFS_Dashboards_PushToDashboard_NO_REQUIRE) => {
                const widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning("Pinned Markdown", TFS_Dashboards_PushToDashboardConstants.Markdown_WidgetTypeID, artifactId);
                //Create the main menu for pinning to dashboard and do an Ajax call to get submenu
                const mainMenuWithSubMenus = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.getDefault().contextData, widgetData, (args: TFS_Dashboards_PushToDashboardInternal.PinArgs) => {
                    TFS_Dashboards_PushToDashboard.PushToDashboard.pinToDashboard(TfsContext.getDefault().contextData, <any>args.commandArgs);
                });
                menuItems.push(mainMenuWithSubMenus);
            });
    }

    private _createEditPanel($container) {
        this._editPanel = <VCFileViewerEditPanel.FileViewerEditPanel>Controls.BaseControl.createIn(VCFileViewerEditPanel.FileViewerEditPanel, $container, {
            cssClass: "vc-file-viewer-edit-panel",
            tfsContext: this._options.tfsContext
        });
        this._editPanel._bind(VCFileViewerEditPanel.FileViewerEditPanel.EVENT_COMMIT_CLICKED, (event, args) => {
            this._onCommitClicked(args.message);
        });
        this._editPanel._bind(VCFileViewerEditPanel.FileViewerEditPanel.EVENT_COMMIT_TO_NEW_BRANCH_CLICKED, (event, args) => {
            this._onCommitToNewBranchClicked(args.message);
        });
        this._editPanel._bind(VCFileViewerEditPanel.FileViewerEditPanel.EVENT_DISCARD_CLICKED, () => {
            this._onDiscardClicked();
        });
    }

    // Toggle Show/Hide Editor UI (panel for commit message, commit button, and discard button).
    private _onToggleEditClick() {
        if (!this._isEditable) {
            this._isShowingDiff = false;
            this._prepareForEdit();
        }
        else {
            this._onDiscardClicked();
        }
        this._updateViewsToolbar();
    }

    private _onDiffClick(showDiffInline?: boolean) {
        let showDiff = !this._isShowingDiff;
        if (showDiffInline !== undefined) {
            this._showDiffInline = showDiffInline;
            showDiff = true;
        }
        if (this._isEditable && showDiff) {
            this._isShowingDiff = true;
        } else {
            this._isShowingDiff = false;
        }
        this._setExternalEditorConfig();
        this._updateViewsToolbar();
    }

    private _setEditable(isEditable: boolean) {
        isEditable = isEditable && !this._contentTooBigToEdit && this._areAdditionalFeaturesEnabled();

        if (this._isEditable !== isEditable) {

            this._isEditable = isEditable;

            // Bind Esc to switch to save button in editable mode.
            // New Explorer code uses this._editorEscapeEditCallback, so this Escape key listener can be removed when Old Explorer is removed.
            const documentKeyBoardBinding = (e: JQueryEventObject) => {
                if (!this._editorEscapeEditCallback && e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                    $('li[command="commit-file-changes"]').focus();
                }
            };

            if (isEditable) {
                // Clear preview mode when switching to edit mode
                this._previewContentMode = false;
                this._$fileContentsContainer.bind("keydown", documentKeyBoardBinding);
            }
            else {
                // Reset preview mode when switching out of edit mode
                this._previewContentMode = this._getPreviewMode(this._item, false);
                this._$fileContentsContainer.unbind("keydown", documentKeyBoardBinding);
            }

            this._setDirtyState(false);
            this._editPanel.toggleVisibility(isEditable);

            if (this._item) {
                VCSourceEditingEvents.Events._triggerEditModeChangedEvent(this._item.serverItem, this._item.version, isEditable);
            }

            // Update the viewer which may update the preview mode (and calls _setExternalEditorConfig() if applicable)
            this._updateViewer();
        }
    }

    private _onCommitClicked(message: string, newBranchName?: string): JQueryPromise<VCSpecs.VersionSpec> {

        this._disableEditInput();

        // If currently in diff mode, then switch back to edit viewer prior to commit.
        // This is needed for correct rendering  of monaco viewer
        if (this._isShowingDiff) {
            this._isShowingDiff = false;
            this._setExternalEditorConfig();
            this._updateViewsToolbar();

            const deferred = $.Deferred<VCSpecs.VersionSpec>();
            window.setTimeout(() => {
                this._commitChanges(message, newBranchName)
                    .done((versionSpec: VCSpecs.VersionSpec) => deferred.resolve(versionSpec))
                    .fail((error: Error) => deferred.reject(error));
            }, 200);
            return deferred.promise();
        }
        else {
            return this._commitChanges(message, newBranchName);
        }
    }

    // Commit to a new branch, and optionally redirect the browser to create a pull request for it.
    private _onCommitToNewBranchClicked(message: string) {
        VCCreateBranchDialogLazy.createBranchFromItemCommit(this._repositoryContext, this._item.serverItem, this._item.version, (branchParams: VCControlsCommon.CreateBranchParameters) => {
            const originalBranchName = this._getBranchName();
            return this._onCommitClicked(message, branchParams.branchName).done(() => {
                if (branchParams.createPullRequest) {
                    const createPullRequestUrl = VersionControlUrls.getCreatePullRequestUrl(<GitRepositoryContext>this._repositoryContext, branchParams.branchName, originalBranchName);
                    window.location.href = createPullRequestUrl;
                }
            });
        });
    }

    // commit changes to the current item
    private _commitChanges(message: string, newBranchName?: string): JQueryPromise<VCSpecs.VersionSpec> {
        const comment = message || this._editPanel.getDefaultCommitMessage();
        const newFile = this._editSettings && this._editSettings.newFile;
        const commitMessageChanged = comment !== this._editPanel.getDefaultCommitMessage();
        const deferred = $.Deferred<VCSpecs.VersionSpec>();

        // 1) Check to verify that the file has not been updated by another client since it was initially loaded for edit...
        const versionCheckDeferred: JQueryDeferred<VCLegacyContracts.ItemModel> = $.Deferred();
        if (newFile) {
            versionCheckDeferred.resolve(null);
        }
        else if (newBranchName) {
            versionCheckDeferred.resolve(this._item);
        }
        else {
            const isGit = this._isGitRepository();
            const version = isGit ? this._item.version : new VCSpecs.LatestVersionSpec().toVersionString();
            this._beginGetItem(version, (item: VCLegacyContracts.ItemModel) => {
                if (this._matchesFileVersion(item)) {
                    versionCheckDeferred.resolve(item);
                }
                else {
                    // Alert the user that the item has changed and cannot be committed.
                    versionCheckDeferred.reject(<Error>{
                        message: VCResources.EditFileUpdatedAfterEditAlert,
                        name: VCResources.EditFileRefreshTitle
                    });
                }
            });
        }

        // 2) Proceed with the commit.
        versionCheckDeferred.done((item: VCLegacyContracts.ItemModel) => {
            this.beginGetEditorContent((content: string) => {

                if (content.length > VCSourceEditing.Constants.MAX_EDIT_FROM_WEB_CONTENT_SIZE) {
                    const error = new Error(this._isGitRepository() ? VCResources.MaxFileSizeExceededGit : VCResources.MaxFileSizeExceededTfvc);
                    this._handleCommitFailError(error);
                    deferred.reject(error);
                    return;
                }

                let savePromise: JQueryPromise<VCSpecs.VersionSpec>;
                const originalVersion = this._item.version;

                // File encodings used:
                // Git  - Always encodes as UTF-8 without the BOM.
                // Tfvc - New files: UTF-8 without the BOM.  Existing files: Existing encoding.  If UTF-8, then encodes as UTF-8 without the BOM.
                // This might be changed in the future to allow specifying a BOM from the client, or simply preserving the existing BOM state on the server.
                if (this._isGitRepository()) {
                    const branch = this._getBranchName();
                    // Use the latest commitId in the recently fetched item for the branch head.
                    const commitId = newFile ? "" : (<VCLegacyContracts.GitItem>item).commitId.full;
                    savePromise = VCSourceEditingDialogs.Actions.editFileGit(this._repositoryContext, this._item.serverItem, commitId, branch, newFile, content, comment, newBranchName);
                }
                else {
                    const changesetId = newFile ? 0 : (<VCLegacyContracts.TfsItem>this._item).changeset;
                    const encoding: number = this._item.contentMetadata ? this._item.contentMetadata.encoding || VCSourceEditing.TfvcEncodingConstants.UTF8 : VCSourceEditing.TfvcEncodingConstants.UTF8;
                    savePromise = VCSourceEditingDialogs.Actions.editFileTfvc(this._repositoryContext, this._item.serverItem, changesetId, newFile, content, comment, encoding);
                }

                savePromise.done((versionSpec: VCSpecs.VersionSpec) => {
                    this._resetUserPreviewModePreference();
                    this._enableEditInput();
                    this.beginResetEditorDiffContent();

                    if (this._editSettings && this._editSettings.newFile) {
                        this._editSettings.newFile = false;
                    }

                    // Refresh the item and refresh the editor to reset the dirty state. For Git we need to stay on the branch version spec (using the new branch name if applicable).
                    const versionString = this._isGitRepository() ? (newBranchName ? new VCSpecs.GitBranchVersionSpec(newBranchName).toVersionString() : originalVersion) : versionSpec.toVersionString();
                    this._beginGetItem(versionString, (item: VCLegacyContracts.ItemModel) => {
                        this._item = item;
                        this._setEditable(false);
                        this._setExternalEditorConfig(null, true);
                        deferred.resolve(versionSpec);
                    }, (error: Error) => deferred.reject(error));

                    const feature = newFile ? CustomerIntelligenceConstants.FILEVIEWER_FILE_ADD_COMMIT_FEATURE : CustomerIntelligenceConstants.FILEVIEWER_EDIT_COMMIT_FEATURE;
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, feature, {
                        "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem),
                        "CommitMessageChanged": commitMessageChanged
                    }));

                    // savePromise failed
                }).fail((error: Error) => {
                    this._handleCommitFailError(error);
                    deferred.reject(error);
                });
            });

            // versionCheckDeferred failed.
        }).fail((error: Error) => {
            this._handleCommitFailError(error);
            this._requiresItemRefresh = true;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _disableEditInput() {
        this._editPanel.disableInput();
    }

    private _enableEditInput() {
        this._editPanel.enableInput();
    }

    private _getBranchName() {
        const versionSpec = VCSpecs.VersionSpec.parse(this._item.version);
        if (!(versionSpec instanceof VCSpecs.GitBranchVersionSpec)) {
            throw new Error("Cannot edit using a git version spec other than branch.");
        }
        return (<VCSpecs.GitBranchVersionSpec>versionSpec).branchName;
    }

    private _isGitRepository() {

        return this._repositoryContext ? this._repositoryContext.getRepositoryType() === RepositoryType.Git : false;
    }

    private _handleCommitFailError(error: Error) {
        const isGitRepo = this._isGitRepository();
        let alertMessage: string;

        if (isGitRepo && ("" + error.message).toUpperCase().indexOf("TF402455") === 0) {
            // This is is a specific failure case where we want to use a specific alert message
            const branchName = this._getBranchName();
            alertMessage = Utils_String.format(VCResources.CommitFailedUsePullRequest, branchName);
        }
        else {
            const messageFormat = isGitRepo ? VCResources.CommitFailedMessageFormat : VCResources.CheckinFailedMessageFormat;
            alertMessage = Utils_String.format(messageFormat, error.message);
        }

        alert(alertMessage);
        this._enableEditInput();
    }

    // Confirm discard if there were any changes before proceeding.
    private _onDiscardClicked() {
        if (this.isDirty()) {
            Dialogs.show(VCFileViewerEditConfirmationDialog.FileEditConfirmationDialog, {
                okCallback: () => {
                    this._discardChanges();
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_DISCARD_FEATURE, {
                        "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                    }));
                },
                editWarningHtml: Utils_String.format(VCResources.EditFileDiscardChangesConfirmation, VersionControlPath.getFileName(this._item.serverItem)),
                title: VCResources.EditFileDiscardChangesTitle
            });
        }
        else {
            this._discardChanges();
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_CANCEL_FEATURE, {
                "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
            }));
        }
    }

    private _discardChanges() {
        this._resetUserPreviewModePreference();
        this.beginResetEditorDiffContent();
        this._setEditable(false);
        this._setExternalEditorConfig(null, true);
        this._isShowingDiff = false;
        this._updateViewsToolbar();
        VCSourceEditingEvents.Events._triggerRevertEditedItemEvent(this._item.serverItem, this._item.version);
        if (this._requiresItemRefresh) {
            this._requiresItemRefresh = false;
            VCSourceEditingEvents.Events._triggerRefreshItemEvent(this._item.serverItem, this._item.version);
            this._setExternalEditorConfig(null, true);
        }
    }

    // Check if the file was changed externally prior to enabling edit (optionally allow file refresh if needed).
    private _prepareForEdit() {

        if (this._editSettings && this._editSettings.newFile) {
            this._setEditable(true);
            return;
        }

        const isGit = this._isGitRepository();
        const version = isGit ? this._item.version : new VCSpecs.LatestVersionSpec().toVersionString();
        this._beginGetItem(version, (item: VCLegacyContracts.ItemModel) => {
            if (this._matchesFileVersion(item)) {
                this._setEditable(true);
            }
            else {
                // The file was updated externally, so trigger an item refresh at the parent View level
                Dialogs.show(VCFileViewerEditConfirmationDialog.FileEditConfirmationDialog, {
                    okCallback: () => {
                        VCSourceEditingEvents.Events._triggerRefreshItemEvent(item.serverItem, item.version);
                        this._setExternalEditorConfig(null, true);

                        // Delay to allow the editor to refresh asynchronously, then set to be editable.
                        window.setTimeout(() => {
                            this._setEditable(true);
                        }, 500)
                    },
                    editWarningHtml: VCResources.EditFileRefreshConfirmation,
                    title: VCResources.EditFileRefreshTitle
                });
            }
        });
    }

    private _beginGetItem(version: string, callback: (item: VCLegacyContracts.ItemModel) => void, errorCallback?: IErrorCallback) {
        const itemDetailOptions = <VCLegacyContracts.ItemDetailsOptions>{
            includeContentMetadata: true,
            includeVersionDescription: true
        };
        this._repositoryContext.getClient().beginGetItem(this._repositoryContext, this._item.serverItem, version, itemDetailOptions,
            (item: VCLegacyContracts.ItemModel) => {
                callback(item);
            }, (error) => {
                VSS.errorHandler.show(error);
                this._enableEditInput();
                if (errorCallback) {
                    errorCallback(error);
                }
            });
    }

    // Returns true if this._item is the same version as the specified item (checks objectId hash for Git and changeset for Tfvc).
    private _matchesFileVersion(item: VCLegacyContracts.ItemModel) {
        if (this._isGitRepository()) {
            return (<VCLegacyContracts.GitItem>item).objectId && (<VCLegacyContracts.GitItem>item).objectId.full === (<VCLegacyContracts.GitItem>this._item).objectId.full;
        }
        else {
            return (<VCLegacyContracts.TfsItem>item).changeset === (<VCLegacyContracts.TfsItem>this._item).changeset;
        }
    }

    public _updateViewsToolbar() {

        let menuItems: Menus.IMenuItemSpec[] = this._isEditable ? [{ separator: true }] : [];

        if ($.isFunction(this._options.getContributedViewMenuItems) && !this._isEditable) {
            const contributedMenuItems = this._options.getContributedViewMenuItems.call(this) || [];
            menuItems = menuItems.concat(contributedMenuItems);
        }

        if (this._contentRenderer
            && !(<FileViewerOptions>this._options).hidePreviewButton) {
            if (this._previewContentMode) {
                menuItems.push({
                    id: "preview-mode-off",
                    title: VCResources.PreviewOffTooltip,
                    icon: "bowtie-icon bowtie-tfvc-raw-source",
                    text: VCResources.PreviewOffLabel,
                    showText: !this._isEditable,
                    action: () => {
                        this.setPreviewContentMode(false);
                        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_PREVIEW_OFF_FEATURE, {
                            "IsEditMode": this._isEditable,
                            "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                        }));
                    }
                });
            }
            else {
                menuItems.push({
                    id: "preview-mode-on",
                    title: VCResources.PreviewOnTooltip,
                    icon: "bowtie-icon bowtie-file-preview",
                    text: VCResources.PreviewOnLabel,
                    showText: !this._isEditable,
                    action: () => {
                        this.setPreviewContentMode(true);
                        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_PREVIEW_ON_FEATURE, {
                            "IsEditMode": this._isEditable,
                            "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                        }));
                    }
                });
            }
        }

        if (this._showFileEdit && this._isEditable && (!this._item.contentMetadata || !this._item.contentMetadata.isBinary)) {

            // Diff Selector has child items to select between inline and side-by-side diff views.
            const diffMenuItems: Menus.IMenuItemSpec[] = [];
            diffMenuItems.push(<Menus.IMenuItemSpec>{
                id: "edit-file-diff-side-by-side",
                title: VCResources.EditFileDiffSideBySide,
                showText: false,
                toggled: !this._showDiffInline,
                disabled: this._previewContentMode || (!this.isDirty() && !this._isShowingDiff),
                icon: "bowtie-icon bowtie-diff-side-by-side",
                action: () => {
                    this._onDiffClick(false);
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_DIFF_FEATURE, {
                        "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                    }));
                }
            });
            diffMenuItems.push(<Menus.IMenuItemSpec>{
                id: "edit-file-diff-inline",
                title: VCResources.EditFileDiffInline,
                showText: false,
                toggled: this._showDiffInline,
                disabled: this._previewContentMode || (!this.isDirty() && !this._isShowingDiff),
                icon: "bowtie-icon bowtie-diff-inline",
                action: () => {
                    this._onDiffClick(true);
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_DIFF_FEATURE, {
                        "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                    }));
                }
            });

            menuItems.push(<Menus.IMenuItemSpec>{
                id: "edit-file-diff",
                title: this._isShowingDiff ? VCResources.EditModeRevertToEditMode : VCResources.EditModeShowDiff,
                showText: false,
                toggled: this._isShowingDiff && !this._previewContentMode,
                disabled: this._previewContentMode || (!this.isDirty() && !this._isShowingDiff),
                icon: this._showDiffInline ? "bowtie-icon bowtie-diff-inline" : "bowtie-icon bowtie-diff-side-by-side",
                childItems: diffMenuItems,

                // SplitDrop options - separates the drop icon and behavior into a separate, split menu item.
                splitDropOptions: {
                    id: "edit-file-diff-splitdrop",
                    title: VCResources.EditFileSelectDiffMode
                },

                action: () => {
                    this._onDiffClick();
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_EDIT_DIFF_FEATURE, {
                        "FileExtension": VersionControlPath.getFileExtension(this._item.serverItem)
                    }));
                }
            });
        }

        if (this._changeListNavigator) {
            if (this._discussionManager) {
                this._changeListNavigator.addDiscussionViewMenuEntries(menuItems, this._discussionManager, false, true);
            }
            this._changeListNavigator.addFileNavMenuEntries(menuItems, this._item && this._item.serverItem, false, false);
        }

        menuItems.push({
            id: "editor-preferences",
            title: VCResources.EditorPreferencesDialogTooltip,
            icon: "bowtie-icon bowtie-settings-gear-outline",
            showText: false,
            disabled: this._previewContentMode,
            action: () => {
                this._showEditorPreferencesDialog("file-viewer-toolbar");
            }
        });

        this._viewsToolbar.updateItems(menuItems);
        this._updateTopOffset();
    }

    private _updateTopOffset() {
        if (this._$builtInTextViewer && this._$builtInTextViewer.length) {
            this._viewerTopOffset = this._$builtInTextViewer.offset().top - this._element.offset().top;
        }
        else if (this._extensionHost) {
            this._viewerTopOffset = this._extensionHost._element.offset().top - this._element.offset().top;
        }
        else {
            this._viewerTopOffset = this._$fileContentsContainer.offset().top - this._element.offset().top;
        }
    }

    private _onEditorDirtyStateChanged(isDirty) {
        if (this._isEditable) {
            this._setDirtyState(isDirty);
        }
    }

    private _setDirtyState(dirty: boolean) {
        if (this._editPanel.isDirty() !== dirty) {
            this._editPanel.isDirty(dirty);
            VCSourceEditingEvents.Events._triggerItemDirtyStateChangedEvent(dirty, this._item.serverItem, this._item.version);
            this._updateViewsToolbar();
        }
    }

    private _resetUserPreviewModePreference() {
        if (this._item) {
            this._previewContentUserModesByExt[VersionControlPath.getFileExtension(this._item.serverItem)] = undefined;
            this._previewContentMode = this._getPreviewMode(this._item, false);
        }
    }

    private _showEditorPreferencesDialog(uiSource: string) {
        this._editorPreferences.showDialog(() => {
            this._setExternalEditorConfig();
        }, uiSource, this._editorConfigOptions.preserveLineHeight);
    }

    /**
    * Method to decide whether or not to enable additional features e.g. editing a file,
    * discussion work item creation, showing the open in VS option in the viewer etc.
    * Returns true(i.e. features would be enabled) iff the mode is not offline, 
    * or if the mode is offline and enableAddOns is enabled.
    *
    * Method is required to light up the functionalities which are there in the code hub file viewer 
    * when the content of the file being previewed is fed to the fileviewer.(CodeSearch scenario).
    */
    private _areAdditionalFeaturesEnabled(): boolean {
        return !this._offlineSettings.isOffline || this._offlineSettings.enableAddOns;
    }
}

module CodeEditorApi {

    /** Monaco Editor's getValue(options?: { preserveBOM: boolean; lineEnding: string; }): string; */
    export interface ICodeEditorOptions {
        preserveBOM: boolean;
        lineEnding: string;
    }

    export let LINE_ENDING_LF = "\n";
    export let LINE_ENDING_CRLF = "\r\n";
}

VSS.classExtend(FileViewer, TfsContext.ControlExtensions);

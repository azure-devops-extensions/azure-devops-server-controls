/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import Controls = require("VSS/Controls");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import Navigation_Services = require("VSS/Navigation/Services");
import { HubsService } from "VSS/Navigation/HubsService";
import VSSService = require("VSS/Service");
import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VSS_Context = require("VSS/Context");
import VSS_Telemetry = require("VSS/Telemetry/Services");

import VCContracts = require("TFS/VersionControl/Contracts");
import { EditorPreferences, EditorPreferencesMenuId } from "VersionControl/Scenarios/EditorPreferences/EditorPreferences";
import { EditorPreferences as EditorUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import VCEditorExtension = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import FileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCDiffBuiltInDiffViewer = require("VersionControl/Scripts/Controls/DiffBuiltInDiffViewer");
import VCChangeListNavigator = require("VersionControl/Scripts/Controls/ChangeListNavigator");
import VCExtensionViewerSupport = require("VersionControl/Scripts/ExtensionViewerSupport");
import VCExtensionActionHandler = require("VersionControl/Scripts/ExtensionActionHandler");
import VCViewerConfigurerExtensionSupport = require("VersionControl/Scripts/Controls/ViewerConfigurerExtensionSupport");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;
import { ClientTheme } from "VSS/Platform/Theming";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as VSS_Service from "VSS/Service";
import { getScenarioManager } from "VSS/Performance";

interface DiffItemsDescription {
    opath: string;
    mpath: string;
    oversion: string;
    mversion: string;
    baseItem: string;
    baseVersion: string;

    oHistory?: VCLegacyContracts.HistoryEntry[];
    mHistory?: VCLegacyContracts.HistoryEntry[];
}

export interface DiffViewerSelection {
    originalSide: boolean;
    startColumn: number;
    startLineNumber: number;
    endColumn: number;
    endLineNumber: number;
    positionColumn: number;
    positionLineNumber: number;
}

export interface DiffItemsImageData {
    side: string;
    leftWidth: number;
    rightWidth: number;
    leftHeight: number;
    rightHeight: number;
}

export interface DiffViewerOptions {
    addViewsToolbarAfterActionsToolbar?: boolean;
    hostInIframe?: boolean,    // If true, then host the Monaco editor (diff view) in an iframe (instead of a div) via the legacy extension model.
    /** If provided, renders the toolbar in a separate container */
    separateToolbarSelector?: string;
    hideActionsToolbar?: boolean;
    rightAlignVersionSelectorDropDown?: boolean;
    onDiffLinesChanged?(diffLines: number[]): void;
    onVersionPicked?(version: string, isOriginalSide: boolean): void;
}

const diffMenuItemId = "diff-changeset";
const searchCollectionHubGrouId = "ms.vss-search-platform.search-hidden-collection-hub-group";
const searchProjectHubGroupId = "ms.vss-search-platform.search-hidden-project-hub-group";

export class DiffViewer extends Controls.BaseControl {

    private _extensionHost: Extensions.ExtensionHost;
    private _repositoryContext: RepositoryContext;
    private _$diffViewerHeader: JQuery;
    private _$viewerContainer: JQuery;
    private _builtInDiffViewer: VCDiffBuiltInDiffViewer.BuiltInDiffViewer;
    private _$fileViewerContainer: JQuery;
    private _fileViewer: FileViewer.FileViewer;
    private _currentIntegration: any;
    private _extensionViewerSupport: VCExtensionViewerSupport.VersionControlExtensionViewerSupport;
    private _actionsToolbar: Menus.MenuBar;
    private _viewsToolbar: Menus.MenuBar;
    private _prevDiffEnabled: boolean;
    private _nextDiffEnabled: boolean;
    private _changeListNavigator: VCChangeListNavigator.ChangeListNavigator;
    private _currentItemsDescription: DiffItemsDescription;
    private _currentItemsImageData: DiffItemsImageData;
    private _currentOriginalItem: VCLegacyContracts.ItemModel;
    private _currentModifiedItem: VCLegacyContracts.ItemModel;
    private _errorCallback: any;
    private _updateViewsToolbarDelegate: any;
    private _loaded: boolean;
    private _orientation: VCWebAccessContracts.DiffViewerOrientation;
    private _requestIndex: number;
    private _discussionManager: DiscussionOM.DiscussionManager;
    private _discussionUpdatedListener: any;
    private _usingFallbackEditor: boolean;
    private _activeState: boolean;
    private _activatedSinceLastDiff: boolean;
    private _discussionManagerChanged: boolean;
    private _selectionCallbacks: any;
    private _previewContentMode: boolean;
    private _itemPreviewSupported: boolean;
    private _editorPreferences: EditorPreferences;

    private _viewerConfigurerExtensionHosts: Extensions.ExtensionHost[];

    private _editorConfig: any;
    private _editorConfigOptions: any;
    private _currentTheme: ClientTheme;

    constructor(options?) {
        super(options);

        this._updateViewsToolbarDelegate = delegate(this, this._updateViewsToolbar);
        this._orientation = VCWebAccessContracts.DiffViewerOrientation.SideBySide;
        this._requestIndex = 0;
        this._discussionUpdatedListener = delegate(this, this.onDiscussionCommentsUpdated);
        this._activeState = true;
        this._editorConfigOptions = {};
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "version-control-diff-viewer vc-code-editor-viewer"
        }, options));
    }

    public _dispose() {
        this.setChangeListNavigator(null);

        if (this._extensionHost) {
            this._extensionHost.dispose();
        }
        if (this._discussionManager) {
            this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            this._discussionManager = null;
        }

        super._dispose();
    }

    public initialize() {
        super.initialize();

        this._element.bind("image-diff-version-selected image-dimensions-calculated", <any>((event: JQueryEventObject, data: DiffItemsImageData) => {
            if (!this._currentItemsImageData) {
                this._currentItemsImageData = data;
            }
            else {
                $.extend(this._currentItemsImageData, data);
            }
            this._updateActionsToolbar();
        }));

        const { separateToolbarSelector } = this._options as DiffViewerOptions;
        if (separateToolbarSelector) {
            this._drawDiffTitle($(separateToolbarSelector));
        }
        else {
            this._$diffViewerHeader = $(domElem("div", "diff-viewer-header toolbar")).appendTo(this._element);
            this._drawDiffTitle(this._$diffViewerHeader);
        }
        this._$viewerContainer = $(domElem("div", "diff-viewer-container")).appendTo(this._element);

        this._previewContentMode = false;
        this._itemPreviewSupported = false;
        this._selectionCallbacks = {};

        // Initialize Editor User Preferences and context menu shown in Monaco.
        this._editorPreferences = new EditorPreferences();
        const contextMenuItems = (this._options.contextMenuItems || []) as Array<any>;
        contextMenuItems.push(this._editorPreferences.getContextMenuItem());
        this._options.contextMenuItems = contextMenuItems;
    }

    private initializePreviewFileViewer(itemsUnchanged: boolean) {

        if (!itemsUnchanged || !this._$fileViewerContainer) {
            this._$fileViewerContainer = $(domElem("div", "preview-file-viewer-container"));

            this._fileViewer = <FileViewer.FileViewer>Controls.BaseControl.createIn(FileViewer.FileViewer, this._$fileViewerContainer, <FileViewer.FileViewerOptions>{
                tfsContext: this._options.tfsContext,
                monitorScroll: true,
                monitorSelection: true,
                bindKeys: this._options.bindKeys,
                externalViewerCss: "default",
                allowEditing: true,
                contextMenuItems: this._options.contextMenuItems,
                getContributedViewMenuItems: () => {
                    return null;
                },
                hostInIframe: this._options.hostInIframe,
                lineLinkingWidgetEnabled: this._options.lineLinkingWidgetEnabled,
                hideActionsToolbar: true,
                hidePreviewButton: true
            });

            this._fileViewer.viewItem(this._repositoryContext, this._currentModifiedItem);
        }
    }

    public setActiveState(active: boolean, skipUpdateView?: boolean) {
        if (active !== this._activeState) {
            this._activeState = active;
            if (active) {
                this._activatedSinceLastDiff = true;
            }

            if (this._builtInDiffViewer) {
                this._builtInDiffViewer.setActiveState(active, skipUpdateView);
            }

            if (!skipUpdateView && this._extensionHost && !this._usingFallbackEditor) {
                this.setExternalEditorConfiguration();
            }
        }
    }

    public setOrientation(orientation: VCWebAccessContracts.DiffViewerOrientation, redrawDiff: boolean) {
        if (this._orientation !== orientation) {

            this._orientation = orientation;

            if (this._currentItemsDescription && redrawDiff) {
                this.hideElement();
                this.beginLoadViewer(this._currentItemsDescription, () => {
                    this.showElement();
                }, this._errorCallback);
            }
        }
    }

    public setPosition(position) {
        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.goToLine(position.lineNumber);
        } else if (this._extensionHost) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.NAVIGATE_TO_POSITION, position);
        }
    }

    public setDiscussionManager(discussionManager: DiscussionOM.DiscussionManager, redraw?: boolean) {
        if (this._discussionManager !== discussionManager && (discussionManager || this._discussionManager)) {
            if (this._discussionManager) {
                this._discussionManager.removeDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManager = discussionManager;
            if (discussionManager) {
                this._discussionManager.addDiscussionThreadsUpdatedListener(this._discussionUpdatedListener);
            }
            this._discussionManagerChanged = true;
            if (redraw) {
                if (this._extensionHost && !this._usingFallbackEditor) {
                    this.setExternalEditorConfiguration();
                }
            }
        }
        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.setDiscussionManager(discussionManager, redraw);
        }
    }

    public refreshLayout(): void {
        if (this._extensionHost && !this._usingFallbackEditor) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.REFRESH_LAYOUT);
        }
    }

    private onDiscussionCommentsUpdated(sender: DiscussionOM.DiscussionManager, eventData: DiscussionCommon.DiscussionThreadsUpdateEvent) {
        let filteredEventData: DiscussionCommon.DiscussionThreadsUpdateEvent;
        if (this._extensionHost && !this._usingFallbackEditor && this._currentItemsDescription) {
            filteredEventData = sender.filterEventData(eventData, this._currentItemsDescription.mpath);
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.DISCUSSION_THREAD_UPDATED, filteredEventData);
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

    public diffItems(
        repositoryContext: RepositoryContext,
        item: VCLegacyContracts.ItemModel,
        oversion: string,
        mversion: string,
        opath: string,
        mpath: string,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback) {

        let itemsDescription,
            diffCompleted = false;

        this._repositoryContext = repositoryContext;
        this._editorPreferences.setRepository(repositoryContext);

        itemsDescription = {
            opath: opath || item.serverItem,
            mpath: mpath || item.serverItem,
            oversion: oversion,
            mversion: mversion,
            baseItem: item.serverItem,
            baseVersion: item.version
        };

        if (!mversion) {
            if (itemsDescription.mpath === item.serverItem && item.version) {
                itemsDescription.mversion = item.version;
            }
            else {
                itemsDescription.mversion = "T";
            }
        }

        if (!oversion) {
            itemsDescription.oversion = "P" + itemsDescription.mversion;
        }

        this._updateViewsToolbar();

        this.beginLoadViewer(itemsDescription, () => {

            this.showElement();

            if ($.isFunction(callback)) {
                callback.call(this);
            }
            diffCompleted = true;

        }, (error: any) => {
            if ($.isFunction(errorCallback)) {
                errorCallback.call(this, error);
            }
            diffCompleted = true;
        });

        if (!diffCompleted) {
            this.hideElement();
        }
    }

    public setPreviewContentMode(previewContentModeEnabled: boolean) {
        if (this._previewContentMode !== previewContentModeEnabled
            && (!previewContentModeEnabled || (previewContentModeEnabled && this._itemPreviewSupported))) {
            this._previewContentMode = previewContentModeEnabled;
            this._updateViewer();
        }
    }

    private _updateViewer() {

        if (!this._currentModifiedItem) {
            return;
        }

        this.hideElement();
        this.beginLoadViewer(this._currentItemsDescription, () => {
            this.showElement();
        }, this._errorCallback);
    }

    private _beginGetItems(
        itemsDescription: DiffItemsDescription,
        callback: (originalItem: VCLegacyContracts.ItemModel, modifiedItem: VCLegacyContracts.ItemModel, itemsUnchanged: boolean) => void,
        errorCallback?: IErrorCallback) {

        let itemsToFetch: any[];

        if (!this._currentOriginalItem ||
            !this._currentModifiedItem ||
            !this._currentItemsDescription ||
            this._currentItemsDescription.opath !== itemsDescription.opath ||
            this._currentItemsDescription.mpath !== itemsDescription.mpath ||
            this._currentItemsDescription.oversion !== itemsDescription.oversion ||
            this._currentItemsDescription.mversion !== itemsDescription.mversion) {

            itemsToFetch = [
                { path: itemsDescription.opath, version: itemsDescription.oversion },
                { path: itemsDescription.mpath, version: itemsDescription.mversion }
            ];

            this._repositoryContext.getClient().beginGetItems(this._repositoryContext, itemsToFetch, <VCLegacyContracts.ItemDetailsOptions>{
                includeContentMetadata: true,
                includeVersionDescription: true
            }, (items: VCLegacyContracts.ItemModel[]) => {

                this._currentOriginalItem = items[0];
                this._currentModifiedItem = items[1];
                this._currentItemsImageData = null;

                const fileExtension = VersionControlPath.getFileExtension(
                    (this._currentModifiedItem && this._currentModifiedItem.serverItem) ||
                    (this._currentOriginalItem && this._currentOriginalItem.serverItem));

                //There's a known bug with previewing HTML files in this manner.
                //MSEng Bug 661190: ReEnable all previewable files in DiffViewer
                if (fileExtension.toLowerCase() == "md") {
                    ContentRendering.ContentRendererFactory.getRendererForExtension(fileExtension).then((contentRenderer) => {
                        //preview is supported if we have a valid content renderer.
                        this._setItemPreviewSupported(!!contentRenderer);
                    });
                }
                else {
                    this._setItemPreviewSupported(false);
                }

                // Handle the case when there is no "previous" version of the item. In that case, the REST api
                // will return null for the original item. We will use the current version in this case.
                this._currentOriginalItem = this._currentOriginalItem || this._currentModifiedItem;
                
                if (this._currentModifiedItem) {
                    callback.call(this, this._currentOriginalItem, this._currentModifiedItem, false);
                }
                else {
                    errorCallback(Utils_String.format(VCResources.DiffFileFolderNotFound, itemsDescription.mpath));
                }
            }, errorCallback);
        }
        else {
            callback.call(this, this._currentOriginalItem, this._currentModifiedItem, true);
        }
    }

    private _setItemPreviewSupported(isSupported: boolean) {
        if (this._itemPreviewSupported !== isSupported) {
            this._itemPreviewSupported = isSupported;
            this._previewContentMode = this._previewContentMode && this._itemPreviewSupported;
            this._updateViewsToolbar();
        }
    }

    private beginLoadViewer(itemsDescription: DiffItemsDescription, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />

        let requestIndex = ++this._requestIndex;

        this._errorCallback = errorCallback;

        if (!this._viewerConfigurerExtensionHosts) {
            this._viewerConfigurerExtensionHosts = [];

            const viewerConfigurerExtensionSupport = new VCViewerConfigurerExtensionSupport.ViewerConfigurerExtensionSupport(
                this._options.tfsContext,
                VCControlsCommon.VersionControlExtensionEndPoints.VIEWER_CONFIGURER);

            viewerConfigurerExtensionSupport.getExtensionIntegrations((integrations) => {
                if (integrations) {
                    // Ensure that all extensions are drawn in a non-displayed element inside the viewer
                    const $viewerConfigurerExtensionHostElement: JQuery = $("<div />").addClass("vc-viewer-configurer-hosts").hide().appendTo(this._$viewerContainer.parent());

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
                            configurerExtensionHost.setConfiguration(this._editorConfig);
                        }

                        this._viewerConfigurerExtensionHosts.push(configurerExtensionHost);
                    });
                }
            });
        }

        if (!this._extensionViewerSupport) {
            this._extensionViewerSupport = new VCExtensionViewerSupport.VersionControlExtensionViewerSupport(
                this._options.tfsContext,
                VCControlsCommon.VersionControlExtensionEndPoints.DIFF_VIEWER,
                delegate(this, this._getFallbackControl),
                !this._options.hostInIframe);
        }

        this._beginGetItems(itemsDescription, (originalItem: VCLegacyContracts.ItemModel, modifiedItem: VCLegacyContracts.ItemModel, itemsUnchanged: boolean) => {

            if (requestIndex !== this._requestIndex) {
                return;
            }

            this._currentItemsDescription = itemsDescription;

            this._loaded = false;

            requestIndex = ++this._requestIndex;

            if (this._previewContentMode && this._itemPreviewSupported) {
                this._$viewerContainer.empty();
                this.initializePreviewFileViewer(itemsUnchanged);
                this._$viewerContainer.append(this._$fileViewerContainer);
                this._handleShowViewComplete(itemsDescription, originalItem, modifiedItem, callback);
                //We're loading the whole FileViewer control and we're not explicityly loading an integration.
                //N.B: FileViewer control takes care of loading the integration or loading the builtin control as necessary.
                this._currentIntegration = null;
                this._usingFallbackEditor = false;
            }
            else {
                this._extensionViewerSupport.getExtensionIntegration([originalItem, modifiedItem], { orientation: this._orientation }, (integration) => {

                    if (requestIndex !== this._requestIndex) {
                        return;
                    }

                    if (integration !== this._currentIntegration) {
                        if (this._extensionHost) {
                            this._extensionHost.dispose();
                            this._extensionHost = null;
                        }
                        if (this._builtInDiffViewer) {
                            this._builtInDiffViewer.dispose();
                            this._builtInDiffViewer = null;
                        }
                        this._$viewerContainer.empty();
                        this._usingFallbackEditor = false;
                    }
                    else {
                        if (itemsUnchanged && this._extensionHost && !this._usingFallbackEditor && !this._discussionManagerChanged && !this._activatedSinceLastDiff && this._editorConfig) {
                            if (this._editorConfig.inline === (this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline)) {
                                // Same items that we set on the extension viewer the last time. Nothing to update
                                this._handleShowViewComplete(itemsDescription, originalItem, modifiedItem, callback);
                                return;
                            }
                        }
                    }

                    this._currentIntegration = integration;

                    if (integration && !this._usingFallbackEditor) {

                        if (!this._extensionHost) {

                            // Draw the host container control
                            this._extensionHost = this._extensionViewerSupport.createExtensionHost(this._$viewerContainer, {
                                cssClass: "vc-external-diffviewer-host",
                                integration: integration,
                                postData: {
                                    supportsDiscussionWorkItemCreation: VCControlsCommon.hasProjectContext(this._discussionManager ? this._discussionManager.getTfsContext() : null) && !this._options.disableDiscussionWorkItemCreation,
                                    supportCommentStatus: this._options.supportCommentStatus ? true : false,
                                    supportsAddComment: this._discussionManager && this._discussionManager.isAddCommentEnabled(),
                                    contextMenuItems: this._options.contextMenuItems,
                                    editorTheme: this._getEditorTheme(),
                                    selectedDiscussionId: this._options.selectedDiscussionId || 0,
                                },
                                messageListener: (data) => {

                                    if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.UPDATE_DIFF_STATUS) {
                                        this._updateDiffStatus(data.actionData || {});
                                    }
                                    if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.UPDATE_DIFF_LINES) {
                                        const { onDiffLinesChanged } = this._options as DiffViewerOptions;
                                        if (onDiffLinesChanged) {
                                            onDiffLinesChanged(data.actionData.diffLines);
                                        }
                                    }
                                    else if (data.actionId === VCControlsCommon.VersionControlExtensionActionIds.GET_SELECTION) {
                                        const selection = data.actionData || {};
                                        if (this._selectionCallbacks[data.requestId]) {
                                            this._selectionCallbacks[data.requestId].call(this, selection);
                                        }
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
                                        VCExtensionActionHandler.versionControlExtensionActionHandler(this._repositoryContext, this._extensionHost, this._discussionManager,
                                            this._currentItemsDescription ? this._currentItemsDescription.mpath : undefined, data);
                                    }
                                }
                            });
                        }

                        this.setExternalEditorConfiguration();
                        this._handleShowViewComplete(itemsDescription, originalItem, modifiedItem, callback);
                    }
                    else {

                        if (this._builtInDiffViewer && itemsUnchanged) {
                            // Same items that we set on the built in viewer the last time. Just update the orientation and redraw.
                            this._builtInDiffViewer.setDiscussionManager(this._discussionManager, false);
                            this._builtInDiffViewer.setOrientation(this._orientation, true, () => {
                                if (this._activatedSinceLastDiff && this._discussionManager) {
                                    this._builtInDiffViewer.updateDiscussionThreads();
                                }
                                this._handleShowViewComplete(itemsDescription, originalItem, modifiedItem, callback);
                            });
                            return;
                        }

                        if (!this._builtInDiffViewer) {
                            this._builtInDiffViewer = <VCDiffBuiltInDiffViewer.BuiltInDiffViewer>Controls.BaseControl.createIn(VCDiffBuiltInDiffViewer.BuiltInDiffViewer, this._$viewerContainer, {
                                updateDiffButtonsCallback: delegate(this, this._updateNextPrevDiffStates),
                                updateDiffOrientationCallback: delegate(this, this._changeDiffViewerOrientation),
                                tfsContext: this._options.tfsContext,
                                fixedSize: true,
                                orientation: this._orientation,
                                supportCommentStatus: this._options.supportCommentStatus,
                            });
                            this._builtInDiffViewer.setActiveState(this._activeState, true);
                        }

                        this._builtInDiffViewer.setOrientation(this._orientation, false);
                        this._builtInDiffViewer.setDiscussionManager(this._discussionManager, false);
                        this._builtInDiffViewer.beginShowDiff(this._repositoryContext, itemsDescription, () => {
                            this._handleShowViewComplete(itemsDescription, originalItem, modifiedItem, callback);
                        });
                    }
                });
            }

        }, errorCallback);
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

    public extendEditorConfig(configOptions: any) {
        $.extend(this._editorConfigOptions, configOptions);
        this._doSetExternalEditorConfig();
    }

    private _doSetExternalEditorConfig() {
        if (this._extensionHost && this._editorConfig) {
            const extendedConfig = $.extend({}, this._editorConfig, this._editorConfigOptions);
            this._extensionHost.setConfiguration(extendedConfig);
        }
    }

    private setExternalEditorConfiguration() {
        this._discussionManagerChanged = false;

        // Compute a new default configuration for the editor
        this._editorConfig = {
            opath: this._currentItemsDescription.opath,
            mpath: this._currentItemsDescription.mpath,
            oversion: this._currentItemsDescription.oversion,
            mversion: this._currentItemsDescription.mversion,
            inline: this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline,
            discussionThreads: this._discussionManager ? this._discussionManager.getCurrentThreadsForItemPath(this._currentItemsDescription.mpath) : null,
            commentsEnabled: this._discussionManager ? true : false,
            selectedDiscussionId: this._options.selectedDiscussionId || 0,
            supportsCreateWorkItem: VCControlsCommon.hasProjectContext(this._discussionManager ? this._discussionManager.getTfsContext() : null),
            activeState: this._activeState,
            userPreferences: this._editorPreferences.getPreferences(),
            adornmentsEnabled: this._options.adornments && this._options.adornments.length > 0,
            adornments: this._options.adornments
        };

        // Notify the loaded configurer extensions that the editor config changed
        if (this._viewerConfigurerExtensionHosts) {
            $.each(this._viewerConfigurerExtensionHosts, (index, extensionHost) => {
                extensionHost.setConfiguration(this._editorConfig);
            });
        }

        // Set the editor's config, knowing that any extensions may later update it
        this._doSetExternalEditorConfig();
    }

    private _handleShowViewComplete(itemsDescription, oItem, mItem, callback) {

        this._loaded = true;
        this._discussionManagerChanged = false;
        this._activatedSinceLastDiff = false;

        this._updateViewsToolbar();
        this._updateActionsToolbar();

        if ($.isFunction(callback)) {
            callback.call(this);
        }
    }

    private _getFallbackControl() {
        let $element: JQuery;

        this._usingFallbackEditor = true;

        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.dispose();
        }

        $element = $("<div />").addClass("version-control-fallback-diff-viewer");
        this._builtInDiffViewer = <VCDiffBuiltInDiffViewer.BuiltInDiffViewer>Controls.BaseControl.createIn(VCDiffBuiltInDiffViewer.BuiltInDiffViewer, $element, {
            updateDiffButtonsCallback: delegate(this, this._updateNextPrevDiffStates),
            updateDiffOrientationCallback: delegate(this, this._changeDiffViewerOrientation),
            tfsContext: this._options.tfsContext,
            orientation: this._orientation,
            fixedSize: true
        });

        this._builtInDiffViewer.setDiscussionManager(this._discussionManager, false);
        this._builtInDiffViewer.beginShowDiff(this._repositoryContext, this._currentItemsDescription, () => {
            this._handleShowViewComplete(this._currentItemsDescription, this._currentOriginalItem, this._currentModifiedItem, null);
        });

        return $element;
    }

    public beginGetSelection(callback: (position: DiffViewerSelection) => void) {
        let extensionRequestId: number,
            selection: DiffViewerSelection;

        if (this._extensionHost) {
            this._selectionCallbacks[extensionRequestId] = callback;
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.GET_SELECTION, {});
        }
        else {
            selection = <DiffViewerSelection>{
                originalSide: false,
                startColumn: 1,
                startLineNumber: 1,
                endColumn: 1,
                endLineNumber: 1,
                positionColumn: 1,
                positionLineNumber: 1
            };
            callback.call(this, selection);
        }
    }

    private createDiffVersionDropdownMenuChildItems(item: VCLegacyContracts.ItemModel, itemsDescription: DiffItemsDescription, originalSide: boolean, historyEntries: VCLegacyContracts.HistoryEntry[]) {
        let items = [],
            urlArgs = {},
            url,
            baseUrlParams,
            ssName;

        baseUrlParams = {
            opath: itemsDescription.opath,
            oversion: itemsDescription.oversion,
            mpath: itemsDescription.mpath,
            mversion: itemsDescription.mversion
        };

        if (("" + itemsDescription.baseVersion).toLowerCase().indexOf("s") === 0) {
            ssName = itemsDescription.baseVersion.substr(1);
            urlArgs = $.extend({}, baseUrlParams);
            if (originalSide) {
                urlArgs["oversion"] = itemsDescription.baseVersion;
            }
            else {
                urlArgs["mversion"] = itemsDescription.baseVersion;
            }

            items.push({
                id: "diff-shelveset",
                text: VCResources.ChangesetPending,
                title: Utils_String.format("{0} ({1})", VCResources.ChangesetPending, ssName),
                selected: originalSide ? itemsDescription.oversion === itemsDescription.baseVersion : itemsDescription.mversion === itemsDescription.baseVersion,
                action: () => {
                    //Preserving Search State Into URL
                    urlArgs = this.preserveSearchStateInfo(urlArgs);
                    const { onVersionPicked } = this._options as DiffViewerOptions;
                    if (onVersionPicked) {
                        onVersionPicked(itemsDescription.baseVersion, originalSide);
                    }
                    window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Compare, itemsDescription.baseItem || item.serverItem, itemsDescription.baseVersion, urlArgs);
                }
            });
            items.push({
                separator: true
            });
        }

        if (historyEntries) {
            $.each(historyEntries, (i: number, historyEntry: VCLegacyContracts.HistoryEntry) => {
                const MENU_MAX_COMMENT_LEN = 60;
                const changeList = historyEntry.changeList;
                const date = Utils_Date.localeFormat(changeList.creationDate, "d");
                let menuText: string;
                let menuTitle: string;
                let isSelected: boolean;
                let commit: VCLegacyContracts.GitCommit;
                let comment: string;

                if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                    commit = <VCLegacyContracts.GitCommit>changeList;
                    if (commit.comment && (commit.commentTruncated || commit.comment.length > MENU_MAX_COMMENT_LEN)) {
                        comment = commit.comment.substr(0, MENU_MAX_COMMENT_LEN).trim() + "...";
                    } else {
                        comment = commit.comment || commit.commitId.short;
                    }
                    menuText = Utils_String.format(VCResources.DiffHistoryEntryTextFormat, comment, date, commit.owner);
                    menuTitle = Utils_String.format(VCResources.DiffHistoryEntryTitleFormat, commit.commitId.short, date, changeList.ownerDisplayName, changeList.comment || "");
                    isSelected = "GC" + commit.commitId.full === item.version;
                }
                else {
                    menuText = Utils_String.format(VCResources.DiffHistoryEntryTextFormat, changeList.version, date, changeList.ownerDisplayName);
                    menuTitle = Utils_String.format(VCResources.DiffHistoryEntryTitleFormat, changeList.version, date, changeList.ownerDisplayName, changeList.comment || "");
                    isSelected = (<VCLegacyContracts.TfsChangeList>changeList).changesetId === (<VCLegacyContracts.TfsItem>item).changeset;
                }

                items.push({
                    id: diffMenuItemId,
                    text: menuText,
                    title: menuTitle,
                    cssClass: isSelected ? "selected-version" : "",
                    selected: isSelected,
                    action: () => {
                        let urlArgs: any = $.extend({}, baseUrlParams);
                        if (originalSide) {
                            urlArgs["opath"] = historyEntry.serverItem;
                            urlArgs["oversion"] = changeList.version;
                        }
                        else {
                            urlArgs["mpath"] = historyEntry.serverItem;
                            urlArgs["mversion"] = changeList.version;
                        }
                        //Preserving Search State Into URL.
                        urlArgs = this.preserveSearchStateInfo(urlArgs);
                        const rawState = Navigation_Services.getHistoryService().getCurrentState();
                        if (this._options.onVersionPicked) {
                            this._options.onVersionPicked(changeList.version, originalSide);
                        }
                        window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Compare, rawState.path, rawState.version, urlArgs);
                    }
                });
            });
        }

        return items;
    }

    //Preserving Search State Into URL. Appends properties only which are not part of the URL 
    //so that URL sharing is intact in search portal and at the same does not affect compare functionality.
    private preserveSearchStateInfo(urlArgs: any) {
        const context = TFS_Host_TfsContext.TfsContext.getDefault();
        const searchController: string = "search";
        const hubsService = <HubsService>VSSService.getLocalService(HubsService);
        const selectedHubGroupId: string = hubsService.getSelectedHubGroupId();

        if (context.navigation.currentController.toLowerCase() === searchController ||
                selectedHubGroupId === searchCollectionHubGrouId ||
                selectedHubGroupId === searchProjectHubGroupId) {
            const state = Navigation_Services.getHistoryService().getCurrentState();
            for (const attr in state) {
                if (!urlArgs[attr]) {
                    urlArgs[attr] = state[attr];
                }
            }
        }
        return urlArgs;
    }

    private getDiffVersionDropdownMenuChildItems(item: VCLegacyContracts.ItemModel, itemsDescription: DiffItemsDescription, originalSide: boolean, callback, errorCallback) {
        let historyEntries: VCLegacyContracts.HistoryEntry[];
        let historyFilter: VCContracts.ChangeListSearchCriteria = null;

        if (originalSide) {
            historyEntries = itemsDescription.oHistory;
        }
        else {
            historyEntries = itemsDescription.mHistory;
        }

        if (historyEntries) {
            callback(this.createDiffVersionDropdownMenuChildItems(item, itemsDescription, originalSide, historyEntries));
        }
        else {
            if (itemsDescription.baseItem) {
                historyFilter = <VCContracts.ChangeListSearchCriteria>{
                    itemPath: itemsDescription.baseItem,
                    itemVersion: itemsDescription.baseVersion
                };
            }
            else {
                if (originalSide) {
                    historyFilter = <VCContracts.ChangeListSearchCriteria>{
                        itemPath: itemsDescription.opath,
                        itemVersion: itemsDescription.oversion
                    };
                }
                else {
                    historyFilter = <VCContracts.ChangeListSearchCriteria>{
                        itemPath: itemsDescription.mpath,
                        itemVersion: itemsDescription.mversion
                    };
                }
            }

            historyFilter.top = 25;
            historyFilter.followRenames = true;
            historyFilter.excludeDeletes = true;

            this._repositoryContext.getClient().beginGetHistory(this._repositoryContext, historyFilter, (historyResultModel) => {

                if (itemsDescription.baseItem) {
                    itemsDescription.oHistory = historyResultModel.results;
                    itemsDescription.mHistory = historyResultModel.results;
                }
                else {
                    if (originalSide) {
                        itemsDescription.oHistory = historyResultModel.results;
                    }
                    else {
                        itemsDescription.mHistory = historyResultModel.results;
                    }
                }
                callback(this.createDiffVersionDropdownMenuChildItems(item, itemsDescription, originalSide, historyResultModel.results));
            }, errorCallback);
        }
    }

    private _getVersionParentMenuItem(item: VCLegacyContracts.ItemModel, originalSide: boolean) {
        let menuText: string,
            menuItemCss = "diff-version-menu",
            showFileName = (!this._options.hideFileName) && VersionControlPath.getFileName(this._currentItemsDescription.baseItem) !== item.contentMetadata.fileName;

        if (this._currentItemsImageData) {
            if (this._currentItemsImageData.side) {
                if ((this._currentItemsImageData.side === "left" && originalSide) ||
                    (this._currentItemsImageData.side === "right" && !originalSide)) {
                    menuItemCss += " active-side";
                }
            }
            if (originalSide && this._currentItemsImageData.leftWidth && this._currentItemsImageData.leftHeight) {
                if (showFileName) {
                    menuText = Utils_String.format(
                        VCResources.SccShortItemTitleForImage,
                        this._currentOriginalItem.contentMetadata.fileName,
                        this._currentItemsImageData.leftWidth,
                        this._currentItemsImageData.leftHeight,
                        this._currentOriginalItem.versionDescription);
                }
                else {
                    menuText = Utils_String.format(
                        VCResources.SccShortItemTitleForImageNoPath,
                        this._currentOriginalItem.versionDescription,
                        this._currentItemsImageData.leftWidth,
                        this._currentItemsImageData.leftHeight);
                }
            }
            if (!originalSide && this._currentItemsImageData.rightWidth && this._currentItemsImageData.rightHeight) {
                if (showFileName) {
                    menuText = Utils_String.format(
                        VCResources.SccShortItemTitleForImage,
                        this._currentModifiedItem.contentMetadata.fileName,
                        this._currentItemsImageData.rightWidth,
                        this._currentItemsImageData.rightHeight,
                        this._currentModifiedItem.versionDescription);
                }
                else {
                    menuText = Utils_String.format(
                        VCResources.SccShortItemTitleForImageNoPath,
                        this._currentModifiedItem.versionDescription,
                        this._currentItemsImageData.rightWidth,
                        this._currentItemsImageData.rightHeight);
                }
            }
        }

        if (!menuText) {
            if (!!this._options.hideFileName || VersionControlPath.getFileName(this._currentItemsDescription.baseItem) === item.contentMetadata.fileName) {
                // Same file name as the base item being viewed. Don't include the file name in the menu item text
                //   For the common case of comparing Git commits on the same file,
                //   shorten from the default versionDescription of "commit a1b2c3" to just the sha "a1b2c3"
                const gitItem = <VCLegacyContracts.GitItem>item;
                menuText = (gitItem.commitId && gitItem.commitId.short) ? gitItem.commitId.short : item.versionDescription;
            }
            else {
                menuText = Utils_String.format(VCResources.SccShortItemTitle, item.contentMetadata.fileName, item.versionDescription);
            }
        }

        const versionParentMenuItem = {
            id: "diff-version-" + (originalSide ? "original" : "modified"),
            idIsAction: false,
            text: menuText,
            title: Utils_String.format(VCResources.SccItemTitle, item.serverItem, item.versionDescription),
            noIcon: true,
            cssClass: menuItemCss,
            childItems: (contextInfo, callback, errorCallback) => {
                this.getDiffVersionDropdownMenuChildItems(item, this._currentItemsDescription, originalSide, callback, errorCallback);
            }
        };

        if ((<DiffViewerOptions>this._options).rightAlignVersionSelectorDropDown) {
            versionParentMenuItem["extraOptions"] = {
                align: "right-bottom",
            };
        }

        return versionParentMenuItem;
    }

    private _updateActionsToolbar() {

        if (!this._actionsToolbar) {
            return;
        }

        const menuItems: any[] = [];

        if (this._currentItemsDescription) {
            const supportsAddComment: boolean = !this._options.hideComments 
                && this._discussionManager 
                && this._discussionManager.isAddCommentEnabled()
                && !this._discussionManager.getViewOptions().hideComments;

            if (supportsAddComment) {
                menuItems.push({
                    id: "add-file-discussion",
                    title: VCResources.AddCommentAction,
                    icon: "bowtie-icon bowtie-comment-add",
                    showText: false,
                    action: () => {
                        this.beginGetSelection((selection: DiffViewerSelection) => {
                            let position: DiscussionCommon.DiscussionPosition;
                            if (this._currentModifiedItem && this._discussionManager) {
                                if (this._extensionHost && selection &&
                                    (selection.endLineNumber > 1 || selection.endColumn > 1) &&
                                    (selection.startLineNumber > selection.endLineNumber || selection.endColumn > selection.startColumn)) {

                                    // Selection-based comment
                                    position = <DiscussionCommon.DiscussionPosition>{
                                        startLine: selection.startLineNumber,
                                        endLine: selection.endLineNumber,
                                        startColumn: selection.startColumn,
                                        endColumn: selection.endColumn,
                                        positionContext: selection.originalSide ? DiscussionCommon.PositionContext.LeftBuffer : DiscussionCommon.PositionContext.RightBuffer
                                    };
                                }

                                this._discussionManager.createNewDiscussionThread(this._currentModifiedItem.serverItem, position);
                            }
                        });
                    }
                });
            }

            if (!this._options.disableDownloadFile) {
                if (this._currentItemsDescription.baseItem) {
                    const baseItem = this._currentItemsDescription.baseItem;

                    menuItems.push({
                        id: "download-file",
                        title: VCResources.FileViewerClickToDownloadContent,
                        showText: false,
                        icon: "bowtie-icon bowtie-transfer-download",
                        action: () => {
                            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.DIFFVIEWER_DOWNLOAD, {}));
                            window.open(VersionControlUrls.getFileContentUrl(this._repositoryContext, baseItem, this._currentItemsDescription.baseVersion), "_blank");
                        }
                    });
                }
            }

            if (!this._options.disableAnnotate) {
                if (!this._currentModifiedItem.contentMetadata || !this._currentModifiedItem.contentMetadata.isBinary) {
                    if (!(VCSpecs.VersionSpec.parse(this._currentModifiedItem.version) instanceof VCSpecs.ShelvesetVersionSpec)) {
                        if (!(VCSpecs.VersionSpec.parse(this._currentItemsDescription.baseVersion) instanceof VCSpecs.ShelvesetVersionSpec)) {
                            menuItems.push({
                                id: "annotate-file",
                                title: VCResources.AnnotateActionMenuItemText,
                                icon: "bowtie-icon bowtie-comment-urgent",
                                showText: false,
                                action: () => {
                                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.DIFFVIEWER_ANNOTATE, {}));
                                    this._fire("diff-menu-annotate-triggered");
                                }
                            });
                        }
                    }
                }
            }

            if (!this._options.hideVersionSelector && !this._previewContentMode) {
                if (menuItems.length > 0) {
                    menuItems.push({ separator: true });
                }

                menuItems.push(this._getVersionParentMenuItem(this._currentOriginalItem, true));
                menuItems.push({
                    separator: true,
                    title: Utils_String.format(VCResources.DiffMenusSeparatorTooltipFormat,
                        this._currentOriginalItem.contentMetadata.fileName,
                        this._currentOriginalItem.versionDescription,
                        this._currentModifiedItem.contentMetadata.fileName,
                        this._currentModifiedItem.versionDescription),
                    text: "\u2194",
                    cssClass: "versions-separator"
                });
                menuItems.push(this._getVersionParentMenuItem(this._currentModifiedItem, false));

                if (this._builtInDiffViewer && this._builtInDiffViewer._shownTruncatedMessage) {
                    menuItems.push({
                        disabled: true,
                        title: VCResources.ItemCompareContentTrimmedSxS,
                        text: VCResources.ItemCompareContentTrimmedShort,
                        icon: "bowtie-icon bowtie-status-warning"
                    });
                }
            }
        }

        this._actionsToolbar.updateItems(menuItems);
    }

    private _onPrevDiffClick(): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.onPrevClick();
        }
        else if (this._extensionHost) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.PREVIOUS_DIFFERENCE);
        }
    }

    private _onNextDiffClick(): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.onNextClick();
        }
        else if (this._extensionHost) {
            this._extensionHost.postMessage(VCControlsCommon.VersionControlExtensionActionIds.NEXT_DIFFERENCE);
        }
    }

    private _drawDiffTitle($container: JQuery): void {
        if ((<DiffViewerOptions>this._options).addViewsToolbarAfterActionsToolbar) {
            this._createViewsToolbar($container);
            this._createActionsToolbar($container);
        } else {
            this._createActionsToolbar($container);
            this._createViewsToolbar($container);
        }
    }

    private _createActionsToolbar($container: JQuery): void {
        if (!(<DiffViewerOptions>this._options).hideActionsToolbar) {
            this._actionsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
                selectionMode: (item: Menus.IMenuItemSpec) => {
                    return item.id === diffMenuItemId ? Menus.MenuSelectionMode.SingleSelect : Menus.MenuSelectionMode.None;
                },
                cssClass: "diff-actions",
                items: []
            });

            if (!this._options.hideVersionSelector) {
                this._actionsToolbar._element.addClass("show-version-selector");
            }
        }
    }

    private _createViewsToolbar($container: JQuery): void {
        this._viewsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
            cssClass: "diff-views",
            items: []
        });
    }

    private _updateDiffStatus(status: { prevDiffEnabled?: boolean; nextDiffEnabled: boolean; }) {
        const performanceScenario = getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "DiffViewer._updateDiffStatus");
        this._updateNextPrevDiffStates(status.prevDiffEnabled, status.nextDiffEnabled);
        performanceScenario.end();
    }

    private _updateNextPrevDiffStates(prevEnabled: boolean, nextEnabled: boolean) {

        this._prevDiffEnabled = prevEnabled;
        this._nextDiffEnabled = nextEnabled;
        this._updateViewsToolbar();
    }

    private _updateViewsToolbar() {

        const menuItems: any[] = [];

        if (!this._previewContentMode) {
            menuItems.push({
                id: "diff-orientation",
                title: this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline ? VCResources.InlineDiffTitle : VCResources.SideBySideDiffTitle,
                icon: this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline ? "bowtie-icon bowtie-diff-inline" : "bowtie-icon bowtie-diff-side-by-side",
                showText: true,
                text: this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline ? VCResources.InlineDiffText : VCResources.SideBySideDiffText,
                action: () => {

                    this._changeDiffViewerOrientation();
                    return false;
                }
            });

            menuItems.push({
                id: "editor-preferences",
                title: VCResources.EditorPreferencesDialogTooltip,
                icon: "bowtie-icon bowtie-settings-gear-outline",
                showText: false,
                action: () => {
                    this._showEditorPreferencesDialog("diff-viewer-toolbar");
                }
            });

            if (this._changeListNavigator && this._discussionManager) {
                this._changeListNavigator.addDiscussionViewMenuEntries(menuItems, this._discussionManager, false, false);
            }

            menuItems.push({ separator: true });

            menuItems.push({
                id: "prev-diff",
                showText: false,
                icon: "bowtie-icon bowtie-arrow-up",
                disabled: !this._prevDiffEnabled,
                title: VCResources.PreviousDifferenceTooltip,
                action: delegate(this, this._onPrevDiffClick)
            });

            menuItems.push({
                id: "next-diff",
                showText: false,
                icon: "bowtie-icon bowtie-arrow-down",
                disabled: !this._nextDiffEnabled,
                title: VCResources.NextDifferenceTooltip,
                action: delegate(this, this._onNextDiffClick)
            });

            menuItems.push({ separator: true });
        }

        if (this._itemPreviewSupported) {
            if (this._previewContentMode) {
                menuItems.push({
                    id: "preview-mode-off",
                    title: VCResources.PreviewOffTooltip,
                    icon: "bowtie-icon bowtie-tfvc-raw-source",
                    showText: false,
                    action: () => {
                        this.setPreviewContentMode(false);
                        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_PREVIEW_OFF_FEATURE, {
                            "IsEditMode": false,
                            "FileExtension": VersionControlPath.getFileExtension(this._currentModifiedItem.serverItem)
                        }));
                    }
                });
            }
            else {
                menuItems.push({
                    id: "preview-mode-on",
                    title: VCResources.PreviewOnTooltip,
                    icon: "bowtie-icon bowtie-file-preview",
                    showText: false,
                    action: () => {
                        this.setPreviewContentMode(true);
                        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.FILEVIEWER_PREVIEW_ON_FEATURE, {
                            "IsEditMode": false,
                            "FileExtension": VersionControlPath.getFileExtension(this._currentModifiedItem.serverItem)
                        }));
                    }
                });
            }
        }

        if (this._currentItemsDescription && this._changeListNavigator) {
            this._changeListNavigator.addFileNavMenuEntries(menuItems, this._currentItemsDescription.mpath, false, false);
        }

        this._viewsToolbar.updateItems(menuItems);
    }

    private _changeDiffViewerOrientation() {
        // Toggle the orientation
        if (this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline) {
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.DIFFVIEWER_FILES_SIDE_BY_SIDE_DIFF, {}));
        }
        else {
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.DIFFVIEWER_FILES_INLINE_DIFF, {}));
        }
        const newOrientation = this._orientation === VCWebAccessContracts.DiffViewerOrientation.Inline ? VCWebAccessContracts.DiffViewerOrientation.SideBySide : VCWebAccessContracts.DiffViewerOrientation.Inline;
        this.setOrientation(newOrientation, true);
        this._updateViewsToolbar();

        // Update the user preference
        this._repositoryContext.getClient().beginGetUserPreferences((preferences) => {
            preferences.diffViewerOrientation = newOrientation;
            this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);
        });

        if (this._options && this._options.orientationChangeCallback) {
            this._options.orientationChangeCallback(newOrientation);
        }
    }

    private _showEditorPreferencesDialog(uiSource: string) {
        this._editorPreferences.showDialog(() => {
            this.setExternalEditorConfiguration();
        }, uiSource);
    }
}

VSS.classExtend(DiffViewer, TfsContext.ControlExtensions);

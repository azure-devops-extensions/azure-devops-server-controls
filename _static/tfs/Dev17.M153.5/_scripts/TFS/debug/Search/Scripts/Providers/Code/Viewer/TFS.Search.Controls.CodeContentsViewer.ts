// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import AdornmentCommon = require("Presentation/Scripts/TFS/TFS.Adornment.Common");
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Notifications = require("VSS/Controls/Notifications");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import SearchBoxHelper = require("Search/Scripts/Common/TFS.Search.SearchBoxHelper");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_ContextMenuItemExtension = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.ContextMenuItemExtension");
import Search_HitsNavigationExtension = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.HitsNavigationExtension");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import VCAnnotateAnnotatedFileViewer = require("VersionControl/Scripts/Controls/AnnotateAnnotatedFileViewer");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCEditorExtension = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import * as RepositoryContext from "VersionControl/Scripts/RepositoryContext";
import delegate = Utils_Core.delegate;

export class CodeContentsViewer extends Navigation.NavigationViewTab {

    private static FILE_ACTIONS_MENU_CSS_SELECTOR: string = ".file-actions-menu";
    private static ICON_ONLY_CSS_SELECTOR: string = ".icon-only";
    private static KEY_GOTO_NEXTHIT: VCEditorExtension.IEditorKeybinding = { key: "F8", ctrlCmd: false, shift: false, alt: false, winCtrl: false };
    private static KEY_GOTO_PREVHIT: VCEditorExtension.IEditorKeybinding = { key: "F8", ctrlCmd: false, shift: true, alt: false, winCtrl: false };

    private _fileViewer: any;
    private _fileContent: string = null;
    private _hitAdorments: Array<any>;
    private _hitsNavigationExtension: Search_HitsNavigationExtension.HitsNavigationExtension;
    private _contextMenuItemExtension: Search_ContextMenuItemExtension.ContextMenuItemExtension;
    private _isAnnotationModeOn: boolean;
  
    /// <summary>
    /// Called whenever navigation occurs with this tab as the selected tab
    /// </summary>
    /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
    /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>
    public onNavigate(rawState: any, parsedState: any) {
        var vcView: any = this._options.navigationView;

        TelemetryHelper.TelemetryHelper.traceLog(
            {
                "CodeContentsViewerNavigationOccurred": true
            });

        if (parsedState.item) {
            TelemetryHelper.TelemetryHelper.traceLog(
                {
                    "FileViewerInitializationStarted": true
                });

            // use TfsContext from the repositoryContext.
            // Reason : We update the default TfsContext in case the search is fired from Account Context. 
            // In that case the repository context is created using the updated TfsContext which actually is mimicked to look as if the search is from project context.
            // Contents tab would fail to load the file content if default context is used here as the api's to fetch the content work within the context of a project.
            var collectionTfsContext: any = null;
            if (parsedState.repositoryContext) {
                collectionTfsContext = parsedState.repositoryContext.getTfsContext();
            }
            else {
                collectionTfsContext = Context.SearchContext.getTfsContext(parsedState.collection);
            }

            // TODO : Optimize
            // TODO : improve performance by checking if the APPROPRIATE file viewer already exists and then proceed
            if (parsedState.filePreviewContentMode !== Search_Constants.FilePreviewMode.SourceDepot) {
                if (!(this._fileViewer instanceof VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer)) {
                    this._clearFileViewerInstanceSpecificResources();
                    this._fileViewer = <VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer>Controls.BaseControl.createIn(VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer, this._element, {
                        tfsContext: collectionTfsContext,
                        allowEditing: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
                        allowPreviewing: true,
                        showAnnotateButton: true,
                        bindKeys: [CodeContentsViewer.KEY_GOTO_NEXTHIT, CodeContentsViewer.KEY_GOTO_PREVHIT],
                        contextMenuItems: Search_ContextMenuItemExtension.ContextMenuItemExtension.getContextMenuItems()
                    });

                    this._fileViewer._unbind("annotation-mode-changed")
                        ._bind("annotation-mode-changed", (sender: any, data: any) => {
                            var showingAnnotations = (data && data.showAnnotations) ? true : false;
                            // cache the current annotate mode so as to preserve it across results selections
                            this._isAnnotationModeOn = showingAnnotations;
                            if (vcView.getState().annotate !== showingAnnotations) {
                                if (showingAnnotations) {
                                    Navigation_Services.getHistoryService().addHistoryPoint(undefined, {
                                        annotate: "true",
                                        hideComments: "true"
                                    });
                                }
                                else {
                                    Navigation_Services.getHistoryService().addHistoryPoint(undefined, {
                                        annotate: "false",
                                        hideComments: "false"
                                    });
                                }
                            }
                        });

                    this.returnFileViewer().setDiscussionManager(
                        parsedState.discussionManager,
                        false,
                        parsedState.change && VCOM.ChangeType.hasChangeFlag(parsedState.change.changeType, VCLegacyContracts.VersionControlChangeType.Delete));
                }
            }
            else {
                if (!(this._fileViewer instanceof VCFileViewer.FileViewer)) {
                    this._clearFileViewerInstanceSpecificResources();
                    this._fileViewer = <VCFileViewer.FileViewer>Controls.BaseControl.createIn(VCFileViewer.FileViewer, this._element, {
                        tfsContext: collectionTfsContext,
                        monitorScroll: true,
                        monitorSelection: true,
                        bindKeys: [CodeContentsViewer.KEY_GOTO_NEXTHIT, CodeContentsViewer.KEY_GOTO_PREVHIT],
                        externalViewerCss: "default",
                        allowEditing: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
                        allowPreviewing: true,
                        contextMenuItems: Search_ContextMenuItemExtension.ContextMenuItemExtension.getContextMenuItems(),
                        getContributedViewMenuItems: []
                    });
                }
            }

            this.returnFileViewer().setActiveState(true, true);

            // Instead of creating a new hitsNavigation object everytime we load the fileviewer, we are just updating the same object so as
            // to prevent its multiple instances which results in undesirable multiple callbacks due to a registration of new event handler
            // for keydown event in every object.
            if (this._hitsNavigationExtension === undefined) {
                this._hitsNavigationExtension = new Search_HitsNavigationExtension.HitsNavigationExtension({
                    navigateSearchResults: Utils_Core.delegate(this, this._navigateSearchResults)
                });
                this._hitsNavigationExtension.update(this._fileViewer);
                this._hitsNavigationExtension.addPrevNextButtons();
                this.setupFileViewerKeyboardBindings();
            }
            
            this._contextMenuItemExtension = new Search_ContextMenuItemExtension.ContextMenuItemExtension(this._fileViewer);
            this._contextMenuItemExtension.bindContextMenuItems();

            var editSettings: VCFileViewer.FileEditSettings = {
                allowEditing: false,
                allowBranchCreation: false,
                editMode: false,
                newFile: false
            };
            parsedState.editSettings = editSettings;

            var viewSettings: VCFileViewer.FileViewSettings = {
                contentRendererOptions: parsedState.rendererOptions
            };
            parsedState.viewSettings = viewSettings;

            var fileViewerOfflineSettings: VCFileViewer.FileViewerOfflineSettings = {
                isOffline: parsedState.filePreviewContentMode !== Search_Constants.FilePreviewMode.Default,
                enableAddOns: parsedState.filePreviewContentMode !== Search_Constants.FilePreviewMode.SourceDepot,
                forceRefresh: true,
                hitAdornments: parsedState.hitAdornments,
                offlineFileContent: parsedState.offlineFileContent,
                offlineFileContentUrl: parsedState.offlineFileContentUrl,
                canDownloadOffline: parsedState.canDownloadOffline || false,
                offlineFileDownloadUrl: parsedState.offlineFileDownloadUrl
            };
            parsedState.fileViewerOfflineSettings = fileViewerOfflineSettings;

            // Updating the tfsContext everytime we view file to ensure VC/Rest APIs are called with right context.
            this._fileViewer._options.tfsContext = collectionTfsContext;
            this.viewFile(parsedState);

            // Traces file download event
            $(CodeContentsViewer.FILE_ACTIONS_MENU_CSS_SELECTOR).children(CodeContentsViewer.ICON_ONLY_CSS_SELECTOR).click((obj) => {
                TelemetryHelper.TelemetryHelper.traceLog({ "IsFileDownloaded": true });
            });
        }
        else {
            this._clearFileViewerInstanceSpecificResources();
        }
    }

    public onNavigateAway() {
        if (this._fileViewer) {
            this.returnFileViewer().setActiveState(false);
        }
    }

    private _clearFileViewerInstanceSpecificResources() {
        // Clear navigation extensions on the editor menu
        this._hitsNavigationExtension = undefined;

        /// <summary>Clear any existing content</summary>
        this._fileViewer = null;
        this._element.empty();
    }

    /*
    * Show warning banner on top of file viewer
    */
    private showWarningBanner(message: string): void {
        if (message) {
            this._fileViewer.setWarningMessage(message, Notifications.MessageAreaType.Warning);
        }
    }

    public viewFile(state: any): void {
        // Don't proceed with preview if the fileviewer object is invalid.
        // This can happen if fileViewer object is destroyed by a new preview operation triggered by new search results
        // (ex. filter selection), while the previous results were being previewed
        if (this._fileViewer === undefined || this._fileViewer === null) {
            return;
        }

        TelemetryHelper.TelemetryHelper.traceLog(
            {
                "FileViewerViewItemStarted": true
            });

        var viewItemCallStartTime: any = Performance.getTimestamp();

        if (this._fileViewer instanceof VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer) {
            this.returnFileViewer().setActiveState(true, true);
            this._fileViewer.viewFile(state.repositoryContext, state.item, state.annotate || this._isAnnotationModeOn, state.editSettings, state.viewSettings, state.fileViewerOfflineSettings);
        }
        else {
            this._fileViewer.setActiveState(true, true);
            this._fileViewer.viewItem(state.repositoryContext, state.item, state.editSettings, state.viewSettings, state.fileViewerOfflineSettings);
        }

        this._hitsNavigationExtension.updateSelectedIndexAndTotalResultsCount(state.selectedIndex, state.totalSearchResults);

        if ((state.isFirstPreviewOfNewSearch || state.isNewResultSelected)) {
            // Register for file read event
            this._fileViewer._bind(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT, (event: any, filePreviewData: any) => {
                this.logFilePreviewTelemetry(state, viewItemCallStartTime);
                // Unregister once the content is obtained
                this._fileViewer._unbind(VCControlsCommon.VersionControlExtensionActionIds.GET_FILE_CONTENT);

                this.updateFileContentCache(state.item.contentMetadata, filePreviewData.content);
                this.updateHitsNavigationExtension(filePreviewData.hitAdornments);

                // Update tools bar for enabling/disabling the prev/next buttons based on the no of hits that are populated
                this._hitsNavigationExtension.updatePrevNextButtons();
                this._hitsNavigationExtension.subscribeToCursorPositionChange();
                this._fire(Search_Constants.SearchConstants.PreviewContentLoaded, {
                    "selectedItemPath": state.path
                });
            });
        }
        else {
            // Close the file preview scenario on tab switch contents, history, compare
            Performance.abortCodeSearchPerfScenarios();
            // Bug 438737: Move next/prev icons disabled in full screen view
            this._hitsNavigationExtension.updatePrevNextButtons();
        }

        // Fetching latest Item metadata to check if item being shown is latest or stale and inform accordingly.
        var repoContext = state.repositoryContext;
        if (repoContext) {
            repoContext.getClient().beginGetItem(repoContext, state.path, state.version, {
                recursionLevel: 1,
                includeContentMetadata: true,
                includeVersionDescription: false
            }, (item) => {
                this.evaluateAndShowStaleFileWarning(repoContext, item, state, false);
            }, (error: any) => { // calling the getFileObject again in case of error as error might have occurred in case the file is deleted or renamed in latest version
                repoContext.getClient().beginGetItem(repoContext, state.path, state.item.version, {
                    recursionLevel: 1,
                    includeContentMetadata: true,
                    includeVersionDescription: false
                }, (item) => {
                    this.evaluateAndShowStaleFileWarning(repoContext, item, state, true);
                }, delegate(this, this.showError));
            });
        }
    }

    /**
    * Logs CI data for the preview preview end operation
    */
    private logFilePreviewTelemetry(state: any, viewItemCallStartTime: any): void {
        var timeNow: any = Performance.getTimestamp();
        var traceLog: any = {
            "PreviewLoadTimeAfterViewItemCall": timeNow - viewItemCallStartTime,
            "GetItemContentCallBackReceived": true,
            "SelectedItemPath": state.path,
            "FirstPreviewAfterSearch": state.isFirstPreviewOfNewSearch || false,
        };

        if (state.isFirstPreviewOfNewSearch) {
            traceLog["NewSearchFilePreviewE2ELoadTime"] = timeNow - state.previewLoadStartTime;
            Performance.split(Performance.PerfConstants.CodeResultPreviewOnNewSearchEnd);
            Performance.endScenario(Performance.PerfConstants.FirstCodeSearchWithPreview);
            Performance.endScenario(Performance.PerfConstants.SubsequentCodeSearchWithPreview);
        }
        else if (state.isNewResultSelected) {
            traceLog["ResultSelectionChangedFilePreviewE2ELoadTime"] = timeNow - state.previewLoadStartTime;
            Performance.endScenario(Performance.PerfConstants.PreviewOfSelectedCodeResult);
        }
        else {
            Performance.abortCodeSearchPerfScenarios();
        }

        TelemetryHelper.TelemetryHelper.traceLog(traceLog);
    }

    /**
    * Checks if content is old/deleted and show warning message accordingly
    */
    private evaluateAndShowStaleFileWarning(repoContext: RepositoryContext.RepositoryContext, latestItem: any, state: any, isFileDeleted: boolean) {
        var isContentFileStale = isFileDeleted ? false : CodeContentsViewer.isItemContentStale(latestItem, state.resultItemMetadata);

        if (isFileDeleted === true || isContentFileStale === true) {
            var message = isFileDeleted === true ? Search_Resources.ShowFileDoesNotExistWarningMessage : Search_Resources.ShowOlderVersionOfFileWarningMessage;
            this.showWarningBanner(message);

            TelemetryHelper.TelemetryHelper.traceLog(
                {
                    "StaleCodeIndex": {
                        "RepositoryId" : repoContext.getRepositoryId()
                }
            });
        }
    }

    /**
    * Compares resultItemMetadata with latest Item to check
    * if result information is the latest or stale  
    */
    private static isItemContentStale(
        latestItem: VCLegacyContracts.ItemModel,
        resultItemMetadata: any): boolean {
        var isStale: boolean = false;
        if (resultItemMetadata.vcType === Base_Contracts.VersionControlType.Git) {
            var gitItem: VCLegacyContracts.GitItem = <VCLegacyContracts.GitItem> latestItem;
            if (resultItemMetadata.contentId &&
                resultItemMetadata.contentId !== "" &&
                resultItemMetadata.contentId !== gitItem.objectId.full) {
                isStale = true;
            }
        }
        else if (resultItemMetadata.vcType === Base_Contracts.VersionControlType.Tfvc) {
            var tfsItem: VCLegacyContracts.TfsItem = <VCLegacyContracts.TfsItem> latestItem;
            // if the change set corresponding to latest version of the file is greater than 
            // that of the one indexed, the file is stale.
            if (tfsItem.changeset > parseInt(resultItemMetadata.changeId)) {
                isStale = true;
            }
        }
        else if (resultItemMetadata.vcType === Base_Contracts.VersionControlType.Custom) {
            isStale = false;
        }

        return isStale;
    }

    /*
    * Binds the fileviewer with keyboard shortcuts for navigating though hits
    */
    private setupFileViewerKeyboardBindings() {
        var bindFileViewer = delegate(this, (sender: any, args: VCEditorExtension.IEditorKeybinding) => {
            if (this.compareHotKey(CodeContentsViewer.KEY_GOTO_NEXTHIT, args)) {
                this._hitsNavigationExtension.onNextClick();
            }
            else if (this.compareHotKey(CodeContentsViewer.KEY_GOTO_PREVHIT, args)) {
                this._hitsNavigationExtension.onPrevClick();
            }
        });
        this._fileViewer._unbind(VCFileViewer.FileViewer.EVENT_KEY_PRESSED, bindFileViewer)
            ._bind(VCFileViewer.FileViewer.EVENT_KEY_PRESSED, bindFileViewer);
    }

    /**
    * Compares the object containing the details of the keys pressed sent by fileviewer and the object with which a specific event is bound
    */
    private compareHotKey(keysbound: any, args: VCEditorExtension.IEditorKeybinding): boolean {
        if ((args.key === keysbound.key)
            && (args.shift === keysbound.shift)
            && (args.alt === keysbound.alt)
            && (args.ctrlCmd === keysbound.ctrlCmd)
            && (args.winCtrl === keysbound.winCtrl)) {
            return true;
        }
        else {
            return false;
        }
    }

    /*
    * Handles error message
    */
    private showError(error: any) {
        throw new Error(error);
    }

    /**
    * Updates/invalidates file content of previous result file previewed based on currently read file details
    * Caching helps in highlighting same result file due to applying a filter or new search without needing to re-fetch it
    */
    private updateFileContentCache(metadata: VCLegacyContracts.FileContentMetadata, fileContent: VCLegacyContracts.FileContent): void {
        if (metadata.isBinary === true || metadata.isImage === true) {
            // Ignore binary/image files, clear the cache
            this._fileContent = null;
        }
        else {
            if (!fileContent || fileContent.content === undefined
                || fileContent.content === null || fileContent.content.length <= 0) {

                // Invalid file content, clear the cache
                this._fileContent = null;
            }
            else {
                this._fileContent = fileContent.content;
            }
        }
    }

    /**
    * Decorates the hits
    */
    private updateHitsNavigationExtension(adornments: any): void {
        this._hitsNavigationExtension.updatePrevNextTracePointStatus(false, false, false, false);

        // Clearing the cache of hits which are used for navigating(prev/next) across the hits as new hits are being calculated
        this._hitsNavigationExtension.clearPrevNextCache();
        
        // Initializing adorments as empty for the case when adornments are null 
        // so that highlights are cleared from preview pane
        var navigationAdornments = [], highlightingAdornments = [];
        if (adornments) {
            navigationAdornments = adornments.navigationAdornments;
            highlightingAdornments = adornments.highlightingAdornments;
        }

        this._hitsNavigationExtension.updateNavigationAdornments(navigationAdornments);
        // Caching the adornment to use prev/next to highlight a particular hit and repaint all highlights
        this._hitsNavigationExtension.updateHighlightingAdornments(highlightingAdornments);
    }

    private returnFileViewer(): VCFileViewer.FileViewer {

        if (this._fileViewer instanceof VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer) {
            return this._fileViewer.getFileViewer();
        }
        else if (this._fileViewer instanceof VCFileViewer.FileViewer) {
            return this._fileViewer;
        }
        else {
            throw new Error("Invalid FileViewer Instance");
        }
    }

    private _navigateSearchResults(index: number): void {
        if (this._options.navigateSearchResults &&
            $.isFunction(this._options.navigateSearchResults)) {
            this._options.navigateSearchResults(index, this);
        }
    }
}
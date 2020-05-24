import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import VSS = require("VSS/VSS");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingDialogs = require("VersionControl/Scripts/Controls/SourceEditingDialogs");
import VCSourceExplorerGrid = require("VersionControl/Scripts/Controls/SourceExplorerGrid");
import VCUtils_Number = require("VersionControl/Scripts/Utils/Number");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";
import QS_UI_NO_REQUIRE = require("Engagement/QuickStart/UI");
import HotSpot_NO_REQUIRE = require("Engagement/HotSpot");
import EngagementCore_NO_REQUIRE = require("Engagement/Core");
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import {LineAdornmentOptions} from "VersionControl/Scripts/FileViewerLineAdornment";

import TfsContext = TFS_Host_TfsContext.TfsContext;

// Lazily-loaded with AMD, only use as type annotations.
import VCAnnotateAnnotatedFileViewer_LazyLoaded = require("VersionControl/Scripts/Controls/AnnotateAnnotatedFileViewer");
import VCFileViewer_LazyLoaded = require("VersionControl/Scripts/Controls/FileViewer");
import VCEditorExtension_LazyLoaded = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");

export class ContentsTab extends Navigation.NavigationViewTab {

    private _fileViewer: VCAnnotateAnnotatedFileViewer_LazyLoaded.AnnotatedFileViewer;
    private _folderViewer: VCSourceExplorerGrid.Grid;
    private _loadingPath: string;
    private _previousPath: string;

    constructor(options?) {
        super($.extend({
            showAnnotateButton: true,
        }, options));
    }

    public onNavigate(rawState: any, parsedState: any) {
        Diag.logTracePoint('TFS.VersionControl.View.VersionControlChangeListView.VersionControlContentsTab.Selected');
        CustomerIntelligenceData.publishFirstTabView("ContentsTab", parsedState, this._options);

        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        if (parsedState.item) {
            this._loadingPath = parsedState.item.serverItem;

            if (parsedState.item.isFolder) {

                // Ensure that the folder viewer exists
                if (!this._folderViewer) {
                    this._clearContent();
                    this._folderViewer = <VCSourceExplorerGrid.Grid>Controls.BaseControl.createIn(VCSourceExplorerGrid.Grid, this._element, {
                        customerIntelligenceData: this._options.customerIntelligenceData ? this._options.customerIntelligenceData.clone() : null,
                        tfsContext: TfsContext.getDefault(),
                        onLatestChangesLoaded: this._options.onLatestChangesLoaded,
                    });
                }

                this._folderViewer.setSource(parsedState.repositoryContext, parsedState.item, parsedState.version);

                if (rawState.fileName) {
                    // Try to select a given folder and file
                    this._folderViewer.setSelectedPath(parsedState.item.serverItem.replace(/\/$/, '') + "/" + rawState.fileName);
                }
                else if (this._previousPath) {
                    // Try to select the previous path (after clicking up/.. for example)
                    this._folderViewer.setSelectedPath(this._previousPath);
                }

                this._registerEllipsisHotSpot();
            }
            else {
                VSS.using(["VersionControl/Scripts/Controls/AnnotateAnnotatedFileViewer", "VersionControl/Scripts/Controls/FileViewer", "VersionControl/Scripts/TFS.VersionControl.EditorExtensions"], (
                    VCAnnotateAnnotatedFileViewer: typeof VCAnnotateAnnotatedFileViewer_LazyLoaded, VCFileViewer: typeof VCFileViewer_LazyLoaded, VCEditorExtension: typeof VCEditorExtension_LazyLoaded) => {

                    if (this._loadingPath !== parsedState.item.serverItem) {
                        // We already started loading another path. Abort this one.
                        return;
                    }

                    // Ensure that the file viewer exists
                    if (!this._fileViewer) {
                        this._clearContent();
                        this._fileViewer = <VCAnnotateAnnotatedFileViewer_LazyLoaded.AnnotatedFileViewer>Controls.BaseControl.createIn(VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer, this._element, {
                            tfsContext: TfsContext.getDefault(),
                            allowEditing: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
                            lineLinkingWidgetEnabled: this._options.lineLinkingWidgetEnabled,
                            showAnnotateButton: this._options.showAnnotateButton,
                        });
                        this._fileViewer._bind("annotation-mode-changed", (sender: any, data: any) => {
                            const showingAnnotations = (data && data.showAnnotations) ? true : false;
                            if (parsedState.annotate !== showingAnnotations) {
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

                        VCEditorExtension.ContextMenuItemExtension.addContextMenuItems(this._fileViewer);
                        VCEditorExtension.ContextMenuItemExtension.bindContextMenuItems(this._fileViewer);
                    }

                    // Set the viewer content
                    this._fileViewer.getFileViewer().setDiscussionManager(
                        parsedState.discussionManager,
                        false,
                        parsedState.change && VCOM.ChangeType.hasChangeFlag(parsedState.change.changeType, VCLegacyContracts.VersionControlChangeType.Delete));

                    const editSettings: VCFileViewer_LazyLoaded.FileEditSettings = {
                        allowEditing: VCSourceEditing.EditingEnablement.isEditableVersionType(parsedState.repositoryContext, parsedState.version),
                        allowBranchCreation: true,
                        editMode: parsedState.editMode,
                        newFile: parsedState.newFile
                    };
                    
                    if (parsedState.newFile) {
                        if (typeof parsedState.initialContent !== "undefined") {
                            editSettings.initialContent = parsedState.initialContent;
                        }
                    }
                    
                    const viewSettings: VCFileViewer_LazyLoaded.FileViewSettings = {
                        contentRendererOptions: parsedState.rendererOptions,
                        scrollContentTo: parsedState.scrollToAnchor,
                    };
                    
                    function parseIntegerGreaterThanZero(value: any) {
                        const num = Number(value);
                        if (VCUtils_Number.isInteger(num) && value > 0) {
                            return num;
                        }
                        else {
                            return;
                        }
                    }
                    
                    if (parsedState.line) {
                        const line = parseIntegerGreaterThanZero(parsedState.line);
                        if (line) {
                            const lineEnd = parseIntegerGreaterThanZero(parsedState.lineEnd);
                            const startColumn = parseIntegerGreaterThanZero(parsedState.lineStartColumn);
                            const endColumn = parseIntegerGreaterThanZero(parsedState.lineEndColumn);
                            
                            viewSettings.line = <LineAdornmentOptions>{
                                startLineNumber: line,
                                endLineNumber: lineEnd,
                                style: parsedState.lineStyle,
                                glyphMarginText: parsedState.lineTooltip,
                                startColumn: startColumn,
                                endColumn: endColumn
                            };
                        }
                    }

                    this._fileViewer.getFileViewer().setActiveState(true, true);
                    this._fileViewer.getFileViewer().setChangeListNavigator(parsedState.changeListNavigator);
                    this._fileViewer.viewFile(parsedState.repositoryContext, parsedState.item, parsedState.annotate, editSettings, viewSettings)
                        .then(() => this._options.onScenarioComplete && this._options.onScenarioComplete());
                });
            }
        }
        else {
            this._clearContent();
        }

        // Save this path
        this._previousPath = parsedState.path;
    }

    public onNavigateAway() {
        if (this._fileViewer) {
            this._fileViewer.getFileViewer().setActiveState(false);
        }
    }

    private _clearContent() {
        /// <summary>Clear any existing content</summary>
        this._fileViewer = null;
        this._folderViewer = null;
        this._element.empty();
    }

    private _registerEllipsisHotSpot(): void {
        if (TfsContext.getDefault().isHosted) {
            this._bind("Grid.layout.complete", (event) => {
                const EllipsisSelector = ".grid-context-menu-icon:first";
                VSS.using(["Engagement/Dispatcher", "Engagement/Core"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementCore: typeof EngagementCore_NO_REQUIRE) => {
                    EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore_NO_REQUIRE.IEngagementModel>{
                        id: "ExplorerViewItemElipsis",
                        type: EngagementCore.EngagementType.HotSpot,
                        model: EngagementDispatcher.lazyLoadModel(["Engagement/QuickStart/UI"], (QS_UI: typeof QS_UI_NO_REQUIRE) => {
                            return <HotSpot_NO_REQUIRE.HotSpotModel>{
                                engagementId: "ExplorerViewItemElipsis",
                                target: EllipsisSelector,
                                content: "",
                                popUpModel: {
                                    title: VCResources.EngagementExplorerViewElipsisTitle,
                                    content: VCResources.EngagementExplorerViewElipsisContent,
                                    target: EllipsisSelector,
                                    position: QS_UI.BubblePosition.BOTTOM,
                                    alignment: QS_UI.BubbleAlignment.RIGHT,
                                    container: "body",
                                    closeOnClickOutside: true,
                                    css: {
                                        "margin-left": "40px",
                                        "max-width": "300px"
                                    }
                                },
                                css: {
                                    "margin-top": "-4px"
                                }
                            };
                        })
                    });
                });
            });
        }
    }
}

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import Controls = require("VSS/Controls");
import Documents = require("Presentation/Scripts/TFS/TFS.Welcome.Documents");
import FileViewerModelBuilder = require("Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import Navigation = require("VSS/Controls/Navigation");
import Splitter = require("VSS/Controls/Splitter");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCSourceEditingEvents = require("VersionControl/Scripts/Controls/SourceEditingEvents");
import VCSourceRendering = require("VersionControl/Scripts/TFS.VersionControl.SourceRendering");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import WelcomeProviders = require("Welcome/Scripts/TFS.Welcome.WelcomeProviders");
import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import WelcomeResources = require("Welcome/Scripts/Resources/TFS.Resources.Welcome");
import WelcomeWikiLinkTransformer = require("Welcome/Scripts/TFS.Welcome.WikiLinkTransformer");
import {TfvcVersionControlPathUtility} from "VersionControl/Scripts/TfvcVersionControlPathUtility";
import VCWikiImageTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiImageTransformer");
import Telemetry = require("VersionControl/Scripts/TFS.VersionControl.Telemetry");
import Grids = require("VSS/Controls/Grids");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_VC_Contracts = require("TFS/VersionControl/Contracts");
import VSS_Serialization = require("VSS/Serialization");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TfsContext.getDefault();
var delegate = Utils_Core.delegate;

interface IWelcomeNavigationState {
    name: string;
    repositoryType: RepositoryType;
    path: string;
    anchor: string;
    scrollToAnchor: string;
}

class WelcomeViewConstants {
    public static COLLAPSED_CSS_CLASS: string = "collapsed";
    public static CONTENT_AREA_CSS_CLASS: string = ".welcome-view-content-area";
    public static HUB_TITLE_AREA: string = ".hub-title";
    public static SELECTOR_AREA_CSS_CLASS: string = ".welcome-view-selector-area";
    public static SEPARATOR_CSS_CLASS: string = "separator";
    public static TITLE_REPO_CSS_CLASS: string = "hub-title-repository";
    public static TITLE_SEPARATOR_CSS_CLASS: string = "hub-title-separator";
    public static TITLE_FILENAME_CSS_CLASS: string = "hub-title-filename";
    public static TITLE_MAX_LENGTH: number = 80;
    public static VIEW_ACTION_NAME: string = "view";
    public static DOCUMENT_AREA_CSS_CLASS: string = "document-selector-area";
    public static LAST_DOCUMENT_PREFIX: string = "/Welcome/LastDocument/";
}

class CustomerIntelligenceConstants {
    public static WELCOME_AREA: string = "Welcome";

    public static WELCOME_LOAD_REPOSITORIES_FEATURE: string = "LoadRepositories";

    public static WELCOME_LOAD_REPOSITORIES_DURATION_PROPERTY: string = "TimeInMSec";
}

class WelcomeView extends Navigation.NavigationView {

    private _$fileSelectorArea: JQuery;
    private _$hubTitle: JQuery;
    private _$leftPane: JQuery;
    private _$rightPane: JQuery;

    private _welcomeProviders: WelcomeProviders.IWelcomeProviders;
    private _fileViewerModelBuilder: FileViewerModelBuilder.FileViewerModelBuilder;
    private _docProvider: Documents.IWelcomeDocumentProvider;
    private _defaultSourceControlType: TFS_Core_Contracts.SourceControlTypes;

    private _informationArea: Controls.BaseControl;
    private _pageLoadStartTime: number;
    private _repositories: Array<Documents.IProjectRepository>;
    private _documentGrid: Grids.Grid;

    private _currentDocument: WelcomeProviders.VersionControlDocumentFile;
    private _selectedIndex: number;
    private _previousSelectedIndex: number;

    private _currentState: IWelcomeNavigationState;

    private _splitter: Splitter.Splitter;
    private _fileViewer: VCFileViewer.FileViewer;
    private _pendingScrollContentTo: string;
    private _suppressNavigation: boolean;
    private _currentItemIsDirty: boolean;
    private _suppressPromptOnNavigateAway: boolean;

    public initialize() {

        super.initialize();
        this._pageLoadStartTime = new Date().getTime();
        var searchExecuted = false;
        var $splitter = this._element.find(this._options.hubSplitterSelector);
        this._splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $splitter);
        this._splitter.setCollapsedLabel(WelcomeResources.CollapsedText);
        this._splitter.setMinWidth(150);

        this._$leftPane = this._element.find(WelcomeViewConstants.SELECTOR_AREA_CSS_CLASS);
        this._$leftPane.addClass(WelcomeViewConstants.DOCUMENT_AREA_CSS_CLASS);
        this._$rightPane = this._element.find(WelcomeViewConstants.CONTENT_AREA_CSS_CLASS);
        this._$hubTitle = this._element.find(WelcomeViewConstants.HUB_TITLE_AREA);

        if (!this._options.projectVersionControlInfo) {
            this._showErrorMessage(WelcomeResources.ProjectInfoError);
            return;
        }
        var projectVCInfo = VSS_Serialization.ContractSerializer.deserialize(this._options.projectVersionControlInfo, {
            fields: {
                "defaultSourceControlType": {
                    enumType: <VSS_Serialization.ContractEnumMetadata><any>TFS_Core_Contracts.TypeInfo.SourceControlTypes
                }
            }
        });
        this._defaultSourceControlType = projectVCInfo.defaultSourceControlType;

        var gitProvider = Documents.DocumentPluginManager.GetPlugin("git");
        var tfvcProvider = Documents.DocumentPluginManager.GetPlugin("tfvc");
        if (!gitProvider || !tfvcProvider) {
            this._showErrorMessage(WelcomeResources.ProjectTypeError);
            return;
        }
        this._welcomeProviders = new WelcomeProviders.WelcomeProviders(gitProvider, tfvcProvider);

        VCSourceEditingEvents.Events.subscribeItemEditedEvent((newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, itemVersion: string) => {
            if (this._currentDocument) {
                this._setHubTitle(this._currentDocument, true);
            }

            this._setCurrentFileDirtyState(false);
        });

        VCSourceEditingEvents.Events.subscribeItemDirtyStateChangedEvent((isDirty: boolean, itemPath: string, originalItemVersion: string) => {
            this._setCurrentFileDirtyState(isDirty);
        });

        var repositoryLoadStartTime = new Date().getTime();
        this._beginGetAllRepositories()
            .done((repositories) => {
                var telemetryProperties: { [x: string]: string } = {
                     "TimeInMSec": (new Date().getTime() - repositoryLoadStartTime).toString()
                };
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.WELCOME_AREA,
                    CustomerIntelligenceConstants.WELCOME_LOAD_REPOSITORIES_FEATURE,
                    telemetryProperties));

                this._repositories = repositories;
                this._drawDocumentGrid();

                //attach navigate handler only after grid is created
                Navigation_Services.getHistoryService().attachNavigate(WelcomeViewConstants.VIEW_ACTION_NAME, (sender, state) => {
                    this.navigate(state);
                }, true);

                if (!this._currentState) {
                    var defaultDocumentJson = TFS_OM_Common.ProjectCollection.getDefaultConnection()
                        .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
                        .readLocalSetting(
                            this._createLastDocumentKey(this._options.projectVersionControlInfo.project.id),
                            TFS_WebSettingsService.WebSettingsScope.User, false);

                    if (defaultDocumentJson) {
                        var defaultDocument = Utils_Core.parseMSJSON(defaultDocumentJson, false);
                        if (defaultDocument.name && defaultDocument.repositoryType) {

                            // Intentionally setting the document path to null
                            // So users returning later browse to the root document
                            if (this._navigateState(defaultDocument.name, defaultDocument.repositoryType, null, null, null, true)) {
                                return;
                            }
                        }
                    }

                    //otherwise navigate to the first document
                    this._navigateState(this._repositories[0].getRepositoryName(), this._repositories[0].getRepositoryType(), this._repositories[0].createDefaultDocument().path, null, null, true);
                }
            })
            .fail((error) => {
                this._showErrorMessage(WelcomeResources.ProjectInfoError);
            });
    }

    private _createLastDocumentKey(projectId: string): string {

        var key = WelcomeViewConstants.LAST_DOCUMENT_PREFIX + projectId;
        return key;
    }

    private _navigateState(repository: string, repositoryType: RepositoryType, path: string, anchor: string, scrollToAnchor: string, replaceUrl: boolean): boolean {
        for (var i = 0; i < this._repositories.length; ++i) {
            if (this._repositories[i].getRepositoryName().toLocaleLowerCase() === repository.toLocaleLowerCase()
                && (repositoryType == null || this._repositories[i].getRepositoryType() == repositoryType)) {

                var state: IWelcomeNavigationState;
                state = {
                    name: repository,
                    repositoryType: repositoryType,
                    path: path,
                    anchor: anchor,
                    scrollToAnchor: scrollToAnchor
                };
                if (replaceUrl) {
                    Navigation_Services.getHistoryService().replaceHistoryPoint(WelcomeViewConstants.VIEW_ACTION_NAME, state);
                }
                else {
                    Navigation_Services.getHistoryService().addHistoryPoint(WelcomeViewConstants.VIEW_ACTION_NAME, state);
                }
                return true;
            }
        }

        return false;
    }

    private _getGridOptions(): any {
        return {
            cssClass: "document-grid",
            header: false,
            sharedMeasurements: false,
            allowMultiSelect: false,
            columns: [
                {
                    getCellContents: (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) => {
                        var gridCell = $(domElem('div')).text(this._repositories[dataIndex].getRepositoryName()).addClass("document-grid-cell");
                        if (dataIndex === 0) {
                            gridCell = gridCell.addClass("project-grid-cell");
                        }

                        return gridCell;
                    },
                }]
        }
    }

    private _onRepositorySelectionChanged(selectedIndex, selectedCount, selectedRows) {

        this._previousSelectedIndex = this._selectedIndex;
        this._selectedIndex = selectedIndex;

        if (this._suppressNavigation) {
            this._suppressNavigation = false;
            return;
        }

        var state: IWelcomeNavigationState;
        var repository = this._repositories[selectedIndex];
        this._navigateState(repository.getRepositoryName(), repository.getRepositoryType(), repository.createDefaultDocument().path, null, null, false);
    }

    private _drawDocumentGrid(): void {

        var gridOptions = $.extend(this._getGridOptions(), {
            source: this._repositories
        });

        this._documentGrid = <Grids.Grid>Controls.BaseControl.createIn(Grids.Grid, this._$leftPane, gridOptions);
        this._documentGrid.selectionChanged = delegate(this, this._onRepositorySelectionChanged);
    }

    private _beginGetRepositories(welcomeProvider: Documents.IWelcomeDocumentProvider, isDefaultRepositoryType:boolean = false): JQueryPromise<Array<Documents.IProjectRepository>> {
        var deferred: JQueryDeferred<Array<Documents.IProjectRepository>> = jQuery.Deferred();


        welcomeProvider.beginGetProjectRepositories(this._defaultSourceControlType)
            .done((repositories) => {
                deferred.resolve(repositories);
            })
            .fail((error) => {
                deferred.reject(error);
            });

        return deferred.promise();
    }

    private _beginGetAllRepositories(): JQueryPromise<Array<Documents.IProjectRepository>> {
        var providers = this._welcomeProviders.getAllWelcomeDocumentProviders(this._defaultSourceControlType);

        // We have two repository providers.  The provider matching the project type is returned first.
        return $.when(this._beginGetRepositories(providers[0]), this._beginGetRepositories(providers[1]))
            .then(function (repos1: Array<Documents.IProjectRepository>, repos2: Array<Documents.IProjectRepository>) {
                var repos = repos1.concat(repos2);
                return repos;
            });
    }

    private _parseState(state: any): IWelcomeNavigationState {
        var parsedState: IWelcomeNavigationState;
        parsedState = {
            name: state.name,
            repositoryType: state.repositoryType,
            path: state.path,
            anchor: state.anchor,
            scrollToAnchor: state.scrollToAnchor
        };

        return parsedState;
    }

    ///This is triggered on history point write, should handle all state management and populating controls
    private navigate(state: any): void {

        if (this._currentItemIsDirty) {
            
            if (this._suppressPromptOnNavigateAway) {
                this._suppressPromptOnNavigateAway = false;
                return;
            }

            if (!confirm(Utils_String.format(VCResources.UnsavedFileNavigateAwayFormat,
                VersionControlPath.getFileName(this._currentDocument.path)))) {

                this._suppressNavigation = true;
                this._documentGrid.setSelectedRowIndex(this._previousSelectedIndex);
                Navigation_Services.getHistoryService().replaceHistoryPoint(WelcomeViewConstants.VIEW_ACTION_NAME, this._currentState);
                this._suppressPromptOnNavigateAway = true;
                return;
            }

            /// iSDirty() is invoked by window.unload handler to figure out if this document is unsaved
            /// the old instance is not required so we can override this instance to return not dirty
            this._fileViewer.isDirty = () => {
                return false;
            }
            this._setCurrentFileDirtyState(false);
        }

        var parsedState: IWelcomeNavigationState = this._parseState(state);
        if (parsedState.anchor) {

            var newState = $.extend(parsedState, {
                anchor: null,
                scrollToAnchor: parsedState.anchor
            });

            Navigation_Services.getHistoryService().addHistoryPoint(WelcomeViewConstants.VIEW_ACTION_NAME, newState);
            return;
        }

        this._currentState = parsedState;

        if (this._currentDocument && this._currentDocument.name.toLocaleLowerCase() === parsedState.name.toLocaleLowerCase()
            && this._currentDocument.path.toLocaleLowerCase() === parsedState.path.toLocaleLowerCase()) {

            //anchor link in current document
            if (parsedState.scrollToAnchor) {
                this._fileViewer.scrollContentTo(parsedState.scrollToAnchor);
            }

            return;
        }

        // different doc, search for repo
        var found: boolean = false;
        for (var i = 0; i < this._repositories.length; ++i) {
            if (this._repositories[i].getRepositoryName() === parsedState.name
                && (parsedState.repositoryType == null || this._repositories[i].getRepositoryType() == parsedState.repositoryType)) {

                this._suppressNavigation = true;
                this._documentGrid.setSelectedRowIndex(i);

                // update the doc providers for the selected repository
                this._docProvider = this._welcomeProviders.getWelcomeDocumentProvider(this._repositories[i].getRepositoryType());
                this._fileViewerModelBuilder = this._welcomeProviders.getFileViewerModelBuilder(this._repositories[i].getRepositoryType());

                found = true;
                break;
            }
        }

        if (!found) {
            this._showErrorMessage(WelcomeResources.ProjectInfoError);
            return;
        }

        // If the parsed state has no document path, use the default document for the selected repository.
        // We intentionally set the document path in local storage to null, so that when users return
        // later they are directed to the root document in the repository.
        var path = parsedState.path || this._repositories[i].createDefaultDocument().path;

        var document = this._repositories[i].createDocument(path);
        this._currentDocument = <WelcomeProviders.VersionControlDocumentFile>document;

        try {
            TFS_OM_Common.ProjectCollection.getDefaultConnection()
                .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
                .writeLocalSetting(
                    this._createLastDocumentKey(this._options.projectVersionControlInfo.project.id), 
                    Utils_Core.stringifyMSJSON(document), TFS_WebSettingsService.WebSettingsScope.User);
        }
        catch (e) {

            //this step isnt critical, if it fails, we should move on
        }

        this._clearContents();
        var fileModel = this._fileViewerModelBuilder.beginGetFileModel(document)
            .done(model=> {
                this._showFile(model, parsedState.scrollToAnchor);
            })
            .fail(error=> {
                this._setHubTitle(document, false);
                this._showErrorMessage(error.message);
            });

        // Log welcome hub load time once
        if (this._pageLoadStartTime !== 0) {
            VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData("Welcome", "RenderWelcomeHub", {
                "Action": "Render Welcome Hub"
            }, this._pageLoadStartTime, new Date().getTime() - this._pageLoadStartTime));
            this._pageLoadStartTime = 0;
        }
    }

    private _showFile(model: FileViewerModelBuilder.IFileViewerModel, anchor: string): void {

        this._fileViewer = <VCFileViewer.FileViewer>Controls.BaseControl.createIn(VCFileViewer.FileViewer, this._$rightPane, {
            tfsContext: tfsContext,
            monitorScroll: true,
            monitorSelection: true,
            externalViewerCss: "default",
            allowEditing: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
            allowPreviewing: true
        });

        this._fileViewer.setActiveState(true, true);
        this._setHubTitle(model.file, !model.newFile);

        var editSettings: VCFileViewer.FileEditSettings = {
            editMode: false,
            allowEditing: model.repositoryExists,
            newFile: model.newFile,
            initialContent: model.defaultContent
        };

        var rendererOptions: ContentRendering.IContentRendererOptions = {};
        if (VCSourceRendering.WikiRelativeLinkEnablement.isWikiLinkTransformationEnabled()) {
            rendererOptions.linkTransformer = new WelcomeWikiLinkTransformer.WelcomeWikiLinkTransformer(model.repositoryContext, model.item);
        }

        rendererOptions.imageTransformer = new VCWikiImageTransformer.WikiImageTransformer(model.repositoryContext, model.item);

        var logProperties: { [x: string]: string } = { "sourceUrl": window.location.href, "item": model.item.serverItem, "project": model.file.name, "repositoryId": model.repositoryContext.getRepositoryId() };

        // Prepare an AI LogEvent callback to be triggered on clicks.
        rendererOptions.linkClickHandler = Telemetry.linkClickHandlerFactory.create("Welcome", "WelcomeMarkdownLinkOnClick", logProperties);

        var viewSettings: VCFileViewer.FileViewSettings = {
            contentRendererOptions: rendererOptions
        };
        if (anchor) {
            viewSettings.scrollContentTo = anchor;
        }

        this._fileViewer.viewItem(model.repositoryContext, model.item, editSettings, viewSettings);
    }

    private _clearContents() {
        this._$rightPane.empty();
        this._$hubTitle.empty();
    }

    private _setCurrentFileDirtyState(isDirty: boolean) {
        this._currentItemIsDirty = isDirty;
    }

    private _truncate(str: string, maxLength: number): string {

        if (str.length <= maxLength)
            return str;

        var renderedCount: number = maxLength - 3;

        var index1 = Math.ceil(renderedCount / 2) - 1;
        index1 = str.lastIndexOf('/', index1);

        var index2 = str.length - Math.floor(renderedCount / 2);
        index2 = str.indexOf('/', index2);

        var truncated: string = str.substr(0, index1 + 1)
            + '...' + str.substr(index2);
        return truncated;
    }

    private _setHubTitle(file: Documents.DocumentFile, fileExists: boolean) {
        this._$hubTitle.empty();

        var repositoryType: RepositoryType = (<WelcomeProviders.VersionControlDocumentFile>file).repositoryType;

        if ((repositoryType === RepositoryType.Tfvc) ||
            ((repositoryType === RepositoryType.Git) && ((<WelcomeProviders.GitDocumentFile>file).repositoryId))) {
            $(domElem('a')).text(file.parentName).addClass(WelcomeViewConstants.TITLE_REPO_CSS_CLASS).attr("href", this._docProvider.getExplorerUrl(file)).appendTo(this._$hubTitle);
        } else {
            $(domElem('div')).text(file.parentName).addClass(WelcomeViewConstants.TITLE_REPO_CSS_CLASS).appendTo(this._$hubTitle);
        }
        $(domElem('div')).text("|").addClass(WelcomeViewConstants.TITLE_SEPARATOR_CSS_CLASS).appendTo(this._$hubTitle);

        var rootRelativePath: string = repositoryType === RepositoryType.Git ? file.path.substr(1) : TfvcVersionControlPathUtility.getProjectRelativePathFromAbsolutePath(file.path);
        rootRelativePath = this._truncate(rootRelativePath, WelcomeViewConstants.TITLE_MAX_LENGTH);

        if (fileExists) {
            $(domElem('a')).text(rootRelativePath).addClass(WelcomeViewConstants.TITLE_FILENAME_CSS_CLASS).attr("href", this._docProvider.getFileContentUrl(file)).appendTo(this._$hubTitle);
        } else {
            $(domElem('div')).text(rootRelativePath).addClass(WelcomeViewConstants.TITLE_FILENAME_CSS_CLASS).appendTo(this._$hubTitle);
        }

        this._$hubTitle.addClass(WelcomeViewConstants.SEPARATOR_CSS_CLASS);

        $(domElem('div')).text("|").addClass(WelcomeViewConstants.TITLE_SEPARATOR_CSS_CLASS).css("margin-left", "15px").appendTo(this._$hubTitle);
    }

    private _showErrorMessage(message: string, error?: string): void {
        this._$rightPane.empty();
        this._$hubTitle.empty();
        // If there is an error message show it. Otherwise hide it.
        this._$hubTitle.text(WelcomeResources.ErrorText + (error ? ": " + error : ""));
        $(domElem('div')).text(message).appendTo(this._$rightPane);
        
        // log error occurred event
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData("Welcome", "WelcomePageError", {
            "Error": (error ? error.toString() + message : message)
        }));
    }
}

VSS.using(["Welcome/Scripts/TFS.Welcome.WelcomeProviders"], () => {
    // Ensure that the VC welcome providers are loaded before instantiating the welcome view control.
    Controls.Enhancement.registerEnhancement(WelcomeView, ".welcome-view");
});

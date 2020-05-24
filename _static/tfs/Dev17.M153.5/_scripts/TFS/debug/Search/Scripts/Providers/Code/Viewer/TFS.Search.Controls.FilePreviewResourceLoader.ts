// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Documents = require("Presentation/Scripts/TFS/TFS.Welcome.Documents");
import FileViewerModelBuilder = require("Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder");
import WelcomeProvider = require("Welcome/Scripts/TFS.Welcome.WelcomeProviders");
import Utils_UI = require("VSS/Utils/UI");

import VCFileViewer = require("VersionControl/Scripts/Controls/FileViewer");
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import VCAnnotateAnnotatedFileViewer = require("VersionControl/Scripts/Controls/AnnotateAnnotatedFileViewer");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

var domElem = Utils_UI.domElem;

export class PreviewResourceLoader {
    private static SEARCH_RESULTS_PANE_CONTENTS_CSS_SELECTOR: string = ".search-results-contents";
    private static DUMMY_PREVIEW_WRAPPER_CSS_CLASS: string = "dummy-preview-wrapper";
    private static DUMMY_PREVIEW_CONTAINER_CSS_CLASS: string = "dummy-preview-container";

    private fileViewerModelBuilder: FileViewerModelBuilder.FileViewerModelBuilder;
    private dummyFileViewer: VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer;

    /// <summary>
    /// Called when search is being initialized (On search landing page)
    /// </summary> 
    /// <param name="projectId" type="String">Id of project used for dummy preivew </param>
    /// <param name="projectName" type="String">Name of project used for dummy preivew </param>
    /// <param name="tfsContext" type="Object">Tfs request context</param>
    public createDummyFileViewer(projectId: string, projectName: string, tfsContext: any): void {

        // Gets project and repository details
        this.getProjectAndRepoMetadata(projectId, projectName, tfsContext, (repoNameForDummyFilePreview: string,
            repoIdForDummyFilePreview: string,
            projectNameForDummyFilePreview: string,
            docProvider: Documents.IWelcomeDocumentProvider,
            isProjectGitType: boolean) => {

            // Creates file viewer model
            this.createFileViewerModel(repoNameForDummyFilePreview,
                repoIdForDummyFilePreview,
                projectNameForDummyFilePreview,
                tfsContext,
                docProvider,
                isProjectGitType, (model: FileViewerModelBuilder.IFileViewerModel, anchor: string, tempTfsContext: any) => {

                    // Show the dummy file in preview
                    this.showPreview(model, anchor, tempTfsContext);
                }
             );
             }
        );
    }

    /// <summary>
    /// Gets the project and repository metadata for file viewer mode
    /// </summary> 
    /// <param name="projectId" type="String">Id of project used for dummy preivew </param>
    /// <param name="projectName" type="String">Name of project used for dummy preivew </param>
    /// <param name="tfsContext" type="Object">Tfs request context</param>
    /// <param name="callback" type="function"></param>
    public getProjectAndRepoMetadata(projectId: string, projectName: string, tfsContext: any, callback): void {
        var rootRequestPath: string = Context.SearchContext.getRootRequestPath();
        var tfvcClient: VCWebApi.TfvcHttpClient = new VCWebApi.TfvcHttpClient(rootRequestPath);

        // Gets project info details
        tfvcClient.beginGetProjectInfo(projectId).then((projInfo) => {
            var docProvider: Documents.IWelcomeDocumentProvider;

            if (projInfo.supportsGit === true) {
                docProvider = Documents.DocumentPluginManager.GetPlugin("git");

                var repoClient: VCWebApi.GitHttpClient = new VCWebApi.GitHttpClient(rootRequestPath);

                // Gets repository details for the project
                repoClient.beginGetProjectRepositories(projectId).then((repoList: any[]) => {
                    if (repoList != null && repoList.length > 0) {
                        callback(repoList[0].name, repoList[0].id, repoList[0].project.name, docProvider, true);
                    }
                }, (error: any) => { });
            }
            else if (projInfo.supportsTFVC === true) {
                docProvider = Documents.DocumentPluginManager.GetPlugin("tfvc");
                callback(undefined, undefined, projectName, docProvider, false);
            }
        }, (error: any) => { });
    }

    /// <summary>
    /// Creates a file viewer model to show the dummy file in preview
    /// </summary> 
    /// <param name="repoNameForDummyFilePreview" type="String">Name of repository used for dummy preivew </param>
    /// <param name="repoIdForDummyFilePreview" type="String">Id of repository used for dummy preivew </param>
    /// <param name="projectNameForDummyFilePreview" type="String">Name of repository used for dummy preivew </param>
    /// <param name="tfsContext" type="Object">Tfs request context</param>
    /// <param name="docProvider" type="Object">Document provider object, according to the project type</param>
    /// <param name="isProjectGitType" type="boolean">Boolean flag that specifies the project type</param>
    /// <param name="callback" type="function"></param>
    private createFileViewerModel(repoNameForDummyFilePreview: string,
                                repoIdForDummyFilePreview: string,
                                projectNameForDummyFilePreview: string,
                                tfsContext: any,
                                docProvider: Documents.IWelcomeDocumentProvider,
                                isProjectGitType: boolean,
                                callback): void {
        
        var tempTfsContext = Context.SearchContext.getTfsContext(),
            projRepo: any;

        if (isProjectGitType) {
            projRepo = new WelcomeProvider.GitProjectRepository(repoNameForDummyFilePreview, repoIdForDummyFilePreview, undefined, projectNameForDummyFilePreview);
        }
        else {
            projRepo = new WelcomeProvider.TfvcProjectRepository(projectNameForDummyFilePreview);
        }

        this.fileViewerModelBuilder = new FileViewerModelBuilder.GitFileViewerModelBuilder(tempTfsContext, docProvider);

        var fileModel = this.fileViewerModelBuilder.beginGetFileModel(projRepo.createDocument('$/' + projectNameForDummyFilePreview + '/DummyFilePreview.txt'))
            .done(model=> {
            callback(model, undefined, tempTfsContext);
        }).fail(error=> { });
    }

    /// <summary>
    /// Creates a file viewer object and show the dummy file
    /// </summary> 
    /// <param name="model" type="IFileViewerModel">File model (string key/value pairs)</param>
    /// <param name="tempTfsContext" type="Object">Tfs request context (collection level tfs context)</param>
    private showPreview(model: FileViewerModelBuilder.IFileViewerModel, anchor: string, tempTfsContext): void {
        var $dummyPreviewWrapper: JQuery = $(PreviewResourceLoader.SEARCH_RESULTS_PANE_CONTENTS_CSS_SELECTOR).append($(domElem('div', PreviewResourceLoader.DUMMY_PREVIEW_WRAPPER_CSS_CLASS)));

        // The dom file viewer is binded to is hidden
        this.dummyFileViewer = <VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer>Controls.BaseControl
            .createIn(VCAnnotateAnnotatedFileViewer.AnnotatedFileViewer, $(domElem('div', PreviewResourceLoader.DUMMY_PREVIEW_CONTAINER_CSS_CLASS)).appendTo($dummyPreviewWrapper), {
            tfsContext: tempTfsContext,
            externalViewerCss: "default",
            allowEditing: VCSourceEditing.EditingEnablement.isSourceEditingFeatureEnabled(),
            allowPreviewing: true
        });

        this.dummyFileViewer.getFileViewer().setActiveState(true, true);

        var editSettings: VCFileViewer.FileEditSettings = {
            editMode: false,
            allowEditing: model.repositoryExists,
            newFile: model.newFile,
            initialContent: "Preview loading ...."
        };

        var rendererOptions: ContentRendering.IContentRendererOptions = {};

        var viewSettings: VCFileViewer.FileViewSettings = {
            contentRendererOptions: rendererOptions
        };

        if (anchor) {
            viewSettings.scrollContentTo = anchor;
        }
        // Shows the preview of the file
        try {
            this.dummyFileViewer.viewFile(model.repositoryContext, model.item, true, editSettings, viewSettings);
        }
        catch(e) {
            // Ignore any errors as dummy file preview is expected fail anyway
            // If we don't catch, this error will be caught by the browsers console (not ideal)
        }
    }
}
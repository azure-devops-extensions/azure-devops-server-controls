import FileDefaultContentProvider = require("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider");
import FileDefaultContentProviderScenario = require("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider.Scenario");
import Documents = require("Presentation/Scripts/TFS/TFS.Welcome.Documents");
import { getFileExtension } from "VersionControl/Scripts/VersionControlPath";
import VCClient = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import WelcomeProvider = require("Welcome/Scripts/TFS.Welcome.WelcomeProviders");

export interface IFileViewerModel {
    repositoryContext: RepositoryContext;
    item: VCLegacyContracts.ItemModel;
    file: Documents.DocumentFile;
    newFile: boolean;
    defaultContent: string;
    repositoryExists: boolean;
}

export class FileViewerModelBuilder {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    docProvider: Documents.IWelcomeDocumentProvider;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, docProvider: Documents.IWelcomeDocumentProvider) {
        if (!tfsContext) {
            throw new Error("TfsContext is required");
        }

        if (!docProvider) {
            throw new Error("IWelcomeDocumentProvider is required");
        }

        this.tfsContext = tfsContext;
        this.docProvider = docProvider;
    }

    public beginGetFileModel(file: Documents.DocumentFile): JQueryPromise<IFileViewerModel> {
        var deferred: JQueryDeferred<IFileViewerModel> = jQuery.Deferred();

        var model = {
            file: file,
            newFile: file.exists === Documents.Exists.No,
            repositoryExists: true
        };

        var repositoryType = (<WelcomeProvider.VersionControlDocumentFile>file).repositoryType;
        var repositoryId = this.getRepositoryId(file);
        var projectName = this.getProjectName(file);

        if (repositoryType === RepositoryType.Git && !repositoryId) {
            var repositoryContext = GitRepositoryContext.create(<VCContracts.GitRepository>{
                name: projectName
            }, this.tfsContext);
            $.extend(model, {
                repositoryContext: repositoryContext,
                repositoryExists: false
            });
            deferred.resolve(this.createDefaultContentModel(model, repositoryContext, file));
        } else {
            VCClient.beginGetContext(
                this.tfsContext,
                projectName,
                repositoryId,
                (repositoryContext) => {
                    $.extend(model, { repositoryContext: repositoryContext });
                    if (model.newFile) {
                        deferred.resolve(this.createDefaultContentModel(model, repositoryContext, file));
                        return;
                    }

                    repositoryContext.getClient().beginGetItem(
                        repositoryContext,
                        file.path,
                        this.getVersionName(file),
                        {
                            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel,
                            includeContentMetadata: true,
                            includeVersionDescription: false
                        },
                        (item) => {
                            if (!item) {
                                deferred.resolve(this.createDefaultContentModel(model, repositoryContext, file));
                                return;
                            }

                            $.extend(model, { item: item });
                            deferred.resolve(<any>model);
                        },
                        (error) => {
                            if (error && file.exists === Documents.Exists.Yes) {
                                deferred.reject(error);
                            } else {
                                file.exists = Documents.Exists.No;
                                deferred.resolve(this.createDefaultContentModel(model, repositoryContext, file));
                            }
                        })
                });
        }
        return deferred.promise();
    }

    createDefaultContentModel(model: any, repositoryContext: RepositoryContext, file: any) {
        const fileName = this.getMarkdownFileName(file);
        const extension = getFileExtension(fileName);
        const item = {
            serverItem: fileName,
            version: this.getVersionName(file),
            contentMetadata: { extension },
        } as VCLegacyContracts.ItemModel;

        var defaultContent = "";
        var defaultContentProvider = FileDefaultContentProvider.FileDefaultContentProviderFactory
            .getProvider(Documents.DocumentConstants.MARKDOWN_FILE_EXT, repositoryContext.getRepositoryType(), FileDefaultContentProviderScenario.Scenario.MissingFile);
        if (defaultContentProvider) {
            defaultContent = defaultContentProvider.getContent({
                repositoryContext: repositoryContext,
                item: item,
                repositoryExists: file.name !== this.tfsContext.navigation.project || this.docProvider.hasDefaultRepository(),
                showError: false,
            });
        }
        return $.extend(model, {
            newFile: true,
            item: item,
            defaultContent: defaultContent
        });
    }

    getProjectName(file: Documents.DocumentFile): string {
        if (!file) {
            throw new Error("file is required");
        }
        if (!file.parentName) {
            throw new Error("file.parentName is undefined");
        }
        return file.parentName;
    }

    getMarkdownFileName(file: any): string { throw new Error("This method is abstract"); }

    getRepositoryId(file: Documents.DocumentFile): string { throw new Error("This method is abstract"); }

    getVersionName(file: Documents.DocumentFile): string { throw new Error("This method is abstract"); }
}

export class GitFileViewerModelBuilder extends FileViewerModelBuilder {
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, docProvider: Documents.IWelcomeDocumentProvider) {
        super(tfsContext, docProvider);
    }

    getMarkdownFileName(file: any): string { return file.path; }

    getRepositoryId(file: WelcomeProvider.GitDocumentFile): string { return file.repositoryId; }

    getVersionName(file: WelcomeProvider.GitDocumentFile): string {
        var branchName = !file.defaultBranch ? "master" : GitRefUtility.getRefFriendlyName(file.defaultBranch);
        return new VCSpecs.GitBranchVersionSpec(branchName).toVersionString();
    }
}
   
export class TfvcFileViewerModelBuilder extends FileViewerModelBuilder {
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, docProvider: Documents.IWelcomeDocumentProvider) {
        super(tfsContext, docProvider);
    }

    getMarkdownFileName(file: any): string { return file.path; }

    getRepositoryId(file: WelcomeProvider.TfvcDocumentFile): string { return undefined; }

    getVersionName(file: WelcomeProvider.TfvcDocumentFile): string { return undefined; }
}

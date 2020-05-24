import Documents = require("Presentation/Scripts/TFS/TFS.Welcome.Documents");
import FileViewerModelBuilder = require("Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder");
import Navigation_Services = require("VSS/Navigation/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import VCContracts = require("TFS/VersionControl/Contracts");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

var TfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TfsContext.getDefault();

export interface IWelcomeProviders {
    getWelcomeDocumentProvider(repositoryType: RepositoryType): Documents.IWelcomeDocumentProvider;
    getAllWelcomeDocumentProviders(defaultRepositoryType: TFS_Core_Contracts.SourceControlTypes): Array<Documents.IWelcomeDocumentProvider>;
    getFileViewerModelBuilder(repositoryType: RepositoryType): FileViewerModelBuilder.FileViewerModelBuilder;
}

export class WelcomeProviders implements IWelcomeProviders {
    private _docProviders: { [repositoryType: number]: Documents.IWelcomeDocumentProvider; } = {};
    private _fileViewerModelBuilders: { [repositoryType: number]: FileViewerModelBuilder.FileViewerModelBuilder; } = {};

    constructor(gitProvider: Documents.IWelcomeDocumentProvider, tfvcProvider: Documents.IWelcomeDocumentProvider) {
        this._docProviders[RepositoryType.Git] = gitProvider;
        this._fileViewerModelBuilders[RepositoryType.Git] = new FileViewerModelBuilder.GitFileViewerModelBuilder(tfsContext, gitProvider);
        this._docProviders[RepositoryType.Tfvc] = tfvcProvider;
        this._fileViewerModelBuilders[RepositoryType.Tfvc] = new FileViewerModelBuilder.TfvcFileViewerModelBuilder(tfsContext, tfvcProvider);
    }

    public getWelcomeDocumentProvider(repositoryType: RepositoryType) {
        return this._docProviders[repositoryType];
    }

    public getAllWelcomeDocumentProviders(defaultRepositoryType: TFS_Core_Contracts.SourceControlTypes) {
        var result: Array<Documents.IWelcomeDocumentProvider> = new Array<Documents.IWelcomeDocumentProvider>();
        result.push(this._docProviders[RepositoryType.Git]);
        result.push(this._docProviders[RepositoryType.Tfvc]);

        // the provider for the defaultRepositoryType should be returned first
        if (defaultRepositoryType == TFS_Core_Contracts.SourceControlTypes.Git) {
            return result;
        } else {
            return result.reverse();
        }
    }

    public getFileViewerModelBuilder(repositoryType: RepositoryType) {
        return this._fileViewerModelBuilders[repositoryType];
    }
}



export class VersionControlDocumentFile extends Documents.DocumentFile {
    public repositoryType: RepositoryType;

    constructor(path: string, name: string, parentName: string, exists: Documents.Exists, repositoryType: RepositoryType) {
        super(path, name, parentName, exists);
        this.repositoryType = repositoryType;
    }
}

export module TfsHelper {
    export function getTfsContext() {
        return tfsContext;
    }
}

export class GitDocumentFile extends VersionControlDocumentFile {
    public repositoryId: string;
    public repositoryName: string;
    public defaultBranch: string;

    constructor(path: string, name: string, exists: Documents.Exists, repositoryName: string, repositoryId: string) {
        super(path, name, repositoryName, exists, RepositoryType.Git);

        this.repositoryId = repositoryId;
        this.repositoryName = repositoryName;
    }

    public getExplorerUrl(): string {
        return VersionControlUrls.getGitActionUrl(tfsContext, this.repositoryName, null, null, false);
    }
    
    public getFileContentUrl(): string {
        // FileViewerModelBuilder.createDefaultContentModel also falls back on master to determine in which branch the document should be created
        var branchName = !this.defaultBranch ? "master" : GitRefUtility.getRefFriendlyName(this.defaultBranch);
        return VersionControlUrls.getGitActionUrl(tfsContext, this.repositoryName, null, null, false) + Navigation_Services.getHistoryService().getFragmentActionLink("contents", { path: this.path, version: new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(branchName)).toVersionString() });
    }

    public clone(): GitDocumentFile {
        var doc = new GitDocumentFile(this.path, this.name, this.exists, this.repositoryName, this.repositoryId);
        doc.defaultBranch = this.defaultBranch;
        return doc;
    }

    public getRepositoryType(): RepositoryType {
        return RepositoryType.Git;
    }
}

export class GitProjectRepository implements Documents.IProjectRepository {

    public name: string;
    public id: string;
    public defaultBranch: string;
    public project: string;

    constructor(name: string, id: string, defaultBranch: string, project: string) {
        this.name = name;
        this.id = id;
        this.defaultBranch = defaultBranch;
        this.project = project;
    }

    public getRepositoryName(): string {
        return this.name;
    }

    public getRepositoryType(): RepositoryType {
        return RepositoryType.Git;
    }

    public createDefaultDocument(): Documents.DocumentFile {
        return this.createDocument(Documents.DocumentConstants.DEFAULT_FILE_PATH);
    }

    public createDocument(path: string): Documents.DocumentFile {
        var doc = new GitDocumentFile(path, this.name, Documents.Exists.Unknown, this.name, this.id);
        doc.defaultBranch = this.defaultBranch;
        doc.parentName = this.name;
        return doc; 
    }
}

export class TfvcProjectRepository implements Documents.IProjectRepository {

    public project: string;

    constructor(project: string) {
        this.project = project;
    }

    public getRepositoryName(): string {
        return this.project;
    }

    public getRepositoryType(): RepositoryType {
        return RepositoryType.Tfvc;
    }

    public createDefaultDocument(): Documents.DocumentFile {
        return this.createDocument("$/" + this.project + Documents.DocumentConstants.DEFAULT_FILE_PATH);
    }

    public createDocument(path: string): Documents.DocumentFile {
        var doc = new TfvcDocumentFile(path, this.getRepositoryName(), this.project, Documents.Exists.Unknown);
        return doc;
    }
}

export class GitDocumentProvider implements Documents.IWelcomeDocumentProvider {
    private _hasDefaultRepo: boolean;
    private _httpClient: VCWebApi.GitHttpClient;
	
	constructor(hasDefaultRepository?: boolean) {
        this._hasDefaultRepo = !!hasDefaultRepository;
    }
	
    public beginGetProjectRepositories(defaultRepositoryType: TFS_Core_Contracts.SourceControlTypes): JQueryPromise<Array<Documents.IProjectRepository>> {
        var deferred: JQueryDeferred<Array<Documents.IProjectRepository>> = jQuery.Deferred();
        var repos: Array<Documents.IProjectRepository> = new Array<Documents.IProjectRepository>();
        var tfsContext = TfsHelper.getTfsContext();


        this.getHttpClient().beginGetProjectRepositories(tfsContext.navigation.project).then(
            (repositories: VCContracts.GitRepository[]) => {

                var isDefaultRepositoryType = defaultRepositoryType === TFS_Core_Contracts.SourceControlTypes.Git;
                var defaultRepo = new GitProjectRepository(tfsContext.navigation.project, null, null, tfsContext.navigation.project);
                if(repositories) {

                    for (var i = 0; i < repositories.length; ++i) {

                        var repo = repositories[i];
                        if (isDefaultRepositoryType && repo.name.toLocaleLowerCase() === tfsContext.navigation.project.toLocaleLowerCase()) {

                            this._hasDefaultRepo = true;
                            defaultRepo.defaultBranch = repo.defaultBranch;
                            defaultRepo.id = repo.id;
                            continue;
                        }

                        repos.push(new GitProjectRepository(repo.name, repo.id, repo.defaultBranch, tfsContext.navigation.project));
                    }

                    repos.sort((a, b) => {
                        return b.getRepositoryName().localeCompare(a.getRepositoryName());
                    });
                }

                if (isDefaultRepositoryType) {
                    repos.push(defaultRepo);
                }
                repos.reverse();
                deferred.resolve(repos);
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise();
    }

    public beginGetProjectDocumentation(): JQueryPromise<Documents.ProjectDocumentation> {
        var deferred: JQueryDeferred<Documents.ProjectDocumentation> = jQuery.Deferred();
        var projectDocumentation: Documents.ProjectDocumentation = new Documents.ProjectDocumentation(tfsContext.navigation.project, new GitDocumentFile(Documents.DocumentConstants.DEFAULT_FILE_PATH, tfsContext.navigation.project, Documents.Exists.Unknown, tfsContext.navigation.project, null));

        this.getHttpClient().beginGetProjectRepositories(tfsContext.navigation.project).then(
            (repositories: VCContracts.GitRepository[]) => {
            var promises = new Array<JQueryPromise<Documents.SectionDocumentation>>();
            for (var i in repositories) {
                var currentRepo = repositories[i];
                if (currentRepo.name.toLocaleLowerCase() === tfsContext.navigation.project.toLocaleLowerCase()) {
                    // Found the default repository, populate the repository Id.
                    this._hasDefaultRepo = true;
                    var gitDocument = <GitDocumentFile> (projectDocumentation.projectDocument);
                    gitDocument.repositoryId = currentRepo.id;
                    gitDocument.repositoryName = currentRepo.name;
                    gitDocument.defaultBranch = currentRepo.defaultBranch;
                    continue;
                }

                var currentRepositoryDocument = new GitDocumentFile(Documents.DocumentConstants.DEFAULT_FILE_PATH, currentRepo.name, Documents.Exists.Unknown, currentRepo.name, currentRepo.id);
                currentRepositoryDocument.defaultBranch = currentRepo.defaultBranch;
                projectDocumentation.sectionDocumentation.push(new Documents.SectionDocumentation(currentRepo.name, currentRepositoryDocument));
            }

            if (!this._hasDefaultRepo) {
                projectDocumentation.projectDocument.exists = Documents.Exists.No;
            }

            projectDocumentation.sectionDocumentation.sort((a, b) => { return a.name.localeCompare(b.name) });
            deferred.resolve(projectDocumentation);
            },
            (error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public getExplorerUrl(document: Documents.DocumentFile): string {
        return (<GitDocumentFile> document).getExplorerUrl();
    }

    public getFileContentUrl(document: Documents.DocumentFile): string {
        return (<GitDocumentFile> document).getFileContentUrl();
    }

    public hasDefaultRepository(): boolean {
        return this._hasDefaultRepo;
    }

    private getHttpClient() {
        if (!this._httpClient) {
            var tfsConnection = TFS_OM_Common.ProjectCollection.getDefaultConnection();
            this._httpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
        }

        return this._httpClient;
    }
}

export class TfvcDocumentFile extends VersionControlDocumentFile {

    constructor(path: string, name: string, parentName: string, exists: Documents.Exists) {
        super(path, name, parentName, exists, RepositoryType.Tfvc);
    }

    public getExplorerUrl(): string {
        return tfsContext.getActionUrl(null, "versionControl");
    }

    public getFileContentUrl(): string {
        return tfsContext.getActionUrl(null, "versionControl") + Navigation_Services.getHistoryService().getFragmentActionLink("contents", { path: this.path });
    }

    public clone(): TfvcDocumentFile {
        var doc = new TfvcDocumentFile(this.path, this.name, this.parentName, this.exists);
        return doc;
    }

    public getRepositoryType(): RepositoryType {
        return RepositoryType.Tfvc;
    }
}

export class TfvcDocumentProvider implements Documents.IWelcomeDocumentProvider {
    private _repositoryContext: TfvcRepositoryContext;
    private _httpClient: VCWebApi.TfvcHttpClient;

    public beginGetProjectRepositories(defaultRepositoryType: TFS_Core_Contracts.SourceControlTypes): JQueryPromise<Array<Documents.IProjectRepository>> {
        var deferred: JQueryDeferred<Array<Documents.IProjectRepository>> = jQuery.Deferred();

        var tfsContext = TfsHelper.getTfsContext();

        var repos: Array<Documents.IProjectRepository> = new Array<Documents.IProjectRepository>();

        this.getHttpClient().beginGetProjectInfo(tfsContext.navigation.project).then(
            (projectInfo) => {
                if (projectInfo.supportsTFVC) {
                    repos.push(new TfvcProjectRepository(tfsContext.navigation.project));
                }
                deferred.resolve(repos);
            });

        return deferred.promise();
    }

    public beginGetProjectDocumentation(): JQueryPromise<Documents.ProjectDocumentation> {
        var deferred: JQueryDeferred<Documents.ProjectDocumentation> = jQuery.Deferred();
        var defaultDocumentFile: TfvcDocumentFile = new TfvcDocumentFile(
            "$/" + tfsContext.navigation.project + Documents.DocumentConstants.DEFAULT_FILE_PATH,
            tfsContext.navigation.project,
            tfsContext.navigation.project,
            Documents.Exists.Unknown);
        var projectDocumentation: Documents.ProjectDocumentation = new Documents.ProjectDocumentation(tfsContext.navigation.project, defaultDocumentFile);
        this.getHttpClient().beginGetItem(null, VCCommon.TfvcConstants.RootFolder + tfsContext.navigation.project, null, VCContracts.VersionControlRecursionType.OneLevel, null, false).then(
            (documents) => {
            for (var i in documents) {
                var currentDocument = documents[i];

                if (currentDocument.isFolder || currentDocument.isBranch || currentDocument.isSymLink) {
                    continue;
                }

                var path: string = documents[i].path
                var filename: string = VersionControlPath.getFileName(path);

                // Check to see if the file is a markdown file.
                if (VersionControlPath.getFileExtension(path).toLowerCase() === Documents.DocumentConstants.MARKDOWN_FILE_EXT) {
                    var shortFilename = filename.substring(0, filename.lastIndexOf("."));
                    var document = new TfvcDocumentFile(path, shortFilename, tfsContext.navigation.project, Documents.Exists.Yes);
                    if (shortFilename.toLowerCase() === Documents.DocumentConstants.DEFAULT_FILE_NAME) {
                        document.name = tfsContext.navigation.project;
                        projectDocumentation.projectDocument = document;
                        break;
                    } 
                }
            }

            deferred.resolve(projectDocumentation);
            }, (error) => {
            var e = error;
        });

        return deferred.promise();
    }

    public getExplorerUrl(document: Documents.DocumentFile): string {
        return (<TfvcDocumentFile> document).getExplorerUrl();
    }

    public getFileContentUrl(document: Documents.DocumentFile): string {
        return (<TfvcDocumentFile> document).getFileContentUrl();
    }

    public hasDefaultRepository(): boolean {
        return false;
    }

    private getHttpClient(): VCWebApi.TfvcHttpClient {
        if (!this._httpClient) {
            var tfsConnection = TFS_OM_Common.ProjectCollection.getDefaultConnection();
            this._httpClient = tfsConnection.getHttpClient<VCWebApi.TfvcHttpClient>(VCWebApi.TfvcHttpClient);
        }

        return this._httpClient;
    }
}

Documents.DocumentPluginManager.RegisterPlugin("git", () => { return new GitDocumentProvider() });
Documents.DocumentPluginManager.RegisterPlugin("tfvc", () => { return new TfvcDocumentProvider() });

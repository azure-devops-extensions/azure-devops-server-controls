import Q = require("q");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Git = require("Build/Scripts/SourceProviders/Git");
import GitHub = require("Build/Scripts/SourceProviders/GitHub");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");
import Svn = require("Build/Scripts/SourceProviders/Svn");
import TfsGit = require("Build/Scripts/SourceProviders/TfsGit");
import Tfvc = require("Build/Scripts/SourceProviders/TfsVersionControl");
import { BaseQueueDialogSourceOptions } from "Build/Scripts/SourceProviders/BaseSourceProvider";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import { TeamProject } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import { VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import Service = require("VSS/Service");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

// source provider implementations

var domElem = Utils_UI.domElem;

export class SourceProviderManager {
    public tfsContext: TFS_Host_TfsContext.TfsContext;

    private _coreClient: CoreHttpClient;
    private _repositoryFactories: RepositoryFactory.RepositoryFactory[];
    private _sourceProviders: { [key: string]: SourceProvider.ISourceProvider; } = {};
    private _getProjectInfoPromise: IPromise<VersionControlProjectInfo>;
    private _initializedPromise: IPromise<any> = null;

    constructor(options?: any) {
        if (!!options) {
            this.tfsContext = options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
            this._coreClient = options.coreClient;
        }
        else {
            this.tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        }

        if (!this._coreClient) {
            const tfsConnection: Service.VssConnection = new Service.VssConnection(this.tfsContext.contextData);
            this._coreClient = tfsConnection.getHttpClient<CoreHttpClient>(CoreHttpClient);
        }

        this._initialize();
    }

    /**
     * Gets a source provider
     * @param repositoryType The repository type
     */
    public getSourceProvider(repositoryType: string): SourceProvider.ISourceProvider {
        if (repositoryType) {
            return this._sourceProviders[repositoryType.toLowerCase()];
        }
    }

    /**
     * Gets the repository model factories
     */
    public getRepositoryFactories(): IPromise<RepositoryFactory.RepositoryFactory[]> {
        return this._initializedPromise.then(() => {
            if (!this._repositoryFactories) {
                this._repositoryFactories = [];

                for (var key in this._sourceProviders) {
                    if (this._sourceProviders.hasOwnProperty(key)) {
                        var sourceProvider: SourceProvider.ISourceProvider = this._sourceProviders[key];
                        this._repositoryFactories.push(sourceProvider.createRepositoryFactory(this.tfsContext));
                    }
                }
            }
            return this._repositoryFactories;
        });
    }

    /**
     * Gets the text to display for a change
     * @param change The change
     */
    public getChangeText(change: BuildContracts.Change): string {
        var sourceProvider = this.getSourceProvider(change.type);
        if (sourceProvider) {
            return sourceProvider.getChangeText(change);
        }
        else {
            return change.id;
        }
    }

    /**
     * Gets the url for a change
     * @param build The build
     * @param change The change
     */
    public getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): string {
        var sourceProvider = this.getSourceProvider(change.type);
        if (sourceProvider) {
            return sourceProvider.getChangeUrl(tfsContext, build, change);
        }
        else {
            return "";
        }
    }

    /**
     * Gets the text to display for a build's source version
     * @param build The build
     */
    public getSourceVersionText(build: BuildContracts.Build): string {
        var sourceVersion = build.sourceVersion || "";
        if (!build.repository) {
            return sourceVersion;
        }
        var sourceProvider = this.getSourceProvider(build.repository.type);
        if (sourceProvider) {
            return sourceProvider.getSourceVersionText(build);
        }
        else {
            return sourceVersion;
        }
    }

    /**
     * Gets the text to display for a build's source branch
     * @param build The build
     */
    public getSourceBranch(build: BuildContracts.Build): string {
        var sourceBranch = build.sourceBranch || "";
        if (!build.repository) {
            return sourceBranch;
        }
        var sourceProvider = this.getSourceProvider(build.repository.type);
        if (sourceProvider) {
            return sourceProvider.getSourceBranch(build);
        }
        else {
            return sourceBranch;
        }
    }

    /**
     * Draws a grid cell for a build's source version
     * @param build The build
     */
    public getSourceVersionGridCell(build: BuildContracts.Build): JQuery {
        if (!build.repository) {
            return $(domElem("span")).text(build.sourceVersion || build.sourceBranch);
        }

        var sourceProvider = this.getSourceProvider(build.repository.type);
        if (sourceProvider) {
            return sourceProvider.getSourceVersionGridCell(build);
        }
        else {
            return $(domElem("span")).text(build.sourceVersion || build.sourceBranch);
        }
    }

    /**
     * Gets repository context
     * @param repositoryType The repository type
     */
    public getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList> {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.getChangeList(tfsContext, repositoryType, changeId, repoId);
        }
        else {
            return Q(null);
        }
    }

    /**
     * Indicates whether the source provider supports linking to a change
     */
    public canLinkChange(repositoryType: string): boolean {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.canLinkChange();
        }
        else {
            return false;
        }
    }

    /**
     * Indicates whether the source provider supports linking to a branch
     */
    public canLinkBranch(repositoryType: string): boolean {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.canLinkBranch();
        }
        else {
            return false;
        }
    }

    /**
     * Determines whether to show the source branch detail in summary
     */
    public canShowSourceBranch(repositoryType: string, sourceBranch: string) {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return !sourceProvider.isEmptyBranch(sourceBranch);
        }
        return true;
    }

    /**
     * Returns the label of sourcebranch
     */
    public getSourceBranchLabel(repositoryType: string, sourceBranch: string): string {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.getSourceBranchLabel(sourceBranch);
        }
        return BuildResources.BuildSummarySourceBranchLabel;
    }

    public getSourceBranchLink(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): string {
        let sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider && sourceProvider.canLinkBranch()) {
            return sourceProvider.getSourceBranchLink(tfsContext, projectId, repositoryId, repositoryType, branchName);
        }
        else {
            return "";
        }
    }

    /**
     * Gets explorer link for the repository
     */
    public getRepositoryLink(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryType: string, repositoryName: string): string {
        tfsContext = tfsContext || this.tfsContext;
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.getRepositoryLink(tfsContext, repositoryId, repositoryName);
        }

        return "";
    }

    /**
     * Handles a click on a branch
     */
    public onBranchClick(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): void {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            sourceProvider.onBranchClick(tfsContext, projectId, repositoryId, repositoryType, branchName);
        }
    }

    /**
     * Handles a click on a source version
     */
    public onSourceVersionClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build) {
        if (build.repository) {
            var sourceProvider = this.getSourceProvider(build.repository.type);
            if (sourceProvider) {
                sourceProvider.onSourceVersionClick(tfsContext, build);
            }
        }
    }

    /**
     * Gets a url for a source version
     */
    public getSourceVersionLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build) {
        if (build.repository) {
            let sourceProvider = this.getSourceProvider(build.repository.type);
            if (sourceProvider) {
                return sourceProvider.getSourceVersionLink(tfsContext, build);
            }
        }
    }

    /**
     * Handles a click on a change
     */
    public onChangeClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change) {
        var sourceProvider = this.getSourceProvider(change.type);
        if (sourceProvider) {
            sourceProvider.onChangeClick(tfsContext, build, change);
        }
    }

    /**
     * Gets a content url for a file
     */
    public getContentUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, repo: string, sourcePath: string, lineNumber: number, columnNumber: number, type: BuildContracts.IssueType, message: string): string {
        if (build.repository) {
            var sourceProvider = this.getSourceProvider(build.repository.type);
            if (sourceProvider) {
                return sourceProvider.getContentUrl(tfsContext, build, repo, sourcePath, lineNumber, columnNumber, type, message);
            }
        }
    }

    /**
     * Gets repo name for the repository ID given
     */
    public getRepoName(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): IPromise<string> {
        if (build.repository) {
            var sourceProvider = this.getSourceProvider(build.repository.type);
            if (sourceProvider) {
                return sourceProvider.getRepoName(tfsContext, build.repository.id);
            }
        }

        return Q("");
    }

    /**
     * Gets source options for the queue build dialog
     */
    public getQueueBuildDialogOptions(tfsContext: TFS_Host_TfsContext.TfsContext, repository: BuildContracts.BuildRepository): IPromise<SourceOptions.IQueueDialogSourceOptions> {
        return this._initializedPromise.then(() => {
            if (repository) {
                var sourceProvider = this.getSourceProvider(repository.type);
                if (sourceProvider) {
                    return sourceProvider.getQueueBuildDialogOptions(tfsContext, repository);
                }
            }
            // no repository or supported source provider, default to the base queue dialog source options. 
            // this is needed so source providers writen for the v2 editor do not need to be backported into the v1 editor.
            return Q(new BaseQueueDialogSourceOptions("queue_definition_dialog"));
        });
    }

    /**
     * Gets an icon class that represents a change
     */
    public getChangeIconClass(change: BuildContracts.Change): string {
        var sourceProvider = this.getSourceProvider(change.type);
        if (sourceProvider) {
            return sourceProvider.getChangeIconClass(change);
        }
    }

    /**
     * Gets an icon class that represents a change
     */
    public getRepoIconClass(repositoryType: string): string {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.getRepoIconClass();
        }
    }

    /**
     * Gets an icon class that represents a branch
     */
    public getBranchIconClass(repositoryType: string, sourceBranch: string): string {
        var sourceProvider = this.getSourceProvider(repositoryType);
        if (sourceProvider) {
            return sourceProvider.getBranchIconClass(sourceBranch);
        }
    }

    /**
     * Gets information about the current team project
     */
    public getProjectInfo(): IPromise<VersionControlProjectInfo> {
        if (!this._getProjectInfoPromise) {
            this._getProjectInfoPromise = this._coreClient.getProject(this.tfsContext.navigation.projectId, true).then((projectInfo: TeamProject) => {
                const versionControlProjectInfo: VersionControlProjectInfo = <any>{
                    project: projectInfo
                };

                if (projectInfo.capabilities && projectInfo.capabilities.versioncontrol) {
                    versionControlProjectInfo.defaultSourceControlType = Utils_String.equals(projectInfo.capabilities.versioncontrol.sourceControlType, "Git", true) ? 2 : 1;
                    versionControlProjectInfo.supportsGit = Utils_String.equals(projectInfo.capabilities.versioncontrol.gitEnabled, "true", true);
                    versionControlProjectInfo.supportsTFVC = Utils_String.equals(projectInfo.capabilities.versioncontrol.tfvcEnabled, "true", true);
                }

                return versionControlProjectInfo;
            });
        }

        return this._getProjectInfoPromise;
    }

    public waitForInitialized(): IPromise<any> {
        return this._initializedPromise;
    }

    private _initialize(): IPromise<any> {
        var sourceProviders: SourceProvider.ISourceProvider[] = [
            new TfsGit.TfsGitSourceControlProvider(),
            new Tfvc.TfsVersionControlSourceProvider(),
            new GitHub.GitHubSourceProvider(),
            new Git.GitSourceProvider(),
            new Svn.SvnSourceProvider()
        ];

        this._initializedPromise = this.getProjectInfo()
            .then((projectInfo: VersionControlProjectInfo) => {
                sourceProviders.forEach((sourceProvider: SourceProvider.ISourceProvider) => {
                    sourceProvider.initialize(projectInfo);

                    if (sourceProvider.isEnabled()) {
                        this._sourceProviders[sourceProvider.key().toLowerCase()] = sourceProvider;
                    }
                });
            });

        return this._initializedPromise;
    }
}
var _defaultSourceProviderManager: SourceProviderManager = null;

export function getDefaultSourceProviderManager(): SourceProviderManager {
    if (!_defaultSourceProviderManager) {
        _defaultSourceProviderManager = new SourceProviderManager();
    }

    return _defaultSourceProviderManager;
}

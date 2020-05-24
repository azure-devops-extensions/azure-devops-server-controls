/// <reference types="jquery" />
/// <reference path='../Interfaces.d.ts' />
import Q = require("q");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { FilterTypes } from "Build/Scripts/Constants";
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");
import SourceProvider = require("Build/Scripts/SourceProviders/SourceProvider");
import TfsGitBranchFilterEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/TfsGit.BranchFilterEditor");
import { defaultSourceLabelFormat } from "Build/Scripts/SourceProviders/TfsGit.Common";
import TfsGitRepositoryEditor_NO_REQUIRE = require("Build/Scripts/SourceProviders/TfsGit.TfsGitRepositoryEditor");

import { BuildCustomerIntelligenceInfo, RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import { GitRefArtifact } from "VersionControl/Scripts/GitRefArtifact";
import { PullRequestArtifact } from "VersionControl/Scripts/PullRequestArtifact";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

import { Artifact } from "VSS/Artifacts/Services";
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

export class TfsGitSourceControlProvider extends BaseSourceProvider.BaseSourceProvider implements SourceProvider.ISourceProvider {
    private _projectInfo: VCContracts.VersionControlProjectInfo;
    private _gitRepositoriesPromise: IPromise<VCContracts.GitRepository[]>;
    private _gitRepositoryPromises: IDictionaryStringTo<IPromise<VCContracts.GitRepository>> = {};

    public initialize(options: any) {
        this._projectInfo = options;
    }

    public key(): string {
        return RepositoryTypes.TfsGit;
    }

    public isEnabled(): boolean {
        return this._projectInfo.supportsGit;
    }

    public getSourceVersionText(build: BuildContracts.Build) {
        var versionSpec = this._getVersionSpec(build);
        if (versionSpec) {
            return versionSpec.toDisplayText();
        }
        else {
            return "";
        }
    }

    public getRepoIconClass(): string {
        return "bowtie-git";
    }

    public getBranchIconClass(sourceBranch: string): string {
        if (sourceBranch) {
            var prSpec: number = parseInt(GitRefUtility.getPRIdFromSourceBranch(sourceBranch));
            if (prSpec) {
                return "bowtie-icon bowtie-tfvc-pull-request"
            }
            return "bowtie-icon bowtie-tfvc-branch";
        }
        return "bowtie-icon bowtie-tfvc-branch";
    }

    public getSourceVersionGridCell(build: BuildContracts.Build): JQuery {
        var link = $(domElem("a")).text(this.getSourceVersionText(build));
        if (build.project && build.sourceVersion) {
            link.click(() => {
                var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                var versionSpec = this._getVersionSpec(build);
                if (versionSpec) {
                    this._executeGitArtifact(tfsContext, versionSpec, build.project.id, build.repository);
                }
            });
        }
        return link;
    }

    public getChangeText(change: BuildContracts.Change) {
        if (change && change.id) {
            return Utils_String.format(BuildResources.BuildDetailViewCommitId, change.id.slice(0, 7));
        }
        else {
            return "";
        }
    }

    public canLinkChange(): boolean {
        return true;
    }

    public canLinkBranch(): boolean {
        return true;
    }

    public getSourceBranchLabel(sourceBranch: string): string {
        return BuildResources.BuildSummarySourceBranchLabel;
    }

    public onBranchClick(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): void {
        let artifact = this._getBranchArtifact(projectId, repositoryId, repositoryType, branchName);
        if (artifact) {
            artifact.execute(tfsContext.contextData);
        }
    }

    public getSourceBranchLink(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): string {
        let artifact = this._getBranchArtifact(projectId, repositoryId, repositoryType, branchName);
        if (artifact) {
            return artifact.getUrl(tfsContext.contextData);
        }
        else {
            return "";
        }
    }

    public onSourceVersionClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): void {
        let versionSpec = this._getVersionSpec(build);
        let projectId = build.project.id;
        if (versionSpec) {
            if (!projectId) {
                projectId = tfsContext.navigation.projectId;
            }
            this._executeGitArtifact(tfsContext, versionSpec, projectId, build.repository);
        }
    }

    public getSourceVersionLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): string {
        let versionSpec = this._getVersionSpec(build);
        return this._getCommitLink(tfsContext, build, versionSpec);
    }

    public getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): string {
        let versionSpec = this._parseVersionSpec(change.id);
        return this._getCommitLink(tfsContext, build, versionSpec);
    }

    public onChangeClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change) {
        if (build && build.project && build.repository) {
            this._executeCommit(tfsContext, change.id, build.project.id, build.repository.id);
        }
    }

    public getSourceBranch(build: BuildContracts.Build): string {
        var sourceBranch = build.sourceBranch;
        if (sourceBranch) {
            var prSpec: number = parseInt(GitRefUtility.getPRIdFromSourceBranch(sourceBranch));
            if (prSpec) {
                return Utils_String.format(BuildResources.BuildPullRequestSource, prSpec);
            }
            return sourceBranch.replace("refs/heads/", "");
        }
        var sourceVersion = build.sourceVersion;
        if (sourceVersion) {
            // XAML builds have "T" or "LG:{branch}:{commit}"
            if (Utils_String.startsWith(sourceVersion, "LG:", Utils_String.ignoreCaseComparer)) {
                var parts = sourceVersion.split(":", 3);
                if (parts.length > 1) {
                    return parts[1];
                }
            }
        }

        return "";
    }

    public getContentUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, repo: string, sourcePath: string, lineNumber: number, columnNumber: number, type: BuildContracts.IssueType, message: string): string {
        if (repo && build && build.repository && build.project) {
            let repositoryContext = this.getRepositoryContext(tfsContext, build.repository.id, repo, build.project.id);
            let versionSpec = this._getVersionSpec(build);

            // for xaml build sourceversion is something like - "LG:refs/heads/master:6297976ddc06b395c2a1878c24186014aef94731"
            // so the following works for both xaml/non-xaml
            /*let sourceVersion = build.sourceVersion || "";
            let sourceVersionParts = sourceVersion.split(":");
            sourceVersion = sourceVersionParts[sourceVersionParts.length - 1];*/

            let lineStyle: string = "plain";
            if (type === BuildContracts.IssueType.Error) {
                lineStyle = "error";
            }

            let state = {
                line: lineNumber,
                lineStyle: lineStyle,
                lineTooltip: message,
                version: versionSpec.toVersionString()
            };

            return VersionControlUrls.getExplorerUrl(<GitRepositoryContext>repositoryContext, sourcePath, "contents", state);
        }
    }

    public getFilterEditor(filterType: string): IPromise<any> {
        var deferred = Q.defer();

        if (filterType === FilterTypes.Branch) {
            VSS.using(["Build/Scripts/SourceProviders/TfsGit.BranchFilterEditor"], (TfsGitBranchFilterEditor: typeof TfsGitBranchFilterEditor_NO_REQUIRE) => {
                deferred.resolve(TfsGitBranchFilterEditor.TfGitBranchFilterEditorControl);
            });
        }
        else {
            super.getFilterEditor(filterType).then((result) => deferred.resolve(result));
        }

        return deferred.promise;
    }

    public getQueueBuildDialogOptions(tfsContext: TFS_Host_TfsContext.TfsContext, repository: BuildContracts.BuildRepository): IPromise<SourceOptions.IQueueDialogSourceOptions> {
        return this._getRepository(tfsContext, repository.id)
            .then((repository: VCContracts.GitRepository) => {
                var repositoryContext = new GitRepositoryContext(tfsContext, repository);
                return new TfGitQueueDialogSourceOptions(repository.defaultBranch, repositoryContext);
            });
    }

    public getRepoName(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string): IPromise<string> {
        return this.getRepositories(tfsContext)
            .then((repositories: VCContracts.GitRepository[]) => {
                var repositoryName: string = "";
                var vcRepository = repositories.filter((repo: VCContracts.GitRepository) => {
                    return repo.id === repositoryId;
                })[0];

                if (vcRepository) {
                    repositoryName = vcRepository.name || "";
                }
                return repositoryName;
            });
    }

    public getRepositoryLink(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): string {
        let repositoryContext = this.getRepositoryContext(tfsContext, repositoryId, repositoryName, null);
        return VersionControlUrls.getExplorerUrl(<GitRepositoryContext>repositoryContext);
    }

    public createRepositoryFactory(tfsContext: TFS_Host_TfsContext.TfsContext, repoContext?: GitRepositoryContext): RepositoryFactory.RepositoryFactory {
        return {
            isPrimary: true,
            displayText: BuildResources.BuildRepositoryTFGit,
            type: this.key().toLowerCase(),
            icon: "icon-git-logo",
            createNewRepository: (repoContext?: GitRepositoryContext) => {
                var newRepository: BuildContracts.BuildRepository = <BuildContracts.BuildRepository>{
                    type: this.key(),
                    properties: {}
                };
                let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "TfsGitGetRepositories");
                return this.getRepositories(tfsContext).then((gitRepositories: VCContracts.GitRepository[]) => {
                    var defaultGitRepo: VCContracts.GitRepository = null;
                    if (repoContext) {
                        defaultGitRepo = repoContext.getRepository();
                    }
                    else {
                        // get the repo that matches the project name
                        defaultGitRepo = $.grep(gitRepositories, (gitRepo: VCContracts.GitRepository) => {
                            return Utils_String.localeIgnoreCaseComparer(gitRepo.name, tfsContext.navigation.project) === 0;
                        })[0];
                    }

                    if (!defaultGitRepo) {
                        defaultGitRepo = gitRepositories[0];
                    }

                    if (defaultGitRepo) {
                        newRepository.id = defaultGitRepo.id;
                        newRepository.url = defaultGitRepo.remoteUrl;
                        newRepository.defaultBranch = defaultGitRepo.defaultBranch;
                        newRepository.name = defaultGitRepo.name;

                        // If we have a repository but no branches yet, set it to master
                        if (!newRepository.defaultBranch) {
                            newRepository.defaultBranch = "refs/heads/master";
                        }

                        newRepository.properties[RepositoryProperties.LabelSources] = BuildContracts.BuildResult.None.toString();
                        newRepository.properties[RepositoryProperties.LabelSourcesFormat] = defaultSourceLabelFormat;
                        newRepository.properties[RepositoryProperties.ReportBuildStatus] = 'true';
                    }

                    performance.end();
                    return newRepository;
                }, (error) => {
                    VSS.handleError(error);
                    performance.end();
                });
            },
            createRepositoryViewModel: (definitionId: number, repository: BuildContracts.BuildRepository) => {
                return this.getRepositories(tfsContext).then((gitRepositories: VCContracts.GitRepository[]) => {
                    let deferred = Q.defer();

                    VSS.using(["Build/Scripts/SourceProviders/TfsGit.TfsGitRepositoryEditor"], (TfsGitRepositoryEditor: typeof TfsGitRepositoryEditor_NO_REQUIRE) => {
                        deferred.resolve(new TfsGitRepositoryEditor.TfGitRepositoryEditorViewModel(repository, gitRepositories));
                    });

                    return deferred.promise;
                });
            },
            // Project repository block includes this, so no block for this
            repositoryBlock: null
        } as any;
    }

    public supportsTrigger(trigger: BuildContracts.DefinitionTriggerType): boolean {
        switch (trigger) {
            case BuildContracts.DefinitionTriggerType.ContinuousIntegration:
                return true;
            case BuildContracts.DefinitionTriggerType.Schedule:
                return true;
        }
    }

    public getTriggerLabel(trigger: BuildContracts.DefinitionTriggerType): string {
        switch (trigger) {
            case BuildContracts.DefinitionTriggerType.ContinuousIntegration:
                return BuildResources.CITriggerWithBranchLabel;
            default:
                return "";
        }
    }

    public supportsPolling(): boolean {
        return false;
    }

    public getDefaultPollingInterval(): number {
        return 0;
    }

    public supportsBatchChanges(): boolean {
        return true;
    }

    public supportsBranchFilters(): boolean {
        return true;
    }

    public supportsPathFilters(): boolean {
        return true;
    }

    public getScheduleTriggerHelpMarkDown(): string {
        return BuildResources.ScheduleTriggerHelpTextTfsGit;
    }

    public getCITriggerBranchHelpMarkDown(): string {
        return BuildResources.CITriggerHelpTextTfsGit;
    }

    public getCITriggerPathHelpMarkDown(): string {
        return BuildResources.GitPathFilterHelpText;
    }

    public getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList> {
        var deferred = Q.defer<VCLegacyContracts.ChangeList>();

        this.getRepositories(tfsContext).then((gitRepositories: VCContracts.GitRepository[]) => {
            var repo: VCContracts.GitRepository = $.grep(gitRepositories, (gitRepo: VCContracts.GitRepository) => {
                return Utils_String.localeIgnoreCaseComparer(gitRepo.id, repoId) === 0;
            })[0];

            var repoContext = new GitRepositoryContext(tfsContext, repo);
            repoContext.getClient().beginGetChangeList(repoContext, changeId, 0,
                (fullChangeList: VCLegacyContracts.ChangeList) => {
                    deferred.resolve(fullChangeList);
                }, (err: any) => {
                    deferred.reject(err);
                });
        });

        return deferred.promise;
    }

    public getRepositories(tfsContext: TFS_Host_TfsContext.TfsContext): IPromise<VCContracts.GitRepository[]> {
        if (!this._gitRepositoriesPromise) {
            var tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
            var gitHttpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
            this._gitRepositoriesPromise = gitHttpClient.beginGetProjectRepositories(tfsContext.navigation.project);
        }

        return this._gitRepositoriesPromise;
    }

    public getRepositoryContext(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string, projectId?: string): GitRepositoryContext {
        if (!projectId) {
            projectId = tfsContext.navigation.projectId;
        }
        var gitRepository = <VCContracts.GitRepository>{
            id: repositoryId,
            name: repositoryName,
            project: {
                id: projectId
            }
        };
        return new GitRepositoryContext(tfsContext, gitRepository);
    }

    private _getRepository(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string): IPromise<VCContracts.GitRepository> {
        if (!this._gitRepositoryPromises[repositoryId]) {
            let tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
            let gitHttpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
            this._gitRepositoryPromises[repositoryId] = gitHttpClient.beginGetRepository(tfsContext.navigation.projectId, repositoryId);
        }

        return this._gitRepositoryPromises[repositoryId];
    }

    private _getVersionSpec(build: BuildContracts.Build): VCSpecs.VersionSpec {
        var sourceVersion = build.sourceVersion;
        if (sourceVersion) {
            return this._parseVersionSpec(sourceVersion);
        }

        sourceVersion = build.sourceBranch;
        if (!sourceVersion && build.repository && build.repository.defaultBranch) {
            sourceVersion = build.repository.defaultBranch;
        }
        if (sourceVersion) {
            return new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(sourceVersion));
        }
    }

    private _parseVersionSpec(sourceVersion: string): VCSpecs.VersionSpec {
        // XAML builds have "T" or "LG:{branch}:{commit}"
        if (Utils_String.startsWith(sourceVersion, "LG:", Utils_String.ignoreCaseComparer)) {
            var parts = sourceVersion.split(":", 3);
            if (parts.length === 3) {
                return new VCSpecs.GitCommitVersionSpec(parts[2]);
            }
            else {
                return new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(parts[1]));
            }
        }
        else if (Utils_String.ignoreCaseComparer(sourceVersion, "T") === 0) {
            return null; // no version spec
        }
        else if (!Utils_String.startsWith(sourceVersion, "GC", Utils_String.ignoreCaseComparer)) {
            return new VCSpecs.GitCommitVersionSpec(sourceVersion);
        }
        else {
            return VCSpecs.VersionSpec.parse(sourceVersion);
        }
    }

    private _getCommitLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, versionSpec: VCSpecs.VersionSpec): string {
        if (versionSpec) {
            let projectId = build.project.id;
            if (!projectId) {
                projectId = tfsContext.navigation.projectId;
            }

            if (versionSpec instanceof VCSpecs.GitCommitVersionSpec) {
                if (build.repository.id && Utils_String.ignoreCaseComparer((<VCSpecs.GitCommitVersionSpec>versionSpec).commitId, "T") != 0) {
                    let commitArtifact = this._getCommitArtifact(versionSpec.commitId, projectId, build.repository.id);
                    return commitArtifact.getUrl(tfsContext.contextData);
                }
            }
            else if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
                let repositoryContext = this.getRepositoryContext(tfsContext, build.repository.id, build.repository.name, projectId);
                return VersionControlUrls.getExplorerUrl(repositoryContext, null, null, { version: versionSpec.toVersionString() });
            }
        }

        return "";
    }

    private _executeGitArtifact(tfsContext: TFS_Host_TfsContext.TfsContext, versionSpec: VCSpecs.VersionSpec, projectId: string, repository: BuildContracts.BuildRepository): void {
        if (versionSpec) {
            if (versionSpec instanceof VCSpecs.GitCommitVersionSpec) {
                if (repository.id && Utils_String.ignoreCaseComparer((<VCSpecs.GitCommitVersionSpec>versionSpec).commitId, "T") != 0) {
                    this._executeCommit(tfsContext, versionSpec.commitId, projectId, repository.id);
                }
            }
            else if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
                let repositoryContext = this.getRepositoryContext(tfsContext, repository.id, repository.name, projectId);
                let url = VersionControlUrls.getExplorerUrl(repositoryContext, null, null, { version: versionSpec.toVersionString() });
                window.open(url, "_blank");
            }
        }
    }

    private _executeCommit(tfsContext: TFS_Host_TfsContext.TfsContext, commitId: string, projectGuid: string, repositoryId: string): void {
        let artifact = this._getCommitArtifact(commitId, projectGuid, repositoryId);
        artifact.execute(tfsContext.contextData);
    }

    private _getCommitArtifact(commitId: string, projectGuid: string, repositoryId: string): CommitArtifact {
        return new CommitArtifact({
            commitId: commitId,
            projectGuid: projectGuid,
            repositoryId: repositoryId
        });
    }

    private _getBranchArtifact(projectId: string, repositoryId: string, repositoryType: string, branchName: string): Artifact {
        let prSpec: number = parseInt(GitRefUtility.getPRIdFromSourceBranch(branchName));
        if (prSpec) {
            //refs/pull/<prID>/merge
            return new PullRequestArtifact({
                projectGuid: projectId,
                repositoryId: repositoryId,
                pullRequestId: prSpec
            });
        }
        else {
            // refs/heads/master => GBmaster
            // refs/tags/mytag => GTmytag
            let branchSpec = GitRefUtility.refNameToVersionSpec(branchName);
            if (branchSpec) {
                return new GitRefArtifact({
                    projectGuid: projectId,
                    repositoryId: repositoryId,
                    refName: branchSpec.toVersionString()
                });
            }
        }

        // fallback
        return null;
    }
}

export class TfGitQueueDialogSourceOptions extends BaseSourceProvider.BaseQueueDialogSourceOptions implements SourceOptions.IQueueDialogSourceOptions {
    public repositoryContext: GitRepositoryContext;

    constructor(defaultBranch: string, repositoryContext: GitRepositoryContext) {
        super("tfgit_queue_definition_dialog");

        // repositoryContext is used by the git version selector: see the "tfgitVersionSelectorControl" binding in VSS.Build.KnockoutExtensions
        this.repositoryContext = repositoryContext;
    }
}

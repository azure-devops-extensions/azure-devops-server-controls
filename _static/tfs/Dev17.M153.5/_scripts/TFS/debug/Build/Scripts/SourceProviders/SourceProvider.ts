/// <reference types="jquery" />
/// <reference path='../Interfaces.d.ts' />

import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceOptions = require("Build/Scripts/IQueueDialogSourceOptions");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import VSS = require("VSS/VSS");

export interface IRepository {
    id: string;
    name: string;
}

export interface ISourceProvider {
    initialize(options: any);
    key(): string;
    isEnabled(): boolean;

    canLinkBranch(): boolean;
    canLinkChange(): boolean;
    createRepositoryFactory(tfsContext: TFS_Host_TfsContext.TfsContext, repoContext?: RepositoryContext): RepositoryFactory.RepositoryFactory;
    getBranchIconClass(sourceBranch: string): string;
    getChangeIconClass(change: BuildContracts.Change): string;
    getChangeList(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: string, changeId: string, repoId?: string): IPromise<VCLegacyContracts.ChangeList>;
    getChangeText(change: BuildContracts.Change): string;
    getChangeUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): string;
    getCITriggerBranchHelpMarkDown(): string;
    getCITriggerPathHelpMarkDown(): string;
    getContentUrl(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, repo: string, sourcePath: string, lineNumber: number, columnNumber: number, type: BuildContracts.IssueType, message: string): string;
    getDefaultPollingInterval(): number;
    getFilterEditor(filterType: string): IPromise<any>;
    getQueueBuildDialogOptions(tfsContext: TFS_Host_TfsContext.TfsContext, repository: BuildContracts.BuildRepository): IPromise<SourceOptions.IQueueDialogSourceOptions>;
    getRepoIconClass(): string;
    getRepoName(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string): IPromise<string>;
    getRepositories(tfsContext: TFS_Host_TfsContext.TfsContext): IPromise<IRepository[]>;
    getRepositoryContext(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): RepositoryContext;
    getRepositoryLink(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryId: string, repositoryName: string): string;
    getScheduleTriggerHelpMarkDown(): string;
    getSourceBranch(build: BuildContracts.Build): string;
    getSourceBranchLabel(sourceBranch: string): string;
    getSourceBranchLink(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): string;
    getSourceVersionGridCell(build: BuildContracts.Build): JQuery;
    getSourceVersionText(build: BuildContracts.Build): string;
    getSourceVersionLink(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): string;
    isEmptyBranch(value: string): boolean;
    onBranchClick(tfsContext: TFS_Host_TfsContext.TfsContext, projectId: string, repositoryId: string, repositoryType: string, branchName: string): void;
    onChangeClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build, change: BuildContracts.Change): void;
    onSourceVersionClick(tfsContext: TFS_Host_TfsContext.TfsContext, build: BuildContracts.Build): void;
    supportsBatchChanges(): boolean;
    supportsBranchFilters(): boolean;
    supportsPathFilters(): boolean;
    supportsPolling(): boolean;
    supportsTrigger(trigger: BuildContracts.DefinitionTriggerType): boolean;
    getTriggerLabel(trigger: BuildContracts.DefinitionTriggerType): string;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("SourceProvider", exports);

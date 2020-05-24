import * as Q from "q";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { VssConnection } from "VSS/Service";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ContentRendererFactory, IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { usingWithPromise } from "Presentation/Scripts/TFS/TFS.Using";
import {
    GitRepository,
    GitRepositoryStats,
    GitLastChangeTreeItems,
    GitQueryCommitsCriteria,
    GitCommitRef,
    PullRequestStatus,
    GitPullRequest,
    GitPullRequestSearchCriteria,
} from "TFS/VersionControl/Contracts";
import { GitHttpClient3 } from "TFS/VersionControl/GitRestClient";
import { Suggestion, ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import { getGitRefService } from "VersionControl/Scripts/Services/GitRefService";
import * as _VCFileDefaultContentProvider from "VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlRegistryPath from "VersionControl/Scripts/VersionControlRegistryPath";
import { getTfvcWebEditEnabled, getTfvcWebEditEnabledByProjectName } from "VersionControl/Scripts/VersionControlSettings";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { TfvcClientService } from "VersionControl/Scripts/TfvcClientService";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import {
    ItemModel,
    VersionControlRecursionType,
    ChangeList,
    TfsChangeList,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getBranchFullName } from "VersionControl/Scripts/VersionSpecUtils";

export interface ItemDescriptor {
    path: string;
    version: string;
}

/**
 * A source of data from the current repository.
 */
export class RepositorySource {
    private readonly repositoryContext: RepositoryContext;
    private readonly clientService: IVersionControlClientService;
    private readonly httpClient: GitHttpClient3;

    constructor(
        tfsContext: TfsContext,
        gitRepository: GitRepository,
        public readonly userLastVisitedBranch?: string,
        public readonly deletedUserDefaultBranchName?: string,
    ) {
        this.repositoryContext = gitRepository
            ? GitRepositoryContext.create(gitRepository, tfsContext)
            : TfvcRepositoryContext.create(tfsContext);

        this.clientService = this.repositoryContext.getClient();

        const connection = new VssConnection(this.repositoryContext.getTfsContext().contextData);
        this.httpClient = connection.getHttpClient(GitHttpClient3);
    }

    public getRepositoryContext(): RepositoryContext {
        return this.repositoryContext;
    }

    public getDefaultGitBranchName(): string {
        return this.isGit() && getRefFriendlyName((this.repositoryContext as GitRepositoryContext).getRepository().defaultBranch);
    }

    public isGit(): boolean {
        return this.repositoryContext.getRepositoryType() === RepositoryType.Git;
    }

    public isCollectionLevel(): boolean {
        return !this.repositoryContext.getTfsContext().contextData.project;
    }

    public getCurrentUserName(): string {
        return this.repositoryContext.getTfsContext().currentUser;
    }

    public getRepositoryName(): string {
        return this.isGit()
            ? this.repositoryContext.getRepository().name
            : this.isCollectionLevel()
            ? "$"
            : this.repositoryContext.getRootPath();
    }

    /**
     * Returns the Tfvc project name from the rooted path ( $/(TfvcProject1)/x/y...) or "" if not in rooted project context.
     * This is not necessarily the same as the current Tfvc repository context.
     */
    public getTfvcProjectName(path: string): string {
        let projectName = "";
        if (path && path.length > 2 && path.indexOf("$/") === 0) {
            projectName = path.substring(2);
            const separatorIndex = projectName.indexOf("/");
            if (separatorIndex > -1) {
                projectName = projectName.substring(0, separatorIndex);
            }
        }
        return projectName;
    }

    /**
     * Returns true if editing features are enabled for the account (typically to show/hide all edit features).
     */
    public allowEditingFeatures(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlEditing);
    }

    /**
     * Returns true if editing is enabled for this particular repository via Admin settings
     * (typically with edit features visible, but with an alert that they have been disabled).
     * The path is required for Tfvc to determine the team project to check if editing
     * from the context of the collection "$/" or from a different team project.
     */
    public isEditingEnabled(path: string): IPromise<boolean> {
        let projectInPath = this.isGit() ? "" : this.getTfvcProjectName(path);
        if (projectInPath) {
            const navigation = this.repositoryContext.getTfsContext().navigation;
            if (ignoreCaseComparer(navigation.project, projectInPath) === 0) {
                return getTfvcWebEditEnabled(navigation.projectId);
            }
            else {
                return getTfvcWebEditEnabledByProjectName(projectInPath);
            }
        }
        return Q.resolve(true);
    }

    public getHistoryUrl(): string {
        return VersionControlUrls.getExplorerUrl(this.repositoryContext);
    }

    public getBranchesUrl(): string {
        return VersionControlUrls.getBranchesUrl(this.repositoryContext as GitRepositoryContext);
    }

    public getPullRequestsUrl(): string {
        return VersionControlUrls.getPullRequestsUrl(this.repositoryContext as GitRepositoryContext);
    }

    public getItems(itemDescriptors: ItemDescriptor[], includeContentMetadata: boolean): IPromise<ItemModel[]> {
        const options = {
            recursionLevel: VersionControlRecursionType.OneLevelPlusNestedEmptyFolders,
            includeContentMetadata,
            includeVersionDescription: false,
        };

        return Q.Promise<ItemModel[]>((resolve, reject) =>
            this.clientService.beginGetItems(this.repositoryContext, itemDescriptors, options, resolve, reject));
    }

    public getChangeListsForChildItems(folderFullPath: string, version: string): IPromise<ChangeList[]> {
        const tfvcClientService = this.clientService as TfvcClientService;
        return Q.Promise<ChangeList[]>((resolve, reject) =>
            tfvcClientService.beginGetChangesets(folderFullPath, version, resolve));

    }

    public getGitLastChangeForChildItems(folderFullPath: string, version: string, allowPartial: boolean): IPromise<GitLastChangeTreeItems> {
        const includeCommits = true;
        const gitClientService = this.clientService as GitClientService;
        return Q.Promise<GitLastChangeTreeItems>((resolve, reject) =>
           gitClientService.beginGetLastChangeTreeItems(
               this.repositoryContext,
               version,
               folderFullPath,
               allowPartial,
               includeCommits,
               resolve));
    }

    public calculateGitChangeUrls(commitIds: string[], currentVersion: string): IDictionaryStringTo<string> {
        const refName = getBranchFullName(VersionSpec.parse(currentVersion));
        const routeData = refName ? { refName } : undefined;

        const result: IDictionaryStringTo<string> = {};
        for (const commitId of commitIds) {
            result[commitId] = VersionControlUrls.getCommitUrl(
                this.repositoryContext as GitRepositoryContext,
                commitId,
                false,
                false,
                undefined,
                routeData);
        }

        return result;
    }

    public calculateTfvcChangeUrls(changeLists: TfsChangeList[]): IDictionaryStringTo<string> {
        const result: IDictionaryStringTo<string> = {};
        for (const changeList of changeLists) {
            result[changeList.changesetId.toString()] = VersionControlUrls.getChangesetUrl(changeList.changesetId, this.repositoryContext.getTfsContext());
        }

        return result;
    }

    public getCommitDetails(commitIds: string[]): IPromise<GitCommitRef[]> {
        const searchCriteria = {
            ids: commitIds,
        } as GitQueryCommitsCriteria;

        return this.httpClient.getCommitsBatch(searchCriteria, this.repositoryContext.getRepositoryId());
    }

    public getStats(): IPromise<GitRepositoryStats> {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlExplorerVanityBadges)) {
            return Q.resolve<GitRepositoryStats>(undefined);
        }

        return this.httpClient.getStats(this.repositoryContext.getTfsContext().contextData.project.id, this.repositoryContext.getRepositoryId());
    }

    public getPullRequestSuggestion(): IPromise<ISuggestionObject> {
        return Suggestion.beginGetSuggestion(this.repositoryContext as GitRepositoryContext);
    }

    public dismissCreatePullRequestSuggestion(suggestion: Suggestion): void {
        return suggestion.invalidateSuggestion();
    }

    public getPullRequest(versionSpec: VersionSpec): IPromise<GitPullRequest> {
        const { branchName } = versionSpec as GitBranchVersionSpec;
        if (!branchName) {
            return Q(undefined);
        }

        const repository = this.repositoryContext.getRepository() as GitRepository;

        return Q.Promise<GitPullRequest>((resolve, reject) => {
            const searchCriteria: GitPullRequestSearchCriteria = {
                status: PullRequestStatus.Active,
                sourceRepositoryId: repository.id,
                repositoryId: repository.isFork ? repository.parentRepository.id : repository.id,
                sourceRefName: (versionSpec as GitBranchVersionSpec).toFullName(),
            } as GitPullRequestSearchCriteria;

            this.clientService.beginGetPullRequestSearch(
                searchCriteria,
                null,
                null,
                (resultPullRequests: GitPullRequest[]) => {
                    resolve(resultPullRequests[0]);
                },
                reject);
        });
    }

    public getFileContentUrl(path: string, version: string): string {
        return VersionControlUrls.getFileContentUrl(this.repositoryContext, path, version);
    }

    public getZippedFolderUrl(path: string, version: string): string {
        return VersionControlUrls.getZippedContentUrl(this.repositoryContext, path, version);
    }

    public getInitialContent(newFileItem: ItemModel, scenario: string): IPromise<string> {
        return usingWithPromise("VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider")
            .then((vcFileDefaultContentProvider: typeof _VCFileDefaultContentProvider) => {
                const defaultContentProvider = vcFileDefaultContentProvider.FileDefaultContentProviderFactory.getProvider(
                    newFileItem.contentMetadata.extension,
                    this.repositoryContext.getRepositoryType(),
                    scenario);

                if (defaultContentProvider) {
                    return defaultContentProvider.getContent({
                        repositoryContext: this.repositoryContext,
                        item: newFileItem,
                        repositoryExists: true,
                        showError: true,
                    });
                }
            });
    }

    public loadContributedRenderers(): IPromise<undefined> {
        return ContentRendererFactory.ensureContributedRenderersLoaded();
    }

    public getRendererForExtensionSync(fileExtension: string): IContentRenderer {
        return ContentRendererFactory.getRendererForExtensionSync(fileExtension);
    }

    public changeUserDefaultVersion(versionSpec: VersionSpec): void {
        if (versionSpec instanceof GitBranchVersionSpec) {
            const branchName = versionSpec.branchName;
            VersionControlRegistryPath.setUserDefaultBranchSetting(branchName, this.repositoryContext);
        }
    }

    public getExistingBranches(): IPromise<string[]> {
        if (this.isGit()) {
            return getGitRefService(this.repositoryContext as GitRepositoryContext).getBranchNames();
        } else {
            return Q([]);
        }
    }

    public invalidateBranchesCache(): void {
        getGitRefService(this.repositoryContext as GitRepositoryContext).invalidateCache();
    }
}

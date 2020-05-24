import { Debug } from "VSS/Diag";
import { ContractSerializer } from "VSS/Serialization";
import { VssConnection } from "VSS/Service";
import { stringifyMSJSON } from "VSS/Utils/Core";
import { format } from "VSS/Utils/String";
import { queueRequest, handleError } from "VSS/VSS";
import { IdentityRef, ResourceRef } from "VSS/WebApi/Contracts";

import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as Git_Client from "TFS/VersionControl/GitRestClient";

import * as Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCCommon from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import { ClientGitRef } from "VersionControl/Scripts/ClientGitRef";
import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { PullRequestPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { SettingsPermissionsSource, SettingsPermissionSet, SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { GitPermissionsSource, createRepositoryGitPermissionsKey, GitPermissionSet, getRepositoryPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { GitRepositoryPermissions } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import * as VCClientService from "VersionControl/Scripts/VersionControlClientServiceBase";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitQueryCommitsResults } from "VersionControl/Scripts/GitQueryCommitsResults";
import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionControlUserPreferences, VersionControlRepositoryOption } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCWebApi from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import { GitItemFromJsonIsland } from "VersionControl/Scripts/GitItemFromJsonIsland";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { Repo } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { gitVersionStringToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";

export class GitClientService extends VCClientService.VersionControlClientServiceBase implements IVersionControlClientService {

    private _collectionRepositories: VCContracts.GitRepository[];
    private _repositoriesByProject: { [projectId: string]: VCContracts.GitRepository[]; };
    private _repositoriesByProjectAsync: { [projectId: string]: VCContracts.GitRepository[]; };
    private _httpClient: VCWebApi.GitHttpClient;
    private _gitRefZeroValue = "0000000000000000000000000000000000000000";
    private _gitRestClient: Git_Client.GitHttpClient4_1;
    private _gitPermissionsSource: GitPermissionsSource;
    private _settingsPermissionsSource: SettingsPermissionsSource;

    public initializeConnection(tfsConnection: VssConnection) {
        super.initializeConnection(tfsConnection);

        this._repositoriesByProject = {};
        this._repositoriesByProjectAsync = {};
        this._httpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
        this._gitRestClient = tfsConnection.getHttpClient<Git_Client.GitHttpClient4_1>(Git_Client.GitHttpClient4_1);
        this._gitPermissionsSource = new GitPermissionsSource();
        this._settingsPermissionsSource = new SettingsPermissionsSource();
    }

    public beginGetAllRepositories(
        callback: (repositories: VCContracts.GitRepository[]) => void,
        errorCallback?: IErrorCallback) {

        queueRequest(this, this, "_collectionRepositories", callback, errorCallback || handleError, (succeeded, failed) => {
            this._httpClient.beginGetAllRepositories().then(succeeded, failed);
        });
    }

    public beginGetProjectRepositories(
        projectId: string,
        callback: (repositories: VCContracts.GitRepository[]) => void,
        errorCallback?: IErrorCallback) {

        queueRequest(this, this._repositoriesByProjectAsync, projectId, callback, errorCallback || handleError, (succeeded, failed) => {
            this._httpClient.beginGetProjectRepositories(projectId).then(
                (repositories: VCContracts.GitRepository[]) => {
                    this._repositoriesByProject[projectId] = repositories;
                    succeeded(repositories);
                }, failed);
        });
    }

    public beginGetProjectRepository(
        projectId: string,
        repositoryId: string,
        callback: (repository: VCContracts.GitRepository) => void,
        errorCallback?: IErrorCallback): void {

        this._gitRestClient.getRepository(repositoryId, projectId).then((repository: VCContracts.GitRepository) => {
            callback.call(this, repository);
        }, errorCallback);
    }

    public beginGetRepository(
        repositoryId: string,
        callback: (repository: VCContracts.GitRepository) => void,
        errorCallback?: IErrorCallback) {

        this.beginGetAllRepositories((repositories: VCContracts.GitRepository[]) => {
            let matchingRepository;
            $.each(repositories, (i: number, repository: VCContracts.GitRepository) => {
                if (repository.id.toLowerCase() === (repositoryId || "").toLowerCase()) {
                    matchingRepository = repository;
                    return false;
                }
            });

            if (matchingRepository) {
                callback.call(this, matchingRepository);
            }
            else {
                if (errorCallback) {
                    errorCallback.call(this, new Error(format(VCResources.NoRepositoryByIdError, repositoryId)));
                }
                else {
                    handleError(new Error(format(VCResources.NoRepositoryByIdError, repositoryId)));
                }
            }
        }, errorCallback);
    }

    public clearCachedProjectRepositories(projectId: string) {
        this._repositoriesByProject[projectId] = [];
        this._repositoriesByProjectAsync[projectId] = null;
    }
    
    private _clearCachedGitRefs(repository: VCContracts.GitRepository, refType?: string) {
        const cacheProperty = this._getRefTypeCacheProperty(refType);
        repository[cacheProperty] = null;
    }

    private _getRefTypeCacheProperty(refType: string) {
        return (refType) ? ("_refs_" + refType) : "_refs";
    }

    /** Returns "heads" or "tags" or "" for the given branch or tag refName for use with ref filtering and caching */
    private _getRefTypeForRefName(refName: string): string {
        if (refName && refName.indexOf("refs/heads/") === 0) {
            return VCCommon.GitWebApiConstants.HeadsFilter;
        }
        else if (refName && refName.indexOf("refs/tags/") === 0) {
            return VCCommon.GitWebApiConstants.TagsFilter;
        }
        return "";
    }

    /** Explicitly clear any cache of previously retrieved branch ref names for the given repository */
    public clearBranchesCache(repository: VCContracts.GitRepository) {
        this._clearCachedGitRefs(repository, VCCommon.GitWebApiConstants.HeadsFilter);
    }

    public beginGetGitRefs(
        repository: VCContracts.GitRepository,
        callback: (allRefs: ClientGitRef[], branches: ClientGitRef[], tags: ClientGitRef[]) => void,
        errorCallback?: IErrorCallback,
        refType?: string) {

        const cacheProperty = this._getRefTypeCacheProperty(refType);
        queueRequest(this, repository, cacheProperty, (allRefs: ClientGitRef[]) => {
            const branches = $.grep(allRefs, (ref: ClientGitRef) => {
                return ref.isBranch;
            }),
                tags = $.grep(allRefs, (ref: ClientGitRef) => {
                    return ref.isTag;
                });

            callback.call(this, allRefs, branches, tags);

        }, errorCallback || handleError, (succeeded, failed) => {

            this._httpClient.beginGetGitRefs(repository.id, refType).then(
                refs => succeeded(this.decorateWithFriendlyNames(refs)),
                failed);
        });
    }

    private decorateWithFriendlyNames(refs: VCContracts.GitRef[]): ClientGitRef[] {
        return $.map(refs, (ref: VCContracts.GitRef) => {
            const clientRef = <ClientGitRef>ref;
            clientRef.friendlyName = ref.name;
            if ((ref.name || "").indexOf("refs/heads/") === 0) {
                clientRef.friendlyName = ref.name.substr("refs/heads/".length);
                clientRef.isBranch = true;
            }
            else if ((ref.name || "").indexOf("refs/tags/") === 0) {
                clientRef.friendlyName = ref.name.substr("refs/tags/".length);
                clientRef.isTag = true;
            }
            else {
                clientRef.friendlyName = ref.name || "";
            }
            return clientRef;
        });
    }

    public beginGetGitBranches(
        repository: VCContracts.GitRepository,
        callback: (branches: ClientGitRef[]) => void,
        errorCallback?: IErrorCallback) {

        this.beginGetGitRefs(repository, (allRefs: ClientGitRef[], branches: ClientGitRef[], tags: ClientGitRef[]) => {
            callback.call(this, branches);
        }, errorCallback, VCCommon.GitWebApiConstants.HeadsFilter);
    }

    public beginGetGitTags(
        repository: VCContracts.GitRepository,
        callback: (tags: ClientGitRef[]) => void,
        errorCallback?: IErrorCallback) {

        this.beginGetGitRefs(repository, (allRefs: ClientGitRef[], branches: ClientGitRef[], tags: ClientGitRef[]) => {
            callback.call(this, tags);
        }, errorCallback, VCCommon.GitWebApiConstants.TagsFilter);
    }

    public beginGetGitRef(repository: VCContracts.GitRepository,
        refName: string,
        callback: (gitRefs: VCContracts.GitRef[]) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetGitRef(repository.project.id, repository.id, refName).then(
            (gitRefs: VCContracts.GitRef[]) => {
                if ($.isFunction(callback)) {
                    callback.call(this, gitRefs);
                }
            }, errorCallback || handleError);
    }

    public beginGetGitRefsBatch(repository: VCContracts.GitRepository,
        refNames: string[],
        callback: (gitRefs: VCContracts.GitRef[]) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetGitRefsBatch(repository.id, refNames).then(
            (gitRefs: VCContracts.GitRef[]) => {
                if ($.isFunction(callback)) {
                    callback.call(this, this.decorateWithFriendlyNames(gitRefs));
                }
            }, errorCallback || handleError);
    }

    public beginDeleteGitRef(repository: VCContracts.GitRepository,
        refName: string,
        oldObjectId: string,
        callback: (refUpdateResult: VCContracts.GitRefUpdateResult[]) => void,
        errorCallback?: IErrorCallback) {

        const newObjectId = this._gitRefZeroValue;
        this.beginUpdateGitRef(repository, refName, oldObjectId, newObjectId, callback, errorCallback);
    }

    public beginCreateGitRef(repository: VCContracts.GitRepository,
        refName: string,
        newObjectId: string,
        callback: (refUpdateResult: VCContracts.GitRefUpdateResult[]) => void,
        errorCallback?: IErrorCallback) {

        const oldObjectId = this._gitRefZeroValue;
        this.beginUpdateGitRef(repository, refName, oldObjectId, newObjectId, callback, errorCallback);
    }

    public beginUpdateGitRef(repository: VCContracts.GitRepository,
        refName: string,
        oldObjectId: string,
        newObjectId: string,
        callback: (refUpdateResult: VCContracts.GitRefUpdateResult[]) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginUpdateGitRef(repository.id, refName, oldObjectId, newObjectId).then(
            (refUpdateResult: VCContracts.GitRefUpdateResult[]) => {
                const refType = this._getRefTypeForRefName(refName);
                this._clearCachedGitRefs(repository, refType);
                if ($.isFunction(callback)) {
                    callback.call(this, refUpdateResult);
                }
            }, errorCallback || handleError);
    }

    public beginSetDefaultBranch(
        repository: VCContracts.GitRepository,
        defaultRef: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {

        Ajax.postHTML(this._getApiLocation("SetGitDefaultRef"), {
            repositoryId: repository.id,
            refName: defaultRef
        }, () => {
            repository.defaultBranch = defaultRef;
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        },
            errorCallback);
    }

    public beginGetCommitDiffs(
        repositoryId: string,
        projectId: string,
        baseVersion: string,
        targetVersion: string,
        diffCommonCommit: boolean,
        top: number,
        skip: number,
        callback: (commitDiffs: VCContracts.GitCommitDiffs) => void,
        errorCallback?: IErrorCallback) {

        const baseVersionDescriptor = gitVersionStringToVersionDescriptor(baseVersion),
            targetVersionDescriptor = gitVersionStringToVersionDescriptor(targetVersion);

        this._httpClient.beginGetCommitDiffs(repositoryId, projectId, baseVersionDescriptor, targetVersionDescriptor, diffCommonCommit, top, skip)
            .then(callback, errorCallback);
    }

    public beginGetPush(
        repositoryContext: RepositoryContext,
        pushId: number,
        includeCommits: number,
        includeRefUpdates: boolean,
        callback: (push: VCContracts.GitPush) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetPush(repositoryContext.getRepositoryId(), repositoryContext.getProjectId(), pushId, includeCommits, includeRefUpdates)
            .then(callback, errorCallback);
    }

    public beginGetPushes(
        repositoryId: string,
        searchCriteria: VCContracts.GitPushSearchCriteria,
        top: number,
        skip: number,
        callback: (pushes: VCContracts.GitPushRef[]) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetPushes(repositoryId, searchCriteria, top, skip)
            .then(callback, errorCallback);
    }

    public beginLockGitRef(
        repository: VCContracts.GitRepository,
        refName: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {

        Ajax.postHTML(this._getApiLocation("LockGitRef"), {
            repositoryId: repository.id,
            refName: refName
        }, () => {
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        },
            errorCallback);
    }

    public beginUnlockGitRef(
        repository: VCContracts.GitRepository,
        refName: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {

        Ajax.postHTML(this._getApiLocation("UnlockGitRef"), {
            repositoryId: repository.id,
            refName: refName
        }, () => {
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        },
            errorCallback);
    }

    public beginCreateRepository(
        projectId: string,
        projectName: string,
        repositoryName: string,
        callback?: (repository: VCContracts.GitRepository) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginCreateRepository(projectId, projectName, repositoryName).then(
            (repository: VCContracts.GitRepository) => {
                this.clearCachedProjectRepositories(projectId);
                if ($.isFunction(callback)) {
                    callback.call(this, repository);
                }
            }, errorCallback || handleError);
    }

    public beginRenameRepository(
        repository: VCContracts.GitRepository,
        newRepositoryName: string,
        callback?: (repository: VCContracts.GitRepository) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginRenameRepository(repository.id, newRepositoryName).then(
            () => {
                repository.name = newRepositoryName;
                if ($.isFunction(callback)) {
                    callback.call(this, repository);
                }
            }, errorCallback || handleError);
    }

    public beginDeleteRepository(
        repository: VCContracts.GitRepository,
        callback?: () => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginDeleteRepository(repository.id).then(
            () => {
                this.clearCachedProjectRepositories(repository.project.id);
                if ($.isFunction(callback)) {
                    callback.call(this);
                }
            }, errorCallback || handleError);
    }

    public beginGetBranchDiffSummary(
        repository: VCContracts.GitRepository,
        baseVersion: string,
        versions: string[],
        callback: (result: VCLegacyContracts.GitBranchDiff[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.postMSJSON(this._getApiLocation("BranchDiffSummary"), {
            repositoryId: repository.id,
            baseVersion: baseVersion,
            versions: stringifyMSJSON(versions)
        }, callback, errorCallback);
    }

    public beginGetCommitFileDiff(
        repositoryContext: RepositoryContext,
        baseVersion: string,
        targetVersion: string,
        maxNumberOfChanges: number,
        skipCount: number,
        callback: (result: VCLegacyContracts.GitCommit) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.diff-commits-data-provider";
        const repositoryId: string = repositoryContext.getRepositoryId();
        const requestParams = {
            repositoryId,
            baseVersion,
            targetVersion,
            maxNumberOfChanges,
            skipCount,
        };

        const successCallback = (data): void => {
            this._processChangeList(data);
            callback(data);
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetCommitItems(
        repository: VCContracts.GitRepository,
        version: string,
        path: string,
        callback?: (commits: VCLegacyContracts.GitCommit[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.postMSJSON(this._getApiLocation("commitItems"), {
            version: version,
            path: path,
            repositoryId: repository.id
        },
            callback,
            errorCallback, {
                showGlobalProgressIndicator: false
            });
    }

    public beginGetLastChangeTreeItems(
        repositoryContext: RepositoryContext,
        version: string,
        path: string,
        allowPartial: boolean,
        includeCommits: boolean,
        successCallback?: (lastChangeTreeItems: VCContracts.GitLastChangeTreeItems) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.git-last-change-tree-items-data-provider";
        const requestParams = {
            repositoryId: repositoryContext.getRepositoryId(),
            version,
            path,
            allowPartial,
            includeCommits,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetAnnotateGitDiffs(
        repositoryContext: RepositoryContext,
        path: string,
        versions: string[],
        successCallback?: (results: VCLegacyContracts.GitAnnotateBatchResult[]) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.annotate-git-diffs-data-provider";
        const requestParams = {
            repositoryId: repositoryContext.getRepositoryId(),
            path,
            versions,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetUserLastBranch(
        repository: VCContracts.GitRepository,
        callback: (branchName: string) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("gitUserDefaultBranchName"), {
            repositoryId: repository.id
        }, (result) => {
            callback.call(this, result.branchName);
        }, errorCallback);
    }

    public beginGetUserDefaultRepository(
        projectName: string,
        callback: (repository: VCContracts.GitRepository) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("gitUserDefaultRepository"), {
            projectName: projectName
        }, (result: any) => {
            callback.call(this, result.repository);
        }, errorCallback);
    }

    public getQueryCriteria(searchCriteria: VCContracts.ChangeListSearchCriteria): VCContracts.GitQueryCommitsCriteria {
        const queryCriteria: VCContracts.GitQueryCommitsCriteria = <VCContracts.GitQueryCommitsCriteria>{
            fromDate: searchCriteria.fromDate,
            toDate: searchCriteria.toDate,
            fromCommitId: searchCriteria.fromVersion,
            toCommitId: searchCriteria.toVersion,
            itemPath: searchCriteria.itemPath,
            excludeDeletes: searchCriteria.excludeDeletes,
            user: searchCriteria.user,
            $top: searchCriteria.top,
            $skip: searchCriteria.skip
        };

        if (searchCriteria.itemVersion) {
            queryCriteria.itemVersion = gitVersionStringToVersionDescriptor(searchCriteria.itemVersion);
        }
        if (searchCriteria.compareVersion) {
            queryCriteria.compareVersion = gitVersionStringToVersionDescriptor(searchCriteria.compareVersion);
        }
        return queryCriteria;
    }

    public getHistoryQueryResults(commitSearchResults: VCWebApi.GitCommitSearchResults): VCLegacyContracts.GitHistoryQueryResults {
        const historyQueryResults: VCLegacyContracts.GitHistoryQueryResults = <VCLegacyContracts.GitHistoryQueryResults>{
            moreResultsAvailable: commitSearchResults.hasMore,
            startingCommitId: commitSearchResults.startingCommitId,
            unprocessedCount: commitSearchResults.stillProcessing ? 1 : 0,
            unpopulatedCount: commitSearchResults.stillProcessing ? 1 : 0,
            results: $.map(commitSearchResults.commits, (commit) => {
                const historyEntry = <VCLegacyContracts.HistoryEntry>{
                    changeList: <VCLegacyContracts.ChangeList>GitItemUtils.gitCommitRefToLegacyChangeList(commit)
                };
                if (commit.changes && commit.changes.length) {
                    const change = commit.changes[0];
                    $.extend(historyEntry, {
                        itemChangeType: <VCContracts.VersionControlChangeType>change.changeType,
                        serverItem: change.sourceServerItem
                    });
                }
                if (commit.statuses) {
                    $.extend(historyEntry.changeList, {
                        statuses: commit.statuses
                    });
                }

                return historyEntry;
            })
        }
        return historyQueryResults;
    }

    public beginGetHistory(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.ChangeListSearchCriteria,
        callback?: (result: VCLegacyContracts.HistoryQueryResults) => void,
        errorCallback?: IErrorCallback) {

        const queryCriteria = this.getQueryCriteria(searchCriteria);

        this._httpClient.beginGetCommits(repositoryContext.getRepositoryId(), repositoryContext.getProjectId(), queryCriteria).then(
            (gitCommitSearchResults: VCWebApi.GitCommitSearchResults) => {
                // convert the GitCommitRef array to a GitHistoryQueryResults to keep all the UI stuff working
                callback(this.getHistoryQueryResults(gitCommitSearchResults));
            }, errorCallback || handleError);
    }

    /**
     *  Query for commits using any custom search criteria.
     *  @param repository The git repository on which to query commmits.
     *  @param searchCriteria The search criteria to narrow the query. Any versions specified as VersionSpec strings will be converted to version descriptors.
     */
    public beginGetCommits(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.GitQueryCommitsCriteria,
        callback: (results: VCWebApi.GitCommitSearchResults) => void,
        errorCallback?: IErrorCallback) {

        if (searchCriteria.itemVersion && typeof searchCriteria.itemVersion === "string") {
            searchCriteria.itemVersion = gitVersionStringToVersionDescriptor(<any>searchCriteria.itemVersion);
        }
        if (searchCriteria.compareVersion && typeof searchCriteria.compareVersion === "string") {
            searchCriteria.compareVersion = gitVersionStringToVersionDescriptor(<any>searchCriteria.compareVersion);
        }

        this._httpClient.beginGetCommits(repositoryContext.getRepositoryId(), repositoryContext.getProjectId(), searchCriteria)
            .done((results: VCWebApi.GitCommitSearchResults) => {
                callback.call(this, <GitQueryCommitsResults>results);
            })
            .fail(errorCallback || handleError);
    }

    public beginGetCommitsById(
        repositoryContext: RepositoryContext,
        commitIds: string[],
        callback: (commits: VCContracts.GitCommitRef[]) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetCommits(
            repositoryContext.getRepositoryId(),
            repositoryContext.getProjectId(),
            <VCContracts.GitQueryCommitsCriteria>{ ids: commitIds })
            .done((results: VCWebApi.GitCommitSearchResults) => {
                callback.call(this, results.commits);
            })
            .fail(errorCallback || handleError);
    }

    /**
     *  Create a commit on a git repository.
     *  @param repository The git repository on which to make a commit.
     *  @param commitToCreate The commit to push to the repository
     *  @return A promise for the new GitRef if the commit is successful.
     */
    public beginPushChanges(
        repository: VCContracts.GitRepository,
        pushToCreate: VCContracts.GitPush,
        callback?: (gitRef: VCContracts.GitPush) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginPushChanges(repository.id, pushToCreate).then(
            (gitPush: VCContracts.GitPush) => {
                if ($.isFunction(callback)) {
                    callback(gitPush);
                }
            }, errorCallback || handleError);
    }

    public beginGetItems(
        repositoryContext: RepositoryContext,
        itemsToFetch: { path: string, version: string }[],
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (items: VCLegacyContracts.ItemModel[]) => void,
        errorCallback?: IErrorCallback) {

        const versionDescriptors: any[] = [];

        detailsOptions = detailsOptions || <VCLegacyContracts.ItemDetailsOptions>{};

        const result = GitItemFromJsonIsland.getGitItems(itemsToFetch, detailsOptions);

        const processItems = (itemArrays: VCContracts.GitItem[][]) => {
            const resultItems: VCLegacyContracts.ItemModel[] = [];

            $.each(itemArrays, (index: number, items: VCContracts.GitItem[]) => {
                if (!items || items.length === 0) {
                    resultItems.push(null);
                }
                else {
                    resultItems.push(
                        GitItemUtils.gitItemArrayToLegacyGitItem(
                            items,
                            itemsToFetch[index].version,
                            versionDescriptors[index],
                            detailsOptions.recursionLevel == VCLegacyContracts.VersionControlRecursionType.OneLevelPlusNestedEmptyFolders));
                }
            });

            if ($.isFunction(callback)) {
                callback(resultItems);
            }
        };

        if (result) {
            processItems(result);
        }
        else {
            const itemRequestData: VCContracts.GitItemRequestData = <VCContracts.GitItemRequestData>{
                itemDescriptors: $.map(itemsToFetch, (item: any, index: number) => {
                    const versionDescriptor: any = gitVersionStringToVersionDescriptor(item.version);
                    versionDescriptors.push(versionDescriptor);
                    return <VCContracts.GitItemDescriptor>{
                        path: item.path,
                        version: versionDescriptor.version,
                        versionOptions: versionDescriptor.versionOptions,
                        versionType: versionDescriptor.versionType,
                        recursionLevel: <any>detailsOptions.recursionLevel,
                    };
                }),
                includeContentMetadata: detailsOptions.includeContentMetadata
            };

            this._httpClient.beginGetItems(repositoryContext.getRepositoryId(), repositoryContext.getProjectId(), itemRequestData).then(
                processItems, errorCallback || handleError);
        }
    }

    public beginGetItem(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback) {

        let scopePath: string;

        detailsOptions = detailsOptions || <VCLegacyContracts.ItemDetailsOptions>{
            recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel
        };

        if (detailsOptions.recursionLevel !== VCLegacyContracts.VersionControlRecursionType.None) {
            scopePath = path;
            path = "";
        }

        let versionDescriptor: any = null;
        if (version) {
            versionDescriptor = gitVersionStringToVersionDescriptor(version);
        }

        const processItems = (result: VCContracts.GitItem[]) => {
            const gitItem: VCLegacyContracts.GitItem = GitItemUtils.gitItemArrayToLegacyGitItem(
                result,
                version,
                versionDescriptor,
                detailsOptions.recursionLevel == VCLegacyContracts.VersionControlRecursionType.OneLevelPlusNestedEmptyFolders);
            if ($.isFunction(callback)) {
                callback(gitItem);
            }

        };

        const result = GitItemFromJsonIsland.getGitItems([{ path: scopePath, version: version }], detailsOptions);
        Debug.assert(!result || result.length === 1, "More than one matching cached git item for path");

        if (result) {
            processItems(result[0]);
        }
        else {
            this._httpClient.beginGetItem(
                repositoryContext.getRepositoryId(),
                repositoryContext.getProjectId(),
                path,
                scopePath,
                versionDescriptor,
                <any>detailsOptions.recursionLevel,
                detailsOptions.includeContentMetadata,
                false,
                false)
                .then(
                processItems, errorCallback || handleError);
        }
    }

    public beginGetItemContent(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (item: any) => void,
        errorCallback?: IErrorCallback) {
            this.beginGetItemContentWithRepoId(
                repositoryContext, 
                repositoryContext.getRepositoryId(), 
                path, 
                version, 
                callback, 
                errorCallback);
    }

    public beginGetItemContentWithRepoId(
        repositoryContext: RepositoryContext,
        repoId: string,
        path: string,
        version: string,
        callback?: (item: any) => void,
        errorCallback?: IErrorCallback) {

            const scopePath: string = "";
        const recursionLevel = VCLegacyContracts.VersionControlRecursionType.None;

        let versionDescriptor: any = null;
        if (version) {
            versionDescriptor = gitVersionStringToVersionDescriptor(version);
        }

        this._httpClient.beginGetItemContent(
            repoId,
            repositoryContext.getProjectId(),
            path, scopePath,
            versionDescriptor,
            recursionLevel)
            .then(
            (result: any[]) => {
                if (result[2].status != 206) {
                    if ($.isFunction(callback)) {
                        callback(result[0]);
                    }
                } else {
                    if ($.isFunction(errorCallback)) {
                        errorCallback(VCResources.FileSizeTooLarge);
                    }
                }
            }, (error: any) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
            });
    }

    /**
     * Uses Git GetItem REST API to retrieve item content and metadata.
     * Automatically resolves Git LFS pointers to content from LFS.
     */
    public beginGetItemContentJson(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (content: VCLegacyContracts.FileContent) => void,
        errorCallback?: IErrorCallback) {

        const repositoryId = repositoryContext.getRepositoryId() || "";
        const projectId = repositoryContext.getProjectId();
        const scopePath = null;
        const recursionLevel = VCLegacyContracts.VersionControlRecursionType.None;
        const includeContent = true;
        const includeContentMetadata = true;
        const latestProcessedChange = false;
        const download = false;
        const versionDescriptor: VCContracts.GitVersionDescriptor = version ? gitVersionStringToVersionDescriptor(version) : null;
        const resolveLfs = true;

        this._httpClient.beginGetItemAjaxResult(
            repositoryId,
            path,
            projectId,
            scopePath,
            recursionLevel,
            includeContentMetadata,
            latestProcessedChange,
            download,
            versionDescriptor,
            includeContent,
            resolveLfs)
            .then((result: { gitItem: VCContracts.GitItem, textStatus: string, jqXHR: JQueryXHR }) => {
                const fileContent: VCLegacyContracts.FileContent = this.itemModelToLegacyFileContent(result.gitItem);
                if (result.jqXHR.status == 206 /* PartialContent */) {
                    fileContent.exceededMaxContentLength = true;
                }
                callback(fileContent);
            }, errorCallback || handleError);
    }

    public beginGetPullRequestSearch(
        searchCriteria: VCContracts.GitPullRequestSearchCriteria,
        top: number,
        skip: number,
        callback: (pullRequests: VCContracts.GitPullRequest[]) => void,
        errorCallback?: IErrorCallback) {

        this._gitRestClient.getPullRequestsByProject(
            null,
            searchCriteria,
            null,
            skip,
            top).then(
            (pullRequests: VCContracts.GitPullRequest[]) => {
                callback(pullRequests);
            }, errorCallback || handleError);
    }

    public beginGetPullRequests(
        repositoryContext: RepositoryContext,
        status: any,
        creatorId: any,
        reviewerId: any,
        sourceBranchName: any,
        targetBranchName: any,
        top: number,
        skip: number,
        callback: (pullRequests: VCContracts.GitPullRequest[], status: any, creatorId: any, reviewerId: any) => void,
        errorCallback?: IErrorCallback) {

        const sourceBranchRef = this._getBranchRefName(sourceBranchName);
        const targetBranchRef = this._getBranchRefName(targetBranchName);
        if (repositoryContext) {
            this._httpClient.beginGetAllPullRequests(
                repositoryContext.getRepositoryId(),
                repositoryContext.getProjectId(),
                status,
                creatorId,
                reviewerId,
                sourceBranchRef,
                targetBranchRef,
                top,
                skip).then(
                (pullRequests: VCContracts.GitPullRequest[]) => {
                    callback(pullRequests, status, creatorId, reviewerId);
                },
                errorCallback || handleError);
        }
        else {
            const searchCriteria: VCContracts.GitPullRequestSearchCriteria = <VCContracts.GitPullRequestSearchCriteria>{
                creatorId: creatorId,
                reviewerId: reviewerId,
                status: status
            }

            this._gitRestClient.getPullRequestsByProject(null, searchCriteria, null, skip, top).then(
                (pullRequests: VCContracts.GitPullRequest[]) => {
                    callback(pullRequests, status, creatorId, reviewerId);
                }, errorCallback || handleError);
        }
    }

    public beginGetPullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetPullRequest(repositoryContext.getProjectId(), repositoryContext.getRepositoryId(), pullRequestId).then(
            (pullRequest: VCContracts.GitPullRequest) => {
                callback(pullRequest);
            }, errorCallback || handleError);
    }

    public beginCreatePullRequest(
        sourceRepo: VCContracts.GitRepository,
        targetRepo: VCContracts.GitRepository,
        sourceBranchName: string,
        targetBranchName: string,
        title: string,
        description: string,
        reviewers: IdentityRef[],
        workItemRefs: ResourceRef[],
        labels: WebApiTagDefinition[],
        isDraft: boolean,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {

        const sourceBranchRef = this._getBranchRefName(sourceBranchName),
            targetBranchRef = this._getBranchRefName(targetBranchName);

        this._httpClient.beginCreatePullRequest(
            sourceRepo,
            targetRepo.id,
            sourceBranchRef,
            targetBranchRef,
            title,
            description,
            reviewers,
            workItemRefs,
            labels,
            isDraft)
            .then((pullRequest: VCContracts.GitPullRequest) => {
                callback(pullRequest);
            }, errorCallback || handleError);
    }

    public beginUpdatePullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        data: VCContracts.GitPullRequest,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginUpdatePullRequest(repositoryContext.getRepositoryId(), pullRequestId, data).then(
            (pullRequest: VCContracts.GitPullRequest) => {
                callback(pullRequest);
            }, errorCallback || handleError);
    }

    public beginUpdatePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginUpdatePullRequestReviewer(repositoryContext.getRepositoryId(), pullRequestId, reviewerId, data).then(
            (reviewer: VCContracts.IdentityRefWithVote) => {
                callback(reviewer);
            }, errorCallback || handleError);
    }

    public beginAddPullRequestTfsReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginAddPullRequestTfsReviewer(repositoryContext.getRepositoryId(), pullRequestId, reviewerId, data).then(
            (reviewer: VCContracts.IdentityRefWithVote) => {
                callback(reviewer);
            }, errorCallback || handleError);
    }

    public beginAddPullRequestAadReviewers(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewers: IdentityRef[],
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginAddPullRequestAadReviewers(repositoryContext.getRepositoryId(), pullRequestId, reviewers).then(
            (reviewer: VCContracts.IdentityRefWithVote) => {
                callback(reviewer);
            }, errorCallback || handleError);
    }

    public beginDeletePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginDeletePullRequestReviewer(repositoryContext.getRepositoryId(), pullRequestId, reviewerId).then(
            () => {
                callback();
            }, errorCallback || handleError);
    }

    public beginGetSuggestions(
        repositoryContext: RepositoryContext,
        callback: (pullRequests: VCContracts.GitSuggestion[]) => void,
        errorCallback?: IErrorCallback) {

        this._checkGitPermissions(repositoryContext.getProjectId(), repositoryContext.getRepositoryId(), GitRepositoryPermissions.PullRequestContribute).then(
            (hasPermissions: boolean) => {
                if (!hasPermissions) {
                    callback([]);
                    return;
                }

                this._httpClient.beginGetSuggestions(repositoryContext.getRepositoryId()).then(
                    (suggestions: VCContracts.GitSuggestion[]) => {
                        callback(suggestions);
                    }, errorCallback || handleError);
            });
    }

    public beginGetUserPreferences(
        callback: (preferences: VersionControlUserPreferences) => void,
        errorCallback?: IErrorCallback) {

        if (this._userPreferences) {
            callback(this._userPreferences);
            return;
        }

        this._checkSettingsPermissions(SettingsPermissionSet.Read).then(
            (hasPermissions: boolean) => {
                if (!hasPermissions) {
                    callback(this._userPreferences);
                    return;
                }

                super.beginGetUserPreferences(callback, errorCallback);
            });
    }

    public beginUpdateUserPreferences(
        preferences: VersionControlUserPreferences,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._checkSettingsPermissions(SettingsPermissionSet.Write).then(
            (hasPermissions: boolean) => {
                if (!hasPermissions) {
                    callback && callback();
                    return;
                }

                super.beginUpdateUserPreferences(preferences, callback, errorCallback);
            });
    }

    public beginGetRepositoryOptions(
        repositoryContext: RepositoryContext,
        callback: (results: VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback) {
        this._checkSettingsPermissions(SettingsPermissionSet.Read).then(
            (hasPermissions: boolean) => {
                if (!hasPermissions) {
                    callback([]);
                    return;
                }

                super.beginGetRepositoryOptions(repositoryContext, callback, errorCallback);
            });
    }

    public beginGetPullRequestWorkItemsResourceRef(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        commitsTop?: number,
        commitsSkip?: number,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetPullRequestWorkItemsResourceRef(repositoryContext.getRepositoryId(), pullRequestId, commitsTop, commitsSkip).then(
            (queryResult: VCWebApi.GitPullRequestResourceRefResults) => {
                callback(queryResult.resourceRefs, queryResult.hasMoreCommits, queryResult.nextLink);
            }, errorCallback || handleError);
    }

    public beginGetReferencedWorkItems(
        resourceRefs: ResourceRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginGetReferencedWorkItems(resourceRefs)
            .then((associatedWorkItems: VCContracts.AssociatedWorkItem[]) => {
                callback(associatedWorkItems);
            }, errorCallback || handleError);

    }

    public beginGetPullRequestPingEmail(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("pullRequestPingEmail"), {
            repositoryId: repositoryContext.getRepositoryId() || "",
            pullRequestId: pullRequestId
        }, callback, errorCallback);
    }

    public beginGetTemplateList(
        project: string,
        templateType: string,
        callback: (templateList: VCContracts.GitTemplate[]) => void,
        errorCallback?: IErrorCallback) {
        this._httpClient.beginGetTemplateList(project, templateType)
            .then(callback, errorCallback);
    }

    public getHttpClient(): VCWebApi.GitHttpClient {
        return this._httpClient;
    }

    public beginGetPullRequestPolicyEvaluations(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        successCallback?: (policyEvaluations: PullRequestPolicyEvaluation[]) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.pull-request-detail-policy-data-provider";
        const requestParams = {
            repositoryId: repositoryContext.getRepositoryId(),
            pullRequestId,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetPullRequestPolicyEvaluationsByIds(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        policyEvaluationIds: string[],
        successCallback?: (policyEvaluations: PullRequestPolicyEvaluation[]) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.pull-request-detail-policy-data-provider";
        const requestParams = {
            repositoryId: repositoryContext.getRepositoryId(),
            pullRequestId,
            policyEvaluationIds,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    private _checkGitPermissions(projectId: string, repositoryId: string, permissionToCheck: GitRepositoryPermissions): IPromise<boolean> {
        const permissionsKey = createRepositoryGitPermissionsKey(projectId, repositoryId);
        return this._gitPermissionsSource.queryGitPermissionsAsync([permissionsKey]).then(
            (permissionSet: GitPermissionSet) => {
                const repositoryPermissions = getRepositoryPermissions(permissionSet, repositoryId);
                return repositoryPermissions[GitRepositoryPermissions[permissionToCheck]];
            });
    }

    private _checkSettingsPermissions(permissionToCheck: SettingsPermissionSet): IPromise<boolean> {
        return this._settingsPermissionsSource.querySettingsPermissionsAsync().then(
            (settingsPermissions: SettingsPermissions) => {
                return settingsPermissions[SettingsPermissionSet[permissionToCheck]];
            });
    }

    private _getBranchRefName(branchName: any) {
        if (branchName && branchName.indexOf("refs/heads/") !== 0) {
            return "refs/heads/" + branchName;
        }
        return branchName;
    }
}


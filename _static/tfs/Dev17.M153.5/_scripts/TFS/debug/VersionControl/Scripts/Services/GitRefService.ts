import Q = require("q");

import Contribution_Services = require("VSS/Contributions/Services");
import * as Performance from "VSS/Performance";
import VSS_Serialization = require("VSS/Serialization");
import VSS_Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");

import * as GitRestClient from "TFS/VersionControl/GitRestClient";
import VCContracts = require("TFS/VersionControl/Contracts");

import * as VCCommonGitRefService from "VC/Common/GitRefService";
import { getGlobalPageContext } from "VersionControl/Scenarios/Shared/EnsurePageContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as VCResources  from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import VCService = require("VersionControl/Scripts/Services/Service");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

export interface ICreateRefOptions {
    sourceRef: VCSpecs.IGitRefVersionSpec;
    newRef: VCSpecs.IGitRefVersionSpec;
}

export interface IDeleteRefOptions {
    refToDelete: VCSpecs.IGitRefVersionSpec;
}

export interface ICreateFavoriteOptions {
    favorite: VCContracts.GitRefFavorite;
}

export interface IDeleteFavoriteOptions {
    favoriteId: number;
}

export module GitRefNotificationChannels {
    export let BranchesChanged: string = "branches-changed";
    export let TagsChanged: string = "tags-changed";
}

/**
 * Serves as the authority for branches and tags in the repository.
 */
export interface IGitRefService {
    /**
     * Gets a branch in the repository.
     */
    getBranch(friendlyRefName: string): IPromise<VCContracts.GitRef>;

    /**
     * Gets the branches in a repository.
     */
    getBranches(): IPromise<VCContracts.GitRef[]>;

    /**
     * Gets the branch names in a repository.
     * Operates from an internal cache.
     */
    getBranchNames(): IPromise<string[]>;

    /**
     * Gets "my branches" names in a repository, i.e., branches the user created or favorited plus the default branch names.
     */
    getMyBranchNames(): IPromise<string[]>;

    /**
     * Gets the tags in a repository.
     * Operates from an internal cache.
     */
    getTagNames(): IPromise<string[]>;

    /**
     * Invalidates the internal cache and the JSON data island, forcing a REST call to repopulate the cache.
     */
    invalidateCache(): void;

    /**
     * Creates a ref.
     * Updates the internal cache.
     */
    createRef(options: ICreateRefOptions): IPromise<VCContracts.GitRefUpdate>;

    /**
     * Creates an annotated tag ref.
     * Updates the internal cache.
     */
    createTagRefs(tagName: string, message: string, targetVersionSpec: VCSpecs.IGitRefVersionSpec);

    /**
     * Deletes a ref.
     * Updates the internal cache.
     */
    deleteRef(options: IDeleteRefOptions): IPromise<VCContracts.GitRefUpdate>;

    /**
     * Creates a favorite.
     * Updates the internal cache.
     */
    createFavorite(options: ICreateFavoriteOptions): IPromise<VCContracts.GitRefFavorite>;

    /**
     * Deletes a favorite.
     * Updates the internal cache.
     */
    deleteFavorite(options: IDeleteFavoriteOptions): IPromise<void>;

    /**
     * Gets all favorites for current user.
     */
    getFavorites(): IPromise<VCContracts.GitRefFavorite[]>;

    /**
     * Register callback for notifications.
     */
    subscribe(channel: string, callback: Function): void;

    /**
     * Unregister for notifications.
     */
    unsubscribe(channel: string, callback: Function): void;
}

/**
 * Get the GitRefService.
 * @param repositoryContext The repository context against which the service operates.
 * @returns The singleton (on a per-repository basis) git ref service.
 */
export function getGitRefService(repositoryContext: GitRepositoryContext): IGitRefService {
    return VCService.getRepositoryService(Implementation.GitRefService, repositoryContext);
}

/**
 * Implementation details follow.
 * Exposed publically for testability. Do not use directly.
 */
export module Implementation {

    export module ArrayUtils {
        export function binarySearch<T>(x: T, arr: T[], comp: (a: T, b: T) => number): number {
            let lo = 0;
            let hi = arr.length - 1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const cmp = comp(x, arr[mid]);

                if (cmp > 0) {
                    lo = mid + 1;
                }
                else if (cmp < 0) {
                    hi = mid - 1;
                }
                else {
                    return mid;
                }

            }
            return -lo - 1;
        }
    }

    export module GitRefUtils {
        export function refToFriendlyName(ref: VCContracts.GitRef): string {
            return GitRefUtility.getRefFriendlyName(ref.name);
        }

        export function refsToFriendlyNames(refs: VCContracts.GitRef[]): string[] {
            return refs.map(refToFriendlyName);
        }
    }

    export class GitRefService implements VCService.IRepositoryService, IGitRefService {
        private _GIT_REF_ZERO_VALUE = "0000000000000000000000000000000000000000";

        private _branchesCache: Q.Deferred<VCContracts.GitRef[]> = null;
        private _myBranchesCache: Q.Deferred<VCContracts.GitRef[]> = null;
        private _tagsCache: Q.Deferred<VCContracts.GitRef[]> = null;
        private _dataIslandStale: boolean = false;

        private _eventService = new Events_Services.EventService();

        private _repositoryId: string = null;
        private _projectId: string = null;
        private _identityId: string = null;
        private _gitHttpClient: GitRestClient.GitHttpClient = null;

        /**
         * Instantiates a new instance of the GitRefService specific to the given GitRepositoryContext.
         * Typically, only the repository.id must be specified for retrieving Git refs,
         * but the repository.project.id is also required for creating/deleting ref favorites.
         */
        constructor(repositoryContext: GitRepositoryContext, testHttpClientFactory?: () => GitRestClient.GitHttpClient) {
            if (testHttpClientFactory) {
                // Test path.
                this._gitHttpClient = testHttpClientFactory();
            }
            else {
                // Product path.
                const connection = new VSS_Service.VssConnection(repositoryContext.getTfsContext().contextData);
                this._gitHttpClient = connection.getHttpClient(GitRestClient.GitHttpClient);
            }

            this._repositoryId = repositoryContext.getRepositoryId();
            this._identityId = repositoryContext.getTfsContext().currentIdentity.id;

            // The project Id is only required if this will be used for creating/deleting ref favorites.
            // This might be absent from callers that provide only the stubbed repository name/id for fetching refs.
            if (repositoryContext.getRepository().project) {
                this._projectId = repositoryContext.getRepository().project.id;
            }
        }

        public getBranch(friendlyRefName: string): IPromise<VCContracts.GitRef> {
            const result = Q.defer<VCContracts.GitRef>();
            this.cacheBranches();
            this._branchesCache.promise.then(refs => {
                const index = ArrayUtils.binarySearch({ name: "refs/heads/" + friendlyRefName } as VCContracts.GitRef, refs, GitRefUtility.compareRefs);
                if (index >= 0) {
                    result.resolve(refs[index]);
                }
                else {
                    result.reject({ message: VCResources.BranchNotFoundError });
                }
            }, result.reject);

            return result.promise;
        }

        public getBranches(): IPromise<VCContracts.GitRef[]> {
            // Grab the branches from the server, if necessary.
            this.cacheBranches();
            // Return the promise for the branches.
            return this._branchesCache.promise;
        }

        public getBranchNames(): IPromise<string[]> {
            // Go grab the branches from the server, if necessary.
            this.cacheBranches();
            // Once we have the branches, return just the friendly names.
            return this._branchesCache.promise.then(GitRefUtils.refsToFriendlyNames);
        }

        public getMyBranchNames(): IPromise<string[]> {
            // Go grab the branches from the server, if necessary.
            this.cacheMyBranches();
            // Once we have the branches, return just the friendly names.
            return this._myBranchesCache.promise.then(GitRefUtils.refsToFriendlyNames);
        }

        public getTagNames(): IPromise<string[]> {
            this.cacheTags();
            return this._tagsCache.promise.then(GitRefUtils.refsToFriendlyNames);
        }

        public invalidateCache(): void {
            this._branchesCache = null;
            this._tagsCache = null;
            this._invalidateMyBranches();
            this._invalidateTagsCacheLwpService();
        }

        private _invalidateMyBranches(): void {
            this._myBranchesCache = null;
            this._dataIslandStale = true;
            this._invalidateBranchesCacheLwpService();
        }

        private _invalidateBranchesCacheLwpService() {
            const pageContext = getGlobalPageContext();
            if (pageContext) {
                const service = pageContext.getService<VCCommonGitRefService.IGitRefService>("IGitRefService");
                service.invalidateBranchesCache(this._repositoryId);
            }
        }

        private _invalidateTagsCacheLwpService() {
            const pageContext = getGlobalPageContext();
            if (pageContext) {
                const service = pageContext.getService<VCCommonGitRefService.IGitRefService>("IGitRefService");
                service.invalidateTagsCache(this._repositoryId);
            }
        }

        private _refCreateErrorCheck(refUpdates: VCContracts.GitRefUpdateResult[], refName: string): void {
            const updateError = this._getRefUpdateError(refUpdates, VCResources.BranchCreateError, refName);

            if (updateError) {
                throw new Error(updateError);
            }
        }

        private _refDeleteErrorCheck(refUpdates: VCContracts.GitRefUpdateResult[], refName: string): void {
            let updateError: string = this._getRefUpdateError(refUpdates, VCResources.BranchDeleteError, refName);

            if (!updateError) {
                return;
            }

            const updateStatus = refUpdates[0].updateStatus;

            if (updateStatus === VCContracts.GitRefUpdateStatus.RejectedByPolicy) {
                updateError = BranchResources.DeleteBranchWithPolicyFailed;
            }

            if (updateStatus === VCContracts.GitRefUpdateStatus.ForcePushRequired) {
                updateError = Utils_String.format(BranchResources.DeleteBranchWithNoForcePushFailed, refName);
            }

            throw new Error(updateError);
        }

        private _getRefUpdateError(refUpdates: VCContracts.GitRefUpdateResult[], defaultErrorMessage: string, refName: string): string {
            if (!refUpdates || refUpdates.length !== 1) {
                return Utils_String.format(defaultErrorMessage, refName);
            }

            const refUpdate = refUpdates[0];

            if (refUpdate.success) {
                return null;
            }

            if (refUpdate.customMessage) {
                return refUpdate.customMessage;
            }

            return Utils_String.format(defaultErrorMessage, refName);
        }

        public createTagRefs(tagName: string, message: string, targetVersionSpec: VCSpecs.IGitRefVersionSpec): IPromise<VCContracts.GitAnnotatedTag> {
            const taggedObject: VCContracts.GitObject = {
                objectId: (targetVersionSpec as VCSpecs.GitCommitVersionSpec).commitId
            } as VCContracts.GitObject;

            if (targetVersionSpec instanceof VCSpecs.GitCommitVersionSpec) {
                taggedObject.objectId = (targetVersionSpec as VCSpecs.GitCommitVersionSpec).commitId
                const tag = {
                    name: tagName,
                    message: message,
                    taggedObject: taggedObject
                } as VCContracts.GitAnnotatedTag;

                return this._gitHttpClient.createAnnotatedTag(tag, this._projectId, this._repositoryId).then((tag) => {
                    const newRef: VCContracts.GitRef = GitRefUtility.annotatedTagToRef(tag);
                    this._updateRefsCache(newRef, false);
                    return tag;
                });
            }
            else {
                // First get a minimal ref object
                return this._gitHttpClient.getRefs(this._repositoryId, undefined, this._getRefFilter(targetVersionSpec.toFullName()))
                    .then((refs: VCContracts.GitRef[]) => {
                        if (refs.length < 1) {
                            Q.reject({ message: Utils_String.format(VCResources.CreateTag_RefFindError, targetVersionSpec.toFullName()) });
                        }
                        taggedObject.objectId = refs[0].objectId;
                        const tag = {
                            name: tagName,
                            message: message,
                            taggedObject: taggedObject
                        } as VCContracts.GitAnnotatedTag;

                        return this._gitHttpClient.createAnnotatedTag(
                            tag,
                            this._projectId,
                            this._repositoryId).then((tag: VCContracts.GitAnnotatedTag) => {
                                const newRef: VCContracts.GitRef = GitRefUtility.annotatedTagToRef(tag);
                                this._updateRefsCache(newRef, false);
                                return tag;
                            });
                    });
            }
        }

        public createRef(options: ICreateRefOptions): IPromise<VCContracts.GitRefUpdate> {
            // Convert the friendly names to full names.
            const sourceRefName = options.sourceRef.toFullName();
            const newRefName = options.newRef.toFullName();

            let refUpdatesPromise: IPromise<VCContracts.GitRefUpdateResult[]>

            if (options.sourceRef instanceof VCSpecs.GitCommitVersionSpec) {
                refUpdatesPromise = this._gitHttpClient.updateRefs([this._refUpdate(newRefName, this._GIT_REF_ZERO_VALUE, sourceRefName)], this._repositoryId);
            }
            else {
                // First get a minimal ref object with peeledObjectId if an annotated tag
                refUpdatesPromise = this._gitHttpClient.getRefs(this._repositoryId, undefined, this._getRefFilter(sourceRefName), undefined, undefined, undefined, undefined, true)
                   .then(refs => {
                        if (refs.length < 1) {
                            throw { message: Utils_String.format(VCResources.BranchFindError, sourceRefName) }
                        }
                        return refs[0];
                    })
                    .then<VCContracts.GitRefUpdateResult[]>(ref => {
                        const commitId = ref.peeledObjectId || ref.objectId;
                        return this._gitHttpClient.updateRefs([this._refUpdate(newRefName, this._GIT_REF_ZERO_VALUE, commitId)], this._repositoryId);
                    });
            }

            return refUpdatesPromise.then(refUpdates => {

                this._refCreateErrorCheck(refUpdates, newRefName);
                const refUpdate = refUpdates[0];

                // Update the cache.  Since the current user would have created a new branch, we add it to both Mine and All branch caches.
                // If the cache is empty but will come from JSON in the page (branches only), then fill it now and update it (otherwise, it will be stale later).
                const newRef: VCContracts.GitRef = GitRefUtility.refUpdateToRef(refUpdate);
                const refIsBranch: boolean = options.newRef instanceof VCSpecs.GitBranchVersionSpec

                this._updateRefsCache(newRef, refIsBranch);

                return refUpdate;
            });
        }

        private _updateRefsCache(newRef: VCContracts.GitRef, refIsBranch: boolean) {

            const refsChangedType: string = refIsBranch ? GitRefNotificationChannels.BranchesChanged : GitRefNotificationChannels.TagsChanged;
            if (refIsBranch) {

                if (!this._myBranchesCache && this._getBranchesFromJsonIsland(BranchesScope.Mine)) {
                    this.cacheMyBranches();
                }
                this.cacheRef(this._myBranchesCache, newRef);

                if (!this._branchesCache && this._getBranchesFromJsonIsland(BranchesScope.All)) {
                    this.cacheBranches();
                }
                this.cacheRef(this._branchesCache, newRef);

                this._invalidateBranchesCacheLwpService();
            }
            else {
                this.cacheRef(this._tagsCache, newRef);

                this._invalidateTagsCacheLwpService();
            }

            this._eventService.fire(refsChangedType);
        }

        public deleteRef(options: IDeleteRefOptions): IPromise<VCContracts.GitRefUpdate> {
            const refToDeleteName = options.refToDelete.toFullName();

            return this._gitHttpClient.getRefs(this._repositoryId, undefined, this._getRefFilter(refToDeleteName))
                .then(refs => {
                    if (refs.length < 1) {
                        throw { message: Utils_String.format(VCResources.BranchFindError, refToDeleteName) };
                    }
                    return refs[0];
                })
                .then(ref => this._gitHttpClient.updateRefs([this._refUpdate(refToDeleteName, ref.objectId, this._GIT_REF_ZERO_VALUE)], this._repositoryId))
                .then(refUpdates => {

                    this._refDeleteErrorCheck(refUpdates as any as VCContracts.GitRefUpdateResult[], refToDeleteName);
                    const refUpdate = refUpdates[0];

                    // Update the cache.  Since the current user may have deleted their own branch, we remove it both from Mine and All branch caches.
                    // If the cache is empty but will come from JSON in the page (branches only), then fill it now and update it (otherwise, it will be stale later).
                    const refIsBranch: boolean = options.refToDelete instanceof VCSpecs.GitBranchVersionSpec
                    const refsChangedType: string = refIsBranch ? GitRefNotificationChannels.BranchesChanged : GitRefNotificationChannels.TagsChanged;

                    if (refIsBranch) {

                        if (!this._myBranchesCache && this._getBranchesFromJsonIsland(BranchesScope.Mine)) {
                            this.cacheMyBranches();
                        }
                        this.uncacheRef(this._myBranchesCache, refToDeleteName);

                        if (!this._branchesCache && this._getBranchesFromJsonIsland(BranchesScope.All)) {
                            this.cacheBranches();
                        }
                        this.uncacheRef(this._branchesCache, refToDeleteName);

                        this._invalidateBranchesCacheLwpService();
                    }
                    else {
                        this.uncacheRef(this._tagsCache, refToDeleteName);

                        this._invalidateTagsCacheLwpService();
                    }

                    this._eventService.fire(refsChangedType);
                    return refUpdate;
                });
        }

        public createFavorite(options: ICreateFavoriteOptions): IPromise<VCContracts.GitRefFavorite> {
            return this._gitHttpClient.createFavorite(options.favorite, this._projectId).then(favorite => {
                //We can't easily determine which branches should be added or deleted so invalidate the cache
                this._invalidateMyBranches();
                this._eventService.fire(GitRefNotificationChannels.BranchesChanged);
                return favorite;
            });
        }

        public deleteFavorite(options: IDeleteFavoriteOptions): IPromise<void> {
            return this._gitHttpClient.deleteRefFavorite(this._projectId, options.favoriteId).then<void>(x => {
                //We can't easily determine which branches should be added or deleted based on a favorite so invalidate the cache
                //Ex. deleting a folder or branch favorite may not move all of its branches out of mine
                this._invalidateMyBranches();
                this._eventService.fire(GitRefNotificationChannels.BranchesChanged);
            });
        }

        public getFavorites() {
            return this._gitHttpClient.getRefFavorites(this._projectId, this._repositoryId, this._identityId);
        }

        // Proxy subscribe and unsubscribe directly to the event service.
        public subscribe(channel: string, callback: Function) {
            this._eventService.attachEvent(channel, callback);
        }

        public unsubscribe(channel: string, callback: Function) {
            this._eventService.detachEvent(channel, callback);
        }

        // Syntatic sugar for caching branches and tags.
        protected cacheBranches(): void {
            this._branchesCache = this.cacheRefs(this._branchesCache, VCCommon.GitWebApiConstants.HeadsFilter);
        }

        protected cacheMyBranches(): void {
            this._myBranchesCache = this.cacheMyRefs(this._myBranchesCache, VCCommon.GitWebApiConstants.HeadsFilter);
        }

        protected cacheTags(): void {
            this._tagsCache = this.cacheRefs(this._tagsCache, VCCommon.GitWebApiConstants.TagsFilter);
        }

        protected cacheRef(cache: Q.Deferred<VCContracts.GitRef[]>, ref: VCContracts.GitRef) {
            if (cache) {
                cache.promise.then(refs => {
                    this.insertSortedOrUpdate(ref, refs);
                });
            }
        }

        protected uncacheRef(cache: Q.Deferred<VCContracts.GitRef[]>, refName: string) {
            if (cache) {
                cache.promise.then(refs => {
                    this.removeRef(refName, refs);
                });
            }
        }

        protected cacheRefs(cache: Q.Deferred<VCContracts.GitRef[]>, filter: string): Q.Deferred<VCContracts.GitRef[]> {
            // If we haven't yet cached the set of refs, do so.
            if (!cache) {
                cache = Q.defer<VCContracts.GitRef[]>();
                let foundLocally = false;

                // Check for a JSON island that matches the filter.
                if (filter === VCCommon.GitWebApiConstants.HeadsFilter && !this._dataIslandStale) {
                    const refsFromIsland: VCContracts.GitRef[] = this._getBranchesFromJsonIsland(BranchesScope.All);
                    if (refsFromIsland) {
                        cache.resolve(refsFromIsland); // Sorted correctly by data provider.
                        foundLocally = true;
                    }
                }

                if (!foundLocally) {
                    // Otherwise, use the REST API to get the refs.
                    const perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.GITREFSERVICE_GETALLREFS);
                    const perfProperties: IDictionaryStringTo<any> = {};
                    perfProperties[CustomerIntelligenceConstants.GITREFSERVICE_FILTER] = filter || "";
                    this._gitHttpClient.getRefs(this._repositoryId, this._projectId, filter)
                        .then(refs => {
                            perfScenario.addSplitTiming(CustomerIntelligenceConstants.GITREFSERVICE_TIME_FETCHED);
                            perfProperties[CustomerIntelligenceConstants.GITREFSERVICE_COUNT] = refs.length;

                            // Sort the refs before we cache them, so a naive map() will return the correct order.
                            refs.sort(GitRefUtility.compareRefs);
                            perfScenario.addSplitTiming(CustomerIntelligenceConstants.GITREFSERVICE_TIME_SORTED);
                            perfScenario.addData(perfProperties);
                            perfScenario.end();
                            cache.resolve(refs);
                        });
                }
            }

            return cache;
        }

        protected cacheMyRefs(cache: Q.Deferred<VCContracts.GitRef[]>, filter: string): Q.Deferred<VCContracts.GitRef[]> {
            // If we haven't yet cached the set of refs, do so.
            if (!cache) {
                cache = Q.defer<VCContracts.GitRef[]>();
                let foundLocally = false;
                const headsFilter = (ref: VCContracts.GitRef) => { return ref.name.indexOf("refs/heads/") === 0; };

                // Check for a JSON island if we happen to be on a page that includes my branches.
                if (!this._dataIslandStale) {
                    let refsFromIsland: VCContracts.GitRef[] = this._getBranchesFromJsonIsland(BranchesScope.Mine);
                    if (refsFromIsland) {
                        refsFromIsland = refsFromIsland.filter(headsFilter);
                        cache.resolve(refsFromIsland); // Sorted correctly by data provider.
                        foundLocally = true;
                    }
                }

                if (!foundLocally) {
                    // Otherwise, use the REST API to get the refs (includeMyBranches = true).
                    const perfScenario = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.GITREFSERVICE_GETMYBRANCHES);
                    const perfProperties: IDictionaryStringTo<any> = {};
                    this._gitHttpClient.getRefs(this._repositoryId, this._projectId, null, false, false, true)
                        .then(refs => {
                            perfScenario.addSplitTiming(CustomerIntelligenceConstants.GITREFSERVICE_TIME_FETCHED);
                            perfProperties[CustomerIntelligenceConstants.GITREFSERVICE_COUNT] = refs.length;

                            // Filer and sort the refs before we cache them, so a naive map() will return the correct order.
                            refs = refs.filter(headsFilter);
                            refs.sort(GitRefUtility.compareRefs);
                            perfScenario.addSplitTiming(CustomerIntelligenceConstants.GITREFSERVICE_TIME_SORTED);
                            perfScenario.addData(perfProperties);
                            perfScenario.end();
                            cache.resolve(refs);
                        });
                }
            }

            return cache;
        }

        protected insertSortedOrUpdate(ref: VCContracts.GitRef, refArray: VCContracts.GitRef[]) {
            const index = ArrayUtils.binarySearch(ref, refArray, GitRefUtility.compareRefs);
            // Return value of less than zero is the negative insertion point. Greater than zero is the update point.
            if (index < 0) {
                refArray.splice(-index - 1, 0, ref);
            }
            else {
                // Since the refs should be sorted case insensitively, we can end up with a false positive to update.
                // Now check case-sensitively to disambiguate "foo" and "FOO".
                const cmp = Utils_String.localeComparer(ref.name, refArray[index].name);
                if (cmp === 0) {
                    // Update if we still have an exact match.
                    refArray[index].objectId = ref.objectId;
                }
                // Otherwise, use the comparision to decide if the case-differing ref goes ahead or behind the other case of the ref.
                else if (cmp > 0) {
                    refArray.splice(index, 0, ref);
                }
                else {
                    refArray.splice(-index - 1, 0, ref);
                }
            }
        }

        protected removeRef(refName: string, refArray: VCContracts.GitRef[]) {
            let index;
            for (let i = 0; i < refArray.length; ++i) {
                if (Utils_String.localeComparer(refName, refArray[i].name) === 0) {
                    index = i;
                    break;
                }
            }

            refArray.splice(index, 1);
        }

        /**
         * Returns the array of branches scoped to "All" or "Mine" if available from the data provide as JSON in the page, otherwise returns null.
         */
        private _getBranchesFromJsonIsland(scope: string): VCContracts.GitRef[] {
            const contributionService = VSS_Service.getService(Contribution_Services.WebPageDataService);
            const pageData = contributionService.getPageData<any>("ms.vss-code-web.my-branches-data-provider") || {};

            // If we have a large number of branches, the data provider may not include them all and specifies to fetch on demand.  Return null if so.
            if (scope === BranchesScope.All) {
                const requiresFetch = VSS_Serialization.ContractSerializer.deserialize(pageData["Git.Branches.All.FetchData"], String as any) ? true : false;
                if (requiresFetch) {
                    return null;
                }
            }
            return VSS_Serialization.ContractSerializer.deserialize(pageData["Git.Branches." + scope], VCContracts.TypeInfo.GitRef);
        }

        /**
         * Helper method for creating a GitRefUpdate as required for the Http client
         */
        private _refUpdate(name: string, oldObjectId: string, newObjectId: string): VCContracts.GitRefUpdate {
            return <VCContracts.GitRefUpdate>{
                name,
                newObjectId,
                oldObjectId
            };
        }

        /**
         * The refs filter query parameter requires omitting the "refs/" prefix if present. Ex: "heads/myBranchName"
         */
        private _getRefFilter(refName: string): string {
            return (refName.indexOf("refs/") === 0) ? refName.substr("refs/".length) : refName;
        }
    }

    module BranchesScope {
        export const All: string = "All";
        export const Mine: string = "Mine";
    }
}
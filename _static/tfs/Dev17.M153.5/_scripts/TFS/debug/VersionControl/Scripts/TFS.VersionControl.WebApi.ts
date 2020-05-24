/// <reference types="q" />

import VCContracts = require("TFS/VersionControl/Contracts");
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import VCCommon = require("VersionControl/Scripts/Generated/TFS.VersionControl.Common");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import TFSWorkItemTrackingConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFSWebAccessWITConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.WorkItemTracking.Constants");
import WebApi_Contracts = require("VSS/WebApi/Contracts");

export interface GitCommitSearchResults {
    commits: VCContracts.GitCommitRef[];
    startingCommitId: string;
    hasMore: boolean;
    stillProcessing: boolean;
}
export interface GitPullRequestResourceRefResults {
    resourceRefs: WebApi_Contracts.ResourceRef[];
    hasMoreCommits: boolean;
    nextLink: string;
}

export class GitHttpClient extends WebApi_RestClient.VssHttpClient {
    // refsBatch is not generated as part of the client, so this constant lives here
    public static REFS_BATCH_LOCATION_ID: string = "D5E42319-9C64-4ACD-A906-F524A578A7FE";
    private static readonly ITEMS_ROUTE_TEMPLATE: string = "{project}/_apis/{area}/repositories/{repositoryId}/{resource}/{*path}";
    private static readonly ITEMS_API_VERSION = "5.0-preview.1";

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetAllRepositories() {
        return this._beginRequest<VCContracts.GitRepository[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            responseIsCollection: true
        });
    }

    public beginGetProjectRepositories(projectId: string) {
        return this._beginRequest<VCContracts.GitRepository[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            routeValues: {
                project: projectId
            },
            responseIsCollection: true
        });
    }

    public beginGetRepository(projectId: string, repositoryId: string) {
        return this._beginRequest<VCContracts.GitRepository>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            routeValues: {
                project: projectId,
                repositoryId: repositoryId
            }
        });
    }

    public beginGetGitRefs(repositoryId: string, refType?: string) {
        return this._beginRequest<VCContracts.GitRef[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RefsLocationId,
            routeValues: {
                repositoryId: repositoryId,
                "filter": refType //jobriggs fixing by hand as this wasn't generated correctly
            },
            responseType: VCContracts.TypeInfo.GitRef,
            responseIsCollection: true
        });
    }

    /*
     * This method expects a fully qualified ref name (e.g. "refs/heads/<branch>")
     */
    public beginGetGitRef(project: string, repositoryId: string, refName: string, peelTags: boolean = false) {

        // The query parameter for the REST endpoint
        // expects this without a leading "refs/"
        // string - strip it off it is present.
        if (refName.indexOf("refs/") === 0) {
            refName = refName.substr("refs/".length);
        }

        // Passing the refname as a query parameter instead of as a route
        // value to allow for characters that are valid in a branch name
        // but not in a route (such as the '+' character).
        return this._beginRequest<VCContracts.GitRef[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RefsLocationId,
            queryParams: { filter: refName, peelTags },
            routeValues: {
                project,
                repositoryId,
            },
            responseType: VCContracts.TypeInfo.GitRef,
            responseIsCollection: true
        });
    }

    public beginGetGitRefsBatch(repositoryId: string, refNames: string[]) {
        return this._beginRequest<VCContracts.GitRef[]>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: GitHttpClient.REFS_BATCH_LOCATION_ID,
            routeValues: {
                repositoryId: repositoryId
            },
            data: {
                refNames: this.normalizeWithRefsPrefix(refNames),
                searchType: VCContracts.GitRefSearchType.Exact
            },
            responseType: VCContracts.TypeInfo.GitRef,
            responseIsCollection: true
        });
    }

    private normalizeWithRefsPrefix(refNames: string[]): string[] {
        return refNames.map(refName => refName.indexOf("refs/") === 0 ? refName : ("refs/" + refName));
    }

    public beginUpdateGitRef(repositoryId: string, refName: string, oldObjectId: string, newObjectId: string) {
        return this._beginRequest<VCContracts.GitRefUpdateResult[]>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RefsLocationId,
            routeValues: {
                repositoryId: repositoryId
            },
            data: [
                {
                    name: refName,
                    oldObjectId: oldObjectId,
                    newObjectId: newObjectId
                }
            ],
            responseType: VCContracts.TypeInfo.GitRefUpdateResult,
            responseIsCollection: true
        });
    }

    public beginCreateRepository(projectId: string, projectName: string, repositoryName: string) {
        return this._beginRequest<VCContracts.GitRepository>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            data: {
                project: {
                    id: projectId,
                    name: projectName
                },
                name: repositoryName
            }
        });
    }

    public beginRenameRepository(repositoryId: string, newRepositoryName: string) {
        return this._beginRequest({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            routeValues: {
                repositoryId: repositoryId
            },
            data: {
                name: newRepositoryName
            }
        });
    }

    public beginDeleteRepository(repositoryId: string) {
        return this._beginRequest({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.RepositoriesLocationId,
            routeValues: {
                repositoryId: repositoryId
            }
        });
    }

    public beginGetCommits(repositoryId: string, project: string, searchCriteria: VCContracts.GitQueryCommitsCriteria) {
        let deferred: JQueryDeferred<GitCommitSearchResults> = jQuery.Deferred();
        this._beginRequestWithAjaxResult({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.CommitsBatchLocationId,
            routeValues: {
                repositoryId,
                project,
            },
            data: searchCriteria,
            responseType: VCContracts.TypeInfo.GitCommitRef,
            responseIsCollection: true
        }).spread<any>(
            (commits: VCContracts.GitCommitRef[], textStatus: string, xhr: JQueryXHR) => {
            let linkHeaders: { [relName: string]: string; } = this._getLinkResponseHeaders(xhr);
                deferred.resolve({
                commits: commits,
                startingCommitId: linkHeaders["startingCommitId"],
                hasMore: !!linkHeaders["next"],
                stillProcessing: (xhr.getResponseHeader("Still-Processing") || "").toLowerCase() === "true"
            });
            },
            deferred.reject);

        return deferred.promise();
    }

    public beginPushChanges(repositoryId: string, pushToCreate: VCContracts.GitPush): IPromise<VCContracts.GitPush> {
        return this._beginRequest<VCContracts.GitPush>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PushesLocationId,
            routeValues: {
                repositoryId: repositoryId
            },
            data: pushToCreate,
            requestType: VCContracts.TypeInfo.GitPush,
            responseType: VCContracts.TypeInfo.GitPush
        });
    }

    public beginGetCommitDiffs(
        repositoryId: string,
        projectId: string,
        baseVersion: VCContracts.GitVersionDescriptor,
        targetVersion: VCContracts.GitVersionDescriptor,
        diffCommonCommit?: boolean,
        top?: number,
        skip?: number): IPromise<VCContracts.GitCommitDiffs> {

        return this._beginRequest<VCContracts.GitCommitDiffs>({
            httpMethod: "GET",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.CommitDiffsLocationId,
            routeValues: {
                repositoryId: repositoryId,
                project: projectId
            },
            data: {
                baseVersion: baseVersion.version,
                baseVersionType: baseVersion.versionType,
                baseVersionOptions: baseVersion.versionOptions,
                targetVersion: targetVersion.version,
                targetVersionType: targetVersion.versionType,
                targetVersionOptions: targetVersion.versionOptions,
                diffCommonCommit: diffCommonCommit,
                "$top": top,
                "$skip": skip
            },
            responseType: VCContracts.TypeInfo.GitCommitDiffs
        });
    }

    public beginGetPush(
        repositoryId: string,
        project: string,
        pushId: number,
        includeCommits?: number,
        includeRefUpdates?: boolean): IPromise<VCContracts.GitPush> {

            return this._beginRequest<VCContracts.GitPush>({
                httpMethod: "GET",
                area: VCCommon.GitWebApiConstants.AreaName,
                locationId: VCCommon.GitWebApiConstants.PushesLocationId,
                routeValues: {
                    project,
                    repositoryId,
                    pushId,
                },
                data: {
                    includeCommits: includeCommits,
                    includeRefUpdates: includeRefUpdates
                },
                responseType: VCContracts.TypeInfo.GitPush
            });
    }

    public beginGetPushes(
        repositoryId: string,
        searchCriteria?: VCContracts.GitPushSearchCriteria,
        top?: number,
        skip?: number): IPromise<VCContracts.GitPushRef[]> {

            return this._beginRequest<VCContracts.GitPushRef[]>({
                httpMethod: "GET",
                area: VCCommon.GitWebApiConstants.AreaName,
                locationId: VCCommon.GitWebApiConstants.PushesLocationId,
                routeValues: {
                    repositoryId: repositoryId
                },
                data: $.extend({
                    "$top": top,
                    "$skip": skip
                }, searchCriteria),
                requestType: VCContracts.TypeInfo.GitPushSearchCriteria,
                responseType: VCContracts.TypeInfo.GitPushRef,
                responseIsCollection: true
            });
    }

    public beginGetItems(
        repositoryId: string,
        project: string,
        requestData: VCContracts.GitItemRequestData): IPromise<VCContracts.GitItem[][]> {

        let requestparams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.ItemsBatchLocationId,
            routeValues: {
                repositoryId,
                project,
            },
            data: requestData,
            responseType: VCContracts.TypeInfo.GitItem,
            responseIsCollection: true
        };

        return this._beginRequest<VCContracts.GitItem[][]>(requestparams);
    }

    public beginGetItem(
        repositoryId: string,
        project: string,
        path: string,
        scopePath: string,
        versionDescriptor: any,
        recursionLevel: VCContracts.VersionControlRecursionType,
        includeContentMetadata: boolean,
        latestProcessChange: boolean,
        download: boolean): IPromise<VCContracts.GitItem[]> {

        return this._beginGetItem(
            repositoryId,
            project,
            path,
            scopePath,
            versionDescriptor,
            recursionLevel,
            includeContentMetadata,
            latestProcessChange,
            download,
            0,
            null);
    }

    public beginGetItemContent(
        repositoryId: string,
        project: string,
        path: string,
        scopePath: string,
        versionDescriptor: any,
        recursionLevel: VCContracts.VersionControlRecursionType): IPromise<any[]> {

        let queryParameters: any = {
            path: path,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            includeContentMetadata: false,
            latestProcessedChange: false,
            download: false
        };

        if (versionDescriptor) {
            queryParameters = $.extend(versionDescriptor, queryParameters);
        }

        let requestParams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "GET",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.ItemsLocationId,
            routeValues: {
                repositoryId,
                project,
            },
            data: queryParameters,
            responseType: VCContracts.TypeInfo.ItemContent,
            httpResponseType: "text/plain"
        }
        
        return this._beginRequest<any[]>(requestParams, true);
    }

    /**
     * Get the full Ajax result for Item Metadata and/or Content for a single item.
     * This was copied from GitRestClient.GitHttpClient5.getItem() to allow checking the HTTP Status code 206 for partial item content.
     *
     * @param {string} repositoryId - The Id of the repository.
     * @param {string} path - The item path.
     * @param {string} project - Project ID or project name
     * @param {string} scopePath - The path scope.  The default is null.
     * @param {Contracts.VersionControlRecursionType} recursionLevel - The recursion level of this request. The default is 'none', no recursion.
     * @param {boolean} includeContentMetadata - Set to true to include content metadata.  Default is false.
     * @param {boolean} latestProcessedChange - Set to true to include the lastest changes.  Default is false.
     * @param {boolean} download - Set to true to download the response as a file.  Default is false.
     * @param {Contracts.GitVersionDescriptor} versionDescriptor - Version descriptor.  Default is null.
     * @param {boolean} includeContent - Set to true to include item content when requesting json.  Default is false.
     * @return IPromise<{gitItem: VCContracts.GitItem, textStatus: string, jqXHR: JQueryXHR}>
     */
    public beginGetItemAjaxResult(
        repositoryId: string,
        path: string,
        project?: string,
        scopePath?: string,
        recursionLevel?: VCContracts.VersionControlRecursionType,
        includeContentMetadata?: boolean,
        latestProcessedChange?: boolean,
        download?: boolean,
        versionDescriptor?: VCContracts.GitVersionDescriptor,
        includeContent?: boolean,
        resolveLfs?: boolean
    ): IPromise<{gitItem: VCContracts.GitItem, textStatus: string, jqXHR: JQueryXHR}> {

        const queryValues: any = {
            path: path,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            includeContentMetadata: includeContentMetadata,
            latestProcessedChange: latestProcessedChange,
            download: download,
            versionDescriptor: versionDescriptor,
            includeContent: includeContent,
            resolveLfs: resolveLfs
        };

        return this._beginRequestWithAjaxResult<VCContracts.GitItem>({
            httpMethod: "GET",
            area: "git",
            locationId: "fb93c0db-47ed-4a31-8c20-47552878fb44",
            resource: "Items",
            routeTemplate: GitHttpClient.ITEMS_ROUTE_TEMPLATE,
            responseType: VCContracts.TypeInfo.GitItem,
            routeValues: {
                project: project,
                repositoryId: repositoryId
            },
            queryParams: queryValues,
            apiVersion: GitHttpClient.ITEMS_API_VERSION
        }).spread((gitItem: VCContracts.GitItem, textStatus: string, jqXHR: JQueryXHR) => {
            return {
                gitItem,
                textStatus,
                jqXHR
            };
        });
    }

    public getFileContentUrl(
        project: string,
        repositoryId: string,
        path: string,
        download?: boolean,
        versionDescriptor?: VCContracts.GitVersionDescriptor,
        resolveLfs?: boolean,
        routeData?: any): string {

        const area = "git";
        const resource = "Items";
        const routeTemplate = GitHttpClient.ITEMS_ROUTE_TEMPLATE;
        const routeValues = {
            project,
            repositoryId,
            ...routeData
        };
        const queryValues: any = {
            path,
            versionDescriptor,
            download,
            resolveLfs,
            '$format': "octetStream",
            'api-version': GitHttpClient.ITEMS_API_VERSION
        };

        return this.getRequestUrl(routeTemplate, area, resource, routeValues, queryValues);
    }

    public getZippedContentUrl(
        project: string,
        repositoryId: string,
        path: string,
        versionDescriptor?: VCContracts.GitVersionDescriptor,
        resolveLfs?: boolean): string {

        const area = "git";
        const resource = "Items";
        const routeTemplate = GitHttpClient.ITEMS_ROUTE_TEMPLATE;
        const routeValues = {
            project,
            repositoryId
        };
        const queryValues: any = {
            path,
            versionDescriptor,
            resolveLfs,
            '$format': "zip",
            'api-version': GitHttpClient.ITEMS_API_VERSION
        };

        return this.getRequestUrl(routeTemplate, area, resource, routeValues, queryValues);
    }

    private _beginGetItem(
        repositoryId: string,
        project: string,
        path: string,
        scopePath: string,
        versionDescriptor: any,
        recursionLevel: VCContracts.VersionControlRecursionType,
        includeContentMetadata: boolean,
        latestProcessChange: boolean,
        download: boolean,
        maxLength: number,
        httpResponseType?: string) {

        let queryParameters: any = {
            path: path,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            includeContentMetadata: includeContentMetadata,
            latestProcessedChange: latestProcessChange,
            download: download
        };

        if (versionDescriptor) {
            queryParameters = $.extend(versionDescriptor, queryParameters);
        }

        let requestParams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "GET",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.ItemsLocationId,
            routeValues: {
                repositoryId,
                project,
            },
            data: queryParameters,
            responseType: VCContracts.TypeInfo.GitItem,
            responseIsCollection: true
        }

        if (maxLength) {
            requestParams.customHeaders = {
                "Range": "bytes=0-" + maxLength
            };
        }

        if (httpResponseType) {
            requestParams.httpResponseType = httpResponseType;
        }

        return this._beginRequest<VCContracts.GitItem[]>(requestParams);
    }

    public beginGetAllPullRequests(
        repositoryId: string,
        project: string,
        status: any,
        creatorId: any,
        reviewerId: any,
        sourceRefName: any,
        targetRefName: any,
        top: number,
        skip: number) {
        return this._beginRequest<VCContracts.GitPullRequest[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestsLocationId,
            routeValues: {
                repositoryId,
                project,
            },
            data: {
                status: status,
                creatorId: creatorId,
                reviewerId: reviewerId,
                "$top": top,
                "$skip": skip,
                sourceRefName: sourceRefName,
                targetRefName: targetRefName,
            },
            responseType: VCContracts.TypeInfo.GitPullRequest,
            responseIsCollection: true
        });
    }

    public beginGetPullRequest(project: string, repositoryId: string, pullRequestId: number, includeCommits: boolean = false) {
        return this._beginRequest<VCContracts.GitPullRequest>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestsLocationId,
            routeValues: {
                project,
                repositoryId,                
                pullRequestId,
            },
            responseType: VCContracts.TypeInfo.GitPullRequest,
            data: {
                includeCommits: includeCommits
            },
        });
    }

    public beginCreatePullRequest(
        sourceRepository: VCContracts.GitRepository,
        targetRepositoryId: string,
        sourceBranchName: string,
        targetBranchName: string,
        title: string,
        description: string,
        reviewers: WebApi_Contracts.IdentityRef[],
        workItemRefs: WebApi_Contracts.ResourceRef[],
        labels: WebApiTagDefinition[],
        isDraft?: boolean) {
        return this._beginRequest<VCContracts.GitPullRequest>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestsLocationId,
            routeValues: {
                repositoryId: targetRepositoryId,
            },
            data: {
                sourceRefName: sourceBranchName,
                targetRefName: targetBranchName,
                Title: title,
                Description: description,
                Reviewers: reviewers,
                WorkItemRefs: workItemRefs,
                ForkSource: {
                    Repository: sourceRepository
                },
                Labels: labels,
                isDraft: !!isDraft
            },
            responseType: VCContracts.TypeInfo.GitPullRequest
        });
    }

    public beginUpdatePullRequest(repositoryId: string, pullRequestId: number, data: VCContracts.GitPullRequest) {
        return this._beginRequest<VCContracts.GitPullRequest>({
            httpMethod: "PATCH",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestsLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId
            },
            data: data,
            responseType: VCContracts.TypeInfo.GitPullRequest
        });
    }

    public beginUpdatePullRequestReviewer(repositoryId: string, pullRequestId: number, reviewerId: string, data: any) {
        return this._beginRequest<VCContracts.IdentityRefWithVote>({
            httpMethod: "PUT",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestReviewersLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId,
                reviewerId: reviewerId
            },
            data: data,
            responseIsCollection: true
        });
    }

    public beginAddPullRequestTfsReviewer(repositoryId: string, pullRequestId: number, reviewerId: string, data: any) {
        return this._beginRequest<VCContracts.IdentityRefWithVote>({
            httpMethod: "PUT",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestReviewersLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId,
                reviewerId: reviewerId
            },
            data: data,
            responseIsCollection: true
        });
    }

    public beginAddPullRequestAadReviewers(repositoryId: string, pullRequestId: number, reviewers: WebApi_Contracts.IdentityRef[]) {
        return this._beginRequest<VCContracts.IdentityRefWithVote>({
            httpMethod: "POST",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestReviewersLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId
            },
            data: reviewers,
            responseIsCollection: true
        });
    }

    public beginDeletePullRequestReviewer(repositoryId: string, pullRequestId: number, reviewerId: string) {
        return this._beginRequest({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestReviewersLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId,
                reviewerId: reviewerId
            }
        });
    }
    
    public beginGetSuggestions(repositoryId: string) {
        return this._beginRequest<VCContracts.GitSuggestion[]>({
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.SuggestionsLocationId,
            routeValues: {
                repositoryId: repositoryId
            },
            responseIsCollection: true
        });
    }

    public beginGetPullRequestWorkItemsResourceRef(repositoryId: string, pullRequestId: number, commitsTop?: number, commitsSkip?: number) {
        let deferred: JQueryDeferred<GitPullRequestResourceRefResults> = jQuery.Deferred();

        let promise = <Q.Promise<GitPullRequestResourceRefResults>>this._beginRequest({
            httpMethod: "GET",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.PullRequestWorkItemsLocationId,
            routeValues: {
                repositoryId: repositoryId,
                pullRequestId: pullRequestId,
            },
            data: {
                commitsTop: commitsTop,
                commitsSkip: commitsSkip
            },
            responseIsCollection: true
        }, true);

        promise.spread<any>(
            (resourceRefs: WebApi_Contracts.ResourceRef[], textStatus: string, xhr: JQueryXHR) => {
            let linkHeaders: { [relName: string]: string; } = this._getLinkResponseHeaders(xhr);
            deferred.resolve({
                resourceRefs: resourceRefs,
                hasMoreCommits: !!linkHeaders["next"],
                nextLink: linkHeaders["next"]
        });
            },
            deferred.reject);

        return deferred.promise();
    }

    public beginGetReferencedWorkItems(resourceRefs: WebApi_Contracts.ResourceRef[]) {
        let deferred: JQueryDeferred<VCContracts.AssociatedWorkItem[]> = jQuery.Deferred();

        if (resourceRefs && resourceRefs.length > 0) {
            let ids: string = resourceRefs.map(x => x.id).join(",");
            let fields: string = [TFSWorkItemTrackingConstants.CoreFieldRefNames.Id,
                TFSWorkItemTrackingConstants.CoreFieldRefNames.AssignedTo,
                TFSWorkItemTrackingConstants.CoreFieldRefNames.Title,
                TFSWorkItemTrackingConstants.CoreFieldRefNames.State,
                TFSWorkItemTrackingConstants.CoreFieldRefNames.WorkItemType
            ].join(",");

            this._beginRequest({
                httpMethod: "GET",
                area: TFSWebAccessWITConstants.WitConstants.AreaName,
                locationId: TFSWebAccessWITConstants.WitConstants.WorkItemsLocationId,
                data: {
                    ids: ids,
                    fields: fields
                },
                routeValues: {
                    resource: TFSWebAccessWITConstants.WorkItemTrackingRestResources.WorkItems
                },
                responseIsCollection: true
            }).then(
                (workItemPayload: any) => {
                let associatedWorkItems: VCContracts.AssociatedWorkItem[] = this._buildAssociatedWorkItems(workItemPayload);
                deferred.resolve(associatedWorkItems);
            }, (error: Error) => {
                deferred.reject(error);
            });;      
        }
        else {
            deferred.resolve([]); 
        }

        return deferred.promise();
    }

    public beginGetTemplateList(
        project: string,
        templateType: string): IPromise<VCContracts.GitTemplate[]> {
        return this._beginRequest<VCContracts.GitTemplate[]>({
            httpMethod: "GET",
            area: VCCommon.GitWebApiConstants.AreaName,
            locationId: VCCommon.GitWebApiConstants.TemplatesLocationId,
            routeValues: {
                project: project
            },
            queryParams: {
                type: templateType
            },
            responseIsCollection: true
        });
    }

    private _buildAssociatedWorkItems(workItemsPayload: any): VCContracts.AssociatedWorkItem[] {
        let associatedWorkItems: VCContracts.AssociatedWorkItem[] = [];
        if (workItemsPayload) {
            $.each(workItemsPayload, (i, workitem) => {
                let associatedWorkItem: VCContracts.AssociatedWorkItem = <VCContracts.AssociatedWorkItem>{};
                $.each(workitem.fields, (field, value) => {
                    switch (field) {
                        case TFSWorkItemTrackingConstants.CoreFieldRefNames.Id:
                            associatedWorkItem.id = value;
                            break;
                        case TFSWorkItemTrackingConstants.CoreFieldRefNames.AssignedTo:
                            associatedWorkItem.assignedTo = value;
                            break;
                        case TFSWorkItemTrackingConstants.CoreFieldRefNames.State:
                            associatedWorkItem.state = value;
                            break;
                        case TFSWorkItemTrackingConstants.CoreFieldRefNames.Title:
                            associatedWorkItem.title = value;
                            break;
                        case TFSWorkItemTrackingConstants.CoreFieldRefNames.WorkItemType:
                            associatedWorkItem.workItemType = value;
                            break;
                        default:
                            break;
                    }
                });
                associatedWorkItem.url = workitem.url;

                associatedWorkItems.push(associatedWorkItem);
            }); 
        }

        return associatedWorkItems;
    }
}

export class TfvcHttpClient extends WebApi_RestClient.VssHttpClient {

    private static readonly ITEMS_ROUTE_TEMPLATE: string = "{project}/_apis/{area}/{resource}/{*path}";
    private static readonly ITEMS_API_VERSION = "4.1-preview.1";

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetProjectInfo(projectNameOrId: string) {
        return this._beginRequest<VCContracts.VersionControlProjectInfo>({
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.VersionControlProjectInfoLocationId,
            routeValues: {
                projectId: projectNameOrId
            },
            responseType: VCContracts.TypeInfo.VersionControlProjectInfo
        });
    }

    public beginGetProjectInfos() {
        return this._beginRequest<VCContracts.VersionControlProjectInfo[]>({
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.VersionControlProjectInfosLocationId,
            responseType: VCContracts.TypeInfo.VersionControlProjectInfo,
            responseIsCollection: true
        });
    }

    public beginGetItem(
        path: string,
        scopePath: string,
        versionDescriptor: any,
        recursionLevel: VCContracts.VersionControlRecursionType,
        filename: string,
        download: boolean) {

        let queryParameters: any = {
            path: path,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            filename: filename,
            download: download
        };

        if (versionDescriptor) {
            queryParameters = $.extend(queryParameters, versionDescriptor);
        }
        
        let requestParams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "GET",
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.TfvcItemsLocationId,
            data: queryParameters,
            responseType: VCContracts.TypeInfo.TfvcItem,
            responseIsCollection: true
        };

        return this._beginRequest<VCContracts.TfvcItem[]>(requestParams);
    }

    public beginGetItemContent(
        path: string,
        scopePath: string,
        versionDescriptor: any,
        recursionLevel: VCContracts.VersionControlRecursionType) {

        let queryParameters: any = {
            path: path,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            filename: "",
            download: false
        };

        if (versionDescriptor) {
            queryParameters = $.extend(queryParameters, versionDescriptor);
        }

        let requestParams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "GET",
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.TfvcItemsLocationId,
            data: queryParameters,
            responseType: VCContracts.TypeInfo.TfvcItem,
            httpResponseType: "text/plain"
        };

        return this._beginRequest<any[]>(requestParams, true);
    }

    /**
     * Get the full Ajax result for Item Metadata and/or Content for a single item.
     * This was copied from TfvcRestClient.TfvcHttpClient4_1.getItem() to allow checking the HTTP Status code 206 for partial item content.
     *
     * @param {string} path - Version control path of an individual item to return.
     * @param {string} project - Project ID or project name
     * @param {string} fileName - file name of item returned.
     * @param {boolean} download - If true, create a downloadable attachment.
     * @param {string} scopePath - Version control path of a folder to return multiple items.
     * @param {TFS_VersionControl_Contracts.VersionControlRecursionType} recursionLevel - None (just the item), or OneLevel (contents of a folder).
     * @param {TFS_VersionControl_Contracts.TfvcVersionDescriptor} versionDescriptor - Version descriptor.  Default is null.
     * @param {boolean} includeContent - Set to true to include item content when requesting json.  Default is false.
     * @return IPromise<TFS_VersionControl_Contracts.TfvcItem>
     */
    public beginGetItemAjaxResult(
        path: string,
        project?: string,
        fileName?: string,
        download?: boolean,
        scopePath?: string,
        recursionLevel?: VCContracts.VersionControlRecursionType,
        versionDescriptor?: VCContracts.TfvcVersionDescriptor,
        includeContent?: boolean
    ): IPromise<{ tfvcItem: VCContracts.TfvcItem, textStatus: string, jqXHR: JQueryXHR }> {

        const queryValues: any = {
            path: path,
            fileName: fileName,
            download: download,
            scopePath: scopePath,
            recursionLevel: recursionLevel,
            versionDescriptor: versionDescriptor,
            includeContent: includeContent
        };

        return this._beginRequestWithAjaxResult<VCContracts.TfvcItem>({
            httpMethod: "GET",
            area: "tfvc",
            locationId: "ba9fc436-9a38-4578-89d6-e4f3241f5040",
            resource: "Items",
            routeTemplate: TfvcHttpClient.ITEMS_ROUTE_TEMPLATE,
            responseType: VCContracts.TypeInfo.TfvcItem,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: TfvcHttpClient.ITEMS_API_VERSION
        }).spread((tfvcItem: VCContracts.TfvcItem, textStatus: string, jqXHR: JQueryXHR) => {
            return {
                tfvcItem,
                textStatus,
                jqXHR
            };
        });
    }

    public getFileContentUrl(
        project: string,
        path: string,
        download?: boolean,
        versionDescriptor?: VCContracts.TfvcVersionDescriptor,
        routeData?: any): string {

        const area = "tfvc";
        const resource = "Items";
        const routeTemplate = TfvcHttpClient.ITEMS_ROUTE_TEMPLATE;
        const routeValues = {
            project,
            ...routeData
        };
        const queryValues: any = {
            path,
            versionDescriptor,
            download,
            '$format': "octetStream",
            'api-version': TfvcHttpClient.ITEMS_API_VERSION
        };

        return this.getRequestUrl(routeTemplate, area, resource, routeValues, queryValues);
    }

    public getZippedContentUrl(
        project: string,
        path: string,
        versionDescriptor?: VCContracts.TfvcVersionDescriptor): string {

        const area = "tfvc";
        const resource = "Items";
        const routeTemplate = TfvcHttpClient.ITEMS_ROUTE_TEMPLATE;
        const routeValues = {
            project
        };
        const queryValues: any = {
            path,
            versionDescriptor,
            '$format': "zip",
            'api-version': TfvcHttpClient.ITEMS_API_VERSION
        };

        return this.getRequestUrl(routeTemplate, area, resource, routeValues, queryValues);
    }

    public beginGetItemsBatch(
        requestData: VCContracts.TfvcItemRequestData) {

        let requestParams: WebApi_RestClient.VssApiResourceRequestParams = {
            httpMethod: "POST",
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.TfvcItemBatchLocationId,
            data: requestData,
            responseType: VCContracts.TypeInfo.TfvcItem,
            responseIsCollection: true
        };

        return this._beginRequest<VCContracts.TfvcItem[][]>(requestParams);
    }

    public beginCreateChangeset(
        changesetToCreate: VCContracts.TfvcChangeset): IPromise<VCContracts.TfvcChangesetRef> {

        return this._beginRequest<VCContracts.TfvcChangesetRef>({
            httpMethod: "POST",
            area: VCCommon.TfvcConstants.AreaName,
            locationId: VCCommon.TfvcConstants.TfvcChangesetsLocationId,
            data: changesetToCreate,
            requestType: VCContracts.TypeInfo.TfvcChangeset,
            responseType: VCContracts.TypeInfo.TfvcChangesetRef
        });
    }
}

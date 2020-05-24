import * as Q from "q";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { JsonPatchDocument, JsonPatchOperation, Operation } from "VSS/WebApi/Contracts";

import * as TFS_WitBatch_WebApi from "TFS/WorkItemTracking/BatchRestClient";
import { WorkItem, WorkItemExpand } from "TFS/WorkItemTracking/Contracts";
import * as TFS_Wit_WebApi from "TFS/WorkItemTracking/RestClient";

import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { IColumn, InternalKnownColumns } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ArtifactResolver, IArtifactResult } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ArtifactResolver";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { WikiSearchResponse, WikiSearchRequest } from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as SearchClient from "Search/Scripts/Generated/Client/RestClient";
import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { WikiPageArtifact } from "Wiki/Scripts/CommonConstants";
import { getLinkFromPath, getWikiPageUrlPath, replaceForwardSlashesToBackSlashes } from "Wiki/Scripts/Helpers";

export class RenamePageDialogSource {
    public readonly c_searchTextFormat =
    "url:{0}"
    + " OR url:{0}#*"
    + " OR url:{0}/*"
    + " OR url:{1}"
    + " OR url:{1}#*"
    + " OR url:{1}\\*"
    + " OR url:*pagePath={2}"
    + " OR url:*pagePath={2}&*"
    + " OR url:*pagePath={2}#*"
    + " OR url:*pagePath={2}%2f*";

    constructor(private _httpClient?: SearchClient.SearchHttpClient4) {
        if (!this._httpClient) {
            this._httpClient = SearchClient.getClient();
        }
    }

    public queryWikiPageNameSearch(pagePath: string, skipResults: number, maxResultsCount: number, projectId: string): IPromise<WikiSearchResponse> {
        const query = {
            $orderBy: null,
            searchText: this._getSearchQueryText(pagePath),
            $skip: skipResults,
            $top: maxResultsCount,
            filters: null,
        } as WikiSearchRequest;

        return this._fetchWikiSearchResults(query, projectId);
    }

    public resolveArtifacts(workItemIds: number[]): IPromise<IArtifactResult> {
        const artifacts: ILinkedArtifact[] = workItemIds.map((workitemId: number) => mapWorkItemIdToLinkedArtifact(workitemId));
        const artifactResolver = ArtifactResolver.getInstance();

        return artifactResolver.resolveArtifacts(artifacts, this._getDefaultColumns(), null, TfsContext.getDefault())
    }

    public updateWorkItemsArtifactUris(workItemIdToUpdateUrls: IDictionaryNumberTo<IDictionaryStringTo<string>>): IPromise<IDictionaryNumberTo<boolean>> {
        const workItemIds: number[] = [];

        for (const workItemId in workItemIdToUpdateUrls) {
            if (workItemIdToUpdateUrls.hasOwnProperty(workItemId)) {
                workItemIds.push(parseInt(workItemId));
            }
        }

        const witClient = TFS_Wit_WebApi.getClient();
        const batchWitClient = TFS_WitBatch_WebApi.getClient();

        return witClient.getWorkItems(workItemIds, null, null, WorkItemExpand.Relations).then((workItems: WorkItem[]) => {
            const updateJsonDocuments: [number, JsonPatchDocument][] = [];

            workItems.forEach((workItem: WorkItem) => {
                const workItemId: number = workItem.id;

                if (workItem && workItem.relations) {
                    const oldUrlToNewUrl: IDictionaryStringTo<string> = workItemIdToUpdateUrls[workItemId];
                    let updateOperations: JsonPatchOperation[] = [];

                    /**
                     * Find the index of the relation to delete.
                     * The order of deletion of relations should be in decreasing order of indices,
                     * otherwise deleting multiple relations in one work item will fail.
                     */
                    for (let i = workItem.relations.length - 1; i >= 0; --i) {
                        if (oldUrlToNewUrl[workItem.relations[i].url]) {
                            const currentUrl: string = workItem.relations[i].url;
                            updateOperations = updateOperations.concat(this._getWorkItemJsonPatchOperationsForUpdatingRelation(i, currentUrl, oldUrlToNewUrl[currentUrl]));
                        }
                    }

                    if (updateOperations.length) {
                        updateJsonDocuments.push([workItemId, updateOperations]);
                    }
                }
            });

            return batchWitClient.updateWorkItemsBatch(updateJsonDocuments).then(
                (responses: TFS_WitBatch_WebApi.JsonHttpBatchResponse) => {
                    const workItemUpdateResults: IDictionaryNumberTo<boolean> = {};

                    responses.value.forEach((response: TFS_WitBatch_WebApi.JsonHttpResponse) => {
                        const workItemId: number = JSON.parse(response.body).id;
                        if (workItemId) {
                            workItemUpdateResults[workItemId] = response.code === 200;
                        }
                    });

                    return workItemUpdateResults;
                }
            );
        });
    }

    private _fetchWikiSearchResults(query: WikiSearchRequest, projectId: string): IPromise<WikiSearchResponse> {
        return this._httpClient.fetchWikiSearchResults(query, projectId);
    }

    private _getWorkItemJsonPatchOperationsForUpdatingRelation(replaceIndex: number, expectedUrl: string, updatedUrl: string): JsonPatchOperation[] {
        const updateOperations: JsonPatchOperation[] = [];

        updateOperations.push(this._getWorkItemJsonTestOperation(replaceIndex, expectedUrl));
        updateOperations.push(this._getWorkItemJsonRemoveLinkOperation(replaceIndex));
        updateOperations.push(this._getWorkItemJsonAddLinkOperation(updatedUrl));

        return updateOperations;
    }

    private _getWorkItemJsonTestOperation(relationIndex: number, expectedUrl: string): JsonPatchOperation {
        return {
            op: Operation.Test,
            path: "/relations/" + relationIndex + "/url",
            value: expectedUrl
        } as JsonPatchOperation;
    }

    private _getWorkItemJsonRemoveLinkOperation(relationIndex: number): JsonPatchOperation {
        return {
            op: Operation.Remove,
            path: "/relations/" + relationIndex,
        } as JsonPatchOperation;
    }

    private _getWorkItemJsonAddLinkOperation(artifactUrl: string): JsonPatchOperation {
        return {
            op: Operation.Add,
            path: "/relations/-",
            value: {
                rel: "ArtifactLink",
                url: artifactUrl,
                attributes: {
                    name: WikiPageArtifact.Name,
                },
            },
        } as JsonPatchOperation;
    }

    private _getDefaultColumns(): IColumn[] {
        return [InternalKnownColumns.Link, InternalKnownColumns.State, InternalKnownColumns.LastUpdate, InternalKnownColumns.Comment];
    }

    private _getSearchQueryText(pagePath: string): string {
        const linkPath = getLinkFromPath(pagePath);
        const urlPath = getWikiPageUrlPath(pagePath);
        const linkPathWithBackSlash = replaceForwardSlashesToBackSlashes(linkPath);

        // Replace '(' and ')' with '*' otherwise it will break the search query text into multiple terms
        return Utils_String.format(this.c_searchTextFormat, linkPath, linkPathWithBackSlash, urlPath).replace(/\(|\)|\\\(|\\\)/g, "*");
    }
}

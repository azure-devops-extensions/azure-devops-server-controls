import * as Q from "q";
import * as Context from "VSS/Context";
import * as Service from "VSS/Service";

import * as SharedSearchConstants from "SearchUI/Constants";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import {
    GitChange,
    GitCommit,
    GitVersionDescriptor,
    GitVersionOptions,
    GitVersionType,
    VersionControlRecursionType,
} from "TFS/VersionControl/Contracts";
import { ItemDetailsOptions, ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import { ComparePagePayload } from "Wiki/Scenarios/Compare/CompareActionsHub";
import { VersionControlConstants } from "Wiki/Scripts/CommonConstants";
import { getWikiCompareError, WikiErrorNames } from "Wiki/Scripts/ErrorHelper";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export class WikiCompareSource {
    private static c_initialChangesToFetch = 1000;

    constructor(
        private _wiki: WikiV2,
        private _repositoryContext: GitRepositoryContext,
        private _wikiHttpClient?: WikiHttpClient
    ) { }

    public fetchComparePagePayload(version: string, pagePath: string, gitItemPath: string ): IPromise<ComparePagePayload> {
        const deferred = Q.defer<ComparePagePayload>();

        let changeCount: number = WikiCompareSource.c_initialChangesToFetch;
        let startIndex = 0;

        const errorCallback = (error: Error): void => {
            deferred.reject(getWikiCompareError(error, pagePath, version));
        };

        const successCallback = (result: GitCommit): void => {
            const itemIndex: number = this._getItemIndex(result, gitItemPath, startIndex);

            // check whether the relevant page was returned in result
            if (itemIndex >= 0) {
                const comparePagePayload: ComparePagePayload = this._getComparePagePayloadFromGitCommit(pagePath, result, itemIndex);
                deferred.resolve(comparePagePayload);
            } else if (this._hasMorePages(result, changeCount)) {
                // fetch double number of changes from server
                startIndex = changeCount;
                changeCount *= 2;
                this._getCommit(successCallback, errorCallback, version, changeCount);
            } else {
                // reject with appropriate error
                const error: TfsError = {
                    name: WikiErrorNames.wikiPageNotFoundException,
                    message: "",
                    serverError: { typeKey: WikiErrorNames.wikiPageNotFoundException },
                };
                errorCallback(error);
            }
        };

        this._getCommit(successCallback, errorCallback, version, changeCount);

        return deferred.promise;
    }

    private _getCommit(
        successCallback: (result: GitCommit) => void,
        errorCallback: (error: Error) => void,
        version: string,
        changeCount: number,
    ): void {
        const gitClient: GitHttpClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);

        gitClient.getCommit(
            version,
            this._repositoryContext.getRepositoryId(),
            this._repositoryContext.getTfsContext().contextData.project.id,
            changeCount,
        ).then(
            successCallback,
            errorCallback,
        );
    }

    public fetchItemDetails(version: string, pagePath: string, gitItemPath: string): IPromise<ItemModel> {
        const deferred = Q.defer<ItemModel>();

        const itemVersion = "GC" + version;
        this._repositoryContext.getClient().beginGetItem(
            this._repositoryContext,
            gitItemPath,
            itemVersion,
            {
                includeContentMetadata: true,
                includeVersionDescription: true,
            } as ItemDetailsOptions,
            (item: ItemModel) => deferred.resolve(item),
            (error: Error) => deferred.reject(getWikiCompareError(error, pagePath, version)),
        );

        return deferred.promise;
    }

    public getPageText(version: string, pagePath: string, isDeleted?: boolean): IPromise<string> {
        const deferred = Q.defer<string>();

        const versionDescriptor: GitVersionDescriptor = {
            version: version,
            versionType: GitVersionType.Commit,
            versionOptions: isDeleted ? GitVersionOptions.FirstParent : GitVersionOptions.None,
        };

        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }

        this._wikiHttpClient.getPageText(
            Context.getPageContext().webContext.project.name,
            this._wiki.id,
            pagePath,
            VersionControlRecursionType.None,
            versionDescriptor
        ).then(
            (value: string) => deferred.resolve(value),
            (error: Error) => deferred.reject(getWikiCompareError(error, pagePath, version)),
        );

        return deferred.promise;
    }

    private _hasMorePages(result: GitCommit, changeCount: number): boolean {
        return result &&
            result.changes &&
            result.changes.length === changeCount;
    }

    private _getItemIndex(result: GitCommit, itemPath: string, indexStart: number): number {
        let itemIndex = -1;

        if (result && result.changes) {
            const changes: GitChange[] = result.changes;
            const resultLength = changes.length;

            for (let i = indexStart; i < resultLength; i++) {
                if (changes[i].item.path === itemPath) {
                    itemIndex = i;
                    break;
                }
            }
        }
        return itemIndex;
    }

    private _getComparePagePayloadFromGitCommit(pagePath: string, result: GitCommit, itemIndex: number): ComparePagePayload {
        if (!result) {
            return null;
        }

        const change: GitChange = result.changes[itemIndex];
        return {
            author: {
                displayName: result.committer.name,
                email: result.committer.email,
                identityId: null,
                imageUrl: result.committer.imageUrl,
            },
            pagePath: pagePath,
            gitItemPath: change.item.path,
            authoredDate: result.author.date,
            comment: result.comment,
            version: result.commitId,
            itemChangeType: change.changeType,
        };
    }

}

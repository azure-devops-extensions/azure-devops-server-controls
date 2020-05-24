import * as Q from "q";
import * as Service from "VSS/Service";

import * as SharedSearchConstants from "SearchUI/Constants";
import { GitQueryCommitsCriteria, GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiPageViewStats } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { GitCommitSearchResults } from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { PageMetadataLoadedPayload } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarActionsHub";
import { getRequestNoLongerValidError } from "Wiki/Scenarios/Shared/Components/Errors";
import { VersionControlConstants } from "Wiki/Scripts/CommonConstants";
import { getWikiReadError } from "Wiki/Scripts/ErrorHelper";
import { versionDescriptorToString } from "Wiki/Scripts/Helpers";

export class PageMetadataSource {
    private _lastRequest: Q.Deferred<Partial<PageMetadataLoadedPayload>>;

    constructor(
        private _repositoryContext: GitRepositoryContext,
        private _version: GitVersionDescriptor,
        private _wikiHttpClient?: WikiHttpClient,
    ) {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }
    }

    public getAuthorandRevisionsMetadata(gitItemPath: string): IPromise<Partial<PageMetadataLoadedPayload>> {
        const deferred = Q.defer<Partial<PageMetadataLoadedPayload>>();

        if (this._lastRequest && this._lastRequest.promise.isPending()) {
            this._lastRequest.reject(getRequestNoLongerValidError());
        }
        this._lastRequest = deferred;

        const searchCriteria = {
            includeUserImageUrl: true,
            itemVersion: this._version,
            itemPath: gitItemPath,
            $top: VersionControlConstants.MaxRevisionsToFetch,
        } as GitQueryCommitsCriteria;

        this._repositoryContext.getGitClient().beginGetCommits(
            this._repositoryContext,
            searchCriteria,
            (results: GitCommitSearchResults) => deferred.resolve(this._convertGitCommitSearchResultstoPageMetadata(results)),
            (error: Error) => deferred.reject(getWikiReadError(error, gitItemPath)));
        return deferred.promise;
    }

    public updatePageViewStats(projectId: string, wikiId: string, pagePath: string): IPromise<WikiPageViewStats> {
        return this._wikiHttpClient.createOrUpdatePageViewStats(
            projectId,
            wikiId,
            this._version,
            pagePath
        );
    }

    private _convertGitCommitSearchResultstoPageMetadata(results: GitCommitSearchResults): Partial<PageMetadataLoadedPayload> {
        if (!results || !results.commits || !results.commits.length) {
            return {};
        }
        let firstCommit = results.commits[0];
        return {
            author: {
                displayName: firstCommit.committer.name,
                email: firstCommit.committer.email,
                identityId: null,
                imageUrl: firstCommit.committer.imageUrl,
            },
            authoredDate: firstCommit.author.date,
            revisions: results.commits.length,
        };
    }
}

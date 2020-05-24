import * as Q from "q";
import { Contribution } from "VSS/Contributions/Contracts";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { GitVersionDescriptor, VersionControlRecursionType } from "TFS/VersionControl/Contracts";
import {
    WikiV2,
    WikiAttachment,
    WikiAttachmentResponse,
    WikiPage,
    WikiPageMoveParameters,
    WikiPageMoveResponse,
    WikiPageResponse,
} from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";

import { MentionProcessor } from "Mention/Scripts/TFS.Mention";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { getFileName, getParentPaths } from "VersionControl/Scripts/VersionControlPath";
import { getRequestNoLongerValidError } from "Wiki/Scenarios/Shared/Components/Errors";
import { Attachment } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { ContributionKeys, RepoConstants } from "Wiki/Scripts/CommonConstants";
import { VersionedPageContent } from "Wiki/Scripts/Contracts";
import { getWikiReadError, getWikiUpdateError } from "Wiki/Scripts/ErrorHelper";
import { convertToLevelOnePagePath, getValueFromETag, normalizeWikiPagePath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { flattenWikiPage } from "Wiki/Scripts/WikiPagesHelper";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";

export interface WikiPagesInitialData {
    landingPagePath: string;
    landingPageContent: string;
    landingPageVersion: string;
    pages: WikiPage[];
}

export interface WikiDataproviderData {
    landingPagePath: string;
    landingPageContent: string;
    landingPageVersion: string;
    pages: IDictionaryStringTo<WikiPage>;
}

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
    ensureDataProvidersResolved(contributions: Contribution[], refreshIfExpired?: boolean, properties?: any): IPromise<any>;
}

export class WikiPagesSource {
    private _lastGetPageRequest: Q.Deferred<VersionedPageContent>;

    constructor(
        private _wiki: WikiV2,
        private _wikiVersion: GitVersionDescriptor,
        private _webPageDataService?: IPageDataService,
        private _wikiHttpClient?: WikiHttpClient,
    ) {
        if (!this._webPageDataService) {
            this._webPageDataService = Service.getService(WebPageDataService) as IPageDataService;
        }

        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }
    }

    public getRootPath(): string {
        return this._wiki.mappedPath;
    }

    /**
     * Gets the page requested and the parent hierarchy if any
     * @param pagePath
     */
    public loadPageHierarchy(pagePath: string): IPromise<WikiPagesInitialData> {
        let deferred = Q.defer<WikiPagesInitialData>();

        pagePath = normalizeWikiPagePath(pagePath, this.getRootPath());

        try {
            let data: WikiDataproviderData = this._webPageDataService.getPageData<WikiDataproviderData>(ContributionKeys.WikiTreeDataProvider);
            const hasPages: boolean = !!(data
                && data.pages
                && Object.keys(data.pages).length > 0);

            if (hasPages) {
                deferred.resolve({
                    landingPagePath: data.landingPagePath,
                    landingPageContent: data.landingPageContent,
                    landingPageVersion: data.landingPageVersion,
                    pages: this._deserializeWikiDataproviderData(data, pagePath),
                });
            } else {
                this._webPageDataService.ensureDataProvidersResolved([
                    {
                        id: ContributionKeys.WikiTreeDataProvider,
                        properties: {
                            serviceInstanceType: ServiceInstanceTypes.TFS
                        }
                    } as Contribution],
                    true,
                    {
                        "pagePath": pagePath,
                        "_a": "view",
                    }
                ).then(
                    () => {
                        data = this._webPageDataService.getPageData<WikiDataproviderData>(ContributionKeys.WikiTreeDataProvider);

                        deferred.resolve({
                            landingPagePath: data.landingPagePath,
                            landingPageContent: data.landingPageContent,
                            landingPageVersion: data.landingPageVersion,
                            pages: this._deserializeWikiDataproviderData(data, pagePath),
                        });
                    },
                    (error: Error) => {
                        deferred.reject(getWikiReadError(error, pagePath));
                    }
                );
            }
        } catch (error) {
            deferred.reject(getWikiReadError(error, pagePath));
        }

        return deferred.promise;
    }

    /**
     * Gets the page requested and its subpages if any
     * @param pagePath
     */
    public getPageAndSubPages(
        pagePath: string,
        recursionLevel = VersionControlRecursionType.OneLevelPlusNestedEmptyFolders,
    ): IPromise<WikiPage[]> {
        const deferred = Q.defer<WikiPage[]>();
        this._wikiHttpClient.getPage(
            this._wiki.projectId,
            this._wiki.id,
            pagePath,
            recursionLevel,
            this._wikiVersion,
        ).then(
            (pageResponse: WikiPageResponse) => {
                deferred.resolve(flattenWikiPage(pageResponse.page));
            },
            (error: Error) => deferred.reject(getWikiReadError(error, pagePath)),
        );

        return deferred.promise;
    }

    /**
     * Gets the page requested and all its descendants, if any
     * @param pagePath
     */
    public getPageAndDescendants(pagePath: string): IPromise<WikiPage[]> {
        const deferred = Q.defer<WikiPage[]>();
        this._wikiHttpClient.getPage(
            this._wiki.projectId,
            this._wiki.id,
            pagePath,
            VersionControlRecursionType.Full,
            this._wikiVersion,
        ).then(
            (pageResponse: WikiPageResponse) => {
                deferred.resolve(flattenWikiPage(pageResponse.page));
            },
            (error: Error) => deferred.reject(getWikiReadError(error, pagePath)),
        );

        return deferred.promise;
    }

    /**
     * Gets all the pages in the Wiki repo
     */
    public getAllWikiPages(): IPromise<WikiPage[]> {
        const deferred = Q.defer<WikiPage[]>();

        this._wikiHttpClient.getPage(
            this._wiki.projectId,
            this._wiki.id,
            RepoConstants.RootPath,
            VersionControlRecursionType.Full,
            this._wikiVersion,
        ).then(
            (rootPageResponse: WikiPageResponse) => {
                deferred.resolve(flattenWikiPage(rootPageResponse.page));
            },
            (error: Error) => deferred.reject(getWikiReadError(error, RepoConstants.RootPath)),
        );

        return deferred.promise;
    }

    public getVersionedPageContent(pagePath: string, forceRequest?: boolean): IPromise<VersionedPageContent> {
        const deferred = Q.defer<VersionedPageContent>();
        if (!forceRequest && this._lastGetPageRequest && this._lastGetPageRequest.promise.isPending()) {
            this._lastGetPageRequest.reject(getRequestNoLongerValidError());
        }
        this._lastGetPageRequest = deferred;

        this._wikiHttpClient.getPage(
            this._wiki.projectId,
            this._wiki.id,
            pagePath,
            VersionControlRecursionType.None,
            this._wikiVersion,
            true,   // passing true for `includeContent`
        ).then(
            (pageResponse: WikiPageResponse) => {
                deferred.resolve({
                    content: pageResponse.page.content,
                    version: getValueFromETag(pageResponse.eTag[0]),
                });
            },
            (error: Error) => deferred.reject(getWikiReadError(error, pagePath)),
        );

        return deferred.promise;
    }

    public deletePage(
        pagePath: string,
    ): IPromise<WikiPageResponse> {
        const deferred = Q.defer<WikiPageResponse>();

        this._wikiHttpClient.deletePage(
            this._wiki.projectId,
            this._wiki.id,
            pagePath).then(
                (pageResponse: WikiPageResponse) => deferred.resolve(pageResponse),
                (error: Error) => deferred.reject(getWikiUpdateError(error, pagePath)));

        return deferred.promise;
    }

    public renamePage(
        newPagePath: string,
        originalPagePath: string,
        newPageOrder: number,
        comment?: string,
    ): IPromise<WikiPageMoveResponse> {
        const deferred = Q.defer<WikiPageMoveResponse>();
        comment = comment || Utils_String.localeFormat(
            WikiResources.RenamePageDefaultComment,
            originalPagePath,
            newPagePath);

        this._wikiHttpClient.createPageMove(
            {
                path: originalPagePath,
                newPath: newPagePath,
                newOrder: (newPageOrder && newPageOrder < 0) ? 0 : newPageOrder,
            },
            this._wiki.projectId,
            this._wiki.id,
            comment).then(
                (pageMoveResponse: WikiPageMoveResponse) => {
                    if (WikiFeatures.isWikiPageViewStatsEnabled()) {
                        // This is a fire and forget call.
                        this._wikiHttpClient.createOrUpdatePageViewStats(
                            this._wiki.projectId,
                            this._wiki.id,
                            this._wikiVersion,
                            newPagePath,
                            originalPagePath,
                        );
                    }

                    deferred.resolve(pageMoveResponse);
                },
                (error: Error) => {
                    deferred.reject(getWikiUpdateError(error, newPagePath, originalPagePath));
                });

        return deferred.promise;
    }

    public reorderPage(
        pagePath: string,
        newPageOrder: number,
        originalPageOrder: number,
        comment?: string,
    ): IPromise<WikiPageMoveResponse> {
        const deferred = Q.defer<WikiPageMoveResponse>();

        const pageMoveParams: WikiPageMoveParameters = {
            path: pagePath,
            newPath: null,
            newOrder: newPageOrder,
        };
        comment = comment || Utils_String.format(
            WikiResources.ReorderPageDefaultComment,
            pagePath,
            originalPageOrder,
            newPageOrder);

        this._wikiHttpClient.createPageMove(
            pageMoveParams,
            this._wiki.projectId,
            this._wiki.id,
            comment).then(
                (pageMoveResponse: WikiPageMoveResponse) => deferred.resolve(pageMoveResponse),
                (error: Error) => deferred.reject(getWikiUpdateError(error, pagePath)));

        return deferred.promise;
    }

    public savePage(
        pagePath: string,
        content: string,
        version: string,
        comment: string,
        draftVersion?: GitVersionDescriptor,
    ): IPromise<WikiPageResponse> {
        const deferred = Q.defer<WikiPageResponse>();
        let versionToSavePage: GitVersionDescriptor = null;

        if (WikiFeatures.isRichCodeWikiEditingEnabled() && draftVersion) {
            versionToSavePage = draftVersion;
        } else {
            versionToSavePage = this._wikiVersion;
        }

        this._wikiHttpClient.createOrUpdatePage(
            {
                content: MentionProcessor.getDefault().translateDisplayNamesToStorageKeysOfPersonMentions(content)
            },
            this._wiki.projectId,
            this._wiki.id,
            pagePath,
            version,
            comment,
            // versionToSavePage - Task #1308769 - Save page changes to correct version of the wiki
        ).then(
            (pageResponse: WikiPageResponse) => deferred.resolve(pageResponse),
            (error: Error) => deferred.reject(getWikiUpdateError(error, pagePath)));

        return deferred.promise;
    }

    /**
     * Executes 'createAttachment' API for each of the attachments provided sequentially.
     * @param attachments
     */
    public saveAttachments(
        attachments?: Attachment[],
        draftVersion?: GitVersionDescriptor,
    ): IPromise<{}> {
        if (!attachments || attachments.length === 0) {
            return Q.resolve({});
        }
        let version: GitVersionDescriptor = null;
        if (draftVersion) {
            version = draftVersion;
        } else {
            version = this._wikiVersion;
        }
        // Initial promise to start the chaining
        let promise = Q.when({});

        for (let attachment of attachments) {
            promise = promise.then(() => {
                return this._wikiHttpClient.createAttachment(
                    attachment.base64Content,
                    this._wiki.projectId,
                    this._wiki.id,
                    attachment.file.guidSuffixedFileName,
                    // version - Task #1308767 - Save attachment to correct version of the wiki
                );
            });
        }

        return promise;
    }

    public setAsHomePage(
        pagePath: string,
    ): IPromise<WikiPageMoveResponse> {
        const deferred = Q.defer<WikiPageMoveResponse>();

        const currentPagePath = pagePath;
        const levelOnePagePath = convertToLevelOnePagePath(pagePath);

        let pageMoveParams: WikiPageMoveParameters;
        if (currentPagePath === levelOnePagePath) {
            // Page is already in level 1. So only order is changed to 0
            pageMoveParams = {
                path: pagePath,
                newOrder: 0,
            } as WikiPageMoveParameters;
        } else {
            pageMoveParams = {
                path: pagePath,
                newPath: levelOnePagePath,
                newOrder: 0,
            } as WikiPageMoveParameters;
        }

        this._wikiHttpClient.createPageMove(
            pageMoveParams,
            this._wiki.projectId,
            this._wiki.id).then(
                (pageMoveResponse: WikiPageMoveResponse) => deferred.resolve(pageMoveResponse),
                (error: Error) => deferred.reject(getWikiUpdateError(error, pagePath)));

        return deferred.promise;
    }

    private _deserializeWikiDataproviderData(data: WikiDataproviderData, pagePath: string): WikiPage[] {
        let deserializedPages: WikiPage[] = [];

        let individualPaths = getParentPaths(pagePath).concat(pagePath);
        individualPaths.forEach((path: string) => {
            /* We need to get all the parent paths of the pagePath and accumulate as arrays */
            if (data.pages[path]) {
                const page = data.pages[path];
                deserializedPages.push(...flattenWikiPage(page));
            }
        });

        return deserializedPages;
    }

    private _getDataProviderQuery(pagePath: string): DataProviderQuery {
        const query: DataProviderQuery = {
            context: {
                properties: {
                    "projectId": this._wiki.projectId,
                    "pagePath": pagePath,
                    "_a": "view",
                },
            },
            contributionIds: [ContributionKeys.WikiTreeDataProvider],
        };

        return query;
    }
}

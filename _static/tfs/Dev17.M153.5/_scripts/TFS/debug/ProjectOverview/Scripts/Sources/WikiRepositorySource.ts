import * as Q from "q";

import * as Context from "VSS/Context";
import * as Service from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import { GitRepository, VersionControlRecursionType } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { WikiV2, WikiPage, WikiPageResponse, WikiType } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getWikiReadError } from "Wiki/Scripts/ErrorHelper";
import { flattenWikiPage, isWikiHomePage } from "Wiki/Scripts/WikiPagesHelper";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export class WikiRepositorySource {
    constructor(
        private _repositoryContext?: GitRepositoryContext,
        private _wikiClient?: WikiHttpClient,
        private _gitClient?: GitHttpClient,
    ) { }

    public getWikiRepository(): IPromise<GitRepositoryContext> {
        const deferred = Q.defer<GitRepositoryContext>();
        if (!this._repositoryContext) {
            const tfsContext: TfsContext = TfsContext.getDefault();
            const projectId = tfsContext.contextData.project.id;

            // TODO: Task 1143105 Support for showing home page from multiple wikis in Project home page
            this._wikiHttpClient.getAllWikis(projectId).then(
                (wikis: WikiV2[]) => {
                    if (wikis.length === 0) {
                        deferred.resolve(undefined);
                    } else {
                        const projectWiki = Utils_Array.first(wikis, wiki => wiki.type == WikiType.ProjectWiki);

                        if (projectWiki) {
                            this._gitHttpClient.getRepository(projectWiki.repositoryId, projectWiki.projectId).then(
                                (repository: GitRepository) => {
                                    this._repositoryContext = new GitRepositoryContext(tfsContext, repository);
                                    deferred.resolve(this._repositoryContext);
                                },
                                (error: Error) => {
                                    deferred.reject(error);
                                });
                        } else {
                            deferred.reject(new Error(ProjectOverviewResources.NoProjectWikiFound));
                        }
                    }
                },
                deferred.reject
            );
        } else {
            deferred.resolve(this._repositoryContext);
        }

        return deferred.promise;
    }

    public getHomePagePath(): IPromise<string> {
        const pagePath = RepoConstants.RootPath;
        let deferred = Q.defer<string>();
        this._wikiHttpClient.getPage(
            Context.getPageContext().webContext.project.name,
            this._wikiRepositoryContext.getRepositoryId(),
            pagePath,
            VersionControlRecursionType.OneLevel
        ).then(
            (wikiPage: WikiPageResponse) => deferred.resolve(this._getHomePage(flattenWikiPage(wikiPage.page))),
            (error: Error) => deferred.reject(getWikiReadError(error, pagePath)),
        );

        return deferred.promise;
    }

    private _getHomePage(wikiPagesCollection: WikiPage[]): string {
        for (const page of wikiPagesCollection) {
            if (isWikiHomePage(page)) {
                return page.path;
            }
        }

        return null;
    }

    public getHomePageContent(homePagePath: string): IPromise<string> {
        const deferred = Q.defer<string>();
        this._wikiHttpClient.getPageText(
            Context.getPageContext().webContext.project.name,
            this._wikiRepositoryContext.getRepositoryId(),
            homePagePath).then(
            (content: string) => deferred.resolve(content),
            (error: Error) => deferred.reject(getWikiReadError(error, homePagePath)),
        );

        return deferred.promise;
    }

    private get _wikiRepositoryContext(): GitRepositoryContext {
        if (!this._repositoryContext) {
            this.getWikiRepository().then((wikiRepo: GitRepositoryContext) => this._repositoryContext = wikiRepo);
        }

        return this._repositoryContext;
    }

    private get _wikiHttpClient(): WikiHttpClient {
        if (!this._wikiClient) {
            this._wikiClient = Service.getClient(WikiHttpClient);
        }

        return this._wikiClient;
    }

    private get _gitHttpClient(): GitHttpClient {
        if (!this._gitClient) {
            this._gitClient = Service.getClient(GitHttpClient);
        }

        return this._gitClient;
    }
}

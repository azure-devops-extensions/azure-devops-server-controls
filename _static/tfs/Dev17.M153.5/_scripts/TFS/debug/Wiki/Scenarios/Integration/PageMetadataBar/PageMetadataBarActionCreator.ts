import * as Q from "q";

import { WikiV2, WikiPage, WikiPageViewStats } from "TFS/Wiki/Contracts";

import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import { PageMetadataBarActionsHub, PageMetadataLoadedPayload } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarActionsHub";
import { PageMetadataSource } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataSource";
import * as WikiPageArtifactHelpers from "Wiki/Scripts/WikiPageArtifactHelpers";

export interface Sources {
    pageMetadataSource: PageMetadataSource;
    linkWorkItemsSource: LinkWorkItemsSource;
}

export class PageMetadataBarActionCreator {
    constructor(
        private _wiki: WikiV2,
        private _actionsHub: PageMetadataBarActionsHub,
        private _sources: Sources,
    ) { }

    public get pageMetadataSource(): PageMetadataSource {
        return this._sources.pageMetadataSource;
    }

    public get linkWorkItemsSource(): LinkWorkItemsSource {
        return this._sources.linkWorkItemsSource;
    }

    /* Fetches metadata of wiki page
     * @param pagePath: reference to page path
     * @param gitItemPath: reference to gitItemPath of page
     * @param fetchPageViewStats: true if PageViewStats to be fetched
     */
    public getPageMetadata(pagePath: string, gitItemPath: string, fetchPageViewStats?: boolean): void {
        if (!pagePath || !gitItemPath) {
            return;
        }

        this.pageMetadataSource.getAuthorandRevisionsMetadata(gitItemPath).then(
            (metadata: Partial<PageMetadataLoadedPayload>) => this._actionsHub.pageMetadataLoaded.invoke(metadata),
            (error: Error) => { /* no-op for now */ },
        );

        if (fetchPageViewStats) {
            this.pageMetadataSource.updatePageViewStats(this._wiki.projectId, this._wiki.id, pagePath).then(
                (pageViewStats: WikiPageViewStats) => this._actionsHub.pageViewStatsLoaded.invoke(pageViewStats),
                (error: Error) => { /* no-op for now */ },
            );
        }

        this.getLinkedWorkItems(pagePath);
    }

    public getLinkedWorkItems(pagePath: string): void {
        const wikiPageArtifactId: string = WikiPageArtifactHelpers.getWikiPageArtifactId(
            this._wiki.projectId,
            this._wiki.id,
            pagePath,
        );

        this.linkWorkItemsSource.getWorkItemIdsForArtifactUri(
            WikiPageArtifactHelpers.getWikiPageArtifactUri(wikiPageArtifactId), this._wiki.projectId)
            .then(
            (workItemIds: number[]) => this._actionsHub.linkedWorkItemsFetched.invoke(workItemIds),
            (error: Error) => { /* TODO: Ginara */ },
        );
    }
}

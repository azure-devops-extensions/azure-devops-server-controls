import * as Q from "q";

import { autobind } from "OfficeFabric/Utilities";
import { WikiPage } from "TFS/Wiki/Contracts";
import { getParentPaths } from "VersionControl/Scripts/VersionControlPath";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getParentPagePath } from "Wiki/Scripts/Helpers";
import { ActionsHub } from "Wiki/Scenarios/Integration/PagePicker/ActionsHub";
import { AggregateState, StoresHub } from "Wiki/Scenarios/Integration/PagePicker/StoresHub";
import { WikiPagesState } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";

export interface Sources {
    wikiPagesSource: WikiPagesSource;
}

export class ActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _sources: Sources,
        private _getState: () => AggregateState,
    ) { }

    public get wikiPagesSource(): WikiPagesSource {
        return this._sources.wikiPagesSource;
    }

    /**
     * Fetches all the wiki pages from the wiki repository
     */
    public getAllPages(): IPromise<WikiPage[]> {
        const deferred = Q.defer<WikiPage[]>();

        this.wikiPagesSource.getAllWikiPages().then(
            (pages: WikiPage[]) => {
                this._actionsHub.allPagesRetrievalSucceeded.invoke({
                    allPages: pages,
                });

                deferred.resolve(pages);
            }, (error: Error) => {
                this._actionsHub.allPagesRetrievalFailed.invoke(error);
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * On filter cleared, loads all the items in the hierarchy of the selected path in the filtered tree
     * @param selectedPath - Selected path in the filtered tree
     */
    @autobind
    public onFilterCleared(selectedPath: string): void {
        if (!selectedPath) {
            return;
        }

        // getParentPaths("/a/b") => ["/a", "/"]. Reversing the paths to process from the root path.
        const individualPaths: string[] = getParentPaths(selectedPath).reverse().concat(selectedPath);
        individualPaths.forEach((path: string) => {
            this._getPageAndSubPages(path);
        });
    }

    /**
     * Gets the pages from the store for filtering
     */
    @autobind
    public getPagesToFilter(): IPromise<WikiPage[]> {
        const deferred = Q.defer<WikiPage[]>();
        const wikiPages: WikiPage[] = [];
        for (const path of Object.keys(this._getState().wikiPagesState.wikiPages)) {
            wikiPages.push(this._getState().wikiPagesState.wikiPages[path]);
        }

        deferred.resolve(wikiPages);
        return deferred.promise;
    }

    /**
     * Expands a parent page and populates its subpages into the tree
     * @param pagePath
     */
    @autobind
    public expandParentPage(pagePath: string): void {
        const wikiPage = this._getState().wikiPagesState.wikiPages[pagePath];

        this._actionsHub.pageExpanded.invoke({
			parentPath: pagePath,
            subPages: wikiPage.isParentPage ? wikiPage.subPages : [wikiPage],
        });
    }

    @autobind
    public collapseParentPage(pagePath: string): void {
        this._actionsHub.pageCollapsed.invoke(pagePath);
    }

    private _getPageAndSubPages(pagePath: string): void {
        if (pagePath === RepoConstants.RootPath) {
            // There is no page for root path
            return;
        }

        const wikiPage = this._getState().wikiPagesState.wikiPages[pagePath];
        this._actionsHub.subPagesAdded.invoke({
			parentPath: wikiPage.path,
            subPages: wikiPage.subPages,
        });
    }
}

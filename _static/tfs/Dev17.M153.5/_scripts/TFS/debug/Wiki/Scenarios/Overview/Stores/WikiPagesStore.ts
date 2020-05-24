import { Store } from "VSS/Flux/Store";
import { getParentPaths } from "VersionControl/Scripts/VersionControlPath";

import { WikiPage } from "TFS/Wiki/Contracts";
import {
    AllPagesRetrievedPayload,
    PageAddedPayload,
    PageDeletedPayload,
    PageRenamedPayload,
    PageReorderedPayload,
    PageReplacedPayload,
    PageRetrievedPayload,
    TempPageAddedPayload,
    TempPageDeletedPayload,
} from "Wiki/Scenarios/Overview/ViewActionsHub";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getDepthOfPage, getParentPagePath } from "Wiki/Scripts/Helpers";

export interface WikiPagesState {
    tempPage: WikiPage;
    homePage: WikiPage;
    wikiPages: IDictionaryStringTo<WikiPage>;
    areAllPagesFetched: boolean;
    /**
     * Currently reorder is the only operation which is not guarded by a dialog.
     * Hence, using a state specifically for reorder. If needed in future, this can be made generic.
     */
    isPageReorderInProgress: boolean;
}

export class WikiPagesStore extends Store {
    public state = {
        tempPage: null,
        homePage: null,
        wikiPages: {},
        areAllPagesFetched: false,
        isPageReorderInProgress: false,
    } as WikiPagesState;

    public loadRetrievedPages = (payload: PageRetrievedPayload): void => {
        this._loadPages(payload.allRetrievedPages);
    };

    public loadAllPages = (payload: AllPagesRetrievedPayload): void => {
        this.state.areAllPagesFetched = true;
        this._loadPages(payload.allPages);
    };

    public pageReorderStarted = (): void => {
        this.state.isPageReorderInProgress = true;

        this.emitChanged();
    }

    public addNewTemporaryPage = (payload: TempPageAddedPayload): void => {
        const depth = getDepthOfPage(payload.pagePath);
        const tempPage = {
            path: payload.pagePath,
            order: depth === 1 && this.state.homePage ? 1 : 0, // If depth is 1 and if home page is available, new page order is 1, else 0
			isParentPage: false,
			subPages: null,
            isNonConformant: false
        } as WikiPage;

        // Adding the new page to the state
        this.state.tempPage = tempPage;

        this.addPage({
            page: tempPage,
            pageIsOnlySubPageToNewParent: payload.pageIsOnlySubPageToNewParent
        });
    }

    public deleteNewTemporaryPage = (payload: TempPageDeletedPayload): void => {
        // Deleting the new page to the state
        delete this.state.tempPage;
        this.state.tempPage = null;

        this.deletePage({
            pagePath: payload.pagePath,
            isParentPage: false,
            pageWasOnlySubPageToOldParent: payload.pageWasOnlySubPageToOldParent
        });
    }

    public addPage = (payload: PageAddedPayload): void => {
        if (this._addPageToStore(payload)) {
            this.emitChanged();
        }
    }

    public deletePage = (payload: PageDeletedPayload): void => {
        if (this._deletePageFromStore(payload)) {
            this.emitChanged();
        }
    }

    public renamePage = (payload: PageRenamedPayload): void => {
        let shouldEmitChanged = this._deletePageFromStore({
            pagePath: payload.originalPagePath,
            isParentPage: payload.isParentPage,
            pageWasOnlySubPageToOldParent: payload.pageWasOnlySubPageToOldParent,
        });

        shouldEmitChanged = this._addPageToStore({
            page: {
                path: payload.newPagePath,
                order: payload.newOrder,
                isParentPage: payload.isParentPage
            } as WikiPage,
            pageIsOnlySubPageToNewParent: payload.pageIsOnlySubPageToNewParent,
        }) || shouldEmitChanged;

        if (shouldEmitChanged) {
            this.emitChanged();
        }
    }

    public reorderPage = (payload: PageReorderedPayload): void => {
        if (this.state.wikiPages[payload.pagePath]) {
            /*
                1. Find parent page
                2. If old order > new order => for pages with order (newOrder to oldOrder - 1), add 1.
                3. If oldOrder < newOrder => for pages with order (newOrder to oldOrder - 1), subtract 1.
                4. Place the current page with new Order
            */
            const originalOrder = payload.originalOrder;
            const newOrder = payload.newOrder;
            const parentPage = this.state.wikiPages[getParentPagePath(payload.pagePath)];

            const reorderPageWithSiblings = (siblings: WikiPage[] | IDictionaryStringTo<WikiPage>): WikiPage[] => {
                let siblingsArray: WikiPage[] = [];
                for (let siblingKey in siblings) {
                    const sibling = siblings[siblingKey];
                    sibling.order = sibling.order || 0;

                    if (sibling.path === payload.pagePath) {
                        // Updating the page to be reordered
                        sibling.order = newOrder;
                    } else {
                        // Updating other pages in-between the old and new order of the page
                        if (originalOrder > newOrder
                            && sibling.order >= newOrder
                            && sibling.order < originalOrder) {
                            sibling.order = sibling.order + 1;
                        } else if (originalOrder < newOrder
                            && sibling.order <= newOrder
                            && sibling.order > originalOrder) {
                            sibling.order = sibling.order - 1;
                        }
                    }                    

                    siblingsArray.push(sibling);
                }
                this._forceUpdatePages(siblingsArray);

                return siblingsArray;
            };

            if (parentPage) {
                const siblings = parentPage.subPages;

                // since we have a parent page we need to update its subpages
                this._forceUpdateSubPages(parentPage.path, reorderPageWithSiblings(siblings));
            } 

            this.state.isPageReorderInProgress = false;
            this.emitChanged();
        }
    }

    public replacePage = (payload: PageReplacedPayload): void => {
        let shouldEmitChanged = this._deletePageFromStore({
            pagePath: payload.page.path,
            isParentPage: payload.page.isParentPage,
            pageWasOnlySubPageToOldParent: payload.pageIsOnlySubPageToParent,
        });

        shouldEmitChanged = this._addPageToStore({
            page: payload.page,
            pageIsOnlySubPageToNewParent: payload.pageIsOnlySubPageToParent,
        }) || shouldEmitChanged;

        if (shouldEmitChanged) {
            this.emitChanged();
        }
    }

    private _addPageToStore(payload: PageAddedPayload): boolean {
        /*
            1. Find parent of this page
            2. Update the order = order + 1 for the siblings with order greater than its order
            3. Add current page to the its parent's subpages
            4. Force update its parent's subpages to the dictionary
        */
        const pageToBeAdded = payload.page;
        const orderOfPageToBeAdded = pageToBeAdded.order || 0;
        const parentPage = this.state.wikiPages[getParentPagePath(pageToBeAdded.path)];

        const addPageAmongstSiblings = (siblings: WikiPage[] | IDictionaryStringTo<WikiPage>): WikiPage[] => {
            let siblingsArrary: WikiPage[] = [];
            for (let siblingKey in siblings) {
                const sibling = siblings[siblingKey];
                sibling.order = sibling.order || 0;
                if (sibling.order >= orderOfPageToBeAdded) {
                    sibling.order = sibling.order + 1;
                }
                siblingsArrary.push(sibling);
            }

            siblingsArrary.push(pageToBeAdded);
            this._forceUpdatePages(siblingsArrary);

            return siblingsArrary;
        };

        if (!parentPage) {
            return false;
        }

        const siblings = parentPage.subPages;

        // since we have a parent page we need to update its subpages
        this._forceUpdateSubPages(parentPage.path, addPageAmongstSiblings(siblings));

        return true;
    }

    private _deletePageFromStore(payload: PageDeletedPayload): boolean {
        if (this.state.wikiPages[payload.pagePath]) {
            /*
                1. Find parent of this page
                2. Update the order = order - 1 for the siblings with order greater than its order
                3. Delete current page from its parent's subpages
                4. Force update its parent's subpages to the dictionary
                5. Remove subpages of the current deleted page from the dictionary
            */
            const parentPage = this.state.wikiPages[getParentPagePath(payload.pagePath)];
            const orderOfPageToBeDeleted = this.state.wikiPages[payload.pagePath].order || 0;

            const deletePageWithSiblings = (siblings: WikiPage[] | IDictionaryStringTo<WikiPage>): WikiPage[] => {
                let siblingsArrary: WikiPage[] = [];
                for (let siblingKey in siblings) {
                    const sibling = siblings[siblingKey];
                    sibling.order = sibling.order || 0;
                    if (sibling.path !== payload.pagePath) {
                        if (sibling.order > orderOfPageToBeDeleted) {
                            sibling.order = sibling.order - 1;
                        }
                        siblingsArrary.push(sibling);
                    }
                }

                this._forceUpdatePages(siblingsArrary);
                this._deletePage(payload.pagePath);

                return siblingsArrary;
            };

            if (!parentPage) {
                return false;
            }

            const siblings = parentPage.subPages;

            // since we have a parent page we need to update its subpages
            this._forceUpdateSubPages(parentPage.path, deletePageWithSiblings(siblings));

            return true;
        }

        return false;
    }

    private _loadPages(pages: WikiPage[]): void {
        let isSaved = false;

        if (pages && pages.length) {
            const pathsToUpdateConformancy: string[] = [];

            for (let page of pages) {
                if (page) {
                    pathsToUpdateConformancy.push(page.path);
                    this._addPage(page);
                    isSaved = true;

					if (page.subPages && page.subPages.length > 0) {
						for (let subPage of page.subPages) {
							pathsToUpdateConformancy.push(subPage.path);
							this._addPage(subPage);
                        }
                    }
                }
            }

            // Update conformancy for the retrieved pages
            this._updateConformancyForPages(pathsToUpdateConformancy);
        }

        if (isSaved) {
            this.emitChanged();
        }
    }

    private _addPage(newPage: WikiPage): void {
        const existingPage = this.state.wikiPages[newPage.path];

		if (existingPage
			&& (existingPage.subPages && existingPage.subPages.length > 0)
			&& (!newPage.subPages || newPage.subPages.length === 0)) {
            return;
        }

        if (getDepthOfPage(newPage.path) === 1) {
            const isNewPageSameAsTempPage = this.state.tempPage && this.state.tempPage.path === newPage.path;
            if (!newPage.order && !newPage.isNonConformant && !isNewPageSameAsTempPage) {
                this.state.homePage = newPage;
            }
        }
        
        this.state.wikiPages[newPage.path] = newPage;
    }

    private _forceUpdateSubPages(pagePath: string, subPages: WikiPage[]): void {
        let currentPage = this.state.wikiPages[pagePath];
        if (currentPage) {
            currentPage.subPages = subPages;
            currentPage.isParentPage = subPages && subPages.length > 0;

            // Updating the pages in the hierarchy up to the root
            while (currentPage && currentPage.path !== "/") {
                const parentPage = this.state.wikiPages[getParentPagePath(currentPage.path)];
                if (parentPage && parentPage.subPages && parentPage.subPages.length > 0) {
                    parentPage.subPages = parentPage.subPages.map((subPage: WikiPage) => {
                        if (subPage.path === currentPage.path) {
                            subPage = $.extend({}, true, currentPage);
                        }

                        return subPage;
                    })
                }

                currentPage = parentPage;
            }
        }
    }

    private _forceUpdatePages(pages: WikiPage[]): void {
        pages.forEach((page: WikiPage) => {
            if (page) {
                if (getDepthOfPage(page.path) === 1) {
                    const isNewPageSameAsTempPage = this.state.tempPage && this.state.tempPage.path === page.path;
                    if (!page.order && !page.isNonConformant && !isNewPageSameAsTempPage) {
                        this.state.homePage = page;
                    }
                }
                this.state.wikiPages[page.path] = page;
            }            
        });
    }

    private _deletePage(pagePath: string): void {
        const existingPage = this.state.wikiPages[pagePath];

		if (existingPage.subPages) {
			existingPage.subPages.forEach((subPage: WikiPage) => {
				delete this.state.wikiPages[subPage.path];
            });
        }

        if (this.state.homePage && this.state.homePage.path === pagePath) {
            delete this.state.homePage;
        }

        delete this.state.wikiPages[pagePath];
    }

    private _updateConformancyForPages(pagePaths: string[]): void {
        // It is sufficient to update conformancy in just state.wikiPages
        for (const path of pagePaths) {
            const page = this.state.wikiPages[path];
            page.isNonConformant = this._isPageOrAncestorNonConformant(page);
        }
    }

    private _isPageOrAncestorNonConformant(page: WikiPage): boolean {
        if (page.isNonConformant) {
            return true;
        }

        let isNonConformant = page.isNonConformant;
        const parentPaths = getParentPaths(page.path);
        parentPaths.every((parentPath: string): boolean => {
            const parentPage = this.state.wikiPages[parentPath];
            isNonConformant = isNonConformant || (parentPage && parentPage.isNonConformant);

            return !isNonConformant;
        });

        return isNonConformant;
    }
}

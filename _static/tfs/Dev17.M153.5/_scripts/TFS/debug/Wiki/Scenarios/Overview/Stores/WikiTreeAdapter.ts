import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { WikiPage } from "TFS/Wiki/Contracts";
import { getFolderName } from "VersionControl/Scripts/VersionControlPath";
import {
    PageAddedPayload,
    PageDeletedPayload,
    PageRenamedPayload,
    PageReorderedPayload,
    PageReplacedPayload,
    TempPageAddedPayload,
    TempPageDeletedPayload,
} from "Wiki/Scenarios/Overview/ViewActionsHub";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getParentPagePath } from "Wiki/Scripts/Helpers";

export class WikiTreeAdapter extends ActionAdapter {
    /*
        Task: 933157 Complete SmartTree Adapter for Wiki Tree
    */
    public startExpand = (path: string) => {
        this.folderExpanding.invoke(path);
        this.emitIfPending.invoke(null);
    }

    public collapse = (path: string) => {
        this.folderCollapsed.invoke(path);
        this.emitIfPending.invoke(null);
    }

    public selectPage = (path: string, page: WikiPage): void => {
        if (page && page.isParentPage) {
            this.addSubPagesAndExpand(page.subPages, page.path);
        } else if (path) {
            this.folderExpanded.invoke(path);
            this.emitIfPending.invoke(null);
        }
     }

    public addSubPagesAndExpandParent = (pages: WikiPage[], page: WikiPage): void => {
        // If we do not have the item to be expanded, expand root
		this.addSubPagesAndExpand(pages, getPathToExpand(page));
    }

    public addSubPagesAndExpand = (pages: WikiPage[], pathToExpand?: string): void => {
        if (pages) {
            const { leafPages, parentPages } = getLeafAndParentPages(pages);
            this.foldersAdded.invoke(parentPages);
            this.itemsAdded.invoke(leafPages);
        }

        if (pathToExpand) {
            this.folderExpanded.invoke(pathToExpand);
        }

        this.emitIfPending.invoke(null);
    }

    public addNewTemporaryPage = (payload: TempPageAddedPayload): void => {
        this._addPageToStore(
            payload.pagePath,
            false,  // No new temp page can be a parent page
            payload.pageIsOnlySubPageToNewParent
        );

        this.emitIfPending.invoke(null);
    }

    public deleteNewTemporaryPage = (payload: TempPageDeletedPayload): void => {
        this._deletePageFromStore(
            payload.pagePath,
            false,  // No new temp page can be a parent page
            payload.pageWasOnlySubPageToOldParent
        );

        this.emitIfPending.invoke(null);
    }

    public addPage = (payload: PageAddedPayload): void => {
        this._addPageToStore(
            payload.page.path,
            payload.page.isParentPage,
            payload.pageIsOnlySubPageToNewParent
        );

        this.emitIfPending.invoke(null);
    }

    public deletePage = (payload: PageDeletedPayload): void => {
        this._deletePageFromStore(
            payload.pagePath,
            payload.isParentPage,
            payload.pageWasOnlySubPageToOldParent);

        this.emitIfPending.invoke(null);
    }

    public renamePage = (payload: PageRenamedPayload): void => {
        this._deletePageFromStore(
            payload.originalPagePath,
            payload.isParentPage,
            payload.pageWasOnlySubPageToOldParent);

        this._addPageToStore(
            payload.newPagePath,
            payload.isParentPage,
            payload.pageIsOnlySubPageToNewParent);

        this.emitIfPending.invoke(null);
    }

    public reorderPage = (payload: PageReorderedPayload): void => {
        if (payload.isParentPage) {
            this.folderRemoved.invoke(payload.pagePath);
            this.foldersAdded.invoke([payload.pagePath]);
        } else {
            this.itemsRemoved.invoke([payload.pagePath]);
            this.itemsAdded.invoke([payload.pagePath]);
        }

        this.emitIfPending.invoke(null);
    }

    public replacePage = (payload: PageReplacedPayload): void => {
        this._deletePageFromStore(
            payload.page.path,
            payload.page.isParentPage,
            payload.pageIsOnlySubPageToParent);

        this._addPageToStore(
            payload.page.path,
            payload.page.isParentPage,
            payload.pageIsOnlySubPageToParent);

        this.emitIfPending.invoke(null);
    }

    private _addPageToStore(
        path: string,
        isParentPage: boolean,
        pageIsFirstSubPageToNewParent: boolean
    ): void {
        if (pageIsFirstSubPageToNewParent) {
            const parentPath = getParentPagePath(path);

            this.itemsRemoved.invoke([parentPath]);

            // The parent was previously an item, but now it is becoming a folder
            this.foldersAdded.invoke([parentPath]);
        }

        if (isParentPage) {
            this.foldersAdded.invoke([path]);
        } else {
            this.itemsAdded.invoke([path]);
        }

        // Expand the parent folder of the added page
        this.folderExpanded.invoke(getParentPagePath(path));
    }

    private _deletePageFromStore(
        path: string,
        isParentPage: boolean,
        pageIsLastSubPageToOldParent: boolean
    ): void {
        const parentPath = getParentPagePath(path);
        // If page is the last subPage of parent, we will have to make the parent page a leaf page on removal of current page
        // But, we would not want to do that with "/".
        if (pageIsLastSubPageToOldParent && parentPath !== RepoConstants.RootPath) {

            this.folderRemoved.invoke(parentPath);

            // The parent was previously a folder, but now it is becoming an item
            this.itemsAdded.invoke([parentPath]);
        }

        if (isParentPage) {
            this.folderRemoved.invoke(path);
        } else {
            this.itemsRemoved.invoke([path]);
        }
    }
}

function getPathToExpand(page: WikiPage): string {
    if (page) {
        return page.isParentPage
            ? page.path
            : getFolderName(page.path);
    } else {
        return RepoConstants.RootPath;
    }
}

function getLeafAndParentPages(pages: WikiPage[]): { leafPages: string[], parentPages: string[] } {
    const leafPages: string[] = [];
    const parentPages: string[] = [];

    const add = (page: WikiPage) => (page.isParentPage ? parentPages : leafPages).push(page.path);

    for (let page of pages) {
        if (page) {
            add(page);

			if (page.subPages) {
				for (let subPage of page.subPages) {
                    if (subPage) {
                        add(subPage);
                    }
                }
            }
        }
    }

    return { leafPages, parentPages };
}

import { WikiPage } from "TFS/Wiki/Contracts";
import { startsWith } from "VSS/Utils/String";
import { RepoConstants, TemplateConstants } from "Wiki/Scripts/CommonConstants";

export function flattenWikiPage(page: WikiPage): WikiPage[] {
    if (!page) {
        return [];
    }

    const pages: WikiPage[] = [];
    let unprocessedPages: WikiPage[] = [page];

    while (unprocessedPages.length > 0) {
        const tempPages: WikiPage[] = [];

        for (var unprocessedPage of unprocessedPages)
        {
			pages.push(unprocessedPage);
			tempPages.push(...unprocessedPage.subPages);
        }

        unprocessedPages = [];
        unprocessedPages.push(...tempPages);
    }

    return pages;
}

export function isPageWithoutAssociatedContent(page: WikiPage): boolean {
    return (page
        && page.isParentPage
        && page.gitItemPath == null)
        || (page
        && page.path === RepoConstants.RootPath);
}

/* Confirms if page can be navigated to or can be rendered
 * @param page: reference to wiki page if page is avialable
 * @param pagePath: reference to path if page is not available
 */
export function canNavigateToOrRenderPage(page: WikiPage, pagePath?: string): boolean {
    /**
     * To render or navigate to the page,
     * 1. The path should exist and should be non-root since there is no content to be navigated to or rendered
     * 2. The page should be conformant
     */
    if (page) {
        const isPathNonRoot: boolean = page.path !== RepoConstants.RootPath;
        return isPathNonRoot && isPageConformant(page);
    } else if (pagePath) {
        /* Page will not be available in project wiki page containing link, and on back navigation
         * For example page link in /abc1/def1 is used to navigate to /abc2/def2, and back navigated
         * In this case pagePath is used to check if page is navigatable
         */
        const isPathNonRoot: boolean = pagePath !== RepoConstants.RootPath;
        return pagePath && isPathNonRoot;
    }
}

export function isPageConformant(page: WikiPage): boolean {
    return page && !page.isNonConformant;
}

export function isWikiHomePage(page: WikiPage): boolean {
    if (page && page.order === 0 && !page.isNonConformant && page.path !== RepoConstants.RootPath) {
        return true;
    }

    return false;
}

export function isTemplate(path: string) : boolean {
    return startsWith(path, "/" + TemplateConstants.TemplateDirectory)
}

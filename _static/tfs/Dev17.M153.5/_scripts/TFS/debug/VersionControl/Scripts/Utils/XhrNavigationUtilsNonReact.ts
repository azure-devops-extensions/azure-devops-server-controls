import { HubsService } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as Service from "VSS/Service";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

export function xhrNavigateToUrl(link: string, targetHubId: string): boolean {
    const xhrHandler = Service.getLocalService(HubsService).getHubNavigateHandler(targetHubId, link);
    return xhrHandler(null);
}

/**
 * Reloads the current page using XHR navigation.
 */
export function refreshPage(): void {
    navigateToUrl(window.location.href, Service.getLocalService(HubsService).getSelectedHubId());
}

// Xhr navigation for the url provided along with the target HubId where url is navigating to
export function navigateToUrl(link: string, targetHubId: string): void {
    if (xhrNavigateToUrl(link, targetHubId)){
        setWindowLocation(link);
    }
}

export function setWindowLocation(link: string): void {
    window.location.href = link;
}

/**
 * Compares the repository in context with the repository in the current URL, and if they are not the same,
 * forces an XHR reload of the page using the provided target hub.
 * Does nothing for TFVC, navigating to and from TFVC already gets a reload from platform
 * because their routes use different contributions.
 * @returns True if a page reload is requested, so caller can stop processing page.
 */
export function reloadPageIfRepositoryChanged(repositoryContext: RepositoryContext, targetHubId: string): boolean {
    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        const navigationState = getNavigationHistoryService().getState();

        const gitRepositoryNamePropertyName = "GitRepositoryName";
        const repositoryInUrl = navigationState[gitRepositoryNamePropertyName] || navigationState.project;

        const repository = repositoryContext.getRepository();

        if (
            ignoreCaseComparer(repositoryInUrl, repository.id) !== 0
            && ignoreCaseComparer(repositoryInUrl, repository.name) !== 0
        ) {
            reloadPage(targetHubId);
            return true;
        }
    }

    return false;
}

/**
 * Forces a XHR reload of the current page.
 * Typically platform navigation will trigger this reload when a route changes enough,
 * but sometimes we need to detect changes of repository or PR Id and tell the platform to reload.
 */
export function reloadPage(targetHubId: string): void {
    navigateToUrl(window.location.href, targetHubId);
}

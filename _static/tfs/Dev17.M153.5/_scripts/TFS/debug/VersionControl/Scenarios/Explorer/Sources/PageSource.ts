import { NavigationView } from "VSS/Controls/Navigation";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { getCreatePullRequestUrl } from "VersionControl/Scripts/VersionControlUrls";

/**
 * A source of data from the current page view.
 */
export class PageSource {
    constructor(
        private readonly navigationView: NavigationView,
        private readonly repositoryContext: RepositoryContext) {
    }

    public getOptions(): any {
        return this.navigationView._options;
    }

    public setFullScreen = (isFullScreen: boolean): void => {
        this.navigationView.setFullScreenMode(isFullScreen);

        // Force a redraw/layout of the Monaco editor/diff that typically update on a window resize.
        $(window).trigger("resize");
    }

    public download(url: string): void {
        window.open(url, "_blank");
    }

    public navigateToCreatePullRequest(branchName: string, baseBranchName: string): void {
        const url = getCreatePullRequestUrl(this.repositoryContext as GitRepositoryContext, branchName, baseBranchName);
        navigateToUrl(url, CodeHubContributionIds.pullRequestHub);
    }

    public navigateToHistory(event: React.MouseEvent<HTMLLinkElement>, isGit: boolean, isCollectionLevel: boolean): void {
        const url = event.currentTarget.href;
        const hub = isGit
            ? CodeHubContributionIds.historyHub
            : isCollectionLevel
            ? CodeHubContributionIds.collectionChangesetsHub
            : CodeHubContributionIds.changesetsHub;

        onClickNavigationHandler(event, hub, url);
    }
}

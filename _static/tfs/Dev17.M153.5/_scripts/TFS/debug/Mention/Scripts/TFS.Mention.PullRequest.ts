/// <reference types="jquery" />
/// <reference types="q" />

import Diag = require("VSS/Diag");
import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import MentionResources = require("Mention/Scripts/Resources/TFS.Resources.Mention");
import URI = require("Presentation/Scripts/URI");
import Utils_String = require("VSS/Utils/String");
import { Constants } from "Mention/Scripts/TFS.Mention";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { HubsService } from "VSS/Navigation/HubsService";
import * as  Service from "VSS/Service";

export interface IPullRequestDetails {
    collectionId: string;
    repoId: string;
    projectId: string;
    pullRequestid: number;
    version: string;
}

export class PullRequestLinkProcessor {

    public static processHtml(html: JQuery) {

        const tfsContext = MentionHelpers.getMainTfsContext();

        Diag.Debug.assertParamIsNotNull(html, "html");

        PullRequestLinkProcessor._parseFromHtml(html, (anchor: JQuery, details: IPullRequestDetails) => {
            const url = anchor.attr("href");
            const renderedLink = PullRequestLinkProcessor._renderPullRequestLink(url, anchor.text(), details);

            if (renderedLink) {
                anchor.replaceWith(renderedLink);
            }
        });

        this._generateFpsLinks(html);
    }

    private static _parseFromHtml(html: JQuery, foundLink: (anchor: JQuery, details: IPullRequestDetails) => void) {
        Diag.Debug.assertParamIsNotNull(html, "html");

        const tfsContext = MentionHelpers.getMainTfsContext();

        // Find the permalinks we added
        const pullRequestMentions = html.find(`a[href*="/_permalink/_git/"][${Constants.HTML_MENTION_ATTR_NAME}^="version:1.0:pullrequest:"]`);

        // There really should only be 1, but in the off chance that someone copy/pasted multiple links
        // we will process all that we find.
        pullRequestMentions.each((i, elem) => {
            const anchor = $(elem);
            const accountUri = PullRequestLinkProcessor._getAccountUri(tfsContext);
            const url = anchor.attr("href");
            const index = url.indexOf("/_permalink");
            const prefix = url.substr(0, index + 1);

            if (Utils_String.ignoreCaseComparer(prefix, accountUri) === 0) {
                // Already has the right path, do nothing.
                return;
            }

            const detailsString = anchor.attr(Constants.HTML_MENTION_ATTR_NAME);
            const details = PullRequestLinkProcessor._getPullRequestDetails(detailsString);
            const collectionId = tfsContext.contextData.collection.id;

            if (Utils_String.ignoreCaseComparer(collectionId, details.collectionId) !== 0) {
                // Link is for a different collection, probably copy/pasted, do nothing.
                return;
            }

            if (details) {
                foundLink(anchor, details);
            }
        });

        if (!tfsContext.isHosted) {
            // Hosted only feature, we will not attempt to change legacy on prem links.
            return;
        }

        if (pullRequestMentions.length === 0 && html.length === 1) {
            // Now try to find the 'legacy' style links (best effort).
            // These links would be of the form http[s]://host:port/[tfs/]{collection}/[project/]_git/{repo}/pullrequest/{id}

            // Make sure the url matches what we are looking for...
            const oldPullRequestMentionCandidates = html.find('a[href^="http"][href*="/_git/"][href*="/pullrequest/"]');

            // Should be the only one that matches
            if (oldPullRequestMentionCandidates.length !== 1) {
                return;
            }

            const href = oldPullRequestMentionCandidates.attr("href");
            const accountUri = PullRequestLinkProcessor._getAccountUri(tfsContext);

            if (Utils_String.startsWith(href, accountUri, Utils_String.ignoreCaseComparer)) {
                // no host change, don't update it.
                return;
            }

            if (Utils_String.caseInsensitiveContains(href, "/_permalink/")) {
                // Make sure it's not a permalink, don't want to overwrite those.
                return;
            }

            // Strip out the 'a' tag and verify that the text is *exactly* what we expect.  
            const expectedText = Utils_String.format(MentionResources.GitPullRequestMentionWorkItemDiscussionMessageFormat, "");
            const htmlText = html.contents().not(html.children()).text();

            if (htmlText !== expectedText) {
                // Not exactly what we were looking for.
                return;
            }

            foundLink(oldPullRequestMentionCandidates, null);
        }
    }

    private static _renderPullRequestLink(url: string, linkText: string, details: IPullRequestDetails): JQuery {

        Diag.Debug.assertParamIsNotNull(url, "url");

        if (details) {
            return PullRequestLinkProcessor._renderPullRequestPermaLink(url, linkText);
        }
        else {
            // Old style link, best effort only
            return PullRequestLinkProcessor._renderPullRequestLegacyLink(url, linkText);
        }
    }

    private static _renderPullRequestLegacyLink(url: string, linkText: string): JQuery {

        Diag.Debug.assertParamIsNotNull(url, "url");
        Diag.Debug.assertParamIsNotNull(linkText, "linkText");

        const tfsContext = MentionHelpers.getMainTfsContext();
        const rootPath = PullRequestLinkProcessor._getAccountUri(tfsContext);
        const uri = new URI(url);
        const path = uri.path();
        const segments = path.split("/");

        if (segments[0] === "") {
            segments.shift();
        }

        if (segments[0] === "tfs") {
            // Best effort:  in general the virtual host was 'tfs' if it was specified at all.
            segments.shift();
        }

        if (segments.length > 2 && Utils_String.equals(segments[0], tfsContext.contextData.collection.name, true) && !Utils_String.equals(segments[1], "_git", true)) {
            // If the url is of the form "codedev.ms/accountName/project/_git*", we should ignore accountName,
            // since rootPath already points to the account url.
            // Also check for the second segment to not be "_git" to handle the edge case wherein the collection and project names are same.
            // We can't look up for projectName since tfsContext is not guaranteed to have project context.
            segments.shift();
        }

        // Create the new url based on the current collection path and the remains of the path provided.
        const newUrl = rootPath + segments.join("/");

        return $("<a>").text(linkText).attr("href", newUrl);
    }

    private static _renderPullRequestPermaLink(url: string, linkText: string): JQuery {

        Diag.Debug.assertParamIsNotNull(url, "url");
        Diag.Debug.assertParamIsNotNull(linkText, "linkText");

        const tfsContext = MentionHelpers.getMainTfsContext();

        // onprem rootPath should be something like http://host:8080/tfs/ (though 'tfs' is optional), 
        // on hosted it should be something like https://host.visualstudio.com/
        // Update the host path to match the context.
        const rootPath = PullRequestLinkProcessor._getAccountUri(tfsContext);
        const index = url.indexOf("/_permalink");
        const newUrl = rootPath + url.substr(index + 1);  // +1 to skip over '/' at the beginning of /_permalink

        return $("<a>").text(linkText).attr("href", newUrl);
    }

    private static _getPullRequestDetails(details: string): IPullRequestDetails {
        Diag.Debug.assertParamIsNotNull(details, "details");

        let prDetails: IPullRequestDetails = null;
        const components = details.split(":");

        // Format: version:{version}:pullrequest:{collectionId}:{projectId}:{repoid}:{pullrequestId}"
        if (components && components.length === 7 && components[0] === "version" && components[2] === "pullrequest") {

            prDetails = {
                version: components[1],
                collectionId: components[3],
                projectId: components[4],
                repoId: components[5],
                pullRequestid: parseInt(components[6])
            };
        }

        return prDetails;
    }

    private static _getAccountUri(tfsContext: TfsContext): string {
        let rootPath = tfsContext.contextData.account.uri;
        if (!Utils_String.endsWith(rootPath, "/")) {

            rootPath += "/";
        }

        return rootPath;
    }

    private static _generateFpsLinks(html: JQuery): void {
        const prMentionsLinks = html.find(`a[href*="/_git/"][href*="/pullrequest/"][${Constants.HTML_MENTION_ATTR_NAME}*="version:"]`);
        prMentionsLinks.each((index, element) => {
            const linkElement = $(element);
            linkElement.click(Service.getLocalService(HubsService).getHubNavigateHandler("ms.vss-code-web.pull-request-hub", linkElement.attr("href")));
        });
    }
}

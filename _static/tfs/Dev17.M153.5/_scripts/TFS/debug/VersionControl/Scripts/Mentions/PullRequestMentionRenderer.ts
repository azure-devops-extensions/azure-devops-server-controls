/// <reference types="jquery" />

import * as Q from "q";
import { 
    IMentionsRenderingProvider, 
    IMentionTextPart,
    MentionRendererHTMLComponent
} from "Mention/Scripts/TFS.Mention";
import { IAutocompletePluginOptions } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { PullRequestMention } from "VersionControl/Scripts/Mentions/PullRequestMention";
import { PullRequestMentionDataProvider } from "VersionControl/Scripts/Mentions/PullRequestMentionDataProvider";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { htmlEncode } from "VSS/Utils/UI";
import {HubsService} from "VSS/Navigation/HubsService";
import * as  Service from "VSS/Service";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";


/**
 * This is used to render PR mentions after they've been found inside text/html content
 */
export class PullRequestMentionsRenderer implements IMentionsRenderingProvider {
    constructor() {
    }

    public dispose(): void {
    }

    public getArtifactType(): string { 
        return "PullRequest"; 
    }
    
    /**
     * Given a Pull Request mention, this will fetch the pull request to get its title
     * and then render the mention so that text content like !123 will become a nice looking PR link
     */
    public renderMention(
        mention: IMentionTextPart,
        insertHtml: (html: string) => JQuery,
        options?: IAutocompletePluginOptions): IPromise<MentionRendererHTMLComponent> {

        return this.findPullRequestById(mention.ArtifactId).then(prMention => {
            const renderedPR = `<a class="mention-widget-item" href="${prMention.url}">` +
                `<i class="bowtie-icon bowtie-tfvc-pull-request pr-icon"/>` +
                `<span class="mention-widget-typeid">${VCResources.PullRequest_PRText} ${prMention.id}: </span>` +
                `<span class="mention-widget-title">${htmlEncode(prMention.title)}</span>` +
            `</a>`;

            const link = $(renderedPR);
            link.click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.pullRequestHub, prMention.url));
            let prMentionHtmlComponent: MentionRendererHTMLComponent = {
                htmlComponent: link,
                displayText: `${VCResources.PullRequest_PRText} ${prMention.id}: ${htmlEncode(prMention.title)}`
            }
            return prMentionHtmlComponent;
        });
    }

    public getTelemetryMentionSummary(mention: IMentionTextPart): string {
        return `${this.getArtifactType()}:${mention.ArtifactId}`;
    }

    private findPullRequestById(id: string): IPromise<PullRequestMention> {
        var prId = parseInt(id);
        return PullRequestMentionDataProvider.instance().getPullRequests([prId])[prId];
    }
}

export function createRenderer(): PullRequestMentionsRenderer {
    return new PullRequestMentionsRenderer();
}
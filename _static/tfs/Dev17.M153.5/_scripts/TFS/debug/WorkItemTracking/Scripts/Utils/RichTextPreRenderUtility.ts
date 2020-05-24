import { Constants } from "Mention/Scripts/TFS.Mention";
import * as Mention_People_Async from "Mention/Scripts/TFS.Mention.People";
import * as Mention_PullRequest_Async from "Mention/Scripts/TFS.Mention.PullRequest";
import * as Mention_WorkItems_Async from "Mention/Scripts/TFS.Mention.WorkItems";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { sanitizeExternalLinks } from "WorkItemTracking/Scripts/Utils/CommentUtils";
import { vsUrlprocessHtml } from "WorkItemTracking/Scripts/Utils/VsUrlProcessor";
import * as VSS from "VSS/VSS";
import { IWorkItemMentionRenderOptions } from "Mention/Scripts/WorkItem/WorkItemMentionModels";

export function richTextFilterContent(content: string): Promise<string> {
    return new Promise<string>((resolve) => {
        const $content = $("<div>").append(content);
        VSS.using(["Mention/Scripts/TFS.Mention.WorkItems"], (MentionWorkItems: typeof Mention_WorkItems_Async) => {
            MentionWorkItems.WorkItemMentionProcessor.filterHtml($content);
            resolve($content.html());
        });
    });
}

export function richTextPreRenderProcessor($container: JQuery, enableContactCard: boolean, renderOptions?: IWorkItemMentionRenderOptions) {

    VSS.using(["Mention/Scripts/TFS.Mention.WorkItems", "Mention/Scripts/TFS.Mention.People", "Mention/Scripts/TFS.Mention.PullRequest"],
        (MentionWorkItems: typeof Mention_WorkItems_Async, MentionPeople: typeof Mention_People_Async, MentionPullRequest: typeof Mention_PullRequest_Async) => {
            MentionPeople.PeopleMentionProcessor.processHtml($container, enableContactCard);
            MentionWorkItems.WorkItemMentionProcessor.processHtml($container, renderOptions);
            MentionPullRequest.PullRequestLinkProcessor.processHtml($container);
            vsUrlprocessHtml($container);
            sanitizeExternalLinks($container);
        });
}

export function normalizeHtmlValue(message: string) {
    return WITOM.Field.normalizeHtmlValue(message, [Constants.HTML_MENTION_ATTR_NAME], ["height", "white-space", "word-wrap"]);
}
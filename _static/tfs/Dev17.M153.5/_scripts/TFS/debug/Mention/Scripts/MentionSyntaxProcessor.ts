/// <amd-dependency path='VSS/LoaderPlugins/Css!Mention' />
import * as Q from "q";

import { CustomSyntaxProcessor } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

import { 
    IMentionTextPart, 
    MentionProcessor, 
    TextPartType, 
    MentionRendererHTMLComponent 
} from "Mention/Scripts/TFS.Mention";

export class MentionSyntaxProcessor implements CustomSyntaxProcessor {
    private _replacementMap: { [guid: string]: MentionRendererHTMLComponent };

    public constructor(
        private _mentionProcessor: MentionProcessor = MentionProcessor.getDefault(),
    ) { }

    public preProcess(markdown: string): IPromise<string> {
        // Note: this most of this code is duplicated in DiscussionRenderer (consolidate at some point)
        return this._mentionProcessor.parseInput(markdown).then(commentParts => {
            const mentionPromises: Q.Promise<MentionRendererHTMLComponent>[] = [];
            for (const commentPart of commentParts) {
                if (commentPart.Type === TextPartType.Mention) {
                    const $tempContainer: JQuery = $("<span></span>");
                    const mentionPromise = this._mentionProcessor.getMentionsRenderer().renderMention($tempContainer, commentPart as IMentionTextPart);
                    // converting the jquery promise to q promise to make use of allSettled
                    mentionPromises.push(Q(mentionPromise));
                }
            }

            return Q.allSettled(mentionPromises).then(results => {
                let mentionIndex = 0;
                let stringWithMentions = "";
                this._replacementMap = {};
                for (const commentPart of commentParts) {
                    const isMention = commentPart.Type === TextPartType.Mention;
                    if (isMention && results[mentionIndex].state === "fulfilled") {
                        // remove the hyphens so that our placeholder token is only alphanumeric and won't trigger anything in the markdown processor
                        const replacementGuid = GUIDUtils.newGuid().replace(new RegExp("-", "g"), "");
                        this._replacementMap[replacementGuid] = results[mentionIndex].value;
                        // hack: we need to wrap replacementGuid into quotes for proper handling 
                        // of cases where #mention is a part of a header in Table of Contents.
                        const replacementString = `"` + replacementGuid + `"`;
                        stringWithMentions += replacementString;
                    } else if (isMention) {
                        // for unfulfilled mention (anonymous scenario where work item is private), show mention text with code block style
                        // note: either use code, escape with backslash, or add to replacementMap (don't render as-is)
                        stringWithMentions += `\`${commentPart.Text}\``;
                    } else {
                        stringWithMentions += commentPart.Text;
                    }

                    if (commentPart.Type === TextPartType.Mention) {
                        mentionIndex++;
                    }
                }

                return stringWithMentions;
            });
        });

    }

    /**
     * We need to maintain the handlers (such as click) contained within the jquery element provided by mention processing
     * So, the first pass replaces the guids with a made up tag with id equal to that guid
     * Then we convert the string into jquery, and the second pass replaces the fake <mention id=guid> tags with the real thing
     * Two passes are needed because the first guid replacement can't have any characters that might interact with markdown
     * And I don't think there's a clean way to use jquery to replace the body content with a jquery object
     */
    public postProcess(markup: string): string {
        const replacementMap = this._replacementMap;
        if (!replacementMap) {
            return markup;
        }

        const guids = Object.keys(replacementMap);
        if (guids.length === 0) {
            return markup;
        }

        for (const guid of guids) {
            const replacement = `<mention id='${guid}'/>`;
            // replace plain text quoted mentions.
            const searchStringEscaped = `&quot;` + guid + `&quot;`;
            markup = markup.replace(searchStringEscaped, replacement);
            // replace mentions in Table of Contents
            const searchString = `"` + guid + `"`;
            markup = markup.replace(searchString, replacement);
        }

        /**
         * Wrap with a div so that JQuery won't fail parsing url encoded (not recognized) tags
         * e.g., <foo> will be changed to &lt;foo> by santizer
         */
        const $markup = $(`<div>${markup}</div>`);
        for (const guid of guids) {
            const $mention = $markup.find("mention#" + guid);
            if ($mention) {
                $mention.each(function(mentionIndex, mentionElement) { 
                    // If the any parent tag of mention is an anchor, then don't render the mention html component,
                    // just render the plain display text. This is because anchor link can't be nested. 
                    // This is specifically to handle the TOC, where header contains mentions. #1348107
                    let isInsideAchor = false;
                    $(mentionElement).parents().each(function(index, element) {
                        if ($(element).is("a")) {
                            isInsideAchor = true;
                            return;
                        }
                    });
                    if (isInsideAchor) { 
                        $(mentionElement).replaceWith(replacementMap[guid].displayText);
                    } else {
                        $(mentionElement).replaceWith(replacementMap[guid].htmlComponent);
                    }
                });
            }
        }

        return $markup.html();
    }
}

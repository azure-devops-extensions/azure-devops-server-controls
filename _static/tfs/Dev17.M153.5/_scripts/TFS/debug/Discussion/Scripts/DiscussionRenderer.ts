import * as VSS from "VSS/VSS";
import * as Q from "q";
import * as Mention from "Mention/Scripts/TFS.Mention";
import * as HighlightJS_ASYNC from "ContentRendering/References/highlight.pack";
import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import { htmlEncode } from "VSS/Utils/UI";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { autobind } from "OfficeFabric/Utilities";

/**
 * Renders a discussion string with mentions and markdown
 * everything here involving background workers is for experimental purposes and
 * is currently disabled (s_useWebWorkers is always false) because it has huge problems
 * Also it likes to completely crash chrome with an error of 'pipe error'
 *
 * We need to handle mention rendering and markdown simultaneously
 * The way we handle this is by letting mentions parse the string first and break it up into
 * text and mention segments. We then render the mention segments and store them in a map while
 * replacing them in the string with guid placeholders. We then pass this string with placeholders into the markdown processor.
 * Once we have the output from the markdown library, we go through and insert the mentions html into the markdown html
 */
export class DiscussionRenderer {
    private _markdownRendererPromise: IPromise<MarkdownRenderer> = null;
    private _mentionProcessor: Mention.MentionProcessor = null;
    private _markdownOptions: MarkdownRendererOptions = null;
    private _katexLoadedDeferred = Q.defer<void>();
    private _katexLoaded: boolean = false;

    public constructor({ markdownOptions = defaultMarkdownOptions(), mentionProcessor = Mention.MentionProcessor.getDefault() } = {}) {
        this._mentionProcessor = mentionProcessor;
        this._markdownOptions = markdownOptions;
    }

    @autobind
    public render(discussion: string): IPromise<JQuery> {

        let renderedPromise = Q.defer<JQuery>();

        // Note: this most of this code is copied from MentionSyntaxProcessor (consolidate at some point)
        this._mentionProcessor.parseInput(discussion).then(commentParts => {
            let mentionPromises: Q.Promise<Mention.MentionRendererHTMLComponent>[] = [];
            $.each(commentParts, (index, commentPart) => {
                if (commentPart.Type === Mention.TextPartType.Mention) {
                    let $tempContainer: JQuery = $("<span></span>");
                    let mentionPromise = this._mentionProcessor.getMentionsRenderer().renderMention($tempContainer, commentPart as Mention.IMentionTextPart);
                    // converting the jquery promise to q promise to make use of allSettled
                    mentionPromises.push(Q(mentionPromise));
                }
            });
    
            Q.allSettled(mentionPromises).then(results => {
                let mentionIndex = 0;
                let stringWithMentions = "";
                let replacementMap: { [guid: string]: Mention.MentionRendererHTMLComponent } = {};
                $.each(commentParts, (index, commentPart) => {
                    const isMention = commentPart.Type === Mention.TextPartType.Mention;
                    if (isMention && results[mentionIndex].state === "fulfilled") {
                        // remove the hyphens so that our placeholder token is only alphanumeric and won't trigger anything in the markdown processor
                        let replacementGuid = GUIDUtils.newGuid().replace(new RegExp("-", "g"), "");
                        replacementMap[replacementGuid] = results[mentionIndex].value;
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
    
                    if (commentPart.Type === Mention.TextPartType.Mention) {
                        mentionIndex++;
                    }
                });
    
                this._renderMarkdown(stringWithMentions).then(markup => {
                    let markupWithMentions = this._replaceMentionPlaceholders(markup, replacementMap);
                    renderedPromise.resolve(markupWithMentions);
                }).then(null, error => {
                    renderedPromise.reject(error);
                });
            });
        })

        return renderedPromise.promise;
    }

    // We need to maintain the handlers (such as click) contained within the jquery provided by mention processing
    // So, the first pass replaces the guids with a made up tag with id equal to that guid
    // Then we convert the string into jquery, and the second pass replaces the fake <mention id=guid> tags with the real thing
    // Two passes are needed because the first guid replacement can't have any characters that might interact with markdown
    // And I don't think there's a clean way to use jquery to replace the body content with a jquery object
    private _replaceMentionPlaceholders = (markup: string, replacementMap: { [guid: string]: Mention.MentionRendererHTMLComponent }): JQuery => {
        $.each(replacementMap, (guid) => {
            const replacement = `<mention id='${guid}'/>`;
            // replace plain text quoted mentions.
            const searchStringEscaped = `&quot;` + guid + `&quot;`;
            markup = markup.replace(searchStringEscaped, replacement);
            // replace mentions in Table of Contents
            const searchString = `"` + guid + `"`;
            markup = markup.replace(searchString, replacement);
        });
        let $markup = $(markup);
        $.each(replacementMap, (guid, replacement) => {
            $markup.find("mention#" + guid).replaceWith(replacement.htmlComponent);
        });
        return $markup;
    }

    private _renderMarkdown = (content: string): IPromise<string> => {
        const HIGHLIGHTJS_MODULE_NAME = "ContentRendering/References/highlight.pack";

        if(!this._markdownRendererPromise) {
            this._markdownRendererPromise = Q.Promise((resolve, reject) => {
                VSS.using([HIGHLIGHTJS_MODULE_NAME], (highlightjs: typeof HighlightJS_ASYNC) => {
                    if(this._markdownOptions.highlight === undefined) {
                        this._markdownOptions.highlight = function (str, lang) {
                            if (lang && highlightjs.getLanguage(lang)) {
                                try {
                                    return `<pre class=\"hljs\"><code class=\"${lang.toLowerCase()}\">${highlightjs.highlight(lang, str, true).value}</code></pre>`;
                                } catch (__) { }
                            }

                            return "<pre class=\"hljs\"><code>" + htmlEncode(str) + "</code></pre>";
                        };

                    }

                    this._markdownOptions.onKatexLoad = this._onKatexLoaded;

                    let renderer = new MarkdownRenderer(this._markdownOptions);
                    resolve(renderer);
                }, (error) => {
                    reject(error);
                    // clear current promise and undef module to be able to retry again.
                    this._markdownRendererPromise = null;
                    requirejs.undef(HIGHLIGHTJS_MODULE_NAME);
                });
            });
        }

        return this._markdownRendererPromise.then(renderer => {
            // katex isn't guaranteed to be finished spinning up when the renderer promise is finished
            // If katex isn't ready to go, and we detect that katex is needed to render this comment,
            // await katex before running the renderer.
            // If a comment doesn't need katex, it can go ahead and pass through the renderer.
            if(this._markdownOptions.katex && !this._katexLoaded && this._isKatexNeeded(content)) {
                return this._katexLoadedDeferred.promise.then(() => {
                    return renderer.renderHtml(content);
                });
            }
            else {
                return renderer.renderHtml(content);
            }
        });
    }

    @autobind
    private _onKatexLoaded(): void {
        this._katexLoaded = true;
        this._katexLoadedDeferred.resolve();
    }

    private _isKatexNeeded(content: string): boolean {
        const katexBlockRe = /\$[^\$]+\$/;
        return katexBlockRe.test(content);
    }
}

export function defaultMarkdownOptions(): MarkdownRendererOptions {
    return {
        breaks: true,
        linkify: true,
        typographer: false,
        emoji: true,
        hideExternalImageIcon: true,
        imageSize: true,
        katex: true,
        linkifyTlds: ["biz", "com", "edu", "gov", "net", "org", "pro", "web", "aero", "asia", "coop", "info", "museum", "name", "shop", "рф", "io"],
        highlight: undefined, // will be set asynchronously if left undefined
        validateLink: validateLinkProtocol
    }
}

// Inspect the provided urls for all protocols we want to prevent
// The markdown-it defaults are to allow the data protocol if it is an image but
// we don't want to allow embeded images that we'll have to scan for malicious content
const BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;
export function validateLinkProtocol(url) {
    var str = url.trim().toLowerCase();
    return !BAD_PROTOCOLS.test(str);
}
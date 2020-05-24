import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, css } from "OfficeFabric/Utilities";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import * as HighlightJS_ASYNC from "ContentRendering/References/highlight.pack";
import * as Diag from "VSS/Diag";
import * as Performance from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";
import { htmlEncode } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";

import { CustomSyntaxProcessor } from "Presentation/Scripts/TFS/TFS.ContentRendering";

import "VSS/LoaderPlugins/Css!Presentation/Components/MarkdownRendererAsync";

export interface MarkdownRendererAsyncProps {
    rawContent: string;
    className?: string;
    customSyntaxProcessor?: CustomSyntaxProcessor;
    options?: MarkdownRendererOptions;
    linkClickHandler?(event: MouseEvent): boolean;
    onInitialRender?: () => void;
    loadedContributionsCount?: number;
    injectExtensionMarkup?: () => void;
    previewMode?: Number;
}

export interface MarkdownRendererAsyncState {
    renderedHtml: string;
}

export class MarkdownRendererAsync extends React.PureComponent<MarkdownRendererAsyncProps, MarkdownRendererAsyncState> {
    private static _fallbackHtmlForCodeBlock(code: string): string {
        return Utils_String.format(MarkdownRendererAsync._htmlFormatStringForCodeBlock, htmlEncode(code));
    }

    private static readonly _htmlFormatStringForCodeBlock = `<pre class="hljs"><code{1}>{0}</code></pre>`;
    private _highlightjs: typeof HighlightJS_ASYNC;
    private _markdownContainer: HTMLDivElement;
    private _scenario: Performance.IScenarioDescriptor;
    private _renderer: MarkdownRenderer;
    private _customSyntaxProcessor: AdditionalSyntaxProcessor;
    private _syntaxBasedOptions: MarkdownRendererOptions = {};
    private _isMounted = false;

    constructor(props: MarkdownRendererAsyncProps) {
        super(props);

        this._scenario = Performance.getScenarioManager().startScenario("Presentation", "RenderMarkdownAsync");
        this._renderer = this._createMarkdownRenderer(props.options);
        this._customSyntaxProcessor = new AdditionalSyntaxProcessor(this.props.customSyntaxProcessor, this.reconfigWithAdditionalOptions);
        this.state = {
            renderedHtml: this._renderer.renderHtml(props.rawContent),
        };
    }

    public componentDidMount(): void {
        this._isMounted = true;
        this._attachLinkClickHandler();
        if (this.props.onInitialRender) {
            this.props.onInitialRender();
        }
        this._renderHtml(this.props.rawContent);
    }

    public componentDidUpdate(prevProps: MarkdownRendererAsyncProps): void {
        this._attachLinkClickHandler();
        if (this.props.injectExtensionMarkup) {
            this.props.injectExtensionMarkup();
        }
    }

    public componentWillReceiveProps(nextProps: MarkdownRendererAsyncProps): void {

        if (this.props.options !== nextProps.options) {
            this._renderer = this._createMarkdownRenderer(nextProps.options);
            this._renderHtml(nextProps.rawContent);
            return;
        }
        if (this.props.rawContent !== nextProps.rawContent
            || this.props.loadedContributionsCount !== nextProps.loadedContributionsCount
            || this.props.previewMode !== nextProps.previewMode) {
            this._renderHtml(nextProps.rawContent);
        }
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
    }

    public render(): JSX.Element {
        return (
            <div
                className={css("markdown-renderer-async", this.props.className)}
                dangerouslySetInnerHTML={{ __html: this.state.renderedHtml }}
                ref={this._setMarkdownContainer}
            />
        );
    }

    public get getRenderedContent(): string {
        return this._markdownContainer.innerHTML;
    }

    @autobind
    private reconfigWithAdditionalOptions(additionalOptions: MarkdownRendererOptions): void {
        if (additionalOptions.katex) {
            this._syntaxBasedOptions = {
                katex: true,
                onKatexLoad: () => this._renderHtml(this.props.rawContent),
            };
        }

        this._renderer = this._createMarkdownRenderer(this.props.options);
    }

    private _attachLinkClickHandler(): void {
        if (!this._markdownContainer) {
            return;
        }

        const linksCollection: NodeListOf<HTMLAnchorElement> = this._markdownContainer.getElementsByTagName("a");
        for (let i = 0; i < linksCollection.length; i++) {
            const link = linksCollection[i];
            if (Utils_String.endsWith(link.href, "Invalid uri value")) {
                // Block invalid uri filtered by html sanitizer
                link.href = "#";
            } else {
                link.onclick = this.props.linkClickHandler;
            }
        }
    }

    private _createMarkdownRenderer(overriddenOptions: MarkdownRendererOptions): MarkdownRenderer {
        const options: MarkdownRendererOptions = {
            emoji: true,
            highlight: this._highlight,
            imageSize: true,
            linkify: true,
            linkifyTlds: ["biz", "com", "edu", "gov", "net", "org", "pro", "web", "aero", "asia", "coop", "info", "museum", "name", "shop", "рф", "io"],
            typographer: false,
            validateLink: validateLinkProtocol,
            ...overriddenOptions,
            ...this._syntaxBasedOptions,
        };

        return new MarkdownRenderer(options);
    }

    @autobind
    private _highlight(code: string, language: string): string {
        if (!language) {
            return MarkdownRendererAsync._fallbackHtmlForCodeBlock(code);
        }

        if (this._highlightjs) {
            return this._tryHighlight(code, language);
        }

        const HIGHLIGHTJS_MODULE_NAME = "ContentRendering/References/highlight.pack";
        VSS.using(
            [HIGHLIGHTJS_MODULE_NAME],
            (highlightjs: typeof HighlightJS_ASYNC) => {
                if (this._highlightjs) {
                    return this._tryHighlight(code, language);
                }

                this._highlightjs = highlightjs;
                this._scenario.addSplitTiming("HighlightJsDownloaded");
                this._renderHtml(this.props.rawContent);
                if (this._scenario.isActive()) {
                    this._scenario.end();
                }
            },
            error => requirejs.undef(HIGHLIGHTJS_MODULE_NAME),
        );
    }

    private _postProcessRenderedHtml(markdown: string): void {
        let renderedHtml = this._renderer.renderHtml(markdown);
        if (this._customSyntaxProcessor) {
            renderedHtml = this._customSyntaxProcessor.postProcess(renderedHtml);
            if (this._scenario.isActive()) {
                this._scenario.end();
            }
        }
        this.setState({ renderedHtml });
    }

    private _renderHtml(rawContent: string): void {
        if (this._customSyntaxProcessor) {
            this._customSyntaxProcessor.preProcess(rawContent).then((value: string) => {
                if (this._isMounted) {
                    this._postProcessRenderedHtml(value);
                    this._scenario.addSplitTiming("CustomSyntaxProcessed");
                }
            });
            return;
        }

        this._postProcessRenderedHtml(rawContent);
    }

    @autobind
    private _setMarkdownContainer(ref: HTMLDivElement): void {
        this._markdownContainer = ref;
    }

    private _tryHighlight(code: string, language: string): string {
        try {
            const languageClass = ` class="${language}"`;
            return Utils_String.format(MarkdownRendererAsync._htmlFormatStringForCodeBlock, this._highlightjs.highlight(language, code, true).value, languageClass);
        } catch (e) {
            Diag.Debug.logInfo("Failed to highligt: " + e);
            return MarkdownRendererAsync._fallbackHtmlForCodeBlock(code);
        }
    }
}

class AdditionalSyntaxProcessor implements CustomSyntaxProcessor {
    private _onAdditionalSyntax: (options: MarkdownRendererOptions) => void = null;
    private _baseSyntaxProcessor: CustomSyntaxProcessor = null;
    private _mathPluginEnabled = false;

    public constructor(
        baseSyntaxProcessor: CustomSyntaxProcessor,
        onAdditionalSyntax: (options: MarkdownRendererOptions) => void,
    ) {
        this._onAdditionalSyntax = onAdditionalSyntax;
        this._baseSyntaxProcessor = baseSyntaxProcessor;
    }

    public preProcess(markdown: string): IPromise<string> {
        const deferredContent = Q.defer<string>();

        if (this._baseSyntaxProcessor) {
            const markdownPromise: IPromise<string> = this._baseSyntaxProcessor.preProcess(markdown);
            markdownPromise.then((markdownWithMention: string) => {
                deferredContent.resolve(markdownWithMention);
            });
        } else {
            deferredContent.resolve(markdown);
        }

        return deferredContent.promise;
    }

    public postProcess(markup: string): string {
        const markupWithMentions = this._baseSyntaxProcessor
            ? this._baseSyntaxProcessor.postProcess(markup)
            : markup;

        this._enableMathIfNeeded(markup);

        return markupWithMentions;
    }

    private _enableMathIfNeeded(markup: string): void {
        if (!this._mathPluginEnabled && contentHasMathBlock(markup)) {
            const options: MarkdownRendererOptions = {
                katex: true,
            };

            this._onAdditionalSyntax(options);
            this._mathPluginEnabled = true;
        }
    }
}

export function renderInto(container: HTMLElement, props: MarkdownRendererAsyncProps): void {
    ReactDOM.render(<MarkdownRendererAsync {...props} />, container);
}

export function contentHasMathBlock(content: string): boolean {
    const katexBlockRe = /\$[^\$]+\$/;
    return katexBlockRe.test(content);
}

const BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;

/**
 * Inspect the provided urls for all protocols we want to prevent
 * The markdown-it defaults are to allow the data protocol if it is an image but
 * we don't want to allow embeded images that we'll have to scan for malicious content
 */
export function validateLinkProtocol(url) {
    var str = url.trim().toLowerCase();
    return !BAD_PROTOCOLS.test(str);
}

/// <reference types="jquery" />
/// <reference path='../marked.d.ts' />
///<amd-dependency path="Presentation/Scripts/TFS/marked-tfs-extensions" />

import { MarkdownRenderer } from "ContentRendering/Markdown";
import * as Constants_Platform from "VSS/Common/Constants/Platform";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contributions_Controls from "VSS/Contributions/Controls";
import * as Contributions_Services from "VSS/Contributions/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Service from "VSS/Service";
import * as Utils_Html from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";
import { ContainerOptions } from "ContentRendering/MarkdownItPlugins";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { MarkdownSyntaxExtensionProvider } from "Presentation/Scripts/TFS/MarkdownSyntaxExtensionProvider";
import { ViewMode } from "Presentation/Scripts/TFS/TFS.MarkdownExtension.Common";

import * as Marked from "Presentation/Scripts/marked";
import * as MarkdownRendererAsync from "Presentation/Scripts/TFS/Components/MarkdownRendererAsync";

/**
* Describes what the default behavior should be when showing files of the
* type that a content renderer handles.
*/
export enum ContentRenderingDefaultBehavior {
    ShowRawText = 1,
    ShowRenderedContent = 2
}

export interface CustomSyntaxProcessor {
    preProcess(markup: string): IPromise<string>;
    postProcess(markup: string): string;
}

export interface IContentRendererOptions {
    /**
     * If set to true, async rendering will happen where basic markdown rendering will be completed quickly
     * Advanced features like syntax highlighting and custom syntax processing will happen later
     */
    async?: boolean;

    /**
     * Custom syntax processor gives ability to manipulate rawmarkdown before passing to markdown-it
     * And post processing to the rendered html string. e.g., Mention processing
     */
    customSyntaxProcessor?: CustomSyntaxProcessor;
    hideExternalImageIcon?: boolean;
    html?: boolean;
    imageTransformer?: IImageTransformer;
    linkTransformer?: ILinkTransformer;
    linkClickHandler?: (element: any) => boolean;
    enableYaml?: boolean;
}

/**
* Interface for a class that is able to render HTML content based on raw input.
*/
export interface IContentRenderer {
    /**
    * Take raw text input and build up DOM elements to display the content.
    *
    * @param rawContent raw text input to render
    * @param $container container to draw content in.
    */
    renderContent(rawContent: string, $container: JQuery, options: IContentRendererOptions, renderExtensions?: boolean);

    /**
    * Describes what the default behavior should be when showing files of the
    * type that this content renderer handles.
    */
    defaultBehavior?: ContentRenderingDefaultBehavior;
}

/**
* Interface for a class that is able to render HTML content based on raw input.
* Since this is a contributed content renderer, it does not take a JQuery object
* as an argument, since this would be passed through XDM. Instead, a 
* contributed content renderer should populate the iframe it is placed in.
*/
export interface IContributedContentRenderer {
    /**
    * Take raw text input and build up DOM elements to display the content.
    *
    * @param rawContent raw text input to render
    */
    renderContent(rawContent: string, options: IContentRendererOptions);

}

export module ContentRendererFactory {

    var _renderersByExtension: { [extension: string]: IContentRenderer; } = {};
    var _renderersByMimeType: { [mimeType: string]: IContentRenderer; } = {};
    var _contributedRenderersPromise: IPromise<any>;
    let _areRenderersLoaded = false;

    /**
    * Register a content renderer for particular file extensions and/or mime types.
    *
    * @param fileExtension File extension of the type of content to render.
    */
    export function registerRenderer(renderer: IContentRenderer, fileExtensions: string[], mimeTypes: string[]) {
        if ($.isArray(fileExtensions)) {
            $.each(fileExtensions, (i: number, fileExtension: string) => {
                _renderersByExtension[fileExtension.toLowerCase()] = renderer;
            });
        }
        if ($.isArray(mimeTypes)) {
            $.each(mimeTypes, (i: number, mimeType: string) => {
                _renderersByMimeType[mimeType.toLowerCase()] = renderer;
            });
        }
    }

    /**
    * Get the content renderer registered to handle the given file extension.
    *
    * @param fileExtension File extension of the type of content to render.
    */
    export function getRendererForExtension(fileExtension: string): IPromise<IContentRenderer> {
        return ensureContributedRenderersLoaded().then(() => {
            return _renderersByExtension[fileExtension.toLowerCase()];
        });
    }

    /**
     * Gets the content renderer that handles this file extension.
     * This method can be used synchronously but only after ensureContributedRenderersLoaded resolves.
     */
    export function getRendererForExtensionSync(fileExtension: string): IContentRenderer {
        if (!_areRenderersLoaded) {
            throw new Error("getRendererForExtensionSync can only be called after ensureContributedRenderersLoaded resolves.");
        }

        return _renderersByExtension[fileExtension.toLowerCase()];
    }

    /**
    * Get the content renderer registered to handle the given mime type.
    *
    * @param mimeType Mime type such as text/html
    */
    export function getRendererForMimeType(mimeType: string): IPromise<IContentRenderer> {
        return ensureContributedRenderersLoaded().then(() => {
            return _renderersByMimeType[mimeType.toLowerCase()];
        });
    }

    /**
     * Gets a promise that is resolved when contributed renderers are loaded and ready to be queried synchronously.
     */
    export function ensureContributedRenderersLoaded(): IPromise<undefined> {
        if (!_contributedRenderersPromise) {
            _contributedRenderersPromise = Service.getService(Contributions_Services.ExtensionService)
                .getContributionsForTarget("ms.vss-code-web.content-renderer-collection").then(contributions => {
                    for (const contribution of contributions) {
                        registerRenderer(new ContributedRenderer(contribution), contribution.properties.fileExtensions, contribution.properties.mimeTypes);
                    }

                    _areRenderersLoaded = true;
                });
        }
        return _contributedRenderersPromise;
    }
}

export class ContributedRenderer implements IContentRenderer {

    public defaultBehavior: ContentRenderingDefaultBehavior;
    private _contribution: Contributions_Contracts.Contribution;

    constructor(contribution: Contributions_Contracts.Contribution) {
        this._contribution = contribution;
        this._setDefaultBehavior();
    }

    private _setDefaultBehavior() {
        if (Utils_String.equals("ShowRenderedContent", this._contribution.properties.defaultBehavior, true)) {
            this.defaultBehavior = ContentRenderingDefaultBehavior.ShowRenderedContent;
        }
        else {
            this.defaultBehavior = ContentRenderingDefaultBehavior.ShowRawText;
        }
    }

    public renderContent(rawContent: string, $container: JQuery, options: IContentRendererOptions) {
        Contributions_Controls.createContributedControl(
            $container,
            this._contribution,
            options,
            null,
            this._contribution.properties["registeredObjectId"] || this._contribution.id
        ).then((instance: IContributedContentRenderer) => {
            $container.find(".external-content-host").css("height", "100%");
            instance.renderContent(rawContent, options);
        });
    }
}

/**
* Class to render HTML file content.
*/
export class HtmlContentRenderer implements IContentRenderer {

    public defaultBehavior = ContentRenderingDefaultBehavior.ShowRawText;

    public renderContent(rawContent: string, $container: JQuery, options: IContentRendererOptions) {

        // Since we are creating an iframe (100% height/width) we don't want the parent container to
        // show vertical or horizontal scrollbars
        $container.addClass("hide-overflow");

        // Create a containing iframe so that styles are not inherited from the containing page.
        var $containerFrame = $("<iframe />")
            .css("height", "100%")
            .css("width", "100%")
            .css("border", "none");

        $containerFrame.one("load", function () {
            // Sanitize the raw HTML and fill the iframe with its content
            var $containerFrameHtml = $containerFrame.contents().find("html");
            var sanitizedContent = Utils_Html.HtmlNormalizer.normalizeStripAttributes(rawContent, null, null, null, null, false, ["DATA"]);
            if (sanitizedContent) {
                $containerFrameHtml.html(sanitizedContent);
            }
        });

        $containerFrame.appendTo($container);
    }
}

/**
* Class to render markdown file content
*/
export class MarkdownContentRenderer implements IContentRenderer {

    public defaultBehavior = ContentRenderingDefaultBehavior.ShowRenderedContent;

    // keeping public for test case purpose
    public extensionContributionPromise: IPromise<Contribution[]>;

    private _markdownSyntaxExtensionProvider: ContainerOptions;

    public renderContent(rawContent: string, $container: JQuery, options: IContentRendererOptions, renderExtensions?: boolean) {
        $container.find(".rendered-markdown").remove();
        const $markContainer = $("<div />").addClass("rendered-markdown").appendTo($container);
        let resultHtml: string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            if (options && options.async) {

                const injectExtensionMarkup = this.extensionContributionPromise ? (): void => {
                    this._markdownSyntaxExtensionProvider.createContributionsHosts();
                } : null;

                const containerOptions: ContainerOptions[] = this.extensionContributionPromise ? [this._markdownSyntaxExtensionProvider] : null;

                if (
                    renderExtensions &&
                    !this.extensionContributionPromise &&
                    FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessMarkdownTrustedExtensionSupport, false)
                ) {
                    this._markdownSyntaxExtensionProvider = new MarkdownSyntaxExtensionProvider(
                        { getViewMode: () => ViewMode.Full },
                        ".vc-preview-content-container .rendered-markdown"
                    );

                    this.extensionContributionPromise = this._markdownSyntaxExtensionProvider.fetchMarkdownSyntaxContributors();
                    this.extensionContributionPromise.then((contributions: Contributions_Contracts.Contribution[]) => {
                        if (contributions.length) {
                            this.renderContent(rawContent, $container, options, renderExtensions);
                        }
                    });
                }

                MarkdownRendererAsync.renderInto(
                    $markContainer.get()[0],
                    {
                        rawContent,
                        customSyntaxProcessor: options.customSyntaxProcessor,
                        options: {
                            hideExternalImageIcon: options.hideExternalImageIcon,
                            html: options.html,
                            imageUrlTransformer: options.imageTransformer ? (src) => options.imageTransformer.transformImage(src) : null,
                            linkTransformer: options.linkTransformer ? (href) => options.linkTransformer.transformLink(href) : null,
                            enableYaml: options.enableYaml,
                            containerOptions: containerOptions,
                        },
                        linkClickHandler: options.linkClickHandler,
                        injectExtensionMarkup: injectExtensionMarkup,
                    }
                );

                return;
            }

            const renderer = new MarkdownRenderer({
                hideExternalImageIcon: options ? options.hideExternalImageIcon : null,
                linkTransformer: options && options.linkTransformer ? (href) => options.linkTransformer.transformLink(href) : null,
                imageUrlTransformer: options && options.imageTransformer ? (src) => options.imageTransformer.transformImage(src) : null
            });
            resultHtml = renderer.renderHtml(rawContent);
        }
        else {
            Marked.setOptions({
                gfm: true,
                tables: true,
                breaks: false,
                pedantic: false,
                sanitize: true,
                smartLists: true,
                smartypants: false
            });

            var markedOptions: any = {};
            if (options) {
                if (options.linkTransformer) {
                    markedOptions.transformLink = function (href: string): string {
                        return options.linkTransformer.transformLink(href);
                    }
                }

                if (options.imageTransformer) {
                    markedOptions.transformImage = function (src: string): string {
                        return options.imageTransformer.transformImage(src);
                    }
                }

                if (options.hideExternalImageIcon) {
                    markedOptions.hideExternalImageIcon = options.hideExternalImageIcon;
                }
            }
            resultHtml = Marked(rawContent, markedOptions);
        }

        $(resultHtml).appendTo($markContainer);

        if (options && options.linkClickHandler) {
            $markContainer.find("a").click(options.linkClickHandler);
        }

        // Ensure that external links do not have access to this window
        // https://mathiasbynens.github.io/rel-noopener/
        $markContainer.find("a").attr("rel", "noopener");
    }
}

export interface ILinkTransformer {
    transformLink(href: string): string;
}

export interface IImageTransformer {
    transformImage(src: string): string;
}

ContentRendererFactory.registerRenderer(new HtmlContentRenderer(), ["html", "htm"], ["text/html"]);
ContentRendererFactory.registerRenderer(new MarkdownContentRenderer(), ["md"], ["text/x-markdown"]);

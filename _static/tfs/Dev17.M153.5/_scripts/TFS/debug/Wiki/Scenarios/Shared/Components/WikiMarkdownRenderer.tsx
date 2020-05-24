import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import { ContainerOptions, MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import { equals } from "VSS/Utils/Core";
import { Uri } from "VSS/Utils/Url";
import { MarkdownRendererAsync } from "Presentation/Scripts/TFS/Components/MarkdownRendererAsync";
import { ViewMode } from "Presentation/Scripts/TFS/TFS.MarkdownExtension.Common";
import { MarkdownSyntaxExtensionProvider } from "Presentation/Scripts/TFS/MarkdownSyntaxExtensionProvider";

import { MentionSyntaxProcessor } from "Mention/Scripts/MentionSyntaxProcessor";
import "Mention/Scripts/TFS.Mention.WorkItems.Registration"; // To register work-item mention parser and provider
import { PeopleMentionsRenderingProvider } from "Mention/Scripts/TFS.Mention.People";
import "Mention/Scripts/TFS.Mention.People.Registration"; // To register people mention parser and provider
import { WikiType, WikiV2, WikiPage } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { Attachment, UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { PreviewMode, WikiActionIds, WikiUrlParameters } from "Wiki/Scripts/CommonConstants";
import { getDefaultTelemetryPropsForMentionFeatures } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { isInternalAnchorLink } from "Wiki/Scripts/Helpers";
import { ImageTransformer } from "Wiki/Scripts/ImageTransformer";
import { LinkTransformer } from "Wiki/Scripts/LinkTransformer";
import { TemplateProcessor } from "Wiki/Scripts/TemplateProcessor";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { getWikiPageUrl } from "Wiki/Scripts/WikiUrls";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";

export interface WikiMarkdownRendererProps {
    content: string;
    repositoryContext: GitRepositoryContext;
    urlParameters: UrlParameters;
    onFragmentLinkClick(urlParameters: UrlParameters): void;
    skipInternalLinkTransformation?: boolean;
    isHostedOutsideWikiHub?: boolean;
    totalAttachmentsSize?: number;
    unsavedAttachmentsMap?: IDictionaryStringTo<Attachment>;
    wiki?: WikiV2;  // This has to be made a mandatory param once we support Code wikis in Project Overview page
    wikiIdentifier?: string; // This is mandatory if component is used outside wiki. To be removed when wiki prop above is made mandatory
    wikiPagesPromiseMethod?(): IPromise<WikiPage[]>;
    enableHeaderAnchorSharing?: boolean;
    viewMode?: PreviewMode;
}

export interface WikiMarkdownRendererState {
    wikiPageMap: IDictionaryStringTo<WikiPage>;
    numberOfContributions: number;
}

export class WikiMarkdownRenderer extends React.PureComponent<WikiMarkdownRendererProps, WikiMarkdownRendererState> {
    private _markdownContainer: HTMLDivElement;
    private _imageTransformer: ImageTransformer;
    private _linkTransformer: LinkTransformer;
    private _renderingOptions: MarkdownRendererOptions;
    private _mentionSyntaxProcessor: MentionSyntaxProcessor;
    private _markdownRendererAsync: MarkdownRendererAsync;
    private _isWikiTreeMapLoaded: boolean;
    private _markdownSyntaxExtensionProvider: ContainerOptions;
    private _sourceReplacedWithTemplateContent: string = null;

    constructor(props: WikiMarkdownRendererProps) {
        super(props);

        const wiki = props.wiki;
        let wikiRootPath = "/";
        let shouldHonorLineBreak = true;

        if (wiki) {
            wikiRootPath = wiki.mappedPath;
            shouldHonorLineBreak = WikiType.ProjectWiki === wiki.type;
        }

        this._imageTransformer = new ImageTransformer(props.repositoryContext, wikiRootPath);
        this._linkTransformer = new LinkTransformer(props.repositoryContext, wikiRootPath, props.isHostedOutsideWikiHub);

        this._renderingOptions = {
            breaks: shouldHonorLineBreak,
            html: true,
            imageUrlTransformer: this._transformImageUrl,
            linkTransformer: this._transformLinkUrl,
            linkCustomTitleProvider: this._transformLinkTitle,
            containerOptions: this._createContainerOptions(wikiRootPath),
            enableHeaderAnchorSharing: this.props.enableHeaderAnchorSharing,
            enableYaml: WikiFeatures.isYamlSupportEnabled(),
        };

        this._mentionSyntaxProcessor = new MentionSyntaxProcessor();

        this.state = {
            numberOfContributions : 0,
            wikiPageMap: null,
        };
    }

    private _createContainerOptions(wikiRootPath: string): ContainerOptions[] {
        const containerOptions: ContainerOptions[] = [];
        if (WikiFeatures.isTemplateSupportEnabled()) {
            containerOptions.push(new TemplateProcessor(
                {
                    _updateComponent: this._updateComponent,
                    createMarkdownRenderer: this._createMarkdownRenderer,
                    getProps: () => this.props,
                    wikiRootPath: wikiRootPath,
                }));
        }
        if (WikiFeatures.isTrustedExtensionEnabled()) {
            this._markdownSyntaxExtensionProvider = new MarkdownSyntaxExtensionProvider(
                { getViewMode: () => this.getViewMode() },
                ".wiki-markdown .markdown-renderer-async.markdown-render-area"
            );
            this._markdownSyntaxExtensionProvider.fetchMarkdownSyntaxContributors().then(this._onContributionsLoad);
            containerOptions.push(this._markdownSyntaxExtensionProvider);
        }
        return containerOptions;
    }

    @autobind
    private getViewMode(): ViewMode {
        return (this.props.isHostedOutsideWikiHub
        || this.props.urlParameters.action === WikiActionIds.View
        || this.props.viewMode === PreviewMode.Full)
        ? ViewMode.Full
        : ViewMode.Edit;
    }

    @autobind
    private _updateComponent(updatedContent: string): void {
        this._sourceReplacedWithTemplateContent = updatedContent;
        // calling forceUpdate() causes render() to be called on the component, skipping shouldComponentUpdate()
        // here skipping shouldComponentUpdate() check causes no harm as this flow only gets triggered when a new template is downloaded
        // and component's output is affected by the current changes in props
        this.forceUpdate();
    }

    public componentDidMount(): void {
        this._scrollToAnchor();
    }

    @autobind
    private _onContributionsLoad(contributions: Contribution[]): void {
        this.setState({ numberOfContributions: contributions.length });
    }

    @autobind
    private _createMarkdownRenderer(): MarkdownRenderer {
        const options: MarkdownRendererOptions = {
            containerOptions: this._renderingOptions.containerOptions,
        };
        return new MarkdownRenderer(options);
    }

    public componentDidUpdate(prevProps: WikiMarkdownRendererProps): void {
        if (this.props.urlParameters.anchor !== prevProps.urlParameters.anchor) {
            this._scrollToAnchor();
        }
    }

    /**
     * Fetches updated content if the the source is modified with template contents
     */
    private get _content(): string {
        return this._sourceReplacedWithTemplateContent || this.props.content;
    }

    public componentWillReceiveProps(nextProps: WikiMarkdownRendererProps): void {
        if (this._sourceReplacedWithTemplateContent && this.props.content !== nextProps.content) {
            this._sourceReplacedWithTemplateContent = this._renderingOptions.containerOptions[0].fetchUpdatedMarkdown(nextProps.content);
        }
    }

    @autobind
    private injectExtensionMarkup(): void {
        if (WikiFeatures.isTrustedExtensionEnabled()) {
            this._markdownSyntaxExtensionProvider.createContributionsHosts();
        }

        PeopleMentionsRenderingProvider.registerMentionClickHandler(this._markdownContainer, getDefaultTelemetryPropsForMentionFeatures());

        // to handle scroll into view after delay renders in read mode.
        if (this.getViewMode() == ViewMode.Full) {
            this._scrollToAnchor();
        }
    }

    public render(): JSX.Element {
        return (
            <div
                className={"wiki-markdown"}
                ref={this._saveRef}
            >
                <MarkdownRendererAsync
                    ref={this._saveAsyncRendererRef}
                    rawContent={this._content}
                    className={"markdown-render-area"}
                    customSyntaxProcessor={this._mentionSyntaxProcessor}
                    linkClickHandler={this._linkClickHandler}
                    options={this._renderingOptions}
                    onInitialRender={this._loadWikiPageMap}
                    loadedContributionsCount={this.state.numberOfContributions}
                    injectExtensionMarkup={this.injectExtensionMarkup}
                    previewMode={this.props.viewMode}
                />
            </div>
        );
    }

    public get getPrintContent(): string {
        return this._markdownRendererAsync.getRenderedContent;
    }

    @autobind
    private _linkClickHandler(event: MouseEvent): boolean {
        const anchorElement = event.currentTarget as HTMLAnchorElement;
        const href = anchorElement && anchorElement.attributes &&
            anchorElement.attributes.getNamedItem("href") && anchorElement.attributes.getNamedItem("href").value;
        if (href && isInternalAnchorLink(href, this.props.urlParameters.pagePath)) {
            try {
                const isOnlyAnchor = href.indexOf("#") === 0;
                const uri: Uri = Uri.parse(href);
                const anchor = isOnlyAnchor
                    ? decodeURIComponent(href.substring(1)).toLowerCase()
                    : uri.getQueryParam(WikiUrlParameters.Anchor);
                const linkParameters: UrlParameters = { ...this.props.urlParameters };
                linkParameters.anchor = anchor;
                anchorElement.href = this.props.skipInternalLinkTransformation
                    ? "#" + anchor
                    : getWikiPageUrl(linkParameters);

                if (equals(linkParameters, this.props.urlParameters)) {
                    // User has clicked on anchor again. URL will not be updated. Just need to scroll to anchor.
                    this._scrollToAnchor();
                } else {
                    // Update URL and scroll to anchor.
                    this.props.onFragmentLinkClick(linkParameters);
                }

                return false;
            } catch (e) {
                /*
                 * Uri.parse or decodeURIComponent can throw exception if URL is malformed
                 * Consider it as external URL and pass it on
                 */
                return this._linkTransformer.handleWikiLinkClick(event as any);
            }
        }

        return this._linkTransformer.handleWikiLinkClick(event as any);
    }

    @autobind
    private _scrollToAnchor(): void {
        const anchor: string = this.props.urlParameters.anchor;
        if (anchor) {
            LinkTransformer.scrollToAnchor(anchor);
        } else {
            this._markdownContainer.scrollTop = 0;
        }
    }

    @autobind
    private _saveRef(ref: HTMLDivElement): void {
        this._markdownContainer = ref;
    }

    @autobind
    private _saveAsyncRendererRef(ref: MarkdownRendererAsync): void {
        this._markdownRendererAsync = ref;
    }

    @autobind
    private _transformImageUrl(url: string): string {
        const version: string = this.props.urlParameters.wikiVersion;
        return this._imageTransformer.transformImage(url, version, this.props.unsavedAttachmentsMap, this.props.urlParameters.pagePath);
    }

    @autobind
    private _transformLinkUrl(href: string): string {
        return this._linkTransformer.transformLink(href, this.props.wikiIdentifier, this.props.urlParameters.pagePath, this.state.wikiPageMap);
    }

    @autobind
    private _transformLinkStyle(href: string, className?: string): string[] {
        return this._linkTransformer.transformLinkStyle(href, this.state.wikiPageMap, className);
    }

    @autobind
    private _transformLinkTitle(token: any): string {
        return this._linkTransformer.linkCustomTitleProvider(token);
    }

    @autobind
    private _loadWikiPageMap(): void {
        if (this._isWikiTreeMapLoaded) {
            return;
        }
        const wikiPagesPromise =  this.props.wikiPagesPromiseMethod && this.props.wikiPagesPromiseMethod();
        const wikiPageMap: IDictionaryStringTo<WikiPage> = {};
        if (wikiPagesPromise) {
            wikiPagesPromise.then(
                (pages) => {
                    if (pages) {
                        pages.map(page => {
                            wikiPageMap[page.path.toLocaleLowerCase()] = page;
                        });
                        // Add link style transformer to rendering options
                        this._renderingOptions = Object.assign({linkCustomStyleAppender: this._transformLinkStyle}, this._renderingOptions);
                        this.setState({
                            wikiPageMap: wikiPageMap
                        });
                    }
                },
                (error: Error) => {
                    this.setState({ wikiPageMap: null });
                }
            );
        }
        this._isWikiTreeMapLoaded = true;
    }
}

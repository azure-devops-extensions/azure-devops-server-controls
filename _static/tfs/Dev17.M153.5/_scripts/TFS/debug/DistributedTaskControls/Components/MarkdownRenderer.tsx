/// <reference types="react" />

/// <reference path="../Common/3rdParty/marked.d.ts" />

import * as Q from "q";

import * as React from "react";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Marked from "DistributedTaskControls/Common/3rdParty/marked";
import * as MarkedExtension from "DistributedTaskControls/Common/3rdParty/marked-tfs-extensions";

import { css } from "OfficeFabric/Utilities";

import * as Constants_Platform from "VSS/Common/Constants/Platform";
import { isExternalUrl } from "VSS/Utils/Url";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_HTML from "VSS/Utils/Html";
import { registerLWPComponent } from "VSS/LWP";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/MarkdownRenderer";

export interface IProps extends Base.IProps {
    markdown: string;
    markdownRendererOptions?: MarkdownRendererOptions;
}

export interface IState {
    resolvedMarkdown: string;
}

export class Component extends Base.Component<IProps, IState> {
    public static componentType = "dtMarkdownRenderer";
    public componentWillMount() {
        // Set initial state with props
        this._setState(this.props);
        // adding reference to force import
        MarkedExtension.Helper.getWindow();
    }

    public componentWillReceiveProps(newProps: IProps) {
        // Set new props in state
        this._setState(newProps);
    }

    public componentDidMount(): void {
        this._addRelAttrToExternalLinks();
    }

    public componentDidUpdate(): void {
        this._addRelAttrToExternalLinks();
    }

    public render(): JSX.Element {
        const resolvedMarkdown = {
            // Note: additional normalization needed as the renderer is configured to allow custom html
            __html: this.state.resolvedMarkdown
                ? Utils_HTML.HtmlNormalizer.normalizeStripAttributes(this.state.resolvedMarkdown, null, ["target"])
                : this.state.resolvedMarkdown
        };

        /* tslint:disable:react-no-dangerous-html */
        return <div ref={this._resolveRef("_markdownContainer")}
            className={css("dtc-markdown-renderer", this.props.cssClass)}
            dangerouslySetInnerHTML={resolvedMarkdown}
        />;
        /* tslint:enable:react-no-dangerous-html */
    }

    /**
     * Earlier we were laoding marked.js asynchronously and returning promise, because of this we had one bug #963279
     * Reason for bug is that in the callout we use this component and when callout component is getting rendered, resolvedMarkdown state
     * was not set and hence callout height getting calculated without markdown and after some time markdown component get rendered once
     * we set the resolvedMarkdown asynchronously, hence some the markdown text getting clipped. Fix is to set the resolveMarkdown state
     * synchronously, hence removed vss using statement. This is temporary fix, until we enable VisualStudio.Services.WebAccess.MarkdownRendering FF
     * created tracking workitem #1013979 to clean up once this FF is enabled by default.
     */
    public static marked(input: string): string {
        let markedString: string = Utils_String.empty;
        if (input) {
            const markedHtmlString = Marked(input);

            markedString = `<div>
                                ${markedHtmlString}
                            </div>`;
        }

        return markedString;
    }

    private _setState(props: IProps) {
        // Note: when removing feature flag, migrate this whole component to framework-provided markdown react component
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            const rendererOptions: MarkdownRendererOptions =
                props.markdownRendererOptions ? props.markdownRendererOptions :
                {
                    breaks: true,
                    html: true,
                };

            if (!this._renderer) {
                this._renderer = new MarkdownRenderer(rendererOptions);
            }

            this.setState({
                resolvedMarkdown: this._renderer.renderHtml(props.markdown)
            });

        } else {
            this.setState({
                resolvedMarkdown: Component.marked(props.markdown)
            });
        }
    }

    private _getDefaultMarkdownRendererOptions(): MarkdownRendererOptions {
        return {
            breaks: true,
            html: true,
        };
    }

    private _addRelAttrToExternalLinks(): void {
        // Adding 'rel' attribute for external links
        const anchorElements = this._markdownContainer.getElementsByTagName("a");

        if (anchorElements && anchorElements.length > 0) {
            for (let i = 0; i < anchorElements.length; i++) {
                const targetAttribute = anchorElements[i].target;
                const href = anchorElements[i].href;
                if (!targetAttribute && isExternalUrl(href)) {
                    anchorElements[i].target = "_blank";
                    anchorElements[i].rel = "noopener noreferrer";
                }

                if (targetAttribute && (Utils_String.ignoreCaseComparer(targetAttribute, "_blank") === 0)) {
                    anchorElements[i].rel = "noopener noreferrer";
                }
            }
        }
    }

    private _renderer: MarkdownRenderer;
    private _markdownContainer: HTMLDivElement;
}

registerLWPComponent(Component.componentType, Component);
import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Npm/MarkdownRendererWrapper";

import { MarkdownRenderer, UserContentAnchorHelper } from "ContentRendering/Markdown";

export interface IMarkdownRendererProps extends Props {
    rawMarkdownContent: string;
}

export interface IMarkdownRendererState extends State {
    markdownHtml: string;
}

export class MarkdownRendererWrapper extends Component<IMarkdownRendererProps, IMarkdownRendererState> {
    constructor(props: IMarkdownRendererProps) {
        super(props);
        this.state = {
            markdownHtml: ""
        };
    }

    public componentWillReceiveProps(newProps: IMarkdownRendererProps): void {
        if (this.props.rawMarkdownContent !== newProps.rawMarkdownContent) {
            const renderer = new MarkdownRenderer();
            const resultHtml: string = renderer.renderHtml(newProps.rawMarkdownContent);

            this.setState({
                markdownHtml: resultHtml
            } as IMarkdownRendererState);
        }
    }

    public render(): JSX.Element {
        // Note: doing lambda/anonymous function here forces react to run the ref on each update. This is needed since it can't detect the differences in inner html.
        return (
            <div
                ref={div => {
                    UserContentAnchorHelper.attach(div);
                }}
                className="rendered-markdown"
                dangerouslySetInnerHTML={{ __html: this.state.markdownHtml }}
            />
        );
    }
}

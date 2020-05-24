/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/DetailsPanel/Components/DebugDetails";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { StackTrace } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/StackTrace";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { Component, Props } from "VSS/Flux/Component";
import { empty } from "VSS/Utils/String";

export interface IDebugInfoProps extends Props {
    comment?: string;
    errorMessage?: string;
    stackTrace?: string;
    linkedStackTrace?: boolean;
    viewContext?: IViewContextData;
}

export class DebugDetailsComponent extends Component<IDebugInfoProps> {

    public render(): JSX.Element {

        return (
            <div className="DebugDetails-view">
                {
                    this.props.comment != null && this.props.comment !== empty &&
                    <Accordion
                        label={Resources.CommentsText}
                        initiallyExpanded={true}
                        headingLevel={3}
                        addSeparator={false}
                    >
                        <div className="comment">
                            {this._getMarkdownRenderedComment(this.props.comment)}
                        </div>
                    </Accordion>
                }
                {
                    this.props.errorMessage != null &&
                    <Accordion
                        label={Resources.ErrorMessageLabel}
                        cssClass="error-message-accordion"
                        initiallyExpanded={true}
                        headingLevel={3}
                        addSeparator={false} >
                        <div className="error-message">
                            {this.props.errorMessage}
                        </div>
                    </Accordion>
                }
                {
                    this.props.stackTrace != null &&
                    <Accordion
                        label={Resources.StackTraceLabel}
                        cssClass="stack-trace-accordion"
                        initiallyExpanded={true}
                        headingLevel={3}
                        addSeparator={false} >
                        <div className="stack-trace">
                            <StackTrace
                                stackTrace={this.props.stackTrace}
                                linkedStackTrace={LicenseAndFeatureFlagUtils.isLinkedStackTraceEnabled() && this.props.linkedStackTrace}
                                viewContext={this.props.viewContext}
                            >
                            </StackTrace>
                        </div>
                    </Accordion>
                }
            </div>
        );
    }

    private _getMarkdownRenderedComment(comment: string): JSX.Element {
        if (!this._markdownRenderer) {
            this._markdownRenderer = new MarkdownRenderer(this._getDefaultMarkdownOptions());
        }
        const resolvedMarkdown = {
            __html: this._markdownRenderer.renderHtml(comment)
        };

        /* tslint:disable:react-no-dangerous-html */
        return <div
            className={"test-comment-markdown-renderer"}
            dangerouslySetInnerHTML={resolvedMarkdown}
        />;
        /* tslint:enable:react-no-dangerous-html */
    }

    private _getDefaultMarkdownOptions(): MarkdownRendererOptions {
        let options: MarkdownRendererOptions;
        options = {
            validateLink: validateLinkProtocol
        };
        return options;
    }

    private _markdownRenderer: MarkdownRenderer;
}

// Inspect the provided urls for all protocols we want to prevent
// The markdown-it defaults are to allow the data protocol if it is an image but
// we don't want to allow embeded images that we'll have to scan for malicious content
const BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;
export function validateLinkProtocol(url) {
    const str = url.trim().toLowerCase();
    return !BAD_PROTOCOLS.test(str);
}
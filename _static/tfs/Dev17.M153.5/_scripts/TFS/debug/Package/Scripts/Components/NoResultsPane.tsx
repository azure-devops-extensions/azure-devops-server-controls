import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/NoResultsPane";

export interface INoResultsPaneProps extends Props {
    header: string;
    subheader?: string;
    link?: string;
    linkText?: string;
    iconClass: string;
}

export class NoResultsPane extends Component<INoResultsPaneProps, State> {
    public render(): JSX.Element {
        return (
            <div className="no-results-pane">
                <div className={"empty-icon bowtie-icon " + this.props.iconClass} />
                <div className="empty-header">{this.props.header}</div>
                {this.props.subheader ? <div className="empty-subheader">{this.props.subheader}</div> : <div />}
                {this.props.link && this.props.linkText ? (
                    <div className="empty-subheader">
                        <ExternalLink href={this.props.link}>{this.props.linkText}</ExternalLink>
                    </div>
                ) : (
                        <div />
                    )}
                <div className="no-results-pane-content">{this.props.children}</div>
            </div>
        );
    }
}

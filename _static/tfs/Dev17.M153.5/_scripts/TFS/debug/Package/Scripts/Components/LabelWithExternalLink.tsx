import * as React from "react";

import { Label } from "OfficeFabric/Label";

import { Component, Props, State } from "VSS/Flux/Component";

import { ExternalLink } from "Package/Scripts/Components/ExternalLink";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/LabelWithExternalLink";

export interface ILabelWithExternalLinkProps extends Props {
    labelText: string;
    linkText: string;
    href: string;
    ciContext: string;
}

export class LabelWithExternalLink extends Component<ILabelWithExternalLinkProps, State> {
    public render(): JSX.Element {
        return (
            <div className={"external-link-label-container"}>
                <Label className={"external-link-label"}>{this.props.labelText}</Label>
                <ExternalLink className={"external-link"} href={this.props.href} ciContext={this.props.ciContext}>
                    {this.props.linkText}
                </ExternalLink>
            </div>
        );
    }
}

import * as React from "react";

import { ILinkProps, Link, LinkBase } from "OfficeFabric/Link";

import { Component, State } from "VSS/Flux/Component";
import * as Url from "VSS/Utils/Url";

import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";

export interface IExternalLinkProps extends ILinkProps {
    ciContext?: string;
    onClick?: (ev: React.MouseEvent<HTMLAnchorElement | HTMLElement | HTMLButtonElement | LinkBase>) => void;
    linkAriaLabel?: string;
}

export class ExternalLink extends Component<IExternalLinkProps, State> {
    public render(): JSX.Element {
        // decode so query parameters are handled properly
        const href = decodeURIComponent(this.props.href);
        // data, javascript, vbscript will be removed. file is safe protocol but we want
        // to remove that as well
        if (!Url.isSafeProtocol(href)) {
            return <div>{href}</div>;
        }

        return (
            <Link
                aria-label={this.props.linkAriaLabel}
                target="_blank"
                rel="noopener noreferrer"
                {...this.props}
                href={href}
                onClick={ev => this._onClick(ev)}
            >
                {this.props.children}
            </Link>
        );
    }

    private _onClick(ev: React.MouseEvent<HTMLAnchorElement | HTMLElement | HTMLButtonElement | LinkBase>): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.ExternalLink, {
            URL: this.props.href,
            context: this.props.ciContext,
            title: this.props.title
        });

        if (this.props.onClick) {
            this.props.onClick(ev);
        }
    }
}

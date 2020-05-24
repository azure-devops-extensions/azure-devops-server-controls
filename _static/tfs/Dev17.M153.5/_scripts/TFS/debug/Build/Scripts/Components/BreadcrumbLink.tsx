/// <reference types="react" />

import * as React from "react";
import { vssLWPPageContext } from "Build/Scripts/Context";

import { getService as getEventActionService, CommonActions } from "VSS/Events/Action";

import { TooltipHost } from "VSSUI/Tooltip";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

export interface BreadcrumbLinkProps {
    path: string;
    title: string;
    iconClassName?: string;
    linkText?: string;
    getBreadcrumbLink: (path: string) => string;
    onBreadcrumbClicked: (e: React.MouseEvent<HTMLAnchorElement>, path: string) => void;
}

export class BreadcrumbLink extends React.Component<BreadcrumbLinkProps, {}> {
    public render(): JSX.Element {
        let icon: JSX.Element = null;
        if (this.props.iconClassName) {
            icon = <span className={this.props.iconClassName} />
        }

        return <TooltipHost content={this.props.title}>
            <a
                href={this.props.getBreadcrumbLink(this.props.path)}
                onClick={this._onClick}
                aria-label={this.props.title}>
                {icon}{this.props.linkText || this.props.title}
            </a>
        </TooltipHost>;
    }

    private _onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        const link = this.props.getBreadcrumbLink(this.props.path);
        if (link) {
            event.stopPropagation();
            event.preventDefault();
            FPS.onClickFPS(vssLWPPageContext, link, true, event);
        }
        else {
            this.props.onBreadcrumbClicked(event, this.props.path);
        }
    }
}

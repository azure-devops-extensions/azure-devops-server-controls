/// <reference types="react" />

import React = require("react");

import { vssLWPPageContext } from "Build/Scripts/Context";

import { getService as getEventActionService, CommonActions } from "VSS/Events/Action";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

export interface ILinkWithKeyBindingProps {
    title: string;
    href: string;
    text: string;
    icon?: JSX.Element;
    className?: string;
    onClick?: React.EventHandler<React.MouseEvent<HTMLAnchorElement>>;
}

export class LinkWithKeyBinding extends React.Component<ILinkWithKeyBindingProps, {}> {
    public render(): JSX.Element {
        return <span>
            <a
                className={this.props.className}
                onClick={this._onClick}
                aria-label={this.props.title}
                href={this.props.href}>
                {this.props.icon}{this.props.text}
            </a>
        </span>;
    }

    private _onClick = (e) => {
        if (this.props.onClick) {
            this.props.onClick(e);
        }
        else {
            FPS.onClickFPS(vssLWPPageContext, this.props.href, true, e);
        }
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key === "Enter") {
            let action = CommonActions.ACTION_WINDOW_NAVIGATE;
            if (event.ctrlKey) {
                action = CommonActions.ACTION_WINDOW_OPEN;
            }

            getEventActionService().performAction(action, {
                url: this.props.href
            });

            event.preventDefault();
            event.stopPropagation();
        }
    }
}

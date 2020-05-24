import React = require("react");

import { Link } from "OfficeFabric/Link";

import { isSafeProtocol, Uri } from "VSS/Utils/Url";
import * as Component_Base from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import { KeyCode } from "VSS/Utils/UI";

import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";

export interface IProps extends Component_Base.Props {
    href: string;
    target?: string;
    className?: string;
    allowRelative?: boolean;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
    tabIndex?: number;
    ariaProps?: React.HTMLAttributes<HTMLElement>;
    disabled?: boolean;
}

export class SafeLink extends Component_Base.Component<IProps, Component_Base.Props> {

    public render(): JSX.Element {

        let allowRelativeUrl = this.props.allowRelative && UrlUtilities.isRelativeUrl(this.props.href);
        if (!this.props.href || allowRelativeUrl || isSafeProtocol(this.props.href)) {

            let rel = Utils_String.empty;
            if (this.props.target && Utils_String.ignoreCaseComparer(this.props.target, "_blank") === 0) {
                rel = "noopener noreferrer";
            }

            return (
                <Link
                    href={this.props.href}
                    disabled={this.props.disabled}
                    aria-disabled={this.props.disabled}
                    target={this.props.target}
                    className={this.props.className}
                    rel={rel}
                    onClick={this.props.onClick}
                    onKeyDown={this._onKeyDown}
                    tabIndex={this.props.tabIndex || 0}
                    {...this.props.ariaProps}>

                    {this.props.children}

                </Link>
            );
        }
        else {
            Diag.logError("SafeLink:render: Invalid href detected: " + this.props.href);
            return null;
        }
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (!this.props.disabled && (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE)) {
            if (this.props.onKeyDown) {
                this.props.onKeyDown(event);
            }
        }
    }
}
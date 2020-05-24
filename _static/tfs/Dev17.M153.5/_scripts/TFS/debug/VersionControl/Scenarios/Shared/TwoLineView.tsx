import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Utils_String from "VSS/Utils/String";

import { AvatarImageSize, IAvatarImageProperties, IAvatarImageStyle } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";

import "VSS/LoaderPlugins/Css!VersionControl/TwoLineView";

export interface TwoLineViewProps {
    primaryLinkText?: string;
    primaryLinkTextTooltip?: string;
    primaryText?: string;
    primaryTextTooltip?: string;
    primaryLinkUrl?: string;
    onPrimaryLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
    secondaryLinkText?: string;
    secondaryLinkTextTooltip?: string;
    secondaryText?: string;
    secondaryTextTooltip?: string;
    secondaryLinkUrl?: string;
    onSecondaryLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
    badges?: BadgeProps[];
    additionalComponent?: JSX.Element; // Appended to the secondary line of the component
}

export class TwoLineView extends React.Component<TwoLineViewProps, {}> {
    private _containerElement: HTMLElement;
    private _primaryLinkTextRef: HTMLElement;
    private _primaryTextRef: HTMLElement;
    private _secondaryLinkTextRef: HTMLElement;
    private _secondaryTextRef: HTMLElement;
    private _tooltips: RichContentTooltip[] = [];

    public render(): JSX.Element {
        const firstLineContent: JSX.Element =
            <div className="first-line">
                {
                    this.props.primaryLinkText && this.props.primaryLinkUrl &&
                    <Link
                        className="primarylink-text"
                        href={this.props.primaryLinkUrl}
                        onClick={this.props.onPrimaryLinkClick}>
                        {this.props.primaryLinkText + " "}
                    </Link>
                }
                {
                    this.props.primaryText &&
                    <div
                        ref={(element: HTMLElement) => { this._primaryTextRef = element }}
                        className="primary-text"
                        aria-label={this.props.primaryText}>
                        {this.props.primaryText}
                    </div>
                }
                <Badges badges={this.props.badges} />
            </div>;

        const secondLineContent: JSX.Element =
            <div className="second-line">
                {
                    this.props.secondaryLinkText && this.props.secondaryLinkUrl &&
                    <Link
                        className="secondarylink-text"
                        href={this.props.secondaryLinkUrl}
                        onClick={this.props.onSecondaryLinkClick}>
                        {this.props.secondaryLinkText + " "}
                    </Link>
                }
                {
                    this.props.secondaryText &&
                    <div
                        ref={(element: HTMLElement) => { this._secondaryTextRef = element }}
                        className="secondary-text"
                        aria-label={this.props.secondaryText}>
                        {this.props.secondaryText}
                        {this.props.additionalComponent}
                    </div>
                }
            </div>;

        return (
            <div className="two-line-view" ref={(container)=> this._containerElement = container}>
                {firstLineContent}
                {secondLineContent}
            </div>
        );
    }

    public componentDidMount(): void {
        if (this._containerElement) {
            this._primaryLinkTextRef = $(this._containerElement).find(".primarylink-text")[0];
            this._secondaryLinkTextRef = $(this._containerElement).find(".secondarylink-text")[0];
        }

        this._addToolTips();
    }

    public componentWillUnmount(): void {
        if (this._tooltips) {
            this._tooltips.forEach(tooltip => {
                tooltip.dispose();
                tooltip = null;
            });

            this._tooltips = [];
        }

        this._primaryLinkTextRef = null;
        this._primaryTextRef = null;
        this._secondaryLinkTextRef = null;
        this._secondaryTextRef = null;
    }

    private _addToolTips(): void {
        this._addToolTip(this._primaryLinkTextRef, this.props.primaryLinkTextTooltip, this.props.primaryLinkText);
        this._addToolTip(this._primaryTextRef, this.props.primaryTextTooltip, this.props.primaryText);
        this._addToolTip(this._secondaryLinkTextRef, this.props.secondaryLinkTextTooltip, this.props.secondaryLinkText);
        this._addToolTip(this._secondaryTextRef, this.props.secondaryTextTooltip, this.props.secondaryText);
    }

    private _addToolTip(elementRef: HTMLElement, elementTooltip?: string, elementText?: string): void {
        if (elementRef) {
            const tooltip = elementTooltip || elementText;
            this._tooltips.push(RichContentTooltip.add(tooltip, elementRef, {
                onlyShowWhenOverflows: elementTooltip ? null : elementRef,
                setAriaDescribedBy: false,
                useMousePosition: false
            }));
        }
    }
}

export interface BadgeProps {
    badgeText: string;
    badgeCss: string;
    tooltip: string;
    url?: string;
    onClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
}

export const Badges = (props: { badges: BadgeProps[] }): JSX.Element => {
    return <span className="vc-two-line-view-badge-list">
        {props.badges && props.badges.length
            ? props.badges.map((badgeProp, index) =>
                <Badge
                    {...badgeProp}
                    key={index}
                    />)
            : null
        }
    </span>;
}

export const Badge = (props: BadgeProps): JSX.Element => {
    const tooltipId: string = getId("avatar-first-line-badge-tooltip");
    return <TooltipHost
        id={tooltipId}
        content={props.tooltip}
        directionalHint={DirectionalHint.bottomCenter}>
          {props.url
              ? <Link
                    className={props.badgeCss}
                    href={props.url}
                    onClick={props.onClick}
                    aria-describedby={tooltipId}>
                    {props.badgeText}
                </Link>
              : <span
                    className={props.badgeCss}
                    aria-describedby={tooltipId}>
                    {props.badgeText}
                </span>
          }
    </TooltipHost>;
}
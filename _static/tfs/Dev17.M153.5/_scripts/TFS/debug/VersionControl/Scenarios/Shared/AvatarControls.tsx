/// <reference types="react" />

import * as React from "react";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, getId, css } from 'OfficeFabric/Utilities';
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { IdentityRef } from "VSS/WebApi/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";

import { AvatarImageSize, IAvatarImageProperties, IAvatarImageStyle } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { BadgeProps, TwoLineView } from "VersionControl/Scenarios/Shared/TwoLineView";

import "VSS/LoaderPlugins/Css!VersionControl/AvatarControls";

export interface IAvatarBadgeProperties {
    imageProperties: IAvatarImageProperties;
    badgeTextStyle?: string;
    tooltip?: string;
    showProfileCardOnClick?: boolean;
}

export interface IAvatarBadgeState {
    showTooltip: boolean;
}

export const defaultGravatarMysteryManString: string = "mm";

/**
 * Renders Avatar Badge control
 */
export class AvatarBadge extends React.Component<IAvatarBadgeProperties, IAvatarBadgeState> {
    private _tooltipId: string;
    private _identityImageElement: HTMLElement;

    constructor(props: IAvatarBadgeProperties, context?: any) {
        super(props, context);
        this.state = { showTooltip: true };
        this._tooltipId = getId('avatarbadge-tooltip');
    }

    public render(): JSX.Element {
        if (this.props.imageProperties) {
            const badgeTextStyle: string = this.props.badgeTextStyle || "badge-text-style";
            const avatarImageStyle: IAvatarImageStyle = AvatarUtils.AvatarImageSizeToCssStyle(this.props.imageProperties.size);
            const identity = AvatarUtils.AvatarImagePropertiesToIdentityRef(this.props.imageProperties);
            const focusAttributes: IDictionaryStringTo<any> = {};
            let avatarBadgeCssClass: string = 'avatar-badge';
            if (this.props.showProfileCardOnClick) {
                identity.uniqueName = AvatarUtils.AvatarImagePropertiesToPersonaCardIdentityRef(this.props.imageProperties).uniqueName;
                avatarBadgeCssClass = css('persona-card-pointer', avatarBadgeCssClass);
                focusAttributes["tabIndex"] = 0; // When used outside of focus zones
                focusAttributes["data-is-focusable"] = true; // When used within focus zones
                focusAttributes["aria-expanded"] = !this.state.showTooltip; //expand/collapse property
            }

            // Calculating this width to show ellipsis at the end if there is an overflow in the display name text, outside the width of the parent
            // For the ellipsis behavior to be visible, the width needs to be absolute
            // Subtracting 1 from image size for buffer
            const authorCalculatedWidth: string = Utils_String.format("calc(100% - {0}px)", avatarImageStyle.imageSize - 1);

            // Purposefully passing "" tooltip to IdentityImage so that it does not show default tooltip
            const avatarBadgeElement: JSX.Element = <div
                className={avatarBadgeCssClass}
                onClick={this._invokePersonaCardOnIdentityImage}
                onKeyDown={this._handleKeyDown}
                {...focusAttributes}
                aria-describedby={(this.props.tooltip) ? this._tooltipId : null}>
                <IdentityImage.Component
                    cssClass={'avatar-identity-picture'}
                    getTarget={this._setIdentityImageElementRef}
                    size={avatarImageStyle.className}
                    identity={identity}
                    defaultGravatar={defaultGravatarMysteryManString}
                    onProfileCardToggle={this._onProfileCardToggle}
                    showProfileCardOnClick={!!this.props.showProfileCardOnClick} />
                <div className={'author'} style={{ width: authorCalculatedWidth }}>
                    <div className={badgeTextStyle}>
                        {this.props.imageProperties.displayName}
                    </div>
                </div>
            </div>;

            return (this.props.tooltip) ?
                <TooltipHost
                    id={this._tooltipId}
                    content={this.props.tooltip}
                    directionalHint={DirectionalHint.bottomCenter}
                    calloutProps={{
                        className: css({ hidden: !this.state.showTooltip })
                    }}>
                    {avatarBadgeElement}
                </TooltipHost>
                : avatarBadgeElement;
        } else {
            return <div />;
        }
    }

    @autobind
    private _handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._invokePersonaCardOnIdentityImage();
        }
    }

    @autobind
    private _invokePersonaCardOnIdentityImage(): void {
        this._identityImageElement.click();
    }

    @autobind
    private _onProfileCardToggle(isVisible: boolean): void {
        this.setState({ showTooltip: !isVisible });
    }

    @autobind
    private _setIdentityImageElementRef(element: HTMLElement): void {
        this._identityImageElement = element;
    }

    public dispose(): void {
        this._identityImageElement = null;
    }
}

export interface IAvatarCardProperties {
    imageProperties: IAvatarImageProperties;
    imageAltText?: string;
    imageTooltip?: string;
    primaryLinkText?: string;
    primaryLinkTextTooltip?: string;
    primaryLinkUrl?: string;
    onPrimaryLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
    primaryText?: string;
    primaryTextTooltip?: string;
    secondaryLinkText?: string;
    secondaryLinkTextTooltip?: string;
    secondaryLinkUrl?: string;
    onSecondaryLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
    secondaryText?: string;
    secondaryTextTooltip?: string;
    badges?: BadgeProps[];
    additionalComponent?: JSX.Element; // Appended to the secondary line of the component
}

/**
 * Renders Avatar Card control
 */
export class AvatarCard extends React.Component<IAvatarCardProperties, {}> {
    constructor(props: IAvatarCardProperties, context?: any) {
        super(props, context);
    }

    public render(): JSX.Element {
        const avatarImageStyle: IAvatarImageStyle = AvatarUtils.AvatarImageSizeToCssStyle(this.props.imageProperties.size);
        const authorCalculatedWidth: string = Utils_String.format("calc(100% - {0}px)", avatarImageStyle.imageSize + 10);
        return (
            <div className={'avatar-card'} >
                <div className={'avatar'} >
                    <IdentityImage.Component
                        cssClass="avatar-identity-picture"
                        size={avatarImageStyle.className}
                        identity={AvatarUtils.AvatarImagePropertiesToPersonaCardIdentityRef(this.props.imageProperties)}
                        altText={this.props.imageAltText}
                        defaultGravatar={defaultGravatarMysteryManString}
                        dataIsFocusable
                        showProfileCardOnClick={true} />
                </div>
                <div className="card-details" style={{ width: authorCalculatedWidth }} >
                    <TwoLineView
                        primaryLinkText={this.props.primaryLinkText}
                        primaryLinkTextTooltip={this.props.primaryLinkTextTooltip}
                        primaryText={this.props.primaryText}
                        primaryTextTooltip={this.props.primaryTextTooltip}
                        primaryLinkUrl={this.props.primaryLinkUrl}
                        onPrimaryLinkClick={this.props.onPrimaryLinkClick}
                        secondaryLinkText={this.props.secondaryLinkText}
                        secondaryLinkTextTooltip={this.props.secondaryLinkTextTooltip}
                        secondaryText={this.props.secondaryText}
                        secondaryTextTooltip={this.props.secondaryTextTooltip}
                        secondaryLinkUrl={this.props.secondaryLinkUrl}
                        onSecondaryLinkClick={this.props.onSecondaryLinkClick}
                        badges={this.props.badges}
                        additionalComponent={this.props.additionalComponent}
                        />
                </div>
            </div>
        );
    }
}


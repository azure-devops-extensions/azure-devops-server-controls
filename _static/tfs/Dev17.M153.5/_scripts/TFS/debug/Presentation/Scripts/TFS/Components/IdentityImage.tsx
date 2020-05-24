/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityRef } from "VSS/WebApi/Contracts";

import * as Constants_Platform from "VSS/Common/Constants/Platform";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Controls from "VSS/Identities/Picker/Controls";
import { PersonaCard } from "VSS/Identities/Picker/PersonaCard";
import * as Service from "VSS/Service";
import { KeyCode } from "VSS/Utils/UI";

import { autobind } from "OfficeFabric/Utilities";

// sizes based on content of _Common.scss on 28 April 2016
export const imageSizeXSmall: string = "x-small";  // 16
export const imageSizeSmall: string = "small";  // 32
export const imageSizeMedium: string = ""; // 48  -- default
export const imageSizeLarge: string = "large-identity-picture"; // 80

export interface Props extends React.Props<Component> {
    tfsContext?: TfsContext;
    cssClass?: string;
    size?: string;
    identity?: IdentityRef;
    defaultGravatar?: string;
    altText?: string;
    showProfileCardOnClick?: boolean;
    onProfileCardToggle?(isVisible: boolean): void;
    /** Set when IdentityImage.Component is within a focus zone **/
    dataIsFocusable?: boolean;
    /** Set when IdentityImage.Component is a tab stop but not in focus zone **/
    isTabStop?: boolean;
    /** Call back returning the div with on click invoking persona card **/
    getTarget?(element: HTMLElement): void;
}

export interface State {
    showProfileCard: boolean;
}

export class Component extends React.Component<Props, State> {
    private targetElement: HTMLElement;

    constructor(props: Props) {
        super(props);

        this.state = {
            showProfileCard: false
        };
    }

    public componentDidMount(): void {
        if (this.props.getTarget) {
            this.props.getTarget(this.targetElement);
        }
    }

    public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
        if (!this.props.identity && !nextProps.identity) {
            return false;
        } else if (!this.props.identity || !nextProps.identity) {
            return true;
        }
        return (this.props.size !== nextProps.size)
            || (this.props.cssClass !== nextProps.cssClass)
            || (this.props.identity.id !== nextProps.identity.id)
            || (this._getEmail(this.props) !== this._getEmail(nextProps)
                || (this.state.showProfileCard !== nextState.showProfileCard));
    }

    public render(): JSX.Element {
        let className: string = "identity-picture";
        if (this.props.size) {
            className += " " + this.props.size;
        }

        let identityId: string;
        if (this.props.identity) {
            identityId = this.props.identity.id;
            className += " identity-" + identityId;
        }

        const tfsContext = this.props.tfsContext || TfsContext.getDefault();
        const email: string = this._getEmail(this.props);

        let url: string = this.props.identity
            && this.props.identity._links
            && this.props.identity._links.avatar
            && this.props.identity._links.avatar.href;

        if (!url) {
            if (this.props.defaultGravatar) {
                url = tfsContext.getIdentityImageUrl(
                    identityId,
                    {
                        email: email,
                        defaultGravatar: this.props.defaultGravatar,
                    });
            } else {
                url = tfsContext.getIdentityImageUrl(identityId, { email: email });
            }
        }

        const altText = (this.props.altText === undefined) ? "" : this.props.altText;
        const labelText = this.props.identity ? this.props.identity.displayName : altText;

        // Set the focus attributes based on props passed
        const focusAttributes: IDictionaryStringTo<any> = {};
        if (this.props.dataIsFocusable) {
            focusAttributes["data-is-focusable"] = true;
        }
        if (this.props.isTabStop) {
            focusAttributes["tabIndex"] = 0;
        }

        // Getting the reference to the div around the image because the Callout within PersonaCard has positioning problems in some cases when passing in img element as the target
        return <div
            className={this.props.cssClass}
            ref={this._setTargetRef}
            {...focusAttributes}
            aria-label={labelText}
            onKeyDown={this._handleKeyDown}
            onClick={this._showProfileCard}
            aria-expanded={this.state.showProfileCard}>
            <img className={className} src={url} alt={altText} />
            {this.state.showProfileCard &&
                <PersonaCard
                    uniqueAttribute={this.props.identity.uniqueName || this.props.identity.id}
                    target={this.targetElement as HTMLElement}
                    entityOperationsFacade={Service.getService(Controls.EntityOperationsFacade)}
                    onDismissCallback={this._onProfileCardDismissed}
                    displayName={this.props.identity.displayName}
                    consumerId="37C4B067-1137-4241-A37C-EDE3D7A25BAE"
                    imageUrl={url} />
            }
        </div>;
    }

    @autobind
    private _setTargetRef(targetElement: HTMLElement): void {
        this.targetElement = targetElement;
    }

    @autobind
    private _handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._showProfileCard(e);
        }
    }

    @autobind
    private _showProfileCard(e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>): void {
        const showProfileCardEnabled = this.props.showProfileCardOnClick
            && FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ReactProfileCard);
        if (showProfileCardEnabled) {
            this._setProfileCardVisible(true);

            // If we don't stop propagation here, when we use this component within a Callout,
            // the click event will bubble up to the Callout and close the Callout.
            e.stopPropagation();
        }
    }

    @autobind
    private _onProfileCardDismissed(): void {
        this._setProfileCardVisible(false);
    }

    private _setProfileCardVisible(isVisible: boolean): void {
        this.setState(
            { showProfileCard: isVisible },
            () => {
                if (this.props.onProfileCardToggle) {
                    this.props.onProfileCardToggle(isVisible);
                }
            }
        );
    }

    private _getEmail(props: Props): string {
        if (props.identity) {
            return !props.identity.id ? props.identity.uniqueName : undefined;
        }
    }
}

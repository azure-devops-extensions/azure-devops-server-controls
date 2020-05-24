/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { KeyCode } from "VSS/Utils/UI";

import * as InjectDependency from "VersionControl/Scenarios/Shared/InjectDependency";
import Controls = require("VSS/Identities/Picker/Controls");
import * as PersonaCard_Async from "VSS/Identities/Picker/PersonaCard";
import Service = require("VSS/Service");

import "VSS/LoaderPlugins/Css!VersionControl/AvatarSmallMinus";

export interface AvatarProps {
    displayName: string;
    email: string;
    identityId?: string;
    showPersonaCard?: boolean;
    imageUrl?: string;
}

interface AvatarSmallMinusProps extends AvatarProps {
    identityImageUrl: string;
}

interface AvatarSmallMinusState {
    personaCardVisible: boolean;
    showTooltip: boolean;
}

class AvatarSmallMinus extends React.Component<AvatarSmallMinusProps, AvatarSmallMinusState> {
    private targetElement: HTMLElement;

    constructor(props: AvatarSmallMinusProps) {
        super(props);
        this.state = {
            personaCardVisible: false,
            showTooltip: true,
        }
    }

    public render(): JSX.Element {
        let userTip = `${this.props.displayName}`;
        if (this.props.email) {
            userTip += ` <${this.props.email}>`;
        }
        return (
            <TooltipHost
                hostClassName="vc-user-avatar-host"
                content={userTip}
                directionalHint={DirectionalHint.bottomCenter}
                calloutProps={{
                    className: css({ hidden: !this.state.showTooltip })
                }}>
                <div
                    className="vc-user-avatar-small-minus"
                    aria-label={userTip}
                    ref={this._setTargetElement}
                    data-is-focusable={true}
                    onClick={this._showPersonaCard}
                    onKeyDown={this._handleKeyDown}
                    aria-expanded={this.state.personaCardVisible}>
                    <img
                        className="vc-identity-picture identity-picture small-minus"
                        src={this.props.identityImageUrl}
                        alt="" />
                    <span className="vc-display-name-small-minus">{this.props.displayName}</span>
                    {this.state.personaCardVisible &&
                        <PersonaCard
                            uniqueAttribute={!this.props.identityId ? this.props.email : this.props.identityId}
                            target={this.targetElement as HTMLElement}
                            entityOperationsFacade={Service.getService(Controls.EntityOperationsFacade)}
                            onDismissCallback={this._hidePersonaCard}
                            displayName={this.props.displayName}
                            consumerId="4D26BD12-4AB8-42B7-920E-87E661B45E39"
                            imageUrl={this.props.identityImageUrl} />
                    }
                </div>
            </TooltipHost>
        );
    }

    @autobind
    private _setTargetElement(element: HTMLDivElement): void {
        this.targetElement = element;
    }

    @autobind
    private _handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._showPersonaCard();
        }
    }

    @autobind
    private _showPersonaCard(): void {
        if (this.props.showPersonaCard) {
            this.setState({
                personaCardVisible: true,
                showTooltip: false,
            });
        }
    }

    @autobind
    private _hidePersonaCard(): void {
        this.setState({
            personaCardVisible: false,
            showTooltip: true,
        });
    }
}

export const Avatar = InjectDependency.useTfsContext<AvatarProps>((tfsContext, props) =>
    <AvatarSmallMinus
        identityImageUrl={props.imageUrl ? props.imageUrl : tfsContext.getIdentityImageUrl(props.identityId, { email: props.email })}
        {...props} />);

const PersonaCard = getAsyncLoadedComponent(
    ["VSS/Identities/Picker/PersonaCard"],
    (module: typeof PersonaCard_Async) => module.PersonaCard);
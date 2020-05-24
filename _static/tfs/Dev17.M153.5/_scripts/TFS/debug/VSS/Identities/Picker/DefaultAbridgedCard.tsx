/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");

import { Persona } from "OfficeFabric/components/Persona/Persona";
import { PersonaSize } from "OfficeFabric/components/Persona/Persona.types";
import { Label } from "OfficeFabric/Label";
import {
    TooltipHost,
    TooltipOverflowMode
} from "OfficeFabric/Tooltip";

import { DefaultCardContactLine } from "VSS/Identities/Picker/DefaultCard";
import { personaCardEntity } from "VSS/Identities/Picker/PersonaCardContracts";
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");


export interface DefaultAbridgedCardProps extends Component_Base.Props {
    /**
     * Identity object for persona and contact information.
     */
    identity: Identities_Picker_RestClient.IEntity;

    /**
    * Publish telemetry on card load
    */
    publishTelemetry: (cardType: string, action: string) => void;
}

export class DefaultAbridgedCard extends React.Component<DefaultAbridgedCardProps, {}> {
    // Render
    public render(): JSX.Element {
        const mainPersonaData = {
            imageUrl: this.props.identity.image,
            primaryText: this.props.identity.displayName
        };
        const mainPersona = (
            <div>
                <Persona
                    { ...mainPersonaData }
                    key={this.props.identity.entityId}
                    size={PersonaSize.large}
                    className="persona-main"
                    onRenderPrimaryText={() => {
                        return (
                            <TooltipHost
                                key={`${this.props.identity.entityId}.primarytext.tooltip`}
                                content={mainPersonaData.primaryText}
                                overflowMode={TooltipOverflowMode.Parent}
                            >
                                <span className={"persona-main-text-primary"}>
                                    {mainPersonaData.primaryText}
                                </span>
                            </TooltipHost>
                        );
                    }}
                    imageShouldFadeIn={false}
                />
            </div>
        );

        return (
            <div className="default-card-abridged">
                {/* Main persona display */}
                {mainPersona}

                {/* Section to hold contact information */}
                {this._verifySignInAddress() &&
                    <div>
                        {/* Brief contact information */}
                        <div className="default-card-contact-info-wrapper">
                            <hr className="hr-main" />

                            <div className="default-card-header-wrapper">
                                <span className="default-card-header">
                                    <Label>
                                        <b className="default-card-header-space">{Resources_Platform.ProfileCard_ContactHeader}</b>
                                    </Label>
                                </span>
                            </div>

                            {
                                <div className="default-card-contact-info-container">
                                    <DefaultCardContactLine
                                        iconName="Mail"
                                        content={this.props.identity.signInAddress}
                                        link={"mailto:" + this.props.identity.signInAddress}
                                        publishTelemetry={this.props.publishTelemetry}
                                    />
                                    <DefaultCardContactLine
                                        iconName="Chat"
                                        content={Resources_Platform.ProfileCard_SendChat}
                                        link={"sip:" + this.props.identity.signInAddress}
                                        publishTelemetry={this.props.publishTelemetry}
                                    />
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>
        );
    }

    private _verifySignInAddress(): boolean {
        if (!this.props.identity.signInAddress) {
            return false;
        }

        // this is copied from System.ComponentModel.DataAnnotations.EmailAddressAttribute
        const PROFILE_EMAIL_ADDRESS_PATTERN: RegExp = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;

        if (PROFILE_EMAIL_ADDRESS_PATTERN.test(this.props.identity.signInAddress)) {
            return true;
        }

        return false;
    }
}
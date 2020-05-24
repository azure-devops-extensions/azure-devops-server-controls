/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");

import { Persona } from "OfficeFabric/components/Persona/Persona";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/components/Link/Link";
import { autobind } from "OfficeFabric/Utilities";

import { personaCardEntity } from "VSS/Identities/Picker/PersonaCardContracts";
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import * as Utils_String from "VSS/Utils/String";

/**
 * Definitions for ContactCardContactLine used by ContactCard.
 */
export interface ContactCardContactLineProps extends Component_Base.Props {
    /**
    * Label for line.
    */
    label?: string;

    /**
    * Content for line.
    */
    content?: string;

    /**
    * Link (if not link, left blank).
    */
    link?: string;

    /**
     * Option to pad top.
     */
    padTop?: boolean;

    /**
    * Publish telemetry on contact information click
    */
    publishTelemetry?: (cardType: string, action: string, source?: string) => void;
}

export class ContactCardContactLine extends React.Component<ContactCardContactLineProps, {}> {
    // Render
    public render(): JSX.Element {
        return (
            <div>
                <div className={this.props.padTop ? "contact-card-line-top" : "contact-card-line"}>
                    <div className="contact-card-span-label">{this.props.label}</div>
                    <div className="contact-card-span-content">
                        {this.props.link && this.props.content &&
                            <a className="profile-card-tab-element"
                                href={this.props.link}
                                onClick={() => {
                                    this.props.publishTelemetry(Utils_String.format("{0}", this.props.label), personaCardEntity.clicked);
                                }}
                            >
                                {this.props.content}
                            </a>
                        }
                        {!this.props.link &&
                            this.props.content
                        }
                    </div>
                </div>
                <div style={{clear: "both"}}></div>
            </div>
        );
    }
}

/**
 * Definitions for ContactCard.
 */
export interface ContactCardProps extends Component_Base.Props {
    /**
     * Identity object for persona and contact information.
     */
    identity?: Identities_Picker_RestClient.IEntity;

    /**
    * Publish telemetry on card load
    */
    publishTelemetry: (cardType: string, action: string) => void;
}

export class ContactCard extends React.Component<ContactCardProps, {}> {
    // Render
    public render(): JSX.Element {
        const { identity } = this.props;

        return (
            <div className="contact-or-organization-card-wrapper">
                {/* Section for heading */}
                <div className="contact-card-header-wrapper">
                    <div style={{fontSize: 14}}>
                        <Label>{Resources_Platform.ProfileCard_ContactInformation}</Label>
                    </div>
                </div>

                {/* Section for contact information */}
                <div className="contact-card-info-wrapper">
                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_Email}
                        content={identity.mail}
                        link={"mailto:" + identity.mail}
                        publishTelemetry={this.props.publishTelemetry}
                    />
                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_TelephoneNumber}
                        content={identity.telephoneNumber}
                        link={"tel:" + identity.telephoneNumber}
                        publishTelemetry={this.props.publishTelemetry}
                    />
                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_PhysicalDeliveryOfficeName}
                        content={identity.physicalDeliveryOfficeName}
                    />

                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_JobTitle}
                        content={identity.jobTitle}
                        padTop={true}
                    />
                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_Department}
                        content={identity.department}
                    />
                    <ContactCardContactLine
                        label={Resources_Platform.ProfileCard_Alias}
                        content={identity.mailNickname}
                    />
                </div>
            </div>
        );
    }
}
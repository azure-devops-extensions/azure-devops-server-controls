/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");

import { Icon } from "OfficeFabric/Icon";
import { Persona } from "OfficeFabric/components/Persona/Persona";
import { PersonaSize } from "OfficeFabric/components/Persona/Persona.types";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/components/Link/Link";
import {
    TooltipHost,
    TooltipOverflowMode
} from "OfficeFabric/Tooltip";
import { autobind } from "OfficeFabric/Utilities";

import { personaCardEntity } from "VSS/Identities/Picker/PersonaCardContracts";
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import * as Utils_String from "VSS/Utils/String";

/**
 * Definitions for DefaultCardContactLine (used by DefaultCard).
 */
export interface DefaultCardContactLineProps extends Component_Base.Props {
    /**
    * Name for icon.
    */
    iconName?: string;

    /**
    * Content for line.
    */
    content?: string;

    /**
    * Link (if not link, left blank).
    */
    link?: string;

    /**
    * Publish telemetry on contact information click
    */
    publishTelemetry?: (componentType: string, action: string) => void;
}

export class DefaultCardContactLine extends React.Component<DefaultCardContactLineProps, {}> {
    // Render
    public render(): JSX.Element {
        return (
            <div className="default-card-contact-line-wrapper">
                <Label className="default-card-contact-line">
                    <Icon iconName={this.props.iconName} className={"default-card-contact-line-label"} />
                    {this.props.link &&
                        <a href={this.props.link} className="default-card-contact-line-link profile-card-tab-element"
                            onClick={() => {
                                this.props.publishTelemetry(Utils_String.format("{0}", this.props.iconName), personaCardEntity.clicked);
                            }}>
                            {this.props.content}
                        </a>
                    }
                    {!this.props.link &&
                        <span className="default-card-contact-line-no-link">{this.props.content}</span>
                    }
                </Label>
            </div>
        );
    }
}

/**
 * Definitions for DefaultCard.
 */
export interface DefaultCardProps extends Component_Base.Props {
    /**
     * Identity object for persona and contact information.
     */
    identity?: Identities_Picker_RestClient.IEntity;

    /**
     * Direct manager identity object.
     */
    manager?: Identities_Picker_RestClient.IEntity;

    /**
     * Previous header exists boolean.
     */
    isPreviousHeader?: boolean;

    /**
     * Method to show contact card.
     */
    showContactCard?: () => void;

    /**
     * Method to show organization card.
     */
    showOrganizationCard?: () => void;

    /**
     * Method to handle identity click.
     */
    onClickEntity?: (identifier: string | Identities_Picker_RestClient.IEntity) => void;

    /**
     * Publish telemetry on card load
    */
    publishTelemetry: (componentType: string, action: string, source?: string) => void;

    /**
    * Function to set the focus to first active element of focuszone on update of the card.
    */
    setFocus?: () => void;
}

export class DefaultCard extends React.Component<DefaultCardProps, {}> {

    // Setting the focus for the case of default card mounting when we come back via back header
    public componentDidMount(): void {
        if (this.props.setFocus) {
            this.props.setFocus();
        }
    }

    // Render
    public render(): JSX.Element {
        const { identity, isPreviousHeader } = this.props;

        const mainPersonaData = {
            imageUrl: this.props.identity.image,
            primaryText: this.props.identity.displayName,
            secondaryText: this.props.identity.jobTitle,
            tertiaryText: this.props.identity.department
        };
        const mainPersona = (
            <div>
                <Persona
                    { ...mainPersonaData }
                    key={this.props.identity.entityId + this.props.identity.signInAddress}
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
                    onRenderSecondaryText={() => {
                        return (
                            <TooltipHost
                                key={`${this.props.identity.entityId}.secondarytext.tooltip`}
                                content={mainPersonaData.secondaryText}
                                overflowMode={TooltipOverflowMode.Parent}
                            >
                                <span className={"persona-main-text-secondary"}>
                                    {mainPersonaData.secondaryText}
                                </span>
                            </TooltipHost>
                        );
                    }}
                    onRenderTertiaryText={() => { return <div className="persona-main-text-tertiary">{mainPersonaData.tertiaryText}</div> }}
                    imageShouldFadeIn={false}
                />
            </div>
        );

        let managerPersona = null;
        if (this.props.manager) {
            const adjacentManager = this.props.manager;
            const adjacentManagerData = {
                imageUrl: adjacentManager.image,
                primaryText: adjacentManager.displayName,
                secondaryText: adjacentManager.jobTitle,
                tertiaryText: adjacentManager.department
            };
            managerPersona = (
                <div
                    className="persona-list-manager-element profile-card-tab-element"
                    aria-label={adjacentManager.displayName}
                    key={adjacentManager.entityId + adjacentManager.signInAddress}
                    onClick={() => {
                        this.props.publishTelemetry(personaCardEntity.personaCard, personaCardEntity.loaded, personaCardEntity.reportingManager);
                        this.props.onClickEntity(adjacentManager);
                    }}
                    data-is-focusable={true}
                    role={"button"}
                >
                    <Persona
                        { ...adjacentManagerData }
                        size={PersonaSize.size40}
                        onRenderPrimaryText={() => { return <div className="persona-list-element-text-primary">{adjacentManagerData.primaryText}</div> }}
                        onRenderSecondaryText={() => { return <div className="persona-list-element-text-secondary">{adjacentManagerData.secondaryText}</div> }}
                        imageShouldFadeIn={false}
                    />
                </div>
            );
        }

        return (
            <div className={isPreviousHeader ? "default-card-with-header" : "default-card-without-header"}>
                {/* Main persona display */}
                {mainPersona}

                {/* Section to hold brief contact information and direct manager */}
                <div>
                    {/* Brief contact information */}
                    {
                        (identity.mail || identity.telephoneNumber || identity.physicalDeliveryOfficeName) &&
                        <div className="default-card-contact-info-wrapper">
                            <hr className="hr-main" />

                            <div className="default-card-header-wrapper">
                                <span className="default-card-header pointer profile-card-tab-element"
                                    onClick={() => {
                                        this.props.publishTelemetry(personaCardEntity.contactCard, personaCardEntity.loaded);
                                        this.props.showContactCard();
                                    }}
                                    aria-label={Resources_Platform.ProfileCard_ContactHeader}
                                    data-is-focusable={true}
                                    role="button">
                                    <Label className="pointer">
                                        <b className="default-card-header-space">{Resources_Platform.ProfileCard_ContactHeader}</b>
                                        <span className="icon bowtie-icon bowtie-chevron-right-light default-card-header-chevron" />
                                    </Label>
                                </span>
                            </div>

                            < div className="default-card-contact-info-container">
                                {identity.mail &&
                                    <DefaultCardContactLine
                                        iconName="Mail"
                                        content={identity.mail}
                                        link={"mailto:" + identity.mail}
                                        publishTelemetry={this.props.publishTelemetry}
                                    />
                                }
                                {identity.mail &&
                                    <DefaultCardContactLine
                                        iconName="Chat"
                                        content={Resources_Platform.ProfileCard_SendChat}
                                        link={"sip:" + identity.mail}
                                        publishTelemetry={this.props.publishTelemetry}
                                    />
                                }
                                {identity.telephoneNumber &&
                                    <DefaultCardContactLine
                                        iconName="Phone"
                                        content={identity.telephoneNumber}
                                        link={"tel:" + identity.telephoneNumber}
                                        publishTelemetry={this.props.publishTelemetry}
                                    />
                                }
                                {identity.physicalDeliveryOfficeName &&
                                    <DefaultCardContactLine
                                        iconName="POI"
                                        content={identity.physicalDeliveryOfficeName}
                                    />
                                }
                            </div>
                        </div>
                    }

                    {this._renderDirectManagerElement(managerPersona)}
                </div>
            </div>
        );
    }

    /**
     * Renders the direct manager for the persona.
     * @param managerPersona The manager persona.
     */
    private _renderDirectManagerElement(managerPersona: JSX.Element) {

        if (!managerPersona) {
            return null;
        }

        return (
            <div className="default-card-direct-manager-wrapper">
                <hr className="hr-secondary" />

                <div className="default-card-header-wrapper">
                    <span className="default-card-header pointer profile-card-tab-element"
                        onClick={() => {
                            this.props.publishTelemetry(personaCardEntity.orgCard, personaCardEntity.loaded);
                            this.props.showOrganizationCard();
                        }}
                        aria-label={Resources_Platform.ProfileCard_Organization}
                        data-is-focusable={true}
                        role="button"
                    >
                        <Label className="pointer">
                            <b className="default-card-header-space">{Resources_Platform.ProfileCard_Organization}</b>
                            <span className="icon bowtie-icon bowtie-chevron-right-light default-card-header-chevron" />
                        </Label>
                    </span>
                </div>

                <div className="default-card-direct-manager">
                    <div className="default-card-header-reportsto">
                        {Resources_Platform.ProfileCard_ReportsToHeader}
                    </div>

                    {managerPersona}
                </div>
            </div>
        );
    }
}
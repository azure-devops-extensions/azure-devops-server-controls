/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");

import { Persona } from "OfficeFabric/components/Persona/Persona";
import { PersonaSize } from "OfficeFabric/components/Persona/Persona.types";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/components/Link/Link";

import { personaCardEntity } from "VSS/Identities/Picker/PersonaCardContracts";
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_String = require("VSS/Utils/String");

export interface OrganizationCardProps extends Component_Base.Props {
    /**
     * Identity object for persona and contact information.
     */
    identity?: Identities_Picker_RestClient.IEntity;

    /**
     * List of managers.
     */
    managerList?: Identities_Picker_RestClient.IEntity[];

    /**
     * List of direct reports.
     */
    directReportList?: Identities_Picker_RestClient.IEntity[];

    /**
     * Method to handle identity click.
     */
    onClickEntity?: (identifier: string | Identities_Picker_RestClient.IEntity) => void;

    /**
    * Publish telemetry on card load
    */
    publishTelemetry: (cardType: string, action: string, source?: string) => void;
}

export class OrganizationCard extends React.Component<OrganizationCardProps, {}> {
    // Render
    public render(): JSX.Element {
        const { identity, managerList, directReportList } = this.props;

        const managerPersonaList = this.createManagerChainPersonaElements();
        const directReportPersonaList = this.createDirectReportsPersonaElements();

        return (
            <div className="contact-or-organization-card-wrapper">
                <div className="organization-card-content">
                    {/* Section for heading */}
                    <div className="organization-card-header-wrapper">
                        <div style={{ fontSize: 14 }}>
                            <Label>{Resources_Platform.ProfileCard_Organization}</Label>
                        </div>
                    </div>

                    {/* Section for manager chain */}
                    <div className="organization-card-manager-chain-wrapper">
                        {managerPersonaList}
                    </div>

                    {/* Section for "Reporting to [person]" and the Persona list */}
                    {directReportPersonaList.length > 0 &&
                        <div className="organization-card-direct-reports-wrapper">
                            <Label className="organization-card-direct-reports-label">
                                {Utils_String.format(Resources_Platform.ProfileCard_ReportingToPhrase, this.props.identity.displayName, this.props.directReportList.length)}
                            </Label>
                            {directReportPersonaList}
                        </div>
                    }
                </div>
            </div>
        );
    }

    // Helper methods to create Presona elements
    private createManagerChainPersonaElements() {
        var self = this;

        const managerChainElementList = this.props.managerList.map(function (manager) {
            const managerData = {
                imageUrl: manager.image,
                primaryText: manager.displayName ? manager.displayName : "",
                secondaryText: manager.jobTitle ? manager.jobTitle : "",
                tertiaryText: manager.department ? manager.department : ""
            };
            return (
                <div
                    className="persona-list-element profile-card-tab-element"
                    aria-label={manager.displayName}
                    key={manager.entityId + manager.signInAddress}
                    onClick={() => {
                        self.props.publishTelemetry(personaCardEntity.orgCardManagerChain, personaCardEntity.loaded, personaCardEntity.orgCard);
                        self.props.onClickEntity(manager);
                    }}
                    data-is-focusable={true}
                    role={"button"}
                >
                    <Persona
                        { ...managerData }
                        size={PersonaSize.size40}
                        onRenderPrimaryText={() => { return <div className="persona-list-element-text-primary">{managerData.primaryText}</div> }}
                        onRenderSecondaryText={() => { return <div className="persona-list-element-text-secondary">{managerData.secondaryText}</div> }}
                        imageShouldFadeIn={false}
                    />
                </div>
            );
        });

        // Append current identity to list
        const mainPersonaData = {
            imageUrl: this.props.identity.image,
            primaryText: this.props.identity.displayName,
            secondaryText: this.props.identity.jobTitle,
            tertiaryText: this.props.identity.department
        }
        managerChainElementList.push(
            <div
                className="persona-list-element profile-card-tab-element"
                aria-label={this.props.identity.displayName}
                key={this.props.identity.entityId + this.props.identity.signInAddress}
                onClick={() => {
                    self.props.publishTelemetry(personaCardEntity.personaCard, personaCardEntity.loaded, personaCardEntity.orgCard);
                    self.props.onClickEntity(this.props.identity);
                }}
                data-is-focusable={true}
                role={"button"}
            >
                <Persona
                    { ...mainPersonaData }
                    size={PersonaSize.size40}
                    onRenderPrimaryText={() => { return <div className="persona-list-element-text-primary">{mainPersonaData.primaryText}</div> }}
                    onRenderSecondaryText={() => { return <div className="persona-list-element-text-secondary">{mainPersonaData.secondaryText}</div> }}
                    imageShouldFadeIn={false}
                />
            </div>
        );

        return managerChainElementList;
    }

    private createDirectReportsPersonaElements() {
        var self = this;

        const directReportElementList = this.props.directReportList.map(function (directReport) {
            const directReportData = {
                imageUrl: directReport.image,
                primaryText: directReport.displayName ? directReport.displayName : "",
                secondaryText: directReport.jobTitle ? directReport.jobTitle : "",
                tertiaryText: directReport.department ? directReport.department : ""
            };
            return (
                <div
                    className="persona-list-element profile-card-tab-element"
                    aria-label={directReport.displayName}
                    key={directReport.entityId + directReport.signInAddress}
                    onClick={() => {
                        self.props.publishTelemetry(personaCardEntity.orgCardDirectReport, personaCardEntity.loaded, personaCardEntity.orgCard);
                        self.props.onClickEntity(directReport);
                    }}
                    data-is-focusable={true}
                    role={"button"}
                >
                    <Persona
                        { ...directReportData }
                        size={PersonaSize.size40}
                        onRenderPrimaryText={() => { return <div className="persona-list-element-text-primary">{directReportData.primaryText}</div> }}
                        onRenderSecondaryText={() => { return <div className="persona-list-element-text-secondary">{directReportData.secondaryText}</div> }}
                        imageShouldFadeIn={false}
                    />
                </div>
            );
        });

        return directReportElementList;
    }
}
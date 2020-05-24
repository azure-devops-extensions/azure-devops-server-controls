/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />

import React = require("react");

import { Persona } from "OfficeFabric/components/Persona/Persona";
import { PersonaSize } from "OfficeFabric/components/Persona/Persona.types";
import {
    TooltipHost,
    TooltipOverflowMode
} from "OfficeFabric/Tooltip";

import Component_Base = require("VSS/Flux/Component");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");

export interface DefaultSimpleCardProps extends Component_Base.Props {
    /**
     * Identity object for persona and contact information.
     */
    identity: Identities_Picker_RestClient.IEntity;
}

export class DefaultSimpleCard extends React.Component<DefaultSimpleCardProps, {}> {
    // Render
    public render(): JSX.Element {        
        const mainPersonaData = {
            imageUrl:  this.props.identity.image,
            primaryText: this.props.identity.displayName,
            secondaryText: this.props.identity.scopeName && this.props.identity.signInAddress
                            ? this.props.identity.scopeName + "\\" + this.props.identity.signInAddress
                            : this.props.identity.signInAddress
                                ? this.props.identity.signInAddress
                                : ""
        };

        return (
            <div className="default-card-simple">
                {/* Main persona display */}
                <div>
                    <Persona
                        { ...mainPersonaData }
                        key={ this.props.identity.entityId }
                        size={ PersonaSize.large }
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
                        imageShouldFadeIn={ false }
                    />
                </div>
            </div>
        );
    }
}
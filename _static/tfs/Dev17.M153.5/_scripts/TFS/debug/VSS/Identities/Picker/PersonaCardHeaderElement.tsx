/// <amd-dependency path='VSS/LoaderPlugins/Css!PersonaCard' />
import React = require("react");

import { Persona } from "OfficeFabric/components/Persona/Persona";
import { PersonaSize } from "OfficeFabric/components/Persona/Persona.types";
import { Icon } from "OfficeFabric/Icon";
import {
    TooltipHost,
    TooltipOverflowMode
} from "OfficeFabric/Tooltip";
import * as Component_Base from "VSS/Flux/Component";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";

/**
 * Definitions for HeaderElement used by PersonaCard.
 */
export interface HeaderElementProps extends Component_Base.Props {
    /**
    * Current data state (can be null).
    */
    identity?: Identities_Picker_RestClient.IEntity;

    /**
    * Function on click (show default card or pop breadcrumb).
    */
    onClickFunction?: () => void;

    /**
    * Function to set the focus to first active element of focuszone on update of the card.
    */
    setFocus?: () => void;
}

export class PersonaCardHeaderElement extends React.Component<HeaderElementProps, {}> {

    private _personaElement: HTMLDivElement;

    public componentDidMount(): void {
        this.props.setFocus();
    }

    public componentDidUpdate(): void {
        this.props.setFocus();
    }

    // Constructor
    constructor(props: HeaderElementProps) {
        super(props);
    }

    // Render
    public render(): JSX.Element {
        if (!this.props.identity) { // Identity is null in the case of previous
            return null;
        }

        const identity = this.props.identity;
        const personaData = {
            imageUrl: identity.image,
            primaryText: identity.displayName,
            secondaryText: identity.jobTitle,
            tertiaryText: identity.department
        };

        return (
            <div
                className="go-back-persona-wrapper"
                onClick={this.props.onClickFunction}
                aria-label={Resources_Platform.ProfileCard_HeaderButtonAriaLabel}
                ref={(element) => { this._personaElement = element; }}
                data-is-focusable={true}
                role={"button"}
            >

                <div>
                    <Icon iconName="ChevronLeft" className="go-back-chevron" />
                </div>
                <div className="go-back-positioning">
                    <Persona
                        { ...personaData }
                        size={PersonaSize.extraExtraSmall}
                        className="go-back-persona"
                        onRenderPrimaryText={() => {
                            return (
                                <TooltipHost
                                    key={`${identity.entityId}.tooltip`}
                                    content={identity.displayName}
                                    overflowMode={TooltipOverflowMode.Parent}
                                >
                                    <span className={"persona-header-text-primary"}>
                                        {identity.displayName}
                                    </span>
                                </TooltipHost>
                            );
                        }}
                        imageShouldFadeIn={false}
                    />
                </div>
            </div>
        );
    }

    /**
     * Sets the focus on this header.
     */
    public setFocus() {
        if (this._personaElement) {
            this._personaElement.focus();
        }
    }
}

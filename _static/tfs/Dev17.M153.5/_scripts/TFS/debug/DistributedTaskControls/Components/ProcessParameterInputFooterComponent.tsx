/// <reference types="react" />
import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { CalloutComponent, ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ButtonCallout, IButtonCalloutProps } from "DistributedTaskControls/Components/ButtonCallout";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ProcessParameterInputFooterComponent";

export interface IProps extends Base.IProps {
    inputFooterText: string;
    showFooter: boolean;
    footerDescriptionElementId?: string;
    buttonCalloutProps?: IButtonCalloutProps;
}

export class ProcessParameterInputFooterComponent extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        let showFooter: boolean = false;

        if (this.props.showFooter) {
            showFooter = this.props.showFooter;
        }
        //Checking if the callout is visible then also keep the footer input component visible
        else if (this._buttonCallout && this._buttonCallout.isCalloutVisible()) {
            showFooter = true;
        }

        //Show the footer elements
        return (showFooter &&
            this._getFooterElement()
        );
    }

    // Creates footer element div with button callout
    private _getFooterElement(): JSX.Element {

        return (
            <div className="processParameter-footer-container">
                <div id={this.props.footerDescriptionElementId} className="processParameter-footer-text"> {this.props.inputFooterText} </div>
                {this.props.buttonCalloutProps &&
                    <ButtonCallout
                        cssClass="processParameter-footer-link-container"
                        ref={this._resolveRef("_buttonCallout")}
                        buttonText={this.props.buttonCalloutProps.buttonText}
                        buttonTextAriaLabel={this.props.buttonCalloutProps.buttonText}
                        calloutContent={this.props.buttonCalloutProps.calloutContent} />
                }
            </div>
        );
    }

    private _buttonCallout: ButtonCallout;
}
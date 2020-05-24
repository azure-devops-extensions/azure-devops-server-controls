/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { CalloutComponent, ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { css } from "OfficeFabric/Utilities";
import { ActionButton } from "OfficeFabric/Button";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ButtonCallout";

export interface IButtonCalloutProps extends Base.IProps {
    buttonText?: string;
    calloutContent: ICalloutContentProps;

    //Defaults to "More Information"
    buttonTextAriaLabel?: string;
    buttonAriaDescription?: string;

    //Css to style the button
    buttonClassName?: string;

    //Css to style the icon
    iconClassName ?: string;
}

export interface IButtonCalloutContentState extends Base.IState {
    isCalloutVisible: boolean;
}

export class ButtonCallout extends Base.Component<IButtonCalloutProps, IButtonCalloutContentState> {

    public render(): JSX.Element {
        let buttonCalloutContainerStyle: string = css("dtc-button-callout", this.props.cssClass);

        //Creating callout content aria-label
        let buttonCalloutContentAriaLabel =
            this.props.calloutContent.calloutContentAriaLabel
                ? this.props.calloutContent.calloutContentAriaLabel
                : (
                    this.props.calloutContent.calloutHeader
                        ? Utils_String.format(Resources.InfoCalloutAriaLabel, this.props.calloutContent.calloutHeader)
                        : (this.props.buttonTextAriaLabel ? this.props.buttonTextAriaLabel : Resources.MoreInformation)
                );

        //Overriding props to handle visibility of callout
        let calloutProps: ICalloutContentProps = JQueryWrapper.extendDeep({}, this.props.calloutContent);
        calloutProps.calloutContentAriaLabel = buttonCalloutContentAriaLabel;
        calloutProps.calloutFooterOnClick = this._onCalloutFooterOnClick;

        return (
            (!!this.props.buttonText || !!this.props.iconClassName) ?
                <div className={buttonCalloutContainerStyle} ref={this._resolveRef("_buttonElement")}>
                    <ActionButton
                        className={this.props.buttonClassName}
                        {...(!!this.props.iconClassName && {iconProps: {className: this.props.iconClassName}})}
                        {...(!!this.props.buttonText && {text: this.props.buttonText})}
                        onClick={this._toggleButtonCalloutState}
                        ariaLabel={this.props.buttonTextAriaLabel}
                        ariaDescription={this.props.buttonAriaDescription}
                        tabIndex={0} >
                    </ActionButton>

                    {this.state.isCalloutVisible && (
                        <CalloutComponent
                            targetElement={this._buttonElement}
                            calloutDismissDelegate={this._onCalloutDismiss}
                            calloutContentProps={calloutProps} />
                    )}
                </div > :
                null);
    }

    // Public to get the state whether the callout is visible or not
    public isCalloutVisible(): boolean {
        return this.state.isCalloutVisible;
    }

    //Func to toggle the state of callout to change its visibility
    private _toggleButtonCalloutState = (): void => {
        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible
        });
    }

    //Func to dismiss the callout and then set focus on previously focused element
    private _onCalloutDismiss = (ev: Event | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void => {
        this.setState({
            isCalloutVisible: false
        });
    }

    private _onCalloutFooterOnClick = (): void => {
        // Dismiss callout on click.
        this.setState({
            isCalloutVisible: false
        });

        if (this.props.calloutContent.calloutFooterOnClick) {
            this.props.calloutContent.calloutFooterOnClick();
        }
    }

    private _buttonElement: HTMLElement;
}
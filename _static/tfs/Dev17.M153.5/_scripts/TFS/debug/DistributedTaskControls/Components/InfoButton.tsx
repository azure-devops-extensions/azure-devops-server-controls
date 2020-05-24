/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { CalloutComponent, ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Html from "VSS/Utils/Html";
import { KeyCode } from "VSS/Utils/UI";

import { IconButton } from "OfficeFabric/Button";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InfoButton";

export interface IProps extends Base.IProps {
    iconName?: string;
    iconStyle?: string;
    calloutContent?: ICalloutContentProps;
    isIconFocusable?: boolean;
    iconAriaLabel?: string;
    stopClickPropagation?: boolean;
    onFocus?: () => void;
}

export interface IState extends Base.IState {
    isCalloutVisible: boolean;
}

export class Component extends Base.Component<IProps, IState> {

    public render(): JSX.Element {
        let cssStyleName: string = (this.props.cssClass || "") + " " + "dtc-info-button";
        let iconClassName = " dtc-info-button-icon " + this.props.iconStyle;
        let infoCalloutAriaLabel =
            this.props.calloutContent.calloutContentAriaLabel
                ? this.props.calloutContent.calloutContentAriaLabel
                : (
                    this.props.calloutContent.calloutHeader
                        ? Utils_String.format(Resources.InfoCalloutAriaLabel, this.props.calloutContent.calloutHeader)
                        : (this.props.iconAriaLabel ? this.props.iconAriaLabel : Resources.InfoIconAriaLabel)
                );

        //Overriding props to handle visibility of callout
        let calloutProps: ICalloutContentProps = JQueryWrapper.extendDeep({}, this.props.calloutContent);
        calloutProps.calloutContentAriaLabel = infoCalloutAriaLabel;
        calloutProps.calloutFooterOnClick = this._onCalloutFooterOnClick;

        return (
            <div className={cssStyleName} ref={(icon) => this._infoButtonElement = icon}>
                <IconButton
                    iconProps={{iconName: this.props.iconName || "Info"}}
                    data-is-focusable={!!this.props.isIconFocusable}
                    className={iconClassName}
                    onClick={this._onInfoButtonClick}
                    onFocus={this._onInfoButtonFocus}
                    onKeyDown={this._handleKeyDown}
                    tabIndex={!!this.props.isIconFocusable ? 0 : null}
                    ariaLabel={this.props.iconAriaLabel || Resources.InfoIconAriaLabel} />
                {this.state.isCalloutVisible && (
                    <CalloutComponent
                        targetElement={this._infoButtonElement}
                        calloutDismissDelegate={this._onCalloutDismiss}
                        calloutContentProps={calloutProps} />
                )}
            </div>);
    }
    
    private _onInfoButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        this.toggleInfoCalloutState();
        if (this.props.stopClickPropagation) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onInfoButtonFocus = () => {
        if (this.props.onFocus) {
            this.props.onFocus();
        }
    }
    
    private _handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!!this.props.isIconFocusable
            && (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE)) {
            this.toggleInfoCalloutState();
            
            e.preventDefault();
            e.stopPropagation();
        }
    }

    public toggleInfoCalloutState = (): void => {
        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible
        });
    }

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

    private _infoButtonElement: HTMLElement;
}


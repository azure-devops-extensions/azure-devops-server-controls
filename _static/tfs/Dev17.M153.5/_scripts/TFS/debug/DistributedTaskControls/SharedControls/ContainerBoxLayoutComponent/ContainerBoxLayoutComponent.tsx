/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Icon } from "OfficeFabric/Icon";
import { autobind, css } from "OfficeFabric/Utilities";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IconButton, IButton } from "OfficeFabric/Button";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/ContainerBoxLayoutComponent/ContainerBoxLayoutComponent";

export interface IContainerBoxButtonProps {
    iconName: string;
    titleText: string;
    ariaDescription: string;
    onButtonClick: () => void;
}

export interface IHeadingIconProps {
    headingIconClassName?: string;
}

export interface IHeaderProps {
    headingText: string;
    ariaLevel: string;
    headerStyling?: string;
    headingIconProps?: IHeadingIconProps;
}

export interface IContainerBoxLayoutComponent extends Base.IProps {
    buttonProps?: IContainerBoxButtonProps;
    headingProps: IHeaderProps;
}

export class ContainerBoxLayoutComponent extends Base.Component<IContainerBoxLayoutComponent, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="container-box-layout-container">
                {this._renderHeaderContainer()}
                {this._renderContent()}
            </div>
        );
    }

    /**
     * Used to set focus on the header button
     */
    public focusHeaderButton(): void {
        if (this.props.buttonProps && this._headerButton) {
            this._headerButton.focus();
        }
    }

    /**
     * This renders the header part of the component
     */
    private _renderHeaderContainer(): JSX.Element {
        return (
            <div className="container-box-layout-header-container">
                <span
                    className={css(this.props.headingProps.headerStyling, "container-box-layout-header")}
                    role="heading"
                    aria-level={parseInt(this.props.headingProps.ariaLevel)}>

                    {this.props.headingProps.headingIconProps &&
                        <Icon className={css(this.props.headingProps.headingIconProps.headingIconClassName, "container-box-layout-header-icon")} />
                    }

                    <TooltipHost content={this.props.headingProps.headingText} overflowMode={TooltipOverflowMode.Parent}>
                        {this.props.headingProps.headingText}
                    </TooltipHost>
                </span>
                {this.props.buttonProps && this._getIconButton()
                }
            </div>
        );
    }

    /**
     * This render the button in the header container if you pass IContainerBoxButtonProps
     */
    private _getIconButton(): JSX.Element {
        return (
            < IconButton
                componentRef={this._resolveRef("_headerButton")}
                ariaDescription={this.props.buttonProps.ariaDescription ? this.props.buttonProps.ariaDescription : Utils_String.empty}
                iconProps={{ iconName: this.props.buttonProps.iconName }}
                title={this.props.buttonProps.titleText ? this.props.buttonProps.titleText : Utils_String.empty}
                onClick={this.props.buttonProps.onButtonClick}
                className="container-box-layout-header-button" />
        );
    }

    /**
     * This renders the content of the container box component
     */
    private _renderContent(): JSX.Element {
        return (
            <div className="container-box-layout-content">
                {this.props.children}
            </div>
        );
    }

    private _headerButton: IButton;
}
/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { IStatusProps, Status, StatusSize } from "VSSUI/Status";
import { TooltipHost, TooltipOverflowMode, DirectionalHint } from "VSSUI/Tooltip";
import { VssPersona } from "VSSUI/VssPersona";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/PersonaActivityComponent/PersonaActivityComponent";

export interface IPersonaProps {
    iconUrl: string;
    displayName: string;
    personaImageCss?: string;
}

export interface IPersonaTextProps {
    personaText: string;
    personaTextCss?: string;
}

export interface IActivityProps {
    activityText?: string;
    activityStatusIcon?: string;
    activityStatusIconProps?: IStatusProps;
    activityStatusCss?: string;
}

export interface IPersonaActivityComponentProps extends Base.IProps {
    personaProps: IPersonaProps;
    personaTextProps: IPersonaTextProps;
    activityProps?: IActivityProps;
    personaTextContainerClassName?: string;
    personaActivityInfoContainerClassName?: string;
}

export interface IPersonaActivityComponentState {
    imageError: boolean;
}

export class PersonaActivityComponent extends Base.Component<IPersonaActivityComponentProps, IPersonaActivityComponentState> {

    public render(): JSX.Element {
        return (
            <div className={css("persona-activity-info", this.props.personaActivityInfoContainerClassName)}>
                <div className="persona-activity-info-left">
                    {this._getPersonaImageSection()}
                </div>
                <div className={css("persona-activity-info-right", this.props.personaTextContainerClassName)}>
                    {this.props.personaTextProps && this._getPersonaText()}

                    {this.props.activityProps && this._getActivityStatusText()}
                </div>
            </div>
        );
    }

    private _getPersonaImageSection(): JSX.Element {
        return (!this.state.imageError && this.props.personaProps && this.props.personaProps.iconUrl && this.props.personaProps.displayName &&
            <VssPersona
                cssClass={css("persona-image", this.props.personaProps.personaImageCss)}
                imgAltText={Utils_String.empty}
                onImageError={this._onImageError}
                suppressPersonaCard={true}
                identityDetailsProvider={{
                    getIdentityImageUrl: (size: number): string => {
                        return this.props.personaProps.iconUrl;
                    },
                    getDisplayName: (): string => {
                        return this.props.personaProps.displayName;
                    }
                }} />
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }

    private _getPersonaText(): JSX.Element {
        return (this.props.personaTextProps.personaText &&
            <div className={css("persona-text", this.props.personaTextProps.personaTextCss)}>
                <TooltipHost content={this.props.personaTextProps.personaText} overflowMode={TooltipOverflowMode.Parent}>
                    {this.props.personaTextProps.personaText}
                </TooltipHost>
            </div>
        );
    }

    private _getActivityStatusText(): JSX.Element {
        return (
            <div className={css("persona-activity-status", this.props.activityProps.activityStatusCss)}>
                {
                    (this.props.activityProps.activityStatusIcon && !this.props.activityProps.activityStatusIconProps) &&
                    <span className={this.props.activityProps.activityStatusIcon} />
                }
                {
                    this.props.activityProps.activityStatusIconProps &&
                    <span className="persona-activity-status-icon">
                        <Status {...this.props.activityProps.activityStatusIconProps} size={StatusSize.s}/>
                    </span>
                }
                {
                    this.props.activityProps.activityText &&
                    <TooltipHost content={this.props.activityProps.activityText} overflowMode={TooltipOverflowMode.Parent} directionalHint={DirectionalHint.bottomCenter}>
                        {this.props.activityProps.activityText}
                    </TooltipHost>
                }
            </div>
        );
    }
}
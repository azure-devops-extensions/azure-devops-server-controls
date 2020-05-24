/// <reference types="react" />
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/AvatarList";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { Image } from "OfficeFabric/Image";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind, getId } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Utils_String from "VSS/Utils/String";
import { VssPersona, IIdentityDetailsProvider } from "VSSUI/VssPersona";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";

export interface IAvatarListProps extends Base.IProps {
    profiles: IUserProfile[];
    getDetailedList: boolean;
}

export interface IUserProfile {
    displayName: string;
    url: string;
}

export interface IAvatarListState {
    imageError: boolean;
}

export class AvatarList extends Base.Component<IAvatarListProps, IAvatarListState> {


    public render(): JSX.Element {
        return <div className="user-avatar-list-container">
            {this.props.getDetailedList ? this._renderAvatarList(true) : this._renderAvatarList(false)}
        </div>;
    }

    private _renderAvatarList(isDetailed: boolean): JSX.Element {
        const profiles = this.props.profiles;
        let avatarList: JSX.Element[] = this._getAvatarList(profiles, isDetailed);
        const overflowLength = profiles.length - avatarList.length;

        const tooltipContent = profiles ? profiles.map((profile) => { return profile.displayName; }).join(", ") : Utils_String.empty;

        const tooltipId = getId("avatarListTooltip");
        if (avatarList.length > 0) {
            return <div className={isDetailed ? "user-avatar-detailed-list" : "user-avatar-simple-list"}>
                <TooltipHost
                    id={tooltipId}
                    setAriaDescribedBy={false}
                    content={tooltipContent}
                    tooltipProps={{ onRenderContent: this._getAvatarListTooltip }}
                    directionalHint={DirectionalHint.rightCenter}>
                    <div tabIndex={0} data-is-focusable={true} aria-describedby={tooltipId}>
                        <div className="user-avatar-list" >
                            {avatarList}
                            {overflowLength > 0 && this._getoverFlowElement(overflowLength)}
                        </div>
                    </div>
                </TooltipHost>            
            </div>;
        }
        else {
            return null;
        }
        
    }

    private _getoverFlowElement(overflowLength: number){
        return <span>{"(+" + overflowLength + ")"}</span>;
    }

    @autobind
    private _getAvatarListTooltip(): JSX.Element {
        const profiles = this.props.profiles;
        let avatarList: JSX.Element[] = [];
        for (let index = 0; index < profiles.length; index++) {
            avatarList.push(this._getAvatar(profiles[index], true));            
        }

        return (<div className="avatar-list-tooltip">
            {avatarList}
        </div>);
    }

    private _getAvatarList(profiles: IUserProfile[], isDetailed: boolean): JSX.Element[]{
        let avatarList: JSX.Element[] = [];
        const maxAvatarsDisplayed = isDetailed ? AvatarList.MaxDetailedAvatarsDisplayed : AvatarList.MaxAvatarsDisplayed;
        const avatarDisplayLength = profiles.length > maxAvatarsDisplayed ? maxAvatarsDisplayed : profiles.length;
        for (let index = 0; index < avatarDisplayLength; index++) {
            if (isDetailed){
                avatarList.push(this._getAvatar(profiles[index], true));
            }
            else{
                avatarList.push(this._getAvatar(profiles[index], false));
            }
            
        }
        return avatarList;
    }

    private _getAvatar(profile: IUserProfile, isDetailed: boolean): JSX.Element {
        return (
            <div className={isDetailed ? "detailed-avatar" : "simple-avatar"}>
            {
                !this.state.imageError && profile.url &&
                <VssPersona
                size={"small"}
                cssClass={"user-avatar"}
                imgAltText={!isDetailed ? profile.displayName : Utils_String.empty}
                onImageError={this._onImageError}
                identityDetailsProvider={{
                    getIdentityImageUrl: (size: number): string => {
                        return profile.url;
                    },
                    getDisplayName: (): string => {
                        return isDetailed ? Utils_String.empty : profile.displayName;
                    }
                }} 
            />
            }
                {isDetailed && <div className="user-avatar-description">{profile.displayName}</div>}
            </div>
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }
    
    static readonly MaxAvatarsDisplayed = 2;
    static readonly MaxDetailedAvatarsDisplayed = 1;

}
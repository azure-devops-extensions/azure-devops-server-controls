/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { Image, ImageFit } from "OfficeFabric/Image";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Avatar";

export interface IAvatarProps extends Base.IProps {
    displayName: string;
    imageUrl: string;
    imageClassName?: string;
    displayNameClassName?: string;
}

export class Avatar extends Base.Component<IAvatarProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className={css(this.props.cssClass, "avatar-container")} >
                <Image className={css("user-avatar-image", this.props.imageClassName)} src={this.props.imageUrl} alt={Utils_String.empty} imageFit={ImageFit.contain} />
                <div className="user-display-name-container">
                    <TooltipIfOverflow tooltip={this.props.displayName} targetElementClassName="user-display-name" >
                        <div className={css("user-display-name", this.props.displayNameClassName)}>{this.props.displayName}</div>
                    </TooltipIfOverflow>
                </div>
            </div>);
    }
}

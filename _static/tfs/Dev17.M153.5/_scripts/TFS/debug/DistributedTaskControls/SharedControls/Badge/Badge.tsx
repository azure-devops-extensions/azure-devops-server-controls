/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import { IVssIconProps, VssIcon } from "VSSUI/VssIcon";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Badge/Badge";

export interface IBadgeProps extends Base.IProps {
    badgeText: string;
    iconProps?: IVssIconProps;
    onClick?: (event: React.SyntheticEvent<HTMLElement>) => void;
}

export class Badge extends Base.Component<IBadgeProps, Base.IStateless> {

    public render(): JSX.Element {

        let clickableClass: string = this.props.onClick ? "clickable" : "";

        return (
            <div
                className={css("dtc-badge-content", this.props.cssClass, clickableClass)}
                onClick={this.props.onClick}
                tabIndex={this.props.onClick ? 0 : -1}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (!this.props.onClick) {
                        return;
                    }
                    if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
                        this.props.onClick(event);
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }}
                role={this.props.onClick ? "button" : undefined}>
                {
                    this.props.iconProps &&
                    <VssIcon
                        iconName={this.props.iconProps.iconName}
                        iconType={this.props.iconProps.iconType}
                        className={css("dtc-badge-icon", this.props.iconProps.className, clickableClass)} />
                }
                <Label className={css("dtc-badge-text", clickableClass)}>
                    {this.props.badgeText}
                </Label>
            </div >);
    }
}

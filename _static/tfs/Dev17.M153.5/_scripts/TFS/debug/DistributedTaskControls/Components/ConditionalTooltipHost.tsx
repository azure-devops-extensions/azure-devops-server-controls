/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { ITooltipHostProps, TooltipHost } from "VSSUI/Tooltip";

export interface IConditionalTooltipHostProps extends ITooltipHostProps {
    showTooltip: boolean;
}

export class ConditionalTooltipHost extends Base.Component<IConditionalTooltipHostProps, Base.IStateless> {

    public render(): JSX.Element {
        return (this.props.showTooltip ?
                    <TooltipHost {...this.props}>
                        {this.props.children}
                    </TooltipHost> :
                    <div>
                        {this.props.children}
                    </div> );
    }
}

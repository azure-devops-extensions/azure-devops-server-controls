/// <reference types="react" />
import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/Circle";

export interface ICircleProps extends Base.IProps {
    radius: number;
    circleCss?: string;
}

export class Circle extends Base.Component<ICircleProps, Base.IStateless> {

    public render(): JSX.Element {

        let heightAndWidth = this.props.radius * 2;
        
        const contentDivStyle = {
            height: heightAndWidth,
            width: heightAndWidth,
        };
        
        return (
            <div className={css("dtc-circle-container", this.props.cssClass)} >
                <div className={css("dtc-circle dtc-canvas-element-border", this.props.circleCss)} style={contentDivStyle}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}
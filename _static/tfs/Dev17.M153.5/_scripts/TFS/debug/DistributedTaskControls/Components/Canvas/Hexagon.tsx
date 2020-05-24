/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/Hexagon";

export interface IHexagonProps extends Base.IProps {
    sideLength: number;
}

export class Hexagon extends Base.Component<IHexagonProps, Base.IStateless> {

    public render(): JSX.Element {

        let width = this.props.sideLength * this.c_hexChildRectangleWidthToHeightRatio;
        let height = this.props.sideLength;

        const hexContainerStyle = {
            height: height * 2,
            width: height * 2
        };
        
        const rectStyle = {
            height: height,
            width: width,
            lineHeight: height + "px",
            top: height / 2
        };
        
        return (
            <div className={css("dtc-hexagon", this.props.cssClass)} style={hexContainerStyle} >

                <div className="dtc-top-rect dtc-canvas-element-border" style={rectStyle} />

                <div className="dtc-bottom-rect dtc-canvas-element-border" style={rectStyle} />

                <div className="dtc-middle-rect dtc-canvas-element-border" style={rectStyle}>
                    {this.props.children}
                </div>

            </div>
        );
    }

    private c_hexChildRectangleWidthToHeightRatio = 1.732;
}
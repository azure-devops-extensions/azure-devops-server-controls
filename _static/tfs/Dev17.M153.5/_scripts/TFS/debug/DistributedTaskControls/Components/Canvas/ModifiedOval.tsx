/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import * as StringUtils from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/ModifiedOval";

/**
 * Draws a shape like below. The upper and lower parts are curved. 
 *   ___
 *  /   \
 *  |   |
 *  |   |
 *  |   |
 *  \___/
 */

export interface IModifiedOvalProps extends Base.IProps {

    width: number;

    height: number;

    ovalClass?: string;
}

export class ModifiedOval extends Base.Component<IModifiedOvalProps, Base.IStateless> {

    public render(): JSX.Element {

        const contentStyle = this._getContentStyle();

        const containerStyle = {
            height: this.props.height,
            width: this.props.width
        };

        return (
            <div className={css("dtc-modified-oval", this.props.cssClass)} style={containerStyle}>

                <div className={css("dtc-modified-oval-content dtc-canvas-element-border", this.props.ovalClass)} style={contentStyle}>
                    {this.props.children}
                </div>

            </div>
        );
    }

    private _getContentStyle(): any {

        const borderRadius = this.props.width;

        let style = {
            MozBorderRadius: borderRadius,
            WebkitBorderRadius: borderRadius,
            BorderRadius: borderRadius
        };

        if (BrowserCheckUtils.isIE()) {
            style["border-radius"] = borderRadius;
        }

        return style;
    }
}

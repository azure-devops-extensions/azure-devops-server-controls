/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PathBuilder } from "DistributedTaskControls/Components/Canvas/PathHelpers";
import * as Types from "DistributedTaskControls/Components/Canvas/Types";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/CircularProgressIndicator";

export interface IProgressIndicatorItem {
    itemCount: number;
    cssClassForColor: string;
}

export interface ICircularProgressIndicatorProps extends ComponentBase.IProps {
    items: IProgressIndicatorItem[];
    isFocusable?: boolean;
    onClick?: () => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export class CircularProgressIndicator extends ComponentBase.Component<ICircularProgressIndicatorProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        // strokeWidth and radius should be in sync with corresponding css file
        const strokeWidth: number = 15;
        const radius: number = 160;
        const centerX: number = radius + strokeWidth / 2;
        const centerY: number = radius + strokeWidth / 2;

        // The following two properties are defined as consts for now but will be made parameters to this component later.
        const indicatorStartAngle = 240;
        const indicatorAngularSpan = 240;

        let arcs = [];
        let arcStartAngle = indicatorStartAngle;
        let arcEndAngle;

        const arcItems = this.props.items;

        if (arcItems && arcItems.length > 0) {
            let totalItemCount = 0;

            for (let i = 0; i < arcItems.length; i++) {
                totalItemCount += arcItems[i].itemCount;
            }

            if (totalItemCount > 0) {
                for (let i = 0; i < arcItems.length; i++) {
                    const angleMagnitude = (arcItems[i].itemCount / totalItemCount) * indicatorAngularSpan;
    
                    arcEndAngle = (arcStartAngle + angleMagnitude) % 360;
    
                    const arcAttribute = {"d": this._getArc(centerX, centerY, radius, arcStartAngle, arcEndAngle, angleMagnitude)};
                    const key = "arc" + i;
    
                    arcs.push(
                        <path id={key} key={key} fill="none" className={arcItems[i].cssClassForColor} {...arcAttribute} />
                    );
    
                    arcStartAngle = arcEndAngle;
                }
            }
        }

        if (arcs.length === 0) {
            // Add a placeholder arc if no arcs were added.
            const arcAttribute = {"d": this._getArc(centerX, centerY, radius, arcStartAngle, arcStartAngle + indicatorAngularSpan, indicatorAngularSpan)};
            const key = "arc0";

            arcs.push(
                <path id={key} key={key} fill="none" className={"placeholder"} {...arcAttribute} />
            );
        }

        let innerArcAttribute = {"d": this._getArc(centerX, centerY, radius - (strokeWidth / 2), indicatorStartAngle, indicatorStartAngle + indicatorAngularSpan, indicatorAngularSpan)};

        return (
            <div className="circular-progress-indicator" {...(this.props.isFocusable && {role: "link", tabIndex: 0, onClick: this.props.onClick, onKeyDown: this.props.onKeyDown})} >
                <svg className="circular-progress-indicator-outer-circle">
                    {arcs}
                </svg>
                <svg className="circular-progress-indicator-inner-circle" >
                    <path fill={"none"} {...innerArcAttribute} />
                </svg>
                <div className="circular-progress-inner-container" >
                    {this.props.children}
                </div>
            </div>
        );
    }

    private _polarToCartesianCoordinates(centerX: number, centerY: number, radius: number, angleInDegrees: number): Types.IPoint {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
        
        let coordinates: Types.IPoint = {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };

        return coordinates;
    }
      
    private _getArc(x: number, y: number, radius: number, startAngle: number, endAngle: number, angleMagnitude?: number): string {
        const start: Types.IPoint = this._polarToCartesianCoordinates(x, y, radius, endAngle);
        const end: Types.IPoint = this._polarToCartesianCoordinates(x, y, radius, startAngle);

        // The large arc needs to be set if the angle the arc is covering is > 180 degrees.
        let largeArcFlag;

        if (angleMagnitude) {
            largeArcFlag = angleMagnitude <= 180 ? "0" : "1";
        }
        else {
            largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        }

        const arc = new PathBuilder().start(start).arc(end, radius, radius, largeArcFlag, 0).toString();

        return arc;
    }
}
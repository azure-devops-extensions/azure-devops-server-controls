/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/CircularProgressBar";

export interface ICircularProgressBarProps extends Base.IProps {
    radius?: number;
    completedPercentage?: number;
    completedColor?: string;
    borderWidth?: number;
    borderHeight?: number;
    noOfBorderStripes?: number;
}

export class CircularProgressBar extends Base.Component<ICircularProgressBarProps, Base.IStateless> {

    public render(): JSX.Element {

        const circleRadius = (this.props.radius ? this.props.radius : CircularProgressBar.c_defaultCircleRadius);
        const noOfBorderStripes = this.props.noOfBorderStripes ? this.props.noOfBorderStripes : circleRadius;
        const circleSize = 2 * circleRadius;
        const circleContainerStyle = {
            height: circleSize,
            width: circleSize
        };
        const percentageCompleted = (this.props.completedPercentage ? this.props.completedPercentage : 0);
        const spinnerStyle = {
            animation: "rotateAnimation  1.5s steps(" + noOfBorderStripes + ",end) infinite"
        };

        const borderWidth = this.props.borderWidth ? this.props.borderWidth : CircularProgressBar.c_borderStripeLength;
        const borderHeight = this.props.borderHeight ? this.props.borderHeight : CircularProgressBar.c_borderStripeHeight;

        return (
            <div className={css("circular-progress-bar-container", this.props.cssClass)} style={circleContainerStyle}>
                {!!this.props.children && this._getChildElements(borderWidth)}
                <div className="circular-progress-bar-circular-background">
                    {this._getRadialBorder(circleSize, noOfBorderStripes, "circular", borderWidth, borderHeight)}
                </div>
                <div className="circular-progress-bar-spinning-background" style={spinnerStyle}>
                    {this._getRadialBorder(circleSize, noOfBorderStripes, "spinning", borderWidth, borderHeight)}
                </div>
                {this._getCompletedCircle(circleSize, percentageCompleted, borderWidth)}
            </div>
        );
    }

    private _getRadialBorder(circleSize: number, noOfBorderStripes: number, circleClass: string, borderWidth: number, borderHeight: number): JSX.Element {

        const step = (360 / noOfBorderStripes);
        const circleStyle = {
            marginTop: (-borderHeight / 2),
            marginBottom: (-borderHeight / 2),
            marginRight: (-borderWidth / 2),
            marginLeft: (-borderWidth / 2)
        };

        let angle = 0;
        let borderStyle;
        let borderElement;

        return (
            <div className="circular-progress-bar-center" style={circleStyle}>
                {
                    Array.apply(null, { length: noOfBorderStripes }).map((child, index) => {
                        borderStyle = {
                            height: borderHeight,
                            width: borderWidth,
                            transform: "rotate(" + angle + "deg) translateX(" + ((circleSize - borderWidth) / 2) + "px)"
                        };
                        borderElement = (<span key={this.props.instanceId + circleClass + "circular-progress-bar-border-stripe-" + index} className={css("circular-progress-bar-border-stripe", ("circular-progress-bar-border-stripe-" + index))} style={borderStyle}></span>);
                        angle = angle + step;
                        return borderElement;
                    })
                }
            </div>
        );
    }

    private _getCompletedCircle(circleSize: number, percentageCompleted: number, borderWidth: number): JSX.Element {

        const parentCircleStyle = {
            clip: (percentageCompleted < 50 ? "rect(0px," + circleSize + "px," + circleSize + "px," + (circleSize / 2) + "px)" : "rect(auto,auto,auto,auto)")
        };

        const childCircleStyle = {
            borderWidth: borderWidth,
            clip: "rect(0px," + (circleSize / 2) + "px," + (circleSize) + "px,0px)",
            borderColor: this.props.completedColor
        };

        const firstChildCircleStyle = { ...childCircleStyle, transform: "rotate(" + (360 * percentageCompleted / 100) + "deg)" };

        const secondChildCircleStyle = { ...childCircleStyle, transform: "rotate(180deg)" };

        const firstChildCircleClasses = css("circular-progress-bar-completed-child-circle", { "circular-progress-bar-completed-first-child-filled": (percentageCompleted > 50) });

        return (
            <div className="circular-progress-bar-completed" style={parentCircleStyle}>
                <div className={firstChildCircleClasses} style={firstChildCircleStyle}></div>
                {percentageCompleted > 50 && <div className="circular-progress-bar-completed-child-circle" style={secondChildCircleStyle}></div>}
            </div>
        );
    }

    private _getChildElements(borderWidth: number): JSX.Element {
        const originalChild = React.Children.only(this.props.children) as React.ReactElement<any>;
        const originalChildProps = originalChild.props;
        const originalClassNames = originalChildProps && originalChildProps.className;
        const childElementNewClass = "circular-progress-bar-status-info-child";
        const newClassNames = originalClassNames ? css(originalClassNames, childElementNewClass) : childElementNewClass;

        /**
         * creating clone of the original child with additional styles and className to show the outline covering the complete progress bar
         * if we don't add these additional styles to child the outline will cover only the content
         * and content will be clipped because the parent container has border
         */
        const clonedChildProps = {
            ...originalChildProps,
            className: newClassNames,
            style: {
                borderWidth: borderWidth,
                padding: borderWidth
            }
        };
        const clonedChildElement = React.cloneElement(originalChild, clonedChildProps);

        return (
            <div className="circular-progress-bar-status-info">
                {
                    clonedChildElement
                }
            </div>
        );
    }

    private static readonly c_defaultCircleRadius = 30;
    private static readonly c_borderStripeLength = 6;
    private static readonly c_borderStripeHeight = 2;

}
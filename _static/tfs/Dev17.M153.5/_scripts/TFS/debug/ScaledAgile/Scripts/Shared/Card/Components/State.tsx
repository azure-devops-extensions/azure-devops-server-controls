/// <reference types="react" />

import * as React from "react";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

/**
 * Properties given to the state component
 */
export interface IStateProps {
    /**
     * The value to render
     */
    value: string;
    /**
     * Function for retrieving the states color
     */
    getStateColor: (value: string) => string;
}

/**
 * Component for rendering additional fields with a special case for rendering state which shows state color
 */
export class State extends React.Component<IStateProps, {}> {
    public render(): JSX.Element {
        let colorCircle: JSX.Element = null;
        let stateColor = this.props.getStateColor(this.props.value);
        if (stateColor) { // if we have loaded a color for this field
            let colorCircleStyle = {
                borderColor: stateColor,
                backgroundColor: stateColor
            };

            colorCircle = <span className="state-circle" style={colorCircleStyle}></span>; // paint the state color
        }
        return <div className="field-value">
            {colorCircle}
            <TooltipHost content={this.props.value} overflowMode={TooltipOverflowMode.Parent}>
                {this.props.value}
            </TooltipHost>
        </div>;
    }
}

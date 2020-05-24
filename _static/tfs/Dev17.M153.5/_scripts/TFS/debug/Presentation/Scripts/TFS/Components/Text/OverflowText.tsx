/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import * as Diag from "VSS/Diag";

import FabricTooltip = require("VSSUI/Tooltip");

export interface IOverflowTextProps {
    text: string,
}

export interface IOverflowTextState {
    text: string,
    showWithTooltip: boolean,
    tooltipRequirementComputed: boolean
}

import "VSS/LoaderPlugins/Css!Presentation/Components/Text/OverflowText";

/*
 *  Displays text, and adds a tooltip only when text overflows.
 *  This control renders the text, checks if it overflows once the DOM is mounted (see componentWillMount method),
 *  and updates the control's state if the tooltip is needed (forcing re-rendering).
 */
export class OverflowText extends React.Component<IOverflowTextProps, IOverflowTextState>{

    private static CSS_CLASS_CONTAINER: string = "overflow-text-container";

    private _mainElement: HTMLElement;

    constructor(props: IOverflowTextProps) {
        super(props);

        this.state = {
            text: this.props.text,
            showWithTooltip: false,
            tooltipRequirementComputed: false
        };

        this._mainElement = null;
    }

    public render(): JSX.Element {

        let result: JSX.Element = null;

        if (this.state.showWithTooltip) {

            result = (
                <div>
                    <FabricTooltip.TooltipHost
                        content={ this.state.text }
                        directionalHint={ FabricTooltip.DirectionalHint.topCenter }
                        >
                        <div
                            ref={ (div) => this._mainElement = div }
                            className={ OverflowText.CSS_CLASS_CONTAINER }
                            >
                                { this.state.text }
                            </div>
                    </FabricTooltip.TooltipHost>
                </div>
            );
        } else {

            result = (
                <div
                    ref={ (div) => this._mainElement = div }
                    className={ OverflowText.CSS_CLASS_CONTAINER }
                    >
                    { this.state.text }
                </div>
            );
        }

        return result;
    }

    public componentDidMount() {
        if (!this.state.tooltipRequirementComputed) {
            let needsTooltip: boolean = this._doesMainElementNeedTooltip();

            this.setState((prevState, props) => {
                return {
                    text: prevState.text,
                    showWithTooltip: needsTooltip,
                    tooltipRequirementComputed: true
            }});
        }
    }

    private _doesMainElementNeedTooltip() : boolean {
        Diag.Debug.assertIsNotNull(
            this._mainElement,
            "Main element is null. Class OverflowText.");

        return this._mainElement.scrollWidth > this._mainElement.offsetWidth;
    }
}
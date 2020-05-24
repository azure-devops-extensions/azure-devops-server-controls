/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryDetailsChart";

import { Icon } from "OfficeFabric/Icon";
import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import { TooltipHost } from "VSSUI/Tooltip";

export enum DifferenceType {
    Improved,
    Worsened,
    Unchanged
}

export enum ValueType {
    Increased,
    Unchanged,
    Decreased
}

/**
 * enum for differentiating the type of data value shown in number chart
 */
export enum DataType {
    String,
    Percentage,
    DateTime
}

/**
 * Interface for passing difference information for number charts
 */
export interface IDifference {
    /** The difference text value */
    value: string;
    /**
     * Represents if the difference value change signifies improvement, worsening or no change. The color is decided on this value
     * Improvement: green color
     * Worsened: red color
     * unchanges: same color as other values
     */
    diffType: DifferenceType;
    /**
     * Represents  if the difference value is greater or less than previous bulid/ release. The icon is decided on this value
     * Increased: Up arrow
     * Decreased: Down arrow
     * Unchanged: no icon
     */
    valueType: ValueType;
    /** Setting this to false will hide the icon for any value of any other parameter. */
    shouldShowIcon: boolean;
}

/**
 * Props for number charts shown in summary view
 */
export interface ISummaryNumberChartProps extends ComponentBase.Props {
    /** The title to show below chart value */
    title: string;
    /** The chart value to be shown in bold */
    value: any;
    /** IDifference object containing info for showing difference information w.r.t previous summary */
    difference: IDifference;
    /** The type of data of the chart value. The text will be rendered based on this value.  */
    dataType?: DataType;
    /** Align according to difference div present. If true, it will be rendered vertically aligned as if the difference div is present */
    isVerticalAlignWithDifferencePresent?: boolean;
    /** If infoMessage is present then an info icon is also shown besides text and shows this infoMessage on hover.
     * Nothing is shown if this is null
     */
    infoMessage?: string;
}

export class ResultSummaryNumberChartComponent extends ComponentBase.Component<ISummaryNumberChartProps> {
    public render(): JSX.Element {

        return (
            <div className="testresults-number-chart">
                <div className="chart-value">
                    {this._getChartValueDiv()}
                </div>
                <div className="chart-title">
                    <span>{this.props.title}</span>
                    {this.props.infoMessage && this._getInfoMessageButton()}
                </div>
                <div className={`chart-difference ${this.props.isVerticalAlignWithDifferencePresent ? "chart-difference-show-height" : "chart-difference-no-height"}`}>
                    {this.props.difference && this._getDifferenceDiv()}
                </div>
            </div>
        );
    }

    private _getChartValueDiv(): JSX.Element {
        if (this.props.dataType === null) {
            return this.props.value;
        }

        switch (this.props.dataType) {
            case DataType.String:
                return this.props.value;
            case DataType.Percentage:
                return this._getPercentageValueDiv();
            case DataType.DateTime:
                return this.props.value;
            default:
                return this.props.value;
        }
    }

    private _getPercentageValueDiv(): JSX.Element {
        return <div>
            <span className="number-chart-large-font">{Utils_String.localeFormat("{0}{1}", this.props.value, "%")}</span>
        </div>;
    }

    private _getInfoMessageButton(): JSX.Element {
        return (
            <TooltipHost content={this.props.infoMessage}>
                <Icon className={"number-chart-info-message-button"} ariaLabel={this.props.infoMessage} iconName={"Info"} />
            </TooltipHost>
        );
    }

    private _getDifferenceDiv(): JSX.Element {
        if (this.props.difference === null) {
            // Difference div is not meant to be shown here
            return;
        }

        let differenceClassName: string;
        switch (this.props.difference.diffType) {
            case DifferenceType.Improved:
                differenceClassName = "difference-improved";
                break;
            case DifferenceType.Unchanged:
                differenceClassName = "difference-unchanged";
                break;
            case DifferenceType.Worsened:
                differenceClassName = "difference-worsened";
                break;
        }

        return (
            <div className={`${differenceClassName} chart-difference`}>
                {this.props.difference.shouldShowIcon && this._getIconDiv()}
                {
                    this.props.difference.valueType !== ValueType.Unchanged &&
                    <div className="difference-value">{this.props.difference.value}</div>
                }
            </div>
        );
    }

    private _getIconDiv(): JSX.Element {
        let iconName: string;

        switch (this.props.difference.valueType) {
            case ValueType.Unchanged:
                // Show no icon, return
                return;
            case ValueType.Increased:
                iconName = "Up";
                break;
            case ValueType.Decreased:
                iconName = "Down";
        }

        return (
            <div className="difference-icon-div">
                <Icon iconName={iconName} />
            </div>
        );
    }
}

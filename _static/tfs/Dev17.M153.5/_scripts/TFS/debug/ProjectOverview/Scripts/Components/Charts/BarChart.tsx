/// <reference types="react" />

import * as React from "react";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/Charts/BarChart";

const maxHeightInPixels: number = 32;
const minHeightInPixels: number = 2;

export interface BarChartProps {
    values: number[];
    cssBgColor: string[];
}

export const BarChart = (props: BarChartProps): JSX.Element => {
    let barHeights = GetBarHeights(props);

    return (
        <div className="bar-chart" aria-hidden="true">
            {barHeights.map((a, index) => {
                let styleObject: React.CSSProperties = {
                    height: a + "px",
                    marginTop: (maxHeightInPixels - a) + "px"
                };
                return (
                    <div
                        className={"bar background-" + props.cssBgColor[index]}
                        style={styleObject}
                        key={index} />
                );
            })}
        </div>);
}

function GetBarHeights(props: BarChartProps): number[] {
    let maxVal: number = 0;
    let barHeights: number[] = [];

    props.values.forEach((item) => {
        maxVal = maxVal > item ? maxVal : item;
    })

    if (maxVal <= 0) {
        props.values.forEach((item) => {
            barHeights.push(minHeightInPixels);
        })
    }
    else {
        props.values.forEach((item) => {
            let actualHeight = item * maxHeightInPixels / maxVal;
            //bar should not be less than min height
            actualHeight = actualHeight > minHeightInPixels ? actualHeight : minHeightInPixels;
            barHeights.push(actualHeight);
        })
    }

    return barHeights;
}
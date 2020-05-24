/// <reference types="react" />

import * as React from "react";
import { Control } from "VSS/Controls";
import { TfsComponent, IState, ITfsComponentProps } from "Presentation/Scripts/TFS/TFS.React";
import { PieChartOptions, PieChartDataPoint } from "Charting/Scripts/Contracts";
import { PieChart as PieChartBase } from "Charting/Scripts/Controls/PieChart";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/Charts/PieChart";

const PieContainerHeight = 60;
const PieContainerWidth = 60;

export interface PieChartProps extends ITfsComponentProps {
    passPercentage: number;
}

export const PieChart = (props: PieChartProps): JSX.Element => {
    return (
        <div className="pie-chart" aria-hidden="true">
            <PieChartComponent {...props} />
        </div>);
}

class PieChartComponent extends TfsComponent<PieChartProps, IState> {
    private _pieChart: PieChartBase;

    constructor(props: PieChartProps) {
        super(props);
    }

    public shouldComponentUpdate(nextProps: PieChartProps, nextState: IState): boolean {
        return !(this.props.passPercentage === nextProps.passPercentage);
    }

    protected onRender(element: HTMLElement): void {
        let data = this._getPieChartData(this.props.passPercentage);

        if (this._pieChart) {
            this._pieChart.dispose();
        }

        this._pieChart = Control.create<PieChartBase, PieChartOptions>(
            PieChartBase,
            $(element),
            this._getPieChartOptions(data));
    }

    private _getPieChartOptions(data: PieChartDataPoint[]): PieChartOptions {
        let innerSizePercent = data.length === 1 ? "80%" : "0%";

        return {
            height: PieContainerHeight,
            width: PieContainerWidth,
            tooltipOptions: {
                enabled: false,
            },
            spacing: [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            data: data,
            innerSizePercentage: innerSizePercent,
            enableHover: false,
            dataLabelOptions: {
                enabled: false
            }
        };
    }

    private _getPieChartData(passPercent: number): PieChartDataPoint[] {
        let pieChartData: PieChartDataPoint[] = [];
        let failedSlice: PieChartDataPoint = null;
        let succeededSlice: PieChartDataPoint = null;
        let noDataSlice: PieChartDataPoint = null;

        if (passPercent >= 0) {
            failedSlice = {
                name: "Failed",
                value: (100 - passPercent),
                color: "#e81123"    //Fabric - red
            };
            pieChartData.push(failedSlice);

            succeededSlice = {
                name: "Success",
                value: passPercent,
                color: "#107c10"    //Fabirc - green
            };
            pieChartData.push(succeededSlice);
        }
        else {
            noDataSlice = {
                name: "No Data",
                value: 100,
                color: "#dadada"    //VSTS palette Secondary-light-1
            }
            pieChartData.push(noDataSlice);
        }

        return pieChartData;
    }
}

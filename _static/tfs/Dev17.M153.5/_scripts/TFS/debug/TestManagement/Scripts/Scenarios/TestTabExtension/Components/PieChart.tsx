/// <reference types="react" />

import * as React from "react";
import { ChartComponent } from "WidgetComponents/ChartComponent";
import { CommonChartOptions, ChartTypesConstants, Datum, LabelFormatModes, PieChartOptions } from "Charts/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";

export interface IPieChartData {
    dataValue: string;
    dataCount: number;
    dataColor: string;
    dataSubText?: string;
}

export interface IPieChartProps extends ComponentBase.Props {
    title: string;
    totalCount: number;
    data: IPieChartData[];
}

export class PieChartComponent extends ComponentBase.Component<IPieChartProps> {

    public shouldComponentUpdate(nextProps: IPieChartProps, nextState) {
        if (this.props.title !== nextProps.title || this.props.totalCount !== nextProps.totalCount || this.props.data.length !== nextProps.data.length) {
            return true;
        }

        let isElementFound = this.props.data.every((data, index) => {
            return this._elementFound(data, index, nextProps.data);
        });
        if (!isElementFound) {
            return true;
        }

        return false;
    }

    public render(): JSX.Element {

        return (
            <div className="piechart-container">
                <ChartComponent chartOptions={this._getChartOptions()} />
            </div>
        );
    }

    private _getChartOptions(): CommonChartOptions {
        const series = {
            name: this.props.title,
            data: []
        };

        series.data = this.props.data.map((chartData: IPieChartData) => {
            return {
                name: chartData.dataValue,
                y: chartData.dataCount,
                color: chartData.dataColor
            } as Datum;
        });

        const chartOptions = {
            hostOptions: {
                width: 100,
                height: 100
            },
            colorCustomizationOptions: {
                colorByXAxis: true
            },
            suppressAnimation: false,
            click: () => { },
            legend: {
                enabled: false,
                righAlign: true,
                stackVertically: true
            },
            tooltip: {
                enabled: true
            },
            suppressMargin: true,
            specializedOptions: {
                size: "120%",
                innerSize: "60%",
                showLabels: false
            } as PieChartOptions,
            xAxis: {
                labelFormatMode: LabelFormatModes.Textual,
                labelValues: []
            }
        };

        chartOptions.xAxis.labelValues = this.props.data.map((chartData: IPieChartData) => {
            return chartData.dataValue;
        });

        let commonChartOptions: CommonChartOptions = {
            chartType: ChartTypesConstants.Pie,
            series: [series]
        };

        commonChartOptions = Object.assign(chartOptions, commonChartOptions);

        return commonChartOptions;
    }

    private _elementFound(element: IPieChartData, index: number, targetList: IPieChartData[]) {
        let targetElement = targetList[index];

        if (targetElement.dataValue === element.dataValue && targetElement.dataCount === element.dataCount && targetElement.dataColor === element.dataColor) {
            return true;
        }

        return false;
    }
}


registerLWPComponent("TestResultsPieChart", PieChartComponent);
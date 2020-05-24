/// <reference types="react" />
import * as React from "react";
import { DonutChartLegendComponent, IDonutChartLegend, IDonutChartLegendProps } from "TestManagement/Scripts/Scenarios/Common/Components/DonutChartLegend";
import { IPieChartProps } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/PieChart";
import * as ComponentBase from "VSS/Flux/Component";

export class PieChartLegendComponent extends ComponentBase.Component<IPieChartProps> {

    public render(): JSX.Element {
        let donutChartLegendProps: IDonutChartLegendProps = {
            legend: this.props.data.map(d => {
                return {
                    count: d.dataCount.toLocaleString(),
                    label: d.dataValue,
                    color: d.dataColor,
                    sublabel: d.dataSubText
                } as IDonutChartLegend;
            })
        } as IDonutChartLegendProps;

        return <DonutChartLegendComponent {...donutChartLegendProps} />;
    }
}

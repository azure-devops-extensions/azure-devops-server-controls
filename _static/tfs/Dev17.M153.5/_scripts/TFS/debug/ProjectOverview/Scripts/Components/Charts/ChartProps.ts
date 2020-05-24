
export type ChartProps = AreaChartProps | PieChartProps | BarChartProps;

export enum ChartType {
    PieChart,
    BarChart,
    AreaChart
}

export interface ChartContainerProps {
    chartProps: ChartProps;
    chartType: ChartType;
}

export interface PieChartProps {
    passPercentage: number;
}

export interface BarChartProps {
    values: number[];
    cssBgColor: string[];
}

export class AreaChartProps {
    data: number[];
    screenReaderTableHeader: string;
}

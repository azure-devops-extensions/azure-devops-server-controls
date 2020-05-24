import * as Chart_Contracts from 'Charts/Contracts';

export interface CommonChartInputs{
    suppressAnimations?: boolean;
}   

/**
 * Takes relevant analytics data, and interprets feature specific details into standardized format for rendering by common ChartComponent.
 */
export abstract class ChartOptionFactoryBase<T extends CommonChartInputs> {
    abstract createChartOptions(featureChartingInputs:CommonChartInputs):Chart_Contracts.CommonChartOptions;
}
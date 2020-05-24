import * as Charts_Contracts from "Charts/Contracts";
import { BaseChartHelper } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/BaseChartHelper";


export class StackedColumnChartHelper extends BaseChartHelper {
    public getChartType(): string {
      return Charts_Contracts.ChartTypesConstants.StackedColumn;
    }
}
import { ChartMetric } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

export class ChartMetricUtility {

    private static chartMetricOptions = {
        [ChartMetric.None]: Resources.NoneText,
        [ChartMetric.ResultCount]: Resources.CountText,
        [ChartMetric.PassRate]: Resources.PassRate,
        [ChartMetric.AverageDuration]: Resources.AverageDurationText,
    };

    public static getOptions(flags: {isNoneAllowed?: boolean}): ChartMetric[] {
        let options = Object.keys(this.chartMetricOptions).map(name => Number(name));
        if (!flags.isNoneAllowed) {
            options = options.filter(option => option !== ChartMetric.None);
        }
        return options;
    }

    public static getDisplayName(chartMetricOption: ChartMetric): string {
        return this.chartMetricOptions[chartMetricOption];
    }
}

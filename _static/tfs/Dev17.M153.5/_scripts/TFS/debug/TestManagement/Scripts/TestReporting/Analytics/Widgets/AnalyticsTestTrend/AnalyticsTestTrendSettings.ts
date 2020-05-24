import { BuildDefinition } from 'Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition';
import { TestMetricSettings } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition';
import { Filters } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/Filters';
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { Release } from 'Widgets/Scripts/DataServices/ConfigurationQueries/Release';

export interface AnalyticsTestTrendCoreSettings {
    workflow: Workflow;
    buildPipelines: BuildDefinition[];
    releasePipelines: Release[];
    timePeriodInDays: number;
}

export interface AnalyticsTestTrendSettings extends AnalyticsTestTrendCoreSettings{
    chartMetric: TestMetricSettings;
    secondaryChartMetric: TestMetricSettings;
    filters: Filters
}
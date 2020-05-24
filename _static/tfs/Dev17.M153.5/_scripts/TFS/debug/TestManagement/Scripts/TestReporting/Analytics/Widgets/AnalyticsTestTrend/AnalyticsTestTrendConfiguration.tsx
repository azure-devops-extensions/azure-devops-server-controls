import * as React from 'react';

import { WidgetConfig, registerWidgetConfig } from 'Widgets/Scripts/WidgetConfig'

import { AnalyticsTestTrendSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { WorkflowPicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowPicker';
import { TimePeriodPicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TimePeriodPicker';
import { PipelinesConfig } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinesConfig";
import { TestMetricPicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPicker';
import { FiltersPicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/FiltersPicker';

import * as Resources from 'TestManagement/Scripts/Resources/TFS.Resources.TestManagement';
import { BuildPipelinePicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/BuildPipelinePicker';
import { ReleasePipelinePicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/ReleasePipelinePicker';

export class AnalyticsTestTrendConfiguration extends WidgetConfig<AnalyticsTestTrendSettings> {

    protected getCalculatedWidgetTitle(): string {
        return Resources.AnalyticsTestTrendWidget_Name;
    }

    protected getChildren(): React.ReactNode {
        return (
            <PipelinesConfig>
                <WorkflowPicker propertyName="workflow"/>
                <BuildPipelinePicker
                    propertyName="buildPipelines"
                    workflowPickerPropertyName="workflow"
                />
                <ReleasePipelinePicker
                    propertyName="releasePipelines"
                    workflowPickerPropertyName="workflow"
                />
                <TimePeriodPicker propertyName="timePeriodInDays"/>
                <TestMetricPicker propertyName="chartMetric"/>
                <TestMetricPicker propertyName="secondaryChartMetric" isSecondary/>
                <FiltersPicker
                    propertyName="filters"
                    buildPipelinePickerPropertyName="buildPipelines"
                    releasePipelinePickerPropertyName="releasePipelines"
                    timePeriodPickerPropertyName="timePeriodInDays"
                    workflowPickerPropertyName="workflow"
                />
            </PipelinesConfig>
        );
    }
}

registerWidgetConfig(
    "testmanagement.analyticsTestTrendConfiguration",
    "testmanagement.analyticsTestTrendConfiguration-init",
    AnalyticsTestTrendConfiguration
);

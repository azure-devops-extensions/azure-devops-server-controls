import * as React from 'react';

import { GroupingProperty, Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { FiltersPickerRow } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/FiltersPickerRow';
import { withPipelinesConfigContext, IPipelinesConfigProps} from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";
import { Filters } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/Filters';
import { BuildPipelinePickerSelector } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/BuildPipelinePickerSelector";
import { ReleasePipelinePickerSelector } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/ReleasePipelinePickerSelector";
import { TimePeriodPickerSelector } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/TimePeriodPickerSelector";
import { FiltersPickerPropertyDefinition } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/FiltersPickerPropertyDefinition';
import { AnalyticsTestTrendCoreSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { WorkflowPickerSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowPickerSelector';

export const FiltersPickerDefaultPropertyName = "ms.azdev.pipelines.components.filters-picker";

export interface FiltersPickerProps {

    buildPipelinePickerPropertyName: string;
    releasePipelinePickerPropertyName: string;
    timePeriodPickerPropertyName: string;
    workflowPickerPropertyName: string;

    /**
     * (optional) Defaults to `FiltersPickerDefaultPropertyName`
     *
     * A unique name for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;
}

export const FiltersPicker = withPipelinesConfigContext(
    class extends React.Component<FiltersPickerProps & IPipelinesConfigProps, {}> {

        public static defaultProps: Partial<FiltersPickerProps> = {
            propertyName: FiltersPickerDefaultPropertyName,
        }

        constructor(props: FiltersPickerProps & IPipelinesConfigProps) {
            super(props);
            this.props.configContext.actionCreator.registerPropertyDefinition(
                new FiltersPickerPropertyDefinition(this.props.propertyName)
            );
        }

        private readonly filters = [
            GroupingProperty.Branch,
            GroupingProperty.Container,
            GroupingProperty.Owner,
            GroupingProperty.TestRun,
            GroupingProperty.Workflow
        ];

        private getValue(): Filters {
            return this.props.configContext.state.properties[this.props.propertyName];
        }

        private getFilterPropertyName(filter: GroupingProperty): string {
            switch (filter) {
                case GroupingProperty.Branch: return "branches";
                case GroupingProperty.Container: return "testFiles";
                case GroupingProperty.Owner: return "owners";
                case GroupingProperty.TestRun: return "testRuns";
                case GroupingProperty.Workflow: return "workflows";
                default: throw new Error(`Unsupported filter: ${filter}`);
            }
        }

        private getFilterValues(filter: GroupingProperty): string[] {
            let propertyName = this.getFilterPropertyName(filter);
            return this.getValue()[propertyName];
        }


        private updateValue<T>(filter: GroupingProperty, filterValues: T[]) {
            let value: Filters = JSON.parse(JSON.stringify(this.getValue()));
            let propertyName = this.getFilterPropertyName(filter);
            value[propertyName] = filterValues;
            this.props.configContext.actionCreator.setProperty(this.props.propertyName, value);
        }

        private getCoreSettings(workflow: Workflow) : AnalyticsTestTrendCoreSettings {
            let configProperties = this.props.configContext.state.properties;

            let buildPipelinesPickerSelector = new BuildPipelinePickerSelector(this.props.buildPipelinePickerPropertyName);
            let releasePipelinesPickerSelector = new ReleasePipelinePickerSelector(this.props.releasePipelinePickerPropertyName);
            let timePeriodPickerSelector = new TimePeriodPickerSelector(this.props.timePeriodPickerPropertyName);

            return {
                buildPipelines: buildPipelinesPickerSelector.getSelectedBuildPipelines(configProperties),
                releasePipelines: releasePipelinesPickerSelector.getSelectedReleasePipelines(configProperties),
                timePeriodInDays: timePeriodPickerSelector.getSelectedTimePeriod(configProperties),
                workflow: workflow,
            };
        }

        private renderFilter(filter: GroupingProperty): JSX.Element {
            let configProperties = this.props.configContext.state.properties;
            let workflowSelector = new WorkflowPickerSelector(this.props.workflowPickerPropertyName);
            let workflow = workflowSelector.getSelectedWorkflow(configProperties);

            return (
                <FiltersPickerRow
                    key={filter}
                    coreSettings={this.getCoreSettings(workflow)}
                    workflow={workflow}
                    filter={filter}
                    values={this.getFilterValues(filter)}
                    onChanged={(values) => this.updateValue(filter, values)}
                    workflowPickerPropertyName={this.props.workflowPickerPropertyName}
                    workflowFilters={this.getValue().workflows}
                />
            )
        }

        render(): JSX.Element {
            return <>{this.filters.map(filter => this.renderFilter(filter))}</>
        }
    }
);
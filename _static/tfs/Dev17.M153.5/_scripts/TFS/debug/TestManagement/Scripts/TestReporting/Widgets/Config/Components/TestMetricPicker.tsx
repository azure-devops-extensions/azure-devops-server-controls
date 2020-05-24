import 'VSS/LoaderPlugins/Css!TestManagement';
import * as React from 'react';
import { Label } from 'OfficeFabric/Label';
import { getId } from 'OfficeFabric/Utilities';
import { PickListDropdown, IPickListSelection } from "VSSUI/PickList";
import { withPipelinesConfigContext, IPipelinesConfigProps } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext';
import * as Resources from 'TestManagement/Scripts/Resources/TFS.Resources.TestManagement';
import { ChartMetric, TestOutcome, GroupingProperty } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { ChartMetricUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/ChartMetricUtility';
import { GroupingPropertyUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility';
import { TestOutcomePicker } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestOutcomePicker';
import { TestMetricPickerPropertyDefinition, TestMetricSettings } from './TestMetricPickerPropertyDefinition';
import { FormattedComponent } from 'VSSPreview/Controls/FormattedComponent';

export const TestMetricPickerDefaultPropertyName = "ms.azdev.pipelines.components.test-metric-picker";

export interface TestMetricPickerProps {
    /**
     * (optional) Defaults to `TestMetricPickerDefaultPropertyName`
     *
     * Unique names for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;

    /**
     * (optional) Defaults to `false`
     *
     * Indicates if this is a picker for a secondary metric
     */
    isSecondary?: boolean;
}

export const TestMetricPicker = withPipelinesConfigContext(
    class extends React.Component<TestMetricPickerProps & IPipelinesConfigProps, {}> {
        private chartMetricLabelId = getId("chart-metric-picker-label");
        private groupByLabelId = getId("stack-by-picker-label");

        public static defaultProps: TestMetricPickerProps = {
            propertyName: TestMetricPickerDefaultPropertyName,
            isSecondary: false,
        }

        constructor(props: TestMetricPickerProps & IPipelinesConfigProps) {
            super(props);

            const actionCreator = this.props.configContext.actionCreator;
            actionCreator.registerPropertyDefinition(new TestMetricPickerPropertyDefinition(this.props.propertyName, this.props.isSecondary));
        }

        private setNestedProperty(delta: Partial<TestMetricSettings>): void {
            let oldValue = this.getValue();
            let newValue = {
                ...oldValue,
                ...delta
            };
            this.props.configContext.actionCreator.setProperty(this.props.propertyName, newValue);
        }

        private getValue(): TestMetricSettings {
            return this.props.configContext.state.properties[this.props.propertyName];
        }

        private isGroupByBlocked(metric: ChartMetric = this.getValue().metric): boolean {
            return (
                metric === ChartMetric.PassRate ||
                metric === ChartMetric.None
            );
        }

        private setMetric(newMetric: ChartMetric): void {
            const oldGroupBy = this.getValue().groupBy;
            const newGroupBy = this.isGroupByBlocked(newMetric) ? GroupingProperty.None : oldGroupBy;
            this.setNestedProperty({
                metric: newMetric,
                groupBy: newGroupBy,
            });
        }

        private renderMetricPicker(): JSX.Element {
            let options = ChartMetricUtility.getOptions({isNoneAllowed: this.props.isSecondary});
            let sectionClassName = "test-trend-widget-metric-combo";
            if(this.getValue().metric !== ChartMetric.ResultCount) {
                sectionClassName = "singular-test-trend-widget-metric-section"
            }
            return (
                <>
                    <PickListDropdown
                        className={sectionClassName}
                        getPickListItems={() => options}
                        getListItem={(item: ChartMetric) => {
                            return {
                                name: ChartMetricUtility.getDisplayName(item),
                                key: String(item)
                            }
                        }}
                        selectedItems={[ this.getValue().metric ] }
                        onSelectionChanged={selection => this.setMetric(Number(selection.selectedItems[0]))}
                        ariaDescribedBy={this.chartMetricLabelId}
                    />
                </>
            );
        }

        private renderTestOutcomePicker(): JSX.Element {
            return <TestOutcomePicker testOutcomes={this.getValue().testOutcomes} onChanged={(testOutcomes: TestOutcome[]) => {this.setNestedProperty({testOutcomes: testOutcomes})}}/>
        }

        private renderMetricTestOutcomeCombo(): JSX.Element {

            let labelText = Resources.ChartMetricLabel;
            if (this.props.isSecondary) {
                labelText = Resources.SecondaryChartMetricLabel;
            }
            let label = <Label id={this.chartMetricLabelId}>{labelText}</Label>;

            if(this.getValue().metric !== ChartMetric.ResultCount) {
                return (
                    <>
                        {label}
                        {this.renderMetricPicker()}
                    </>
                );
            }

            return (
                <>
                    {label}
                    <FormattedComponent
                        className="test-trend-widget-metric-combo-container"
                        format={Resources.MetricOutcomeComboLabel}
                    >
                        {this.renderMetricPicker()}
                        {this.renderTestOutcomePicker()}
                    </FormattedComponent>
                </>
            );
        }

        private renderGroupByPicker() {
            if (this.isGroupByBlocked()) {
                return null;
            }
            return (
                <>
                    <Label id={this.groupByLabelId}>{Resources.GroupByText}</Label>
                    <PickListDropdown
                        className="singular-test-trend-widget-metric-section"
                        getPickListItems={() => GroupingPropertyUtility.getGroupByOptions()}
                        getListItem={(item: GroupingProperty) => {
                            return {
                                name: GroupingPropertyUtility.getDisplayName(item),
                                key: String(item)
                            }
                        }}
                        selectedItems={[ this.getValue().groupBy ] }
                        onSelectionChanged={(selection: IPickListSelection) => {
                            this.setNestedProperty({groupBy: Number(selection.selectedItems[0])});
                        }}
                        ariaDescribedBy={this.groupByLabelId}
                    />
                </>
            );
        }

        render(): JSX.Element {
            return (
                <>
                    {this.renderMetricTestOutcomeCombo()}
                    {this.renderGroupByPicker()}
                </>
            );
        }
    }
);
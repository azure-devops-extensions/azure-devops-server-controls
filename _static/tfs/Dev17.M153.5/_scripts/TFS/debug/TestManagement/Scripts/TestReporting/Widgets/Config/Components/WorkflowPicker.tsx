import * as React from 'react';

import { Label } from "OfficeFabric/Label";
import { getId } from 'OfficeFabric/Utilities';

import { RadioButton, RadioButtonGroup } from "VSSUI/RadioButton";

import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { withPipelinesConfigContext, IPipelinesConfigProps } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";
import { WorkflowPickerPropertyDefinition } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowPickerPropertyDefinition';

import { WorkflowUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/WorkflowUtility';

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

export const WorkflowPickerDefaultPropertyName = "ms.azdev.pipelines.components.workflow-picker";

export interface WorkflowPickerProps {
    /**
     * (optional) Defaults to WorkflowPickerDefaultPropertyName
     *
     * A unique name for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;
}

export const WorkflowPicker = withPipelinesConfigContext(
    class extends React.Component<WorkflowPickerProps & IPipelinesConfigProps, {}> {

        public static defaultProps: WorkflowPickerProps = {
            propertyName: WorkflowPickerDefaultPropertyName
        }

        private readonly labelId = getId("workflow-picker");

        constructor(props: WorkflowPickerProps & IPipelinesConfigProps) {
            super(props);

            this.props.configContext.actionCreator.registerPropertyDefinition(
                new WorkflowPickerPropertyDefinition(this.props.propertyName)
            );
        }

        private get configProperties(): { [key: string]: any } {
            return this.props.configContext.state.properties;
        }

        private getValue(): string {
            return this.configProperties[this.props.propertyName].toString();
        }

        private onWorkflowSelected(key: number) {
            this.props.configContext.actionCreator.setProperty(this.props.propertyName, key);
        }

        private getWorkflowRadioButton(workflow: Workflow): JSX.Element {
            return (
                <RadioButton
                    id={String(workflow)}
                    key={String(workflow)}
                    text={WorkflowUtility.getDisplayName(workflow)}
                />
            );
        }

        render(): JSX.Element {
            const radioButtons = [Workflow.Build, Workflow.Release].map(workflow => this.getWorkflowRadioButton(workflow));

            return (
                <>
                    <Label id={this.labelId}>{Resources.WorkflowPickerLabel}</Label>
                    <RadioButtonGroup
                        className={'workflow-selector'}
                        onSelect={(selection: string) => this.onWorkflowSelected(Number(selection))}
                        selectedButtonId={this.getValue()}
                    >
                        {radioButtons}
                    </RadioButtonGroup>
                </>
            );
        }
    }
);

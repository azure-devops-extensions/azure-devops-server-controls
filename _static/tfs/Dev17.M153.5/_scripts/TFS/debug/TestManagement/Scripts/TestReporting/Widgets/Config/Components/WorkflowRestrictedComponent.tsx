import * as React from 'react';
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { withPipelinesConfigContext, IPipelinesConfigProps } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";
import { WorkflowPickerSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowPickerSelector';

export interface WorkflowRestrictedComponentProps {
    /**
     * This component will only be shown if the selected workflow matches this.
     *
     * If this is {0}, the component will be shown regardless of the selected workflow.
     */
    restrictedTo: Workflow;

    workflowPickerPropertyName: string;
}

/**
 * Use this to show or hide components based on the selected Workflow
 */
export const WorkflowRestrictedComponent = withPipelinesConfigContext(
    class extends React.Component<WorkflowRestrictedComponentProps & IPipelinesConfigProps, {}> {
        render(): JSX.Element {
            let configProperties = this.props.configContext.state.properties;
            let workflowPickerSelector = new WorkflowPickerSelector(this.props.workflowPickerPropertyName);
            let selectedWorkflow = workflowPickerSelector.getSelectedWorkflow(configProperties);
            if (this.props.restrictedTo !== 0 &&
                this.props.restrictedTo !== selectedWorkflow)
            {
                return null;
            }
            return <>{this.props.children}</>;
        }
    }
);

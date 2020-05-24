import * as React from 'react';

import { Label } from "OfficeFabric/Label";

import { MultiRowControl } from "VSSPreview/Controls/MultiRowControl";
import { IRowContent } from 'VSSPreview/Controls/RowContent';

import { LoaderAdornment } from 'Analytics/Scripts/Controls/LoaderAdornment';

import { PipelinePickerRowProps, PipelinePickerRow } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinePickerRow';
import { PipelinePickerPropertyDefinition, PipelineDefinition } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinePickerPropertyDefinition';
import { IPipelinesConfigProps } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";
import { PipelinesSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesSelector';
import { WorkflowPickerSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowPickerSelector';
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { WorkflowRestrictedComponent } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/WorkflowRestrictedComponent';

export const PipelinePickerBaseDefaultPropertyName = "ms.azdev.pipelines.components.pipelines-picker-base";

export interface PipelinePickerBaseProps {
    /**
     * (optional) Defaults to `PipelinePickerBaseDefaultPropertyName`
     *
     * A unique name for the data represented by this control in the Config.
     *
     * If you've got multiple instances of this control, explicitly provide names to ensure uniqueness.
     */
    propertyName?: string;

    /**
     * (optional) Shows/Hides this component based on a WorkflowPicker.
     */
    workflowPickerPropertyName?: string;
}

export abstract class PipelinePickerBase extends React.Component<PipelinePickerBaseProps & IPipelinesConfigProps, {}> {
    public static defaultProps: PipelinePickerBaseProps = {
        propertyName: PipelinePickerBaseDefaultPropertyName,
    }

    constructor(props: PipelinePickerBaseProps & IPipelinesConfigProps) {
        super(props);

        this.props.configContext.actionCreator.registerPropertyDefinition(
            new PipelinePickerPropertyDefinition(this.props.propertyName)
        );
    }

    protected abstract getLabelId(): string;

    protected abstract getLabelText(): string;

    protected abstract getRowLabelText(): string;

    protected abstract getValue(): PipelineDefinition[];

    protected abstract getPipelineKey(item: PipelineDefinition): string;

    protected abstract getDefinitions(): { [key: string]: PipelineDefinition };

    protected abstract getDefaultPropertyName(): string;

    protected abstract isLoading(): boolean;

    protected abstract getWorkflow(): Workflow;

    protected get configProperties(): { [key: string]: any } {
        return this.props.configContext.state.properties;
    }

    protected get pipelinesSelector(): PipelinesSelector {
        return this.props.pipelinesContext.selector;
    }

    private onRowChanged(index: number, pipeline: PipelineDefinition): void {
        const oldValue = this.getValue();
        let newValue: PipelineDefinition[] = JSON.parse(JSON.stringify(oldValue));
        newValue[index] = pipeline;

        this.props.configContext.actionCreator.setProperty(this.props.propertyName, newValue);
    }

    private getNewRow(
        index: number,
        pipeline: PipelineDefinition
    ): IRowContent<PipelinePickerRowProps, PipelinePickerRow> {
        return {
            contentProps: {
                pipeline: pipeline,
                getPipelineKey: (item: PipelineDefinition) => this.getPipelineKey(item),
                definitions: this.getDefinitions(),
                label: this.getRowLabelText(),
                onChanged: (pipeline: PipelineDefinition) => this.onRowChanged(index, pipeline),
            },
            ctor: PipelinePickerRow
        };
    }

    private onRowDeleted(index: number): void {
        const oldValue = this.getValue();
        let newValue: PipelineDefinition[] = JSON.parse(JSON.stringify(oldValue));
        newValue.splice(index, 1);
        this.props.configContext.actionCreator.setProperty(this.props.propertyName, newValue);
    }

    render(): JSX.Element {
        let selectedPipelines = this.getValue();
        let rowData: IRowContent<PipelinePickerRowProps, PipelinePickerRow>[] =
            selectedPipelines.map((selectedPipeline, i) => {
                return this.getNewRow(i, selectedPipeline);
            });

        return (
            <WorkflowRestrictedComponent
                workflowPickerPropertyName={this.props.workflowPickerPropertyName}
                restrictedTo={this.getWorkflow()}
            >
                <Label id={this.getLabelId()}>{this.getLabelText()}</Label>
                <LoaderAdornment isLoading={this.isLoading()} hideChildrenWhenLoading>
                    <MultiRowControl
                        addButtonCallback={() => this.onRowChanged(rowData.length, null)}
                        deleteButtonCallback={(index) => this.onRowDeleted(index)}
                        minimumRows={1}
                        rowData={rowData}
                        removeOuterPadding
                    />
                </LoaderAdornment>
            </WorkflowRestrictedComponent>
        );
    }
}
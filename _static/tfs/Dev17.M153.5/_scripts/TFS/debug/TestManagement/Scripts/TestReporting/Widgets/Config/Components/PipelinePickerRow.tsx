import * as React from 'react';

import * as StringUtils from "VSS/Utils/String";

import { PickListDropdown } from "VSSUI/PickList";

import { IRowContentProps } from 'VSSPreview/Controls/RowContent';

import { PipelineDefinition } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinePickerPropertyDefinition';

import * as Dictionary from "Widgets/Scripts/Utilities/Dictionary";


export interface PipelinePickerRowProps extends IRowContentProps {
    pipeline: PipelineDefinition;
    getPipelineKey: (item: PipelineDefinition) => string;
    definitions: { [key: string]: PipelineDefinition };
    label: string;
    onChanged: (pipeline: PipelineDefinition) => void;
}

export class PipelinePickerRow extends React.Component<PipelinePickerRowProps, {}> {

    constructor(props: PipelinePickerRowProps) {
        super(props);
    }

    private getPipelineName(pipeline: PipelineDefinition): string {
        if(!pipeline) {
            return "";
        }

        return pipeline.Name;
    }

    render(): JSX.Element {

        return (
            <>
                <PickListDropdown
                    selectedItems={[this.props.pipeline]}
                    itemAriaDescription={this.props.label}
                    getPickListItems={() => Dictionary.toArray(this.props.definitions).sort((a, b) => StringUtils.localeIgnoreCaseComparer(a.Name, b.Name))}
                    getListItem={(item: PipelineDefinition) => ({
                        key: !!item ? this.props.getPipelineKey(item) : null,
                        name: this.getPipelineName(item)
                    })}
                    isSearchable
                    onSelectionChanged={(selection) => {
                        this.props.onChanged(selection.selectedItems[0] as PipelineDefinition);
                    }}
                />
            </>
        );
    }
}
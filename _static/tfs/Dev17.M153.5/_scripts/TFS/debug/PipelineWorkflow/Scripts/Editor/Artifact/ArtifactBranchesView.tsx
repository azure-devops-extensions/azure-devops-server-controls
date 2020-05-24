/// <reference types="react-dom" />

import * as React from "react";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_String from "VSS/Utils/String";

import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import { SourcesUtils } from "PipelineWorkflow/Scripts/Editor/Common/SourcesUtils";

export interface IArtifactBranchViewProps extends ComponentBase.IProps {
    branches: string[];
    branchFilter: string;
    onBranchFilterChange: (selectedBranch: string) => void;
    isRequired: boolean;
}

export class ArtifactBranchesView extends ComponentBase.Component<IArtifactBranchViewProps, ComponentBase.IStateless> {
    constructor(props: IArtifactBranchViewProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (<div className="fabric-style-overrides github-branch-list">
            <ComboBoxInputComponent
                source={this.props.branches}
                value={this.props.branchFilter}
                onValueChanged={(item) => this.props.onBranchFilterChange(item)}
                comboBoxType={ComboBoxType.Editable}
                required={this.props.isRequired}
                textfieldOnEmptySource={true}
                compareInputToItem={this._compareInputToItem}
                errorMessage={Resources.SettingsRequired} />
        </div>);
    }

    private _compareInputToItem = (item: string, input: string): number => {
        return SourcesUtils.branchFilterComparer(item, input);
    }
}
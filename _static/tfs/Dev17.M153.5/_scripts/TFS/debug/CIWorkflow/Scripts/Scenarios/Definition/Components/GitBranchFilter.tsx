/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

export interface IGitBranchFilterProps extends Base.IProps {
    branchFilter: string;
    gitBranches: string[];
    onFilterChange: (value: string) => void;
    branchFilterComparer: (branch: string, input: string) => number;
    disabled?: boolean;
}

export class GitBranchFilter extends Base.Component<IGitBranchFilterProps, Base.IStateless> {
    public render(): JSX.Element {
        return (<div className="fabric-style-overrides github-branch-list">
            <ComboBoxInputComponent
                source={this.props.gitBranches}
                value={this.props.branchFilter}
                onValueChanged={this.props.onFilterChange}
                comboBoxType={ComboBoxType.Editable}
                required={true}
                textfieldOnEmptySource={true}
                compareInputToItem={this._compareInputToItem}
                errorMessage={Resources.SettingsRequired}
                ariaLabel={Resources.BranchSpecificationText}
                disabled={this.props.disabled} />
        </div>);
    }

    private _compareInputToItem = (item: string, input: string): number => {
        return this.props.branchFilterComparer(item, input);
    }
}

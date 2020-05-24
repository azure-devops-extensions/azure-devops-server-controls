/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

export interface IProps extends Base.IProps {
    defaultBranch: string;
    revisionOrCommitLabel: string;
    onBranchChanged: (branch: string) => void;
    onSourceVersionChanged: (sourceVersion: string) => void;
}

/**
 * Encapsulates vanilla editor to be shown for GitHub, Remote Git and Subversion when the build is queued. 
 */
export class BuildQueueSourceSelectionEditor extends Base.Component<IProps, Base.IStateless>  {

    public render(): JSX.Element {
        return (
            <div>
                <StringInputComponent
                    label={Resources.Branch}
                    onValueChanged={this.props.onBranchChanged}
                    value={this.props.defaultBranch} />

                <StringInputComponent
                    label={this.props.revisionOrCommitLabel}
                    onValueChanged={this.props.onSourceVersionChanged} />
            </div>);
    }

}

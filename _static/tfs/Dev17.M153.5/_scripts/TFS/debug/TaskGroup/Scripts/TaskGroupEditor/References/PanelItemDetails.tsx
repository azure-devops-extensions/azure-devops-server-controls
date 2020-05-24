import * as React from "react";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { ITaskGroupReferenceGroup } from "DistributedTask/TaskGroups/ExtensionContracts";

import { IStateless } from "DistributedTaskControls/Common/Components/Base";

import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";
import { ReferencesList } from "TaskGroup/Scripts/TaskGroupEditor/References/ReferencesList";

export interface IPanelItemDetailsProps extends IBaseProps {
    referenceGroup: ITaskGroupReferenceGroup;
}

export class PanelItemDetails extends BaseComponent<IPanelItemDetailsProps, IStateless>{
    public render(): JSX.Element {
        if (this.props.referenceGroup && this.props.referenceGroup.references && this.props.referenceGroup.references.length > 0) {
            return (
                <div className={"references-right-pane"}>
                    <ReferencesList
                        referenceGroup={this.props.referenceGroup}
                    />
                </div>);
        }
        else {
            return this._getNoReferencesComponent();
        }
    }

    private _getNoReferencesComponent(): JSX.Element {
        return (
            <div className="no-task-group-references">
                {Resources.NoReferencesFoundText}
            </div>
        );
    }
}
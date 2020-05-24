import * as React from "react";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskGroupParametersView } from "DistributedTaskControls/Components/Task/TaskGroupParametersView";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";

import { TaskGroupPropertiesItemStore, ITaskGroupPropertiesItemState } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemStore";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class ParametersSection extends Component<IProps, ITaskGroupPropertiesItemState>{

    public render(): JSX.Element {
        return (
            this.state.hasResolvedParameters &&
            <AccordionCustomRenderer
                cssClass={"parameters-section"}
                label={Resources.TaskGroupParametersSectionHeader}
                initiallyExpanded={true}
                headingLevel={2}
                addSectionHeaderLine={true}>

                <TaskGroupParametersView
                    instanceId={this.props.instanceId}
                    doNotShowHeader={true}
                    showEndpointsAsDropdowns={true}
                />

            </AccordionCustomRenderer>);
    }

    public componentWillMount(): void {
        this._taskGroupPropertiesItemStore = StoreManager.GetStore<TaskGroupPropertiesItemStore>(TaskGroupPropertiesItemStore, this.props.instanceId);
        this.setState(this._taskGroupPropertiesItemStore.getState());
        this._taskGroupPropertiesItemStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupPropertiesItemStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        const state = this._taskGroupPropertiesItemStore.getState();
        this.setState(state);
    }

    private _taskGroupPropertiesItemStore: TaskGroupPropertiesItemStore;
}
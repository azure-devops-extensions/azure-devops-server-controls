import * as React from "react";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskGroupPropertiesView } from "DistributedTaskControls/Components/Task/TaskGroupPropertiesView";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";

import { TaskGroupPropertiesItemStore, ITaskGroupPropertiesItemState } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemStore";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class PropertiesSection extends Component<IProps, ITaskGroupPropertiesItemState>{

    constructor(props: IProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <AccordionCustomRenderer
                cssClass={"properties-section"}
                label={Resources.TaskGroupPropertiesSectionHeader}
                initiallyExpanded={true}
                headingLevel={2}
                addSectionHeaderLine={true}
                showErrorDelegate={() => !this._arePropertiesValid()}>

                <TaskGroupPropertiesView
                    instanceId={this.props.instanceId}
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

    private _arePropertiesValid = () => {
        return this._taskGroupPropertiesItemStore.arePropertiesValid();
    }

    private _taskGroupPropertiesItemStore: TaskGroupPropertiesItemStore;
}
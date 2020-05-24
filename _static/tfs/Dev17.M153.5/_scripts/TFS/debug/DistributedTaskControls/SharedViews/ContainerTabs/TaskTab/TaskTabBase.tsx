/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { TasksTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";

export interface ITaskTabBaseProps extends ContainerTabBase.IContainerTabBaseProps {
}

export interface ITaskTabBaseState extends ContainerTabBase.IContainerTabBaseState {
    defaultItems: Item[];
}

export abstract class TaskTabBase<T extends ITaskTabBaseProps> extends Base.Component<T, ITaskTabBaseState> {

    public render(): JSX.Element {
        return (
            <ContainerTabBase.ContainerTabBase {...this.props} />
        );
    }

    protected abstract getDefaultItems(instanceId?: string): Item[];
}
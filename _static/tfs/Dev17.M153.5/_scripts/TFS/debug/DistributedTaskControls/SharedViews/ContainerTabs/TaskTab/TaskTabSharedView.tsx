/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { TaskGroupDialog } from "DistributedTaskControls/Components/Task/TaskGroupDialog";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";

export interface ITaskTabSharedViewProps extends Base.IProps {
    items: Item[];
    itemSelectionInstanceId: string;
}

export interface ITasksTabSharedViewState extends Base.IState {
    items: Item[];
}

export class TasksTabSharedView extends Base.Component<ITaskTabSharedViewProps, ITasksTabSharedViewState> {

    public componentWillMount(): void {
        this.setState({
            items: this.props.items
        });
    }

    public componentWillReceiveProps(newProps: ITaskTabSharedViewProps): void {
        if (this.props.items.length !== newProps.items.length) {
            this.setState({
                items: newProps.items
            });
        }
    }

    public render(): JSX.Element {
        return (
            <div className={css("tasks-tab-content", this.props.cssClass)}>
                <TwoPanelSelectorComponent
                    isLeftPaneScrollable={true}
                    instanceId={this.props.itemSelectionInstanceId}
                    items={this.state.items}
                    defaultItemKey={(!!this.props.items[0]) ? this.props.items[0].getKey() : Utils_String.empty}
                    leftClassName="task-tab-left-section"
                    rightClassName="task-tab-right-section"
                    leftPaneARIARegionRoleLabel={Resources.ARIALabelProcessEditorLeftPane}
                    rightPaneARIARegionRoleLabel={Resources.ARIALabelProcessEditorRightPane}
                    setFocusOnLastSelectedItem={true}
                    leftRole="tree" />

                <TaskGroupDialog />
            </div>
        );
    }
}

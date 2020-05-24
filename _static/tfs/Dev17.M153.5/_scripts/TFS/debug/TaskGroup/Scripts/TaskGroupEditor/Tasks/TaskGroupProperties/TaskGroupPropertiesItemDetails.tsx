import * as React from "react";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";

import { HeaderSection } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/HeaderSection";
import { PropertiesSection } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/PropertiesSection";
import { ParametersSection } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/ParametersSection";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemDetails";

export class TaskGroupPropertiesItemDetails extends Component<IProps, IStateless>{
    constructor(props: IProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <div className={"task-group-general-right-pane"}>

                <HeaderSection
                    instanceId={this.props.instanceId}
                />

                <PropertiesSection
                    instanceId={this.props.instanceId}
                />

                <ParametersSection
                    instanceId={this.props.instanceId}
                />

            </div>);
    }
}
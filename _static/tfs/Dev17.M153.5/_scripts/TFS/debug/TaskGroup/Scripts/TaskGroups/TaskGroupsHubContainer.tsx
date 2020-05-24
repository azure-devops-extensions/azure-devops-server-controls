import * as React from "react";
import * as ReactDOM from "react-dom";

import SDK_Shim = require("VSS/SDK/Shim");
import { BaseControl, create as createControl } from "VSS/Controls";
import { getService as getEventService } from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { PerfTelemetryManager, TelemetryScenarios, TaskGroupTelemetry } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { checkIfUrlHasTaskGroupIdAndNavigate } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { TaskGroupsActionCreator } from "TaskGroup/Scripts/TaskGroups/TaskGroupsActionCreator";
import { TaskGroupsStore } from "TaskGroup/Scripts/TaskGroups/TaskGroupsStore";
import { TaskGroupsHubDataHelper } from "TaskGroup/Scripts/Common/Sources/TaskGroupsHubDataHelper";
import { TaskGroupsHub } from "TaskGroup/Scripts/TaskGroups/TaskGroupsHub";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroups/TaskGroupsHub";

export class TaskGroupsHubContainer extends BaseControl {
    public initialize(): void {
        super.initialize();

        // check if there is a reload from the old hub, and react accordingly
        checkIfUrlHasTaskGroupIdAndNavigate();

        PerfTelemetryManager.initialize();
        TaskGroupTelemetry.initialize();
        PerfTelemetryManager.instance.startTTIScenario(
            TelemetryScenarios.TaskGroupsLanding);
        this._initializeActionsAndStores();
        this._setupCleanupOnHubChange();

        PerfTelemetryManager.instance.split("Starting TaskGroupsHub render");
        ReactDOM.render(
            <TaskGroupsHub />,
            this.getElement()[0]);
    }

    private _initializeActionsAndStores(): void {
        TaskGroupsHubDataHelper.initialize();
        const taskGroupsStore = StoreManager.GetStore<TaskGroupsStore>(TaskGroupsStore);

        this._taskGroupsActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupsActionCreator>(TaskGroupsActionCreator);

        this._taskGroupsActionCreator.initializeTaskGroups();
    }

    private _setupCleanupOnHubChange(): void {
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _hubChangeHandler = (sender: any, event: any) => {
        ActionCreatorManager.dispose();
        StoreManager.dispose();
        PerfTelemetryManager.dispose();
        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _taskGroupsActionCreator: TaskGroupsActionCreator;
}


SDK_Shim.VSS.register("dt.taskGroupHub", (context) => {
    createControl(TaskGroupsHubContainer, context.$container, context.options, { cssClass: "task-groups-hub-container" });
});

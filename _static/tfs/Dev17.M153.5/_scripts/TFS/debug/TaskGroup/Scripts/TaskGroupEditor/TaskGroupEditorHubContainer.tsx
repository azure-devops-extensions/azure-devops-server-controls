import * as React from "react";
import * as ReactDOM from "react-dom";

import SDK_Shim = require("VSS/SDK/Shim");
import { BaseControl, create as createControl } from "VSS/Controls";
import { getService as getEventService } from "VSS/Events/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import { format as stringFormat, EmptyGuidString, isEmptyGuid } from "VSS/Utils/String";

import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Common from "DistributedTaskControls/Common/Common";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskDefinitionSource } from 'DistributedTaskControls/Sources/TaskDefinitionSource';
import { TaskGroupHistoryViewStore } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistoryViewStore";

import { TaskGroupReferencesViewStore } from "TaskGroup/Scripts/TaskGroupEditor/References/TaskGroupReferencesViewStore";
import { TabStore } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabStore";
import { TasksTabStore } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabStore";
import { TaskGroupEditorStore } from "TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorStore";
import { TaskGroupEditorActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorActionCreator";
import { PerfTelemetryManager, TelemetryScenarios, TaskGroupTelemetry } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { getTaskGroupIdFromWindowUrl, isTaskGroupImportInProgress, navigateToTaskGroupsHub } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { isSystemVariable, getSystemVariableContributions } from "TaskGroup/Scripts/Utils/SystemVariablesUtils";
import { TaskGroupEditorHub } from "TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorHub";
import { TaskGroupEditorInstanceIds, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TaskGroupEditorHubData } from "TaskGroup/Scripts/Common/Sources/TaskGroupEditorHubData";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/TaskGroupEditorHub";

export class TaskGroupEditorHubContainer extends BaseControl {
    public initialize(): void {
        super.initialize();
        let taskGroupId = getTaskGroupIdFromWindowUrl();
        if (isTaskGroupImportInProgress()) {
            taskGroupId = EmptyGuidString;
        }

        if (!taskGroupId) {
            // If task group id is not provided correctly, redirect to task groups list
            navigateToTaskGroupsHub();
            return;
        }

        PerfTelemetryManager.initialize();
        TaskGroupTelemetry.initialize();
        PerfTelemetryManager.instance.startTTIScenario(
            TelemetryScenarios.TaskGroupEditorLanding);

        const tasksFluxInstanceId = stringFormat(TaskGroupEditorInstanceIds.TaskGroupEditorStoresInstanceIdFormat, taskGroupId);

        this._initializeActionsAndStores(taskGroupId, tasksFluxInstanceId);
        this._setupCleanupOnHubChange();

        PerfTelemetryManager.instance.split("Starting TaskGroupEditorHub render");
        ReactDOM.render(
            <TaskGroupEditorHub
                taskGroupId={taskGroupId}
                instanceId={tasksFluxInstanceId}
            />,
            this.getElement()[0]);
    }

    private _initializeActionsAndStores(taskGroupId: string, tasksFluxInstanceId: string): void {
        this._disposeManagers();
        this._setAppContextCapabilities();
        this._setIsSystemVariableForAppContext();

        TaskGroupEditorHubData.initialize();
        this._taskGroupEditorActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupEditorActionCreator>(TaskGroupEditorActionCreator, tasksFluxInstanceId);

        StoreManager.GetStore<TasksTabStore>(TasksTabStore, tasksFluxInstanceId);
        StoreManager.GetStore<TaskGroupEditorStore>(TaskGroupEditorStore, tasksFluxInstanceId);

        if (!isEmptyGuid(taskGroupId)) {
            StoreManager.GetStore<TaskGroupHistoryViewStore>(TaskGroupHistoryViewStore, tasksFluxInstanceId);
            StoreManager.GetStore<TabStore>(TabStore, TabInstanceIds.History);
            StoreManager.GetStore<TaskGroupReferencesViewStore>(TaskGroupReferencesViewStore);

            this._taskGroupEditorActionCreator.initializeTaskGroup(taskGroupId);
        }
        else {
            this._taskGroupEditorActionCreator.initializeTaskGroupForImport();
        }
    }

    private _setAppContextCapabilities(): void {
        let capabilities: AppCapability[] = [AppCapability.Deployment, AppCapability.GreaterThanConditionInDemand, AppCapability.VariablesForTasktimeout];

        if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_MarketplaceExtensionSupport, false)) {
            capabilities.push(AppCapability.MarketplaceExtensions);
        }

        AppContext.instance().Capabilities = capabilities;
    }

    private _setIsSystemVariableForAppContext(): void {
        getSystemVariableContributions().then(() => {
            AppContext.instance().IsSystemVariable = (variableName: string) => isSystemVariable(variableName);
        });
    }

    private _setupCleanupOnHubChange(): void {
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _hubChangeHandler = (sender: any, event: any) => {
        TaskDefinitionSource.instance().disposeTaskDefinitionCache();
        this._disposeManagers();
        PerfTelemetryManager.dispose();
        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _disposeManagers(): void {
        ActionCreatorManager.dispose();
        StoreManager.dispose();
        SourceManager.dispose();
    }

    private _taskGroupEditorActionCreator: TaskGroupEditorActionCreator;
}

SDK_Shim.VSS.register("dt.taskGroupEdit", (context) => {
    createControl(TaskGroupEditorHubContainer, context.$container, context.options, { cssClass: "task-group-editor-hub-container" });
});
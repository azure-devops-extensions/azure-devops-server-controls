import { IInputControllerStore } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { IPickListRefreshOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TaskDefinition, TaskGroupDefinition, TaskVersion } from "TFS/DistributedTask/Contracts";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class TaskStoreUtility {

    public static createTaskInstanceCopy(taskInstance: ITask, taskDefinition: TaskDefinition): ITask {
        let inputs: IDictionaryStringTo<string> = {};
        let overrideInputs: IDictionaryStringTo<string> = {};
        let environmentVariables: IDictionaryStringTo<string> = {};

        if (taskInstance === null) {
            return null;
        }

        if (taskInstance.inputs && Object.keys(taskInstance.inputs).length > 0) {
            Object.keys(taskInstance.inputs).forEach((key: string) => {
                inputs[key] = taskInstance.inputs[key];
            });
        }

        if (taskInstance.overrideInputs && Object.keys(taskInstance.overrideInputs).length > 0) {
            Object.keys(taskInstance.overrideInputs).forEach((key: string) => {
                overrideInputs[key] = taskInstance.overrideInputs[key];
            });
        }

        if (taskInstance.environment && Object.keys(taskInstance.environment).length > 0) {
            Object.keys(taskInstance.environment).forEach((key: string) => {
                environmentVariables[key] = taskInstance.environment[key];
            });
        }

        return {
            displayName: taskInstance.displayName || taskDefinition.friendlyName,
            refName: taskInstance.refName,
            enabled: taskInstance.enabled,
            continueOnError: taskInstance.continueOnError,
            timeoutInMinutes: taskInstance.timeoutInMinutes,
            alwaysRun: taskInstance.alwaysRun,
            condition: taskInstance.condition,
            order: taskInstance.order,
            inputs: inputs,
            overrideInputs: overrideInputs,
            environment: environmentVariables,
            task: {
                id: taskInstance.task.id,
                definitionType: taskInstance.task.definitionType,
                versionSpec: taskInstance.task.versionSpec
            }
        } as ITask;
    }

    public static areTaskInstanceInputsEqual(taskInstance1: ITask, taskInstance2: ITask): boolean {

        if (Object.keys(taskInstance1.inputs).length !== Object.keys(taskInstance2.inputs).length) {
            return false;
        }

        for (let key in taskInstance1.inputs) {
            if (taskInstance1.inputs[key] !== taskInstance2.inputs[key]) {
                return false;
            }
        }

        return true;
    }

    public static areTaskInstanceOverrideInputsEqual(taskInstance1: ITask, taskInstance2: ITask): boolean {
        if (!taskInstance1.overrideInputs && !taskInstance2.overrideInputs) {
            return true;
        }

        if (taskInstance1.overrideInputs
            && taskInstance2.overrideInputs
            && Object.keys(taskInstance1.overrideInputs).length === Object.keys(taskInstance2.overrideInputs).length) {
            for (let key in taskInstance1.overrideInputs) {
                if (!taskInstance2.overrideInputs.hasOwnProperty(key) || !Utils_String.equals(taskInstance1.overrideInputs[key], taskInstance2.overrideInputs[key], true)) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    public static areVersionsEqual(version1: TaskVersion, version2: TaskVersion): boolean {
        return version1.major === version2.major && version1.minor === version2.minor && version1.patch === version2.patch && version1.isTest === version2.isTest;
    }

    public static getPickListRefreshOptions(inputDefinition: TaskInputDefinition, inputControllerStore: IInputControllerStore): IPickListRefreshOptions {
        return {
            sourceDefinitions: inputControllerStore.getSourceDefinitions(),
            dataSourceBindings: inputControllerStore.getDataSourceBindings(),
            taskInputToValueMap: inputControllerStore.getInputToValueMap(),
            processParametersToValueMap: inputControllerStore.getProcessParameterToValueMap(),
            taskDefinitionId: inputControllerStore.getTaskDefinitionId(inputDefinition)
        };
    }

    /**
     * Merge the options of newTaskDefinition inputs with the existingTaskInputDefinitionMap
     * 
     * We are only doing this for inputs with dynamic options support
     * It's basically to copy over the options for inputs[which meet above condition] when the version of task is changed
     * 
     * Check if the input exists in the existingTaskInputDefinitionMap and has options,
     * if condition is met, copy the options to the input in newTaskDefinition
     * 
     * @static
     * @param {TaskDefinition} taskDefinition 
     * @param {IDictionaryStringTo<TaskInputDefinition>} existingTaskInputDefinitionMap 
     * 
     * @memberof TaskStoreUtility
     */
    public static mergeInputOptions(newTaskDefinition: TaskDefinition, existingTaskInputDefinitionMap: IDictionaryStringTo<TaskInputDefinition>) {

        // handle negative scenarios
        if (!(newTaskDefinition && newTaskDefinition.inputs && existingTaskInputDefinitionMap)) {
            return;
        }

        newTaskDefinition.inputs.forEach((inputDef: TaskInputDefinition) => {

            // check if input support dynamic options
            if (this._doesInputSupportDynamicOptions(inputDef, newTaskDefinition)) {

                // check if input with same name already exists in the existing taskDefinition
                const existingInputDef = existingTaskInputDefinitionMap[inputDef.name];
                if (existingInputDef) {

                    // check if the input type is same for both
                    if (Utils_String.ignoreCaseComparer(DtcUtils.getTaskInputType(inputDef), DtcUtils.getTaskInputType(existingInputDef)) === 0) {

                        // check if the existing inputDef had options
                        const existingInputOptions = existingInputDef.options;
                        if (existingInputOptions) {

                            let options = {};
                            Object.keys(existingInputOptions).forEach((key: string) => {
                                options[key] = existingInputOptions[key];
                            });

                            inputDef.options = options;
                        }
                    }
                }
            }
        });
    }

    public static isTaskSectionInitiallyCollapsed(groupDefinition: TaskGroupDefinition): boolean {
        let shouldInitiallyCollapse: boolean = false;

        // Check if the task section needs to be initially collapsed based on group definition isExpanded
        if (groupDefinition && groupDefinition.isExpanded !== undefined) {
            return !groupDefinition.isExpanded;
        }

        // Check if the task section needs to be initially collapsed based on group definition displayName
        if (groupDefinition && groupDefinition.displayName) {
            let trimmedSectionDisplayName: string = groupDefinition.displayName.trim().toLowerCase();

            if (trimmedSectionDisplayName) {
                // String contains any ControlOptionsText string
                shouldInitiallyCollapse = shouldInitiallyCollapse ||
                    (trimmedSectionDisplayName.indexOf(Resources.ControlOptionsText.toLowerCase())) !== -1;

                if (!shouldInitiallyCollapse) {
                    // String contains any AdvancedOptionText string
                    shouldInitiallyCollapse = shouldInitiallyCollapse ||
                        (trimmedSectionDisplayName.indexOf(Resources.AdvancedOptionText.toLowerCase())) !== -1;
                }
            }
        }

        return shouldInitiallyCollapse;
    }

    /**
     * Check if the input support dynamic options
     * 
     * Connected Service, Azure Connection and PickList which supports sourceBinding or dataSourceBinding
     * 
     * @private
     * @static
     * @param {TaskInputDefinition} inputDef 
     * @param {TaskDefinition} taskDefinition 
     * @returns {boolean} 
     * 
     * @memberof TaskStoreUtility
     */
    private static _doesInputSupportDynamicOptions(inputDef: TaskInputDefinition, taskDefinition: TaskDefinition): boolean {
        const inputType = DtcUtils.getTaskInputType(inputDef);

        if (inputType === InputControlType.INPUT_TYPE_AZURE_CONNECTION ||
            inputType === InputControlType.INPUT_TYPE_CONNECTED_SERVICE) {
            return true;
        }
        else if (inputType === InputControlType.INPUT_TYPE_PICK_LIST) {
            const pickListOptions = PickListInputUtility.getPickListOptions(inputDef, taskDefinition.dataSourceBindings, taskDefinition.sourceDefinitions);
            if (pickListOptions.sourceDefintion || pickListOptions.dataSourceBinding) {
                return true;
            }
        }

        return false;
    }
}
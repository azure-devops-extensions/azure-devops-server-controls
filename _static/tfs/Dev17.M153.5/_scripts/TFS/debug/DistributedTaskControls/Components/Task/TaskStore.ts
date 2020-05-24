import { ProcessParameterActions } from "DistributedTaskControls/Actions/ProcessParameterActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Common from "DistributedTaskControls/Common/Common";
import { InputValidation } from "DistributedTaskControls/Common/InputValidation";
import { ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import {
    ActionForTaskInput,
    ICreateProcessParameterPayload,
    IInputBaseState,
    ILinkToProcessParameterPayload,
    IProcessParameterReferenceData,
    IResolvedTaskInputValue,
    ITaskContext,
    ITaskInputError,
    ITaskInputOptions,
    ITaskInputValue,
    ITaskVersionInfo
} from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { 
    TaskActionCreator,
    IEnvironmentVariableNamePayload,
    IEnvironmentVariableValuePayload
} from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskStoreBase } from "DistributedTaskControls/Components/Task/TaskStoreBase";
import { TaskStoreUtility } from "DistributedTaskControls/Components/Task/TaskStoreUtility";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { DataSourceBindingUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/DataSourceBindingUtility";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";

import { DefinitionType, ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskDefinition, TaskVersion } from "TFS/DistributedTask/Contracts";
import {
    DataSourceBindingBase as DataSourceBinding,
    ProcessParameters,
    TaskInputDefinitionBase as TaskInputDefinition,
    TaskSourceDefinitionBase as TaskSourceDefinition
} from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IEnvironmentVariableData {
    name: string;
    value: string;
}

export interface ITaskStoreArgs {
    taskInstance: ITask;
    taskDefinition: TaskDefinition;
    taskVersionInfoList: ITaskVersionInfo[];
    taskContext: ITaskContext;
}

export interface ITaskItemOverviewState extends ItemOverviewState {
    name: string;
    refName: string;
    isDisabled: boolean;
    isDefinitionValid: boolean;
    isOnLatestMajorVersion: boolean;
    isPreview: boolean;
    isTest: boolean;
    isDeprecated: boolean;
    isDeleting?: boolean;
}

/**
 * @brief Store for Task detail information
 */
export class TaskStore extends TaskStoreBase {

    constructor(args: ITaskStoreArgs) {
        super(args.taskContext);

        Diag.Debug.assert(!!(args));
        Diag.Debug.assert(!!(args.taskInstance));
        Diag.Debug.assert(!!(args.taskVersionInfoList));
        Diag.Debug.assert(!!(args.taskDefinition));
        Diag.Debug.assert(!!(args.taskContext));

        this._taskInstance = args.taskInstance;
        this._taskDefinition = args.taskDefinition;

        this._processParameterToValueMap = {};
        this._setInputDefinitionMap();
        this._setTaskVersionList(args.taskVersionInfoList);
    }

    public initialize(instanceId: string): void {

        super.initialize(instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, instanceId);

        //// Add listener to update task definition
        this._actionCreator.updateTaskDefinitionAction.addListener(this._updateTaskDefinition);

        // Listener to change in task name
        this._actionCreator.renameTaskAction.addListener(this._handleRenameTaskAction);

        // Listener to change in task refName
        this._actionCreator.updateTaskRefNameAction.addListener(this._handleUpdateTaskRefNameAction);

        // listener to change the enabled state/field of the task
        this._actionCreator.updateTaskStateAction.addListener(this._handleUpdateTaskStateAction);

        // Listener to task input error updates
        this._actionCreator.updateTaskInputErrorAction.addListener(this._handleUpdateTaskInputError);

        // Listener to update task input value
        this._actionCreator.updateTaskInputValueAction.addListener(this._handleUpdateTaskInputValue);

        // Listener to update task input options
        this._actionCreator.updateTaskInputOptionsAction.addListener(this._handleUpdateTaskInputOptionsAction);

        // Listener to add environment variable
        this._actionCreator.addTaskEnvironmentVariableAction.addListener(this._handleAddEnvironmentVariable);

        // Listeners to update environment variables
        this._actionCreator.updateTaskEnvironmentVariableNameAction.addListener(this._handleUpdateEnvironmentVariableName);
        this._actionCreator.updateTaskEnvironmentVariableValueAction.addListener(this._handleUpdateEnvironmentVariableValue);
        
        // Listener to delete environment variable
        this._actionCreator.deleteTaskEnvironmentVariableAction.addListener(this._handleDeleteEnvironmentVariable);

        this._actionCreator.markTaskAsDeletingAction.addListener(this._handleMarkTaskAsDeleting);
        // TODO(akgup): This needs to figured out where to get value for this. Either as argument in constructor/initialize or get from process param store.
        // Now getting from store.
        let processParameterStore: ProcessParameterStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, this.getTaskContext().processInstanceId);
        let processParameters = processParameterStore.getProcessParameters();

        this._updateProcessParametersValueMap(processParameters);

        // Listening to process parameter input change.
        this._processParameterActions = ActionsHubManager.GetActionsHub<ProcessParameterActions>(ProcessParameterActions, this.getTaskContext().processInstanceId);
        this._processParameterActions.updateInput.addListener(this._handleUpdateProcessParameter);
        this._processParameterActions.createProcessParameter.addListener(this._handleCreateProcessParameter);

        this._processParameterActions.removeAllProcessParameters.addListener(this._handleRemoveAllProcessParameters);

        this._createTaskInputToProcessParameterNameMap(this._taskInstance, this._processParameterToValueMap);

        if (this._taskInstance) {
            this._updateCurrentAndOriginalTaskInstances(this._taskInstance);
        }

        this._dependencyToTargetMap = DataSourceBindingUtility.getDependencyToTargetsMap(this.getTaskInstance().inputs, this.getDataSourceBindings(), this.getSourceDefinitions());

        this._setVisibility();

        // Linking task input to process parameter
        this._actionCreator.linkToProcessParameterAction.addListener(this._handleLinkToProcessParameter);

        // Unlinking task input from process parameter
        this._actionCreator.unlinkFromProcessParameterAction.addListener(this._handleUnlinkFromProcessParameter);
    }

    public isDirty(): boolean {
        if (!this.isTaskDefinitionValid()) {
            // If the task definition is not present, 
            // short-circuit this method since invalid task definition should be tracked by store being invalid
            return false;
        }

        if (!this._currentTaskInstance || !this._originalTaskInstance === null) {
            return false;
        }
        else {
            return (!(
                (this._currentTaskInstance.displayName === this._originalTaskInstance.displayName) &&
                (this._currentTaskInstance.refName === this._originalTaskInstance.refName) &&
                (this._currentTaskInstance.alwaysRun === this._originalTaskInstance.alwaysRun) &&
                (this._currentTaskInstance.continueOnError === this._originalTaskInstance.continueOnError) &&
                (this._currentTaskInstance.enabled === this._originalTaskInstance.enabled) &&
                (this._currentTaskInstance.order === this._originalTaskInstance.order) &&
                (this._currentTaskInstance.timeoutInMinutes === this._originalTaskInstance.timeoutInMinutes) &&
                (this._currentTaskInstance.task.versionSpec === this._originalTaskInstance.task.versionSpec) &&
                (this._currentTaskInstance.condition === this._originalTaskInstance.condition) &&
                (!this._areTaskInputsDirty()) &&
                (!this._areTaskEnvironmentVariablesDirty()) &&
                (TaskStoreUtility.areTaskInstanceOverrideInputsEqual(this._currentTaskInstance, this._originalTaskInstance)))
            );
        }
    }

    public isDisabled(): boolean {
        const taskInstance = this.getTaskInstance();
        return taskInstance && !(taskInstance.enabled);
    }

    public isValid(): boolean {

        if (this.isDisabled()) {
            return true; // If the task is disabled, short-circuit this method since disabled task shouldn't play any role in validity
        }

        if (!this.isTaskDefinitionValid()) {
            return false; // If the task definition is not present, short-circuit this method since invalid task definition should make it invalid
        }

        let curName = this._currentTaskInstance ? this._currentTaskInstance.displayName : Utils_String.empty;
        if (!(curName && curName.trim())) {
            return false; // short-circuit if display name is empty invalid.
        }

        if (!this._hasValidControlOptions()) {
            return false; // short-circuit if control options are invalid.
        }

        if (!this._hasValidOutputVariableOptions()) {
            return false;
        }

        if (!this._hasValidEnvironmentVariables()) {
            return false;
        }

        // Check for validity of Inputs
        return this._hasValidInputs();
    }

    public isValidForCreatingTaskGroup(): boolean {
        let isValid: boolean = this.isValid();
        for (let key in this._inputToProcessParameterMap) {
            if (this._inputToProcessParameterMap.hasOwnProperty(key)) {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    public getProcessParameterToValueMap(): IDictionaryStringTo<string> {
        return this._processParameterToValueMap;
    }

    public getProcessParameterToInputsMap(): IDictionaryStringTo<string[]> {
        return this._processParamToInputsMap;
    }

    public getInputToValueMap(): IDictionaryStringTo<string> {
        return this.getTaskInstance().inputs;
    }

    public getInputToResolvedValueMap(): IDictionaryStringTo<string> {
        //  returns the inputName to process param value map if the input is linked to process parameter
        let inputToResolvedValueMap: IDictionaryStringTo<string> = {};
        let inputToValueMap = this.getInputToValueMap();

        Object.keys(inputToValueMap).forEach((input: string) => {
            inputToResolvedValueMap[input] = DtcUtils.resolveTaskInputValueByProcessParameters(inputToValueMap[input], this._processParameterToValueMap).resolvedValue;
        });

        return inputToResolvedValueMap;
    }

    public getTaskInstance(): ITask {
        return this._currentTaskInstance;
    }

    public getTaskPayload(): ITask {
        if (this.isMetaTask()) {
            // strip default values in case of meta task
            let returnValue: ITask = TaskStoreUtility.createTaskInstanceCopy(this._currentTaskInstance, this._taskDefinition);
            this._taskDefinition.inputs.forEach((input: TaskInputDefinition) => {
                let value = this._currentTaskInstance.inputs[input.name];
                if (input.defaultValue === value && !TaskUtils.VariableExtractor.containsVariable(value)) {
                    returnValue.inputs[input.name] = Utils_String.empty;
                }
            });
            return returnValue;
        }

        return this._currentTaskInstance;
    }

    public getClonedTaskInstance(): ITask {
        let cloneInstance = TaskStoreUtility.createTaskInstanceCopy(this._currentTaskInstance, this._taskDefinition);
        cloneInstance.displayName = Utils_String.format(Resources.CopyTaskDisplayNameFormat, cloneInstance.displayName);
        cloneInstance.refName = null;
        return cloneInstance;
    }

    public getTaskDefinition(): TaskDefinition {
        return this._taskDefinition;
    }

    public getTaskInputState(inputName: string): IInputBaseState {
        let resolvedValue: IResolvedTaskInputValue =
            DtcUtils.resolveTaskInputValueByProcessParameters(this.getTaskInstance().inputs[inputName], this._processParameterToValueMap);

        let taskInputValue: string = resolvedValue.resolvedValue;
        if (taskInputValue === undefined || taskInputValue === null  /* Empty string is also value */) {
            taskInputValue = this._getControlOptionsInputValue(inputName);
        }

        return {
            inputName: inputName,
            inputValue: taskInputValue,
            isHidden: () => {
                Diag.logVerbose("InputName: " + inputName);
                return this._taskInputDefinitionMap[inputName] ? !this.isVisible(this._taskInputDefinitionMap[inputName].visibleRule, this._dependencyToTargetMap, inputName) : false;
            },
            disabled: resolvedValue.isResolved,
            options: this._taskInputDefinitionMap[inputName] ? this._taskInputDefinitionMap[inputName].options : null
        } as IInputBaseState;
    }

    public getEnvironmentVariableState(): IEnvironmentVariableData[] {
        if (this._environmentVariableState == null) {
            this._environmentVariableState = [];
        }

        return this._environmentVariableState || [];
    }

    public getTaskInstanceId(): string {
        let instance = this.getTaskInstance();
        return instance ? instance.task.id : Utils_String.empty;
    }

    public getVisibility(): IDictionaryStringTo<boolean> {
        return this._taskInputVisibility;
    }

    public getTaskDisplayName(): string {
        let instance = this.getTaskInstance();
        return instance ? instance.displayName : Utils_String.empty;
    }

    public getTaskRefName(): string {
        let instance = this.getTaskInstance();
        return instance ? instance.refName : Utils_String.empty;
    }

    public getTaskVersion(): string {
        return this._currentTaskInstance.task.versionSpec;
    }

    public getTaskVersionDisplaySpec(): string {
        let isTaskPreview = TaskUtils.isPreview(this._taskDefinition);
        let versionSpec = this._currentTaskInstance ? this._currentTaskInstance.task.versionSpec : "";
        let taskVersionDisplaySpec = isTaskPreview ?
            Utils_String.format(Resources.Task_PreviewMajorVersionSpecFormat, versionSpec)
            : versionSpec;

        return taskVersionDisplaySpec;
    }

    public getTaskVersionSpec(taskVersionDisplaySpec: string): string {
        if (this._taskVersionSpecToInfo) {
            let taskVersionInfo = this._taskVersionSpecToInfo[taskVersionDisplaySpec];
            if (taskVersionInfo) {
                return taskVersionInfo.versionSpec;
            }
        }
        return null;
    }

    public getTaskVersionDisplaySpecs(): string[] {
        return this._taskVersionDisplaySpecs;
    }

    public getTaskItemOverviewState(): ITaskItemOverviewState {
        return {
            name: this.getTaskDisplayName(),
            refName: this.getTaskRefName(),
            isValid: this.isValid(),
            isDisabled: this.isDisabled(),
            isDefinitionValid: this.isTaskDefinitionValid(),
            isOnLatestMajorVersion: this.isTaskOnLatestMajorVersion(),
            isPreview: this.isPreview(),
            isTest: this.isTest(),
            isDeprecated: this.isDeprecated(),
            isDeleting: this.isDeleting()
        } as ITaskItemOverviewState;
    }

    /**
     * Warning: This is the only place where we are breaking the flux pattern by allowing task store to be updated outside of actions. 
     * We are doing this because there is no way to identify task instance based on id. 
     * 
     * This is an exception and should not be called from any other place than taskListStore
     */
    public updateTask(task: ITask): void {
        if (task) {
            this._updateCurrentAndOriginalTaskInstances(task);
        }
    }

    public getActionForInputField(inputName: string): ActionForTaskInput {

        if (this._taskContext.processParametersNotSupported) {
            //If input value is bounded to process parameter but process parameter is not supported, then just send navigate to variables tab
            if (this._inputToProcessParameterMap[inputName]) {
                return ActionForTaskInput.NavigateToVariablesTab;
            }
            else {
                return ActionForTaskInput.None;
            }
        }

        //Do not allow link/unlink for TaskGroups
        if (this.isMetaTask()) {
            return ActionForTaskInput.None;
        }

        // No action for control options.
        switch (inputName) {
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_AlwaysRun:
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ContinueOnError:
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_Enabled:
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_TimeOut:
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionSelector:
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionEditor:
                return ActionForTaskInput.None;
        }

        // If input value bounded to process parameter then unlink will be option else link.
        if (this._inputToProcessParameterMap[inputName]) {
            return ActionForTaskInput.UnlinkFromProcessParameter;
        }

        return ActionForTaskInput.LinkToProcessParameter;
    }

    public getProcessParameterName(inputname: string): string {
        return this._inputToProcessParameterMap[inputname];
    }

    public getInputNameToProcessParameterNameMap(): IDictionaryStringTo<string> {
        return this._inputToProcessParameterMap;
    }

    protected disposeInternal(): void {
        // remove listener for task definition updation
        this._actionCreator.updateTaskDefinitionAction.removeListener(this._updateTaskDefinition);

        // remove listeners for processParameter actions
        this._processParameterActions.updateInput.removeListener(this._handleUpdateProcessParameter);
        this._processParameterActions.createProcessParameter.removeListener(this._handleCreateProcessParameter);
        this._processParameterActions.removeAllProcessParameters.removeListener(this._handleRemoveAllProcessParameters);

        // remove listeners for task actions
        this._actionCreator.updateTaskInputErrorAction.removeListener(this._handleUpdateTaskInputError);
        this._actionCreator.updateTaskInputValueAction.removeListener(this._handleUpdateTaskInputValue);
        this._actionCreator.renameTaskAction.removeListener(this._handleRenameTaskAction);
        this._actionCreator.updateTaskRefNameAction.removeListener(this._handleUpdateTaskRefNameAction);
        this._actionCreator.updateTaskStateAction.removeListener(this._handleUpdateTaskStateAction);
        this._actionCreator.linkToProcessParameterAction.removeListener(this._handleLinkToProcessParameter);
        this._actionCreator.unlinkFromProcessParameterAction.removeListener(this._handleUnlinkFromProcessParameter);
        this._actionCreator.updateTaskInputOptionsAction.removeListener(this._handleUpdateTaskInputOptionsAction);
        this._actionCreator.addTaskEnvironmentVariableAction.removeListener(this._handleAddEnvironmentVariable);
        this._actionCreator.updateTaskEnvironmentVariableNameAction.removeListener(this._handleUpdateEnvironmentVariableName);
        this._actionCreator.updateTaskEnvironmentVariableValueAction.removeListener(this._handleUpdateEnvironmentVariableValue);
        this._actionCreator.deleteTaskEnvironmentVariableAction.removeListener(this._handleDeleteEnvironmentVariable);
        this._actionCreator.markTaskAsDeletingAction.removeListener(this._handleMarkTaskAsDeleting);

        // clear the private variables
        this._currentTaskInstance = null;
        this._originalTaskInstance = null;
        this._actionCreator = null;
        this._processParameterToValueMap = null;
        this._taskInputDefinitionMap = null;
        this._inputsUsedForComputation = {};

        super.disposeInternal();
    }

    public getSourceDefinitions(): TaskSourceDefinition[] {
        return this.getTaskDefinition().sourceDefinitions;
    }

    public getDataSourceBindings(): DataSourceBinding[] {
        return this.getTaskDefinition().dataSourceBindings;
    }

    public getTaskDefinitionId(input: TaskInputDefinition): string {
        return this.getTaskDefinition().id;
    }

    public getTaskInputDefinitionMap(): IDictionaryStringTo<TaskInputDefinition> {
        return this._taskInputDefinitionMap;
    }

    public isDeprecated(): boolean {
        return this._isDeprecated;
    }

    public isPreview(): boolean {
        return this._taskDefinition && this._taskDefinition.preview;
    }

    public isTest(): boolean {
        return this._taskDefinition && this._taskDefinition.version && this._taskDefinition.version.isTest;
    }

    public isTaskOnLatestMajorVersion(): boolean {
        if (this._taskDefinition && this._taskDefinition.version) {
            return (this._taskDefinition.version.major === this._latestMajorTaskVersion);
        }
        return true;
    }

    public isGroupOrInputVisible(visibleRule: string, inputName?: string): boolean {
        return this.isVisible(visibleRule, this._dependencyToTargetMap, inputName);
    }

    public getLatestMajorTaskVersionReleaseNotes(): string {
        return this._latestMajorTaskVersionReleaseNotes;
    }

    public getLatestMajorTaskVersionDisplaySpec(): string {
        return this._latestMajorTaskVersionDisplaySpec;
    }

    public isMetaTask(): boolean {
        return (!!this._taskDefinition && this._taskDefinition.definitionType === DefinitionType.metaTask);
    }

    public isTaskDefinitionValid(): boolean {
        return (!!this._taskDefinition && !!this._taskDefinition.id);
    }

    public getProcessParameterNameToReferenceCount(): IProcessParameterReferenceData[] {
        const procParamsToInputsMap = this.getProcessParameterToInputsMap();
        let procParamNameToRefCount: IProcessParameterReferenceData[] = [];

        //Creating a ref data object[]: [procParamName, reference count]
        Object.keys(procParamsToInputsMap).forEach((procParamName: string) => {
            procParamNameToRefCount.push({
                processParameterName: procParamName,
                referenceCount: procParamsToInputsMap[procParamName].length
            });
        });

        return procParamNameToRefCount;
    }

    public getInputState(inputDefn: TaskInputDefinition, value: string): Common.InputState {
        let resolvedValue: IResolvedTaskInputValue =
            DtcUtils.resolveTaskInputValueByProcessParameters(this.getTaskInstance().inputs[inputDefn.name], this._processParameterToValueMap);
        let effectiveValue = resolvedValue.isResolved ? resolvedValue.resolvedValue : value;

        let inputState = super.getInputState(inputDefn, effectiveValue);
        if (inputState === Common.InputState.Valid && !this._inputValidation.isValid(inputDefn.name)) {
            inputState = Common.InputState.Invalid;
        }

        return inputState;
    }

    public isVisibilityChanged(): boolean {
        return this._isVisibilityChanged;
    }

    public getTaskTimeoutInMinutes(): number {
        const taskInstance = this.getTaskInstance();
        const timeoutInMinutes = this.getTaskInstance().overrideInputs && this.getTaskInstance().overrideInputs[Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes];
        if (timeoutInMinutes) {
            return DtcUtils.getInteger(timeoutInMinutes);
        }
        else {
            return this.getTaskInstance().timeoutInMinutes;
        }
    }

    public getEnvironmentVariableNameInvalidErrorMessage(name: string): string {
        if (!!name) {
            if (name.trim() === Utils_String.empty) {
                return Resources.EnvironmentVariableNameEmptyErrorTooltip;
            }
            else if (/\s/g.test(name.trim())) {
                return Resources.EnvironmentVariableNameSpaceErrorTooltip;
            }
            return Utils_String.empty;
        }
        return Resources.EnvironmentVariableNameEmptyErrorTooltip;
    }

    public getEnvironmentVariableValueInvalidErrorMessage(value: string): string {
        if (!!value) {
            if (value.trim() === Utils_String.empty) {
                return Resources.EnvironmentVariableValueEmptyErrorTooltip;
            }
            return Utils_String.empty;
        }
        return Resources.EnvironmentVariableValueEmptyErrorTooltip;
    }

    private _areTaskInputsDirty(): boolean {
        if (Object.keys(this._currentTaskInstance.inputs).length !== Object.keys(this._originalTaskInstance.inputs).length) {
            return true;
        }

        for (let key in this._currentTaskInstance.inputs) {
            if (!this._isInputHidden(key) &&
                this._currentTaskInstance.inputs[key] !== this._originalTaskInstance.inputs[key]) {
                return true;
            }
        }

        return false;
    }

    private _areTaskEnvironmentVariablesDirty(): boolean {
        if (this._currentTaskInstance.environment == null && this._originalTaskInstance.environment == null) {
            return false;
        }

        if ((this._currentTaskInstance.environment != null && this._originalTaskInstance.environment == null) ||
            (this._currentTaskInstance.environment == null && this._originalTaskInstance.environment != null)) {
            return true;
        }

        if (Object.keys(this._currentTaskInstance.environment).length !== Object.keys(this._originalTaskInstance.environment).length) {
            return true;
        }

        for (let key in this._currentTaskInstance.environment) {
            if (this._currentTaskInstance.environment[key] !== this._originalTaskInstance.environment[key]) {
                return true;
            }
        }

        return false;
    }

    private _isInputHidden(inputName: string): boolean {
        let isHidden: boolean = false;
        let taskInputState = this.getTaskInputState(inputName);
        if (taskInputState) {
            isHidden = taskInputState.isHidden ? taskInputState.isHidden() : false;
        }
        return isHidden;
    }


    private _isGroupVisible(groupName: string): boolean {

        if (this._taskInputVisibility.hasOwnProperty(groupName)) {
            return this._taskInputVisibility[groupName];
        }

        return true;
    }

    private _setInputDefinitionMap() {
        this._taskInputDefinitionMap = {};
        this._taskDefinition.inputs.forEach((input) => {
            this._taskInputDefinitionMap[input.name] = DtcUtils.createInputDefinitionCopy(input);
        });
    }

    private _setVisibility() {
        this._taskInputVisibility = {};
        this._updateVisbility();
    }

    private _updateTaskDefinition = (taskDefinition: TaskDefinition) => {
        TaskStoreUtility.mergeInputOptions(taskDefinition, this._taskInputDefinitionMap);
        this._taskDefinition = taskDefinition;
        this._setInputDefinitionMap();
        this._updateTaskInputsFromDefinition(true);
        this._dependencyToTargetMap = DataSourceBindingUtility.getDependencyToTargetsMap(this.getTaskInstance().inputs, this.getDataSourceBindings(), this.getSourceDefinitions());
        this.emitChanged();
    }

    private _updateTaskInputsFromDefinition(retainOriginalState: boolean = false): void {
        // retainOriginalState: this function is used for both updating task definitions
        // and version update. The former should update both current and original state
        // the latter should retain the original state and only update the current one.
        if (!!this._currentTaskInstance && !!this._originalTaskInstance && !!this._taskDefinition && !!this._taskDefinition.inputs) {

            let updatedCurrentInputs: IDictionaryStringTo<string> = {};
            let updatedOriginalInputs: IDictionaryStringTo<string> = {};
            // On task definition update: get new list of inputs from task definition, 
            // carry fwd filled value, else take values from input definition defaults.
            this._taskDefinition.inputs.forEach((input: TaskInputDefinition) => {
                if (this._currentTaskInstance.inputs[input.name] === undefined
                    || (this._taskDefinition.definitionType === DefinitionType.metaTask
                        && this._currentTaskInstance.inputs[input.name] === Utils_String.empty)) {
                    updatedCurrentInputs[input.name] = input.defaultValue;
                    updatedOriginalInputs[input.name] = input.defaultValue;
                } else {
                    updatedCurrentInputs[input.name] = this._currentTaskInstance.inputs[input.name];
                    updatedOriginalInputs[input.name] = this._originalTaskInstance.inputs[input.name];
                }

                if (Utils_String.equals(input.type, InputControlType.INPUT_TYPE_BOOLEAN, true)) {
                    if (!updatedCurrentInputs[input.name]) {
                        if (!input.defaultValue) {
                            updatedCurrentInputs[input.name] = Boolean.falseString;
                            updatedOriginalInputs[input.name] = Boolean.falseString;
                        }
                        else {
                            updatedCurrentInputs[input.name] = input.defaultValue;
                            updatedOriginalInputs[input.name] = input.defaultValue;
                        }
                    }
                }
            });

            this._currentTaskInstance.inputs = updatedCurrentInputs;
            this._originalTaskInstance.inputs = !!retainOriginalState ? this._originalTaskInstance.inputs : updatedOriginalInputs;
            this._currentTaskInstance.task.versionSpec = this._getMajorVersionString(this._taskDefinition.version);
            this._initializeInstanceName(this._currentTaskInstance);
        }
    }

    private _updateProcessParametersValueMap(params: ProcessParameters): void {
        if (!!params && !!params.inputs) {
            this._processParameterToValueMap = {};
            params.inputs.forEach((input: TaskInputDefinition) => {
                let inputNameKey = input.name.toLowerCase();
                this._processParameterToValueMap[inputNameKey] = input.defaultValue;
            });
        }
    }

    private _createTaskInputToProcessParameterNameMap(taskInstance: ITask, processParameterToValueMap: IDictionaryStringTo<string>): void {

        if (taskInstance.inputs) {

            for (let inputName in taskInstance.inputs) {
                if (taskInstance.inputs.hasOwnProperty(inputName)) {
                    let resolveEntry = DtcUtils.resolveTaskInputValueByProcessParameters(taskInstance.inputs[inputName], processParameterToValueMap);
                    if (resolveEntry.isResolved) {

                        let boundProcessParameterName = resolveEntry.boundProcessParameterName;

                        let boundProcessParameterNameKey = boundProcessParameterName.toLowerCase();
                        this._inputToProcessParameterMap[inputName] = boundProcessParameterName;
                        if (!this._processParamToInputsMap[boundProcessParameterNameKey]) {
                            this._processParamToInputsMap[boundProcessParameterNameKey] = [];
                        }
                        this._processParamToInputsMap[boundProcessParameterNameKey].push(inputName);
                    }
                }
            }
        }
    }

    private _updateProcessParameterInput(updatedInput: ITaskInputValue): void {
        if (!!this._processParameterToValueMap) {

            let updatedInputNameKey = updatedInput.name.toLowerCase();
            this._processParameterToValueMap[updatedInputNameKey] = updatedInput.value;

            if (this._processParamToInputsMap.hasOwnProperty(updatedInputNameKey)) {

                this._processParamToInputsMap[updatedInputNameKey].forEach((inputName: string) => {

                    this._removeInputOptionsIfRequired(inputName);
                });

            }

            if (this._processParamToInputsMap[updatedInputNameKey] && this._computeInstanceName) {

                // For each input that is bound to the process parameter and is used in instance name format, 
                this._processParamToInputsMap[updatedInputNameKey].forEach((mappedInput: string) => {

                    if (this._inputsUsedForComputation[mappedInput]) {

                        this._currentTaskInstance.displayName = this._getComputedInstanceNameAndInputName(this._currentTaskInstance).computedName;

                        // A single computation will replace all input references. So it is okay to break out of this loop.
                        return;
                    }
                });
            }
        }
    }

    private _getControlOptionsInputValue(inputName: string): string {
        let returnValue: string;

        switch (inputName) {
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_AlwaysRun:
                returnValue = this.getTaskInstance().alwaysRun.toString();
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ContinueOnError:
                returnValue = this.getTaskInstance().continueOnError.toString();
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_Enabled:
                returnValue = this.getTaskInstance().enabled.toString();
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_TimeOut:
                let overrideTimeoutValue = this._getOverrideTimeoutValue();
                // if timeout value presents in override input return override input value else return taskInstance.timeoutInMinutes value.
                if (overrideTimeoutValue) {
                    returnValue = overrideTimeoutValue;
                }
                else {
                    let defaultTimeout = (this.getTaskInstance().timeoutInMinutes !== null && this.getTaskInstance().timeoutInMinutes !== undefined) ?
                        this.getTaskInstance().timeoutInMinutes.toString() : Utils_String.empty;
                    returnValue = (!!this._timeOutStringValue) ? this._timeOutStringValue : defaultTimeout;
                }
                break;
            // ConditionSelector and ConditionEditor are part of the same control
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionSelector:
                if (!this._taskInputDefinitionMap[inputName]) {
                    this._taskInputDefinitionMap[inputName] = DtcUtils.getRunThisTaskInputDefinition();
                }
                returnValue = DtcUtils.getTaskConditionOptions().some((option: string) => {
                    return option === this.getTaskInstance().condition;
                }) ? this.getTaskInstance().condition : Utils_String.empty;
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionEditor:
                if (!this._taskInputDefinitionMap[inputName]) {
                    this._taskInputDefinitionMap[inputName] = DtcUtils.getCustomConditionInputDefinition();
                }
                returnValue = this.getTaskInstance().condition || Utils_String.empty;
                break;
        }

        return returnValue;
    }

    private _getOverrideTimeoutValue(): string {
        if (this.getTaskInstance().overrideInputs && this.getTaskInstance().overrideInputs.hasOwnProperty(Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes)) {
            return this.getTaskInstance().overrideInputs[Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes];
        }

        return Utils_String.empty;
    }

    private _hasValidControlOptions(): boolean {
        // If override inputs has timeout value, check override input timeout value has valid variable or valid number.
        // If override input does not have timeout value, check taskInstance.timeoutInMinutes value is valid.
        let isValid = true;
        let overrideTimeoutValue = this._getOverrideTimeoutValue();
        if (overrideTimeoutValue) {
            if (DtcUtils.isValueInVariableFormat(overrideTimeoutValue)
                || DtcUtils.isValidNonNegativeIntegerInRange(overrideTimeoutValue, 0, Common.MaxPositiveNumber, true) === Common.InputState.Valid) {
                isValid = true;
            }
            else {
                isValid = false;
            }
        }
        else {
            let timeout = this.getTaskInstance().timeoutInMinutes;
            if (timeout !== null && DtcUtils.isNumberInRange(timeout, 0, Common.MaxPositiveNumber)) {
                isValid = true;
            }
            else {
                isValid = false;
            }
        }

        if (isValid) {
            isValid = this._inputValidation.isValid(Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionEditor);
        }

        return isValid;
    }

    private _hasValidOutputVariableOptions(): boolean {
        if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_TaskShowOutputVariables, false) &&
            FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_TaskValidateOutputVariables, false)) {
            const refNameValue = this.getTaskRefName();
            return (!refNameValue || DtcUtils.isValidRefName(refNameValue));
        }
        else {
            return true;
        }
    }

    private _hasValidInputs(): boolean {
        let isValid: boolean = true;

        if (!!this._currentTaskInstance.inputs) {

            for (let inputName in this._currentTaskInstance.inputs) {
                if (this._currentTaskInstance.inputs.hasOwnProperty(inputName)) {
                    let inputValue = this._currentTaskInstance.inputs[inputName];
                    let inputDefinition = this._taskInputDefinitionMap[inputName];

                    if (inputDefinition && this.isVisible(inputDefinition.visibleRule, this._dependencyToTargetMap, inputName) && this._isGroupVisible(inputDefinition.groupName)
                        && this.getInputState(inputDefinition, inputValue) !== Common.InputState.Valid) {
                        isValid = false;
                        break;
                    }
                }
            }
        }

        return isValid;
    }

    private _hasValidEnvironmentVariables(): boolean {
        let isValid: boolean = true;

        if (!!this._environmentVariableState) {
            for (let envVar of this._environmentVariableState) {
                if (!!this.getEnvironmentVariableNameInvalidErrorMessage(envVar.name) ||
                    !!this.getEnvironmentVariableValueInvalidErrorMessage(envVar.value)) {
                    isValid = false;
                    break;
                }
            }
        }

        return isValid;
    }

    private _updateEnvironmentVariableState(): void {
        this._environmentVariableState = [];

        if (!!this._currentTaskInstance.environment) {
            for (let envVarName in this._currentTaskInstance.environment) {
                this._environmentVariableState.push({
                    name: envVarName,
                    value: this._currentTaskInstance.environment[envVarName]
                } as IEnvironmentVariableData);
            }
        }
    }

    private _updateTaskInstanceEnvironmentVariables(): void {
        this.getTaskInstance().environment = {};

        if (!!this._environmentVariableState){
            this._environmentVariableState.forEach((environmentVariable: IEnvironmentVariableData) => {
                this.getTaskInstance().environment[environmentVariable.name.trim()] = environmentVariable.value.trim();
            });
        }
    }

    private _updateCurrentAndOriginalTaskInstances(taskInstance: ITask): void {
        this._initializeInstanceName(taskInstance);
        this._currentTaskInstance = TaskStoreUtility.createTaskInstanceCopy(taskInstance, this._taskDefinition);
        this._originalTaskInstance = TaskStoreUtility.createTaskInstanceCopy(taskInstance, this._taskDefinition);
        this._updateTaskInputsFromDefinition();
        this._updateTaskVersion();
        this._updateEnvironmentVariableState();
    }

    private _updateTaskVersion(): void {
        // this is needed because when upgrading from TFS 2017 RTM to TFS 2018
        // we are getting some meta task with version as *. We expect the minimum version of task to be 1.*
        // as a result we started seeing diff in _currentTaskInstance versionSpec with _originalTaskInstance version spec
        // since we modify the versionSpec of _currentTaskInstance in _updateTaskInputsFromDefinition method.
        // this will update the version spec of both _currentTaskInstance & _originalTaskInstance to the latest.
        if (this._currentTaskInstance) {
            this._currentTaskInstance.task.versionSpec = this._getMajorVersionString(this._taskDefinition.version);
        }
        if (this._originalTaskInstance) {
            this._originalTaskInstance.task.versionSpec = this._getMajorVersionString(this._taskDefinition.version);
        }
    }

    private _initializeInstanceName(taskInstance: ITask): void {

        if (taskInstance) {
            let computedNameAndInputName = this._getComputedInstanceNameAndInputName(taskInstance);
            computedNameAndInputName.inputsUsedForComputation.forEach((inputName: string) => {
                this._inputsUsedForComputation[inputName] = true;
            });

            if (!taskInstance.displayName || computedNameAndInputName.computedName === taskInstance.displayName) {

                // If display name is not set (for new definition) or display name is same as computed name (which means the user did not change the display name that was computed),
                // we need to keep on computing instance name. 
                this._computeInstanceName = true;
                taskInstance.displayName = computedNameAndInputName.computedName;
            }
        }
    }

    private _getComputedInstanceNameAndInputName(taskInstance: ITask): { computedName: string, inputsUsedForComputation: string[] } {
        let inputsUsedForComputation: string[] = [];
        let computedName = Utils_String.empty;

        // Functionality of InstanceNameFormat is governed under feature flag. This is to be evaluated in MVP summit.
        if (this._taskDefinition.instanceNameFormat) {

            computedName = this._taskDefinition.instanceNameFormat.replace(this._instanceNameFormatRegex, (substring: string, inputName: string) => {

                inputsUsedForComputation.push(inputName);
                let value = Utils_String.empty;


                if (taskInstance.inputs) {
                    let boundProcessParameter = this._inputToProcessParameterMap[inputName];
                    if (boundProcessParameter) {
                        // If input is bound to process parameter, then use the value of the bound process parameter.
                        value = this._processParameterToValueMap[boundProcessParameter.toLowerCase()];
                    } else {
                        value = taskInstance.inputs[inputName];
                    }
                }

                if (!value) {
                    let input = this._taskInputDefinitionMap[inputName];
                    if (input) {
                        value = input.defaultValue;
                    }
                }

                return value || Utils_String.empty;
            });
        }

        if (!computedName) {
            computedName = this._taskDefinition.friendlyName;
        }

        return {
            // Fix for bug#868604 - Replaced all new line, line feed and tab space with single space
            // Thus preventing error on server and match task display name semantics.
            computedName: computedName.replace(RegexConstants.TaskNameRegex, " "),
            inputsUsedForComputation: inputsUsedForComputation
        };
    }

    private _handleRenameTaskAction = (newName: string) => {
        if (newName !== this._currentTaskInstance.displayName) {

            this._currentTaskInstance.displayName = newName;
            if (newName !== this._getComputedInstanceNameAndInputName(this._currentTaskInstance).computedName) {
                this._computeInstanceName = false;
            }

            this.emitChanged();
        }
    }

    private _handleUpdateTaskRefNameAction = (newRefName: string) => {
        if (newRefName !== this._currentTaskInstance.refName) {
            this._currentTaskInstance.refName = newRefName;
            this.emitChanged();
        }
    }

    private _handleUpdateTaskStateAction = (enabled: boolean) => {
        const newValue: boolean = !!enabled;
        const oldValue: boolean = !!this._currentTaskInstance.enabled;
        if (newValue !== oldValue) {
            this._currentTaskInstance.enabled = newValue;
            this.emitChanged();
        }
    }

    private _handleUpdateTaskInputValue = (payload: ITaskInputValue) => {
        this._inputValidation.updateInputValue(payload.name, payload.value);

        switch (payload.name) {
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_AlwaysRun:
                this.getTaskInstance().alwaysRun = (Utils_String.ignoreCaseComparer(payload.value, "true") === 0);
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ContinueOnError:
                this.getTaskInstance().continueOnError = (Utils_String.ignoreCaseComparer(payload.value, "true") === 0);
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_Enabled:
                this.getTaskInstance().enabled = (Utils_String.ignoreCaseComparer(payload.value, "true") === 0);
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_TimeOut:
                this._timeOutStringValue = payload.value;
                let timeout = this._getTimeOut(payload.value);
                // Update overrideInput timeout value based on user input.
                // if user input is variable then add timeout value in overrideInputs, else
                // assign timeout to taskInstance.timeoutInMinutes and delete value from override Input.

                if (timeout === null && this._timeOutStringValue) {  // timeout null means Input is variable
                    this.getTaskInstance().overrideInputs[Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes] = this._timeOutStringValue;
                    this.getTaskInstance().timeoutInMinutes = this._originalTaskInstance.timeoutInMinutes;
                }
                else { // Input is number
                    this.getTaskInstance().timeoutInMinutes = timeout;
                    delete this.getTaskInstance().overrideInputs[Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes];
                }
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionEditor:
                this.getTaskInstance().condition = payload.value;
                break;
            case Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionSelector:
                this.getTaskInstance().condition = payload.value;
                //if this is selector, we have to make sure we clear editor
                this._inputValidation.clear(Common.TaskControlOptionsConstants.ControlOptionsInputName_ConditionEditor);
                break;
            default:
                this.getTaskInstance().inputs[payload.name] = payload.value;
                break;
        }

        if (this._inputsUsedForComputation[payload.name] && this._computeInstanceName) {
            this._currentTaskInstance.displayName = this._getComputedInstanceNameAndInputName(this._currentTaskInstance).computedName;
        }

        this._checkVisibilitychanged();

        this._removeInputOptionsIfRequired(payload.name);

        this._inputValidation.tryHandlePendingInputErrorDispatch(payload.name, payload.value);

        this.emitChanged();
    }

    private _handleUpdateTaskInputError = (payload: ITaskInputError) => {
        if (this._inputValidation.tryHandleUpdateInputError(payload)) {
            this.emitChanged();
        }
    }

    private _getTimeOut(payloadValue: string): number {
        let value: number = DtcUtils.isValidNonNegativeIntegerInRange(payloadValue, 0, Common.MaxPositiveNumber, true) === Common.InputState.Valid
            ? DtcUtils.getInteger(payloadValue) : null;
        return value;
    }

    private _handleUpdateTaskInputOptionsAction = (taskInputOptions: ITaskInputOptions) => {
        let inputDefinition = this._taskInputDefinitionMap && this._taskInputDefinitionMap[taskInputOptions.name];
        if (inputDefinition) {
            inputDefinition.options = taskInputOptions.options;
        }

        this._checkVisibilitychanged();

        this.emitChanged();
    }

    private _handleAddEnvironmentVariable = (): void => {
        if (this._environmentVariableState == null) {
            this._environmentVariableState = [];
        }

        this._environmentVariableState.push({
            name: Utils_String.empty,
            value: Utils_String.empty
        } as IEnvironmentVariableData);

        this.emitChanged();
    }

    private _handleUpdateEnvironmentVariableName = (payload: IEnvironmentVariableNamePayload): void => {
        if (payload.name !== undefined && payload.name !== null) {
            this._environmentVariableState[payload.index].name = payload.name;
            this._updateTaskInstanceEnvironmentVariables();
            this.emitChanged();
        }
    }

    private _handleUpdateEnvironmentVariableValue = (payload: IEnvironmentVariableValuePayload): void => {
        if (payload.value !== undefined && payload.value !== null) {
            this._environmentVariableState[payload.index].value = payload.value;
            this._updateTaskInstanceEnvironmentVariables();
            this.emitChanged();
        }
    }

    private _handleDeleteEnvironmentVariable = (payload: IEnvironmentVariableNamePayload): void => {
        this._environmentVariableState.splice(payload.index, 1);
        this._updateTaskInstanceEnvironmentVariables();
        this.emitChanged();
    }

    private _handleCreateProcessParameter = (processParameter: ICreateProcessParameterPayload) => {

        if (processParameter && processParameter.input) {
            if (!this._processParameterToValueMap.hasOwnProperty(processParameter.input.name.toLowerCase())) {
                this._processParameterToValueMap[processParameter.input.name.toLowerCase()] = processParameter.input.defaultValue;
            }
        }
    }

    private _handleUpdateProcessParameter = (input: ITaskInputValue) => {
        this._updateProcessParameterInput(input);
        this.emitChanged();
    }

    private _handleLinkToProcessParameter = (linkedPayload: ILinkToProcessParameterPayload) => {

        let processParameterBoundValue: string = Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterBoundInputValueFormat,
            linkedPayload.processParametername);

        if (this._currentTaskInstance.inputs) {
            this._currentTaskInstance.inputs[linkedPayload.inputName] = processParameterBoundValue;

            // Link other mappings.
            this._inputToProcessParameterMap[linkedPayload.inputName] = linkedPayload.processParametername;

            let linkedProcessParameterNameKey = linkedPayload.processParametername.toLowerCase();
            if (this._processParamToInputsMap[linkedProcessParameterNameKey]) {
                this._processParamToInputsMap[linkedProcessParameterNameKey].push(linkedPayload.inputName);
            } else {
                this._processParamToInputsMap[linkedProcessParameterNameKey] = [linkedPayload.inputName];
            }
        }

        this.emitChanged();
    }

    private _unlinkFromProcessParameter(inputName: string): void {
        let boundProcessParameter = this._inputToProcessParameterMap[inputName];
        if (boundProcessParameter) {

            // Updating task input value with process parameter value.
            let procParamNameKey = boundProcessParameter.toLowerCase();
            let newInputValue: string = this._processParameterToValueMap[procParamNameKey];
            if (this._currentTaskInstance.inputs) {
                let defaultValue = this._taskInputDefinitionMap[inputName]
                    ? this._taskInputDefinitionMap[inputName].defaultValue
                    : Utils_String.empty;
                this._currentTaskInstance.inputs[inputName] = newInputValue ? newInputValue : defaultValue;
            }

            // Remove process parameter to input mapping.
            delete this._inputToProcessParameterMap[inputName];

            if (this._processParamToInputsMap[procParamNameKey] && this._processParamToInputsMap[procParamNameKey].length > 0) {
                Utils_Array.remove(this._processParamToInputsMap[procParamNameKey], inputName);

                if (this._processParamToInputsMap[procParamNameKey].length === 0) {
                    delete this._processParamToInputsMap[procParamNameKey];
                    delete this._processParameterToValueMap[procParamNameKey];
                }
            }
        }
    }

    private _handleUnlinkFromProcessParameter = (inputName: string) => {
        this._unlinkFromProcessParameter(inputName);
        this.emitChanged();
    }

    private _handleRemoveAllProcessParameters = () => {
        if (this._inputToProcessParameterMap) {
            Object.keys(this._inputToProcessParameterMap).forEach((inputName: string) => {
                this._unlinkFromProcessParameter(inputName);
            });
        }
        this.emitChanged();
    }

    private _removeInputOptionsIfRequired(inputName: string) {

        if (this._dependencyToTargetMap.hasOwnProperty(inputName)) {

            // only pickList inputs have sourceBinding and dataSourceBinding, if there are no options for a picklist with dynamic source
            // we make a fresh call to get the latest options
            this._dependencyToTargetMap[inputName].forEach((target: string) => {
                let inputDefinition = this._taskInputDefinitionMap[target];
                if (inputDefinition) {
                    inputDefinition.options = null;

                    // Invalidate values for dependent pick list which are not set to variables.
                    if (!TaskUtils.VariableExtractor.containsVariable(this.getTaskInstance().inputs[inputDefinition.name])) {
                        this.getTaskInstance().inputs[inputDefinition.name] = inputDefinition.defaultValue;
                    }
                }
            });
        }
    }

    private _setTaskVersionList(taskVersionInfoList: ITaskVersionInfo[]): void {
        this._taskVersionDisplaySpecs = [];
        this._taskVersionSpecToInfo = {};
        this._latestMajorTaskVersion = -1;
        this._latestMajorTaskVersionDisplaySpec = Utils_String.empty;
        this._latestMajorTaskVersionReleaseNotes = Utils_String.empty;

        if (taskVersionInfoList) {
            Object.keys(taskVersionInfoList).forEach(key => {
                const taskVersionInfo = taskVersionInfoList[key] as ITaskVersionInfo;
                if (taskVersionInfo) {
                    let taskMajorVersion = TaskUtils.getMajorVersion(taskVersionInfo.versionSpec);
                    let taskVersionDisplaySpec = taskVersionInfo.isPreview ?
                        Utils_String.format(Resources.Task_PreviewMajorVersionSpecFormat, taskVersionInfo.versionSpec)
                        : taskVersionInfo.versionSpec;

                    this._taskVersionDisplaySpecs.push(taskVersionDisplaySpec);
                    this._taskVersionSpecToInfo[taskVersionDisplaySpec] = taskVersionInfo;
                    if (this._latestMajorTaskVersion < taskMajorVersion) {
                        this._latestMajorTaskVersion = taskMajorVersion;
                        this._latestMajorTaskVersionDisplaySpec = taskVersionDisplaySpec;

                        const latestTaskDefinition = TaskDefinitionSource.instance().getTaskDefinition(
                            this._taskDefinition.id,
                            this._latestMajorTaskVersion.toString() || "*");

                        if (latestTaskDefinition) {
                            this._latestMajorTaskVersionReleaseNotes = latestTaskDefinition.releaseNotes;
                        }

                        this._isDeprecated = taskVersionInfo.isDeprecated;
                    }
                }
            });
        }

        // We want list of versions sorted in descending order.
        this._taskVersionDisplaySpecs.reverse();
    }

    private _getMajorVersionString(taskVersion: TaskVersion): string {
        if (taskVersion) {
            return TaskUtils.getMajorVersionSpec(taskVersion);
        }
        return "*";
    }

    private _checkVisibilitychanged() {
        this._isVisibilityChanged = false;

        // Check if visibility of any input is changed
        if (this._taskDefinition && this._taskDefinition.inputs) {
            this._taskDefinition.inputs.forEach((input) => {
                if (this._taskInputVisibility[input.name] !== this.isVisible(input.visibleRule, this._dependencyToTargetMap, input.name)) {
                    this._isVisibilityChanged = true;
                }
            });
        }

        // Check if visibility of any group is changed
        if (!this._isVisibilityChanged && this._taskDefinition && this._taskDefinition.groups) {
            this._taskDefinition.groups.forEach((group) => {
                if (this._taskInputVisibility[group.name] !== this.isVisible(group.visibleRule, this._dependencyToTargetMap)) {
                    this._isVisibilityChanged = true;
                }
            });
        }

        this._updateVisbility();
    }

    // Updates the visibility for task inputs and groups
    private _updateVisbility() {

        if (this._taskDefinition && this._taskDefinition.inputs) {
            this._taskDefinition.inputs.forEach((input) => {
                this._taskInputVisibility[input.name] = !!this.isVisible(input.visibleRule, this._dependencyToTargetMap, input.name);
            });
        }

        if (this._taskDefinition && this._taskDefinition.groups) {
            this._taskDefinition.groups.forEach((group) => {
                this._taskInputVisibility[group.name] = !!this.isVisible(group.visibleRule, this._dependencyToTargetMap);
            });
        }
    }

    private isDeleting(): boolean {
        return this._isDeleting;
    }

    private _handleMarkTaskAsDeleting = () => {
        this._isDeleting = true;
        this.emitChanged();
    }



    private _taskInstance: ITask;
    private _taskDefinition: TaskDefinition;
    private _taskVersionDisplaySpecs: string[];
    private _taskVersionSpecToInfo: IDictionaryStringTo<ITaskVersionInfo>;
    private _latestMajorTaskVersion: number;
    private _latestMajorTaskVersionDisplaySpec: string;
    private _latestMajorTaskVersionReleaseNotes: string;
    private _currentTaskInstance: ITask;
    private _originalTaskInstance: ITask;
    private _actionCreator: TaskActionCreator;
    private _processParameterToValueMap: IDictionaryStringTo<string>;
    private _taskInputDefinitionMap: IDictionaryStringTo<TaskInputDefinition>;
    private _instanceNameFormatRegex: RegExp = /\$\((.+?)\)/g;
    private _timeOutStringValue: string;
    private _taskInputVisibility: IDictionaryStringTo<boolean>;
    private _isVisibilityChanged: boolean = false;
    private _processParameterStore: ProcessParameterStore;
    private _taskInputValidationInvalidStates: IDictionaryStringTo<boolean>;
    private _environmentVariableState: IEnvironmentVariableData[];

    // We consider a task as deprecated if the major version is marked as deprecated, irrespective of what version is currently being used
    private _isDeprecated: boolean = false;

    // Indicates if display name should be computed using instance name format. 
    // If the user modifies the display name so that it does not match the instance name format
    // (after resolution), then display name need not be computed based on input value.
    private _computeInstanceName: boolean;

    // Tracks inputs that are used for computation of display name.
    private _inputsUsedForComputation: IDictionaryStringTo<boolean> = {};

    // Contains mapping between input name to the process parameter to which it is bound
    // This is used to get the value of updated process parameter to compute the display name.
    private _inputToProcessParameterMap: IDictionaryStringTo<string> = {};

    // Contains mapping between process parameters and the inputs that are bound to each process parameter.
    // This is used to determine if change in the process parameter value should modify the display name of tasks
    // when instance format is bound to input which in turn is bound to process parameter.
    private _processParamToInputsMap: IDictionaryStringTo<string[]> = {};

    private _processParameterActions: ProcessParameterActions;

    // [dependency_input] : [ List of inputs which are dependent on dependency_input ]
    private _dependencyToTargetMap: IDictionaryStringTo<string[]>;

    private _pendingTaskInputErrorPayloadDispatch: IDictionaryStringTo<ITaskInputError> = {};
    private _inputValidation: InputValidation = new InputValidation();

    private _isDeleting: boolean = false;
}

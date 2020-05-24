import { ProcessParameterActions } from "DistributedTaskControls/Actions/ProcessParameterActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { InputState } from "DistributedTaskControls/Common/Common";
import * as Common from "DistributedTaskControls/Common/Common";
import { InputValidation } from "DistributedTaskControls/Common/InputValidation";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import {
    ActionForTaskInput, IApplicationLayerContext, ICreateProcessParameterPayload,
    IInitializeProcessParametersPayload, IInputBaseState, IProcessParameterReferenceData, IRemoveTaskReferencePayload,
    ITaskInputError, ITaskInputOptions, ITaskInputValue, IUpdateReferencePayload
} from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskStoreBase } from "DistributedTaskControls/Components/Task/TaskStoreBase";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import { IDeployPhase as IPhase } from "DistributedTaskControls/Phase/Types";
import { DataSourceBindingUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/DataSourceBindingUtility";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";

import {
    DataSourceBindingBase as DataSourceBinding, ProcessParameters, TaskInputDefinitionBase as TaskInputDefinition,
    TaskSourceDefinitionBase as TaskSourceDefinition
} from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IProcessParameterState {
    inputs: TaskInputDefinition[];
}

// Couple of optional properties to suffice init from CD data store flow.
export interface IOptions {
    appContext: IApplicationLayerContext;
    phaseList?: IPhase[];
    processParameters?: ProcessParameters;
}

export class ProcessParameterStore extends TaskStoreBase {

    constructor(options: IOptions) {
        super({
            isFileSystemBrowsable: options.appContext.isFileSystemBrowsable,
            taskDelegates: options.appContext.taskDelegates,
            processInstanceId: options.appContext.processInstanceId
        });

        this._currentState = { inputs: null };
        this._originalState = { inputs: null };
        this._nameToInputDefnMap = {};
        if (!!options.phaseList) {
            this._handleInitializeProcessParameters({
                phaseList: options.phaseList,
                processParameters: options.processParameters
            });
        }
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._processParameterActions = ActionsHubManager.GetActionsHub<ProcessParameterActions>(ProcessParameterActions, instanceId);
        this._processParameterActions.updateInput.addListener(this._handleUpdateInput);
        this._processParameterActions.updateInputError.addListener(this._handleUpdateInputError);
        this._processParameterActions.updateInputOptions.addListener(this._handleUpdateInputOptions);
        this._processParameterActions.createProcessParameter.addListener(this._handleCreateProcessParameter);
        this._processParameterActions.initializeProcessParameters.addListener(this._handleInitializeProcessParameters);
        this._processParameterActions.unlinkProcessParameter.addListener(this._handleRemoveTaskReference);
        this._processParameterActions.updateReferenceCount.addListener(this._handleUpdateReferenceUsage);
        this._processParameterActions.removeAllProcessParameters.addListener(this._handleRemoveAllProcessParameters);
    }

    // public for unit test
    public initializeProcessParameters(params: ProcessParameters): void {
        if (!!params) {
            if (!!params.inputs) {

                this._updateOptionsIfRequired(params.inputs);

                // Updating Input definitions
                this._originalState = {
                    inputs: params.inputs.map((input: TaskInputDefinition) => {
                        return DtcUtils.createInputDefinitionCopy(input);
                    })
                } as IProcessParameterState;

                this._nameToInputDefnMap = {};
                this._currentState = {
                    inputs: params.inputs.map((input: TaskInputDefinition) => {
                        this._nameToInputDefnMap[input.name] = DtcUtils.createInputDefinitionCopy(input);
                        return this._nameToInputDefnMap[input.name];
                    })
                } as IProcessParameterState;
            } else {
                this._currentState = { inputs: null };
                this._originalState = { inputs: null };
            }

            // Updating sourceDefinitions
            this._sourceDefinitions = params.sourceDefinitions;

            // Updating dataSourceBindings
            this._dataSourceBindings = params.dataSourceBindings;

            this._dependencyToTargetMap = DataSourceBindingUtility.getDependencyToTargetsMap(this.getInputToValueMap(), this.getDataSourceBindings(), this.getSourceDefinitions());
        }
    }

    public getProcessParameters(): ProcessParameters {
        let inputDefns: TaskInputDefinition[];
        if (!!this._currentState && !!this._currentState.inputs) {
            inputDefns = this._currentState.inputs.map((input: TaskInputDefinition) => {
                return DtcUtils.createInputDefinitionCopy(input);
            });
        }

        this._removeInputOptionsIfRequired(inputDefns);

        return {
            inputs: inputDefns,
            sourceDefinitions: this._sourceDefinitions,
            dataSourceBindings: this._dataSourceBindings
        } as ProcessParameters;
    }

    public getProcessParameterToValueMap(): IDictionaryStringTo<string> {
        return {};
    }

    public getInputToValueMap(): IDictionaryStringTo<string> {

        let inputToValueMap: IDictionaryStringTo<string> = {};

        for (let input in this._nameToInputDefnMap) {
            if (this._nameToInputDefnMap.hasOwnProperty(input)) {
                inputToValueMap[input] = this._nameToInputDefnMap[input].defaultValue;
            }
        }

        return inputToValueMap;
    }

    public getSourceDefinitions(): TaskSourceDefinition[] {
        return this._sourceDefinitions;
    }

    public getDataSourceBindings(): DataSourceBinding[] {
        return this._dataSourceBindings;
    }

    public getState(): IProcessParameterState {
        return this._currentState;
    }

    public getInputDefinition(inputName: string): TaskInputDefinition {
        return this._nameToInputDefnMap[inputName];
    }

    public getInputState(inputDefn: TaskInputDefinition, value: string): Common.InputState {
        let inputState = super.getInputState(inputDefn, value);
        if (inputState === Common.InputState.Valid && !this._inputValidation.isValid(inputDefn.name)) {
            inputState = Common.InputState.Invalid;
        }

        return inputState;
    }

    public isDirty(): boolean {
        if (!this._currentState || !this._originalState || !this._currentState.inputs || !this._originalState.inputs) {
            return false;
        }

        // Only input values can be changed so checking dirty on values.
        return !Utils_Array.arrayEquals(this._originalState.inputs, this._currentState.inputs, (origInput: TaskInputDefinition, currentInput: TaskInputDefinition) => {
            // Name of parameter should match irrespective of case but value with case.
            return Utils_String.equals(origInput.name, currentInput.name, true) && Utils_String.equals(origInput.defaultValue, currentInput.defaultValue);
        });
    }

    public isValid(): boolean {
        let isValid = true;
        if (this._currentState && this._currentState.inputs && this._currentState.inputs.length > 0) {
            this._currentState.inputs.forEach((input: TaskInputDefinition) => {
                //Checking if the input's visible rule is making the input visible,
                //then only testing its state, otherwise leaving it.
                if (this.isVisible(input.visibleRule, this._dependencyToTargetMap, input.name)) {
                    if (this.getInputState(input, input.defaultValue) !== InputState.Valid) {
                        isValid = false;
                        return;
                    }
                }
            });
        }

        return isValid;
    }

    public getTaskInputState(inputName: string): IInputBaseState {
        let state = {
            inputName: inputName,
            inputValue: this._getTaskInputValue(inputName),
            options: this._getTaskInputOptions(inputName),
            isHidden: () => {
                Diag.logVerbose("InputName: " + inputName);
                return this._nameToInputDefnMap[inputName] ? !this.isVisible(this._nameToInputDefnMap[inputName].visibleRule, this._dependencyToTargetMap, inputName) : false;
            }
        } as IInputBaseState;
        return state;
    }

    public getActionForInputField(inputName: string): ActionForTaskInput {
        // For process parameter will have action to navigate to variables tab.
        return ActionForTaskInput.NavigateToVariablesTab;
    }

    public getDependencyToTargetsMap() {
        return this._dependencyToTargetMap;
    }

    public getInputNameToUsageCount(name: string): number {
        if (name) {
            return this._nameToUsageCount[name.toLowerCase()];
        }
    }

    protected disposeInternal(): void {
        this._processParameterActions.updateInput.removeListener(this._handleUpdateInput);
        this._processParameterActions.updateInputError.removeListener(this._handleUpdateInputError);
        this._processParameterActions.updateInputOptions.removeListener(this._handleUpdateInputOptions);
        this._processParameterActions.createProcessParameter.removeListener(this._handleCreateProcessParameter);
        this._processParameterActions.initializeProcessParameters.removeListener(this._handleInitializeProcessParameters);
        this._processParameterActions.unlinkProcessParameter.removeListener(this._handleRemoveTaskReference);
        this._processParameterActions.updateReferenceCount.removeListener(this._handleUpdateReferenceUsage);
        this._processParameterActions.removeAllProcessParameters.removeListener(this._handleRemoveAllProcessParameters);
    }

    private _handleRemoveAllProcessParameters = () => {
        // Cleanup all process parameters in this store.
        let params: ProcessParameters = {
            dataSourceBindings: [],
            inputs: [],
            sourceDefinitions: []
        };

        this._handleInitializeProcessParameters({ processParameters: params, phaseList: [] });
    }

    private _handleUpdateInputError = (payload: ITaskInputError) => {
        if (this._inputValidation.tryHandleUpdateInputError(payload)) {
            this.emitChanged();
        }
    }

    private _handleUpdateInput = (input: ITaskInputValue) => {
        this._inputValidation.updateInputValue(input.name, input.value);
        this._updateInput(input);
        this._inputValidation.tryHandlePendingInputErrorDispatch(input.name, input.value);
        this.emitChanged();
    }

    private _handleUpdateInputOptions = (options: ITaskInputOptions) => {
        this._updateInputOptions(options);
        this.emitChanged();
    }

    //This method updates (add/deletes) the reference counters for each of the process parameters name key
    private _handleUpdateReferenceUsage = (payload: IUpdateReferencePayload) => {
        if (!!payload && !!payload.processParameterReferenceData) {

            if (!payload.shouldReferencesIncrease) {
                //Decreases reference count for each process parameter  in the payload
                payload.processParameterReferenceData.forEach((processParamRefData: IProcessParameterReferenceData) => {
                    this._decreaseProcessParameterNameToUsageCount(processParamRefData.processParameterName, processParamRefData.referenceCount);
                });
            }
            else {
                //Increases reference count for each process parameter in the payload
                payload.processParameterReferenceData.forEach((processParamRefData: IProcessParameterReferenceData) => {
                    this._increaseProcessParameterNameToUsageCount(processParamRefData.processParameterName, processParamRefData.referenceCount);
                });
            }

            //Pruning process parameters after maintaing reference counts
            this._pruneProcessParameters();
            this.emitChanged();
        }
    }

    private _handleCreateProcessParameter = (param: ICreateProcessParameterPayload) => {

        if (param) {

            this._increaseProcessParameterNameToUsageCount(param.input.name, 1);

            // Add to existing input defn list if parameter not present.
            if (this._currentState.inputs) {
                let matchedInput = Utils_Array.first(this._currentState.inputs, (input: TaskInputDefinition) => {
                    return Utils_String.equals(input.name, param.input.name, true);
                });

                if (matchedInput) {

                    this._updateProcessParameterInputDefinition(matchedInput, param.input);
                    return;
                }
            } else {
                this._currentState.inputs = [];
            }

            this._nameToInputDefnMap[param.input.name] = DtcUtils.createInputDefinitionCopy(param.input);
            this._currentState.inputs.push(this._nameToInputDefnMap[param.input.name]);

            // Add to source defn list.
            if (param.sourceDefinition) {

                if (!this._sourceDefinitions) {
                    this._sourceDefinitions = [];
                }

                this._sourceDefinitions.push(DtcUtils.createSourceDefinitionCopy(param.sourceDefinition));
            }

            // Add to data binding list.
            if (param.dataSourceBinding) {
                if (!this._dataSourceBindings) {
                    this._dataSourceBindings = [];
                }

                this._dataSourceBindings.push(DtcUtils.createDataSourceBindingCopy(param.dataSourceBinding));
            }

            this._dependencyToTargetMap = DataSourceBindingUtility.getDependencyToTargetsMap(this.getInputToValueMap(),
                this.getDataSourceBindings(), this.getSourceDefinitions());

            this.emitChanged();
        }
    }

    private _handleInitializeProcessParameters = (updateProcessParametersPayload: IInitializeProcessParametersPayload) => {
        this.initializeProcessParameters(updateProcessParametersPayload.processParameters);
        this._initializeProcessParametersToUsageCount(updateProcessParametersPayload.phaseList);
        if (updateProcessParametersPayload.forceUpdate) {
            this.emitChanged();
        }
    }

    private _handleRemoveTaskReference = (payload: IRemoveTaskReferencePayload) => {
        if (payload) {
            this._decreaseProcessParameterNameToUsageCount(payload.name, 1);
            this._pruneProcessParameters();
            this.emitChanged();
        }
    }

    private _getTaskInputValue(inputName: string): string {
        if (this._nameToInputDefnMap && this._nameToInputDefnMap[inputName]) {
            return this._nameToInputDefnMap[inputName].defaultValue;
        }

        return Utils_String.empty;
    }

    private _getTaskInputOptions(inputName: string): IDictionaryStringTo<string> {
        if (this._nameToInputDefnMap && this._nameToInputDefnMap[inputName]) {
            return this._nameToInputDefnMap[inputName].options;
        }

        return {};
    }

    private _updateInput(updatedInput: ITaskInputValue): void {
        if (this._nameToInputDefnMap && this._nameToInputDefnMap[updatedInput.name]) {
            this._nameToInputDefnMap[updatedInput.name].defaultValue = updatedInput.value;
        }
    }

    private _updateInputOptions(optionsMetaData: ITaskInputOptions): void {
        if (this._nameToInputDefnMap && this._nameToInputDefnMap[optionsMetaData.name]) {
            this._nameToInputDefnMap[optionsMetaData.name].options = optionsMetaData.options;
        }
    }

    // We treat processParameter as another input definition, to cache the options for connectedService and picklist with source 
    // we store the options in inputDefn to avoid multiple service calls to fetch the options, but while saving it in the buildDefinition 
    // we should remove the options
    private _removeInputOptionsIfRequired(inputDefns: TaskInputDefinition[]) {

        if (inputDefns) {
            inputDefns.forEach((input: TaskInputDefinition) => {

                let inputType = DtcUtils.getTaskInputType(input);

                switch (inputType) {
                    case Common.INPUT_TYPE_CONNECTED_SERVICE:
                    case Common.INPUT_TYPE_AZURE_CONNECTION:
                        input.options = null;
                        break;
                    case Common.INPUT_TYPE_PICK_LIST:
                        let options = PickListInputUtility.getPickListOptions(input,
                            this.getDataSourceBindings(), this.getSourceDefinitions());

                        if ((!!options.dataSourceBinding) || (!!options.sourceDefintion)) {
                            input.options = null;
                        }
                        break;
                    default:
                        break;
                }
            });
        }
    }

    // If options for the processParameter input exists, we will update the options for it.
    // It is to take care of scenarios where user has saved the definition (we remove the options for picklist and connectedService before save)
    // and we refresh the UI with latest processParameters
    private _updateOptionsIfRequired(inputs: TaskInputDefinition[]) {

        if (inputs && this._nameToInputDefnMap) {

            inputs.forEach((input: TaskInputDefinition) => {

                // If map undefined or no options in the map then look in the local cache for options
                if ((!input.options) || (Object.keys(input.options).length === 0)) {

                    // If local cache has options, update from there 
                    if (this._nameToInputDefnMap.hasOwnProperty(input.name)) {

                        input.options = this._nameToInputDefnMap[input.name].options;
                    }
                }
            });
        }
    }

    private _updateProcessParameterInputDefinition(processParameter: TaskInputDefinition, toBeLinkedInput: TaskInputDefinition) {

        if (processParameter && toBeLinkedInput) {

            // If any of the input is required, mark the process parameter as required
            processParameter.required = !!processParameter.required || !!toBeLinkedInput.required;
        }

    }

    private _initializeProcessParametersToUsageCount(phaseList: IPhase[]) {
        if (phaseList) {
            this._nameToUsageCount = {};
            this._updateProcParamNameToUsageMap(phaseList);
            this._pruneProcessParameters();
        }
    }

    private _updateProcParamNameToUsageMap(phaseList: IPhase[]) {
        if (this._currentState && this._currentState.inputs && phaseList) {
            this._currentState.inputs.map((input: TaskInputDefinition) => {
                let processParameterBoundValue: string = Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterBoundInputValueFormat,
                    input.name);

                phaseList.map((phase: IPhase) => {
                    // Search the bound value in all inputs in all Phase Inputs
                    ProcessParametersUtilities.searchPhaseProcessParametersReferences(phase, processParameterBoundValue, () => {
                        this._increaseProcessParameterNameToUsageCount(input.name, 1);
                    });

                    // Search the bound value in all task inputs in all tasks
                    if (phase.tasks) {
                        phase.tasks.map((task: ITask) => {
                            ProcessParametersUtilities.searchTaskInputProcessParametersReferences(task, processParameterBoundValue, () => {
                                this._increaseProcessParameterNameToUsageCount(input.name, 1);
                            });
                        });
                    }
                });
            });
        }
    }

    private _pruneProcessParameters() {
        // Prune current process param list, remove all orphan process params.
        if (this._nameToUsageCount && this._currentState && this._currentState.inputs) {
            let processParams: TaskInputDefinition[] = [];
            this._currentState.inputs.map((input: TaskInputDefinition) => {
                if (this._nameToUsageCount[input.name.toLowerCase()] && this._nameToUsageCount[input.name.toLowerCase()] > 0) {
                    processParams.push(input);
                }
            });
            this._currentState.inputs = processParams;
        }
    }

    private _increaseProcessParameterNameToUsageCount(name: string, counter: number): void {
        if (!this._nameToUsageCount) {
            this._nameToUsageCount = {};
        }

        let nameKey = name.toLowerCase();

        if (!this._nameToUsageCount[nameKey]) {
            //Setting up the usage counter
            this._nameToUsageCount[nameKey] = 0;
        }

        this._nameToUsageCount[nameKey] = this._nameToUsageCount[nameKey] + counter;
    }

    private _decreaseProcessParameterNameToUsageCount(name: string, counter: number): void {
        let nameKey = name.toLowerCase();
        if (!this._nameToUsageCount || !this._nameToUsageCount[nameKey]) {
            return;
        }

        this._nameToUsageCount[nameKey] = this._nameToUsageCount[nameKey] - counter;

        if (this._nameToUsageCount[nameKey] <= 0) {
            delete this._nameToUsageCount[nameKey];
        }
    }

    private _nameToUsageCount: IDictionaryStringTo<number>;
    private _currentState: IProcessParameterState;
    private _originalState: IProcessParameterState;
    private _sourceDefinitions: TaskSourceDefinition[];
    private _dataSourceBindings: DataSourceBinding[];
    private _nameToInputDefnMap: IDictionaryStringTo<TaskInputDefinition>;
    private _processParameterActions: ProcessParameterActions;
    private _dependencyToTargetMap: IDictionaryStringTo<string[]>;
    private _inputValidation: InputValidation = new InputValidation();
}

export class ProcessParametersUtilities {

    // Search the bound value in all inputs in all Phase Inputs
    public static searchPhaseProcessParametersReferences(phase: IPhase, processParameterBoundValue: string, matchCallback: () => void): void {
        //Get override inputs for the phase
        let overrideInputs = DeployPhaseUtilities.getPhaseOverrideInputs(phase);

        return ProcessParametersUtilities.searchProcessParametersInInputs(overrideInputs, processParameterBoundValue, matchCallback);
    }

    // Search the bound value in all task inputs in all tasks
    public static searchTaskInputProcessParametersReferences(task: ITask, processParameterBoundValue: string, matchCallback: () => void): void {
        let inputs = task.inputs;

        return ProcessParametersUtilities.searchProcessParametersInInputs(inputs, processParameterBoundValue, matchCallback);
    }

    public static searchProcessParametersInInputs(inputs: IDictionaryStringTo<string>, processParameterBoundValue: string, matchCallback: () => void): void {
        for (let inputName in inputs) {
            if (inputs.hasOwnProperty(inputName)) {

                let inputValue = inputs[inputName];
                if (Utils_String.equals(processParameterBoundValue, inputValue, true)) {
                    matchCallback();
                }
            }
        }
    }
}

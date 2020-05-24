
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { InputState, MaxPositiveNumber } from "DistributedTaskControls/Common/Common";
import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { ActionForTaskInput, IInputBaseState, IInputControllerStore, IInputSetContext, ITaskContext } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { IPredicateRule, VisibilityHelper } from "DistributedTaskControls/Components/Task/VisibilityHelper";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";

import {
    DataSourceBindingBase as DataSourceBinding,
    TaskInputDefinitionBase as TaskInputDefinition,
    TaskSourceDefinitionBase as TaskSourceDefinition
} from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class TaskStoreBase extends Store.StoreBase implements IInputControllerStore {

    constructor(protected _taskContext: ITaskContext | IInputSetContext) {
        super();
    }

    public static getKey(): string {
        return StoreKeys.TaskDetailsStore;
    }

    public getTaskInputState(inputName: string): IInputBaseState {
        throw new Error("Error:Value should be given by derived class.");
    }

    public getTaskContext(): ITaskContext {
        return this._taskContext as ITaskContext;
    }

    public setTaskContext(taskContext: ITaskContext) {
        this._taskContext = taskContext;
    }

    public getActionForInputField(inputName: string): ActionForTaskInput {
        throw new Error("Error:Value should be given by derived class.");
    }

    public getSourceDefinitions(): TaskSourceDefinition[] {
        throw new Error("Error:Value should be given by derived class.");
    }

    public getDataSourceBindings(): DataSourceBinding[] {
        throw new Error("Error:Value should be given by derived class.");
    }

    protected disposeInternal(): void {
        return;
    }

    public getTaskDefinitionId(input: TaskInputDefinition): string {
        throw new Error("Error:Value should be given by derived class.");
    }

    public getProcessParameterToValueMap(): IDictionaryStringTo<string> {
        throw new Error("Error:Value should be given by derived class.");
    }

    public isVisible(visibileRule: string, dependencyToTargetMap: IDictionaryStringTo<string[]>, inputName?: string): boolean {
        let returnValue: boolean = true;
        let visibilityRule = VisibilityHelper.getVisibilityRule(visibileRule);

        if (visibilityRule) {
            let dependentInputs = visibilityRule.predicateRules.map((predicateRule: IPredicateRule) => {
                return this.getTaskInputState(predicateRule.inputName);
            });

            returnValue = VisibilityHelper.getVisibility(visibilityRule, dependentInputs, dependencyToTargetMap, inputName);
        }

        return returnValue;
    }

    public getInputToValueMap(): IDictionaryStringTo<string> {
        throw new Error("Error:Value should be given by derived class.");
    }

    public isDirty(): boolean {
        throw new Error("Error:Value should be given by derived class.");
    }

    /**
     * Validate whether input is valid or not and returns input state
     * @param inputDefn
     * @param value
     */
    public getInputState(inputDefn: TaskInputDefinition, value: string): InputState {
        if (!!inputDefn) {
            return this._getInputState(inputDefn, value);
        }

        return InputState.Valid;
    }

    /**
     * Check if the input is in valid state or not
     */
    public isInputValid(inputDefn: TaskInputDefinition): boolean {
        let isValid: boolean = true;
        let taskInputState = this.getTaskInputState(inputDefn.name);
        if (taskInputState) {
            let inputState: InputState = this.getInputState(inputDefn, taskInputState.inputValue);
            let isHidden = taskInputState.isHidden ? taskInputState.isHidden() : false;
            if (!isHidden && inputState !== InputState.Valid) {
                isValid = false;
            }
        } else {
            isValid = false;
        }
        return isValid;
    }

    public canShowLinkOptions(): boolean {
        return (this._taskContext as ITaskContext).donotShowLinkOptions !== true;
    }

    public canShowVersions(): boolean {
        return (this._taskContext as ITaskContext).donotShowVersions !== true;
    }

    public canShowControlOptions(): boolean {
        return (this._taskContext as ITaskContext).donotShowControlOptions !== true;
    }

    public canShowOutputVariables(): boolean {
        return (this._taskContext as ITaskContext).donotShowOutputVariables !== true;
    }

    public canShowYAMLFeature(): boolean {
        return (this._taskContext as ITaskContext).donotShowYAMLFeature !== true;
    }

    public canShowTaskGroupOptions(): boolean {
        return (this._taskContext as ITaskContext).donotShowTaskGroupOptions !== true;
    }

    private _getInputState(inputDefn: TaskInputDefinition, value: string): InputState {
        // Deciding validity by required value and empty
        if (inputDefn.required && (!value || (value.trim() === Utils_String.empty))) {
            return InputState.Invalid_InputRequired;
        }

        // check for invalid option in case of simple picklist input with static options
        let inputType = DtcUtils.getTaskInputType(inputDefn);
        if (Utils_String.ignoreCaseComparer(inputType, InputControlType.INPUT_TYPE_PICK_LIST) === 0
            && !PickListInputUtility.enableRefresh(inputDefn, this.getDataSourceBindings(), this.getSourceDefinitions())
            && DtcUtils.isSimplePicklistValueInvalidOption(inputDefn.properties, inputDefn.options, value)) {
            return InputState.Invalid_SelectedOptionNotPresent;
        }

        // Validate input as per definition properties irrespective whether input is required or not
        if (inputDefn.properties) {
            return this._validateInputDefinitionProperties(value, inputDefn.properties);
        }

        return InputState.Valid;
    }

    private _validateInputDefinitionProperties(value: string, properties: IDictionaryStringTo<string>): InputState {
        // Validate properties only when value is present
        if (value) {
            let propertyValue = DtcUtils.getValueForCaseInsensitiveKey(properties, TaskStoreBase._inputDefinitionNonNegativeProperties);
            if (Utils_String.ignoreCaseComparer(propertyValue, "true") === 0) {
                return DtcUtils.isValidNonNegativeIntegerInRange(value, 0, MaxPositiveNumber, true);
            }

            propertyValue = DtcUtils.getValueForCaseInsensitiveKey(properties, TaskStoreBase._inputDefinitionIsVariableOrNonNegativeNumberProperties);
            if (Utils_String.ignoreCaseComparer(propertyValue, "true") === 0) {
                if (DtcUtils.isValueInVariableFormat(value) === true || DtcUtils.isValidNonNegativeIntegerInRange(value, 0, MaxPositiveNumber, true) === InputState.Valid) {
                    return InputState.Valid;
                }

                return InputState.Invalid_VariableOrNonPositiveNumber;
            }
        }

        return InputState.Valid;
    }

    private static _inputDefinitionNonNegativeProperties: string = "isNonNegativeNumber";
    private static _inputDefinitionIsVariableOrNonNegativeNumberProperties: string = "isVariableOrNonNegativeNumber";
}

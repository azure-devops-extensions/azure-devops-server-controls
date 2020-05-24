import { BuildConstants } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { OptionsUtilities } from "CIWorkflow/Scripts/Common/OptionsUtilities";
import { BuildDefinitionActions, IToggleBuildOptionActionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildOptionActionsCreator, IWIFieldKeyPayload, IWIFieldValuePayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildOptionActionsCreator";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import * as Common from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { ActionForTaskInput, IInputBaseState, ITaskInputOptions, ITaskInputValue } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskStoreBase } from "DistributedTaskControls/Components/Task/TaskStoreBase";
import { IPredicateRule, VisibilityHelper } from "DistributedTaskControls/Components/Task/VisibilityHelper";

import { BuildDefinition, BuildOption, BuildOptionDefinition, BuildOptionInputDefinition, BuildOptionInputType } from "TFS/Build/Contracts";
import { DataSourceBindingBase as DataSourceBinding, TaskSourceDefinitionBase as TaskSourceDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import { TaskListStoreInstanceId } from "DistributedTaskControls/Common/Common";

export interface IAdditionalWIFieldsData {
    name: string;
    value: string;
}

export interface IAdditionalWIFieldsState {
    additionalWIFields: IAdditionalWIFieldsData[];
}

export interface IBuildOptionStoreArgs {
    buildOption: BuildOption;
    buildOptionDefinition: BuildOptionDefinition;
}

export class BuildOptionStore extends TaskStoreBase {
    private _currentAdditionalWIFieldsState: IAdditionalWIFieldsState;
    private _originalAdditionalWIFieldsState: IAdditionalWIFieldsState;
    private _currentBuildOption: BuildOption;
    private _originalBuildOption: BuildOption;
    private _actionCreator: BuildOptionActionsCreator;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _buildOptionInputDefinition: IDictionaryStringTo<BuildOptionInputDefinition>;
    private _buildOption: BuildOption;
    private _buildOptionDefinition: BuildOptionDefinition;

    constructor(args: IBuildOptionStoreArgs) {
        super({
            onChangeDelegate: null,
            onRemoveDelegate: null,
            processInstanceId: TaskListStoreInstanceId
        } as any);

        this._buildOptionDefinition = args.buildOptionDefinition;
        this._buildOption = args.buildOption;

        this._buildOptionInputDefinition = {};

        this._buildOptionDefinition.inputs.forEach((input) => {
            this._buildOptionInputDefinition[input.name] = this._createBuildOptionInputDefinitionCopy(input);
        });

        this._currentAdditionalWIFieldsState = {
            additionalWIFields: []
        } as IAdditionalWIFieldsState;
        this._originalAdditionalWIFieldsState = {
            additionalWIFields: []
        } as IAdditionalWIFieldsState;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.toggleBuildOption.addListener(this._handleToggleBuildOption);

        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildOptionActionsCreator>(BuildOptionActionsCreator, instanceId);
        this._actionCreator.updateInputAction.addListener(this._handleUpdateTaskInputValue);
        this._actionCreator.updateInputOptionsAction.addListener(this._handleUpdateTaskInputOptions);

        // additional work item fields actions
        this._actionCreator.updateWIFieldKeyAction.addListener(this._handleUpdateWIFieldKey);
        this._actionCreator.updateWIFieldValueAction.addListener(this._handleUpdateWIFieldValue);
        this._actionCreator.deleteWIFieldAction.addListener(this._handleDeleteWIField);
        this._actionCreator.addWIFieldAction.addListener(this._handleAddWIField);

        if (this._buildOption) {
            this._updateCurrentAndOriginalBuildOption(this._buildOption);
        }
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._buildDefinitionActions.toggleBuildOption.removeListener(this._handleToggleBuildOption);

        this._actionCreator.updateInputAction.removeListener(this._handleUpdateTaskInputValue);
        this._actionCreator.updateInputOptionsAction.removeListener(this._handleUpdateTaskInputOptions);

        this._actionCreator.updateWIFieldKeyAction.removeListener(this._handleUpdateWIFieldKey);
        this._actionCreator.updateWIFieldValueAction.removeListener(this._handleUpdateWIFieldValue);
        this._actionCreator.deleteWIFieldAction.removeListener(this._handleDeleteWIField);
        this._actionCreator.addWIFieldAction.removeListener(this._handleAddWIField);

        this._currentAdditionalWIFieldsState = null;
        this._originalAdditionalWIFieldsState = null;
        this._currentBuildOption = null;
        this._originalBuildOption = null;
        this._actionCreator = null;
        this._buildOptionInputDefinition = null;

        super.disposeInternal();
    }

    public getAdditionalWIFieldsState(): IAdditionalWIFieldsState {
        return this._currentAdditionalWIFieldsState;
    }

    public isDirty(): boolean {
        let returnValue = false;
        if (!this._currentBuildOption || !this._originalBuildOption === null) {
            returnValue = false;
        }
        else {
            returnValue = (!(this._areBuildOptionInputsEqual()));
        }

        if (!returnValue) {
            let currentAdditionalWIFieldsData = this._getUniqueAdditionalWIFieldsData();
            if (currentAdditionalWIFieldsData.length !== this._originalAdditionalWIFieldsState.additionalWIFields.length) {
                returnValue = true;
            }
            else {
                for (let index = 0, length = currentAdditionalWIFieldsData.length; index < length; index++) {
                    if ((currentAdditionalWIFieldsData[index].name !== this._originalAdditionalWIFieldsState.additionalWIFields[index].name) ||
                        (currentAdditionalWIFieldsData[index].value !== this._originalAdditionalWIFieldsState.additionalWIFields[index].value)) {
                        returnValue = true;
                        break;
                    }
                }
            }
        }

        return returnValue;
    }

    public isValid(): boolean {
        let returnValue = true;
        this._currentAdditionalWIFieldsState.additionalWIFields.forEach((additionalWIField: IAdditionalWIFieldsData) => {
            if (additionalWIField.name.trim() === Utils_String.empty
                || /\s/g.test(additionalWIField.name.trim())) {
                returnValue = false;
                return false;
            }
        });

        return returnValue && this._hasValidInputs();
    }

    public getBuildOption(): BuildOption {
        let buildOption: BuildOption = OptionsUtilities.createBuildOptionCopy(this._currentBuildOption);
        if (buildOption) {
            if (this._currentAdditionalWIFieldsState.additionalWIFields) {
                buildOption.inputs[BuildConstants.BuildOptionAdditionalFieldsName] = this._getAdditionalWIFieldsAsJsonString();
            }

            this._fixStringListValue(buildOption);
        }
        return buildOption;
    }

    public getActionForInputField(inputName: string): ActionForTaskInput {
        return ActionForTaskInput.None;
    }

    public getDataSourceBindings(): DataSourceBinding[] {
        return [];
    }

    public getSourceDefinitions(): TaskSourceDefinition[] {
        return [];
    }

    private _getAdditionalWIFieldsAsJsonString(): string {
        let inputs = this._currentAdditionalWIFieldsState.additionalWIFields;
        let returnValue = {};
        inputs.forEach((input) => {
            returnValue[input.name] = input.value;
        });

        return JSON.stringify(returnValue);
    }

    public getTaskInputState(inputName: string): IInputBaseState {
        let inputValue = Utils_String.empty;
        inputValue = this._currentBuildOption.inputs[inputName];

        return {
            inputName: inputName,
            inputValue: inputValue,
            isHidden: () => {
                return (this._buildOptionInputDefinition[inputName]) ? !(this._isVisible(this._buildOptionInputDefinition[inputName].visibleRule)) : false;
            },
            options: (this._buildOptionInputDefinition[inputName]) ? this._buildOptionInputDefinition[inputName].options : null
        } as IInputBaseState;
    }

    private _isVisible(visibileRule: string): boolean {
        let returnValue: boolean = true;
        if (visibileRule) {
            let visibilityRule = VisibilityHelper.getVisibilityRule(visibileRule);

            if (visibilityRule) {
                let dependentInputs = visibilityRule.predicateRules.map((predicateRule: IPredicateRule) => {
                    return this.getTaskInputState(predicateRule.inputName);
                });

                returnValue = VisibilityHelper.getVisibility(visibilityRule, dependentInputs);
            }
        }

        return returnValue;
    }

    private _isValidInput(inputDefinition: BuildOptionInputDefinition, value: string): boolean {
        let result = true;
        let convertedInputType = this._convertBuildOptionInputTypeToString(inputDefinition.type);

        switch (convertedInputType.toLowerCase()) {
            case Common.INPUT_TYPE_STRING_LIST:
                if (inputDefinition.required && this._parseValue(value).length <= 0) {
                    result = false;
                }
                break;
            case Common.INPUT_TYPE_BRANCHFILTER:
                result = !!value;
                break;
            case Common.INPUT_TYPE_PICK_LIST:
                if (!DtcUtils.isValuePresentInOptions(inputDefinition.options, value)) {
                    result = false;
                    break;
                }
            case Common.INPUT_TYPE_BOOLEAN:
            case Common.INPUT_TYPE_RADIO:
            case Common.INPUT_TYPE_MULTI_LINE:
            default:
                if (inputDefinition.required && !value) {
                    result = false;
                }
                break;
        }

        return result;
    }

    private _fixStringListValue(buildOption: BuildOption) {
        if (buildOption) {
            let inputs = buildOption.inputs;
            for (let key in inputs) {
                if (inputs.hasOwnProperty(key)) {
                    let inputDefinition = this._buildOptionInputDefinition[key];
                    if (inputDefinition && this._convertBuildOptionInputTypeToString(inputDefinition.type).toLowerCase() === Common.INPUT_TYPE_STRING_LIST) {
                        buildOption.inputs[key] = this._fixValue(buildOption.inputs[key]);
                    }
                }
            }
        }
    }

    private _convertBuildOptionInputTypeToString(inputType: BuildOptionInputType): string {
        // convert the input type into string
        // In some cases input type is coming as string and sometime coming as BuildOptionInputType enum value
        // TODO: Investigate why it is not consistent, Bug# 869522
        return (typeof inputType === "string") ?
            inputType :
            OptionsUtilities.convertBuildOptionInputTypeToString(inputType);
    }

    private _fixValue(value: string): string {
        let parsedValue: string[] = this._parseValue(value);

        return JSON.stringify(DtcUtils.fixEmptyAndRecurringStringValuesInArray(parsedValue));
    }

    private _parseValue(value: string): string[] {
        let parsedJsonString: string[] = [];
        try {
            parsedJsonString = (!!value) ? JSON.parse(value) : [];
        }
        catch (e) {
            Diag.logError("[BuildOptionStore._parseValue]: Json parsing Error " + e);
        }

        return parsedJsonString;
    }

    private _updateBuildOptionInputsFromDefinition(): void {
        if (!!this._currentBuildOption && !!this._originalBuildOption && !!this._buildOptionDefinition && !!this._buildOptionDefinition.inputs) {
            if (!this._currentBuildOption.inputs) {
                this._currentBuildOption.inputs = {};
            }

            this._buildOptionDefinition.inputs.forEach((input: BuildOptionInputDefinition) => {
                // checking for undefined to only add inputs which are not present. 
                // Don't add input for additional work item fields since that is handled separately
                if (this._currentBuildOption.inputs[input.name] === undefined && input.name !== BuildConstants.BuildOptionAdditionalFieldsName) {
                    this._currentBuildOption.inputs[input.name] = input.defaultValue;
                    this._originalBuildOption.inputs[input.name] = input.defaultValue;
                }
            });
        }
    }

    private _createBuildOptionInputDefinitionCopy(buildOptionInputDefinition: BuildOptionInputDefinition): BuildOptionInputDefinition {
        if (!!buildOptionInputDefinition) {
            return {
                name: buildOptionInputDefinition.name,
                defaultValue: buildOptionInputDefinition.defaultValue,
                groupName: buildOptionInputDefinition.groupName,
                help: JQueryWrapper.extend({}, buildOptionInputDefinition.help),
                label: buildOptionInputDefinition.label,
                required: buildOptionInputDefinition.required,
                type: buildOptionInputDefinition.type,
                visibleRule: buildOptionInputDefinition.visibleRule,
                options: JQueryWrapper.extend({}, buildOptionInputDefinition.options)
            } as BuildOptionInputDefinition;
        }
        return buildOptionInputDefinition;
    }

    private _createBuildOptionAdditionalWIFieldsCopy(additionalWIFieldsInstance: IAdditionalWIFieldsData[]): IAdditionalWIFieldsData[] {
        let additionalWIFields: IAdditionalWIFieldsData[] = [];

        additionalWIFieldsInstance.forEach((demand: IAdditionalWIFieldsData) => {
            additionalWIFields.push({
                name: demand.name,
                value: demand.value
            });
        });
        return additionalWIFields;
    }

    private _areBuildOptionInputsEqual(): boolean {
        if (Object.keys(this._currentBuildOption.inputs).length !== Object.keys(this._originalBuildOption.inputs).length) {
            return false;
        }

        for (let key in this._currentBuildOption.inputs) {
            if (this._currentBuildOption.inputs.hasOwnProperty(key)) {
                if (this._currentBuildOption.inputs[key] !== this._originalBuildOption.inputs[key]) {
                    return false;
                }
            }
        }

        return true;
    }

    private _hasValidInputs(): boolean {
        let isValid: boolean = true;
        if (this._currentBuildOption) {
            if (!!this._currentBuildOption.inputs) {
                for (let inputName in this._currentBuildOption.inputs) {
                    if (this._currentBuildOption.inputs.hasOwnProperty(inputName)) {
                        if (inputName !== BuildConstants.BuildOptionAdditionalFieldsName) {
                            let inputValue = this._currentBuildOption.inputs[inputName];
                            let inputDefinition = this._buildOptionInputDefinition[inputName];

                            if (inputDefinition && this._isVisible(inputDefinition.visibleRule) && !this._isValidInput(inputDefinition, inputValue)) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }
            }
        }
        return isValid;
    }

    private _getUniqueAdditionalWIFieldsData(): IAdditionalWIFieldsData[] {
        let uniqueAdditionalWIFields: IAdditionalWIFieldsData[] = [];

        this._currentAdditionalWIFieldsState.additionalWIFields.forEach((workItemField: IAdditionalWIFieldsData) => {
            let isDataPresent = (uniqueAdditionalWIFields.filter((uniqueWIField: IAdditionalWIFieldsData) => {
                return (workItemField.name === uniqueWIField.name && workItemField.value === uniqueWIField.value);
            }).length) > 0;

            if (!isDataPresent) {
                uniqueAdditionalWIFields.push(workItemField);
            }
        });

        return uniqueAdditionalWIFields;
    }

    private _handleCreateAndUpdateBuildDefinition = (definition: BuildDefinition) => {
        if (definition.options && definition.options.length > 0) {
            let buildOptionForStore = definition.options.filter((option: BuildOption) => {
                return Utils_String.ignoreCaseComparer(this._currentBuildOption.definition.id, option.definition.id) === 0;
            });
            if (buildOptionForStore && buildOptionForStore.length > 0) {
                this._updateCurrentAndOriginalBuildOption(buildOptionForStore[0]);
                this.emitChanged();
            }
        }
    }

    private _updateCurrentAndOriginalBuildOption(buildOption: BuildOption): void {
        this._currentBuildOption = OptionsUtilities.createBuildOptionCopy(buildOption);
        this._originalBuildOption = OptionsUtilities.createBuildOptionCopy(buildOption);

        if (BuildConstants.BuildOptionAdditionalFieldsName in this._currentBuildOption.inputs) {
            if (this._currentBuildOption.inputs.hasOwnProperty(BuildConstants.BuildOptionAdditionalFieldsName)) {
                // populate additional work item fields     
                let additionalWIFields: IAdditionalWIFieldsData[] = [];
                let additionalWIFieldsJson = this._currentBuildOption.inputs[BuildConstants.BuildOptionAdditionalFieldsName];
                if (additionalWIFieldsJson) {
                    try {
                        let workItemFields = JSON.parse(additionalWIFieldsJson);

                        for (let workItemFieldName in workItemFields) {
                            additionalWIFields.push({
                                name: workItemFieldName,
                                value: workItemFields[workItemFieldName]
                            } as IAdditionalWIFieldsData);
                        }
                    }
                    catch (ex) {
                        // ignore if JSON is not in a valid format.
                    }
                }

                this._currentAdditionalWIFieldsState.additionalWIFields = this._createBuildOptionAdditionalWIFieldsCopy(additionalWIFields);
                this._originalAdditionalWIFieldsState.additionalWIFields = this._createBuildOptionAdditionalWIFieldsCopy(additionalWIFields);

                // remove additional work item fields from full build option object
                delete this._currentBuildOption.inputs[BuildConstants.BuildOptionAdditionalFieldsName];
                delete this._originalBuildOption.inputs[BuildConstants.BuildOptionAdditionalFieldsName];
            }
        }

        this._updateBuildOptionInputsFromDefinition();
    }

    private _handleToggleBuildOption = (toggleBuildOptionActionPayload: IToggleBuildOptionActionPayload) => {
        // on toggle of build option, remove any invalid additional fields
        if (Utils_String.ignoreCaseComparer(this._currentBuildOption.definition.id, toggleBuildOptionActionPayload.key) === 0
            && this._currentAdditionalWIFieldsState.additionalWIFields
            && this._currentAdditionalWIFieldsState.additionalWIFields.length > 0) {
            let validWIFields: IAdditionalWIFieldsData[] = this._currentAdditionalWIFieldsState.additionalWIFields.filter((wiField: IAdditionalWIFieldsData) => {
                return wiField.name.trim() !== Utils_String.empty;
            });

            this._currentAdditionalWIFieldsState.additionalWIFields = validWIFields;
            this.emitChanged();
        }
    }

    private _handleUpdateTaskInputValue = (payload: ITaskInputValue) => {
        this._currentBuildOption.inputs[payload.name] = payload.value;
        this.emitChanged();
    }

    private _handleUpdateTaskInputOptions = (taskInputOptions: ITaskInputOptions) => {
        this._buildOptionInputDefinition[taskInputOptions.name].options = taskInputOptions.options;
        this.emitChanged();
    }

    private _handleUpdateWIFieldKey = (payload: IWIFieldKeyPayload) => {
        this._currentAdditionalWIFieldsState.additionalWIFields[payload.index].name = payload.key;
        this.emitChanged();
    }

    private _handleUpdateWIFieldValue = (payload: IWIFieldValuePayload) => {
        if (payload.value !== null && payload.value !== undefined) {
            this._currentAdditionalWIFieldsState.additionalWIFields[payload.index].value = payload.value;
        }
        this.emitChanged();
    }

    private _handleDeleteWIField = (payload: IWIFieldKeyPayload) => {
        this._currentAdditionalWIFieldsState.additionalWIFields.splice(payload.index, 1);
        this.emitChanged();
    }

    private _handleAddWIField = (payload: IEmptyActionPayload) => {
        this._currentAdditionalWIFieldsState.additionalWIFields.push(
            {
                name: Utils_String.empty,
                value: Utils_String.empty
            } as IAdditionalWIFieldsData
        );
        this.emitChanged();
    }
}
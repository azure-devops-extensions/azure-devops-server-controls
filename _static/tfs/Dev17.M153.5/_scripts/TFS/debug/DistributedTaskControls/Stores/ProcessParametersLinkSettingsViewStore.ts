
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { } from "DistributedTaskControls/Actions/DemandsActions";
import Utils_Array = require("VSS/Utils/Array");
import * as Utils_String from "VSS/Utils/String";
import * as Common from "DistributedTaskControls/Common/Common";
import * as Diag from "VSS/Diag";

import { DataSourceBindingUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/DataSourceBindingUtility";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { ProcessParametersLinkSettingsActions } from "DistributedTaskControls/Actions/ProcessParametersLinkSettingsActions";

import {
    TaskInputDefinitionBase as TaskInputDefinition,
    TaskSourceDefinitionBase,
    DataSourceBindingBase as DataSourceBinding
} from "TFS/DistributedTaskCommon/Contracts";

export interface IProcParamsDialogState {
    selectedInput: TaskInputDefinition;
    processParamName: string;
    displayName: string;
    value: string;
    displayValueDisabled: boolean;
    isProcParamAlreadyAttached: boolean;
    processParametersListForSelectedInput: string[];
    isInvalidDisplayName: boolean;
    isInvalidProcParamName: boolean;
}

export interface IOptions {
    selectedInputDefinition: TaskInputDefinition;
    inputNameToValueMapping: IDictionaryStringTo<string>;
    inputNameToProcParam: IDictionaryStringTo<string>;
    dataSourceBindings: DataSourceBinding[];
    sourceDefinitions: TaskSourceDefinitionBase[];
    inputsList: TaskInputDefinition[];
    processInstanceId: string;
}

export class ProcessParametersLinkSettingsViewStore extends StoreCommonBase.ViewStoreBase {

    /**
     * @brief Constructor
     */
    constructor(options: IOptions) {
        super();       
        this._currentState = {} as IProcParamsDialogState;
        this._initOptions = options ? options : {} as IOptions;
    }

    public static getKey(): string {
        return StoreKeys.LinkUnlinkProcParamsDialogViewStore;
    }

    public initialize(): void {
        this._processParamStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, this._initOptions.processInstanceId);
        this._actions = ActionsHubManager.GetActionsHub<ProcessParametersLinkSettingsActions>(ProcessParametersLinkSettingsActions);

        this._actions.inputSelectionChanged.addListener(this._handleInputSelectionChanged);
        this._actions.procParamNameChanged.addListener(this._handleProcParamNameChanged);
        this._actions.displayNameChanged.addListener(this._handleDisplayNameChanged);
        this._actions.valueChanged.addListener(this._handleValueChanged);
        this._setInitState();       
    }

    protected disposeInternal(): void {
        this._actions.inputSelectionChanged.removeListener(this._handleInputSelectionChanged);
        this._actions.procParamNameChanged.removeListener(this._handleProcParamNameChanged);
        this._actions.displayNameChanged.removeListener(this._handleDisplayNameChanged);
        this._actions.valueChanged.removeListener(this._handleDisplayNameChanged);
    }

    public getState(): IProcParamsDialogState {
        return this._currentState;
    }

    /*
    Function: _getProcessParameterNameToInputMap
    This function fetches the map of process parameters for the given inputDefinition
    This gives you all process parameters based on the type of input you pass in its arguments
*/
    public getProcessParameterNameToInputMap(defnToFilterBy: TaskInputDefinition): IDictionaryStringTo<TaskInputDefinition> {
        let filteredParamsMap: IDictionaryStringTo<TaskInputDefinition> = {};

        let paramInputs = this._processParamStore.getProcessParameters().inputs;

        if (defnToFilterBy && paramInputs && paramInputs.length > 0) {

            paramInputs.forEach((inputDefn: TaskInputDefinition) => {

                let shouldFilter = Utils_String.equals(inputDefn.type, defnToFilterBy.type, true);

                let inputType = DtcUtils.getTaskInputType(defnToFilterBy);

                // Validate options for radio and picklist.
                switch (inputType) {
                    case Common.INPUT_TYPE_RADIO:
                    case Common.INPUT_TYPE_PICK_LIST:
                        shouldFilter = shouldFilter && this._compareInputOptions(inputDefn.options, defnToFilterBy.options);
                        break;
                    default:
                        break;
                }

                if (shouldFilter) {
                    filteredParamsMap[Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterVariableNameFormat, inputDefn.name)] = inputDefn;
                }

                Diag.logInfo(Utils_String.format("[TaskDetailsView]: DefnTofilterBy: {0}, Defn: {1}, shouldFilter: {2}", defnToFilterBy.name, inputDefn.name, shouldFilter));
            });
        }

        return filteredParamsMap;
    }

    public getInputNamesToDependentsMap(): IDictionaryStringTo<string[]> {
        return this._inputNamesToDependentsMap;
    }

    public getWarningTextMessage(): string {
        let warningDependentName: string = Utils_String.empty;
        let inputNameToDependentsMap: IDictionaryStringTo<string[]> = this.getInputNamesToDependentsMap();

        if (inputNameToDependentsMap && Object.keys(inputNameToDependentsMap).length > 0
            && this._initOptions && this._initOptions.inputsList && this._initOptions.inputsList.length > 0) {

            if (this._currentState.selectedInput) {
                let keyToFind: string = this._currentState.selectedInput.name;

                if (inputNameToDependentsMap.hasOwnProperty(keyToFind)) {

                    inputNameToDependentsMap[keyToFind].forEach((dependentInputName: string, index: number) => {

                        //Only append those dependent names which are not promoted as process params
                        if (this._initOptions.inputNameToProcParam && !this._initOptions.inputNameToProcParam.hasOwnProperty(dependentInputName)) {

                            this._initOptions.inputsList.forEach((input: TaskInputDefinition) => {

                                if (Utils_String.ignoreCaseComparer(input.name, dependentInputName) === 0) {
                                    if (warningDependentName === Utils_String.empty) {
                                        //Not prefixing anything for the first input setting name in the msg
                                        warningDependentName = input.label;
                                    }
                                    else {
                                        if (inputNameToDependentsMap[keyToFind].length - 1 === index) {
                                            //Prefixing { and } to the msg for the last setting name
                                            warningDependentName += Common.STRING_SPACE + Resources.And + Common.STRING_SPACE + input.label;
                                        }
                                        else {
                                            //Prefixing {, } to the msg for the settings
                                            warningDependentName += Resources.Comma + Common.STRING_SPACE + input.label;
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            }
        }

        return warningDependentName;
    }

    private _compareInputOptions(options1: IDictionaryStringTo<string>, options2: IDictionaryStringTo<string>): boolean {
        if (!options1 && !options2) {
            return true;
        }

        if (options1 && options2 && Object.keys(options1).length === Object.keys(options2).length) {
            for (let key in options1) {
                if (!options2.hasOwnProperty(key) || !Utils_String.equals(options1[key], options2[key], true)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    private _handleInputSelectionChanged = (selectedInput: TaskInputDefinition) => {
        this._setData(selectedInput);
        this.emitChanged();
    }

    private _handleProcParamNameChanged = (newName) => {
        let procParamMap = this.getProcessParameterNameToInputMap(this.getState().selectedInput);
        let newNameAlreadyExists: boolean = false;

        //Check if newName already exists, If it does then fetch its value, display name
        if (procParamMap) {
            Object.keys(procParamMap).forEach((procParamNameKey: string) => {
                if (Utils_String.ignoreCaseComparer(procParamNameKey, newName) === 0) {
                    this._currentState.displayValueDisabled = true;
                    this._currentState.displayName = procParamMap[procParamNameKey].label;
                    this._currentState.value = procParamMap[procParamNameKey].defaultValue;
                    newNameAlreadyExists = true;
                }
            });
        }

        //Otherwise just update the process parameter name with new name and make display name and value disabled
        if (!newNameAlreadyExists) {
            this._currentState.displayValueDisabled = false;
        }

        this._currentState.processParamName = newName;
        this._currentState.isInvalidProcParamName = this._isDisplayNameProcessParamNameInvalid(newName);
        this.emitChanged();
    }

    private _handleDisplayNameChanged = (newName: string) => {
        this._currentState.isInvalidDisplayName = this._isDisplayNameProcessParamNameInvalid(newName);
        this._currentState.displayName = newName;
        this.emitChanged();
    }

    private _isDisplayNameProcessParamNameInvalid(newName: string): boolean {
        if (!newName) {
            return true;
        }
        else {
            return (newName.trim() === Utils_String.empty);
        }        
    }

    private _handleValueChanged = (val: string) => {
        this._currentState.value = val;
        this.emitChanged();
    }

    private _getProcParamNameForExistingProcParam(selectedInput: TaskInputDefinition): string {
        let procParamName: string = null;
        if (this._initOptions.inputNameToProcParam && Object.keys(this._initOptions.inputNameToProcParam).length > 0) {
            if (!!this._initOptions.inputNameToProcParam[selectedInput.name]) {
                procParamName = this._initOptions.inputNameToProcParam[selectedInput.name];
            }
        }
        return procParamName;
    }

    private _setDependentNamesForSelectedInput(inputsList: TaskInputDefinition[]): void {
        let inputNamesList: string[] = this._getInputNamesList(inputsList);
        //Get the inputNames to DependentNames mapping
        this._inputNamesToDependentsMap = DataSourceBindingUtility.getInputNameToDependentParentNamesMap(inputNamesList,
            this._initOptions.inputNameToValueMapping,
            this._initOptions.dataSourceBindings, this._initOptions.sourceDefinitions);
    }

    private _getInputNamesList(inputsList: TaskInputDefinition[]): string[] {
        let inputNamesList: string[] = [];
        if (inputsList && inputsList.length > 0) {
            inputsList.forEach((input: TaskInputDefinition) => {
                inputNamesList.push(input.name);
            });
        }
        return inputNamesList;
    }

    private _setInitState(): void {
        this._setData(this._initOptions.selectedInputDefinition);
        this._setDependentNamesForSelectedInput(this._initOptions.inputsList);
    }

    private _setData(selectedInput: TaskInputDefinition): void {

        let procParamNameForExistingProcParam: string = this._getProcParamNameForExistingProcParam(selectedInput);

        let data: string[] = [];

        let processParameterNameToInputMap = this.getProcessParameterNameToInputMap(selectedInput);

        //Set available list of filtered keys to the process parameters dropdown
        if (processParameterNameToInputMap && Object.keys(processParameterNameToInputMap).length > 0) {
            data = Object.keys(processParameterNameToInputMap);
        }        

        if (procParamNameForExistingProcParam) {
            //Set states for existing process parameter for the selected input
            this._setStateForExistingProcParam(selectedInput, procParamNameForExistingProcParam, data);
        }
        else {
            let procParamName: string = selectedInput ?
                Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterVariableNameFormat, selectedInput.name) : Utils_String.empty;

            let displayName: string = selectedInput ? selectedInput.label : Utils_String.empty;
            let value: string = selectedInput ? this._initOptions.inputNameToValueMapping[selectedInput.name] : Utils_String.empty;
            let displayValueDisabled: boolean = false;

            /*Checks if the process parameter of a given default name already exists for any process parameter.
            If it does then it finds its value, display name.
            This is required here as during the time of initial selection only, if we hit this issue, we need to disable display name, value,
            and get the linked values.
            */

            if (processParameterNameToInputMap && Object.keys(processParameterNameToInputMap).length > 0) {
                Object.keys(processParameterNameToInputMap).forEach((procParamNameKey: string) => {
                    if (Utils_String.ignoreCaseComparer(procParamNameKey, procParamName) === 0) {
                        //Process parameter of this name exists
                        displayValueDisabled = true;
                        displayName = processParameterNameToInputMap[procParamNameKey].label;
                        value = processParameterNameToInputMap[procParamNameKey].defaultValue;
                    }
                });
            }
            //Code ends for the above comment here

            this._currentState.selectedInput = selectedInput;
            this._currentState.displayName = displayName;
            this._currentState.displayValueDisabled = displayValueDisabled;
            this._currentState.isProcParamAlreadyAttached = false;
            this._currentState.processParamName = procParamName;
            this._currentState.value = value;
            this._currentState.processParametersListForSelectedInput = data;
            this._currentState.isInvalidProcParamName = this._isDisplayNameProcessParamNameInvalid(procParamName);
            this._currentState.isInvalidDisplayName = this._isDisplayNameProcessParamNameInvalid(procParamName);
        }        
    }

    private _setStateForExistingProcParam(selectedInp: TaskInputDefinition, paramName: string, data: string[]) {
        let procParamName: string = Utils_String.empty;
        let existingDisplayName: string = Utils_String.empty;
        let existingValue: string = Utils_String.empty;
        let processParamInputs: TaskInputDefinition[] = this._processParamStore.getProcessParameters().inputs;

        //Getting data from the existing process parameter, its display and value
        if (!!paramName) {
            if (!!processParamInputs && processParamInputs.length > 0) {
                processParamInputs.forEach((input: TaskInputDefinition) => {
                    if (Utils_String.ignoreCaseComparer(input.name, paramName) === 0) {
                        existingDisplayName = input.label;
                        existingValue = input.defaultValue;
                    }
                });
            }
            procParamName = Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterVariableNameFormat, paramName);
        }

        this._currentState.selectedInput = selectedInp;
        this._currentState.displayName = existingDisplayName;
        this._currentState.displayValueDisabled = true;
        this._currentState.isProcParamAlreadyAttached = true;
        this._currentState.processParamName = procParamName;
        this._currentState.value = existingValue;
        this._currentState.processParametersListForSelectedInput = data;
        this._currentState.isInvalidProcParamName = this._isDisplayNameProcessParamNameInvalid(paramName);
        this._currentState.isInvalidDisplayName = this._isDisplayNameProcessParamNameInvalid(paramName);
    }

    private _actions: ProcessParametersLinkSettingsActions;
    private _processParamStore: ProcessParameterStore;
    private _initOptions: IOptions;
    private _currentState: IProcParamsDialogState;
    private _inputNamesToDependentsMap: IDictionaryStringTo<string[]>;
}
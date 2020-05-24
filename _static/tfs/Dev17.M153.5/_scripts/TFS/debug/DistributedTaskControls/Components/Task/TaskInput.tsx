/// <reference types="react" />

import * as React from "react";

import { InputState } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { ActionForTaskInput, IInputBaseState, IInputControllerActions, IInputControllerStore } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { IGetInputControlArgument, TaskInputControlFactory } from "DistributedTaskControls/Components/Task/TaskInputControlFactory";
import { TaskStoreUtility } from "DistributedTaskControls/Components/Task/TaskStoreUtility";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementUtils } from "DistributedTaskControls/ProcessManagement/ProcessManagementUtils";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInfoProps, IInputControlPropsBase, InputControlType, InputValidationType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { DataSourceBindingUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/DataSourceBindingUtility";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IInputActionDelegateProps {
    linkToProcParam: (input: TaskInputDefinition, inputValue: string) => void;
    unlinkFromProcParam: (input: TaskInputDefinition) => void;
    additionalContent?: (input: TaskInputDefinition) => JSX.Element;
}

export interface IFooterRenderer {
    getFooter?: (input: TaskInputDefinition, inputHasFocus: boolean, footerDescriptionElementId: string) => JSX.Element;
}

export interface ITaskInputProps extends ComponentBase.IProps {
    taskInstanceId: string;
    inputDefinition: TaskInputDefinition;
    inputActionDelegates?: IInputActionDelegateProps;
    controllerStore: IInputControllerStore;
    controllerActions: IInputControllerActions;
    footerRenderer?: IFooterRenderer;
    skipCapabilityCheck?: boolean;
    requiredEditCapability?: ProcessManagementCapabilities;
}

export class TaskInput extends ComponentBase.Component<ITaskInputProps, IInputBaseState> {

    constructor(props: ITaskInputProps) {
        super(props);
        this._processManagementStore = !this.props.skipCapabilityCheck
            ? StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, this.props.controllerStore.getTaskContext().processInstanceId)
            : null;
        this._controllerStore = this.props.controllerStore;
        this._controllerActions = this.props.controllerActions;
    }

    public componentWillMount(): void {
        if (this._processManagementStore) {
            this._processManagementStore.addChangedListener(this._onChanged);
        }
        this._controllerStore.addChangedListener(this._onChanged);
        this.setState(this._controllerStore.getTaskInputState(this.props.inputDefinition.name));
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._componentMounted = true;
    }

    public render(): JSX.Element {
        return (this.state.isHidden && this.getState().isHidden()) ? null : this._getControl();
    }

    public componentWillUnmount(): void {
        if (this._processManagementStore) {
            this._processManagementStore.removeChangedListener(this._onChanged);
        }
        this._controllerStore.removeChangedListener(this._onChanged);
        this._componentMounted = false;
    }

    public componentDidUpdate() {
        // special case for refreshing hidden picklists
        // Will be tracked under user story : 983150
        // refresh the data source if the input is hidden and not already refreshed
        // set the first value of the data source as the default value of the picklist
        // we make a data source call only when the dependent inputs change their values to prevent unnecessary rest calls

        let populateDefaultValue = false;
        if (this.props.inputDefinition.properties
            && this.props.inputDefinition.properties.PopulateDefaultValue
            && this.props.inputDefinition.properties.PopulateDefaultValue.toLowerCase() === Boolean.trueString
            && this._isInputEditable()) {
            populateDefaultValue = true;
        }

        if (populateDefaultValue && DtcUtils.getTaskInputType(this.props.inputDefinition) === InputControlType.INPUT_TYPE_PICK_LIST) {

            let dependentInputsToValueMap: IDictionaryStringTo<string> =
                PickListInputUtility.getDependentInputsToValueMap(this.props.inputDefinition,
                    this._controllerStore.getDataSourceBindings(), this._controllerStore.getSourceDefinitions(),
                    this._controllerStore.getInputToValueMap());
            let shouldRefresh: boolean =
                !PickListInputUtility.areDataSourceDependentValuesMapEqual(dependentInputsToValueMap, this._dependentInputsToValueMap);

            if (shouldRefresh) {
                this._dependentInputsToValueMap = dependentInputsToValueMap;
                if (this._dataSourceTriggerTimer) {
                    clearTimeout(this._dataSourceTriggerTimer);
                }

                // check if all the dependencies of the data source are met
                let pickListOptions = PickListInputUtility.getPickListOptions(this.props.inputDefinition,
                    this._controllerStore.getDataSourceBindings(), this._controllerStore.getSourceDefinitions());
                if (!pickListOptions.dataSourceBinding) {
                    return;
                }

                let depends: string[] = DataSourceBindingUtility.getDataSourceBindingDependency(pickListOptions.dataSourceBinding);
                let taskInputToValueMap: IDictionaryStringTo<string> = this._controllerStore.getInputToValueMap();
                let allDependencyMet: boolean = depends.every((dependency: string) => {
                    return (!!(taskInputToValueMap[dependency] && taskInputToValueMap[dependency].trim()));
                });

                if (!allDependencyMet) {
                    // clear the input if PopulateDefaultValue property is set and no data source call is made 
                    setTimeout(() => {
                        this._latestDataSourceRefreshPromise = null;
                        this._onValueChanged("");
                    }, 0);
                }
                else {
                    this._dataSourceTriggerTimer = setTimeout(() => {
                        let promise = PickListInputUtility.onRefresh(this.props.inputDefinition, TaskStoreUtility.getPickListRefreshOptions(this.props.inputDefinition, this._controllerStore));
                        this._latestDataSourceRefreshPromise = promise;
                        promise.then((optionsMap: IDictionaryStringTo<string>) => {
                            if (this._latestDataSourceRefreshPromise === promise && this._componentMounted) {
                                if (Object.keys(optionsMap).length === 0) {
                                    // set the default value for the input if the data source returns empty list 
                                    let defaultValue: string = this.props.inputDefinition.defaultValue;
                                    optionsMap[defaultValue] = defaultValue;
                                }
                                this._onValueChanged(optionsMap[Object.keys(optionsMap)[0]]);
                            }
                        });

                        this._dataSourceTriggerTimer = null;
                    }, 500);
                }
            }
        }
    }

    protected getState(): IInputBaseState {
        return this.state;
    }

    private _getControl(): JSX.Element {
        const inputDefinition = this.props.inputDefinition;

        //Do not allow link/unlink actions when capability check is needed and editing of process is disabled
        let isActionable = !!this.props.skipCapabilityCheck || (this._processManagementStore && this._processManagementStore.canEditProcess());

        let actionForInput = this._controllerStore.getActionForInputField(inputDefinition.name);

        let isControlDisabled = !this._isInputEditable();

        let infoProps: IInfoProps = null;
        let inputControlProps: IInputControlPropsBase<string>;

        infoProps = this._getInfoButtonIconProps(actionForInput, isActionable);

        inputControlProps = {
            instanceId: this.props.taskInstanceId,
            value: this.getState().inputValue,
            onValueChanged: this._onValueChanged,
            label: inputDefinition.label,
            required: inputDefinition.required,
            readOnly: isControlDisabled, // In the case of tasks, if an input control is set as disabled it means its linked and hence should be read-only
            disabled: isControlDisabled, // TODO: This needs to be removed as part of Accessibility change to allow reading of linked parameters
            infoProps: infoProps,
            getErrorMessage: this._getErrorMessage,
            ariaDescription: inputDefinition.helpMarkDown,
            options: this.getState().options,
            onOptionsChanged: this._onOptionsChanged,
            onNotifyValidationResult: this._onNotifyValidationResult
        };

        //  Assigning a delegate only if the footer renderer is passed.
        if (this.props.footerRenderer) {
            inputControlProps.getFooterElement = this._getFooter;
        }

        if (!!inputDefinition.validation) {
            if (inputDefinition.validation.expression) {
                // perform task input validation
                inputControlProps.asyncValidator = {
                    type: InputValidationType.Input,
                    data: {
                        expression: inputDefinition.validation.expression,
                        reason: inputDefinition.validation.message
                    }
                };
            }
            else {
                // if there's no expression to validate, but inputDefinition.validation exists, this means expression validation has to be performed on input value...
                // ...by considering input value as the expression to validate (getCustomConditionInputDefinition uses this to perform validation)
                inputControlProps.asyncValidator = {
                    type: InputValidationType.Expression
                };
            }
        }

        return TaskInputControlFactory.instance().getInputControl({
            inputDefinition: inputDefinition,
            inputControlProps: inputControlProps,
            controllerStore: this._controllerStore
        } as IGetInputControlArgument);
    }

    private _getFooter = (inputHasFocus: boolean, footerDescriptionElementId: string): JSX.Element => {
        if (this.props.footerRenderer && this.props.footerRenderer.getFooter) {
            return this.props.footerRenderer.getFooter(this.props.inputDefinition, inputHasFocus, footerDescriptionElementId);
        }
    }

    private _onChanged = () => {
        this.setState(this._controllerStore.getTaskInputState(this.props.inputDefinition.name));
    }

    private _onValueChanged = (newValue: string) => {
        this._controllerActions.updateTaskInputValue(this.props.inputDefinition.name, newValue);
    }

    private _onNotifyValidationResult = (errorMessage: string, value: string) => {
        this._controllerActions.updateTaskInputError(this.props.inputDefinition.name, errorMessage, value);
    }

    private _onOptionsChanged = (options: IDictionaryStringTo<string>) => {
        this._controllerActions.updateTaskInputOptions(this.props.inputDefinition.name, options);
    }

    private _getErrorMessage = (value: string) => {
        let inputState: InputState = this._controllerStore.getInputState(this.props.inputDefinition, value);
        switch (inputState) {
            case InputState.Invalid_InputRequired:
                return Resources.RequiredInputErrorMessage;
            case InputState.Invalid_NonPositiveNumber:
                return Resources.PositiveValidNumberErrorMessage;
            case InputState.Invalid_VariableOrNonPositiveNumber:
                return Resources.InvalidVariableOrNonPositiveNumber;
            case InputState.Invalid_SelectedOptionNotPresent:
                return Resources.SelectedOptionInvalidMessage;
            default:
                return Utils_String.empty;
        }
    }

    private _isInputEditable() {
        if (this.getState().disabled) {
            return false;
        }

        if (this._processManagementStore && this.props.requiredEditCapability !== undefined) {
            let processManagementCapabilities = this._processManagementStore.processManagementCapabilities;
            return ProcessManagementUtils.isCapabilitySupported(processManagementCapabilities, this.props.requiredEditCapability);
        }

        return true;
    }

    private _getInfoButtonIconProps(actionForInput: ActionForTaskInput, isActionable: boolean = true): IInfoProps {
        if (actionForInput !== ActionForTaskInput.None || this.props.inputDefinition.helpMarkDown) {
            const calloutContent = this._getCalloutContent(actionForInput, isActionable);
            if (!calloutContent) {
                return null;
            }

            let infoProps: IInfoProps = { calloutContentProps: calloutContent };

            switch (actionForInput) {
                case ActionForTaskInput.UnlinkFromProcessParameter:
                case ActionForTaskInput.NavigateToVariablesTab:
                    infoProps.iconName = "bowtie-link";
                    infoProps.iconAriaLabel = Resources.LinkedParameterIconAriaLabel;
                case ActionForTaskInput.LinkToProcessParameter:
                    if (isActionable) {
                        infoProps.linkToProcessParameterDelegate = this._handleLinkToProcessParameter;
                        infoProps.unlinkToProcessParameterDelegate = this._handleUnlinkFromProcessParameter;
                    }
                    break;
                default:
                    break;
            }

            return infoProps;
        }

        return null;
    }

    private _getCalloutContent(actionForInput: ActionForTaskInput, isActionable: boolean = true): ICalloutContentProps {

        let calloutContent: ICalloutContentProps = null;

        if (!!this.props.inputDefinition.helpMarkDown) {
            calloutContent = { calloutMarkdown: this.props.inputDefinition.helpMarkDown };
        }

        switch (actionForInput) {
            case ActionForTaskInput.LinkToProcessParameter:
                if (isActionable) {
                    calloutContent = calloutContent ? calloutContent : {};
                    calloutContent.calloutFooterText = Resources.LinkLabel;
                    calloutContent.calloutFooterOnClick = this._handleLinkToProcessParameter;
                }
                break;
            case ActionForTaskInput.UnlinkFromProcessParameter:
                calloutContent = calloutContent ? calloutContent : {};
                calloutContent.calloutAdditionalContent = this._handleCalloutAdditionalContent;
                if (isActionable) {
                    calloutContent.calloutFooterText = Resources.UnlinkFromProcessParameterCalloutFooterText;
                    calloutContent.calloutFooterOnClick = this._handleUnlinkFromProcessParameter;
                }
                break;
            case ActionForTaskInput.NavigateToVariablesTab:
                calloutContent = calloutContent ? calloutContent : {};
                calloutContent.calloutAdditionalContent = this._handleCalloutAdditionalContent;
                break;
            default:
                break;
        }

        return calloutContent;
    }

    private _handleLinkToProcessParameter = () => {
        if (this.props.inputActionDelegates && this.props.inputActionDelegates.linkToProcParam) {
            this.props.inputActionDelegates.linkToProcParam(this.props.inputDefinition, this.getState().inputValue);
        }
    }

    private _handleUnlinkFromProcessParameter = () => {
        if (this.props.inputActionDelegates && this.props.inputActionDelegates.unlinkFromProcParam) {
            this.props.inputActionDelegates.unlinkFromProcParam(this.props.inputDefinition);

            this._publishProcessParameterUnlinkTelemetry(this.props.inputDefinition);
        }
    }

    private _handleCalloutAdditionalContent = (): JSX.Element => {
        if (this.props.inputActionDelegates && this.props.inputActionDelegates.additionalContent) {
            return this.props.inputActionDelegates.additionalContent(this.props.inputDefinition);
        }
        return null;
    }

    private _publishProcessParameterUnlinkTelemetry(inputDefinition: TaskInputDefinition) {
        if (inputDefinition) {
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.InputName] = inputDefinition.name;
            eventProperties[Properties.InputType] = inputDefinition.type;

            Telemetry.instance().publishEvent(Feature.UnlinkToProcessParameter, eventProperties);
        }
    }

    private _dependentInputsToValueMap: IDictionaryStringTo<string> = {};
    private _componentMounted: boolean = false;
    private _dataSourceTriggerTimer;
    private _latestDataSourceRefreshPromise;
    private _controllerStore: IInputControllerStore;
    private _controllerActions: IInputControllerActions;
    private _processManagementStore: ProcessManagementStore;
}

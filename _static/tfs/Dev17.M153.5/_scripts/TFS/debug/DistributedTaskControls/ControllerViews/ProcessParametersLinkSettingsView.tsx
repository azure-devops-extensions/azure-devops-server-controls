/// <reference types="react" />

import * as React from "react";
import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ComboBoxInputComponent as EditableComboBox, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { Label } from "OfficeFabric/Label";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { IDropdownOption } from "OfficeFabric/Dropdown";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ProcessParametersLinkSettingsActionsCreator } from "DistributedTaskControls/Actions/ProcessParametersLinkSettingsActionsCreator";
import { ProcessParameterActionsCreator } from "DistributedTaskControls/Actions/ProcessParameterActionsCreator";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessParametersLinkSettingsViewStore, IProcParamsDialogState, IOptions } from "DistributedTaskControls/Stores/ProcessParametersLinkSettingsViewStore";

import {
    TaskInputDefinitionBase as TaskInputDefinition,
    TaskSourceDefinitionBase,
    DataSourceBindingBase as DataSourceBinding
} from "TFS/DistributedTaskCommon/Contracts";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as Utils_Html from "VSS/Utils/Html";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/ControllerViews/ProcessParametersLinkSettingsView";

export interface IProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    processInstanceId: string;
    selectedInputDefinition?: TaskInputDefinition;
    inputsList: TaskInputDefinition[];
    inputNameToValueMapping: IDictionaryStringTo<string>;
    inputNameToProcParam: IDictionaryStringTo<string>;
    dataSourceBindings: DataSourceBinding[];
    sourceDefinitions: TaskSourceDefinitionBase[];
    onDialogClose: () => void;
    linkToProcessParameter?: (inputName: string, processParameterName: string) => void;
    unlinkFromProcessParameter?: (inputName: string) => void;
}

export class ProcessParametersLinkSettingsView extends ComponentBase.Component<IProps, IProcParamsDialogState> {

    public componentWillMount() {
        this._store = StoreManager.CreateStore<ProcessParametersLinkSettingsViewStore, IOptions>(ProcessParametersLinkSettingsViewStore, Utils_String.empty,
            {
                selectedInputDefinition: this._setSelectedInput(),
                inputNameToProcParam: this.props.inputNameToProcParam,
                inputNameToValueMapping: this.props.inputNameToValueMapping,
                dataSourceBindings: this.props.dataSourceBindings,
                sourceDefinitions: this.props.sourceDefinitions,
                inputsList: this.props.inputsList,
                processInstanceId: this.props.processInstanceId
            } as IOptions);

        this._actionCreator = ActionCreatorManager.GetActionCreator<ProcessParametersLinkSettingsActionsCreator>(ProcessParametersLinkSettingsActionsCreator, this.props.controllerInstanceId);
        this._processParametersActionsCreator = ActionCreatorManager.GetActionCreator<ProcessParameterActionsCreator>(ProcessParameterActionsCreator, this.props.processInstanceId);

        this.setState(this._store.getState());
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
        StoreManager.DeleteStore<ProcessParametersLinkSettingsViewStore>(ProcessParametersLinkSettingsViewStore);
    }

    public render(): JSX.Element {
        let inputSettingsListDropdownClassName: string = "input-settings-list";
        let warningMessage: string = Utils_String.format(Resources.DependentsWarningMessage, this._store.getWarningTextMessage());
        let normalizedMessage: string = Utils_Html.HtmlNormalizer.normalize(warningMessage);

        return (
            <Dialog
                modalProps={{
                    containerClassName: "create-link-variable-dialog"
                }}
                dialogContentProps={{
                    type: DialogType.close
                }}
                hidden={false}
                title={Resources.CreateAndLinkVariableDialogTitle}
                onDismiss={this._onDialogClose}
                closeButtonAriaLabel={Resources.CloseButtonText}
                firstFocusableSelector={inputSettingsListDropdownClassName}>

                <div>
                    {/*Input Settings list*/}
                    <DropDownInputControl
                        selectedKey={this.state.selectedInput ? this.state.selectedInput.name : undefined}
                        label={Resources.SettingToLink}
                        options={this._getDataSourceForSettingsAvailable()}
                        onValueChanged={(val: IDropDownItem) => { this._onInputsListChange(val.option); }}
                        cssClass={inputSettingsListDropdownClassName} />

                    {/* Editable combo box.*/}
                    <EditableComboBox
                        required={true}
                        errorMessage={Resources.RequiredInputErrorMessage}
                        label={Resources.VariableLabel}
                        value={this._getProcessParameterName()}
                        comboBoxType={ComboBoxType.Editable}
                        source={this.state.processParametersListForSelectedInput}
                        onValueChanged={this._onProcessParameterNameChange}
                        enabled={!this.state.isProcParamAlreadyAttached} />

                    {/* Display Name component */}
                    <StringInputComponent
                        required={true}
                        label={Resources.DisplayNameLabel}
                        value={this._getInputDisplayName()}
                        onValueChanged={this._onInputDisplayNameChange}
                        disabled={this.state.displayValueDisabled}
                        getErrorMessage={this._getErrorMessage} />

                    {/* Value component */}
                    {this._getValueComponent()}

                    {/*Warning message for dependent Inputs*/}
                    {/* tslint:disable:react-no-dangerous-html */}
                    {Utils_String.ignoreCaseComparer(this._store.getWarningTextMessage(), Utils_String.empty) !== 0 &&
                        <MessageBar
                            messageBarType={MessageBarType.warning}
                            className="dependent-warning-container" >
                            <div className="dependents-warning-message" dangerouslySetInnerHTML={{ __html: normalizedMessage }} />
                        </MessageBar>
                    }
                    {/* tslint:enable:react-no-dangerous-html */}

                    <DialogFooter>
                        <PrimaryButton
                            className={css("fabric-style-overrides")}
                            ariaLabel={Resources.LinkLabel}
                            onClick={this._onLinkClicked}
                            disabled={this._isLinkButtonDisabled()}
                            aria-disabled={this.state.isProcParamAlreadyAttached}>
                            {Resources.LinkLabel}
                        </PrimaryButton>

                        <PrimaryButton
                            className={css("fabric-style-overrides")}
                            ariaLabel={Resources.UnlinkFromProcessParameterCalloutFooterText}
                            onClick={this._onUnlinkClicked}
                            disabled={!this.state.isProcParamAlreadyAttached}
                            aria-disabled={!this.state.isProcParamAlreadyAttached}>
                            {Resources.UnlinkFromProcessParameterCalloutFooterText}
                        </PrimaryButton>

                        <DefaultButton
                            ariaLabel={Resources.CancelButtonText}
                            onClick={this._onDialogClose}>
                            {Resources.CancelButtonText}
                        </DefaultButton>
                    </DialogFooter>
                </div>

            </Dialog>
        );
    }

    private _getErrorMessage(val: string): string | PromiseLike<string> {
        if (!val) {
            return Resources.RequiredInputErrorMessage;
        }
        else if (val.trim() === Utils_String.empty) {
            return Resources.RequiredInputErrorMessage;
        }
    }

    private _isLinkButtonDisabled(): boolean {
        return this.state.isProcParamAlreadyAttached || this.state.isInvalidDisplayName || this.state.isInvalidProcParamName;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _getDataSourceForSettingsAvailable(): IDropdownOption[] {
        let options: IDropdownOption[] = [];

        this.props.inputsList.forEach((input: TaskInputDefinition) => {
            options.push({
                key: input.name,
                text: input.label
            });
        });

        return options;
    }

    private _getValueLabel(): JSX.Element {
        return (
            <Label>
                {Resources.ValueLabel}
            </Label>
        );
    }

    private _getValueComponent(): JSX.Element {
        let returnValue: JSX.Element;

        if (this.state.selectedInput) {

            let inputType = DtcUtils.getTaskInputType(this.state.selectedInput);
            let disabled = this.state.displayValueDisabled;

            switch (inputType) {
                case Common.INPUT_TYPE_BOOLEAN:
                    returnValue = (
                        <div>
                            {this._getValueLabel()}
                            <BooleanInputComponent
                                label={this._getInputDisplayName()}
                                value={(Utils_String.ignoreCaseComparer(this._getInputValue(), Common.BOOLEAN_TRUE) === 0) ? true : false}
                                onValueChanged={(newValue: boolean) => { this._onInputValueChange((newValue) ? Common.BOOLEAN_TRUE : Common.BOOLEAN_FALSE); }}
                                disabled={disabled} />
                        </div>);
                    break;
                case Common.INPUT_TYPE_RADIO:
                    returnValue = (
                        <div className="fabric-style-overrides">
                            <RadioInputComponent
                                label={Resources.ValueLabel}
                                options={this._getChoiceGroupInputOptions()}
                                onValueChanged={(newOption: IChoiceGroupOption) => { this._onInputValueChange(newOption.key); }}
                                disabled={disabled} />
                        </div>);
                    break;
                case Common.INPUT_TYPE_PICK_LIST:
                    returnValue = (
                        this._getPickListComponent(disabled)
                    );
                    break;
                case Common.INPUT_TYPE_MULTI_LINE:
                    returnValue = (
                        <div>
                            <MultiLineInputComponent
                                label={Resources.ValueLabel}
                                isNotResizable={true}
                                value={this._getInputValue()}
                                onValueChanged={this._onInputValueChange}
                                disabled={disabled} />
                        </div>);
                    break;
                case Common.INPUT_TYPE_STRING:
                    returnValue = (
                        this._getTextFieldComponent(disabled)
                    );
                    break;
                default:
                    //Display disabled data and message to edit from Process View
                    returnValue = (
                        this._getTextFieldComponentWithMessage(true)
                    );
                    break;
            }
        }
        return returnValue;
    }

    private _getPickListComponent(disabled: boolean): JSX.Element {
        let options = PickListInputUtility.getPickListOptions(this.state.selectedInput, this.props.dataSourceBindings, this.props.sourceDefinitions);
        //If dependent picklist then do show disabled value with message, otherwise show dropdown
        if ((!!options.dataSourceBinding) || (!!options.sourceDefintion)) {
            //Logging telemetry for picklist type of input
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.InputName] = this.state.selectedInput.name;
            eventProperties[Properties.InputType] = this.state.selectedInput.type;
            Telemetry.instance().publishEvent(Feature.LinkPicklistAsProcessParameter, eventProperties);

            //Add disabled text field with message
            return this._getTextFieldComponentWithMessage(true);
        }
        else {
            return (
                <DropDownInputControl
                    label={Resources.ValueLabel}
                    options={this._getDropdownInputOptions()}
                    selectedKey={this._getInputValue()}
                    onValueChanged={(val: IDropDownItem) => { this._onInputValueChange(val.option.key.toString()); }}
                    disabled={disabled} />
            );
        }
    }

    private _getTextFieldComponentWithMessage(disabled: boolean): JSX.Element {
        return (
            <div>
                {this._getTextFieldComponent(disabled)}

                {/*Show message only if pickList disabled*/}
                <div className="value-disabled-message">
                    {Resources.PickListDisabledGuidanceMessageInfo}
                </div>
            </div>
        );


    }

    private _getTextFieldComponent(disabled: boolean): JSX.Element {
        return (
            <div>
                <StringInputComponent
                    label={Resources.ValueLabel}
                    value={this._getInputValue()}
                    onValueChanged={this._onInputValueChange}
                    disabled={disabled} />
            </div>
        );
    }

    //Get the Process Parameter Name
    private _getProcessParameterName(): string {
        return this.state.processParamName;
    }

    //Get the display name
    private _getInputDisplayName(): string {
        return this.state.displayName;
    }

    //Get the value name
    private _getInputValue(): string {
        return this.state.value;
    }

    private _getChoiceGroupInputOptions(): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];

        if (this.state.selectedInput) {
            for (let optionKey in this.state.selectedInput.options) {
                if (this.state.selectedInput.options.hasOwnProperty(optionKey)) {
                    options.push({
                        key: optionKey,
                        text: this.state.selectedInput.options[optionKey],
                        checked: (Utils_String.ignoreCaseComparer(optionKey, this._getInputValue()) === 0),
                        disabled: this.state.displayValueDisabled
                    } as IChoiceGroupOption);
                }
            }
        }

        return options;
    }

    private _getDropdownInputOptions(): IDropdownOption[] {
        let options: IDropdownOption[] = [];

        if (this.state.selectedInput) {
            for (let optionKey in this.state.selectedInput.options) {
                if (this.state.selectedInput.options.hasOwnProperty(optionKey)) {
                    options.push({
                        key: optionKey,
                        text: this.state.selectedInput.options[optionKey]
                    } as IDropdownOption);
                }
            }
        }
        return options;
    }

    private _closeDialog() {
        if (!!this.props.onDialogClose) {
            this.props.onDialogClose();
        }
    }

    private _onProcessParameterNameChange = (newName: string) => {
        this._actionCreator.procParamNameChanged(newName);
    }

    private _onInputsListChange = (newInput: IDropdownOption) => {

        //Get the input object from the inputName selected
        let selectedInput: TaskInputDefinition = null;
        this.props.inputsList.forEach((input: TaskInputDefinition) => {
            if (input.name === newInput.key) {
                selectedInput = input;
            }
        });

        this._actionCreator.inputSelectionChanged(selectedInput);
    }

    private _onInputDisplayNameChange = (newDisplayName: string) => {
        this._actionCreator.displayNameChanged(newDisplayName);
    }

    private _onInputValueChange = (newInputValue: string) => {
        this._actionCreator.valueChanged(newInputValue);
    }

    private _onLinkClicked = () => {
        let newInputDefn: TaskInputDefinition = DtcUtils.createInputDefinitionCopy(this.state.selectedInput);

        newInputDefn.name = DtcUtils.getProcParamNameFromVariableName(this.state.processParamName);
        newInputDefn.label = this.state.displayName;
        newInputDefn.defaultValue = this.state.value;

        // Unsetting fields not required.
        newInputDefn.groupName = Utils_String.empty;

        //Setting visible rules as empty for M122.
        //Can enable it later.
        newInputDefn.visibleRule = Utils_String.empty;

        let options = PickListInputUtility.getPickListOptions(newInputDefn, this.props.dataSourceBindings, this.props.sourceDefinitions);

        // Creating process parameter
        this._processParametersActionsCreator.createProcessParameter({
            input: newInputDefn,
            sourceDefinition: options.sourceDefintion,
            dataSourceBinding: options.dataSourceBinding
        });

        // Linking task input value with process parameter
        if (this.props.linkToProcessParameter) {
            this.props.linkToProcessParameter(this.state.selectedInput.name, newInputDefn.name);
        }

        if (this.state.displayValueDisabled) {
            //Adding feature name as linking to process parameter
            this._publishProcessParameterLinkTelemetry(Feature.LinkToProcessParameter, this.state.selectedInput);
        }
        else {
            //Adding feature name as creating a process parameter
            this._publishProcessParameterLinkTelemetry(Feature.CreateProcessParameter, this.state.selectedInput);
        }
        this._closeDialog();
    }

    private _onUnlinkClicked = () => {
        if (this.props.unlinkFromProcessParameter) {
            this.props.unlinkFromProcessParameter(this.state.selectedInput.name);
        }

        this._processParametersActionsCreator.unlinkProcessParameter(DtcUtils.getProcParamNameFromVariableName(this.state.processParamName));

        //Sending feature name as unlink.
        this._publishProcessParameterLinkTelemetry(Feature.UnlinkProcessParameterFromDialog, this.state.selectedInput, true);

        this._closeDialog();
    }

    private _onDialogClose = () => {
        this._closeDialog();
    }

    private _publishProcessParameterLinkTelemetry(featureName: string, inputDefinition: TaskInputDefinition, unlink: boolean = false) {
        if (inputDefinition) {
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.InputName] = inputDefinition.name;
            eventProperties[Properties.InputType] = inputDefinition.type;
            if (!unlink) {
                //Adding this property for only linking and not for unlink.
                eventProperties[Properties.IsExistingProcessParameter] = this.state.displayValueDisabled;
            }

            Telemetry.instance().publishEvent(featureName, eventProperties);
        }
    }

    private _setSelectedInput(): TaskInputDefinition {
        let selectedInputDef: TaskInputDefinition = null;
        if (this.props.selectedInputDefinition) {
            selectedInputDef = this.props.selectedInputDefinition;
        }
        else if (!!this.props.inputsList && this.props.inputsList.length > 0) {
            selectedInputDef = this.props.inputsList[0];
        }
        return selectedInputDef;
    }

    private _processParametersActionsCreator: ProcessParameterActionsCreator;
    private _actionCreator: ProcessParametersLinkSettingsActionsCreator;
    private _store: ProcessParametersLinkSettingsViewStore;
    private _paramInputs: TaskInputDefinition[];
    private _processParameterNameToInputMap: IDictionaryStringTo<TaskInputDefinition> = {};
}


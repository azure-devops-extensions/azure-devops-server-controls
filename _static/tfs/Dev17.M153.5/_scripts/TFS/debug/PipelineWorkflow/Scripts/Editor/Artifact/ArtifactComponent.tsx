/// <reference types="react" />
import * as Q from "q";
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { BuildBranchFilterComponent } from "DistributedTaskControls/Components/BuildBranchFilterComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { ComboBoxInputComponent, ComboBoxType, IComboBoxDropOptions, IProps } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";
import { PickListInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputComponent";
import { ConnectedServiceInputComponent, IConnectedServiceInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { TagPickerComponent } from "DistributedTaskControls/Components/TagPicker";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { SearchableComboBoxInputComponent, ISearchableComboBoxInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/SearchableComboBoxInputComponent";

import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ArtifactViewStore, IArtifactTypesData, IArtifactInput, IInputValues } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactViewStore";
import { IUpdateArtifactTnputPayload, IUpdateArtifactInputOptionsPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";
import { IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { TagUtils } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTagInput";
import { WellKnownRepositoryTypes, ArtifactsConstants, BranchInputType } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");
import ReleaseConstants = require("ReleaseManagement/Core/Constants");

import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import { ITag } from "OfficeFabric/Pickers";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import { PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComponent";

export interface IArtifactComponentProps extends Base.IProps {
    artifactInputs: IArtifactInput[];
    selectedArtifact: string;
    selectedArtifactEndpointTypeId: string;
    alias: string;
    branchInputType: BranchInputType;
    onUpdateArtifactInput: (payload: IUpdateArtifactTnputPayload, skipFetchinDependency?: boolean) => void;
    onUpdateArtifactInputOptions: (payload: IUpdateArtifactInputOptionsPayload) => void;
    onUpdateArtifactAlias: (artifactType: string, alias: string) => void;
    onGetAliasErrorMessage: (alias: string) => string;
    onSearchArtifactInput: (payload: IUpdateArtifactTnputPayload) => IPromise<IKeyValuePairWithData[]>;
    isLoading?: boolean;
}

export class ArtifactComponent extends Base.Component<IArtifactComponentProps, Base.IStateless> {

    public render(): JSX.Element {
        let renderedList: JSX.Element[] = [];

        this._stopChildRendering = false;

        if (this.props.artifactInputs) {
            this.props.artifactInputs.forEach((input: IArtifactInput, index: number) => {
                let item: JSX.Element = this._getInputComponent(input, index.toString(), this.props.branchInputType);
                if (item && !this._stopChildRendering) {
                    renderedList.push(item);
                    if (input.isVisible && ArtifactUtility.isDefinitionInput(input.id)) {
                        if (!input.selectedValue || this._isDefinitionArtifactInValid) {
                            // Stop the child component rendering if the definition is not set to any value.
                            this._stopChildRendering = true;
                        }
                    }
                }
            });
        }

        return (
            <div className="artifacts">
                <div className="artifact-inputs">
                    {renderedList}
                </div>
                <div className="artifact-alias">
                    {this._getSourceAliasComponent()}
                </div>
            </div>
        );
    }

    private _getSourceAliasComponent() {
        let sourceAlias: string = this.props.alias || Utils_String.empty;
        let infoProps: IInfoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.SourceAliasDescription
            }
        };
        let aliasComponent: JSX.Element = null;
        if (!this._stopChildRendering) {
            aliasComponent = <StringInputComponent
                label={Resources.ArtifactSourceAlias}
                value={sourceAlias}
                onValueChanged={(value) => { this._onArtifactAliasChange(value); }}
                infoProps={infoProps}
                forceUpdate={true}
                deferredValidationTime={this._textFieldValidationTimeout}
                getErrorMessage={this.props.onGetAliasErrorMessage}
                disabled={this.props.isLoading}
                readOnly={this.props.isLoading}
                required={true}
            />;
        }
        return (aliasComponent);
    }

    private _getInputComponent(input: IArtifactInput, index: string, branchInputType: BranchInputType): JSX.Element {
        let returnValue: JSX.Element;

        switch (input.inputMode) {
            case InputMode.Combo:
                if (input.id === Types.ArtifactDefaultVersionConstants.DefaultVersionBranch) {
                    if (branchInputType === BranchInputType.Combo) {
                        returnValue = this._getDropdownComponent(input, index);
                    }
                    else if (branchInputType === BranchInputType.Text) {
                        returnValue = this._getStringInputComponent(input, index);
                    }
                    else if (branchInputType === BranchInputType.TfGitBranchFilter) {
                        returnValue = this._getBranchFilterComponent(input, index);
                    }
                    else {
                        returnValue = null;
                    }
                }
                else {
                    returnValue = this._getDropdownComponent(input, index);
                }
                break;
            case InputMode.Tags:
                returnValue = this._getTagComponent(input, index);
                break;
            case InputMode.PickList:
                returnValue = this._getPickListComponent(input, index);
                break;                                
            case InputMode.TextBox:
                returnValue = this._getStringInputComponent(input, index);
                break;
            case InputMode.CheckBox:
                returnValue = this._getBooleanInputComponent(input, index);
                break;
            case InputMode.PasswordBox:
                returnValue = this._getTextFeildComponent(input, index, false, true);
                break;
            case InputMode.RadioButtons:
                returnValue = this._getChoiceFieldComponent(input, index);
                break;
            case InputMode.TextArea:
                returnValue = this._getTextFeildComponent(input, index, true, false);
                break;
            case InputMode.None:
                returnValue = null;
                break;                
            default:
                returnValue = this._getTextFeildComponent(input, index, false, false);
                break;
        }

        return (input.isVisible && returnValue);
    }

    private _getComboOptions(inputOptions: IKeyValuePairWithData[], inputId: string): string[] {
        let options: string[] = [];
        if (inputOptions) {
            inputOptions.forEach((inputOption: IKeyValuePairWithData) => {
                options.push(ArtifactUtility.getArtifactInputDisplayValue(inputOption));
            });
        }

        if (ArtifactUtility.isDefinitionInput(inputId) && options && options.length > 0) {
            options.sort((inputOptionA: string, inputOptionB: string) => {
                return Utils_String.localeIgnoreCaseComparer(inputOptionA, inputOptionB);
            });
        }

        return options;
    }

    private _getChoiceGroupOptions(inputOptions: IKeyValuePairWithData[], selectedValue: string): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];
        if (inputOptions) {
            inputOptions.forEach((inputOption: IKeyValuePairWithData) => {
                options.push({ key: inputOption.Key, text: inputOption.Value, checked: (inputOption.Value === selectedValue) });
            });
        }
        return options;
    }

    private _getbranchFilterOptions(options: IInputValues[]): string[] {
        let branches: string[] = [];
        options.forEach((option: IInputValues) => {
            branches.push(option.value);
        });
        return branches;
    }

    private _onSearchArtifactInput(inputId: string, searchText: string, selectedValueKey?: string, inputOptions?: IKeyValuePairWithData[]): IPromise<boolean> {
        let q = Q.defer<boolean>();

        this.props.onSearchArtifactInput({
            inputId: inputId,
            displayValue: searchText,
            options: inputOptions,
            selectedValueKey: selectedValueKey,
            type: this.props.selectedArtifact
        }).then((searchedOptions: IKeyValuePairWithData[]) => {
            q.resolve(!!searchedOptions && searchedOptions.length > 0);
        }, (error) => {
            q.reject(error);
        });

        return q.promise;
    }

    private _onInputOptionsChanged(inputId: string, selectedValue: string, selectedValueKey?: string, skipFetchingDependency?: boolean, inputOptions?: IKeyValuePairWithData[]) {
        this.props.onUpdateArtifactInput({
            inputId: inputId,
            displayValue: selectedValue,
            options: inputOptions,
            selectedValueKey: selectedValueKey,
            type: this.props.selectedArtifact
        }, skipFetchingDependency);
    }

    private _onConnectionServiceOptionChanged(inputId: string, selectedKey: string, inputOptions: IKeyValuePairWithData[]) {
        let selectedOption: IKeyValuePairWithData = {
            Key: Utils_String.empty,
            Value: Utils_String.empty
        };
        if (inputOptions) {
            selectedOption = Utils_Array.first(
                inputOptions,
                (inputOption: IKeyValuePairWithData) => {
                    return inputOption.Key === selectedKey;
                }
            );
        }
        if (selectedOption) {
            this._onInputOptionsChanged(inputId, selectedOption.Value, selectedKey, false, inputOptions);
            this._publishComboBoxChangeArtifactTelemetry(inputId);
        }
        else {
            this._onInputOptionsChanged(inputId, Utils_String.empty, selectedKey, true, inputOptions);
        }
    }

    private _onInputPossibleValuesChanged(inputId: string, selectedValue: string, newPossibleValues: IDictionaryStringTo<string>, selectedValueKey?: string) {
        let possibleValues: IKeyValuePairWithData[] = [];
        let isSelectedValueValid = false;
        for (let key in newPossibleValues) {
            if (key === selectedValueKey) {
                isSelectedValueValid = true;
            }
            possibleValues.push({ Key: key, Value: newPossibleValues[key] });
        }
        if (isSelectedValueValid) {
            this.props.onUpdateArtifactInputOptions({
                inputId: inputId,
                displayValue: selectedValue,
                selectedValueKey: selectedValueKey,
                type: this.props.selectedArtifact,
                options: possibleValues,
            });
        }
        else {
            this.props.onUpdateArtifactInputOptions({
                inputId: inputId,
                displayValue: Utils_String.empty,
                selectedValueKey: Utils_String.empty,
                type: this.props.selectedArtifact,
                options: possibleValues,
            });
        }

    }

    private _onComboOptionChanged(inputId: string, selectedValue: string, inputOptions: IKeyValuePairWithData[]) {
        let selectedOption: IKeyValuePairWithData = {
            Key: Utils_String.empty,
            Value: Utils_String.empty
        };
        if (inputOptions) {
            selectedOption = Utils_Array.first(
                inputOptions,
                (inputOption: IKeyValuePairWithData) => {
                    return ArtifactUtility.getArtifactInputDisplayValue(inputOption) === selectedValue;
                }
            );
        }
        if (selectedOption) {
            this._onInputOptionsChanged(inputId, selectedOption.Value, selectedOption.Key);
            this._publishComboBoxChangeArtifactTelemetry(inputId);
        }
        else {
            this._onInputOptionsChanged(inputId, selectedValue, Utils_String.empty, true);
        }
    }

    private _onPickListOptionChanged(inputId: string, selectedValue: string, inputOptions: IKeyValuePairWithData[]) {
        if (inputOptions && selectedValue) {
            let multipleSelectedIds = selectedValue.split(",");
            let multipleSelectedValues = 
                                    multipleSelectedIds.map(
                                        (selectedId) => 
                                                { 
                                                    return Utils_Array.first(inputOptions, (inputOption: IKeyValuePairWithData) => { return inputOption.Key === selectedId; }).Value;
                                                }
                                    ).join(",");
            
            this._onInputOptionsChanged(inputId, multipleSelectedValues, selectedValue);
        }
        else {
            this._onInputOptionsChanged(inputId, selectedValue, Utils_String.empty, true);
        }

        this._publishComboBoxChangeArtifactTelemetry(inputId);
    }

    private _publishComboBoxChangeArtifactTelemetry(inputId: string) {
        // Don't log telemetry for definition field as we are not setting it default value.
        if (!ArtifactUtility.isDefinitionInput(inputId)) {
            let eventProperties: IDictionaryStringTo<any> = {};
            eventProperties[Properties.ArtifactType] = this.props.selectedArtifact;
            eventProperties[Properties.ArtifactInputId] = inputId;

            Telemetry.instance().publishEvent(Feature.ArtifactInputModified, eventProperties);
        }
    }

    private _onBranchFilterChange(input: IArtifactInput, branch: string) {
        this.props.onUpdateArtifactInput({
            inputId: input.id,
            displayValue: branch || Utils_String.empty,
            selectedValueKey: branch || Utils_String.empty,
            type: this.props.selectedArtifact
        });
    }

    private _getStringInputComponent(input: IArtifactInput, index: string): JSX.Element {
        //TODO: understand purpose of forceUpdate
        let returnValue = (<StringInputComponent
            key={input.name + index}
            infoProps={this._getInfoProps(input)}
            value={input.defaultValue}
            onValueChanged={(value) => { this._onInputOptionsChanged(input.id, value); }}
            label={input.name}
            ariaDescription={input.name}
            disabled={input.isDisabled}
            forceUpdate={true}
        />);

        return returnValue;
    }

    private _getDropdownComponent(input: IArtifactInput, index: string): JSX.Element {
        let selectedOption: IKeyValuePairWithData = {
            Key: Utils_String.empty,
            Value: Utils_String.empty
        };
        selectedOption = Utils_Array.first(
            input.options,
            (inputOption: IKeyValuePairWithData) => {
                //For the case when the searchText in build definition input box (e.g when inputText ='a' or '1') does not fully match any BD name,
                //the ArtifactComboInput sets input.selectedValue as its display value (which is also the default value)
                //In the above scenario (e.g when inputText is '1' )we should not compare the inputOption Key(which might also be '1') and input.selectedValue(which has been set as '1')
                return (input.defaultValue !== input.selectedValue && inputOption.Key === input.selectedValue);
            });
        let selectedValue: string = selectedOption ? ArtifactUtility.getArtifactInputDisplayValue(selectedOption) : input.selectedValue;
        if (this._showManageLink(input)) {
            return this._getConnectedServiceComponent(input, index, selectedValue);
        }
        else {
            // On Edge browser there the combo box is getting clipped in medium and small resolution if the can accomodate max of 5 elements at this resolution.
            let comboDropOptions: IComboBoxDropOptions = { maxRowCount: Utils_UI.BrowserCheckUtils.isEdge() && window.screen.availHeight <= 640 ? 5 : undefined };

            // When there are more possible values for options than we can fetch, we should allow custom values to be entered.
            // isLimitedToPossibleValues is used to know if options list is exhaustive or not
            let comboBoxType: ComboBoxType = (input && input.options && input.options.length > 0 && input.isLimitedToPossibleValues) ? ComboBoxType.Searchable : ComboBoxType.Editable;
            let comboBoxInputProps: IProps = {
                label: input.name,
                infoProps: this._getInfoProps(input),
                key: input.name + index,
                maxAutoExpandDropWidth: this._maxDropdownWidth,
                value: selectedValue,
                allowEdit: input.allowEdit,
                comboBoxType: comboBoxType,
                compareInputToItem: (key: any, compareText: any, matchPartial: boolean): number => {
                    //compareInputToItem is called in two cases:
                    if (matchPartial) {
                        //1. To compare the searchText with dropdown options, with matchPartial set true, in this case we should return caseInsensitiveContains
                        if (Utils_String.caseInsensitiveContains(key, compareText)) {
                            return 0;
                        }
                        return -1;
                    }
                    else {
                        //2. To fetch the selected index, with matchPartial undefined, in this case we should return localeIgnoreCaseComparer
                        return Utils_String.localeIgnoreCaseComparer(key, compareText);
                    }
                },
                enabled: !input.isDisabled,
                source: this._getComboOptions(input.options, input.id),
                onValueChanged: (newValue: string) => { this._onComboOptionChanged(input.id, newValue, input.options); },
                required: !this.props.isLoading && input.isRequired,
                hideErrorMessage: input.isDisabled,
                isCaseSensitive: true,
                comboBoxDropOptions: comboDropOptions,
                onValidation: ArtifactUtility.isDefinitionInput(input.id) ? (isValid: boolean) => { this._setDefinitionTypeValidity(isValid); } : null
            };

            if (FeatureFlagUtils.isSearchBuildDefinitionsOnServerEnabled() && input.isSearchable && input.isMoreDataAvailable) {
                return (
                    <SearchableComboBoxInputComponent
                        {...comboBoxInputProps}
                        aria-label= {input.name}
                        errorMessage= {Resources.RequiredInputWithOption}
                        getSearchButtonState= {() => { return {isMoreDataAvailable: input.isMoreDataAvailable}; }}
                        onSearch={(searchText: string) => { return this._onSearchArtifactInput(input.id, searchText); }} />
                );
            }
            else {
                return (
                        <ComboBoxInputComponent
                            aria-label= {input.name}
                            errorMessage= {Resources.RequiredInputErrorMessage}
                            {...comboBoxInputProps} />
                    );
            }
        }
    }

    private _getPickListComponent(input: IArtifactInput, index: string): JSX.Element {
        let properties: IDictionaryStringTo<string> = { "MultiSelectFlatList": "true" };

        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: input.description
            }
        };

        let options: IDictionaryStringTo<string> = {};
        if (input.options) {
            input.options.forEach((option) => {
                options[option.Key] = option.Value;
            });
        }

        let returnValue = (<PickListInputComponent
            label={input.name}
            aria-label={input.name}
            properties={properties}
            key={input.name + index}
            infoProps={infoProps}
            options={options}
            value={input.selectedValue}
            onValueChanged={(newValue: string) => { this._onPickListOptionChanged(input.id, newValue, input.options); }}
            showSelectAll={true}
            readOnly={input.isDisabled}
            disabled={input.isDisabled}
            required={!this.props.isLoading && input.isRequired} />);

        return returnValue;
    }

    private _setDefinitionTypeValidity(isValid: boolean) {
        this._isDefinitionArtifactInValid = !isValid;
    }

    private _showManageLink(input: IArtifactInput): boolean {
        if (this.props.selectedArtifact !== Types.ArtifactTypes.Build &&
            (input.id === PipelineArtifactDefinitionConstants.ConnectionId || input.isConnectedService)) {
            return true;
        }
        return false;
    }

    private _getConnectedServiceComponent(input: IArtifactInput, index: string, selectedValue: string) {
        let connectedServiceInputControlProps: IConnectedServiceInputProps = this._getConnectedServiceInputControlProps(input, selectedValue);
        return (<ConnectedServiceInputComponent key={input.name + index} {...connectedServiceInputControlProps} />);
    }

    private _getConnectedServiceInputControlProps(input: IArtifactInput, selectedValue: string): IConnectedServiceInputProps {
        let connectedServiceOptions: IDictionaryStringTo<string> = {};
        let value = Utils_String.empty;
        input.options.forEach((option: IKeyValuePairWithData) => {
            if (selectedValue === option.Value) {
                value = option.Key;
            }
            connectedServiceOptions[option.Key] = option.Value;
        });

        let serviceType: string = input.isConnectedService ? input.type.split(":")[1] : this.props.selectedArtifact;
        let authSchemes = Utils_String.empty;

        if (serviceType.indexOf(",") > 0) {
            authSchemes = serviceType.substring(serviceType.indexOf(",") + 1);
            serviceType = serviceType.substring(0, serviceType.indexOf(","));
        }

        let connectedServiceInputProp: IConnectedServiceInputProps = {
            label: input.name,
            onValueChanged: (newKey: string) => { this._onConnectionServiceOptionChanged(input.id, newKey, input.options); },
            onOptionsChanged: (newOptions: IDictionaryStringTo<string>) => {
                this._onInputPossibleValuesChanged(input.id, selectedValue, newOptions, value);
            },
            onConnectionAdded: (newOptions: IDictionaryStringTo<string>, newKey: string) => {
                this._onConnectionServiceOptionChanged(input.id, newKey, this._getKeyValuePairWithData(newOptions));
            },
            ariaLabel: input.name,
            connectedServiceType: this.props.selectedArtifactEndpointTypeId,
            authSchemes: authSchemes,
            options: connectedServiceOptions,
            properties: {},
            disabled: input.isDisabled,
            required: !input.isDisabled,
            readOnly: input.isDisabled,
            value: value,
            setConnectionNameInFocus: true,
            hideNewButton: this.props.selectedArtifactEndpointTypeId !== Types.ArtifactTypes.GitHubId,
            getErrorMessage: (newValue: string) => {
                return this._getErrorMessage(newValue);
            }
        };

        return connectedServiceInputProp;
    }

    // Converts dictionary to IKeyValue pair with data
    private _getKeyValuePairWithData(newOptions: IDictionaryStringTo<string>): IKeyValuePairWithData[] {
        let options: IKeyValuePairWithData[] = [];
        for (let key in newOptions) {
            if (newOptions.hasOwnProperty(key)) {
                options.push({ Key: key, Value: newOptions[key] });
            }
        }
        return options;
    }

    private _getErrorMessage(newValue: string): string {
        if (!newValue) {
            return Resources.RequiredInputErrorMessage;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _getInfoProps(input: IArtifactInput): IInfoProps {
        let returnValue: IInfoProps;
        if (input && !!input.description) {
            returnValue = {
                calloutContentProps: {
                    calloutMarkdown: input.description
                }
            };
        }
        return returnValue;
    }

    private _getBranchFilterComponent(input: IArtifactInput, index: string): JSX.Element {
        let repoId: string = Utils_String.empty;
        if (input.properties && input.properties.hasOwnProperty(ArtifactsConstants.BuildRepository)) {
            repoId = input.properties[ArtifactsConstants.BuildRepository];
        }

        if (!repoId) {
            return null;
        }

        let demandsCallout: ICalloutContentProps = {
            calloutMarkdown: input.description
        };

        let returnValue: JSX.Element = (<div className="branch-filter-component" key={"branch-container" + index}>
            <Label className="branch-input-label">
                {input.name}
            </Label>
            <InfoButton
                cssClass="branch-input-info"
                calloutContent={demandsCallout}
            />

            <BuildBranchFilterComponent
                key={input.name + index}
                repositoryId={repoId}
                branchFilter={input.selectedValue ? input.selectedValue : Utils_String.empty}
                onBranchFilterChange={(branch: string) => { this._onBranchFilterChange(input, branch); }}
                allowUnmatchedSelection={true}
                supportVariables={true}
                updateOnBlur={true} />
        </div>);

        return returnValue;
    }

    private _getTextFeildComponent(input: IArtifactInput, index: string, isMultiLine: boolean, isPassword: boolean): JSX.Element {
        //TODO: remove this methid if we cannot have inputs like password/textarea etc
        let textFieldType: string = isPassword ? "password" : Utils_String.empty;
        let returnValue = (<TextField
            key={input.name + index}
            label={input.name}
            defaultValue={input.defaultValue}
            multiline={isMultiLine}
            disabled={input.isDisabled}
            type={textFieldType}
            onChanged={(value) => { this._onInputOptionsChanged(input.id, value); }}
        />);
        return returnValue;
    }

    private _getTagComponent(input: IArtifactInput, index: string): JSX.Element {
        let selectedItems: string[] = TagUtils.getTags(input.selectedValue);
        let selectedTags: ITag[] = selectedItems ? selectedItems.map(item => ({ key: item, name: item })) : [];
        let allTags: ITag[] = [];
        if (input.options) {
            input.options.forEach((inputOption: IKeyValuePairWithData) => {
                allTags.push({ key: inputOption.Key, name: inputOption.Value });
            });
        }
        let returnValue = (<div className="tags-pickter-container" key={"tags-container" + index}>
            <Label>
                {input.name}
            </Label>
            <TagPickerComponent
                className={"artifact-tag-picker"}
                key={input.name + index}
                selectedItems={selectedTags}
                items={allTags}
                includeUserEnteredTextInSuggestedTags={true}
                getTagForText={(text) => { return { key: text, name: text }; }}
                onChange={(items: ITag[]) => this._onTagsChange(items, input)}
                inputProps={{
                    "aria-label": Resources.ArtifactTagPickerInputAriaLabel
                }}>
            </TagPickerComponent>
        </div>);

        return returnValue;
    }

    private _onTagsChange = (items: ITag[], input: IArtifactInput) => {
        let selectedTags: string = TagUtils.getDisplayValue(items.map((item) => item.key));
        this.props.onUpdateArtifactInput({
            inputId: input.id,
            displayValue: selectedTags,
            selectedValueKey: selectedTags,
            type: this.props.selectedArtifact
        });
    }

    private _getBooleanInputComponent(input: IArtifactInput, index: string): JSX.Element {
        let returnValue = (<BooleanInputComponent
            value={DtcUtils.getBoolValue(input.defaultValue)}
            label={input.name}
            key={input.name + index}
            readOnly={input.isDisabled}
            disabled={input.isDisabled}
            ariaLabel={input.name}
            ariaDescription={input.name}
            forceUpdate={true}
            onValueChanged={(value: boolean) => { this._onInputOptionsChanged(input.id, value.toString()); }}
            infoProps={this._getInfoProps(input)}
        />);

        return returnValue;
    }

    private _getChoiceFieldComponent(input: IArtifactInput, index: string): JSX.Element {
        let returnValue = (<ChoiceGroup
            key={input.name + index}
            options={this._getChoiceGroupOptions(input.options, input.selectedValue)}
            disabled={input.isDisabled}
            onChanged={(option: IChoiceGroupOption, evt?: React.SyntheticEvent<HTMLInputElement>) => { this._onInputOptionsChanged(input.id, option.text, option.key.toString()); }}
        />);
        return returnValue;
    }

    private _onArtifactAliasChange(alias: string) {
        this.props.onUpdateArtifactAlias(this.props.selectedArtifact, alias);
    }

    private _textFieldValidationTimeout: number = 500;
    private _maxDropdownWidth: number = 588;
    private _stopChildRendering: boolean;
    private _isDefinitionArtifactInValid: boolean;
}
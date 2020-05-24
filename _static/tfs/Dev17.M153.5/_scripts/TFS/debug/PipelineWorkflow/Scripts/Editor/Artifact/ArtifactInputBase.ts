/**
 * @brief Base Store for Base Artifact Input
 */

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { PipelineArtifactConstants, PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { ArtifactDefinitionConstants } from "ReleaseManagement/Core/Constants";

import * as Diag from "VSS/Diag";

import {
    VisibilityHelper,
    IVisibilityRule
} from "DistributedTaskControls/Components/Task/VisibilityHelper";
import { IInputBaseState } from "DistributedTaskControls/Common/Types";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export interface IKeyValuePairWithData {
    Key: string;
    Value: string;
    Data?:  {
        [key: string]: any;
    };
}

export abstract class ArtifactInputBase {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        this._inputDescriptor = inputDescriptor;
        this._validator = validator;
        this._update(inputDescriptor);
    }

    public getId(): string {
        return this._id;
    }

    public getType(): string {
        return this._type;
    }

    public isVisible(): boolean {
        return this._isVisible && this.isVisibilityFeatureFlagEnabled();
    }

    public isInvalid(): boolean {
        return !this._validator.validate(this.getValue()) || this._isInvalidBranchInput();
    }

    public isConnectedService(): boolean {
        return this.getInputMode() === InputMode.Combo && !!this._type && !!this._type.trim() && this._type.toLowerCase().indexOf(ArtifactsConstants.ConnectedServicePrefix) === 0;
    }

    public isRoot(): boolean {
        return this.getDependencyInputIds().length === 0;
    }

    public isRequired(): boolean {
        return !!(this._inputDescriptor && this._inputDescriptor.validation && this._inputDescriptor.validation.isRequired);
    }

    public getDependencyInputIds(): string[] {
        return this._inputDescriptor.dependencyInputIds || [];
    }

    public getDescription(): string {
        return this._description;
    }

    public getInputValues(): Contracts_FormInput.InputValues {
        return this._inputDescriptor.values;
    }

    public hasDynamicValues(): boolean {
        return this._inputDescriptor.hasDynamicValueInformation;
    }

    public updateValues(values: Contracts_FormInput.InputValues) {
        if (values.isReadOnly) {
            this._isReadOnly = values.isReadOnly;
        }

        this._inputDescriptor.values = values;
    }

    public getArtifactInputName(): string {
        return this._name;
    }

    public getIsLimitedToPossibleValues(): boolean {
        if (this._inputDescriptor && this._inputDescriptor.values) {
            return this._inputDescriptor.values.isLimitedToPossibleValues ? true : false;
        }

        return true;
    }

    public clear(): void {
        this._displayValue = Utils_String.empty;
        this._inputDescriptor.values = null;
    }

    public setDisplayValue(displayValue: string): void {
        this._displayValue = displayValue;
        this.containsDeletedOrUnauthorizedValue = false;
    }

    public getDisplayValue(): string {
        return this._displayValue;
    }

    public getContentVisibleRules(): IVisibilityRule[] {
        return [];
    }

    public getVisibilityRule(): IVisibilityRule {
        if (this._visibleRule === undefined) {
            if (!!this._inputDescriptor.properties) {
                this._visibleRule = VisibilityHelper.getVisibilityRule(this._inputDescriptor.properties[DeployPipelineConstants.PipelineConstant_artifactVisibleRule]);
            }
            else {
                this._visibleRule = null;
            }
        }

        return this._visibleRule;
    }

    public fixPossibleValues(updateValues: boolean): boolean {
        return false;
    }

    public containsDeletedOrUnauthorizedValues(): boolean {
        return this.containsDeletedOrUnauthorizedValue;
    }

    public setVisibility(visibilityDefiningInputs: ArtifactInputBase[]): void {
        if (Utils_String.ignoreCaseComparer(this._id, PipelineArtifactDefinitionConstants.ArtifactId) === 0) {
            this._isVisible = false;
            return;
        }

        let visibleRule = this.getVisibilityRule();
        if (!!visibleRule) {
            let convertedInputs: IInputBaseState[] = this.convertToIInputBaseState(visibilityDefiningInputs);
            this._isVisible = VisibilityHelper.getVisibility(visibleRule, convertedInputs);
            return;
        }

        this._isVisible = true;
    }

    public setContentVisibility(visibilityDefiningInputs: ArtifactInputBase[]): void {
    }

    public isDefaultVersionInput(): boolean {
        return Utils_String.ignoreCaseComparer(this._inputDescriptor.id, PipelineArtifactConstants.DefaultVersionType) === 0;
    }

    public isVisibilityFeatureFlagEnabled(): boolean {
        let properties = this._inputDescriptor.properties;
        if (!!properties && !!properties[DeployPipelineConstants.PipelineConstant_visibilityFeatureFlag]) {
            let featureFlag = properties[DeployPipelineConstants.PipelineConstant_visibilityFeatureFlag].trim();
            return !!FeatureAvailabilityService.isFeatureEnabled(featureFlag, false);
        }

        return true;
    }

    public abstract getInputMode(): InputMode;

    public abstract getValue(): string;

    //artifact properties which constitute the uniqueSourceIdentifier are not editable (once the artifact is added).
    //ex. In case of BuildArtifact, project and definition are parts of uniqueSourceIdentifier and hence not editable.
    //So, in that case, the function should return: ["project", "definition"]
    public isEditable(uniqueSourceIdentifierFields: string[]): boolean {
        for (let element of uniqueSourceIdentifierFields) {
            if (Utils_String.ignoreCaseComparer(this._inputDescriptor.id, element) === 0) {
                return false;
            }
        }
        return true;
    }

    public isDefaultVersionOrDependentInput(): boolean {
        return Utils_String.ignoreCaseComparer(this._inputDescriptor.id, PipelineArtifactConstants.DefaultVersionType) === 0 ||
            this._isDefaultVersionDependentInput();
    }
    
    public _isInvalidBranchInput(): boolean {
        let inputId = this.getId();
        let inputValue = this.getValue();

        if (inputValue && (inputId === PipelineArtifactDefinitionConstants.DefaultVersionBranchId || inputId === PipelineArtifactDefinitionConstants.BranchId || inputId === PipelineArtifactDefinitionConstants.BranchesId)) {
            return inputValue.indexOf("*") > -1;
        }

        return false;
    }

    public isSearchable(): boolean {
        let searchable: boolean = false;
        if (!!this._inputDescriptor.properties) {
            searchable = !!this._inputDescriptor.properties[ArtifactsConstants.IsSearchable];
        }

        return searchable;
    }

    public isMoreDataAvailable: boolean = false;

    private _isDefaultVersionDependentInput(): boolean {
        const isDefaultVersionBranchId: boolean = Utils_String.ignoreCaseComparer(this._inputDescriptor.id, ArtifactDefinitionConstants.BranchId) === 0 &&
            Utils_Array.contains(this._inputDescriptor.dependencyInputIds, ArtifactDefinitionConstants.DefaultVersionTypeId);

        return Utils_String.ignoreCaseComparer(this._inputDescriptor.id, PipelineArtifactConstants.DefaultVersionBranch) === 0 ||
            Utils_String.ignoreCaseComparer(this._inputDescriptor.id, PipelineArtifactConstants.DefaultVersionTags) === 0 ||
            Utils_String.ignoreCaseComparer(this._inputDescriptor.id, PipelineArtifactConstants.DefaultVersionSpecific) === 0 ||
            isDefaultVersionBranchId;
    }

    private _update(inputDescriptor: Contracts_FormInput.InputDescriptor) {
        this._id = inputDescriptor.id;
        this._name = inputDescriptor.name;
        this._description = inputDescriptor.description;
        // TODO: handle _showManageServicesLink later
        this._displayName = Utils_String.htmlEncode(this._name);
        this._type = inputDescriptor.type;
        // handle input visibility
        this._isVisible = !this._isDefaultVersionDependentInput() &&
            Utils_String.ignoreCaseComparer(this._id, PipelineArtifactDefinitionConstants.ArtifactId) !== 0;
    }

    protected convertToIInputBaseState(visibilityDefiningInputs: ArtifactInputBase[]): IInputBaseState[] {
        let convertedInputs: IInputBaseState[] = new Array<IInputBaseState>();

        visibilityDefiningInputs.forEach((input: ArtifactInputBase, index: number) => {
            let element: IInputBaseState = {
                inputName: input.getId(),
                inputValue: input.getValue(),
                isHidden: () => { return false; }
            };
            convertedInputs.push(element);
        });
        return convertedInputs;
    }

    private _displayValue: string;
    private _id: string;
    private _name: string;
    private _type: string;
    private _description: string;
    private _displayName: string;
    private _inputDescriptor: Contracts_FormInput.InputDescriptor;
    private _validator: ValidatorBase;
    private _isVisible: boolean = false;
    private _isReadOnly: boolean;
    private _visibleRule: IVisibilityRule;
    private _isMoreDataAvailable: boolean;
    protected containsDeletedOrUnauthorizedValue: boolean;
}
/**
 * @brief Manages input dependency
 */

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import {
    PipelineArtifactTypeDefinition,
    PipelineArtifactConstants,
    PipelineArtifactDefinitionConstants
} from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";

import {
    IPredicateRule,
    IVisibilityRule,
    VisibilityHelper
} from "DistributedTaskControls/Components/Task/VisibilityHelper";

export class InputDependencyManager {

    constructor(artifactType: PipelineArtifactTypeDefinition, inputs: ArtifactInputBase[]) {
        this._artifactType = artifactType;
        this._inputs = inputs;
        this._buildDependencyMap();
    }

    /**
     * @brief constructs value input query
     * @param input
     */
    public getInputValueQuery(input: ArtifactInputBase, updatedValue: string): Contracts_FormInput.InputValuesQuery {

        if (!input) {
            return null;
        }

        let dependents: ArtifactInputBase[] = this._dependencyMap[input.getId()];
        let inputValuesQueryList: Contracts_FormInput.InputValues[] = [];
        let currentValues: IDictionaryStringTo<string> = {};

        // find dependents
        let dependentIds: string[] = [];
        this._populateDependentInputIds(dependents, dependentIds);

        this._fillQueryInputParams(input, dependents, inputValuesQueryList, currentValues, dependentIds, updatedValue);

        let query: Contracts_FormInput.InputValuesQuery = {
            currentValues: currentValues,
            inputValues: inputValuesQueryList,
            resource: this._artifactType.name
        };

        return query;
    }

    /**
     * @brief handle visiblity of dependent inputs
     * @param input
     */
    public handleVisibility(input: ArtifactInputBase): void {
        if (!input) {
            return;
        }

        let inputId = input.getId();
        let dependents = this._visibilityDependencyMap[inputId];
        if (!!dependents) {
            dependents.forEach((dependent: ArtifactInputBase) => {
                let visibilityDefiningInputs: ArtifactInputBase[] = this._visibilityDefiningInputMap[dependent.getId()];
                dependent.setVisibility(visibilityDefiningInputs);
            });
        }
    }

    public handleContentVisibility(input: ArtifactInputBase): void {
        if (!input) {
            return;
        }

        let inputId = input.getId();
        let dependents = this._visibilityDependencyMap[inputId];
        if (!!dependents) {
            dependents.forEach((dependent: ArtifactInputBase) => {
                let visibilityDefiningInputs: ArtifactInputBase[] = this._visibilityDefiningInputMap[dependent.getId()];
                dependent.setContentVisibility(visibilityDefiningInputs);
            });
        }
    }

    /**
     * @brief clear dependents recursively
     * @param input
     */
    public clearDependents(input: ArtifactInputBase): void {
        if (!input) {
            return;
        }

        let dependents = this._dependencyMap[input.getId()];
        let dependentIds: string[] = [];
        this._populateDependentInputIds(dependents, dependentIds);
        dependentIds.forEach((inputId: string) => {
            let input: ArtifactInputBase = this._inputsMap[inputId];
            input.clear();
            this.handleVisibility(input);
        });
    }

    /**
     * @brief populates necessary parameters for fetching dependent query inputs.
     */
    private _fillQueryInputParams(input: ArtifactInputBase,
        dependents: ArtifactInputBase[],
        inputValuesList: Contracts_FormInput.InputValues[],
        currentValues: IDictionaryStringTo<string>,
        dependentIds: string[],
        updatedValue: string): void {

        if (dependents) {
            dependents.forEach((dependentInput: ArtifactInputBase) => {
                let skipDependent = false;
                let tempCurrentValues: IDictionaryStringTo<string> = {};

                dependentInput.getDependencyInputIds().every((id: string, index: number, inputIds: string[]) => {
                    if (!skipDependent) {
                        let parentInput = this._inputsMap[id];
                        if (!!parentInput && this._isInputValueValid(input, parentInput, updatedValue)
                            && !Utils_Array.contains(dependentIds, parentInput.getId())) {
                            tempCurrentValues[parentInput.getId()] =
                                this._getCurrentValue(this._getInputValue(input, parentInput, updatedValue), parentInput.getInputValues());
                        }
                        else if (!!parentInput && Utils_String.ignoreCaseComparer(dependentInput.getId(), PipelineArtifactDefinitionConstants.ArtifactId) === 0) {
                            tempCurrentValues[parentInput.getId()] = Utils_String.empty;
                        }
                        else {
                            skipDependent = true;
                            return false;
                        }
                    }
                    return true;
                });

                if (!skipDependent) {
                    // Populate input ids for dependent values.
                    let inputValues = <Contracts_FormInput.InputValues>{};
                    inputValues.inputId = dependentInput.getId();
                    if (!(Utils_String.ignoreCaseComparer(inputValues.inputId, PipelineArtifactDefinitionConstants.DefaultVersionTagsId) === 0)) {
                        inputValuesList.push(inputValues);
                    }

                    for (let id in tempCurrentValues) {
                        if (tempCurrentValues.hasOwnProperty(id) && !currentValues[id]) {
                            currentValues[id] = tempCurrentValues[id];
                        }
                    }
                }
            });
        }

    }

    private _getInputValue(input: ArtifactInputBase, parentInput: ArtifactInputBase, updatedValue: string): string {
        return (parentInput === input ? updatedValue : parentInput.getDisplayValue());
    }

    private _isInputValueValid(input: ArtifactInputBase, parentInput: ArtifactInputBase, updatedValue: string): boolean {
        return (parentInput === input ? !!updatedValue : !parentInput.isInvalid());
    }

    /**
     * @brief popuplates input dependentid of an input recursively
     */
    private _populateDependentInputIds(dependents: ArtifactInputBase[], dependentIds: string[]): void {
        if (dependents) {
            dependents.forEach((dependent: ArtifactInputBase) => {
                if (!Utils_Array.contains(dependentIds, dependent.getId())) {
                    if (this._dependencyMap[dependent.getId()]) {
                        this._populateDependentInputIds(this._dependencyMap[dependent.getId()], dependentIds);
                    }

                    dependentIds.push(dependent.getId());
                }
            });
        }
    }

    /**
     * @brief gets the actual value of the input
     */
    private _getCurrentValue(displayValue: string, inputValues: Contracts_FormInput.InputValues): string {

        if (inputValues && inputValues.possibleValues && inputValues.possibleValues.length > 0) {
            let returnValue = Utils_Array.first(inputValues.possibleValues,
                (inputValue: Contracts_FormInput.InputValue): boolean => {
                    return inputValue.displayValue === displayValue;
                });

            if (!returnValue) {
                returnValue = Utils_Array.first(inputValues.possibleValues,
                    (inputValue: Contracts_FormInput.InputValue): boolean => {
                        return inputValue.value === displayValue;
                    });
            }

            if (!returnValue) {
                return inputValues.isLimitedToPossibleValues ? Utils_String.empty : displayValue;
            }
            else if (!returnValue.value) {
                return returnValue.displayValue;
            }
            else {
                return returnValue.value;
            }
        }
        else {
            return displayValue;
        }
    }

    /**
     * @brief builds parent to child input dependency map
     */
    private _buildDependencyMap() {
        this._inputs.forEach((input: ArtifactInputBase) => {
            this._buildDependencyMapForInput(input);
            this._buildVisiblityDefiningInputMap(input);
            this._buildVisiblityDependencyMap(input);
            this._inputsMap[input.getId()] = input;
        });
    }

    private _buildDependencyMapForInput(input: ArtifactInputBase) {
        let dependencyInputIds: string[] = input.getDependencyInputIds();
        if (dependencyInputIds && dependencyInputIds.length > 0) {
            dependencyInputIds.forEach((id: string) => {
                if (!this._dependencyMap[id]) {
                    this._dependencyMap[id] = [];
                }
                this._dependencyMap[id].push(input);
            });
        }
    }

    private _buildVisiblityDefiningInputMap(input: ArtifactInputBase) {
        this._visibilityDefiningInputMap[input.getId()] = [];
        this._buildVisiblityDefiningInputMapFromVisibilityRule(input.getVisibilityRule(), input);
        input.getContentVisibleRules().forEach((visibleRule) => this._buildVisiblityDefiningInputMapFromVisibilityRule(visibleRule, input));
    }

    private _buildVisiblityDefiningInputMapFromVisibilityRule(visibilityRule: IVisibilityRule, input: ArtifactInputBase): void {
        if (!!visibilityRule && !!visibilityRule.predicateRules) {
            visibilityRule.predicateRules.forEach((rule: IPredicateRule) => {
                this._inputs.some((artifactInput: ArtifactInputBase): boolean => {
                    if (Utils_String.ignoreCaseComparer(artifactInput.getId(), rule.inputName) === 0) {
                        this._visibilityDefiningInputMap[input.getId()].push(artifactInput);
                        return true;
                    }

                    return false;
                });
            });
        }
    }

    private _buildVisiblityDependencyMap(input: ArtifactInputBase) {
        let visibilityDefiningInputs = this._visibilityDefiningInputMap[input.getId()];
        if (!!visibilityDefiningInputs && visibilityDefiningInputs.length > 0) {
            visibilityDefiningInputs.forEach((definingInput: ArtifactInputBase) => {
                let id = definingInput.getId();
                if (!this._visibilityDependencyMap[id]) {
                    this._visibilityDependencyMap[id] = [];
                }

                this._visibilityDependencyMap[id].push(input);
            });
        }
    }

    private _inputs: ArtifactInputBase[];
    private _artifactType: PipelineArtifactTypeDefinition;

    // Stores the list of inputs who depend on the key input.
    private _dependencyMap: IDictionaryStringTo<ArtifactInputBase[]> = {};

    // Stores list of inputs for a key, defining the list of inputs whose visibility depends on the key input.
    private _visibilityDependencyMap: IDictionaryStringTo<ArtifactInputBase[]> = {};

    // Stores the list of inputs who determine the visibility of the Key Input.
    private _visibilityDefiningInputMap: IDictionaryStringTo<ArtifactInputBase[]> = {};

    // Stores the artifact input object for the given input id.
    private _inputsMap: IDictionaryStringTo<ArtifactInputBase> = {};
}
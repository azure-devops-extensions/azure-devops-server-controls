/// <reference types="react" />

import * as React from "react";
import { RuleCondition, FieldType } from "TFS/WorkItemTracking/ProcessContracts";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import {
    FieldAndValueInput,
    FieldOnlyInput,
    StateTransitionInput,
    StateValueInput
} from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/RuleInputs";
import { RuleValidationConstants } from "WorkCustomization/Scripts/Constants";

export interface IConditionParameterEditorProps {
    processId: string;
    workItemTypeRefName: string;
    condition: RuleCondition;
    currentConditionType: string;
    isDisabled: boolean;
    conditionParametersChanged?: (value1: string, value2: string) => void;
}

export const ConditionParametersEditor: React.StatelessComponent<IConditionParameterEditorProps> = (props: IConditionParameterEditorProps): JSX.Element => {
    if (props.condition) {
        switch (props.currentConditionType) {
            case Resources.RulesConditionsStateChangedTo:
            case Resources.RulesConditionsStateIs:
            case Resources.RulesConditionsStateIsNot:

                return <StateValueInput
                    value1={props.condition.field}
                    value2={props.condition.value}
                    onValueChanged={props.conditionParametersChanged}
                    processId={props.processId}
                    witRefName={props.workItemTypeRefName}
                    key={props.currentConditionType}
                    disabled={props.isDisabled} />

            case Resources.RulesConditionsStateChangedFromAndTo:

                let parts: string[] = props.condition.value.split('.');
                return <StateTransitionInput
                    value1={parts[0]}
                    value2={parts[1]}
                    onValueChanged={props.conditionParametersChanged}
                    processId={props.processId}
                    witRefName={props.workItemTypeRefName}
                    key={props.currentConditionType}
                    disabled={props.isDisabled} />

            case Resources.RulesConditionsValueEquals:

                return <FieldAndValueInput middleString={"="}
                    hiddenFieldTypes={[FieldType.Identity, FieldType.DateTime]}
                    value1={props.condition.field}
                    value2={props.condition.value}
                    onValueChanged={props.conditionParametersChanged}
                    requireValue={true}
                    maxValueLength={RuleValidationConstants.MaxFieldValueLength}
                    processId={props.processId}
                    explicitShowState={props.isDisabled}
                    witRefName={props.workItemTypeRefName}
                    key={props.currentConditionType}
                    disabled={props.isDisabled} />

            case Resources.RulesConditionsValueNotEquals:

                return <FieldAndValueInput middleString={"≠"}
                    hiddenFieldTypes={[FieldType.Identity, FieldType.DateTime]}
                    value1={props.condition.field}
                    value2={props.condition.value}
                    onValueChanged={props.conditionParametersChanged}
                    requireValue={true}
                    maxValueLength={RuleValidationConstants.MaxFieldValueLength}
                    processId={props.processId}
                    witRefName={props.workItemTypeRefName}
                    disabled={props.isDisabled}
                    explicitShowState={props.isDisabled}
                    key={props.currentConditionType}  />

            case Resources.RulesConditionsValueDefined:
            case Resources.RulesConditionsValueNotDefined:
            case Resources.RulesConditionsFieldChanged:
            case Resources.RulesConditionsFieldNotChanged:

                return <FieldOnlyInput value1={props.condition.field}
                    onValueChanged={props.conditionParametersChanged}
                    processId={props.processId}
                    witRefName={props.workItemTypeRefName}
                    disabled={props.isDisabled}
                    key={props.currentConditionType}
                    explicitShowState={props.isDisabled} />

            case Resources.RulesConditionsStateNotChanged:
            case Resources.RulesConditionsWorkItemIsCreated:
            default:
                return null;
        }
    }

    return null;
}


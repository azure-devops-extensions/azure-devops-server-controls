import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

let conditionToIconMap: IDictionaryStringTo<string>;

export const getConditionIcon = (conditionType: string): string => {
    if (conditionToIconMap) {
        return conditionToIconMap[conditionType];
    }

    conditionToIconMap = {};
    conditionToIconMap[Resources.RulesConditionsWorkItemIsCreated] = "bowtie-icon bowtie-toggle-expand fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsStateChangedTo] = "bowtie-icon bowtie-map-destination-fill fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsStateChangedFromAndTo] = "bowtie-icon bowtie-switch fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsStateIs] = "bowtie-icon bowtie-map-pin-fill fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsStateIsNot] = "bowtie-icon bowtie-map-pin fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsStateNotChanged] = "bowtie-icon bowtie-map-destination fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsValueEquals] = "bowtie-icon bowtie-math-equal fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsValueNotEquals] = "bowtie-icon bowtie-math-not-equal fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsValueDefined] = "bowtie-icon bowtie-field-filled fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsValueNotDefined] = "bowtie-icon bowtie-field-empty fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsFieldChanged] = "bowtie-icon bowtie-field-changed fabric-dropdown-icon";
    conditionToIconMap[Resources.RulesConditionsFieldNotChanged] = "bowtie-icon bowtie-field-not-changed fabric-dropdown-icon";

    return getConditionIcon(conditionType);
}

let actionToIconMap: IDictionaryStringTo<string>;

export const getActionIcon = (actionType: string): string => {
    if (actionToIconMap) {
        return actionToIconMap[actionType];
    }

    actionToIconMap = {};

    actionToIconMap[Resources.RulesActionClear] = "bowtie-icon bowtie-field-not-changed fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionCopyTo] = "bowtie-icon bowtie-edit-copy fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionMakeReadOnly] = "bowtie-icon bowtie-field-readonly fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionMakeRequired] = "bowtie-icon bowtie-field-required fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionsSetValueOf] = "bowtie-icon bowtie-field-changed fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionsSetDefaultValue] = "bowtie-icon bowtie-field-changed fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionsSetCurrentTime] = "bowtie-icon bowtie-status-waiting fabric-dropdown-icon";
    actionToIconMap[Resources.RulesActionsCurrentUser] = "bowtie-icon bowtie-user fabric-dropdown-icon";

    return getActionIcon(actionType);
}
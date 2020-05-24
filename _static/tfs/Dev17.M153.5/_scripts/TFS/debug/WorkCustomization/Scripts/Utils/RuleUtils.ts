import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import  ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { RuleCondition, CustomizationType, RuleConditionType, RuleActionType, ProcessRule, UpdateProcessRuleRequest} from "TFS/WorkItemTracking/ProcessContracts";
import { RulesConstants } from "WorkCustomization/Scripts/Constants";
import StringUtils = require("VSS/Utils/String");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";


export namespace RuleUtils {
    export const getClone = (rule: ProcessRule): ProcessRule => {
        rule = {
            actions: rule.actions,
            conditions: rule.conditions,
            name: rule.name, // THE ORDER OF THESE FIELDS NEEDS TO MATCH FIELDRULEMODEL FOR TOJSON ISDIRTY CHECK TO WORK
            id: rule.id,
            isDisabled: rule.isDisabled,
            customizationType: rule.customizationType,
            url : rule.url
        };

        return JSON.parse(JSON.stringify(rule));
    }

    export const cloneUpdateProcessRuleRequest = (rule: UpdateProcessRuleRequest): UpdateProcessRuleRequest => {
        rule = {
            actions: rule.actions,
            conditions: rule.conditions,
            name: rule.name, 
            isDisabled: rule.isDisabled,
            id: rule.id,
        };
        return JSON.parse(JSON.stringify(rule));
    }

    export const getNewRule = (id?: string): ProcessRule => {
        let emptyRule: ProcessRule = {
            actions: [{
                actionType: null,
                targetField: "",
                value: ""
            }],
            conditions: [{
                conditionType: null,
                field: "",
                value: ""
            }],
            name: "",
            id: id ? id : "",
            isDisabled: false,
            customizationType: ProcessContracts.CustomizationType.Custom,
            url : ""
        };
        return emptyRule;
    }


    export const translateClientRuleToServerRule = (clientRule: ProcessRule): ProcessRule => {
        if (!clientRule.conditions) {
            return clientRule;
        }

        // clone before modification
        clientRule = CommonUtils.getClone<ProcessRule>(clientRule);

        let whenStateChangedToConditionIndex: number;
        let whenStateChangedFromAndToConditionIndex: number;
        let whenWorkItemCreatedIndex: number;
        let whenValueIsDefinedIndex: number;
        let whenValueIsNotDefinedIndex: number;

        for (let i = 0; i < clientRule.conditions.length; i++) {

            switch (clientRule.conditions[i].conditionType) {
                case RuleConditionType.WhenStateChangedTo:
                    whenStateChangedToConditionIndex = i;
                    break;
                case RuleConditionType.WhenStateChangedFromAndTo:
                    whenStateChangedFromAndToConditionIndex = i;
                    break;
                case RuleConditionType.WhenWorkItemIsCreated:
                    whenWorkItemCreatedIndex = i;
                    break;
                case RuleConditionType.WhenValueIsDefined:
                    whenValueIsDefinedIndex = i;
                    break;
                case RuleConditionType.WhenValueIsNotDefined:
                    whenValueIsNotDefinedIndex = i;
                    break;
                // Else nothing to do
            }
        }

        if (whenValueIsDefinedIndex != null) {
            clientRule.conditions[whenValueIsDefinedIndex].conditionType = RuleConditionType.WhenNot;
        }
        if (whenValueIsNotDefinedIndex != null) {
            clientRule.conditions[whenValueIsNotDefinedIndex].conditionType = RuleConditionType.When;
        }

        if (whenStateChangedFromAndToConditionIndex != null) {
            // '.' is not allowed in a state name, so we use it to cram in two values in our client side translation code
            let parts: string[] = clientRule.conditions[whenStateChangedFromAndToConditionIndex].value.split('.');
            let whenWasCondition: RuleCondition = {
                conditionType: RuleConditionType.WhenWas,
                field: CoreFieldRefNames.State,
                value: parts[0]
            };
            let whenCondition: RuleCondition = {
                conditionType: RuleConditionType.When,
                field: CoreFieldRefNames.State,
                value: parts[1]
            };

            clientRule.conditions.splice(whenStateChangedFromAndToConditionIndex, 1, whenWasCondition, whenCondition);
        }
        else if (whenStateChangedToConditionIndex != null) {
            let whenChangedCondition: RuleCondition = {
                conditionType: RuleConditionType.WhenChanged,
                field: CoreFieldRefNames.State,
                value: null
            };
            let whenCondition: RuleCondition = {
                conditionType: RuleConditionType.When,
                field: CoreFieldRefNames.State,
                value: clientRule.conditions[whenStateChangedToConditionIndex].value
            };

            clientRule.conditions.splice(whenStateChangedToConditionIndex, 1, whenChangedCondition, whenCondition);
        }
        else if (whenWorkItemCreatedIndex != null) {
            let parts: string[] = clientRule.conditions[whenWorkItemCreatedIndex].value.split('.');
            let whenWasCondition: RuleCondition = {
                conditionType: RuleConditionType.WhenWas,
                field: CoreFieldRefNames.State,
                value: parts[0]
            };
            let whenCondition: RuleCondition = {
                conditionType: RuleConditionType.When,
                field: CoreFieldRefNames.State,
                value: parts[1]
            };

            clientRule.conditions.splice(whenWorkItemCreatedIndex, 1, whenWasCondition);
        }

        for (var i = 0; i < clientRule.actions.length; i++) {
            var action = clientRule.actions[i];
            if (action.actionType === RuleActionType.SetValueToEmpty) {
                action.actionType = RuleActionType.CopyValue;
                action.value = "";
            }
        }

        return clientRule;
    }

    export const translateServerRuleToClientRule = (serverRule : ProcessRule ): ProcessRule => {
        if (!serverRule.conditions) {
            return serverRule;
        }

        // clone before modification
        serverRule = CommonUtils.getClone<ProcessRule>(serverRule);

        let whenStateChangedConditionIndex: number = -1;
        let whenStateConditionIndex: number = -1;
        let whenStateWasConditionIndex: number = -1;
        let whenWithEmptyValueIndex: number = -1;
        let notWhenWithEmptyValueIndex: number = -1;

        for (let i = 0; i < serverRule.conditions.length; i++) {
            // Translation only affects conditions on state
            if (serverRule.conditions[i].field === CoreFieldRefNames.State) {
                switch (serverRule.conditions[i].conditionType) {
                    case RuleConditionType.When:
                        whenStateConditionIndex = i;
                        break;
                    case RuleConditionType.WhenChanged:
                        whenStateChangedConditionIndex = i;
                        break;
                    case RuleConditionType.WhenWas:
                        whenStateWasConditionIndex = i;
                        break;
                    // Else nothing to do
                }
            }
            else {
                let condition = serverRule.conditions[i];
                if (!condition.value) {
                    if (condition.conditionType === RuleConditionType.When) {
                        condition.conditionType = RuleConditionType.WhenValueIsNotDefined;
                    } else if (condition.conditionType === RuleConditionType.WhenNot) {
                        condition.conditionType = RuleConditionType.WhenValueIsDefined;
                    }
                }
            }
        }

        if (whenStateWasConditionIndex !== -1 && whenStateConditionIndex !== -1) {
            // '.' is not allowed in a state name, so we use it to cram in two values in our client side translation code
            // If we found both whenwas and when for state, those two conditions map to client option "when state changes from and to"
            let newClientOnlyCondition: RuleCondition = null;
            // We don't allow this in new rule engine, to support backcompat for rules created earlier we are keeping it.
            if (!serverRule.conditions[whenStateWasConditionIndex].value) {
                newClientOnlyCondition = {
                    conditionType: RuleConditionType.WhenWorkItemIsCreated,
                    field: CoreFieldRefNames.State,
                    value: serverRule.conditions[whenStateWasConditionIndex].value + "." + serverRule.conditions[whenStateConditionIndex].value
                };
            }
            else {
                newClientOnlyCondition = {
                    conditionType: RuleConditionType.WhenStateChangedFromAndTo,
                    field: CoreFieldRefNames.State,
                    value: serverRule.conditions[whenStateWasConditionIndex].value + "." + serverRule.conditions[whenStateConditionIndex].value
                };
            }

            // Remove both old conditions. Remove largest index first, because removing the smaller index
            // would affect which item the larger index
            if (whenStateWasConditionIndex > whenStateConditionIndex) {
                serverRule.conditions.splice(whenStateWasConditionIndex, 1);
                serverRule.conditions.splice(whenStateConditionIndex, 1);
            }
            else {
                serverRule.conditions.splice(whenStateConditionIndex, 1);
                serverRule.conditions.splice(whenStateWasConditionIndex, 1);
            }

            // Add new client-only condition that replaces them
            serverRule.conditions = serverRule.conditions.concat(newClientOnlyCondition);
        }
        else if (whenStateChangedConditionIndex !== -1 && whenStateConditionIndex !== -1) {
            // If we found both whenchanged and when for state, those two conditions map to client option "when state changes to"
            let newClientOnlyCondition: RuleCondition = {
                conditionType: RuleConditionType.WhenStateChangedTo,
                field: CoreFieldRefNames.State,
                value: serverRule.conditions[whenStateConditionIndex].value
            };

            // Remove both old conditions. Remove largest index first, because removing the smaller index
            // would affect which item the larger index
            if (whenStateChangedConditionIndex > whenStateConditionIndex) {
                serverRule.conditions.splice(whenStateChangedConditionIndex, 1);
                serverRule.conditions.splice(whenStateConditionIndex, 1);
            }
            else {
                serverRule.conditions.splice(whenStateConditionIndex, 1);
                serverRule.conditions.splice(whenStateChangedConditionIndex, 1);
            }

            // Add new client-only condition that replaces them
            serverRule.conditions = serverRule.conditions.concat(newClientOnlyCondition);
        }
        else if (whenStateWasConditionIndex !== -1 && !serverRule.conditions[whenStateWasConditionIndex].value) {
            // Condition for WorkItemCreated Rule. (When State was "")
            let newClientOnlyCondition: RuleCondition = {
                conditionType: RuleConditionType.WhenWorkItemIsCreated,
                field: CoreFieldRefNames.State,
                value: serverRule.conditions[whenStateWasConditionIndex].value + "."
            };

            // Remove server side condition
            serverRule.conditions.splice(whenStateWasConditionIndex, 1);
            // Add new client-only condition that replaces them
            serverRule.conditions = serverRule.conditions.concat(newClientOnlyCondition);
        }

        for (var i = 0; i < serverRule.actions.length; i++) {
            var action = serverRule.actions[i];
            if (action.actionType === RuleActionType.CopyValue && (action.value == null || action.value === "")) {
                action.actionType = RuleActionType.SetValueToEmpty;
            }
            if (action.value === null) {
                action.value = "";
            }
        }
        return serverRule;
    }

    export const ruleValueContainsInvalidCharacters = (value: string): boolean => {
        return value && (StringUtils.containsControlChars(value) || StringUtils.containsMismatchedSurrogateChars(value));
    }
}

export namespace RuleFieldGroupings {
    export const getExplicitlyDeniedSystemFields = () => {
        const explicitlyDeniedSystemFields = [CoreFieldRefNames.Reason,
                                            CoreFieldRefNames.AreaPath,
                                            CoreFieldRefNames.IterationPath,
                                            CoreFieldRefNames.History,
                                            CoreFieldRefNames.Id,
                                            CoreFieldRefNames.IterationId,
                                            CoreFieldRefNames.NodeName,
                                            CoreFieldRefNames.Tags,
                                            CoreFieldRefNames.Watermark,
                                            CoreFieldRefNames.BoardColumn,
                                            CoreFieldRefNames.BoardColumnDone,
                                            CoreFieldRefNames.BoardLane,
                                            CoreFieldRefNames.CommentCount];
        return explicitlyDeniedSystemFields;
    }
}
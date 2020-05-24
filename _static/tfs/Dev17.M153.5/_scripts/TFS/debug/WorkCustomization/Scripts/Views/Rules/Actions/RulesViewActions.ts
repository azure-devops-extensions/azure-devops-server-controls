import { Action } from "VSS/Flux/Action";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Q = require("q");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { getCollectionService } from "VSS/Service";
import { ProcessRule,RuleCondition, WorkItemStateResultModel, RuleAction, UpdateProcessRuleRequest, RuleConditionType, RuleActionType } from "TFS/WorkItemTracking/ProcessContracts";
import { setDialogAction, DialogType } from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { WorkItemTypesActionCreator, IGetWorkItemTypePayload } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { RuleUtils } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";
import { RulesDataActionsCreator } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesDataActions";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export function GetRuleActions() {
    return {
        updateRule: new Action<UpdateProcessRuleRequest>(),
        cancelFormAction: new Action<void>(),
        beginEditRule: new Action<UpdateProcessRuleRequest>(),
        endSaveRule: new Action<ProcessRule>(),
        endDeleteRule: new Action<{ ruleId: string, index: number }>()
    } as RulesViewActions;
}

export interface IStringAndIndex {
    index: number,
    text: string
}

export interface IEditRuleActionPayload {
    rule: ProcessRule;
    originalRule?: ProcessRule;
}

export interface RulesViewActions {
    updateRule: Action<UpdateProcessRuleRequest>;
    cancelFormAction: Action<void>;
    beginEditRule: Action<UpdateProcessRuleRequest>;
    endSaveRule: Action<ProcessRule>;
    endDeleteRule: Action<{ ruleId: string, index: number }>;
}

export class RulesViewActionCreator {

    private _actions: RulesViewActions;
    private _rulesDataActionsCreator: RulesDataActionsCreator;

    constructor(actions: RulesViewActions, rulesDataActionsCreator: RulesDataActionsCreator) {
        this._actions = actions;
        this._rulesDataActionsCreator = rulesDataActionsCreator;
    }

    public beginFetchWorkItemTypeRules(processId: string, witRefName: string, errorBarId?: string): IPromise<void> {
        return this._rulesDataActionsCreator.beginFetchWorkItemTypeRules(processId, witRefName, errorBarId);
    }

    public updateRule(updatedRule: UpdateProcessRuleRequest) {
        this._actions.updateRule.invoke(updatedRule);
    }

    public cancelFormEdits() {
        this._actions.cancelFormAction.invoke(null);
    }

    public beginSaveRule(ruleToSave: ProcessRule, processId: string, witRefNameForRules: string, errorBarId?: string): Q.Promise<void> {
        return this._rulesDataActionsCreator.beginSaveRule(ruleToSave, processId, witRefNameForRules, errorBarId, this._actions.endSaveRule);
    }

    public editRule(rule: UpdateProcessRuleRequest) {
        this._actions.beginEditRule.invoke(rule);
    }

    public addCondition(rule: UpdateProcessRuleRequest): void {
        rule = RuleUtils.cloneUpdateProcessRuleRequest(rule);

        if (!rule.conditions) {
            rule.conditions = [];
        }

        rule.conditions.push({
            conditionType: null,
            field: "",
            value: ""
        });

        this._actions.updateRule.invoke(rule);
    }

    public addAction(rule: ProcessRule): void {
        rule = RuleUtils.getClone(rule);

        if (!rule.actions) {
            rule.actions = [];
        }

        rule.actions.push({
            actionType: null,
            targetField: "",
            value: ""
        });

        this._actions.updateRule.invoke(rule);
    }


    public removeCondition(rule: ProcessRule, index: number): void {
        rule = RuleUtils.getClone(rule);

        rule.conditions.splice(index, 1);
        if (rule.conditions.length === 0) {
            rule.conditions.push({
                conditionType: null,
                field: "",
                value: ""
            });
        }

        this._actions.updateRule.invoke(rule);
    }

    public removeAction(rule: ProcessRule, index: number): void {
        rule = RuleUtils.getClone(rule);

        rule.actions.splice(index, 1);
        if (rule.actions.length === 0) {
            rule.actions.push({
                actionType: null,
                targetField: "",
                value: ""
            });
        }

        this._actions.updateRule.invoke(rule);
    }

    public changeConditionParameters(rule: ProcessRule, index: number, field: string, value: string): void {
        rule = RuleUtils.getClone(rule);

        let currentCondition: RuleCondition = rule.conditions[index];
        currentCondition.field = field;
        currentCondition.value = value;

        this._actions.updateRule.invoke(rule);
    }

    public changeActionParameters(rule: ProcessRule, index: number, value1: string, value2: string): void {
        rule = RuleUtils.getClone(rule);

        let currentAction: RuleAction = rule.actions[index];
        currentAction.targetField = value1;
        currentAction.value = value2;

        this._actions.updateRule.invoke(rule);
    }


    //TODO: passing initial state here is wierd investigate
    public changeConditionType(rule: ProcessRule, index: number, type: string, initialState?: WorkItemStateResultModel): void {
        rule = RuleUtils.getClone(rule);

        let currentCondition: RuleCondition = rule.conditions[index];
        currentCondition.conditionType = getConditionToken(type);
        currentCondition.field = getDefaultField(type);
        currentCondition.value = getDefaultValue(type, initialState);

        if (currentCondition.conditionType === RuleConditionType.WhenStateChangedTo
            || (currentCondition.conditionType === RuleConditionType.WhenNot && currentCondition.field === CoreFieldRefNames.State)) {
            rule.conditions = [currentCondition];
        }

        this._actions.updateRule.invoke(rule);
    }

    public changeActionType(rule: ProcessRule, index: number, type: string) {
        rule = RuleUtils.getClone(rule);

        rule.actions[index] = {
            actionType: getActionToken(type),
            targetField: getDefaultField(type),
            value: getDefaultValue(type)
        }

        this._actions.updateRule.invoke(rule);
    }

    public launchDeleteRuleConfirmationDialog(processId: string, witRef: string, ruleToDelete: ProcessRule, index: number, hasDeletePermissions: boolean): void {
        let errorBarId: string = "rules-confirmation-dialog";
        setDialogAction.invoke({
            dialogType: DialogType.DeleteRule,
            data: {
                deleteRule: () => {
                    this._rulesDataActionsCreator.beginDeleteWorkItemTypeRule(processId, witRef, ruleToDelete.id, errorBarId).then(() => {
                        setDialogAction.invoke({
                            dialogType: DialogType.None,
                            data: null
                        });
                        this._actions.endDeleteRule.invoke({ ruleId: ruleToDelete.id, index: index });
                    });
                },
                rule: ruleToDelete,
                title: Resources.DeleteRuleDialogTitle,
                errorBarId: errorBarId,
                cssClass: "destroy-field-dialog",
                confirmButtonText: Resources.DeleteRuleButtonText,
                isInputDisabled: !hasDeletePermissions,
                upfrontErrorMessage: hasDeletePermissions ? null : Resources.DeleteRulePermissionError
            }
        });
    }
}

export const getDefaultField = (type: string) => {
    switch (type) {
        case Resources.RulesConditionsStateIs:
        case Resources.RulesConditionsStateChangedTo:
        case Resources.RulesConditionsStateChangedFromAndTo:
        case Resources.RulesConditionsWorkItemIsCreated:
        case Resources.RulesConditionsStateIsNot:
        case Resources.RulesConditionsStateNotChanged:
            return CoreFieldRefNames.State;
        default:
            return "";
    }
}

export const getDefaultValue = (type: string, initialState?: WorkItemStateResultModel) => {
    switch (type) {
        case Resources.RulesConditionsValueDefined:
        case Resources.RulesConditionsValueNotDefined:
        case Resources.RulesActionClear:
            return "";
        case Resources.RulesConditionsWorkItemIsCreated:
            return "." + initialState.name;
        default:
            return "";
    }
}

let conditionToTokenMap: IDictionaryStringTo<RuleConditionType>;
let actionToTokenMap: IDictionaryStringTo<RuleActionType>;

export const getConditionToken = (conditionType: string): RuleConditionType => {
    if (conditionToTokenMap) {
        return conditionToTokenMap[conditionType];
    }

    conditionToTokenMap = {};
    conditionToTokenMap[Resources.RulesConditionsStateChangedTo] = RuleConditionType.WhenStateChangedTo;
    conditionToTokenMap[Resources.RulesConditionsStateChangedFromAndTo] = RuleConditionType.WhenStateChangedFromAndTo;
    conditionToTokenMap[Resources.RulesConditionsWorkItemIsCreated] = RuleConditionType.WhenWorkItemIsCreated;
    conditionToTokenMap[Resources.RulesConditionsStateIs] = RuleConditionType.When;
    conditionToTokenMap[Resources.RulesConditionsStateIsNot] = RuleConditionType.WhenNot;
    conditionToTokenMap[Resources.RulesConditionsStateNotChanged] = RuleConditionType.WhenNotChanged;
    conditionToTokenMap[Resources.RulesConditionsValueEquals] = RuleConditionType.When;
    conditionToTokenMap[Resources.RulesConditionsValueNotEquals] = RuleConditionType.WhenNot;
    conditionToTokenMap[Resources.RulesConditionsValueDefined] = RuleConditionType.WhenValueIsDefined;
    conditionToTokenMap[Resources.RulesConditionsValueNotDefined] = RuleConditionType.WhenValueIsNotDefined;
    conditionToTokenMap[Resources.RulesConditionsFieldChanged] = RuleConditionType.WhenChanged;
    conditionToTokenMap[Resources.RulesConditionsFieldNotChanged] = RuleConditionType.WhenNotChanged;

    return conditionToTokenMap[conditionType];
}

export const getActionToken = (actionType: string): RuleActionType => {
    if (actionToTokenMap) {
        return actionToTokenMap[actionType];
    }

    actionToTokenMap = {};
    actionToTokenMap[Resources.RulesActionClear] = RuleActionType.SetValueToEmpty;
    actionToTokenMap[Resources.RulesActionCopyTo] = RuleActionType.CopyFromField;
    actionToTokenMap[Resources.RulesActionMakeReadOnly] = RuleActionType.MakeReadOnly;
    actionToTokenMap[Resources.RulesActionMakeRequired] = RuleActionType.MakeRequired;
    actionToTokenMap[Resources.RulesActionsSetValueOf] = RuleActionType.CopyValue;
    actionToTokenMap[Resources.RulesActionsSetCurrentTime] = RuleActionType.CopyFromClock;
    actionToTokenMap[Resources.RulesActionsCurrentUser] = RuleActionType.CopyFromCurrentUser;
    actionToTokenMap[Resources.RulesActionsSetDefaultValue] = RuleActionType.SetDefaultValue;
    return actionToTokenMap[actionType]
}
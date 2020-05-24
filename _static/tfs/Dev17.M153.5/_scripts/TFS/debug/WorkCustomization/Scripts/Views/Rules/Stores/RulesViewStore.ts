import * as BaseStore from "VSS/Flux/Store";
import { autobind } from "OfficeFabric/Utilities";
import { ProcessRule, RuleAction, RuleCondition, RuleConditionType, RuleActionType } from "TFS/WorkItemTracking/ProcessContracts";
import { RulesViewActions, IStringAndIndex, IEditRuleActionPayload } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { getCollectionFieldsStore, CollectionFieldsStore } from "WorkCustomization/Scripts/Stores/CollectionFieldsStore";
import { getFieldsStore, FieldsStore } from "WorkCustomization/Scripts/Stores/WorkItemType/FieldsStore";
import { getStatesStore, StatesStore } from "WorkCustomization/Scripts/Stores/WorkItemType/StatesStore";
import { RulesDataStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesDataStore";
import StringUtils = require("VSS/Utils/String");
import { workItemTypeAllFieldsLoadedAction } from  "WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions";
import { statesLoadedAction } from  "WorkCustomization/Scripts/Actions/StatesActions";
import { RuleValidationConstants} from "WorkCustomization/Scripts/Constants";
import { ClientOnlyRuleConditionTypes, ClientOnlyRuleActionTypes } from "WorkCustomization/Scripts/Constants";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { RuleUtils, RuleFieldGroupings } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { FieldType, WorkItemField } from "TFS/WorkItemTracking/Contracts";
import { Action } from "VSS/Flux/Action";
import { FieldUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import ArrayUtils = require("VSS/Utils/Array");
import EventsDocuments = require("VSS/Events/Document");
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import WorkItemTypesActions = require("WorkCustomization/Scripts/Actions/WorkItemTypesActions");

export class RulesViewStore extends BaseStore.Store {
    public static readonly NewRuleKey = "new-rule";
    private _fieldsStore: CollectionFieldsStore;
    private _witFieldsStore: FieldsStore;
    private _statesStore: StatesStore;
    private _witTypesStore: WorkItemTypesStore;
    private _conditionTypes: string[] = [];
    private _actionTypes: string[] = [];
    private _processRule: SelfValidatingRule;
    private _ruleIdToDirtyRule: IDictionaryStringTo<ProcessContracts.ProcessRule>;

    constructor(private _ruleActions: RulesViewActions, private _processId: string, private _witRefName: string, private _witRulesStore: RulesDataStore) {
        super();
        this._fieldsStore = getCollectionFieldsStore();
        this._witFieldsStore = getFieldsStore();
        this._statesStore = getStatesStore();
        this._witTypesStore = getWorkItemTypesStore();
        this._ruleIdToDirtyRule = {};
        this._addListeners();
    }

    public dispose(): void {
        this._removeListeners();

        let runningDocumentsTable = EventsDocuments.getRunningDocumentsTable();
        for (var ruleId in this._runningDocumentsEntries) {
            if (this._runningDocumentsEntries.hasOwnProperty(ruleId)) {
                runningDocumentsTable.remove(this._runningDocumentsEntries[ruleId]);
            }
        }

    }

    public getAllRules(): ProcessContracts.ProcessRule[] {
        return this._witRulesStore.getAllRules();
    }

    public getRulesToDisplay(): ProcessContracts.ProcessRule[] {
        let allRules = this.getAllRules();
        let currentRule = this._processRule;
        if (this._ruleIdToDirtyRule[RulesViewStore.NewRuleKey] || (currentRule && !currentRule.id)) {
            allRules = [RuleUtils.getNewRule()].concat(allRules);
        }

        return allRules;
    }

    public isReady(): boolean {
        let allRules = this._witRulesStore.getAllRules();
        let isReady = this.fieldsLoaded() && this.statesLoaded() && this.witTypeLoaded() && (allRules != null);
        return isReady;
    }

    public fieldsLoaded(): boolean {
        var fields = this._witFieldsStore.getAllFields(this._processId, this._witRefName);
        return fields != null && fields.length > 0;
    }

    public statesLoaded(): boolean {
        var states = this._statesStore.getStates(this._processId, this._witRefName);
        return states != null && states.length > 0;
    }

    public witTypeLoaded(): boolean {
        return !!this._witTypesStore.getWorkItemType(this._processId, this._witRefName, true);
    }
    
    public getWorkItemTypeStates(processId: string, witRefName: string): ProcessContracts.WorkItemStateResultModel[] {
        return this._statesStore.getStates(this._processId, this._witRefName);
    }

    public getRule(): ProcessRule {
        return this._processRule;
    }

    public getFieldByReferenceNameOrName(refNameOrName: string): WorkItemField {
        return this._fieldsStore.getFieldByReferenceNameOrName(refNameOrName);
    }

    public getFieldAllowedValues(fieldRefName: string): string[] {
        return this._fieldsStore.getFieldAllowedValues(fieldRefName);
    }

    public getActionType(index: number): string {
        return this._actionTypes[index];
    }

    public getConditionType(index: number): string {
        return this._conditionTypes[index];
    }

    public getDirtyRuleMap(): IDictionaryStringTo<ProcessContracts.ProcessRule> {
        return this._ruleIdToDirtyRule;
    }

    private _populateConditionTypes(): void {
        if (!this._processRule.conditions) {
            return;
        }
        this._conditionTypes = [];
        for (var i = 0; i < this._processRule.conditions.length; i++) {
            this._conditionTypes.push("");

            if (StringUtils.equals(this._processRule.conditions[i].field, CoreFieldRefNames.State)) {
                switch (this._processRule.conditions[i].conditionType) {
                    case RuleConditionType.WhenStateChangedFromAndTo:
                        this._conditionTypes[i] = Resources.RulesConditionsStateChangedFromAndTo;
                        continue;
                    case RuleConditionType.WhenStateChangedTo:
                        this._conditionTypes[i] = Resources.RulesConditionsStateChangedTo;
                        continue;
                    case RuleConditionType.WhenWorkItemIsCreated:
                        this._conditionTypes[i] = Resources.RulesConditionsWorkItemIsCreated;
                        continue;
                    case RuleConditionType.When:
                        this._conditionTypes[i] = Resources.RulesConditionsStateIs;
                        continue;
                    case RuleConditionType.WhenNot:
                        this._conditionTypes[i] = Resources.RulesConditionsStateIsNot;
                        continue;
                    case RuleConditionType.WhenChanged:
                        this._conditionTypes[i] = Resources.RulesConditionsStateChangedTo;
                        continue;
                    case RuleConditionType.WhenNotChanged:
                        this._conditionTypes[i] = Resources.RulesConditionsStateNotChanged;
                        continue;
                }
            }
            else {
                switch (this._processRule.conditions[i].conditionType) {
                    case RuleConditionType.When:
                        this._conditionTypes[i] = Resources.RulesConditionsValueEquals;
                        continue;
                    case RuleConditionType.WhenNot:
                        this._conditionTypes[i] = Resources.RulesConditionsValueNotEquals;
                        continue;
                    case RuleConditionType.WhenValueIsNotDefined:
                        this._conditionTypes[i] = Resources.RulesConditionsValueNotDefined;
                        continue;
                    case RuleConditionType.WhenChanged:
                        this._conditionTypes[i] = Resources.RulesConditionsFieldChanged;
                        continue;
                    case RuleConditionType.WhenValueIsDefined:
                        this._conditionTypes[i] = Resources.RulesConditionsValueDefined;
                        continue;
                    case RuleConditionType.WhenNotChanged:
                        this._conditionTypes[i] = Resources.RulesConditionsFieldNotChanged;
                        continue;
                }
            }

        }
    }

    private _populateActionTypes(): void {
        if (!this._processRule.actions) {
            return;
        }
        this._actionTypes = [];
        for (var i = 0; i < this._processRule.actions.length; i++) {
            this._actionTypes.push("");

            switch (this._processRule.actions[i].actionType) {
                case RuleActionType.CopyValue:
                    this._actionTypes[i] = Resources.RulesActionsSetValueOf;
                    break;
                case RuleActionType.CopyFromField:
                    this._actionTypes[i] = Resources.RulesActionCopyTo;
                    break;
                case RuleActionType.SetDefaultValue:
                    this._actionTypes[i] = Resources.RulesActionsSetDefaultValue;
                    break;
                case RuleActionType.SetValueToEmpty:
                    this._actionTypes[i] = Resources.RulesActionClear;
                    break;
                case RuleActionType.MakeReadOnly:
                    this._actionTypes[i] = Resources.RulesActionMakeReadOnly;
                    break;
                case RuleActionType.MakeRequired:
                    this._actionTypes[i] = Resources.RulesActionMakeRequired;
                    break;
                case RuleActionType.CopyFromCurrentUser:
                case RuleActionType.SetDefaultFromCurrentUser:
                    this._actionTypes[i] = Resources.RulesActionsCurrentUser;
                    break;
                case RuleActionType.CopyFromClock:
                    this._actionTypes[i] = Resources.RulesActionsSetCurrentTime;
                    break;
            }
        }

    }


    public isDirty(): boolean {
        return this._processRule.isDirty();
    }

    public isValid(): boolean {
        if (!this._processRule.validate().isValid) {
            return false;
        }

        let isValid = true;

        this._processRule.conditions.forEach(condition => {
            let targetField = this.getFieldByReferenceNameOrName(condition.field);
            if (!targetField) {
                isValid = false;
            }
            else {
                let targetFieldReferenceName = targetField.referenceName;
                // explicitly disallowed core fields
                if (ArrayUtils.contains(RuleFieldGroupings.getExplicitlyDeniedSystemFields(), targetFieldReferenceName)) {
                    isValid = false;
                }


                if (condition.value && this._getErrorMessage(condition.value, targetField)) {
                    isValid = false;
                }
            }
        });

        this._processRule.actions.forEach(action => {
            let targetField: WorkItemField = action.targetField && this.getFieldByReferenceNameOrName(action.targetField);
            if (!targetField) {
                isValid = false;
            }
            else {
                let targetFieldReferenceName = targetField.referenceName;
                // explicitly disallowed core fields
                if (ArrayUtils.contains(RuleFieldGroupings.getExplicitlyDeniedSystemFields(), targetFieldReferenceName)) {
                    isValid = false;
                }

                if (action.actionType !== RuleActionType.CopyFromField) {
                    if (action.value && this._getErrorMessage(action.value, targetField)) {
                        isValid = false;
                    }
                }
                else {
                    let valueField = this.getFieldByReferenceNameOrName(action.value);
                    if (!valueField) {
                        isValid = false;
                    }
                    else {
                        let valueFieldReferenceName = valueField.referenceName;

                        if (ArrayUtils.contains(RuleFieldGroupings.getExplicitlyDeniedSystemFields(), valueFieldReferenceName)) {
                            isValid = false;
                        }

                    }
                }
            }
        });

        return isValid;
    }

    private _getErrorMessage(value: string, field?: WorkItemField): string {

        if (!field) {
            return '';
        }

        switch (field.type.toString()) {
            case FieldType[FieldType.Html].toLowerCase():
            case FieldType[FieldType.PlainText].toLowerCase():
            case FieldType[FieldType.String].toLowerCase():
                if (!value || value.length === 0) {
                    return Resources.DynamicInputEmptyValidationError;
                }
                break;
            case FieldType[FieldType.Double].toLowerCase():
                if (isNaN(Number(value))) {
                    return Resources.DynamicInputNotDecimalError;
                }
                break;
            case FieldType[FieldType.Integer].toLowerCase():
                if (value !== parseInt(value, 10).toString()) {
                    return Resources.DynamicInputNotIntegerError;
                }
                break;
        }

        return '';
    }

    private _addListeners(): void {
        this._ruleActions.updateRule.addListener(this._onUpdateRuleModel, this);
        this._ruleActions.cancelFormAction.addListener(this._onCancelRuleForm, this);
        this._ruleActions.endSaveRule.addListener(this._onRuleSaved, this);
        this._ruleActions.beginEditRule.addListener(this._onBeginEditRule, this);
        this._ruleActions.endDeleteRule.addListener(this._onEndDeleteRule, this);
        this._witRulesStore.addChangedListener(this._onStoreUpdate);
        this._witTypesStore.addChangedListener(this._onStoreUpdate);
        WorkItemTypesActions.endCreateWorkItemTypeAction.addListener(this._onWitRefUpdated, this);
        workItemTypeAllFieldsLoadedAction.addListener(this._onStoreUpdate, this);
        statesLoadedAction.addListener(this._onStoreUpdate, this);
    }

    private _removeListeners(): void {
        this._ruleActions.updateRule.removeListener(this._onUpdateRuleModel);
        this._ruleActions.cancelFormAction.removeListener(this._onCancelRuleForm);
        this._ruleActions.beginEditRule.removeListener(this._onBeginEditRule);
        this._ruleActions.endSaveRule.removeListener(this._onRuleSaved);
        this._ruleActions.endDeleteRule.removeListener(this._onEndDeleteRule);
        this._witRulesStore.removeChangedListener(this._onStoreUpdate);
        this._witTypesStore.removeChangedListener(this._onStoreUpdate);

        WorkItemTypesActions.endCreateWorkItemTypeAction.removeListener(this._onWitRefUpdated);
        workItemTypeAllFieldsLoadedAction.removeListener(this._onStoreUpdate);
        statesLoadedAction.removeListener(this._onStoreUpdate);
    }

    @autobind
    private _onStoreUpdate(): void {
        let allRules = this._witRulesStore.getAllRules();
        let isReady = (allRules != null);

        if (isReady && !this._processRule) {
            if (allRules.length > 0) {
                this._processRule = new SelfValidatingRule(allRules[0]);
                this._populateConditionTypes();
                this._populateActionTypes();
            }
            else {
                this._processRule = null;
            }
        }

        this.emitChanged();
    }

    @autobind
    private _onCancelRuleForm(): void {

        this._processRule.revert();

        let id = this._processRule.id || RulesViewStore.NewRuleKey;
        if (id === RulesViewStore.NewRuleKey) {
            let allRules = this.getAllRules();
            if (allRules.length > 0) {
                this._processRule = new SelfValidatingRule(allRules[0]);
                this._populateConditionTypes();
                this._populateActionTypes();
            }
            else {
                this._processRule = null;
            }
        }
        else {
            this._populateConditionTypes();
            this._populateActionTypes();
        }
        this._ruleIdToDirtyRule[id] = null;

        this._removeRuleAsDirty(id);

        this.emitChanged();
    }

    private _runningDocumentsEntries: IDictionaryStringTo<EventsDocuments.RunningDocumentsTableEntry> = {};

    @autobind
    private _onUpdateRuleModel(rule: ProcessRule): void {
        this._processRule.update(rule);

        let id = this._processRule.id || RulesViewStore.NewRuleKey;
        if (this._processRule.isDirty()) {
            this._markRuleAsDirty(id, this._processRule);
        }
        else {
            this._removeRuleAsDirty(id);
        }

        this._populateConditionTypes();
        this._populateActionTypes();


        this.emitChanged();
    }

    private _onBeginEditRule(rule: ProcessRule): void {

        if (rule) {

            let newRuleToEditId = rule.id || RulesViewStore.NewRuleKey;
            if (this._ruleIdToDirtyRule[newRuleToEditId]) {
                this._processRule = new SelfValidatingRule(this._ruleIdToDirtyRule[newRuleToEditId], rule);
            }
            else {
                this._processRule = new SelfValidatingRule(rule);
                if (newRuleToEditId === RulesViewStore.NewRuleKey) {
                    this._markRuleAsDirty(newRuleToEditId, this._processRule);
                }   
            }
            this._populateConditionTypes();
            this._populateActionTypes();
        }
        else {
            this._processRule = null;
        }
        this.emitChanged();
    }

    private _onRuleSaved(rule: ProcessRule): void {
        let ruleId = this._processRule.id || RulesViewStore.NewRuleKey;

        this._removeRuleAsDirty(ruleId);

        this._processRule = new SelfValidatingRule(rule);
        this._populateConditionTypes();
        this._populateActionTypes();
        this.emitChanged();
    }

    @autobind
    private _onEndDeleteRule(args: { ruleId: string, index: number }): void {
        let ruleId = args.ruleId;

        this._removeRuleAsDirty(ruleId);

        let nextRule = null;
        let newRules = this.getRulesToDisplay().filter(r => { return r.id !== ruleId });
        if (newRules.length !== 0) {
            nextRule = newRules[Math.min(Math.max(0, args.index - 1), newRules.length - 1)];
        }
        this._onBeginEditRule(nextRule);
    }

    private _markRuleAsDirty(ruleId: string, rule: ProcessRule): void {
        this._ruleIdToDirtyRule[ruleId] = rule;

        let runningDocumentsTable = EventsDocuments.getRunningDocumentsTable();
        if (!this._runningDocumentsEntries[ruleId]) {
            let handle = runningDocumentsTable.add(ruleId, {
                isDirty: () => {
                    return true;
                }
            });
            this._runningDocumentsEntries[ruleId] = handle;
        }
    }

    private _removeRuleAsDirty(ruleId: string): void {
        let runningDocumentsTable = EventsDocuments.getRunningDocumentsTable();
        this._ruleIdToDirtyRule[ruleId] = null;
        runningDocumentsTable.remove(this._runningDocumentsEntries[ruleId]);
        delete this._runningDocumentsEntries[ruleId];
    }

    @autobind
    private _onWitRefUpdated(payload: WorkItemTypesActions.IGetWorkItemTypePayload): void {

        if (payload.workItemType.inherits === this._witRefName && this._processId === payload.processId) {
            this._witRefName = payload.workItemType.referenceName;
        }

        this.emitChanged();
    }
}

export class BaseRule implements ProcessRule {
    public actions: RuleAction[];
    public conditions: RuleCondition[];
    public name: string; 
    public id: string;
    public isDisabled: boolean;
    public customizationType: ProcessContracts.CustomizationType;
    public url: string;

    constructor(rule: ProcessRule) {
        rule = rule != null ? this.clone(rule) : RuleUtils.getNewRule();
        this.actions = rule.actions;
        this.conditions = rule.conditions;
        this.name = rule.name;
        this.id = rule.id;
        this.isDisabled = rule.isDisabled;
        this.customizationType = rule.customizationType;
        this.url = rule.url;
    }

    public clone(rule: ProcessRule): ProcessRule {
        rule = {
            actions: rule.actions,
            conditions: rule.conditions,
            name: rule.name, 
            id: rule.id,
            isDisabled: rule.isDisabled,
            customizationType: rule.customizationType,
            url: rule.url
        };

        return JSON.parse(JSON.stringify(rule));
    }

    public getRule(): ProcessRule {
        return {
            actions: this.actions,
            conditions: this.conditions,
            name: this.name,
            id: this.id,
            isDisabled: this.isDisabled,
            customizationType: this.customizationType,
            url: this.url 
        };
    }
}

export class EditableRule extends BaseRule {
    private _initialRule: ProcessRule;

    constructor(rule: ProcessRule, originalRule?: ProcessRule) {
        super(rule);
        if (originalRule) {
            this._initialRule = this.clone(originalRule);
        }
        else {
            this._initialRule = this.clone(this.getRule());
        }
    }

    public update(rule: ProcessRule): void {
        this.id = rule.id;
        this.actions = rule.actions;
        this.conditions = rule.conditions;
        this.name = rule.name;
        this.isDisabled = rule.isDisabled;
        this.customizationType = rule.customizationType;
        this.url = rule.url
    }

    public revert(): void {
        let rule: ProcessRule;

        if (!this.id) {
            rule = RuleUtils.getNewRule();

        }
        else {
            rule = this._initialRule;
        }

        this.update(rule);
    }

    public isDirty(): boolean {
        if (!this.id) {
            return true;
        }

        let currentRule: ProcessRule = {
            actions: this.actions,
            conditions: this.conditions,
            name: this.name, 
            id: this.id,
            isDisabled: this.isDisabled,
            customizationType: this.customizationType,
            url: this.url
        }

        let initRule = this._initialRule;
        let isRuleClean = initRule.name === currentRule.name
            && initRule.id === currentRule.id
            && initRule.customizationType === currentRule.customizationType
            && initRule.isDisabled === currentRule.isDisabled
            && this._orderlessCompare<RuleAction>(initRule.actions, currentRule.actions, this._actionsEqual)
            && this._orderlessCompare<RuleCondition>(initRule.conditions, currentRule.conditions, this._conditionsEqual);


        return !isRuleClean;
    }

    private _orderlessCompare<T>(initCompare: T[], currentCompare: T[], compareFunction: (arg1: T, arg2: T) => boolean): boolean {
        if (initCompare === null || currentCompare === null) {
            return initCompare === currentCompare;
        }
        else if (initCompare.length !== currentCompare.length) {
            return false;
        }
        for (let i = 0; i < initCompare.length; i++) {
            let foundMatchingItem = false;
            for (let j = 0; j < currentCompare.length; j++) {
                if (compareFunction(initCompare[i], currentCompare[j])) {
                    foundMatchingItem = true;
                    break;
                }
            }
            if (!foundMatchingItem) {
                return false;
            }
        }
        return true;
    }

    private _conditionsEqual(cond1: RuleCondition, cond2: RuleCondition): boolean {
        return cond1.conditionType === cond2.conditionType
            && cond1.field === cond2.field
            && cond1.value === cond2.value;
    }

    private _actionsEqual(act1: RuleAction, act2: RuleAction): boolean {
        return act1.actionType === act2.actionType
            && act1.targetField === act2.targetField
            && act1.value === act2.value;
    }
}

export interface IRuleValidationError {
    message: string
    data?: any
}

export interface IRuleValidationResult {
    isValid: boolean;
    errors?: IRuleValidationError[]
}

export class SelfValidatingRule extends EditableRule {
    public validate(): IRuleValidationResult {
        if (!this.isDirty()) {
            return {
                isValid: true
            }
        }

        let errors: IRuleValidationError[] = [];

        let nameError = this._validateName();

        if (nameError) {
            errors.push(nameError);
        }

        errors = errors.concat(this._validateConditions());
        errors = errors.concat(this._validateActions());

        if (errors.length > 0) {
            return {
                isValid: false,
                errors: errors
            }
        }

        return {
            isValid: true
        };
    }

    private _validateName(): IRuleValidationError {
        return this._checkCharacters(this.name, RuleValidationConstants.MaxFriendlyNameLength, true, true, true);
    }

    private _validateConditions(): IRuleValidationError[] {
        let errors: IRuleValidationError[] = [];
        let error: IRuleValidationError;
        if (this.conditions) {
            for (let condition of this.conditions) {

                if (!condition.conditionType) {
                    error = {
                        message: Resources.ConditionCannotBeEmpty
                    }
                    if (error) {
                        errors.push(error)
                    }
                }

                error = this._checkCharacters(condition.field, RuleValidationConstants.MaxFieldValueLength, true, true, false);
                if (error) {
                    errors.push(error)
                }

                switch (condition.conditionType) {
                    case RuleConditionType.WhenWas:
                        error = this._checkCharacters(condition.value, RuleValidationConstants.MaxFieldValueLength, true, false, false);
                        if (error) {
                            errors.push(error)
                        }
                        break;
                    case RuleConditionType.When:
                    case RuleConditionType.WhenNot:
                    case RuleConditionType.WhenStateChangedTo:
                        error = this._checkCharacters(condition.value, RuleValidationConstants.MaxFieldValueLength, true, true, false);
                        if (error) {
                            errors.push(error)
                        }
                        break;
                    case RuleConditionType.WhenStateChangedFromAndTo:
                        let states = condition.value.split(".");
                        if (states.length === 2) {
                            error = this._checkCharacters(states[0], RuleValidationConstants.MaxFieldValueLength, true, true, false);
                            if (error) {
                                errors.push(error)
                            }
                            error = this._checkCharacters(states[1], RuleValidationConstants.MaxFieldValueLength, true, true, false);
                            if (error) {
                                errors.push(error)
                            }
                        }
                        else {
                            errors.push({
                                message: Resources.StatesMustBeDefinedForTransitionRules
                            });
                        }
                        break;
                }
            }
        }
        else {
            error = {
                message: Resources.ConditionsAreRequired
            }
            errors.push(error);
        }

        return errors;
    }

    private _validateActions(): IRuleValidationError[] {
        let errors: IRuleValidationError[] = [];
        let error: IRuleValidationError;

        if (this.actions) {
            for (let action of this.actions) {

                if (!action.actionType) {
                    error = {
                        message: Resources.ActionCannotBeEmpty
                    }
                    if (error) {
                        errors.push(error)
                    }
                }

                error = this._checkCharacters(action.targetField, RuleValidationConstants.MaxFieldValueLength, true, true, false);
                if (error) {
                    errors.push(error)
                }

                switch (action.actionType) {
                    case RuleActionType.SetDefaultValue:
                    case RuleActionType.CopyValue:
                        error = this._checkCharacters(action.value, RuleValidationConstants.MaxFieldValueLength, true, false, false);
                        if (error) {
                            errors.push(error)
                        }
                        break;
                    case RuleActionType.SetDefaultFromField:
                    case RuleActionType.CopyFromField:
                        error = this._checkCharacters(action.value, RuleValidationConstants.MaxFieldValueLength, true, true, false);
                        if (error) {
                            errors.push(error)
                        }
                        break;
                }
            }
        }
        else {
            error = {
                message: Resources.ActionsAreRequired
            }
            errors.push(error);
        }

        return errors;
    }

    private _checkCharacters(value: string, maxLength: number, checkNull?: boolean, checkEmpty?: boolean, checkInvalidCharacters?: boolean): IRuleValidationError {
        if (checkNull && value == null) {
            return {
                message: Resources.RuleValidationMessage_Empty
            }
        }

        if (checkEmpty && value === "" || value.trim().length === 0) {
            return {
                message: Resources.RuleValidationMessage_Empty
            }
        }

        if (value && value.length > maxLength) {
            return {
                message: StringUtils.format(Resources.RuleValidationMessage_TooLong, maxLength.toString())
            }
        }

        if (checkInvalidCharacters && RuleUtils.ruleValueContainsInvalidCharacters(value)) {
            return {
                message: Resources.RuleValidationMessage_InvalidCharacters
            }
        }
    }
}

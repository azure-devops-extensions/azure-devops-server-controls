import * as BaseStore from "VSS/Flux/Store";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Utils_Array = require("VSS/Utils/Array");
import { IRulesDataActions, IWorkItemTypeRulesPayload } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesDataActions";
import { getCollectionFieldsStore, CollectionFieldsStore } from "WorkCustomization/Scripts/Stores/CollectionFieldsStore";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";

/*
* this store stores the rules on a work item type - it is scoped to a work item type
* do not cache (make singleton) - dispose
*/
export class RulesDataStore extends BaseStore.Store {
    private _rules: ProcessContracts.ProcessRule[];
    private _fieldsStore: CollectionFieldsStore;

    constructor(private _actions: IRulesDataActions) {
        super();
        this._fieldsStore = getCollectionFieldsStore();
        this._addListeners();
    }

    public dispose(): void {
        this._removeListeners();
        this._rules = null;
        this._actions = null;
    }

    public isStoreReady(): boolean {
        return (this._rules !== null && this._rules !== undefined) && this.fieldsLoaded();
    }

    public getAllRules(): ProcessContracts.ProcessRule[] {
        return this._rules;
    }

    public fieldsLoaded(): boolean {
        var fields = this._fieldsStore.fields;
        return fields != null && fields.length > 0;
    }

    public getFieldByReferenceNameOrName(refNameOrName: string): WorkContracts.WorkItemField {
        return this._fieldsStore.getFieldByReferenceNameOrName(refNameOrName);
    }

    private _addListeners(): void {
        this._actions.endFetchRules.addListener(this._onRulesFetched, this);
        this._actions.endDeleteRule.addListener(this._onRuleDeleted, this);
        this._actions.endSaveRule.addListener(this._onRuleAdded, this);
    }

    private _removeListeners(): void {
        this._actions.endFetchRules.removeListener(this._onRulesFetched);
        this._actions.endDeleteRule.removeListener(this._onRuleDeleted);
        this._actions.endSaveRule.removeListener(this._onRuleAdded);
    }
    
    private _onRulesFetched(payload: IWorkItemTypeRulesPayload): void {
        let allRules = payload.rules;
        let customRules = allRules.filter((r) => r.customizationType == ProcessContracts.CustomizationType.Custom);
        customRules = customRules.sort((r1, r2) => r1.name.localeCompare(r2.name));
        this._rules = customRules;
        this.emitChanged();
    }

    private _onRuleDeleted(ruleId: string): void {
        this._rules = this._rules.filter(r => r.id !== ruleId);
        this.emitChanged();
    }

    private _onRuleAdded(savedRule: ProcessContracts.ProcessRule): void {
        let index = Utils_Array.findIndex(this._rules, (rule: ProcessContracts.ProcessRule) => { return savedRule.id === rule.id });

        if (index >= 0) {
            this._rules[index] = savedRule;
        }
        else {
            this._rules = [savedRule].concat(this._rules);
        }
        this.emitChanged();
    }
}
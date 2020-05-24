import * as BaseStore from "VSS/Flux/Store";

import WorkItemTypeFieldsActions = require( "WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions");

import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

interface IFieldNameAndIdDictionaries {
    fieldRefnameToField: IDictionaryStringTo<ProcessContracts.FieldModel>;
    fieldNameToField: IDictionaryStringTo<ProcessContracts.FieldModel>
}

export class WorkItemTypeFieldsStore extends BaseStore.Store {
    private _workItemTypeAllFieldsByFieldByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<IFieldNameAndIdDictionaries>>;
    private _workItemTypeStatesByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel[]>>;

    constructor() {
        super();

        this._workItemTypeAllFieldsByFieldByWitByProcess = {};
        this._workItemTypeStatesByWitByProcess = {};
        this._addListeners();
    }

    public getWorkItemTypeField(processId: string, witRefName: string, fieldRefNameOrName: string): ProcessContracts.FieldModel {
        let witRefNameToFieldDictionaries: IDictionaryStringTo<IFieldNameAndIdDictionaries> = this._workItemTypeAllFieldsByFieldByWitByProcess[processId];
        if (witRefNameToFieldDictionaries) {
            let fieldDictionary = witRefNameToFieldDictionaries[witRefName];
            if (fieldDictionary) {
                let fieldRefnameToFieldMap: IDictionaryStringTo<ProcessContracts.FieldModel> = fieldDictionary.fieldRefnameToField;
                let fieldNameToFieldMap: IDictionaryStringTo<ProcessContracts.FieldModel> = fieldDictionary.fieldNameToField;
                if (fieldRefnameToFieldMap && fieldNameToFieldMap) {
                    return fieldRefnameToFieldMap[fieldRefNameOrName] || fieldNameToFieldMap[fieldRefNameOrName];
                }
            }
        }

        return null;
    }

    public getWorkItemTypeAllFields(processId: string, witRefName: string): ProcessContracts.FieldModel[] {
        let values: ProcessContracts.FieldModel[] = [];
        let typeDictionary: IDictionaryStringTo<IFieldNameAndIdDictionaries> = this._workItemTypeAllFieldsByFieldByWitByProcess[processId];
        if (typeDictionary == null) {
            return null;
        }

        if (typeDictionary[witRefName] == null) {
            return null;
        }

        let fieldRefnameToField: IDictionaryStringTo<ProcessContracts.FieldModel> = typeDictionary[witRefName].fieldRefnameToField;
        
        let keys: string[] = Object.keys(fieldRefnameToField);
        keys.forEach(function (key) {
            values.push(fieldRefnameToField[key]);
        });
        return values.sort((a, b) => a.name.localeCompare(b.name));;
    }

    public getWorkItemTypeStates(processId: string, witRefName: string): ProcessContracts.WorkItemStateResultModel[] {
        if (!this._workItemTypeStatesByWitByProcess[processId]) {
            return null;
        }

        let states: ProcessContracts.WorkItemStateResultModel[] = this._workItemTypeStatesByWitByProcess[processId][witRefName];
        if (states) {
            return states;
        }
        else {
            return null;
        }
    }

    public dispose(): void {
        WorkItemTypeFieldsActions.workItemTypeAllFieldsLoadedAction.removeListener(this._onWorkItemTypeAllFieldsLoaded);
    }

    private _addListeners(): void {
        WorkItemTypeFieldsActions.workItemTypeAllFieldsLoadedAction.addListener(this._onWorkItemTypeAllFieldsLoaded, this);
    }

    private _onWorkItemTypeAllFieldsLoaded(arg: WorkItemTypeFieldsActions.IWorkItemTypeAllFieldsDataLoadedPayload): void {
        let wits = this._workItemTypeAllFieldsByFieldByWitByProcess[arg.processId];
        if (wits == null) {
            wits = this._workItemTypeAllFieldsByFieldByWitByProcess[arg.processId] = {};
        };

        let fieldDictionaries: IFieldNameAndIdDictionaries = wits[arg.witRefName];

        if (fieldDictionaries == null) {
            wits[arg.witRefName] = fieldDictionaries = { fieldRefnameToField: {}, fieldNameToField: {} };
        }
        let fieldRefnameToFieldMap = fieldDictionaries.fieldRefnameToField;
        let fieldNameToFieldMap = fieldDictionaries.fieldNameToField;
        for (let witFieldModel of arg.witFieldModels) {
            fieldRefnameToFieldMap[witFieldModel.id] = witFieldModel;
            fieldNameToFieldMap[witFieldModel.name] = witFieldModel;
        }

        this.emitChanged();
    }
}

var StoreInstance: WorkItemTypeFieldsStore;
export function getWorkItemTypeFieldsStore(): WorkItemTypeFieldsStore {
    if (StoreInstance == null) {
        StoreInstance = new WorkItemTypeFieldsStore();
    }

    return StoreInstance;
}

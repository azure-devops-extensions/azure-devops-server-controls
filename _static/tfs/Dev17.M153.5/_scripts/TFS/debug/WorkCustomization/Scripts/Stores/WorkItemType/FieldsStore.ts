import { IWorkItemTypeAllFieldsDataLoadedPayload, workItemTypeAllFieldsLoadedAction } from 'WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions';
import { Store } from 'VSS/Flux/Store';
import { FieldModel } from "TFS/WorkItemTracking/ProcessContracts";
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";

interface IFieldNameAndIdDictionaries {
    fieldRefnameToField: IDictionaryStringTo<FieldModel>;
    fieldNameToField: IDictionaryStringTo<FieldModel>
}

export class FieldsStore extends Store {
    private _allFieldsByFieldByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<IFieldNameAndIdDictionaries>>;
    private _visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess: IDictionaryStringTo<IDictionaryStringTo<IDictionaryStringTo<boolean>>>;

    constructor() {
        super();
        this._allFieldsByFieldByWitByProcess = {};
        this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess = {};
        this._addListeners();
    }

    public getField(processId: string, witRefName: string, fieldRefNameOrName: string): FieldModel {
        let witRefNameToFieldDictionaries: IDictionaryStringTo<IFieldNameAndIdDictionaries> = this._allFieldsByFieldByWitByProcess[processId];
        if (witRefNameToFieldDictionaries) {
            let fieldDictionary = witRefNameToFieldDictionaries[witRefName];
            if (fieldDictionary) {
                let fieldRefnameToFieldMap: IDictionaryStringTo<FieldModel> = fieldDictionary.fieldRefnameToField;
                let fieldNameToFieldMap: IDictionaryStringTo<FieldModel> = fieldDictionary.fieldNameToField;
                if (fieldRefnameToFieldMap && fieldNameToFieldMap) {
                    return fieldRefnameToFieldMap[fieldRefNameOrName] || fieldNameToFieldMap[fieldRefNameOrName];
                }
            }
        }

        return null;
    }

    public getNameToFieldDictionary(processId: string, witRefName: string): IDictionaryStringTo<FieldModel> {
        let typeDictionary: IDictionaryStringTo<IFieldNameAndIdDictionaries> = this._allFieldsByFieldByWitByProcess[processId];
        if (typeDictionary == null) {
            return null;
        }

        if (typeDictionary[witRefName] == null) {
            return null;
        }

        return typeDictionary[witRefName].fieldNameToField;
    }

    //TODO: fix perf this seems costly 
    public getAllFields(processId: string, witRefName: string): FieldModel[] {
        let values: FieldModel[] = [];
        let typeDictionary: IDictionaryStringTo<IFieldNameAndIdDictionaries> = this._allFieldsByFieldByWitByProcess[processId];
        if (typeDictionary == null) {
            return null;
        }

        if (typeDictionary[witRefName] == null) {
            return null;
        }

        let fieldRefnameToField: IDictionaryStringTo<FieldModel> = typeDictionary[witRefName].fieldRefnameToField;

        let keys: string[] = Object.keys(fieldRefnameToField);
        keys.forEach(function (key) {
            values.push(fieldRefnameToField[key]);
        });
        return values.sort((a, b) => a.name.localeCompare(b.name));;
    }

    public isFieldVisibleOnForm(processId: string, witRefName: string, fieldReferenceName: string): boolean {

        let isVisible: boolean = this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess[processId][witRefName][fieldReferenceName];
        if (isVisible === null || isVisible === undefined) {
            let witStore: WorkItemTypesStore = getWorkItemTypesStore();
            isVisible = this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess[processId][witRefName][fieldReferenceName] = witStore.isFieldVisibleOnLayout(processId, witRefName, fieldReferenceName);
        }

        return isVisible;
    }

    public dispose(): void {
        workItemTypeAllFieldsLoadedAction.removeListener(this._onWorkItemTypeAllFieldsLoaded);
    }

    private _addListeners(): void {
        workItemTypeAllFieldsLoadedAction.addListener(this._onWorkItemTypeAllFieldsLoaded, this);
    }

    private _onWorkItemTypeAllFieldsLoaded(arg: IWorkItemTypeAllFieldsDataLoadedPayload): void {
        let wits = this._allFieldsByFieldByWitByProcess[arg.processId];
        if (wits == null) {
            wits = this._allFieldsByFieldByWitByProcess[arg.processId] = {};
            this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess[arg.processId] = {};
        };

        let fieldDictionaries: IFieldNameAndIdDictionaries = wits[arg.witRefName];

        if (fieldDictionaries == null) {
            wits[arg.witRefName] = fieldDictionaries = { fieldRefnameToField: {}, fieldNameToField: {} };
            this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess[arg.processId][arg.witRefName] = {};
        }
        let fieldRefnameToFieldMap = fieldDictionaries.fieldRefnameToField;
        let fieldNameToFieldMap = fieldDictionaries.fieldNameToField;
        for (let witFieldModel of arg.witFieldModels) {
            fieldRefnameToFieldMap[witFieldModel.id] = witFieldModel;
            fieldNameToFieldMap[witFieldModel.name] = witFieldModel;
            this._visibilityOfFieldsOnLayoutByIsVisibleByFieldByWitByProcess[arg.processId][arg.witRefName][witFieldModel.id] = null;
        }

        this.emitChanged();
    }
}

var storeInstance: FieldsStore;
export function getFieldsStore(): FieldsStore {
    if (storeInstance == null) {
        storeInstance = new FieldsStore();
    }

    return storeInstance;
}

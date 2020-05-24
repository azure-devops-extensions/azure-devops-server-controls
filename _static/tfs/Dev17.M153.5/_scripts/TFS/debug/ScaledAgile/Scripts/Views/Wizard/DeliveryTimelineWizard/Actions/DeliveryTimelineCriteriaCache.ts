import { IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

export class DeliveryTimelineCriteriaCache {
    private _supportedFields: IFieldShallowReference[];
    private _supportedFieldsMap: IDictionaryStringTo<IFieldDefinition>;

    constructor(fields: IFieldDefinition[]) {
        this._supportedFields = [];
        this._supportedFieldsMap = {};
        this._initializeCache(fields);
    }
    
    private _initializeCache(fields: IFieldDefinition[]): void {
        for (var i = 0; i < fields.length; i++) {
            let field = fields[i];
            this._supportedFieldsMap[field.name.toUpperCase()] = field;
            this._supportedFieldsMap[field.referenceName.toUpperCase()] = field;
            var obj: IFieldShallowReference = {
                id: field.referenceName,
                name: field.name,
                valueState: ValueState.ReadyAndValid
            };
            this._supportedFields.push(obj);
        }
    }

    public getSupportedFieldsReference(): IFieldShallowReference[] {
        return this._supportedFields;
    }

    public getSupportedFieldsMap(): IDictionaryStringTo<IFieldDefinition> {
        return this._supportedFieldsMap;
    }
}


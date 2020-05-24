import {IItemBase} from "ScaledAgile/Scripts/Shared/Models/IItemBase";

export abstract class ItemBase implements IItemBase {
    private _id: number;
    protected _fieldData: IDictionaryStringTo<any>;

    constructor(id: number, fieldData: IDictionaryStringTo<any>) {
        if (!fieldData) {
            throw Error("fieldData must be defined");
        }

        this._id = id;
        this._fieldData = fieldData;
    }

    public get id(): number {
        return this._id;
    }

    get fieldValues(): IDictionaryStringTo<any> {
        return $.extend(true, {}, this._fieldData);
    }

    public getFieldValue(refName: string): any {
        return this._fieldData[refName];
    }
}

import { IItem, ItemSaveStatus } from "ScaledAgile/Scripts/Shared/Models/IItem";
import {ItemBase} from "ScaledAgile/Scripts/Shared/Models/ItemBase";

export class Item extends ItemBase implements IItem {
    private _parentId: number;

    private _message: string;
    private _saveStatus: ItemSaveStatus;
    private _isHidden: boolean;
    public top: number;
    public height: number;

    constructor(id: number,
        fieldData: IDictionaryStringTo<any>,
        parentId?: number,
        saveStatus?: ItemSaveStatus,
        message?: string,
        top?: number,
        height?: number,
        isHidden?: boolean) {

        super(id, fieldData);

        this._isHidden = !!isHidden;
        this._parentId = parentId;
        this._saveStatus = saveStatus;
        this._message = message;
        this.top = top;
        this.height = height;
    }

    get parentId(): number {
        return this._parentId;
    }

    get message(): string {
        return this._message;
    }

    get saveStatus(): ItemSaveStatus {
        return this._saveStatus;
    }

    get isHidden(): boolean {
        return this._isHidden;
    }

    public setIsHidden(value: boolean) {
        let item = this._clone();
        item._isHidden = value;
        return item;
    }

    public setFieldValues(values: IDictionaryStringTo<any>): IItem {
        let item = this._clone();
        $.extend(true, item._fieldData, values);
        return item;
    }

    public setStatus(status: ItemSaveStatus, message?: string): IItem {
        let item = this._clone();
        item._saveStatus = status;
        item._message = message;
        return item;
    }

    public setParentId(parentId: number): IItem {
        let item = this._clone();
        item._parentId = parentId;
        return item;
    }

    public merge(update: IItem): IItem {
        if (update.id !== this.id) {
            throw new Error("Cannot merge items with different ids");
        }

        let item = this._clone();

        item._parentId = update.parentId || item._parentId;
        item._copyFieldData(update);
        item._saveStatus = update.saveStatus;
        item._message = update.message;

        return item;
    }

    private _copyFieldData(item: IItem) {
        let refNames = Object.keys(this._fieldData);
        refNames.forEach(refName => this._fieldData[refName] = item.getFieldValue(refName));
    }

    public clone(): IItem {
        return this._clone();
    }

    private _clone(): Item {
        return new Item(this.id, $.extend(true, {}, this._fieldData), this.parentId, this.saveStatus, this.message, this.top, this.height, this.isHidden);
    }
}

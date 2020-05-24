
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";

import { Action } from "VSS/Flux/Action";

export interface IExtensionItemPayload {
    extensionItems?: IExtensionDefinitionItem[];
    isExtensionFetched: boolean;
} 

export class TaskExtensionItemListActions extends ActionsHubBase {

    public initialize(): void {
        this._updateExtensionItemList = new Action<IExtensionItemPayload>();
        this._filterExtensionItemList = new Action<string>();
    }

    public static getKey(): string {
        return ActionsKeys.ExtensionItemListActions;
    }

    public get updateExtensionItemList(): Action<IExtensionItemPayload> {
        return this._updateExtensionItemList;
    }

    public get filterExtensionItemList(): Action<string> {
        return this._filterExtensionItemList;
    }

    private _updateExtensionItemList: Action<IExtensionItemPayload>;
    private _filterExtensionItemList: Action<string>;
}
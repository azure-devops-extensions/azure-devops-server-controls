
import * as Actions from "DistributedTaskControls/Actions/TaskExtensionItemListActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { FilteringUtils } from "DistributedTaskControls/Common/FilteringUtils";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { IExtensionDefinitionItem } from "DistributedTaskControls/Common/Types";

import * as Utils_String from "VSS/Utils/String";

export class TaskExtensionItemListStore extends StoreCommonBase.StoreBase {

    constructor() {
        super();
        this._extensionItemList = [];
        this._completeExtensionItemList = [];
        this._isExtensionFetched = false;
    }

    public initialize(): void {
        this._extensionItemListActions = ActionsHubManager.GetActionsHub<Actions.TaskExtensionItemListActions>(Actions.TaskExtensionItemListActions);
        this._extensionItemListActions.updateExtensionItemList.addListener(this._handleUpdateExtensionItemList);
        this._extensionItemListActions.filterExtensionItemList.addListener(this._handleFilterExtensionItemList);
    }

    protected disposeInternal(): void {
        this._extensionItemListActions.updateExtensionItemList.removeListener(this._handleUpdateExtensionItemList);
        this._extensionItemListActions.filterExtensionItemList.removeListener(this._handleFilterExtensionItemList);
    }

    public static getKey(): string {
        return StoreKeys.ExtensionItemListStore;
    }

    public getExtensionItemList(): IExtensionDefinitionItem[] {
        return this._extensionItemList;
    }

    public isExtensionFetched(): boolean {
        return this._isExtensionFetched;
    }

    private _handleUpdateExtensionItemList = (extensionItemPayload: Actions.IExtensionItemPayload) => {
        if (extensionItemPayload) {
            // Replace values
            if (extensionItemPayload.extensionItems) {
                this._completeExtensionItemList = extensionItemPayload.extensionItems;

                // Filter list if search is active
                this._extensionItemList = this._lastFilter ?
                    FilteringUtils.performFilteringWithScore<IExtensionDefinitionItem>(
                        [], this._completeExtensionItemList, this._lastFilter, Utils_String.empty, this._getMatchScore
                    ) || [] :
                    this._completeExtensionItemList;
            }

            this._isExtensionFetched = extensionItemPayload.isExtensionFetched;

            this.emitChanged();
        }
    }

    private _handleFilterExtensionItemList = (filter: string) => {
        this._extensionItemList = FilteringUtils.performFilteringWithScore<IExtensionDefinitionItem>(
            this._extensionItemList, this._completeExtensionItemList, filter, this._lastFilter, this._getMatchScore
        ) || [];

        this._publishFilteredExtensionTelemetry(this._extensionItemList.length);

        this.emitChanged();
        this._lastFilter = filter;
    }    

    private _publishFilteredExtensionTelemetry(count: number): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        
        eventProperties[Properties.Length] = count;

        Telemetry.instance().publishEvent(Feature.MarketplaceExtensionInSearch, eventProperties);
    }

    private _getMatchScore(item: IExtensionDefinitionItem, filter: string, performExactMatch?: boolean): number {
        let nameToCompare = item.friendlyName || item.name || Utils_String.empty;
        let descriptionToCompare = item.description || Utils_String.empty;
        return FilteringUtils.getStringMatchScore(filter, [nameToCompare, descriptionToCompare, item.tags.join(" ")], performExactMatch);
    }

    private _lastFilter: string = "";
    private _isExtensionFetched: boolean;

    private _completeExtensionItemList: IExtensionDefinitionItem[];
    private _extensionItemList: IExtensionDefinitionItem[];

    private _extensionItemListActions: Actions.TaskExtensionItemListActions;
}
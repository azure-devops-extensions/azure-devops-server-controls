import * as Q from "q";
import { ActionsHub, ItemDetails } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { ItemDetailsSource }  from "VersionControl/Scenarios/ChangeDetails/Sources/ItemDetailsSource";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { ItemModel, Change } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action creator for item details
 */
export class ItemDetailsActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _storesHub: StoresHub,
        private _repositoryContext: RepositoryContext,
        private _itemDetailsSource?: ItemDetailsSource) {
    }

    /**
     * Loads or selects the item detail for the given itemPath and itemVersion
     */
    public loadOrSelectItemDetails(itemPath: string, itemVersion: string, change: Change): IPromise<void> {
        const deferred = Q.defer<void>();

        if (!this._storesHub.itemDetailsStore.isItemDetailsLoaded(itemPath, itemVersion)) {
            this.itemDetailsSource.getItemModel(itemPath, itemVersion).then(
                (itemModel: ItemModel) => {
                    const itemDetails = {
                        item: itemModel,
                        itemVersion: itemVersion,
                        change: change,
                    } as ItemDetails;

                    this._actionsHub.changeListItemDetailsLoaded.invoke({
                        itemDetails: itemDetails,
                    });
                    deferred.resolve(null);
                },
                (error: Error) => {
                    deferred.reject(error);
                });
        } else {
            this._actionsHub.changeListItemDetailsSelected.invoke({
                path: itemPath,
                itemVersion: itemVersion,
            });
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    private get itemDetailsSource(): ItemDetailsSource {
        if (!this._itemDetailsSource) {
            this._itemDetailsSource = new ItemDetailsSource(this._repositoryContext);
        }

        return this._itemDetailsSource;
    }
}

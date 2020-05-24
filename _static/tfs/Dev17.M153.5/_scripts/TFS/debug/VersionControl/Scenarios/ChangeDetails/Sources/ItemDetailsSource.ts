import * as Q from "q";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class ItemDetailsSource {
    constructor(private _repositoryContext: RepositoryContext) {
    }

    public getItemModel(itemPath: string, itemVersion: string): IPromise<VCLegacyContracts.ItemModel> {
        const deferred = Q.defer<VCLegacyContracts.ItemModel>();

        this._repositoryContext.getClient().beginGetItem(
            this._repositoryContext,
            itemPath,
            itemVersion,
            {
                includeContentMetadata: true,
                includeVersionDescription: true,
            } as VCLegacyContracts.ItemDetailsOptions,
            (item: VCLegacyContracts.ItemModel) => {
                deferred.resolve(item);
            },
            (error: Error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }
}

import WebApi_RestClient = require("VSS/WebApi/RestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import ProjectConstants = require("Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants");

export class CollectionHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetCollections(): IPromise<TFS_Core_Contracts.WebApiProjectCollection[]> {
        return this._beginRequest<TFS_Core_Contracts.WebApiProjectCollection[]>({
            area: ProjectConstants.CoreConstants.AreaName,
            locationId: ProjectConstants.CoreConstants.ProjectCollectionsLocationId,
            responseIsCollection: true
        });
    }
}

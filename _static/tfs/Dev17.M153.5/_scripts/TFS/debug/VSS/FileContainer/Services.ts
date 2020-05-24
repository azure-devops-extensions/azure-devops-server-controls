
import Diag = require("VSS/Diag");
import FileContainer_Contracts = require("VSS/FileContainer/Contracts");
import FileContainer_RestClient = require("VSS/FileContainer/RestClient");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

export interface FileContainerPathInfo {
    containerId: number;
    path: string;
}

/**
* Service to manage file container data
*/
export class FileContainerService extends Service.VssService {

    private _httpClient: FileContainer_RestClient.FileContainerHttpClient;

    /**
     * Returns a list of file container items
     * 
     * @param containerId The id of the container
     * @param scope The scope of the items
     * @param itemPath The path of the item within the container
     */
    public beginGetItems(containerId: number, scope: string, itemPath: string): IPromise<FileContainer_Contracts.FileContainerItem[]> {

        if (!this._httpClient) {
            this._httpClient = Service.getCollectionClient(FileContainer_RestClient.FileContainerHttpClient, this.getWebContext());
        }

        return this._httpClient.getItems(containerId, scope, itemPath);
    }

    /**
     * Returns the file container info
     * 
     * @param fileContainerPath The path of the container. For example, "#/12/drop".
     */
    public parseContainerPath(fileContainerPath: string): FileContainerPathInfo {

        Diag.Debug.assertIsString(fileContainerPath, "fileContainerPath");
        Diag.Debug.assertIsStringNotEmpty(fileContainerPath, "fileContainerPath");

        var pathParts = fileContainerPath.split("/", 3);

        // verify path is file container path
        Diag.Debug.assert(pathParts[0] === "#");
        Diag.Debug.assert(pathParts.length >= 2);

        return {
            containerId: parseInt(pathParts[1]),
            path: pathParts[2]
        };
    }
}

VSS.tfsModuleLoaded("VSS.FileContainer", exports);

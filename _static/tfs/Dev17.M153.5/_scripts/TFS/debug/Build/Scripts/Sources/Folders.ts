import {foldersUpdated} from "Build/Scripts/Actions/FolderActions";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import {BuildClientService} from "Build.Common/Scripts/ClientServices";

import {TfsService} from "Presentation/Scripts/TFS/TFS.Service";

import {Folder} from "TFS/Build/Contracts";

import {VssConnection} from "VSS/Service";

export class FolderSource extends TfsService {
    private _buildService: BuildClientService;

    public initializeConnection(connection: VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
    }

    public getFolders(path?: string, replace?: boolean): IPromise<Folder[]> {
        return this._buildService.getFolders(path).then((folders) => {
            foldersUpdated.invoke({
                folders: folders,
                replace: replace
            });

            return folders;
        }, raiseTfsError);
    }
}
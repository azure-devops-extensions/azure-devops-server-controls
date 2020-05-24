import * as BuildClient from "Build.Common/Scripts/ClientServices";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Service from "VSS/Service";

export class TemplatesSource extends TFS_Service.TfsService {
    private _buildService: BuildClient.BuildClientService;

    private _createTemplateOperations: IDictionaryStringTo<boolean> = {};

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClient.BuildClientService);
    }

    public createTemplate(template: BuildContracts.BuildDefinitionTemplate) {
        let id = template.name.replace(/[^0-9a-zA-Z-_.]/g, '');
        template.id = id;
        if (!this._createTemplateOperations[id]) {
            this._createTemplateOperations[id] = true;
            this._buildService.putDefinitionTemplate(id, template).then((template) => {
                delete this._createTemplateOperations[id];
            }, (err) => {
                delete this._createTemplateOperations[id];
                raiseTfsError(err);
            });
        }
    }
}
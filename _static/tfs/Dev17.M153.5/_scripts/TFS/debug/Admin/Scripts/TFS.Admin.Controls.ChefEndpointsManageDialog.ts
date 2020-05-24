/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Utils_Core = require("VSS/Utils/Core");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");

var delegate = Utils_Core.delegate;

export class AddChefEndpointsDialog extends AddServiceEndpointDialog {

    constructor(model: AddServiceEndpointModel) {
        super(model);
    }

    public getTitle(): string {
        var title = AdminResources.AddChefConnectionsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected preCheck(): boolean {
        var checkFailed = false;

        this._element.find('input:visible').each((index: number, element: Element) => {
            checkFailed = this._checkEmpty($(element));
            return !checkFailed;
        });

        // Check if Client Key is not empty
        if (!checkFailed) {
            // TextArea
            checkFailed = this._checkEmpty(this._element.find('textarea'));
        }

        return checkFailed;
    }

    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        var connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }

        var apiData: AdminCommon.IServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url: this._element.find("#serverUrl").val().trim(),
            username: this._element.find("#username").val().trim(),
            passwordKey: this._element.find("#clientKey").val().trim(),
            type: TFS_Admin_Common.ServiceEndpointType.Chef,
            scheme: TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword
        };

        var serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.ChefEndpointsManageDialog", exports);

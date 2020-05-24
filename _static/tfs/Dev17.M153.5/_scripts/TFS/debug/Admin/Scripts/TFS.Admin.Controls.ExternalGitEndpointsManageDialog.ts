/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";

var delegate = Utils_Core.delegate;

export class AddExternalGitEndpointsDialog extends AddServiceEndpointDialog {

    constructor(model: AddServiceEndpointModel) {
        super(model);
    }

    public getTitle(): string {
        var title = AdminResources.AddExternalGitConnectionsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected preCheck(): boolean {
        var checkFailed = false;

        // Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            // Skipping empty check for username and password as these are not mandatory for some anonymous connections
            if ($(element).attr('id') !== "username" && $(element).attr('id') !== "pwd") {
                checkFailed = this._checkEmpty($(element));
            }

            return !checkFailed;
        });

        return checkFailed;
    }

    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        var connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }

        var username = this._element.find("#username").val() == null ? null : this._element.find("#username").val().trim();
        var passwordKey = this._element.find("#pwd").val() == null ? null : this._element.find("#pwd").val().trim();
        if (passwordKey == "" && this._model.isUpdate()) {
            passwordKey = null;
        }

        var apiData: AdminCommon.IServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url: this._element.find("#serverUrl").val().trim(),
            username: username,
            passwordKey: passwordKey,
            type: TFS_Admin_Common.ServiceEndpointType.ExternalGit,
            scheme: TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword
        };

        var serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.ExternalGitEndpointsManageDialog", exports);

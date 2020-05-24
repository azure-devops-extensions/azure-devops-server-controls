/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Utils_Core = require("VSS/Utils/Core");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import ko = require("knockout");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import ConnectedService = require("Admin/Scripts/Generated/ConnectedService");
import ConnectedServiceHttpClient = require("Admin/Scripts/Generated/ConnectedServiceHttpClient");
import Contracts = require("TFS/DistributedTask/Contracts");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

var delegate = Utils_Core.delegate;
var delegate = Utils_Core.delegate;

export class AddGcpConnectionsModel extends AddServiceEndpointModel {
     
    public projectid: KnockoutObservable<string> = ko.observable("");
    public certificate: KnockoutObservable<string> = ko.observable("");
    public audience: KnockoutObservable<string> = ko.observable("");
    public issuer: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public scope: KnockoutObservable<string> = ko.observable("https://www.googleapis.com/auth/cloud-platform");
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public disconnectService: boolean = false;
    public title: string = "";
    public authTemplate: () => string;
    public successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void;
    constructor(successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallBack);
        this.width = 750;
        this.height = 600;
        
    }
}

export class AddGcpEndpointsDialog extends AddServiceEndpointDialog {

    constructor(model: AddServiceEndpointModel) {
        super(model);
    }

    public getTitle(): string {
        var title = AdminResources.AddGcpConnectionsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected preCheck(): boolean {
        var checkFailed = false;
        this._model.errors([]);

        var $name = this._element.find("#connectionName");
        if (this._checkEmpty($($name))) {
            this._model.errors.push(AdminResources.ConnectionNameIsRequired);
            checkFailed = true;
        }

        var $cert = this._element.find("#certificate");
        if (this._checkEmpty($($cert))) {
            this._model.errors.push("Certificate is required");
            checkFailed = true;
        }

        return checkFailed;
    }


    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        var connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }
            var certificate = this._element.find("#certificate").val().trim();
            var issuer = JSON.parse(certificate)["client_email"];
            var audience = JSON.parse(certificate)["token_uri"];
            var privatekey = JSON.parse(certificate)["private_key"];
            var projectid = JSON.parse(certificate)["project_id"];
            
        var apiData: AdminCommon.GServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url:"https://www.googleapis.com/",
            certificate: certificate,
            scope: this._element.find("#scope").val().trim(),
            issuer :issuer,
            audience: audience, 
            privatekey:privatekey,
            parameters: {
            projectid:projectid
                        },
            type: TFS_Admin_Common.ServiceEndpointType.Gcp,
            scheme: TFS_Admin_Common.EndpointAuthorizationSchemes.JwtBasedOAuth
        };

        var serviceEndpointDetails = new TFS_Admin_Common.GcpServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.GcpEndpointsManageDialog", exports);

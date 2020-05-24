/// <reference types="jquery" />



import ko = require("knockout");

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Marked = require("Presentation/Scripts/marked");
import Controls = require("VSS/Controls");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");

import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");

import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

var delegate = Utils_Core.delegate;

export class AddSvnConnectionsModel extends AddServiceEndpointModel {
    public realmName: KnockoutObservable<string> = ko.observable(null);
    public acceptUntrustedCerts: KnockoutObservable<boolean> = ko.observable(false);

    /**
     * The help text markdown for repository realm
     */
    public svnRealmNameHelpMarkdown: string;
    public svnServerUrlHelpMarkdown: string;
    public svnAcceptUntrustedCertsHelpMarkdown: string;

    constructor(successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallBack);
        this.width = 750;
        this.height = 600;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            let renderer = new MarkdownRenderer();
            this.svnRealmNameHelpMarkdown = renderer.renderHtml(AdminResources.SvnRealmNameHelpText);
            this.svnServerUrlHelpMarkdown = renderer.renderHtml(AdminResources.SvnServerUrlHelpText);
            this.svnAcceptUntrustedCertsHelpMarkdown = renderer.renderHtml(AdminResources.SvnAcceptUntrustedCertsHelpText);
        }
        else {
            this.svnRealmNameHelpMarkdown = Marked(AdminResources.SvnRealmNameHelpText);
            this.svnServerUrlHelpMarkdown = Marked(AdminResources.SvnServerUrlHelpText);
            this.svnAcceptUntrustedCertsHelpMarkdown = Marked(AdminResources.SvnAcceptUntrustedCertsHelpText);
        }
    }
}

export class AddSvnEndpointsDialog extends AddServiceEndpointDialog {

    constructor(model: AddSvnConnectionsModel) {
        super(model);
    }

    public getTitle(): string {
        var title = AdminResources.AddSvnConnectionsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected preCheck(): boolean {
        // Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            // Only connection name and server Url are required in Svn endpoint
            if ($(element).attr('required')) {
                if (this._checkEmpty($(element))) {
                    return false;
                }
            }
        });

        return false;
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
            type: TFS_Admin_Common.ServiceEndpointType.Subversion,
            scheme: TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword,
            parameters: {
                realmName: this._element.find("#realmName").val().trim(),
                acceptUntrustedCerts: this._element.find("#acceptUntrustedCerts")[0].checked.toString()
            }
        };

        var serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }
}

KnockoutCommon.initKnockoutHandlers();

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.SvnEndpointsManageDialog", exports);

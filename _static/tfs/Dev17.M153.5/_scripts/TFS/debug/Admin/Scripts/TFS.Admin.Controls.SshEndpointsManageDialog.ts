/// <reference types="jquery" />
/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import ko = require("knockout");

import VSS = require("VSS/VSS");
import Marked = require("Presentation/Scripts/marked");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Controls = require("Admin/Scripts/TFS.Admin.Controls");
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import { FileUploadDialog } from "DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";
import { FileInputResult, FileInputContentType } from "VSSUI/FileInput";
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import { autobind } from "OfficeFabric/Utilities";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class AddSshConnectionsModel extends AddServiceEndpointModel {
    public host: KnockoutObservable<string> = ko.observable(null);
    public port: KnockoutObservable<string> = ko.observable("22"); //set default port (22) for SSH connections
    public privateKey: KnockoutObservable<string> = ko.observable(null);

    //tooltips on the dialog
    public sshHostHelpMarkdown: string;
    public sshPortHelpMarkdown: string;
    public sshPasswordHelpMarkdown: string;
    public sshKeyHelpMarkdown: string;

    private _uploadDialogContainer: HTMLElement;
    private _elementInstance: HTMLElement;

    constructor(successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallBack);
        this.width = 750;
        this.height = 600;

        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            let renderer = new MarkdownRenderer();
            this.sshHostHelpMarkdown = renderer.renderHtml(AdminResources.SshHostHelpText);
            this.sshPortHelpMarkdown = renderer.renderHtml(AdminResources.SshPortHelpText);
            this.sshPasswordHelpMarkdown = renderer.renderHtml(AdminResources.SshPasswordHelpText);
            this.sshKeyHelpMarkdown = renderer.renderHtml(AdminResources.SshKeyHelpText);
        }
        else {
            this.sshHostHelpMarkdown = Marked(AdminResources.SshHostHelpText);
            this.sshPortHelpMarkdown = Marked(AdminResources.SshPortHelpText);
            this.sshPasswordHelpMarkdown = Marked(AdminResources.SshPasswordHelpText);
            this.sshKeyHelpMarkdown = Marked(AdminResources.SshKeyHelpText);
        }
    }

    @autobind
    public loadTextFileContent(): void {
        const _maxFileSize: number = 10 * 1024;

        if (!this._elementInstance) {
            let container: HTMLCollectionOf<Element> = document.getElementsByClassName("file-input-container");
            if (container && (container.length > 0)) {
                this._elementInstance = container[0] as HTMLElement;
            } else {
                this._elementInstance = document.getElementById("file-input-container");
            }
        }

        if (!this._elementInstance) {
            throw new Error("file-input-container element not found");
        }

        if (!this._uploadDialogContainer) {
            this._uploadDialogContainer = document.createElement("div");
            this._elementInstance.appendChild(this._uploadDialogContainer);
        }

        ReactDOM.render(React.createElement(FileUploadDialog, {
            onDialogClose: this._onDialogClose,
            onOkClick: this._onOkClick,
            maxFileSize: _maxFileSize,
            resultContentType: FileInputContentType.RawText
        }), this._uploadDialogContainer);
    }

    @autobind
    private _onDialogClose(): void {
        ReactDOM.unmountComponentAtNode(this._uploadDialogContainer);
    }

    @autobind
    private _onOkClick(file: FileInputResult): void {
        this.privateKey(file.content);
    };
}

export class AddSshEndpointsDialog extends AddServiceEndpointDialog {
    constructor(model: AddSshConnectionsModel) {
        super(model);
    }

    public getTitle(): string {
        var title = AdminResources.AddSshConnectionsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        var connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }

        var host = this._element.find("#host").val().trim();
        var port = this._element.find("#port").val().trim();

        //url has to be set on every endpoint but it not used for the SSH endpoint, construct a valid url
        var url = "ssh://" + host;
        if (port && !isNaN(port) && Number(port) >= 0) {
            url = url + ":" + port;
        }

        var username = this._element.find("#username").val() == null ? null : this._element.find("#username").val().trim();

        var passwordKey = this._element.find("#pwd").val() == null ? null : this._element.find("#pwd").val().trim();
        if (passwordKey == "" && this._model.isUpdate()) {
            passwordKey = null;
        }

        var apiData: AdminCommon.IServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url: url,
            username: username,
            passwordKey: passwordKey,
            type: TFS_Admin_Common.ServiceEndpointType.SSH,
            scheme: TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword,
            parameters: {
                host: host,
                port: port,
                privateKey: this._element.find("#key").val().trim()
            }
        };

        var serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }

    protected preCheck(): boolean {
        var checkFailed = false;
        this._model.errors([]);

        // Verify the name is not empty when creating a new connection.
        var $name = this._element.find("#connectionName");
        if (this._checkEmpty($($name))) {
            this._model.errors.push(AdminResources.ConnectionNameIsRequired);
            checkFailed = true;
        }

        //verify hostname is specified
        var $nameHost = this._element.find("#host");
        if (this._checkEmpty($($nameHost))) {
            this._model.errors.push(AdminResources.SshHostIsRequired);
            checkFailed = true;
        }

        //verify username is specified
        var $userName = this._element.find("#username");
        if (!this._model.isUpdate() && this._checkEmpty($($userName))) {
            this._model.errors.push(AdminResources.SshUserNameIsRequired);
            checkFailed = true;
        }

        return checkFailed;
    }
}

KnockoutCommon.initKnockoutHandlers();

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.SshEndpointsManageDialog", exports);

/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Context = require("VSS/Context");
import Controls_Combos = require("VSS/Controls/Combos");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import ServiceEndpoint_Controls = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls");
import ServiceEndpoint_Utils = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import { Action } from "VSS/Flux/Action";
import { MarkdownRenderer } from "ContentRendering/Markdown";

KnockoutCommon.initKnockoutHandlers(true);

import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";


export class AddDockerRegistryEndpointModel extends ServiceEndpoint_Controls.AddServiceEndpointModel {

    public dialogTemplate: string = "add_docker_connections_dialog";
    public registrytype: KnockoutObservable<string> = ko.observable("Others");
    public isDockerHub: KnockoutComputed<boolean> = ko.computed(() => { return this.registrytype() === "DockerHub" });
    public registry: KnockoutObservable<string> = ko.observable("https://index.docker.io/v1/");
    public email: KnockoutObservable<string> = ko.observable("");
    public pwd: KnockoutObservable<string> = ko.observable("");
    public setDockerRegistry: KnockoutComputed<void> = ko.computed(() => {
        if (this.isDockerHub()) {
            this.registry("https://index.docker.io/v1/");
        }
    });
    public dockerRegistryHelpMarkdown: string;
    public verifyConnectionStatus: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssTextClass: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssIconClass: KnockoutObservable<string> = ko.observable("");

    protected _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;

    private _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    private _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    private _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    private _TEXT_CLASS_FAILURE: string = "vc-status-failure";

    constructor(successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void, options?: any) {
        super(successCallBack);

        let renderer = new MarkdownRenderer();
        this.dockerRegistryHelpMarkdown = renderer.renderHtml(Resources.DockerRegistryHelpText);
        this.verifyConnectionStatus(Resources.ConnectionStatusNotVerified);

        this.verifyConnectionStatus.subscribe((value: string) => {
            var statusIconCssClass = "";

            if (Utils_String.equals(value, Resources.ConnectionStatusVerified, true)) {
                this.verifyConnectionStatusCssTextClass(this._TEXT_CLASS_SUCCESS);
                // add status to the icon class to get the correct color (bowtie icons are all gray)
                statusIconCssClass = [this._ICON_CLASS_SUCCESS, this.verifyConnectionStatusCssTextClass()].join(" ");
                this.verifyConnectionStatusCssIconClass(statusIconCssClass);
            }
            else if (Utils_String.equals(value, Resources.ConnectionStatusFailed, true)) {
                this.verifyConnectionStatusCssTextClass(this._TEXT_CLASS_FAILURE);
                // add status to the icon class to get the correct color (bowtie icons are all gray)
                statusIconCssClass = [this._ICON_CLASS_FAILURE, this.verifyConnectionStatusCssTextClass()].join(" ");
                this.verifyConnectionStatusCssIconClass(statusIconCssClass);
            } else {
                this.verifyConnectionStatusCssTextClass("");
                this.verifyConnectionStatusCssIconClass("");
            }
        });

        var connection: Service.VssConnection = new Service.VssConnection(Context.getDefaultWebContext());
        this._distributedTaskClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);

    }

    public verifyConnection(): void {
        this.verifyConnectionStatus(Resources.ConnectionStatusVerifying);
        this.errors([]);

        var resultTransformationDetails: ServiceEndpoint_Contracts.ResultTransformationDetails = {
            resultTemplate: "",
            callbackContextTemplate: "",
            callbackRequiredTemplate: ""
        };

        var dataSourceDetails: ServiceEndpoint_Contracts.DataSourceDetails = {
            dataSourceName: "TestConnection",
            dataSourceUrl: "",
            headers: null,
            requestContent: null,
            requestVerb: null,
            resourceUrl: "",
            parameters: null,
            resultSelector: "",
            initialContextTemplate: ""
        };

        var serviceEndpointDetails = this.getServiceEndpoint();

        var serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest = {
            dataSourceDetails: dataSourceDetails,
            resultTransformationDetails: resultTransformationDetails,
            serviceEndpointDetails: serviceEndpointDetails.toServiceEndpointDetails()
        };

        var verifyConnectedServicePromise: IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = this.verifyConnectedService(serviceEndpointRequest, this.id());

        verifyConnectedServicePromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
        }, (error) => {
            this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
            this.errors.push(error);
        });
    }

    private verifyConnectedService(serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> {
        var endpointPromise: Q.Deferred<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = Q.defer<ServiceEndpoint_Contracts.ServiceEndpointRequestResult>();
        var verifyConnectionPromise = this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointRequest, endpointId);

        verifyConnectionPromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            if ((Utils_String.equals(result.statusCode, "ok", true)) && ((result.errorMessage === undefined) || (Utils_String.equals(result.errorMessage, "", true)))) {
                this.verifyConnectionStatus(Resources.ConnectionStatusVerified);
            } else {
                this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
                this.errors.push(result.errorMessage);
            }
            endpointPromise.resolve(result);
        }, (error) => {
            var errorMsg = error;
            if (!!error && !!error.serverError && !!error.serverError.innerException) {
                errorMsg = errorMsg + Utils_String.newLine + error.serverError.innerException.message;
            }

            endpointPromise.reject(new Error(errorMsg));
        });

        return endpointPromise.promise;
    }


    public onKeyDown(data: any, event: JQueryEventObject): boolean {
        var currentElement: JQuery = $(event.target);

        switch (event.keyCode) {
            case Utils_UI.KeyCode.ENTER:
                currentElement.click();
                return false;

            case Utils_UI.KeyCode.SPACE:
                currentElement.click();
                return false;

            default:
                return true;
        }
    }

    public getServiceEndpoint(): ServiceEndpoint_Common.ServiceEndpointDetails {

        var connectionIdTemp = this.id.peek().trim();
        if (!connectionIdTemp) {
            connectionIdTemp = ServiceEndpoint_Utils.GUIDUtils.newGuid();
        }

        var password = this.pwd();
        if (password === "" && this.isUpdate()) {
            password = null;
        }

        var registryValue = this.registry();
        if (registryValue === "") {
            registryValue = "https://index.docker.io/v1";
        }

        var endpointUrl = "https://hub.docker.com/";
        if (this.registrytype() !== "DockerHub") {
            endpointUrl = registryValue;
        }

        var apiData: ServiceEndpoint_Common.DockerRegistryServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this.name.peek().trim(),
            url: endpointUrl,
            username: this.userName(),
            passwordKey: password,
            registry: registryValue,
            type: ServiceEndpoint_Common.ServiceEndpointType.Docker,
            email: this.email(),
            parameters: {
                registrytype: this.registrytype()
            },
            scheme: ServiceEndpoint_Common.EndpointAuthorizationSchemes.UsernamePassword
        };

        return new ServiceEndpoint_Common.DockerRegistryServiceEndpointDetails(apiData);
    }

}

export class AddDockerRegistryEndpointsDialog extends ServiceEndpoint_Controls.AddServiceEndpointDialog {

    constructor(model: AddDockerRegistryEndpointModel) {
        super(model);
    }

    public getTitle(): string {
        var title = Resources.DockerRegistryTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    protected preCheck(): boolean {
        var checkFailed = false;

        // Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            // Skipping empty check for registry and email as these are not mandatory for some anonymous registry
            if ($(element).attr('id') !== "registry" && $(element).attr('id') !== "email" && $(element).attr('id') !== "pwd") {
                checkFailed = this._checkEmpty($(element));
            }

            return !checkFailed;
        });

        return checkFailed;
    }

    protected getServiceEndpointDetails(): ServiceEndpoint_Common.ServiceEndpointDetails {
        return (this._model as AddDockerRegistryEndpointModel).getServiceEndpoint();
    }

    protected createView(): JQuery {
        return $(AddDockerRegistryEndpointsDialog._add_docker_connection);
    }

    private static _add_docker_connection = `
    <div class="add_docker_connections_dialog services_dialog">
        <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
        <table>
            <tr>
                <td>
                    <label for="registrytype">${Resources.DockerRegistryType}</label></td>
                <td>
                    <span>
                        <input class="auth-kind" required type="radio" id="DockerHub" value="DockerHub" data-bind="checked: registrytype" />
                        ${Resources.DockerHub}</span>
                    <span>
                        <input class="auth-kind" required type="radio" id="Others" value="Others" data-bind="checked: registrytype" />
                        ${Resources.DockerRegistryOthers}</span>
                </td>
            </tr>

            <tr>
                <td>
                    <label for="connectionName">${Resources.ConnectionName}</label></td>
                <td>
                    <input class="textbox" data-bind="value: name" required id="connectionName" type="text" /></td>
            </tr>

            <tr>
                <td>
                    <label for="registry">${Resources.DockerRegistry}</label></td>
                <td>
                    <input class="textbox" required id="registry" type="text" data-bind="value: registry, disable: isDockerHub()" /></td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: dockerRegistryHelpMarkdown, minWidth: 200, pivotSiblingCssClass: 'value-field' }"></td>
            </tr>
            <tr>
                <td>
                    <label for="username">${Resources.DockerId}</label></td>
                <td>
                    <input class="textbox" required id="username" type="text" data-bind="value: userName" /></td>
            </tr>
            <tr>
                <td>
                    <label for="pwd">${Resources.DockerPassword}</label></td>
                <td>
                    <input class="textbox" required id="pwd" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }, value: pwd" /></td>
            </tr>
            <tr>
                <td style="min-width:150px">
                    <label for="email">${Resources.DockerEmail}</label></td>
                <td>
                    <input class="textbox" required id="email" type="text" data-bind="value: email" /></td>
            </tr>

            <tbody class="verify-connection-container" data-bind="visible: isDockerHub()">
                <tr>
                    <td class="header-line td" colspan="3">
                        <div class="header"></div>
                    </td>
                </tr>
                <tr>
                    <td style="min-width:150px">
                        <div class="verify-connection-status">
                            <span>${Resources.DockerConnectionLabel}</span>
                            <span class="bowtie-icon dialog-field-tooltip" data-bind="css: verifyConnectionStatusCssIconClass"></span>
                            <span class="status-main" data-bind="text: verifyConnectionStatus, css: verifyConnectionStatusCssTextClass"></span>
                        </div>
                    </td>
                    <td>
                        <div class="verify-action">
                            <span data-bind="click: verifyConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button">${Resources.DockerVerifyConnection}</a></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="footer-line td" colspan="3">
                        <div class="footer"></div>
                    </td>
                </tr>
            </tbody>

        </table>
        <div class="error-messages-div">
            <div data-bind="foreach: errors">
                <span data-bind="text: $data"></span>
                <br />
            </div>
        </div>
    </div>`;
}


VSS.tfsModuleLoaded("DockerRegistryManageDialog", exports);
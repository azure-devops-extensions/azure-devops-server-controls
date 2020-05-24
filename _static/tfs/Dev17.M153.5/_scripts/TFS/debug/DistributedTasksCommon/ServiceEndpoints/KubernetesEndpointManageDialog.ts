/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Contracts_FormInput = require("VSS/Common/Contracts/FormInput");
import Context = require("VSS/Context");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import KnockoutCommon = require("DistributedTasksCommon/TFS.Knockout.CustomHandlers");
import Utils_Array = require("VSS/Utils/Array");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import ServiceEndpoint_Controls = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls");
import ServiceEndpoint_Utils = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import { Action } from "VSS/Flux/Action";
import { MarkdownRenderer } from "ContentRendering/Markdown";
KnockoutCommon.initKnockoutHandlers(true);
import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";

export class AddKubernetesEndpointModel extends ServiceEndpoint_Controls.AddServiceEndpointModel {

    public dialogTemplate: string = "add_kubernetes_connections_dialog";

    public authorizationType: KnockoutObservable<string> = ko.observable("Kubeconfig");
    public authenticationScheme: KnockoutObservable<string> = ko.observable("");
    public isServiceAccountAuthorization: KnockoutComputed<boolean> = ko.computed(() => { return this.authorizationType() === "ServiceAccount" });
    public isKubeconfigAuthorization: KnockoutComputed<boolean> = ko.computed(() => { return this.authorizationType() === "Kubeconfig" });
    public serverUrl: KnockoutObservable<string> = ko.observable("");
    public isServerUrlInvalid: KnockoutComputed<boolean> = null;
    public serviceAccountToken: KnockoutObservable<string> = ko.observable("");
    public serviceAccountCertificate: KnockoutObservable<string> = ko.observable("");

    public kubeConfig: KnockoutObservable<string> = ko.observable("");
    public username: KnockoutObservable<string> = ko.observable("");
    public isGeneratePfx: KnockoutObservable<boolean> = ko.observable(false);
    public acceptUntrustedCerts: KnockoutObservable<boolean> = ko.observable(false);
    public dialogTitle: KnockoutObservable<string> = ko.observable("");
    public authSchemeSelectorText: string = Resources.KubernetesChooseAuthTypeText;

    public showVerifyConnection: KnockoutComputed<boolean> = ko.computed(() => {
        if (this.isServiceAccountAuthorization())
        {
            return false;
        }
 
        return true;
    });

    public verifyConnectionStatus: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssTextClass: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssIconClass: KnockoutObservable<string> = ko.observable("");

    protected _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;

    public kubernetesHelpMarkdown: string;
    public kubernetesServerUrlHelpText: string = Resources.KubernetesServerUrlHelpText;
    public acceptUntrustedCertsHelpText: string = Resources.KubernetesAcceptUntrustedCertsHelpText;

    public kubernetesServiceAccountTokenHelpText: string = Resources.KubernetesServiceAccountTokenHelpText;
    public kubernetesServiceAccountCertificateHelpText: string = Resources.KubernetesServiceAccountCertificateHelpText;
    public kubernetesServiceAccountDetailsText: string = Resources.KubernetesServiceAccountDetailsHelpSectionText;

    public learnMoreAboutKubernetesLink: string = Resources.LearnMoreAboutKubernetesLink;
    
    private _urlValidator: ServiceEndpoint_Utils.UriValidator;
    private _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    private _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    private _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    private _TEXT_CLASS_FAILURE: string = "vc-status-failure";

    constructor(successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void, options?: any) {
        super(successCallBack);

        let renderer = new MarkdownRenderer();
        this.kubernetesHelpMarkdown = renderer.renderHtml(Resources.KubernetesHelpText);
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
        this._urlValidator = new ServiceEndpoint_Utils.UriValidator(<Contracts_FormInput.InputValidation>{
            dataType: Contracts_FormInput.InputDataType.Uri,
            isRequired: true
        });

        this.isServerUrlInvalid = ko.computed(() => {
            var value = this.serverUrl();
            return !this._urlValidator.validate(value);
        });
    }

    public verifyConnection(): void {
        this.verifyConnectionStatus(Resources.ConnectionStatusVerifying);
        this.errors([]);

        if (this.isKubeconfigAuthorization()) {
            this.verifyConnectionForKubeconfig();
        }
        else if (this.isServiceAccountAuthorization()) {
            this.verifyConnectionForServiceAccount();
        }
    }

    private verifyConnectionForKubeconfig(): void {

        this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Kubernetes);
        this.createServiceEndpointRequestAndVerifyConnection();
    }

    private verifyConnectionForServiceAccount(): void {
        this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Token);
        this.createServiceEndpointRequestAndVerifyConnection();
    }

    private createServiceEndpointRequestAndVerifyConnection(headers: Array<ServiceEndpoint_Contracts.AuthorizationHeader> = null): void {
        var resultTransformationDetails: ServiceEndpoint_Contracts.ResultTransformationDetails = {
            resultTemplate: "",
            callbackContextTemplate: "",
            callbackRequiredTemplate: ""
        };

        var dataSourceDetails: ServiceEndpoint_Contracts.DataSourceDetails = {
            dataSourceName: "TestConnection",
            headers: headers,
            dataSourceUrl: "",
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

        this.verifyConnectedService(serviceEndpointRequest, this.id()).then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
        }, (error) => {
            this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
            this.errors.push(error);
        });
    }

    private verifyConnectedService(serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> {
        var verifyConnectionPromise = this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointRequest, endpointId);

        return verifyConnectionPromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            if ((Utils_String.equals(result.statusCode, "ok", true)) && !result.errorMessage || !result.errorMessage.trim()) {
                this.verifyConnectionStatus(Resources.ConnectionStatusVerified);
            } else {
                this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
                if (!this.acceptUntrustedCerts()) {
                    this.errors.push(Resources.KubernetesCheckAcceptUntrustedCertErrorHelpText);
                }
                else {
                    this.errors.push(result.errorMessage);
                }
            }

            return Q.resolve(result);
        }, (error) => {
            var errorMsg = error;
            if (!!error && !!error.serverError && !!error.serverError.innerException) {
                errorMsg = errorMsg + Utils_String.newLine + error.serverError.innerException.message;
            }

            return Q.reject(new Error(errorMsg));
        });
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

    public createServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        var connectionIdTemp = this.id.peek().trim();
        if (!connectionIdTemp) {
            connectionIdTemp = ServiceEndpoint_Utils.GUIDUtils.newGuid();
        }

        if (this.isKubeconfigAuthorization()) {
            this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Kubernetes);
        }
        else if (this.isServiceAccountAuthorization()) {
            this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Token);
        }

        return this.beginCreateServiceEndpoint();
    }

    public updateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {

        var connectionIdTemp = this.id.peek().trim();
        if (!connectionIdTemp) {
            connectionIdTemp = ServiceEndpoint_Utils.GUIDUtils.newGuid();
        }

        if (this.isKubeconfigAuthorization()) {
            this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Kubernetes);
        }
        else if (this.isServiceAccountAuthorization()) {
            this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.Token);
        }

        return this.beginUpdateServiceEndpoint();
    }

    public getServiceEndpoint(): ServiceEndpoint_Common.ServiceEndpointDetails {
        if (this.isKubeconfigAuthorization()) {
            return this.getServiceEndpointForKubeconfig();
        }
        else if (this.isServiceAccountAuthorization()) {
            return this.getServiceEndpointForServiceAccount();
        }
    }

    private getServiceEndpointForKubeconfig(): ServiceEndpoint_Common.ServiceEndpointDetails {

        var connectionIdTemp = this.id.peek().trim();
        if (!connectionIdTemp) {
            connectionIdTemp = ServiceEndpoint_Utils.GUIDUtils.newGuid();
        }

        var kubeConfig = this.kubeConfig();

        if ((!kubeConfig || kubeConfig === "") && this.isUpdate()) {
            kubeConfig = null;
        }

        var endpointUrl = this.serverUrl();

        var apiData: ServiceEndpoint_Common.KubernetesServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this.name(),
            url: this.serverUrl().trim(),
            type: ServiceEndpoint_Common.ServiceEndpointType.Kubernetes,
            scheme: this.authenticationScheme(),
            parameters: {
                authorizationType: this.authorizationType()
            }
        };

        var authorizationInfo: ServiceEndpoint_Contracts.EndpointAuthorization = {
            parameters: {
                kubeconfig: kubeConfig
            },
            scheme: this.authenticationScheme()
        };

        apiData.parameters["acceptUntrustedCerts"] = this.acceptUntrustedCerts().toString();

        return new ServiceEndpoint_Common.KubernetesServiceEndpointDetails(apiData, authorizationInfo);
    }

    private getServiceEndpointForServiceAccount(): ServiceEndpoint_Common.ServiceEndpointDetails {

        var connectionIdTemp = this.id.peek().trim();
        if (!connectionIdTemp) {
            connectionIdTemp = ServiceEndpoint_Utils.GUIDUtils.newGuid();
        }

        var endpointUrl = this.serverUrl();

        let serviceAccountToken = this.serviceAccountToken() ? this.serviceAccountToken() : null;
        if (serviceAccountToken === "" && this.isUpdate()) {
            serviceAccountToken = null;
        }

        let serviceAccountCertificate = this.serviceAccountCertificate() ? this.serviceAccountCertificate() : null;
        if (serviceAccountCertificate === "" && this.isUpdate()) {
            serviceAccountCertificate = null;
        }

        var apiData: ServiceEndpoint_Common.KubernetesServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this.name(),
            url: this.serverUrl().trim(),
            type: ServiceEndpoint_Common.ServiceEndpointType.Kubernetes,
            scheme: this.authenticationScheme(),
            parameters: {
                authorizationType: this.authorizationType()
            }
        };

        apiData.parameters["acceptUntrustedCerts"] = this.acceptUntrustedCerts().toString();

        var authorizationInfo: ServiceEndpoint_Contracts.EndpointAuthorization = {
            parameters: {
                apiToken: serviceAccountToken,
                serviceAccountCertificate: serviceAccountCertificate
            },

            scheme: this.authenticationScheme()
        };

        return new ServiceEndpoint_Common.KubernetesServiceEndpointDetails(apiData, authorizationInfo);
    }

    private _setGeneratePfx() : void
    {
        if (this.authenticationScheme() === ServiceEndpoint_Common.EndpointAuthorizationSchemes.None) {
            this.isGeneratePfx(true);
        }
        else if (!this.authenticationScheme()) {
            this.authenticationScheme(ServiceEndpoint_Common.EndpointAuthorizationSchemes.None);
            this.isGeneratePfx(false);
        }       
    }

    private beginCreateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var serviceEndpoint = this.getServiceEndpoint().toServiceEndpoint();
        return this._distributedTaskClient.beginCreateServiceEndpoint(serviceEndpoint, this.isPipelineAuthorizationEnabled()).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
            return Q.resolve(provisionEndpointResponse);
        }, (error) => {
            this.errors.push(error);
            return Q.reject(error);
        });
    }

    private beginUpdateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var serviceEndpoint = this.getServiceEndpoint().toServiceEndpoint();
        return this._distributedTaskClient.beginUpdateServiceEndpoint(serviceEndpoint).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
            return Q.resolve(provisionEndpointResponse);
        }, (error) => {
            this.errors.push(error);
            return Q.reject(error);
        });
    }
}

export class AddKubernetesEndpointsDialog extends ServiceEndpoint_Controls.AddServiceEndpointDialog {
    protected _model: AddKubernetesEndpointModel;

    constructor(model: AddKubernetesEndpointModel) {
        super(model);
    }

    public getTitle(): string {
        var title = Resources.KubernetesTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }

        this._model.dialogTitle(title);
        return title;
    }

    protected preCheck(): boolean {
        var checkFailed = false;

        //Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            checkFailed = this._checkEmpty($(element));

            if ($(element).attr('id') === "serviceAccountCertificate") { 
                checkFailed = this._checkEmpty($(element));
            }

            return !checkFailed;
        });

        return checkFailed;
    }

    public createServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        this._model.createServiceEndpoint().then((provisionEndpointResponse) => {
            defer.resolve(provisionEndpointResponse);
        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public updateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        this._model.updateServiceEndpoint().then((provisionEndpointResponse) => {
            defer.resolve(provisionEndpointResponse);
        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    protected getServiceEndpoint(): ServiceEndpoint_Contracts.ServiceEndpoint {
        return this._model.getServiceEndpoint().toServiceEndpoint();
    }

    protected createView(): JQuery {
        return $(AddKubernetesEndpointsDialog._add_kubernetes_connection);
    }

    private static _add_kubernetes_connection = `
    <div class="add_kubernetes_connections_dialog services_dialog">
        <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
        <table>
            <tr>
                <td>
                    <label id="authorizationRadioGroupLabel">${Resources.KubernetesChooseAuthTypeText}</label>
                </td>
                <td>
                    <div id="authorizationType" role="radiogroup" data-bind='attr: {"aria-label": authSchemeSelectorText}'>
                        <span>
                            <input role="radio" name="kubernetesAuthorizationType" class="auth-kind" required type="radio" id="KubeconfigType" value="Kubeconfig" data-bind="checked: authorizationType, attr: { 'aria-checked': (authorizationType() === 'Kubeconfig') ? 'true' : 'false' }" />
                            <label for="KubeconfigType">${Resources.KubernetesKubeconfigAuthText}</label>
                        </span>
                        <span>
                            <input role="radio" name="kubernetesAuthorizationType" class="auth-kind" required type="radio" id="ServiceAccountType" value="ServiceAccount" data-bind="checked: authorizationType, attr: { 'aria-checked': (authorizationType() === 'ServiceAccount') ? 'true' : 'false' }" />
                            <label for="ServiceAccountType">${Resources.KubernetesServiceAccountAuthText}</label>
                        </span>
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    <label for="connectionName">${Resources.ConnectionName}</label>
                </td>
                <td>
                    <input class="textbox" data-bind="value: name, css: { 'invalid': !name() }, valueUpdate: ['blur', 'afterkeydown']" required id="connectionName" type="text" />
                </td>
            </tr>

            <tr>
                <td>
                    <label for="serverUrl">${Resources.ServerUrl}</label>
                </td>
                <td>
                    <input class="textbox" required id="serverUrl" type="text" data-bind="value: serverUrl, css: { 'invalid': isServerUrlInvalid() }, valueUpdate: ['blur', 'afterkeydown']" />
                </td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: kubernetesServerUrlHelpText, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </td>
            </tr>

             <tr data-bind="visible: isKubeconfigAuthorization()">
                <td>
                    <label for="kubeConfig">${Resources.KubernetesKubeConfigText}</label>
                </td>
                <td>
                    <textarea class="textbox" required id="kubeConfig" data-bind="attr: { placeholder: (isUpdate()) ? '********' : '' }, value: kubeConfig, css: { 'invalid': !isUpdate() && !kubeConfig() }, valueUpdate: ['blur', 'afterkeydown']"></textarea>
                </td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: kubernetesHelpMarkdown, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </td>
            </tr>

            <tr data-bind="visible: isServiceAccountAuthorization()">
                <td>
                    <label for="serviceAccountToken">${Resources.KubernetesServiceAccountToken}</label>
                </td>
                <td>
                    <textarea class="textbox" required id="serviceAccountToken" data-bind="attr: { placeholder: (isUpdate()) ? '********' : '' }, value: serviceAccountToken, css: { 'invalid': !isUpdate() && !serviceAccountToken() }, valueUpdate: ['blur', 'afterkeydown']"></textarea>
                </td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: kubernetesServiceAccountTokenHelpText, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </td>
            </tr>

            <tr data-bind="visible: isServiceAccountAuthorization()">
                <td>
                    <label for="serviceAccountCertificate">${Resources.KubernetesServiceAccountCertificate}</label>
                </td>
                <td>
                    <textarea class="textbox" required id="serviceAccountCertificate" data-bind="attr: { placeholder: (isUpdate()) ? '********' : '' }, value: serviceAccountCertificate, css: { 'invalid': !isUpdate() && !serviceAccountCertificate() }, valueUpdate: ['blur', 'afterkeydown']"></textarea>
                </td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: kubernetesServiceAccountCertificateHelpText, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </td>
            </tr>

            <tr>
               <td>
                    <label for="acceptUntrustedCerts">${Resources.KubernetesAcceptUntrustedCerts}</label>
                </td>
                <td>
                    <input id="acceptUntrustedCerts" type="checkbox" data-bind="checked: acceptUntrustedCerts, css: { 'invalid': !acceptUntrustedCerts() }, valueUpdate: ['blur', 'afterkeydown']"/>
                </td>
                <td class="helpMarkDown" data-bind="showTooltip: { text: acceptUntrustedCertsHelpText, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </td>
            </tr>
        </table>
        <table>
            <tbody>
                <tr data-bind="visible: isServiceAccountAuthorization()">
                    <td><label for="kubernetesServiceAccountDetails">${Resources.KubernetesServiceAccountDetailsHelpHeaderText}</label></td>
                </tr>

                <tr data-bind="visible: isServiceAccountAuthorization()">
                    <td colspan="4" data-bind="html: kubernetesServiceAccountDetailsText"></td>
                </tr>
            </tbody>
            <tbody class="verify-connection-container" data-bind="visible: showVerifyConnection()">
                <tr>
                    <td class="header-line td" colspan="3">
                        <div class="header"></div>
                    </td>
                </tr>
                <tr>
                    <td style="min-width:150px">
                        <div class="verify-connection-status">
                            <span>${Resources.ConnectionLabel}</span>
                            <span class="bowtie-icon dialog-field-tooltip" data-bind="css: verifyConnectionStatusCssIconClass"></span>
                            <span class="status-main" data-bind="text: verifyConnectionStatus, css: verifyConnectionStatusCssTextClass"></span>
                        </div>
                    </td>
                    <td>
                        <div class="verify-action">
                            <span data-bind="click: verifyConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button">${Resources.VerifyConnection}</a></span>
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
                <span role="alert" data-bind="text: $data"></span><br />
            </div>
        </div>
        <span data-bind="html: learnMoreAboutKubernetesLink"></span>
    </div>`;
}

VSS.tfsModuleLoaded("KubernetesEndpointManageDialog", exports);


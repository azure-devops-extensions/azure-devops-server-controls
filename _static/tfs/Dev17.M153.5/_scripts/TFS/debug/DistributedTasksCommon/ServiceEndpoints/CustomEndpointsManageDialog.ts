/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Contracts_FormInput = require("VSS/Common/Contracts/FormInput");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Context = require("VSS/Context");
import Controls_Combos = require("VSS/Controls/Combos");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Service = require("VSS/Service");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import ServiceEndpoint_Controls = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls");
import ServiceEndpoint_Utils = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");

import { MarkdownRenderer } from "ContentRendering/Markdown";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { ServiceEndpointHttpClient5 } from "TFS/ServiceEndpoint/ServiceEndpointRestClient";

export class AddCustomConnectionsModel extends ServiceEndpoint_Controls.AddServiceEndpointModel {
    public dialogTemplate: string = "add_custom_connections_dialog";
    public errors: KnockoutObservableArray<string> = ko.observableArray([]);
    public id: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public serverUrl: KnockoutObservable<string> = ko.observable("");
    public serverUrlDisplayName: KnockoutObservable<string> = ko.observable("");
    public serverUrlHelpText: KnockoutObservable<string> = ko.observable("");
    public serverConfigurationUrl: KnockoutObservable<string> = ko.observable("");
    public serverConfigurationUrlDisplayName: KnockoutObservable<string> = ko.observable("");
    public serverConfigurationUrlFooter: KnockoutObservable<string> = ko.observable("");
    public serverConfigurationUrlHelpText: KnockoutObservable<string> = ko.observable("");
    public description: KnockoutObservable<string> = ko.observable("");
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public showUrl: KnockoutObservable<boolean> = ko.observable(true);
    public showConfigurationUrl: KnockoutObservable<boolean> = ko.observable(false);
    public disconnectService: boolean = false;
    public title: string = "";
    public type: string = "";
    public typeDisplayName: string = "";
    public isReady: boolean = true;
    public operationStatus = { "state": "Ready", "statusMessage": "" };
    public inputDescriptors: KnockoutObservableArray<InputViewModel> = ko.observableArray([]);
    public authenticationSchemes: KnockoutObservableArray<ServiceEndpoint_Contracts.ServiceEndpointAuthenticationScheme> = ko.observableArray([]);
    public selectedAuthenticationScheme: KnockoutObservable<string> = ko.observable("");
    public artifactsChangeNotifier: KnockoutObservable<boolean> = ko.observable(false);
    public helpLink: KnockoutObservable<ServiceEndpoint_Contracts.HelpLink> = ko.observable({ "text": "", "url": "" });
    public helpMarkDown: KnockoutObservable<string> = ko.observable("");
    public _inputViewModels: InputViewModel[] = [];
    public urlDependsOn: KnockoutObservable<string> = ko.observable("");
    public showVerifyConnection: KnockoutComputed<boolean>;
    public isTestConnectionDataSourceAvailable: KnockoutObservable<boolean> = ko.observable(false);
    public verifyConnectionStatus: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssTextClass: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssIconClass: KnockoutObservable<string> = ko.observable("");
    public dialogTitle: KnockoutObservable<string> = ko.observable("");
    public jenkinsLicenseText: string = Resources.JenkinsLicenseText;
    public authSchemeSelectorText: string = Resources.AuthSchemeSelector;

    private _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    private _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    private _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    private _TEXT_CLASS_FAILURE: string = "vc-status-failure";

    private _OAUTH_CONFIG_HUB: string = "_admin/_oauthconfigurations"; 

    constructor(endpointType: ServiceEndpoint_Contracts.ServiceEndpointType, serverUrl: string, data: EndpointData, selectedAuthScheme: string, isUpdate: boolean, successCallback: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void) {
        super(successCallback);

        this._context = Context.getDefaultWebContext();
        var connection: Service.VssConnection = new Service.VssConnection(this._context);
        this._distributedTaskClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
        this._serviceEndpointClient = connection.getHttpClient(ServiceEndpointHttpClient5);

        this._endpointTypeModel = endpointType;
        this.serverUrl(serverUrl);
        this.isUpdate(isUpdate);

        this._update(endpointType, data, selectedAuthScheme);
        if ((this._endpointTypeModel.endpointUrl) && (this._endpointTypeModel.endpointUrl.dependsOn) && (this._endpointTypeModel.endpointUrl.dependsOn.map) && (this._endpointTypeModel.endpointUrl.dependsOn.input)) {
            this.urlDependsOn(this._endpointTypeModel.endpointUrl.dependsOn.input);
        }
        else {
            this.urlDependsOn("");
        }

        this._uriValidator = new ServiceEndpoint_Utils.UriValidator(<Contracts_FormInput.InputValidation>{
            dataType: Contracts_FormInput.InputDataType.Uri,
            isRequired: true
        });

        if (!!Utils_Array.first(endpointType.dataSources, (e) => { return (Utils_String.equals(e.name, "TestConnection", true)) })) {
            this.isTestConnectionDataSourceAvailable(true);
        }

        this.showVerifyConnection = this._disposalManager.addDisposable(ko.computed((): boolean => {
            var isAzureUsernamePasswordScheme = Utils_String.equals(this._endpointTypeModel.name, "azure", false)
                && Utils_String.equals(this.selectedAuthenticationScheme(), "UsernamePassword", false);
            var isOAuth2Scheme = Utils_String.equals(this.selectedAuthenticationScheme(), ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2, false);
            var showVerifyConnection = this.isTestConnectionDataSourceAvailable() && !isAzureUsernamePasswordScheme && !isOAuth2Scheme;
            return showVerifyConnection;
        }));

        this._setVerifyConnectionStatus(Resources.ConnectionStatusNotVerified, false);

        this._disposalManager.addDisposable(this.verifyConnectionStatus.subscribe((value: string) => {
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

                // announce 'appends' the status on failure; earlier calls to 'this.errors' may overwrite the status
                Utils_Accessibility.announce(status, false);
            } else {
                this.verifyConnectionStatusCssTextClass("");
                this.verifyConnectionStatusCssIconClass("");
            }
        }));
    }

    public getServiceEndpoint(isVerifyConnection: boolean): ServiceEndpoint_Common.ServiceEndpointDetails {
        var connectionId = "0";

        if (!isVerifyConnection) {
            connectionId = this.id.peek().trim();

            if (!connectionId) {
                connectionId = ServiceEndpoint_Utils.GUIDUtils.newGuid();
            }
        }

        var type = this.type;
        var scheme = this.selectedAuthenticationScheme.peek();
        var serverUrl = "";
        if (this.showConfigurationUrl() === true) {
            serverUrl = null;
        } else {
            serverUrl = this.serverUrl.peek().trim();
        }
        var apiData: ServiceEndpoint_Common.IServiceEndpointApiData = {
            endpointId: connectionId,
            endpointName: this.name.peek().trim(),
            url: serverUrl,
            username: "",
            passwordKey: "",
            type: type,
            scheme: scheme,
            parameters: {}
        };

        var authorizationInfo: ServiceEndpoint_Contracts.EndpointAuthorization = {
            parameters: {
            },
            scheme: scheme
        };

        this.inputDescriptors().forEach((value: InputViewModel): void => {
            if (Utils_String.equals(value.groupName(), "AuthenticationParameter", true)) {
                let authValue = value.getValue() === null ? null: value.getValue().trim();
                if (authValue == "" && this.isUpdate() && value.isConfidential()) {
                    authValue = null;
                }

                authorizationInfo.parameters[value.id()] = authValue;
            }
            else {
                let data = value.getValue() === null ? null: value.getValue().trim();
                if (data === "" && this.isUpdate() && value.isConfidential()) {
                    data = null;
                }

                apiData.parameters[value.id()] = data;
            }
        });

        var serviceEndpointDetails = new ServiceEndpoint_Common.ServiceEndpointDetails(apiData, authorizationInfo);
        return serviceEndpointDetails;
    }

    public verifyConnection(): void {
        var checkFailed = false;
        this.errors([]);

        // Input fields check
        checkFailed = this.validateInputs();

        if (checkFailed && this.errors().length === 0) {
            if (this.errors().length === 0) {
                this.errors.push(Resources.AllFieldsRequired);
            }

            this._setVerifyConnectionStatus(Resources.ConnectionStatusFailed);
        } else {
            var serviceEndpointDetails = this.getServiceEndpointDetails();
            var dataSourceDetails: ServiceEndpoint_Contracts.DataSourceDetails = {
                dataSourceName: "TestConnection",
                dataSourceUrl: "",
                headers: null,
                resourceUrl: "",
                requestContent: null,
                requestVerb: null,
                parameters: null,
                resultSelector: "",
                initialContextTemplate: ""
            };
            var resultTransformationDetails: ServiceEndpoint_Contracts.ResultTransformationDetails = {
                resultTemplate: "",
                callbackContextTemplate: "",
                callbackRequiredTemplate: ""
            };
            var serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest = {
                dataSourceDetails: dataSourceDetails,
                resultTransformationDetails: resultTransformationDetails,
                serviceEndpointDetails: serviceEndpointDetails
            };

            this._setVerifyConnectionStatus(Resources.ConnectionStatusVerifying);
            var verifyConnectedServicePromise: IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = this.verifyConnectedService(serviceEndpointRequest, this.id());

            verifyConnectedServicePromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            }, (error) => {
                this._setVerifyConnectionStatus(Resources.ConnectionStatusFailed);
                this.errors.push(error);
            });
        }
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

    public validateInputs(): boolean {
        var checkFailed = false;

        if ((this.name.peek().length === 0) || this.showConfigurationUrl() || (this.serverUrl.peek().length === 0)) {
            return true;
        }

        let isInvalidUrl = this.isUrlInvalid();
        if(this.showUrl() && isInvalidUrl) {
            let errorMessage = Utils_String.localeFormat(Resources.CustomEndpointInvalidUriInputMessage, this.serverUrlDisplayName());
            this.errors.push(errorMessage);
        }

        this.inputDescriptors().forEach((value: InputViewModel, index: number) => {
            // username can be empty for Pat token authentication types
            if (Utils_String.equals(value.id(), "username", true) && value.value().length !== 0 && value.isInvalid()) {
                checkFailed = true;
                let errorMessage = value.getErrorMessage();
                if (errorMessage !== undefined && errorMessage !== "") {
                    this.errors.push(errorMessage);
                }
            }

            if (!Utils_String.equals(value.id(), "username", true) && value.isRequired && value.isInvalid()) {
                checkFailed = true;
                if(value.value().length > 0) {
                    if(value.inputDataType === Contracts_FormInput.InputDataType.Guid) {
                        let errorMessage = Utils_String.localeFormat(Resources.CustomEndpointInvalidGuidInputMessage, value.name())
                        this.errors.push(errorMessage);
                    }
                    else {
                        let errorMessage = Utils_String.localeFormat(Resources.CustomEndpointInvalidInputMessage, value.name())
                        this.errors.push(errorMessage);
                    }
                }
            }

            if (checkFailed) {
                return checkFailed;
            }
        });

        return checkFailed;
    }

    public updateDependentField(id: string, value: string, data?: string) {
        if ((this._endpointTypeModel.endpointUrl) && (this._endpointTypeModel.endpointUrl.dependsOn) && (this._endpointTypeModel.endpointUrl.dependsOn.map) && (this._endpointTypeModel.endpointUrl.dependsOn.input === id)) {
            for (var i = 0; i < this._endpointTypeModel.endpointUrl.dependsOn.map.length; i++) {
                if (this._endpointTypeModel.endpointUrl.dependsOn.map[i].key === value) {
                    this.serverUrl(this._endpointTypeModel.endpointUrl.dependsOn.map[i].value);
                }
            }
        }

        if (id === ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId){
            this.serverConfigurationUrl(data);
        }
    }

    public isNameInvalid(): boolean {
        var valid = false;
        valid = this.name() !== undefined ? this.name().trim().length >= 1 : false;

        return !valid;
    }

    public isUrlInvalid(): boolean {
        var valid = false;
        valid = this._uriValidator.validate(this.serverUrl());

        return !valid;
    }

    public getInputViewModel(id: string): InputViewModel {
        return this._inputsMap[id];
    }

    public initializeDefaultValues() {
    }

    public dispose() {
        this._disposalManager.dispose();
    }

    private getServiceEndpointDetails(): ServiceEndpoint_Contracts.ServiceEndpointDetails {
        return this.getServiceEndpoint(true).toServiceEndpointDetails();
    }

    private verifyConnectedService(serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest, endpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> {
        var endpointPromise: Q.Deferred<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = Q.defer<ServiceEndpoint_Contracts.ServiceEndpointRequestResult>();
        var verifyConnectionPromise = this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointRequest, endpointId);

        verifyConnectionPromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            if ((Utils_String.equals(result.statusCode, "ok", true)) && ((result.errorMessage === undefined) || (Utils_String.equals(result.errorMessage, "", true)))) {
                this._setVerifyConnectionStatus(Resources.ConnectionStatusVerified);
            } else {
                this._setVerifyConnectionStatus(Resources.ConnectionStatusFailed);
                this.errors.push(result.errorMessage);
                if ((Utils_String.equals(result.statusCode, "ok", true)) && (result.errorMessage !== "")) {
                    this.errors.push(Utils_String.format(Resources.VerifyServiceEndpointFailureSuggestion, ServiceEndpoint_Common.productName()));
                }
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

    private _update(endpointType: ServiceEndpoint_Contracts.ServiceEndpointType, data: EndpointData, selectedAuthScheme: string) {
        this.type = endpointType.name;
        this.typeDisplayName = endpointType.displayName;

        this.authenticationSchemes(Utils_Array.clone(endpointType.authenticationSchemes));

        this.setUrlParameters(endpointType);

        this.selectedAuthenticationScheme.subscribe((scheme: string) => {
            var authenticationScheme = Utils_Array.first(this.authenticationSchemes(), (s) => {
                return Utils_String.equals(s.scheme, scheme, true);
            });

            this._inputViewModels = [];
            this.inputDescriptors([]);

            if (scheme === ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2) {
                this.showConfigurationUrl(true);
                var oAuthConfigurationUrl = TaskUtils.PresentationUtils.getUrlForCollectionLevelExtension("", "", "", this._OAUTH_CONFIG_HUB);

                this.serverConfigurationUrlDisplayName(Utils_String.format(Resources.ConfigurationUrl, endpointType.displayName));
                this.serverConfigurationUrlHelpText(Resources.ConfigurationUrlHelpText);
                this.serverConfigurationUrlFooter(Utils_String.format(Resources.ConfigurationUrlFooterText, oAuthConfigurationUrl));
                this.showUrl(false);
            } else {
                this.showConfigurationUrl(false);
                this.setUrlParameters(endpointType);
            }

            $.each(endpointType.inputDescriptors, (index: number, element: Contracts_FormInput.InputDescriptor) => {
                var viewModel = this._createInputViewModel(element, data);
                this._inputViewModels.push(viewModel);
                this.inputDescriptors.push(viewModel);
            });

            $.each(authenticationScheme.inputDescriptors, (index: number, element: Contracts_FormInput.InputDescriptor) => {
                if (element.hasDynamicValueInformation) {
                    this.getDynamicValuesOfInputDescriptor(element).then(() => {
                        var viewModel = this._createInputViewModel(element, data);
                        this._inputViewModels.push(viewModel);
                        this.inputDescriptors.push(viewModel);
                    });
                }
                else {
                    var viewModel = this._createInputViewModel(element, data);
                    this._inputViewModels.push(viewModel);
                    this.inputDescriptors.push(viewModel);
                }
            });
        });

        this.selectedAuthenticationScheme(selectedAuthScheme);

        if (endpointType.helpLink) {
            this.helpLink(endpointType.helpLink);
        }

        if (endpointType.helpMarkDown) {
            if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
                let renderer = new MarkdownRenderer({ html: true });
                this.helpMarkDown(renderer.renderHtml(endpointType.helpMarkDown));
            }
            else {
                TaskUtils.PresentationUtils.marked(endpointType.helpMarkDown).then((markedString: string) => {
                    this.helpMarkDown(markedString);
                });
            }
        }

        this._runCustomizations(endpointType.name);
    }

    private setUrlParameters(endpointType: ServiceEndpoint_Contracts.ServiceEndpointType) {
        this.showUrl(true);
        if (endpointType.endpointUrl && endpointType.endpointUrl.value) {
            if (!this.isUpdate()) {
                this.serverUrl(endpointType.endpointUrl.value);
            }

            if (Utils_String.equals(endpointType.endpointUrl.isVisible, "false", true)) {
                this.showUrl(false);
            }
        }

        if (!endpointType.endpointUrl || !endpointType.endpointUrl.displayName) {
            this.serverUrlDisplayName(Resources.ServerUrl);
        }
        else {
            this.serverUrlDisplayName(endpointType.endpointUrl.displayName);
        }

        if (endpointType.endpointUrl) {
            this.serverUrlHelpText(endpointType.endpointUrl.helpText);
        }
    }

    private _runCustomizations(endpointTypeName: string): void {
        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessHideServicePrincipal, false)
            && endpointTypeName === ServiceEndpoint_Common.ServiceEndpointType.Azure
            && !(this.isUpdate() && this.selectedAuthenticationScheme() === ServiceEndpoint_Common.EndpointAuthorizationSchemes.ServicePrincipal)) {
            this.authenticationSchemes.remove((authenticationScheme: ServiceEndpoint_Contracts.ServiceEndpointAuthenticationScheme) => {
                return authenticationScheme.scheme === ServiceEndpoint_Common.EndpointAuthorizationSchemes.ServicePrincipal;
            });
        }
    }

    public getDynamicValuesOfInputDescriptor(inputDescriptor: Contracts_FormInput.InputDescriptor): IPromise<any> {
        var defer = Q.defer<any>();

        if (inputDescriptor.id === ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId) {
            inputDescriptor.values = {
                possibleValues: [],
                isLimitedToPossibleValues : true
            } as Contracts_FormInput.InputValues;
            this._serviceEndpointClient.getOAuthConfigurations(this._endpointTypeModel.name).then((oauthConfigurations: ServiceEndpoint_Contracts.OAuthConfiguration[]) => {
                oauthConfigurations.forEach((oauthConfiguration: ServiceEndpoint_Contracts.OAuthConfiguration) => {
                    let inputValue = {
                        value: oauthConfiguration.id,
                        displayValue: oauthConfiguration.name
                    } as Contracts_FormInput.InputValue;

                    inputValue.data = [];
                    inputValue.data["url"]= oauthConfiguration.url;
                    inputDescriptor.values.possibleValues.push(inputValue);
                    inputDescriptor.values.defaultValue = "Select";
                    defer.resolve();
                });

            }, (error) => {
                defer.reject();
            });
        }

        return defer.promise;
    }

    private _createInputViewModel(inputDescriptor: Contracts_FormInput.InputDescriptor, data: EndpointData): InputViewModel {
        var inputViewModel: InputViewModel;

        if (this._inputsMap[inputDescriptor.id]) {
            inputViewModel = this._inputsMap[inputDescriptor.id];
            return inputViewModel;
        }

        var validator: ServiceEndpoint_Utils.BaseValidator = this._getValidator(inputDescriptor.validation);

        if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.Combo) {
            inputViewModel = new ComboInputViewModel(inputDescriptor, validator);
        }
        else if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.CheckBox) {
            inputViewModel = new CheckboxInputViewModel(inputDescriptor, validator);
        }
        else {
            inputViewModel = new StringInputViewModel(inputDescriptor, validator);
        }

        if (data) {
            var inputDescriptionId = inputViewModel.id();
            if (data.hasOwnProperty(inputDescriptionId)) {
                var value = data[inputDescriptionId];
                if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.Combo) {
                    value = inputViewModel.valueToDisplayValue(value);
                }
                else if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.CheckBox) {
                    // The CheckBox's attribute "checked" expects a Boolean value, but not a string
                    // as our InputViewModel currently designed. The CheckBox accepts any non-empty string as True. 
                    // Let's convert any not virtually "true" values (e.g. undefined, null, "false") to a "falsy" empty string.
                    value = Utils_String.equals("true", value, true) ? "true" : "";
                }

                if (value) {
                    inputViewModel.value(value);
                }
            }
        }

        if (!!inputDescriptor.validation) {
            inputViewModel.isRequired = inputDescriptor.validation.isRequired;
        }

        inputViewModel.isUpdate = this.isUpdate();

        this._inputsMap[inputDescriptor.id] = inputViewModel;
        this._disposalManager.addDisposable(inputViewModel);
        return inputViewModel;
    }

    private _getValidator(validation: Contracts_FormInput.InputValidation) {
        var validator: ServiceEndpoint_Utils.BaseValidator;
        switch (validation.dataType) {

            case Contracts_FormInput.InputDataType.String:
                validator = new ServiceEndpoint_Utils.StringValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Guid:
                validator = new ServiceEndpoint_Utils.GuidValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Number:
                validator = new ServiceEndpoint_Utils.NumberValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Uri:
                validator = new ServiceEndpoint_Utils.UriValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Boolean:
                validator = new ServiceEndpoint_Utils.BooleanValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.None:
            default:
                validator = new ServiceEndpoint_Utils.BaseValidator(validation);
                break;
        }

        return validator;
    }

    private _setVerifyConnectionStatus(status: string, announce: boolean = true): void {
        this.verifyConnectionStatus(status);
        if (announce) {
            Utils_Accessibility.announce(status, false);
        }
    }

    private _endpointTypeModel: ServiceEndpoint_Contracts.ServiceEndpointType;
    private _inputsMap: { [name: string]: InputViewModel } = {};
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _uriValidator: ServiceEndpoint_Utils.UriValidator;
    private _context: Contracts_Platform.WebContext;
    protected _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;
    protected _serviceEndpointClient: ServiceEndpointHttpClient5;
}

export class AddCustomConnectionsDialog extends ServiceEndpoint_Controls.AddServiceEndpointDialog {

    constructor(model: AddCustomConnectionsModel) {
        super(model);
        this._customModel = model;
    }

    public initialize(): void {
        super.initialize();
        this._element.addClass("custom-endpoint-dialog");
    }

    public getTitle(): string {
        var title = Utils_String.format(Resources.AddCustomConnectionsDialogTitle, this._customModel.typeDisplayName);
        if (this._model.title !== "") {
            title = this._model.title;
        }

        this._customModel.dialogTitle(title);
        return title;
    }

    protected createView(): JQuery {
        TaskUtils.HtmlHelper.renderTemplateIfNeeded("service_endpoint_type_input", AddCustomConnectionsDialog._service_endpoint_type_input);
        return $(AddCustomConnectionsDialog._add_custom_connections_dialog);
    }

    protected preCheck(): boolean {
        var checkFailed = false;

        // Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            // username can be empty for Pat token authentication types
            if (($(element).attr('id') === "username") && !this._checkEmpty($(element)) && (!!$(element).attr('class') && $(element).attr('class').indexOf('invalid') > -1)) {
                checkFailed = true;
            }
            else if (($(element).attr('id') !== "username") && (!!$(element).attr('class') && $(element).attr('class').indexOf('invalid') > -1)) {
                checkFailed = true;
            }

            return !checkFailed;
        });

        this._customModel.validateInputs();

        return checkFailed;
    }

    protected getServiceEndpointDetails(): ServiceEndpoint_Common.ServiceEndpointDetails {
        return this._customModel.getServiceEndpoint(false);
    }

    _customModel: AddCustomConnectionsModel;

    private static _service_endpoint_type_input = `
    <td class="key-field">
        <!-- ko if: mode !== "none" -->
        <label data-bind="html: displayName, attr: { for: id, id: id + '-label' }, css: { 'bold-text': isInvalid() }" />
        <!-- /ko -->
    </td>
    <td class="value-field">
        <!-- ko if: mode === "checkbox" -->
        <input type="checkbox" data-bind="attr: { id: id }, checked: value, css: { 'invalid': isInvalid() }, disable: isReadOnly" />
        <!-- /ko -->

        <!-- ko if: mode === "textbox" -->
        <input class="textbox" type="text" data-bind="attr: { id: id, placeholder: (isConfidential && $parent.isUpdate()) ? '********' : '' }, value: value, event: { change: $parent.updateDependentField(id(), value()) }, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, disable: isReadOnly, event: { blur: handleFinalValue }" />
        <!-- /ko -->

        <!-- ko if: mode === "password" -->
        <input class="textbox" type="password" data-bind="attr: { id: id, placeholder: (isConfidential && $parent.isUpdate()) ? '********' : '' }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, disable: isReadOnly, event: { blur: handleFinalValue }" />
        <!-- /ko -->

        <!-- ko if: mode === "combo" -->
        <div class="pick-list" data-bind="dtcCombo: getComboOptions(), attr: { id: id }, event: { change: $parent.updateDependentField(id(), getValue(), getData()) }"></div>
        
        <!-- /ko -->

        <!-- ko if: mode === "textArea" -->
        <textarea class="textbox" data-bind="attr: { id: id, placeholder: (isConfidential && $parent.isUpdate()) ? '********' : '' }, value: value, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isInvalid() }, disable: isReadOnly, event: { blur: handleFinalValue }"></textarea>
        <!-- /ko -->
    </td>
    <!-- ko if: description -->
    <td data-bind="showTooltip: { text: description, pivotSiblingCssClass: 'value-field', labelledby: id + '-label' }"> </td>
    <!-- /ko -->`;

    private static _add_custom_connections_dialog = `
    <div class="add_custom_connections_dialog services_dialog">
        <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
        <div class="input-container">
            <div class="auth-scheme-container" role="radiogroup" data-bind='attr: {"aria-label": dialogTitle + authSchemeSelectorText}' >
                <!-- ko if: authenticationSchemes().length > 1 -->
                    <!-- ko foreach: authenticationSchemes -->
                        <input class="auth-scheme-container" type="radio" name="authenticationSchemes" data-bind="value: scheme, checked: $parent.selectedAuthenticationScheme, attr: {'aria-checked':($parent.selectedAuthenticationScheme()==scheme) ? 'true':'false', 'aria-labelledby':'scheme-id-'+scheme}" />
                        <label class="auth-scheme-container" data-bind="text: displayName, attr: {id:'scheme-id-'+scheme}"></label>
                    <!-- /ko -->
                <!-- /ko -->
            </div>

            <table class="auth-scheme-input" role="presentation">
                <tr>
                    <td>
                        <label data-bind="css: { 'bold-text': isNameInvalid() }" for="connectionName">${Resources.ConnectionName}</label></td>
                    <td>
                        <input class="textbox" data-bind="value: name, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isNameInvalid() }" required id="connectionName" type="text" /></td>
                </tr>
                <tbody data-bind="foreach: inputDescriptors">		
                    <!-- ko if: $parent.urlDependsOn() == id() -->		
                        <tr data-bind="template: { name: templateName }, css: { 'endpoint-hidden-column': isDisabled() }">		
                    </tr>		
                    <!-- /ko -->		
                </tbody>
                <tr data-bind="css: { 'endpoint-hidden-column': !showUrl() }">
                    <td>
                        <label for="url" data-bind="css: { 'bold-text': isUrlInvalid() }, text: serverUrlDisplayName"></label>
                    </td>
                    <td class="serverUrl">
                        <input class="textbox" data-bind="value: serverUrl, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isUrlInvalid() }" required id="url" type="text" />
                    </td>
                    <!-- ko if: serverUrlHelpText -->
                        <td data-bind="showTooltip: { text: serverUrlHelpText, pivotSiblingCssClass: 'serverUrl'}" />
                    <!-- /ko -->
                </tr>
                <tbody data-bind="foreach: inputDescriptors">
                    <!-- ko ifnot: $parent.urlDependsOn() == id() -->
                        <tr data-bind="template: { name: templateName }, css: { 'endpoint-hidden-column': isDisabled() }">
                        </tr>
                    <!-- /ko -->
                </tbody>

                <tbody>
                <tr data-bind="css: { 'endpoint-hidden-column': !showConfigurationUrl() }">
                <td>
                    <label for="url" data-bind="text: serverConfigurationUrlDisplayName"></label>
                </td>
                <td class="serverUrl">
                <input class="textbox" data-bind="value: serverConfigurationUrl, disable: true" type="text"/>
                </td>
                <td data-bind="showTooltip: { text: serverConfigurationUrlHelpText, pivotSiblingCssClass: 'serverUrl'}" />
                </tr>
                    <!-- ko if: helpMarkDown  && !showConfigurationUrl() -->
                <tr>
                    <td colspan="2">
                        <div>
                            <span data-bind="html: helpMarkDown" class="help-markdown"></span>
                            <!-- ko if: type == "jenkins" -->
                                <span>
                                    <p class="help icon icon-info-white" data-bind='attr: { "title": jenkinsLicenseText }'></p>
                                </span>
                            <!-- /ko -->
                        </div>
                    </td>
                </tr>
                    <!-- /ko -->
                    <!-- ko if: helpLink && helpLink().text -->
                <tr>
                    <td colspan="2">
                        <div class="help-link">
                            <a data-bind="text: helpLink().text, attr: { href: helpLink().url }" target="_blank"></a>
                        </div>
                    </td>
                </tr>
                    <!-- /ko -->
                </tbody>
                <tbody class="verify-connection-container">
                    <!-- ko if: showVerifyConnection() -->
                <tr>
                    <td class="header-line td" colspan="2">
                        <div class="header"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="verify-connection-status">
                            <span>${Resources.ConnectionLabel}</span>
                            <span class="bowtie-icon dialog-field-tooltip" data-bind="css: verifyConnectionStatusCssIconClass"></span>
                            <span class="status-main" data-bind="text: verifyConnectionStatus, css: verifyConnectionStatusCssTextClass"></span>
                        </div>
                    </td>
                    <td>
                        <div class="verify-action">
                            <span data-bind="click: verifyConnection, event: { keydown: onKeyDown }"><a tabindex="0" href="""" role="button"><b>${Resources.VerifyConnection}</b></a></span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td class="footer-line td" colspan="2">
                        <div class="footer"></div>
                    </td>
                </tr>
                    <!-- /ko -->
                </tbody>
            </table>
            <!-- ko if: showConfigurationUrl() -->
            <div class="auth-scheme-input getting-started-lighttext getting-started-vertical-small">
                <span data-bind="html: serverConfigurationUrlFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
            </div>
            <div>
                <span data-bind="html: helpMarkDown" class="help-markdown"></span>
            </div>
            <!-- /ko -->
        </div>
        <div class="error-messages-div">
            <div data-bind="foreach: errors">
                <span role="alert" data-bind="text: $data"></span>
                <br />
            </div>
        </div>
    </div>`;
}

export class InputViewModel implements IDisposable {
    public id: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public description: KnockoutObservable<string> = ko.observable("");
    public displayName: KnockoutComputed<string>;
    public groupName: KnockoutObservable<string> = ko.observable("");
    public value: KnockoutObservable<string> = ko.observable("");
    public data: KnockoutObservable<string> = ko.observable("");
    public templateName: string = "service_endpoint_type_input";
    public inputMode: KnockoutObservable<Contracts_FormInput.InputMode> = ko.observable(Contracts_FormInput.InputMode.None);
    public isValueFilled: KnockoutObservable<boolean> = ko.observable(false);
    public isReadOnly: KnockoutObservable<boolean> = ko.observable(false);
    public isDisabled: KnockoutObservable<boolean> = ko.observable(false);
    public isConfidential: KnockoutObservable<boolean> = ko.observable(false);
    public isRequired: boolean;
    public isUpdate: boolean = false;
    public inputDataType: Contracts_FormInput.InputDataType;

    public getValue(): string {
        return null;
    }

    public valueToDisplayValue(string): string {
        return null;
    }

    public isInvalid(): boolean {
        if ((this.value() === null || this.value() === "") && this.isConfidential && this.isUpdate) {
            return false;
        }

        var res = !this._validator.validate(this.getValue());

        if (res) {
            this._errorMessage = this._validator.getErrorMessage();
        }

        return res;
    }

    public getErrorMessage(): string {
        return this._errorMessage;
    }

    public mode: string = "textbox";

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ServiceEndpoint_Utils.BaseValidator) {
        this._inputDescriptor = inputDescriptor;
        this._validator = validator;
        this._initializeMappings();
        this._update(inputDescriptor);
        this.displayName = this._disposalManager.addDisposable(ko.computed<string>(() => {
            var displayName = Utils_Html.HtmlNormalizer.normalize(this.name());

            return displayName;
        }));
        this.inputDataType=(!!inputDescriptor.validation && !!inputDescriptor.validation.dataType) ? inputDescriptor.validation.dataType : null;
    }

    public getDependencyInputIds(): string[] {
        return this._inputDescriptor.dependencyInputIds || [];
    }

    public getInputValues(): Contracts_FormInput.InputValues {
        return this._inputDescriptor.values;
    }

    public hasDynamicValues(): boolean {
        return this._inputDescriptor.hasDynamicValueInformation;
    }

    // Update values from model.
    public updateValues(values: Contracts_FormInput.InputValues) {
        this.isReadOnly(values.isReadOnly !== undefined ? values.isReadOnly : false);
        this.isReadOnly.valueHasMutated();
        this.isDisabled(values.isDisabled !== undefined ? values.isDisabled : false);
        this.isDisabled.valueHasMutated();
        this._inputDescriptor.values = values;
        this._setPreviousValue("");
    }

    public dispose() {
        this._disposalManager.dispose();
    }

    public setShowManageServicesLink(value: boolean): void {
        this._showManageServicesLink(value);
    }

    protected _getPreviousValue(): string {
        return this._previousValue ? $.trim(this._previousValue) : "";
    }

    protected _setPreviousValue(value: string) {
        this._previousValue = value;
    }

    protected _getDisposalManager(): Utils_Core.DisposalManager {
        return this._disposalManager;
    }

    private _isRequired(): boolean {
        return this._inputDescriptor.validation.isRequired;
    }

    private _isConfidential(): boolean {
        return this._inputDescriptor.isConfidential;
    }

    protected _handleFinalValue() {
        var trimmedValue = $.trim(this.value());
        var trimmedPreviousValue = $.trim(this._getPreviousValue());

        if (trimmedValue !== "" && trimmedValue !== trimmedPreviousValue) {
            this.isValueFilled.valueHasMutated();
            this._setPreviousValue(this.value());
        }
    }

    private _update(inputDescriptor: Contracts_FormInput.InputDescriptor) {
        this.id(inputDescriptor.id);
        this.name(inputDescriptor.name);
        this.description(inputDescriptor.description);
        this.inputMode(inputDescriptor.inputMode);
        this.groupName(inputDescriptor.groupName);
        this.isConfidential(inputDescriptor.isConfidential !== undefined ? inputDescriptor.isConfidential : false);
        this.mode = this._inputModeTypeToStringMap[inputDescriptor.inputMode];

        if (inputDescriptor.values !== undefined) {
            this.isReadOnly(inputDescriptor.values.isReadOnly !== undefined ? inputDescriptor.values.isReadOnly : false);
            this.value(inputDescriptor.values.defaultValue !== undefined ? inputDescriptor.values.defaultValue : "");
            this.isDisabled(inputDescriptor.values.isDisabled !== undefined ? inputDescriptor.values.isDisabled : false);
        }
    }

    private _initializeMappings() {
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.CheckBox] = "checkbox";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.Combo] = "combo";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.PasswordBox] = "password";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.RadioButtons] = "radio";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.TextArea] = "textArea";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.TextBox] = "textbox";
        this._inputModeTypeToStringMap[Contracts_FormInput.InputMode.None] = "none";
    }

    private _inputDescriptor: Contracts_FormInput.InputDescriptor;
    private _validator: ServiceEndpoint_Utils.BaseValidator;
    private _inputModeTypeToStringMap: {
        [modeType: number]: string;
    } = {};

    private _previousValue: string = "";
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _showManageServicesLink: KnockoutObservable<boolean> = ko.observable(false);
    private _errorMessage: string;
}

export class StringInputViewModel extends InputViewModel {

    public handleFinalValue(data: any, event: any) {
        // If the text field loses focus, we need to assume that the user has filled in some value.
        this._handleFinalValue();
    }

    public updateValues(values: Contracts_FormInput.InputValues) {
        super.updateValues(values);
        if (values.possibleValues && values.possibleValues.length > 0) {
            var firstValue = values.possibleValues[0].displayValue || values.possibleValues[0].value;
            this.value(firstValue);
            this.isValueFilled.valueHasMutated();
            this._setPreviousValue(this.value());
        }
        else {
            this.value("");
        }
    }

    public getValue(): string {
        return this.value();
    }
}

export class ComboInputViewModel extends InputViewModel {

    public possibleValues: KnockoutObservableArray<string> = ko.observableArray([]);
    public values: string[];
    public localPossibleValues = this.getInputValues().possibleValues;
    public defaultValue : string;

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ServiceEndpoint_Utils.BaseValidator) {
        super(inputDescriptor, validator);
        this.updateValues(inputDescriptor.values);
        this.defaultValue = inputDescriptor.values.defaultValue;
        this.updateData(inputDescriptor);
        this._getDisposalManager().addDisposable(this.value.subscribe(() => {
            this._handleFinalValue();
        }));
    }

    public updateValues(inputValues: Contracts_FormInput.InputValues) {
        super.updateValues(inputValues);
        if (inputValues.possibleValues && inputValues.possibleValues.length > 0) {
            this.values = $.map(inputValues.possibleValues, (value: Contracts_FormInput.InputValue, index: number) => {
                return value.displayValue ? value.displayValue : value.value;
            });

            // When the control is updated from backend, we should always fire valueFilled.
            this.value(this.values[0]);
            this.isValueFilled.valueHasMutated();
            this._setPreviousValue(this.value());
            this.possibleValues(this.values);
        }
        else {
            this.value("");
            this.possibleValues([]);
        }
    }

    public updateData(inputDescriptor: Contracts_FormInput.InputDescriptor) {
        var inputValues: Contracts_FormInput.InputValues = inputDescriptor.values;
        if (inputDescriptor.id === ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId) {
            var dataSet = [];
            if (inputValues.possibleValues && inputValues.possibleValues.length > 0) {
                dataSet = $.map(inputValues.possibleValues, (value: Contracts_FormInput.InputValue, index: number) => {
                    return !!value.data["url"] ? value.data["url"] : "";
                });

                this.data(dataSet[0]);
            }
        }
    }

    public getValue(): string {
        var resultValue: string = "";
        this.localPossibleValues.forEach((value: Contracts_FormInput.InputValue): void => {
            if (!!value.displayValue ? value.displayValue === this.value() : value.value === this.value()) {
                resultValue = value.value;
            }
        });
        return resultValue;
    }

    public valueToDisplayValue(value: string): string {
        for (var i = 0; i < this.localPossibleValues.length; i++) {
            if (this.localPossibleValues[i].value.toUpperCase() === value.toUpperCase()) {
                return this.localPossibleValues[i].displayValue;
            }
        }
        if(Utils_String.equals(this.id(), ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId, true)){
            return this.defaultValue;
        }

        return value;
    }

    public getData(): string {
        var resultData: string = "";
        this.localPossibleValues.forEach((value: Contracts_FormInput.InputValue): void => {
            if(!!value.displayValue ? value.displayValue === this.value() : value.value === this.value()){
                if(!!value.data && !!value.data["url"]){
                    resultData = value.data["url"];
                }
            }
        });
        return resultData;
    }

    public getComboOptions = (): any => {
        var options = {
            allowEdit: false,
            mode: "drop",
            value: this.value(),
            data: this.data(),
            source: this.possibleValues(),
            enabled: true,
            label: this.name(),
            change: (combo: Controls_Combos.Combo) => {
                this.value(combo.getInputText());
            }
        };
        return options;
    }
}

export class CheckboxInputViewModel extends InputViewModel {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ServiceEndpoint_Utils.BaseValidator) {
        super(inputDescriptor, validator);
        this._getDisposalManager().addDisposable(this.value.subscribe(() => {
            this.isValueFilled.valueHasMutated();
        }));
    }

    public getValue(): string {
        let v = this.value();
        return v === null || v === undefined ? v : v + "";
    }
}

export class EndpointData {
    [key: string]: string;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("CustomEndpointsManageDialog", exports);

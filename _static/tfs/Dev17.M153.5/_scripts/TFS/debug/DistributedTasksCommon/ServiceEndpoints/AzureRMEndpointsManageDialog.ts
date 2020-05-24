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
import VstsAadAuthorizer = require("DistributedTasksCommon/ServiceEndpoints/VstsAadAuthorizer");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import { Action } from "VSS/Flux/Action";
import * as Diag from "VSS/Diag";

KnockoutCommon.initKnockoutHandlers(true);

import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";

export class SpnCreateMethod {
    public static Manual: string = "Manual";
    public static Automatic: string = "Automatic";
}

export class ServiceEndpointCreationTemplate {
    public static ManualSpnTemplate: string = "ManualSpnTemplate";
    public static AutomaticSpnTemplate: string = "AutomaticSpnTemplate";
    public static MSITemplate: string = "MSITemplate";
}

export class AzureRmEndpointUtils {

    private static _completeCallbackByAuthCode: boolean = null;

    public static isOAuthBasedSpnAcrossTenantsFeatureFlagEnabled(): boolean {
        var defaultPageContext = Context.getPageContext();
        var isHosted: boolean = !!defaultPageContext.webAccessConfiguration.isHosted;
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessAutoCreateOAuthBasedServicePrincipalAcrossTenants, false) && isHosted;
    }

    public static isCompleteCallbackByAuthCodeFeatureFlagEnabled(): boolean {
        if (AzureRmEndpointUtils._completeCallbackByAuthCode == null) {
            var defaultPageContext = Context.getPageContext();
            var isHosted: boolean = !!defaultPageContext.webAccessConfiguration.isHosted;
            AzureRmEndpointUtils._completeCallbackByAuthCode = FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessAutoCreateServicePrincipalCompleteCallbackByAuthcode, false) && isHosted;
        }

        return AzureRmEndpointUtils._completeCallbackByAuthCode;
    }

    public static authorizeServiceEndpoint(connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        tenantId: string,
        authInProgress: any,
        spnOperationInProgress: any,
        serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint,
        serviceEndpointOperationHelper: any,
        accessTokenKey?: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {

        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        if (AzureRmEndpointUtils.isOAuthBasedSpnAcrossTenantsFeatureFlagEnabled()) {
            AzureRmEndpointUtils.getAccessTokenKey(connectedServicesClient, tenantId, authInProgress, accessTokenKey).then((accessTokenKey: string) => {
                if (!!accessTokenKey) {
                    serviceEndpoint.authorization.parameters["accesstoken"] = accessTokenKey;
                    if (AzureRmEndpointUtils.isCompleteCallbackByAuthCodeFeatureFlagEnabled()) {
                        serviceEndpoint.authorization.parameters["accessTokenFetchingMethod"] = ServiceEndpoint_Contracts.AccessTokenRequestType.Oauth.toString();
                    }
                }

                serviceEndpointOperationHelper(serviceEndpoint, connectedServicesClient, spnOperationInProgress).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                    defer.resolve(provisionEndpointResponse);
                }, (error) => {
                    defer.reject(error);
                });

            }, (error) => {
                defer.reject(error);
            });
        } else {
            serviceEndpointOperationHelper(serviceEndpoint, this).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });
        }

        return defer.promise;
    }

    public static authorize(connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        sourceTenantId: string,
        authInProgress: any,
        endpointId?: any): IPromise<string> {
        var defer = Q.defer<string>();
        var context = Context.getDefaultWebContext();

        connectedServicesClient.beginGetVstsAadTenantId().then((tenantId: any) => {

            if (!context.host.isAADAccount || tenantId.value !== sourceTenantId) {
                var uri = context.collection.uri;
                var projectId = context.project.id;
                var redirectUri = uri + projectId;
                if (AzureRmEndpointUtils.isCompleteCallbackByAuthCodeFeatureFlagEnabled()) {
                    redirectUri = redirectUri + "/_admin/_services/completecallbackbyauthcode";
                }
                else {
                    redirectUri = redirectUri + "/_admin/_services/completecallback";
                }
                authInProgress(true);

                if (endpointId !== null && endpointId !== undefined) {
                    redirectUri += "?endpointId=" + endpointId + "&projectId=" + projectId;
                }

                var connection: Service.VssConnection = new Service.VssConnection(Context.getDefaultWebContext());
                var azureAuthHelper = connection.getService<VstsAadAuthorizer.VstsAadAuthorizer>(VstsAadAuthorizer.VstsAadAuthorizer);
                azureAuthHelper.authorize(sourceTenantId, redirectUri, DistributedTask_Contracts.AadLoginPromptOption.FreshLogin, Utils_String.empty, AzureRmEndpointUtils.isCompleteCallbackByAuthCodeFeatureFlagEnabled()).then((accessTokenKey: string) => {
                    authInProgress(false);
                    defer.resolve(accessTokenKey);
                }, (error) => {
                    authInProgress(false);
                    defer.reject(error);
                });
            } else {
                defer.resolve(null);
            }
        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public static getAccessTokenKey(connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        tenantId: string,
        authInProgress: any,
        accessTokenKey?: string): IPromise<string> {

        let deferred = Q.defer<string>();

        if (!accessTokenKey) {
            // accessTokenKey will contain value only if a previous OAuth flow succeeded
            AzureRmEndpointUtils.authorize(connectedServicesClient, tenantId, authInProgress)
                .then((accessTokenKey: string) => {
                    deferred.resolve(accessTokenKey);
                }, (error) => {
                    deferred.reject(error);
                }
                );
        }
        else {
            deferred.resolve(accessTokenKey);
        }

        return deferred.promise;
    }

    public static waitForSpnEndpointOperationToComplete(connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        endpointId: string,
        spnOperationInProgress: any): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {

        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        spnOperationInProgress(true);

        var operationStatus = { "state": "InProgress", "statusMessage": "" };
        var monitorSpnProgress = new Utils_Core.DelayedFunction(this, 1000, "monitorSpnProgress", () => {

            connectedServicesClient.beginGetEndpoint(endpointId).then((response: ServiceEndpoint_Contracts.ServiceEndpoint) => {

                if (response.operationStatus !== null && response.operationStatus !== undefined) {
                    operationStatus = response.operationStatus;
                }

                if (response.isReady) {
                    defer.resolve(response);
                    spnOperationInProgress(false);
                    monitorSpnProgress.cancel();
                }
                else if (operationStatus.state === "Failed") {
                    defer.reject(operationStatus.statusMessage);
                    spnOperationInProgress(false);
                    monitorSpnProgress.cancel();
                }
                else {
                    monitorSpnProgress.reset();
                }
            });
        });
        monitorSpnProgress.start();
        return defer.promise;
    }
}

export class AddAzureRmEndpointsModel extends ServiceEndpoint_Controls.AddServiceEndpointModel {
    public dialogTemplate: string = "add_azurerm_dialog";
    public errors: KnockoutObservableArray<string> = ko.observableArray([]);
    public id: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public subscriptionId: KnockoutObservable<string> = ko.observable("");
    public subscriptionName: KnockoutObservable<string> = ko.observable("");
    public spnClientId: KnockoutObservable<string> = ko.observable("");
    public managementGroupId: KnockoutObservable<string> = ko.observable("");
    public managementGroupName: KnockoutObservable<string> = ko.observable("");
    public spnKey: KnockoutObservable<string> = ko.observable("");
    public spnCertificate: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public tenantId: KnockoutObservable<string> = ko.observable("");
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public isSpnEndpointOperationInProgress: KnockoutObservable<boolean> = ko.observable(false);
    public isAuthorizationInProgress: KnockoutObservable<boolean> = ko.observable(false);
    public disconnectService: boolean = false;
    public title: string = "";
    public subscriptionList: KnockoutObservableArray<DistributedTask_Contracts.AzureSubscription> = ko.observableArray([]);
    public managementGroupList: KnockoutObservableArray<DistributedTask_Contracts.AzureManagementGroup> = ko.observableArray([]);
    public serverUrl: KnockoutObservable<string> = ko.observable("");
    public environmentsList: KnockoutObservableArray<string> = ko.observableArray([]);
    public scopeList: KnockoutObservableArray<string> = ko.observableArray([]);
    public selectedEnvironment: KnockoutObservable<string> = ko.observable("");
    public selectedScope: KnockoutObservable<string> = ko.observable("");
    public environmentName: string = "";
    public environmentUrl: string = "";
    public resourceGroupsList: KnockoutObservableArray<string> = ko.observableArray([]);
    public isRGOAuthFlowCompleted: KnockoutObservable<boolean> = ko.observable(false);
    public isRGOAuthFlowInProgress: KnockoutObservable<boolean> = ko.observable(false);
    public refreshResourceGroupsList: KnockoutObservable<boolean> = ko.observable(false);
    public selectedResourceGroup: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public accessTokenKey: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    public isSpnFeatureEnabled: KnockoutObservable<boolean> = ko.observable(false);
    public isSpnAcrossTenantsFeatureEnabled: KnockoutObservable<boolean> = ko.observable(false);
    public isOAuthBasedSpnAcrossTenantsFeatureEnabled: KnockoutObservable<boolean> = ko.observable(false);
    public azureSpnRoleAssignmentId: string = "";
    public azureSpnPermissions: string = "";
    public appObjectId: string = "";
    public spnObjectId: string = "";
    public isReady: boolean = true;
    public operationStatus = { "state": "Ready", "statusMessage": "" };
    public showVerifyConnection: KnockoutComputed<boolean>;
    public isTestConnectionDataSourceAvailable: KnockoutObservable<boolean> = ko.observable(false);
    public verifyConnectionStatus: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssTextClass: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssIconClass: KnockoutObservable<string> = ko.observable("");
    public isAutoTemplateRequired: boolean = true;

    public subscriptionsListedFromAzureCloud: string = Resources.SubscriptionsListedFromAzureCloud;
    public managementGroupsListedFromAzureCloud: string = Resources.ManagementGroupsListedFromAzureCloud;
    public createAutoSpnFooter: string = Resources.CreateAutoSpnFooter;
    public createAutoSpnFooterForManagementGroup: string = Resources.CreateAutoSpnFooterForManagementGroup;
    public updateAutoSpnFooter: string = Resources.UpdateAutoSpnFooter;
    public servicePrincipalTip: string = Resources.ServicePrincipalTip;
    public useAutoSpnCreateWindowFooter: string = Resources.UseAutoSpnCreateWindowFooter;
    public useAutoSpnUpdateWindowFooter: string = Resources.UseAutoSpnUpdateWindowFooter;
    public PFXToPEMConversionText: string = Resources.PFXToPEMConversion;
    public AzureServicePrincipalKeyText: string = Resources.AzureServicePrincipalKeyText;
    public AzureSpnCertificateText: string = Resources.AzureSpnCertificate;
    public manualUpdateToAutoCreatedServiceEndpointNotSupported: string = Resources.ManualUpdateToAutoCreatedServiceEndpointNotSupported;
    public createMsiEndpointFooter: string = Resources.CreateMsiEndpointFooter;

    private _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;
    private _context: Contracts_Platform.WebContext;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _serviceEndpointTypesPromise: IPromise<ServiceEndpoint_Contracts.ServiceEndpointType[]>;
    private _endpointType: ServiceEndpoint_Contracts.ServiceEndpointType = null;

    private _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    private _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    private _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    private _TEXT_CLASS_FAILURE: string = "vc-status-failure";
    private _DEFAULT_SELECTED_ENVIRONMENT: string = "AzureCloud";
    private _DEFAULT_SELECTED_SCOPE: string = "Subscription";
    private _AZURE_STACK_ENVIRONMENT = "AzureStack";
    private Subscription: string = "Subscription";
    private ManagementGroup: string = "ManagementGroup";

    private _DEFAULT_AUTHENTICAION_SCHEME = ServiceEndpoint_Common.EndpointAuthorizationSchemes.ServicePrincipal;
    private _DEFAULT_SERVICE_PRINCIPAL_AUTH_TYPE = ServiceEndpoint_Common.EndpointAuthorizationParameters.ServicePrincipalKeyAuth;

    public authenticationSchemes: KnockoutObservableArray<ServiceEndpoint_Contracts.ServiceEndpointAuthenticationScheme> = ko.observableArray([]);
    public selectedAuthenticationScheme: KnockoutObservable<string> = ko.observable(this._DEFAULT_AUTHENTICAION_SCHEME);
    public spnCreationMode: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public spnAuthenticationType: KnockoutObservable<string> = ko.observable(this._DEFAULT_SERVICE_PRINCIPAL_AUTH_TYPE);

    public manualUpdateToAutoCreatedServiceEndpoint: KnockoutObservable<boolean> = ko.observable(false);
    public authSchemeSelectorText: string = Resources.AuthSchemeSelector;

    constructor(successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void, options?: any) {
        super(successCallBack);
        this._context = Context.getDefaultWebContext();
        var connection: Service.VssConnection = new Service.VssConnection(this._context);
        this._distributedTaskClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
        this.isSpnFeatureEnabled(this.isSpnFeatureFlagEnabled());
        this.isSpnAcrossTenantsFeatureEnabled(this.isSpnAcrossTenantsFeatureFlagEnabled());
        this.isOAuthBasedSpnAcrossTenantsFeatureEnabled(AzureRmEndpointUtils.isOAuthBasedSpnAcrossTenantsFeatureFlagEnabled());
        this.selectedEnvironment(this._DEFAULT_SELECTED_ENVIRONMENT);
        this.selectedScope(this._DEFAULT_SELECTED_SCOPE);
        this.scopeList.push(this.Subscription);
        this.scopeList.push(this.ManagementGroup);

        if (!this.isSpnAcrossTenantsFeatureEnabled()) {
            this.isAutoTemplateRequired = this._context.host.isAADAccount;
        }
        if (options && options.spnCreateMethod) {
            this.spnCreationMode(options.spnCreateMethod);
        }
        else {
            if (this.isSpnFeatureEnabled() && this.isAutoTemplateRequired) {
                this.spnCreationMode(SpnCreateMethod.Automatic);
            } else {
                this.spnCreationMode(SpnCreateMethod.Manual);
            }
        }

        this.verifyConnectionStatus(Resources.ConnectionStatusNotVerified);

        this._disposalManager.addDisposable(this.verifyConnectionStatus.subscribe((value: string) => {
            var statusIconCssClass = "";

            if (Utils_String.equals(value, Resources.ConnectionStatusVerified, true)) {
                this.verifyConnectionStatusCssTextClass(this._TEXT_CLASS_SUCCESS);
                // add status to the icon class to get the correct color (bowtie icons are all gray)
                statusIconCssClass = [this._ICON_CLASS_SUCCESS, this.verifyConnectionStatusCssTextClass()].join(" ");
                this.verifyConnectionStatusCssIconClass(statusIconCssClass);
            } else if (Utils_String.equals(value, Resources.ConnectionStatusFailed, true)) {
                this.verifyConnectionStatusCssTextClass(this._TEXT_CLASS_FAILURE);
                // add status to the icon class to get the correct color (bowtie icons are all gray)
                statusIconCssClass = [this._ICON_CLASS_FAILURE, this.verifyConnectionStatusCssTextClass()].join(" ");
                this.verifyConnectionStatusCssIconClass(statusIconCssClass);
            } else {
                this.verifyConnectionStatusCssTextClass("");
                this.verifyConnectionStatusCssIconClass("");
            }
        }));

        this.selectedEnvironment.subscribe((selectedEnvironmentName) => {
            if (!!this._endpointType && !!this._endpointType.endpointUrl && !!this._endpointType.endpointUrl.dependsOn) {
                for (var i = 0; i < this._endpointType.endpointUrl.dependsOn.map.length; i++) {
                    if (this._endpointType.endpointUrl.dependsOn.map[i].key === selectedEnvironmentName) {
                        if (!(this.isAzureStackEnvironmentSelected() && this.isUpdate())) {
                            this.serverUrl(this._endpointType.endpointUrl.dependsOn.map[i].value);
                        } else {
                            this.serverUrl(this.environmentUrl);
                        }
                        break;
                    }
                }
            }
        });

        this.subscriptionId.subscribe((selectedSubscription: string) => {
            if (!!selectedSubscription) {
                // refresh the resource groups dropdown when user clicks it
                this.refreshResourceGroupsList(true);
            }
        });

        this._serviceEndpointTypesPromise = this._distributedTaskClient.beginGetServiceEndpointTypes(ServiceEndpoint_Common.ServiceEndpointType.AzureRM);
        this._serviceEndpointTypesPromise.then((endpointTypes: ServiceEndpoint_Contracts.ServiceEndpointType[]) => {
            if (!!endpointTypes && endpointTypes.length === 1) {
                this._endpointType = endpointTypes[0];

                if ((!!this._endpointType.endpointUrl.dependsOn) && (this._endpointType.endpointUrl.dependsOn.input === "environment")) {
                    for (var i = 0; i < this._endpointType.endpointUrl.dependsOn.map.length; i++) {
                        if (!this.isAzureStackSupportFeatureFlagEnabled() && this._endpointType.endpointUrl.dependsOn.map[i].key == this._AZURE_STACK_ENVIRONMENT) {
                            continue;
                        }
                        this.environmentsList.push(this._endpointType.endpointUrl.dependsOn.map[i].key);
                    }
                }

                if (!!this._endpointType.endpointUrl && !!this._endpointType.endpointUrl.value) {
                    this.serverUrl(this._endpointType.endpointUrl.value);
                }

                if (this.isUpdate() && !!this.environmentName) {
                    // Allow updating Environment for SPN created in Manual flow or for MSI endpoints
                    if (Utils_String.equals(this.spnCreationMode(), SpnCreateMethod.Manual, true) || this.isManagedServiceIdentityAuthenticationScheme()) {
                        this.selectedEnvironment(this.environmentName);
                    }
                }

                if (!!Utils_Array.first(this._endpointType.dataSources, (e) => { return (Utils_String.equals(e.name, "TestConnection", true)) })) {
                    this.isTestConnectionDataSourceAvailable(true);
                }

                this._endpointType.authenticationSchemes.forEach((authenticationScheme: ServiceEndpoint_Contracts.ServiceEndpointAuthenticationScheme) => {
                    this.authenticationSchemes.push(authenticationScheme);
                });
            }
        }, (error) => {
            this.errors.push(Resources.CouldNotFetchEndpointTypes);
        });

        this.showVerifyConnection = this._disposalManager.addDisposable(ko.computed((): boolean => {
            var isManualMode = Utils_String.equals(this.spnCreationMode(), SpnCreateMethod.Manual, true);
            var showVerifyConnection = this.isTestConnectionDataSourceAvailable() && isManualMode;
            return showVerifyConnection;
        }));
    }

    public ARMEndpointAuthenticationTemplate = ko.computed((): string => {
        this.errors([]);
        let armEndpointAuthenticationTemplate: string = Utils_String.empty;

        if (this.isServicePrincipalAuthenticationScheme()) {
            if (this.isSpnFeatureEnabled() && this.isSpnCreationModeAutomatic()) {
                armEndpointAuthenticationTemplate = ServiceEndpointCreationTemplate.AutomaticSpnTemplate;
            } else {
                armEndpointAuthenticationTemplate = ServiceEndpointCreationTemplate.ManualSpnTemplate;
            }
        }
        else if (this.isManagedServiceIdentityAuthenticationScheme()) {
            armEndpointAuthenticationTemplate = ServiceEndpointCreationTemplate.MSITemplate;
        }

        return armEndpointAuthenticationTemplate;
    }, this);

    public getServiceEndpoint(isVerifyConnection: boolean): ServiceEndpoint_Common.ServiceEndpointDetails {
        let connectionId = "0";

        let type = ServiceEndpoint_Common.ServiceEndpointType.AzureRM;
        let scheme = this.selectedAuthenticationScheme();

        if (this.isServicePrincipalAuthenticationScheme() && this.isSpnCreationModeAutomatic()) {
            this.selectedEnvironment(this._DEFAULT_SELECTED_ENVIRONMENT);
        }

        if (!isVerifyConnection) {
            connectionId = this.id.peek().trim();

            if (!connectionId) {
                connectionId = ServiceEndpoint_Utils.GUIDUtils.newGuid();
            }
        }

        let apiData: ServiceEndpoint_Common.IServiceEndpointApiData = {
            endpointId: connectionId,
            endpointName: this.name(),
            url: this.serverUrl().trim(),
            username: "",
            passwordKey: "",
            type: type,
            scheme: scheme,
            parameters: {}
        };
        if (this.isScopeLevelSubscription()) {
            apiData.parameters["subscriptionId"] = this.subscriptionId().trim();
            apiData.parameters["subscriptionName"] = this.subscriptionName().trim();
        }
        else {
            apiData.parameters["managementGroupId"] = this.managementGroupId().trim();
            apiData.parameters["managementGroupName"] = this.managementGroupName().trim();
        }

        apiData.parameters["environment"] = (this.selectedEnvironment() && this.selectedEnvironment().trim()) ? this.selectedEnvironment().trim() : this._DEFAULT_SELECTED_ENVIRONMENT;

        if (this.isManagementGroupsFeatureFlagEnabled()) {
            apiData.parameters["scopeLevel"] = (this.selectedScope() && this.selectedScope().trim()) ? this.selectedScope().trim() : this._DEFAULT_SELECTED_SCOPE;
        }

        let authorizationInfo: ServiceEndpoint_Contracts.EndpointAuthorization = {
            parameters: {
                tenantid: this.tenantId().trim()
            },
            scheme: scheme
        };

        if (this.isServicePrincipalAuthenticationScheme()) {

            apiData.parameters["creationMode"] = this.spnCreationMode();
            apiData.parameters["azureSpnRoleAssignmentId"] = this.azureSpnRoleAssignmentId;
            apiData.parameters["azureSpnPermissions"] = this.azureSpnPermissions;
            apiData.parameters["spnObjectId"] = this.spnObjectId;
            apiData.parameters["appObjectId"] = this.appObjectId;

            let servicePrincipalKey = this.spnKey() === null ? null : this.spnKey().trim()
            if (servicePrincipalKey == "" && this.isUpdate()) {
                servicePrincipalKey = null;
            }

            authorizationInfo.parameters["serviceprincipalid"] = this.spnClientId().trim();

            if (this.isCertificateBasedAuthenticationEnabled()) {
                authorizationInfo.parameters["authenticationType"] = this.spnAuthenticationType().trim();
            }

            if (!this.isCertificateBasedAuthenticationEnabled || this.isServicePrincipalKeyBaseAuth()) {
                authorizationInfo.parameters["serviceprincipalkey"] = servicePrincipalKey;
            }
            else {
                let spnCertificate = this.spnCertificate() === null ? null : this.spnCertificate().trim()
                if (spnCertificate == "" && this.isUpdate()) {
                    spnCertificate = null;
                }

                authorizationInfo.parameters["servicePrincipalCertificate"] = spnCertificate;
            }


            if (!!this.selectedResourceGroup() && !!this.subscriptionId()) {
                authorizationInfo.parameters["scope"] = `/subscriptions/${this.subscriptionId()}/resourcegroups/${this.selectedResourceGroup()}`;
            }
        }

        return new ServiceEndpoint_Common.ServiceEndpointDetails(apiData, authorizationInfo);
    }

    public verifyConnection(): void {
        var areInputsValid = true;
        this.errors([]);
        this.verifyConnectionStatus(Resources.ConnectionStatusVerifying);

        // Validate Input fields
        areInputsValid = this.validateInputs();

        if (!areInputsValid) {
            if (this.errors().length === 0) {
                this.errors.push(Resources.AllFieldsRequired);
            }

            this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
        } else {
            var serviceEndpointDetails = this.getServiceEndpointDetails();
            var dataSourceDetails: ServiceEndpoint_Contracts.DataSourceDetails = {
                dataSourceName: this.isScopeLevelSubscription() ? "TestConnection" : "TestConnectionManagementGroup",
                dataSourceUrl: "",
                headers: null,
                requestContent: null,
                requestVerb: null,
                resourceUrl: "",
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

            var verifyConnectedServicePromise: IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = this.verifyConnectedService(serviceEndpointRequest, this.id());

            verifyConnectedServicePromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            }, (error) => {
                this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
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

    public getServiceEndpointDetails(): ServiceEndpoint_Contracts.ServiceEndpointDetails {
        return this.getServiceEndpoint(true).toServiceEndpointDetails();
    }

    public verifyConnectedService(serviceEndpointRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest, serviceEndpointId: string): IPromise<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> {
        var endpointPromise: Q.Deferred<ServiceEndpoint_Contracts.ServiceEndpointRequestResult> = Q.defer<ServiceEndpoint_Contracts.ServiceEndpointRequestResult>();
        var verifyConnectionPromise = this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointRequest, serviceEndpointId);

        verifyConnectionPromise.then((result: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
            if ((Utils_String.equals(result.statusCode, "ok", true)) && ((result.errorMessage === undefined) || (Utils_String.equals(result.errorMessage, "", true)))) {

                let connectionVerified: boolean = true;
                if (!this.isUpdate()) {
                    // additional verification check to ensure that the subscription name matches the display name of the subscription id entered by the user
                    // keeping the subscription name validation to create flow only, as the subscription name input field is disabled in update flow
                    try {
                        result.result.forEach((item) => {
                            let subscriptionInfo = JSON.parse(item);
                            // trim the user inputs 
                            let selectedSubscriptionId = !!this.subscriptionId() && this.subscriptionId().trim();
                            let selectedSubscriptionName = !!this.subscriptionName() && this.subscriptionName().trim();
                            if (subscriptionInfo["subscriptionId"] && selectedSubscriptionId && subscriptionInfo["subscriptionId"].toLowerCase() === selectedSubscriptionId.toLowerCase()) {
                                if (subscriptionInfo["displayName"] && selectedSubscriptionName && subscriptionInfo["displayName"].toLowerCase() !== selectedSubscriptionName.toLowerCase()) {
                                    connectionVerified = false;
                                    this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
                                    this.errors([]);
                                    this.errors.push(Utils_String.localeFormat(Resources.SubscriptionNameMismatchError, selectedSubscriptionId, subscriptionInfo["displayName"]));
                                }
                            }
                        });
                    }
                    catch (error) {
                        Diag.logError(error);
                    }
                }

                if (connectionVerified) {
                    this.verifyConnectionStatus(Resources.ConnectionStatusVerified);
                }

            } else {
                this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
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

    public subscriptionAndIdList = ko.computed(function () {
        var nameAndIdList: string[] = [];
        for (let i = 0; i < this.subscriptionList().length; ++i) {
            var entry = this.subscriptionList()[i].displayName + " ( " + this.subscriptionList()[i].subscriptionId + " )";
            if (this.isSpnAcrossTenantsFeatureEnabled()) {
                entry = this.subscriptionList()[i].displayName + " ( " + this.subscriptionList()[i].subscriptionId + " )";
            }

            nameAndIdList.push(entry);
        }
        return nameAndIdList;
    }, this);

    public managementGroupAndIdList = ko.computed(function () {
        var nameAndIdList: string[] = [];
        for (let i = 0; i < this.managementGroupList().length; ++i) {
            var entry = this.managementGroupList()[i].displayName + " ( " + this.managementGroupList()[i].name + " )";
            nameAndIdList.push(entry);
        }
        return nameAndIdList;
    }, this);

    public isSpnAuthorizationInProgress = ko.computed(function () {
        return this.isAuthorizationInProgress();
    }, this);

    public isSpnUpdationInProgress = ko.computed(function () {
        return this.isSpnEndpointOperationInProgress() && this.isUpdate();
    }, this);

    public isSpnCreationInProgress = ko.computed(function () {
        return this.isSpnEndpointOperationInProgress() && !this.isUpdate();
    }, this);

    public isAzureStackEnvironmentSelected = ko.computed(function () {
        return (Utils_String.equals(this.selectedEnvironment(), this._AZURE_STACK_ENVIRONMENT));
    }, this);

    public isServerUrlInputFieldVisible = ko.computed(() => {
        return this.isAzureStackEnvironmentSelected() && this._endpointType && this._endpointType.endpointUrl && (Utils_String.equals(this._endpointType.endpointUrl.isVisible, "true", true) || !this._endpointType.endpointUrl.isVisible);
    }, this);

    public isServicePrincipalAuthenticationScheme() {
        return Utils_String.equals(this.selectedAuthenticationScheme(), ServiceEndpoint_Common.EndpointAuthorizationSchemes.ServicePrincipal, true);
    }

    public isManagedServiceIdentityAuthenticationScheme() {
        return Utils_String.equals(this.selectedAuthenticationScheme(), ServiceEndpoint_Common.EndpointAuthorizationSchemes.ManagedServiceIdentity, true);
    }

    public isScopeLevelSubscription = ko.computed(() => {
        if (!this.selectedScope()) {
            return true;
        }

        return (Utils_String.equals(this.selectedScope(), this._DEFAULT_SELECTED_SCOPE, true));
    }, this);

    private isServicePrincipalKeyBaseAuth = ko.computed(() => {
        if (!this.spnAuthenticationType()) {
            return true;
        }

        return (Utils_String.equals(this.spnAuthenticationType(), this._DEFAULT_SERVICE_PRINCIPAL_AUTH_TYPE, true));
    }, this);

    public subscriptionAndId = ko.computed({
        read: function () {
            var selectedEntry = this.subscriptionName() + " ( " + this.subscriptionId() + " )";
            return selectedEntry;
        },
        write: function (value) {
            if (!this.isUpdate() && value !== undefined && value !== null) {
                var indexOfSelectedEntry = this.subscriptionAndIdList().indexOf(value);
                this.subscriptionName(this.subscriptionList()[indexOfSelectedEntry].displayName);
                this.subscriptionId(this.subscriptionList()[indexOfSelectedEntry].subscriptionId);

                if (this.isSpnAcrossTenantsFeatureEnabled()) {
                    this.tenantId(this.subscriptionList()[indexOfSelectedEntry].subscriptionTenantId);
                }
            }
        },
        owner: this
    });

    public managementGroupAndId = ko.computed({
        read: function () {
            var selectedEntry = this.managementGroupName() + " ( " + this.managementGroupId() + " )";
            return selectedEntry;
        },
        write: function (value) {
            if (!this.isUpdate() && value !== undefined && value !== null) {
                var indexOfSelectedEntry = this.managementGroupAndIdList().indexOf(value);
                this.managementGroupName(this.managementGroupList()[indexOfSelectedEntry].displayName);
                this.managementGroupId(this.managementGroupList()[indexOfSelectedEntry].name);
                this.tenantId(this.managementGroupList()[indexOfSelectedEntry].tenantId);
            }
        },
        owner: this
    });

    public getAzureSubscriptions(): IPromise<boolean> {
        var defer = Q.defer<boolean>();
        this._distributedTaskClient.beginGetAzureSubscriptions().then((response: DistributedTask_Contracts.AzureSubscriptionQueryResult) => {
            if (!response.errorMessage) {
                this.subscriptionList(response.value);
                defer.resolve(false);
            } else {
                this.errors([]);
                this.errors.push(response.errorMessage);
                defer.resolve(true);
            }
        }, (error) => {
            this.errors([]);
            this.errors.push(error.message);
            defer.resolve(true);
        });
        return defer.promise;
    }

    public getAzureManagementGroups(): IPromise<boolean> {
        var defer = Q.defer<boolean>();
        this._distributedTaskClient.beginGetAzureManagementGroups().then((response: DistributedTask_Contracts.AzureManagementGroupQueryResult) => {
            if (!response.errorMessage) {
                this.managementGroupList(response.value);
                defer.resolve(false);
            }
            else {
                this.errors([]);
                this.errors.push(response.errorMessage);
                defer.resolve(true);
            }
        }, (error) => {
            this.errors([]);
            this.errors.push(error.message);
            defer.resolve(true);
        });

        return defer.promise;
    }

    public switchSpnCreationMode(): void {
        // flip the SPN creation when user clicks on "use the full version of endpoint dialog" or "use the automated version"
        this.errors([]);
        if (this.isSpnCreationModeAutomatic()) {
            if (this.isUpdate()) {
                this.manualUpdateToAutoCreatedServiceEndpoint(true);
            }
            else {
                this.manualUpdateToAutoCreatedServiceEndpoint(false);
            }

            this.spnCreationMode(SpnCreateMethod.Manual);
        }
        else {
            if (this.isUpdate()) {
                this.manualUpdateToAutoCreatedServiceEndpoint(false);
            }

            this.spnCreationMode(SpnCreateMethod.Automatic);
        }
    }

    public isSpnCreationModeAutomatic() {
        return Utils_String.equals(this.spnCreationMode(), SpnCreateMethod.Automatic, true);
    }

    public validateInputs(): boolean {
        if (this.isNameInvalid()) {
            this.errors.push(Resources.ConnectionNameInvalid);
            return false;
        }

        if (this.isSubscriptionIdInvalid()) {
            this.errors.push(Resources.SubscriptionIdInvalid);
            return false;
        }

        if (this.isManagementGroupIdInvalid()) {
            this.errors.push(Resources.ManagementGroupIDInvalid);
            return false;
        }

        if (this.isSubscriptionNameInvalid()) {
            this.errors.push(Resources.SubscriptionNameInvalid);
            return false;
        }

        if (this.isManagementGroupNameInvalid()) {
            this.errors.push(Resources.ManagementGroupNameInvalid);
            return false;
        }

        if (this.isTenantIdInvalid()) {
            this.errors.push(Resources.TenetIdInvalid);
            return false;
        }

        if (this.isServicePrincipalAuthenticationScheme()) {
            if (this.isSpnCliendIdInvalid()) {
                this.errors.push(Resources.SpnClientIdInvalid);
                return false;
            }

            if (this.isServicePrincipalKeyBaseAuth()) {
                if (this.isSpnKeyInvalid()) {
                    this.errors.push(Resources.SpnKeyInvalid);
                    return false;
                }
            }
            else {
                if (this.isCertificateInvalid()) {
                    this.errors.push(Resources.CertificateInvalid);
                    return false;
                }
            }
        }

        return true;
    }

    public isNameInvalid(): boolean {
        let isInvalid = true;

        if (this.name() !== undefined && this.name() !== null) {
            isInvalid = this.name().trim().length === 0;
        }

        return isInvalid;
    }

    public isSubscriptionIdInvalid(): boolean {
        let isInvalid = true;

        if (this.isScopeLevelSubscription()) {
            if (!!this.subscriptionId())
                isInvalid = !ServiceEndpoint_Common.isGuid(this.subscriptionId().trim());
        }
        else {
            isInvalid = false;
        }

        return isInvalid;
    }

    public isManagementGroupIdInvalid(): boolean {
        let isInvalid = true;
        if (!this.isScopeLevelSubscription()) {
            if (!!this.managementGroupId())
                isInvalid = this.managementGroupId().trim().length === 0;
        }
        else {
            isInvalid = false;
        }

        return isInvalid;
    }

    public isEnvironmentUrlInvalid(): boolean {
        let isInvalid = true;

        if (this.serverUrl() !== undefined && this.serverUrl() !== null) {
            isInvalid = this.serverUrl().trim().length === 0;
        }

        return isInvalid;
    }

    public isSubscriptionNameInvalid(): boolean {
        let isInvalid = true;

        if (this.isScopeLevelSubscription()) {
            if (this.subscriptionName() !== undefined && this.subscriptionName() !== null)
                isInvalid = this.subscriptionName().trim().length === 0;
        }
        else {
            isInvalid = false;
        }

        return isInvalid;
    }

    public isManagementGroupNameInvalid(): boolean {
        let isInvalid = true;
        if (!this.isScopeLevelSubscription()) {
            if (!!this.managementGroupName)
                isInvalid = this.managementGroupName().trim().length === 0;
        }
        else {
            isInvalid = false;
        }
        return isInvalid;
    }

    public isSpnCliendIdInvalid(): boolean {
        let isInvalid = true;

        if (this.isSpnCreationModeAutomatic()) {
            isInvalid = false;
        } else {
            isInvalid = this.spnClientId().trim().length === 0;
        }

        return isInvalid;
    }

    public isSpnKeyInvalid(): boolean {
        let isInvalid = true;

        if (this.isSpnCreationModeAutomatic()) {
            isInvalid = false;
        } else if ((this.spnKey() == null || this.spnKey() == "") && this.isUpdate()) {
            isInvalid = false;
        } else {
            isInvalid = this.spnKey().trim().length === 0;
        }

        return isInvalid;
    }

    public isCertificateInvalid(): boolean {
        let isInvalid = true;

        if (this.isSpnCreationModeAutomatic()) {
            isInvalid = false;
        } else if ((this.spnCertificate() == null || this.spnCertificate() == "") && this.isUpdate()) {
            isInvalid = false;
        } else {
            isInvalid = this.spnCertificate().trim().length === 0;
        }

        return isInvalid;
    }

    public isTenantIdInvalid(): boolean {
        let isInvalid = true;

        if (this.isServicePrincipalAuthenticationScheme() && this.isSpnCreationModeAutomatic()) {
            isInvalid = false;
        } else {
            isInvalid = !ServiceEndpoint_Common.isGuid(this.tenantId().trim());
        }

        return isInvalid;
    }

    public isSpnFeatureFlagEnabled(): boolean {
        var defaultPageContext = Context.getPageContext();
        var isHosted: boolean = !!defaultPageContext.webAccessConfiguration.isHosted;
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessAutoCreateServicePrincipal, false) && isHosted;
    }

    public isResourceAuthorizationFeatureFlagEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint, false);
    }

    public isManagementGroupsFeatureFlagEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessEnableManagementGroupsForServicePrincipal);
    }

    public isCertificateBasedAuthenticationEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessEnableSpnCertificateBasedAuthentication);
    }

    public isSpnAcrossTenantsFeatureFlagEnabled(): boolean {
        var defaultPageContext = Context.getPageContext();
        var isHosted: boolean = !!defaultPageContext.webAccessConfiguration.isHosted;
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessAutoCreateServicePrincipalAcrossTenants, false) && isHosted;
    }

    public isOAuthBasedSpnAcrossTenantsFeatureFlagEnabled(): boolean {
        var defaultPageContext = Context.getPageContext();
        var isHosted: boolean = !!defaultPageContext.webAccessConfiguration.isHosted;
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessAutoCreateOAuthBasedServicePrincipalAcrossTenants, false) && isHosted;
    }

    public isAzureStackSupportFeatureFlagEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessEnableAzureStackForServicePrincipal);
    }

    public isResourceGroupScopedSpnFeatureEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessEnableResourceGroupScopedServicePrincipal, false);
    }

    public isManagedServiceIdentityAuthenticationSchemeFeatureEnabled(): boolean {
        return FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.WebAccessEnableManagedServiceIdentityAuthenticationScheme, false);
    }

    public createServiceEndpoint(authorizeForAllPipelines: boolean = true): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        if (this.tenantId() === null || this.tenantId() === undefined) {
            defer.reject(Utils_String.format(Resources.TenantIdIsNullOrUndefinedForSubscription, this.subscriptionName()));
        }

        var serviceEndpoint = this.getServiceEndpoint(false).toServiceEndpoint();

        if (this.isSpnFeatureEnabled() && this.isServicePrincipalAuthenticationScheme() && this.isSpnCreationModeAutomatic()) {
            this.autoManageServiceEndpoint(serviceEndpoint, this.autoCreateServiceEndpointHelper).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                if (this.isResourceAuthorizationFeatureFlagEnabled() && this.isPipelineAuthorizationEnabled() && authorizeForAllPipelines) {
                    //  Authorize endpoint after polling ends.
                    this._distributedTaskClient.authorizeEndpoint(provisionEndpointResponse).then(() => {
                        defer.resolve(provisionEndpointResponse);
                    }, (error) => {
                        defer.reject(error);
                    })
                }
                else {
                    defer.resolve(provisionEndpointResponse);
                }
            }, (error) => {
                // invalidate the accessTokenKey if the create service endpoint step fails
                this.accessTokenKey(Utils_String.empty);
                defer.reject(error);
            });
        } else {
            this._distributedTaskClient.beginCreateServiceEndpoint(serviceEndpoint, this.isPipelineAuthorizationEnabled()).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });
        }

        return defer.promise;
    }

    public updateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        if (this.tenantId() === null || this.tenantId() === undefined) {
            defer.reject(Utils_String.format(Resources.TenantIdIsNullOrUndefinedForSubscription, this.subscriptionName()));
        }

        var serviceEndpoint = this.getServiceEndpoint(false).toServiceEndpoint();

        if (this.isSpnFeatureEnabled() && this.isServicePrincipalAuthenticationScheme() && this.isSpnCreationModeAutomatic()) {
            this.autoManageServiceEndpoint(serviceEndpoint, this.autoUpdateServiceEndpointHelper).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                // invalidate the accessTokenKey if the update service endpoint step fails
                this.accessTokenKey(Utils_String.empty);
                defer.reject(error);
            });
        } else {
            this._distributedTaskClient.beginUpdateServiceEndpoint(serviceEndpoint).then((provisionEndpointResponse: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });
        }

        return defer.promise;
    }

    private autoManageServiceEndpoint(serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint, serviceEndpointOperationHelper: any): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var authInProgress = (authInProgress: boolean) => {
            this.isAuthorizationInProgress(authInProgress);
        };

        var spnOperationInProgress = (operationInProgress: boolean) => {
            this.isSpnEndpointOperationInProgress(operationInProgress);
        };

        return AzureRmEndpointUtils.authorizeServiceEndpoint(
            this._distributedTaskClient,
            this.tenantId(),
            authInProgress,
            spnOperationInProgress,
            serviceEndpoint,
            serviceEndpointOperationHelper,
            this.accessTokenKey());
    }

    private autoCreateServiceEndpointHelper = (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint,
        connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        spnOperationInProgress: any): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> => {

        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        connectedServicesClient.beginCreateServiceEndpoint(serviceEndpoint).then((response: ServiceEndpoint_Contracts.ServiceEndpoint) => {

            AzureRmEndpointUtils.waitForSpnEndpointOperationToComplete(connectedServicesClient, response.id, spnOperationInProgress).then((provisionEndpointResponse) => {

                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                try {
                    connectedServicesClient.beginDeleteServiceEndpoint(response.id);
                } catch (e) { }

                defer.reject(error);
            });

        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    private autoUpdateServiceEndpointHelper(serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint,
        connectedServicesClient: DistributedTaskModels.ConnectedServicesClientService,
        spnOperationInProgress: any): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {

        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();

        connectedServicesClient.beginUpdateServiceEndpoint(serviceEndpoint).then((response: ServiceEndpoint_Contracts.ServiceEndpoint) => {

            AzureRmEndpointUtils.waitForSpnEndpointOperationToComplete(connectedServicesClient, response.id, spnOperationInProgress).then((provisionEndpointResponse) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });

        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public authorize(endpointId?: any): IPromise<string> {
        var authInProgress = (authInProgress: boolean) => {
            this.isAuthorizationInProgress(authInProgress);
        };

        return AzureRmEndpointUtils.authorize(
            this._distributedTaskClient,
            this.tenantId(),
            authInProgress,
            endpointId);
    }

    public dispose() {
        this._disposalManager.dispose();
    }

    public getEnvironmentsComboOptions = (): any => {
        var options = {
            allowEdit: false,
            mode: "drop",
            value: this.selectedEnvironment() !== Utils_String.empty ? this.selectedEnvironment() : this.environmentsList()[0],
            source: this.environmentsList(),
            enabled: !this.isUpdate(),
            label: Resources.Environment,
            change: (combo: Controls_Combos.Combo) => {
                this.selectedEnvironment(combo.getInputText());
            }
        };
        return options;
    }

    public getScopeLevelComboOptions = (): any => {
        var options = {
            allowEdit: false,
            mode: "drop",
            value: this.selectedScope() !== Utils_String.empty ? this.selectedScope() : this.scopeList()[0],
            source: this.scopeList(),
            enabled: !this.isUpdate(),
            label: Resources.ScopeLevelText,
            change: (combo: Controls_Combos.Combo) => {
                this.selectedScope(combo.getInputText());
            }
        };
        return options;
    }

    public getSubscriptionsComboOptions = (): any => {
        if (this.subscriptionAndId() === " (  )" && this.subscriptionAndIdList().length > 0) {
            this.subscriptionAndId(this.subscriptionAndIdList()[0]);
        }

        var options = {
            allowEdit: false,
            mode: "drop",
            value: this.subscriptionAndId(),
            source: this.subscriptionAndIdList(),
            enabled: !(this.isUpdate() || this.isRGOAuthFlowInProgress() || this.isRGOAuthFlowCompleted()),
            label: Resources.Subscription,
            change: (combo: Controls_Combos.Combo) => {
                this.subscriptionAndId(combo.getInputText());
            }
        };
        return options;
    }

    public getManagementGroupComboOptions = (): any => {
        if (this.managementGroupAndId() === " (  )" && this.managementGroupAndIdList().length > 0) {
            this.managementGroupAndId(this.managementGroupAndIdList()[0]);
        }

        var options = {
            allowEdit: false,
            mode: "drop",
            value: this.managementGroupAndId(),
            source: this.managementGroupAndIdList(),
            enabled: !(this.isUpdate()),
            label: Resources.ManagementGroup,
            change: (combo: Controls_Combos.Combo) => {
                this.managementGroupAndId(combo.getInputText());
            }
        };

        return options;
    }

    public getAzureRmResourceGroups = (): IPromise<boolean> => {
        if (!this.refreshResourceGroupsList()) {
            return Q.resolve(true);
        }

        let deferred: Q.Deferred<boolean> = Q.defer<boolean>();

        let authInProgress = (authInProgress: boolean) => {
            this.isRGOAuthFlowInProgress(authInProgress);
        };

        let serviceEndpointResourceGroupsRequest: ServiceEndpoint_Contracts.ServiceEndpointRequest = {
            serviceEndpointDetails: this.getServiceEndpointDetails(),
            dataSourceDetails: {
                dataSourceName: "AzureResourceGroups",
                dataSourceUrl: "",
                headers: null,
                requestContent: null,
                requestVerb: null,
                resourceUrl: "",
                parameters: null,
                resultSelector: "",
                initialContextTemplate: ""
            },
            resultTransformationDetails: null
        };

        this.errors([]);
        this.resourceGroupsList([]);

        AzureRmEndpointUtils.getAccessTokenKey(this._distributedTaskClient, this.tenantId(), authInProgress, this.accessTokenKey())
            .then((accessTokenKey: string) => {
                serviceEndpointResourceGroupsRequest.serviceEndpointDetails.authorization.parameters["accessTokenType"] = "AppToken";
                if (!!accessTokenKey) {
                    this.isRGOAuthFlowCompleted(true);
                    this.accessTokenKey(accessTokenKey);
                    serviceEndpointResourceGroupsRequest.serviceEndpointDetails.authorization.parameters["accesstoken"] = accessTokenKey;
                    if (AzureRmEndpointUtils.isCompleteCallbackByAuthCodeFeatureFlagEnabled()) {
                        serviceEndpointResourceGroupsRequest.serviceEndpointDetails.authorization.parameters["accessTokenFetchingMethod"] = ServiceEndpoint_Contracts.AccessTokenRequestType.Oauth.toString();
                    }
                }

                this._distributedTaskClient.beginExecuteServiceEndpointRequest(serviceEndpointResourceGroupsRequest, Utils_String.EmptyGuidString)
                    .then((response: ServiceEndpoint_Contracts.ServiceEndpointRequestResult) => {
                        if (!!response.errorMessage) {
                            this.errors.push(response.errorMessage);
                            deferred.reject(response.errorMessage);
                        }
                        else {
                            response.result.forEach((rg) => {
                                this.resourceGroupsList.push(rg);
                            });

                            this.refreshResourceGroupsList(false);
                            deferred.resolve(true);
                        }
                    }, (error) => {

                        let errorMsg = error;
                        if (!!error && !!error.serverError && !!error.serverError.innerException) {
                            errorMsg = errorMsg + Utils_String.newLine + error.serverError.innerException.message;
                        }

                        this.errors.push(errorMsg);
                        deferred.reject(errorMsg);
                    }
                    );

            }, (error) => {
                // invalidate the access token key
                this.accessTokenKey(Utils_String.empty);
                if (!!error) {
                    this.errors.push(error);
                }

                deferred.reject(error);
            }
            );

        return deferred.promise;
    }

    public getResourceGroupsComboOptions = (): any => {
        return {
            allowEdit: true,
            mode: "drop",
            value: this.selectedResourceGroup(),
            source: this.resourceGroupsList(),
            enabled: !(this.isSpnAuthorizationInProgress() || this.isRGOAuthFlowInProgress() || this.isSpnCreationInProgress() || this.isSpnUpdationInProgress()),
            label: Resources.ResourceGroup,
            change: (combo: Controls_Combos.Combo) => {
                this.selectedResourceGroup(combo.getInputText());
            },
            refreshData: this.getAzureRmResourceGroups
        }
    }
}

// show with ControlsCommon.Dialog.show(AddAzureEndpointsDialog, model)
export class AddAzureRmEndpointsDialog extends ServiceEndpoint_Controls.AddServiceEndpointDialog {
    protected _model: AddAzureRmEndpointsModel;

    constructor(model: AddAzureRmEndpointsModel) {
        super(model);
        this._model = model;
    }

    public initialize(): void {
        super.initialize();
        // this call should not be made for update as the subscriptions field is disabled in update.
        if (this._model.isSpnCreationModeAutomatic() && !this._model.isUpdate()) {
            this._model.getAzureSubscriptions().then((isFetchFailed) => {
                if (isFetchFailed) {
                    this._element.find(".error-messages-div").show();
                }
            });

            this._model.getAzureManagementGroups().then((isFetchFailed) => {
                if (isFetchFailed) {
                    this._element.find(".error-messages-div").show();
                }
            });

        }

        this._model.spnAuthenticationType.subscribe((authType: string) => {
            var elements = this._element.find('.grid-row-element');
            if (!!authType && !!elements && elements.length > 0) {

                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];
                    if (!!element && !!element.style) {
                        if (Utils_String.equals(authType, ServiceEndpoint_Common.EndpointAuthorizationParameters.ServicePrincipalKeyAuth, true)) {
                            element.style['grid-template-columns'] = "150px 1fr";
                        }
                        else {
                            element.style['grid-template-columns'] = "150px 1fr 15px";
                        }
                    }
                }
            }
        });

        this._model.spnCreationMode.subscribe((selectedCreationMode) => {
            if (this._model.isUpdate()) {
                if (this._model.manualUpdateToAutoCreatedServiceEndpoint()) {
                    this.updateButtonStatus("ok", false);
                }
                else {
                    this.updateButtonStatus("ok", true);
                }
            }


            let dialogCloseButtonElement = (!!this._element.parent() && this._element.parent().find(".ui-dialog-titlebar-close"));
            if (!!dialogCloseButtonElement && dialogCloseButtonElement.length > 0) {
                dialogCloseButtonElement[0].focus();
            }
        });

        if (this._model.errors) {
            this._element.find(".error-messages-div").show();
        }

        this._model.isRGOAuthFlowInProgress.subscribe((authInProgress) => {
            if (authInProgress) {
                this.updateButtonStatus("ok", false);
            }
            else {
                this.updateButtonStatus("ok", true);
            }
        });

        let parentElements = this._element.parent();
        if (!!parentElements && parentElements.length > 0) {
            parentElements[0].classList.add("dialog-prevent-trim");
        }
    }

    public getTitle(): string {
        var title = Resources.AddAzureResourceManagerDialogTitle;
        if (this._model.title !== "") {
            title = this._model.title;
        }
        return title;
    }

    protected createView(): JQuery {
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(ServiceEndpointCreationTemplate.AutomaticSpnTemplate, AddAzureRmEndpointsDialog._spn_creation_automatic_in_progress);
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(ServiceEndpointCreationTemplate.ManualSpnTemplate, AddAzureRmEndpointsDialog._spn_creation_manual_in_progress);
        TaskUtils.HtmlHelper.renderTemplateIfNeeded(ServiceEndpointCreationTemplate.MSITemplate, AddAzureRmEndpointsDialog._msi_creation_template);
        return $(AddAzureRmEndpointsDialog._add_azurerm_dialog);
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
        return this._model.getServiceEndpoint(false).toServiceEndpoint();
    }

    protected preCheck(): boolean {
        var areInputsValid = this._model.validateInputs();
        return !areInputsValid;
    }

    private static _azurerm_auth_scheme_selector = `
    <style type="text/css" scoped="">
        .grid-row-authSchemeSelector { display:grid; display: -ms-grid; grid-template-columns: auto; -ms-grid-columns: 1fr; padding-bottom:10px;} 
        .grid-row-element-col1 { -ms-grid-column: 1}
    </style>
    <div class="grid-row-authSchemeSelector">
        <div class="auth-scheme-container grid-row-element-col1" role="radiogroup" data-bind='attr: {"aria-label": authSchemeSelectorText}, visible: !isUpdate() && !isSpnCreationInProgress()' >
            <!-- ko if: authenticationSchemes().length > 0 -->
                <!-- ko foreach: authenticationSchemes -->
                    <input class="auth-scheme-container" type="radio" name="authenticationSchemes" data-bind="value: scheme, checked: $parent.selectedAuthenticationScheme, attr: {'aria-checked':($parent.selectedAuthenticationScheme()==scheme) ? 'true':'false', 'aria-labelledby':'scheme-id-'+ scheme}" />
                    <label class="auth-scheme-container" data-bind="text: displayName, attr: {id:'scheme-id-'+scheme}"></label>
                <!-- /ko -->
            <!-- /ko -->
        </div>
    </div>`;

    private static _msi_creation_template = `
    <div>
        <style type="text/css" scoped="">
            .grid-row-element { display:grid; display: -ms-grid; grid-template-columns: 150px 1fr 15px; -ms-grid-columns: 150px 1fr 15px; grid-gap: 10px; padding:10px;}
            .grid-row-element-col1 { -ms-grid-column: 1}
            .grid-row-element-col2 { -ms-grid-column: 2}
            .grid-row-element-col3 { -ms-grid-column: 3} 
        </style>
        <div class="grid-row-element">
            <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isNameInvalid() }" for="connectionName">${Resources.ConnectionName}</label>
            <input class="textbox grid-row-element-col2" data-bind="value: name, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isNameInvalid() }" required id="connectionName" type="text" />
            <div class="grid-row-element-col3" data-bind="showTooltip: { text: '${Resources.MSIConnectionNameTooltip}' }"> </div>
        </div>
        <div class="grid-row-element">
            <label class="grid-row-element-col1" for="environment">${Resources.Environment}</label>
            <div class="pick-list  grid-row-element-col2" data-bind="dtcCombo: getEnvironmentsComboOptions(), attr: { id: id }"></div>
            <div class="grid-row-element-col3" data-bind="showTooltip: { text: '${Resources.MSIEnvironmentTooltip}' }"> </div>
        </div>
        <div class="grid-row-element">
            <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSubscriptionIdInvalid() }" for="subscription-id">${Resources.AzureSubscriptionIdText}</label>
            <input class="textbox  grid-row-element-col2" data-bind="value: subscriptionId, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isSubscriptionIdInvalid() }" required id="subscription-id" type="text" />
            <div class="grid-row-element-col3" data-bind="showTooltip: { text: '${Resources.MSISubscriptionIdTooltip}' }"> </div>
        </div>
        <div class="grid-row-element">
            <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSubscriptionNameInvalid() }"  for="subscription-name">${Resources.AzureSubscriptionNameText}</label>
            <input class="textbox  grid-row-element-col2" data-bind="value: subscriptionName, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isSubscriptionNameInvalid() }" required id="subscription-name" type="text" />
            <div class="grid-row-element-col3" data-bind="showTooltip: { text: '${Resources.MSISubscriptionNameToolip}' }"> </div>
        </div>
        <div class="grid-row-element">
            <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isTenantIdInvalid() }"  for="tenent-id">${Resources.AzureTenantId}</label>
            <input class="textbox  grid-row-element-col2" data-bind="value: tenantId, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isTenantIdInvalid() }" required id="tenent-id" type="text" />
            <div class="grid-row-element-col3" data-bind="showTooltip: { text: '${Resources.MSITenantIdTooltip}' }">  </div>
        </div>
    </div>
    <br/>
    <div data-bind="ifnot: isUpdate">
        <span data-bind="html: createMsiEndpointFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
    </div>`;

    private static _spn_creation_automatic_in_progress = `
    <div id="spn-creation-in-progress" data-bind="visible: isSpnCreationInProgress">
        <span class="icon status-progress"></span>
        <span><strong>${Resources.SpnCreationInProgress}</strong></span>
    </div>
    <div id="spn-update-in-progress" data-bind="visible: isSpnUpdationInProgress">
        <span class="icon status-progress"></span>
        <span><strong>${Resources.SpnUpdateInProgress}</strong></span>
    </div>
    <div>
        <style type="text/css" scoped="">
            .grid-row-element { display:grid; display: -ms-grid; grid-template-columns: 150px 1fr;  -ms-grid-columns: 150px 1fr; grid-gap: 10px; padding:10px;}
            .grid-row-element-col1 { -ms-grid-column: 1}
            .grid-row-element-col2 { -ms-grid-column: 2}
        </style>
        <div>
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isNameInvalid() }" for="connectionName">${Resources.ConnectionName}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: name, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isNameInvalid() }" required id="connectionName" type="text" />
            </div>
        </div>
        <div data-bind="visible: isManagementGroupsFeatureFlagEnabled()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" for="scopeLevel">${Resources.ScopeLevelText}</label>

                <div class="pick-list grid-row-element-col2" data-bind="dtcCombo: getScopeLevelComboOptions(), attr: { id: id }"></div>
            </div>
        </div>
        <div data-bind="visible: isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" for="subscription-id">${Resources.Subscription}</label>
                <div class="pick-list grid-row-element-col2" data-bind="dtcCombo: getSubscriptionsComboOptions()"></div>
            </div>
        </div>
        <div data-bind="visible: !isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" for="managementgroupid">${Resources.ManagementGroup}</label>
                <div class="pick-list grid-row-element-col2" data-bind="dtcCombo: getManagementGroupComboOptions()"></div>
            </div>
        </div>
        <!-- ko if: isResourceGroupScopedSpnFeatureEnabled() -->
            <div data-bind="visible: isScopeLevelSubscription()">
                <div class="grid-row-element">
                    <label class="grid-row-element-col1" for="azureResourceGroup">${Resources.ResourceGroup}</label>
                    <div class="pick-list grid-row-element-col2" data-bind="dtcFetchingCombo: getResourceGroupsComboOptions()"></div>
                </div>
            </div>
        <!-- /ko -->
    </div>
    <br/>
    <br/>
    <div data-bind="visible: true">
        <div data-bind="if: isScopeLevelSubscription">
            <span data-bind="html: subscriptionsListedFromAzureCloud" class="getting-started-lighttext getting-started-vertical-small"></span>
        </div>
        <div data-bind="if: !isScopeLevelSubscription">
            <span data-bind="html: managementGroupsListedFromAzureCloud" class="getting-started-lighttext getting-started-vertical-small"></span>
        </div>
    </div>
    <br/>
    <br/>
    <div data-bind="ifnot: isUpdate">
        <div data-bind="if: isScopeLevelSubscription">
            <span data-bind="html: createAutoSpnFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
            <span class="getting-started-lighttext getting-started-vertical-small"><a role="button" tabindex="0" data-bind="click: switchSpnCreationMode, event: { keydown: onKeyDown }">${Resources.UseManualSpnWindowFooterLink}</a></span>
        </div>
        <div data-bind="if: !isScopeLevelSubscription">
            <span data-bind="html: createAutoSpnFooterForManagementGroup" class="getting-started-lighttext getting-started-vertical-small"></span>
            <span class="getting-started-lighttext getting-started-vertical-small"><a role="button" tabindex="0" data-bind="click: switchSpnCreationMode, event: { keydown: onKeyDown }">${Resources.UseManualSpnWindowFooterLink}</a></span>
        </div>
    </div>
    <div data-bind="if: isUpdate">
        <span data-bind="html: updateAutoSpnFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
        <span class="getting-started-lighttext getting-started-vertical-small"><a role="button" tabindex="0" data-bind="click: switchSpnCreationMode, event: { keydown: onKeyDown }">${Resources.UseManualSpnWindowFooterLink}</a></span>
    </div>`;

    private static _spn_creation_manual_in_progress = `
    <div>

        <style type="text/css" scoped="">
            .grid-row-element { display:grid; display: -ms-grid; grid-template-columns: 150px 1fr;  -ms-grid-columns: 150px 1fr; grid-gap: 10px; padding:10px;}
            .grid-row-element-col1 { -ms-grid-column: 1}
            .grid-row-element-col2 { -ms-grid-column: 2}
            .grid-row-element-col3 { -ms-grid-column: 3}
        </style>

        <div>
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isNameInvalid() }" for="connectionName">${Resources.ConnectionName}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: name, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isNameInvalid() }" required id="connectionName" type="text" />
            </div>
        </div>

        <div data-bind="visible: true">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isNameInvalid() }" for="environment">${Resources.Environment}</label> 
                <div class="pick-list grid-row-element-col2" data-bind="dtcCombo: getEnvironmentsComboOptions(), attr: { id: id }"></div>
            </div>
        </div>

        <div data-bind="visible: isServerUrlInputFieldVisible">    
            <div class="grid-row-element">    
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text' : isEnvironmentUrlInvalid() }" for="environmenturl">Environment URL</label>
                <input class="textbox grid-row-element-col2" data-bind="value: serverUrl, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isEnvironmentUrlInvalid() }" required id="environmenturl" type="text" />
            </div>
        </div>

        <div data-bind="visible: isManagementGroupsFeatureFlagEnabled()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isNameInvalid() }" for="scopeLevel">${Resources.ScopeLevelText}</label>       
                <div class="pick-list grid-row-element-col2" data-bind="dtcCombo: getScopeLevelComboOptions(), attr: { id: id }"></div>
            </div>
        </div>

        <div data-bind="visible: isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSubscriptionIdInvalid() }" for="subscription-id">${Resources.AzureSubscriptionIdText}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: subscriptionId, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isSubscriptionIdInvalid() }" required id="subscription-id" type="text" />
            </div>
        </div>

        <div data-bind="visible: isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSubscriptionNameInvalid() }"  for="subscription-name">${Resources.AzureSubscriptionNameText}</label>           
                <input class="textbox grid-row-element-col2" data-bind="value: subscriptionName, valueUpdate: ['blur', 'afterkeydown'], disable: isUpdate(), css: { 'invalid': isSubscriptionNameInvalid() }" required id="subscription-name" type="text" />     
            </div>
        </div>

        <div data-bind="visible: !isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isManagementGroupIdInvalid() }" for="managementgroupid">${Resources.ManagementGroupId}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: managementGroupId, disable: isUpdate()" required id="managementgroupid" type="text"/>
            </div>
        </div>

        <div data-bind="visible: !isScopeLevelSubscription()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isManagementGroupNameInvalid() }" for="managementgroupname">${Resources.ManagementGroupName}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: managementGroupName, disable: isUpdate()" required id="managementgroupname" type="text"/> 
            </div>
        </div>

        <div>
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSpnCliendIdInvalid() }"  for="spn-clientid">${Resources.AzureServicePrincipalIdText}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: spnClientId, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isSpnCliendIdInvalid() }" required id="spn-clientid" type="text" />
            </div>
        </div>

        <div data-bind="visible: isCertificateBasedAuthenticationEnabled()">
            <div class="grid-row-element">
                <div class="grid-row-element-col1">
                </div>
                <div class="grid-row-element-col2">
                    <span>
                        <input class="auth-kind" required type="radio" id="servicePrincipalKeyAuth" value="spnKey" data-bind="checked: spnAuthenticationType, attr: {'aria-label': AzureServicePrincipalKeyText}" />                    
                        ${Resources.AzureServicePrincipalKeyText}
                    </span>
                    <span>
                        <input class="auth-kind" required type="radio" id="servicePrincipalCertificateAuth" value="spnCertificate" data-bind="checked: spnAuthenticationType,  attr: {'aria-label': AzureSpnCertificateText}" />
                        ${Resources.AzureSpnCertificate}
                    </span> 
                </div>
            </div>   
        </div>

        <div data-bind="visible: isServicePrincipalKeyBaseAuth()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isSpnKeyInvalid() }"  for="spn-key">${Resources.AzureServicePrincipalKeyText}</label>            
                <input class="textbox grid-row-element-col2" type="password" data-bind="attr: { placeholder: isUpdate() ? '********' : '' }, value: spnKey, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isSpnKeyInvalid() }" required id="spn-key" type="text" />
            </div>
        </div>
        
        <div data-bind="visible: !isServicePrincipalKeyBaseAuth()">
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isCertificateInvalid() }"  for="servicePrincipalCertificate">${Resources.AzureSpnCertificate}</label>           
                <div class="grid-row-element-col2">
                    <textarea class="textbox" rows="5" cols="30" required id="servicePrincipalCertificate" data-bind="attr: { placeholder: (isUpdate()) ? '********' : '' }, value: spnCertificate, valueUpdate: ['blur', 'afterkeydown']"></textarea>
                    <p class="getting-started-lighttext getting-started-vertical-small">${Resources.AzureSpnCertificateSpnHelpText}</p>
                </div>
                <div class="helpMarkDown grid-row-element-col3" data-bind="showTooltip: { text: PFXToPEMConversionText, minWidth: 200, pivotSiblingCssClass: 'value-field' }">
                </div>
            </div>
        </div>

        <div>
            <div class="grid-row-element">
                <label class="grid-row-element-col1" data-bind="css: { 'bold-text': isTenantIdInvalid() }"  for="tenent-id">${Resources.AzureTenantId}</label>
                <input class="textbox grid-row-element-col2" data-bind="value: tenantId, valueUpdate: ['blur', 'afterkeydown'], css: { 'invalid': isTenantIdInvalid() }" required id="tenent-id" type="text" />
            </div>
        </div>

        <div class="verify-connection-container">
            <!-- ko if: showVerifyConnection() -->
                <div>
                    <div class="header-line td" colspan="2"></div>
                    <div class="header"></div>
                </div>
                <div>
                    <div class="grid-row-element">
                        <div class="verify-connection-status grid-row-element-col1" >
                            <span>${Resources.ConnectionLabel}</span>
                            <span class="bowtie-icon dialog-field-tooltip" data-bind="css: verifyConnectionStatusCssIconClass"></span>
                            <span class="status-main" data-bind="text: verifyConnectionStatus, css: verifyConnectionStatusCssTextClass"></span>
                        </div>
                        <div class="verify-action grid-row-element-col2" style="text-align: right">
                            <span data-bind="click: verifyConnection, event: { keydown: onKeyDown }"><a tabindex="0" role="button">${Resources.VerifyConnection}</a></span>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="footer-line td" colspan="2"></div>
                    <div class="footer"></div>
                </div>
            <!-- /ko -->  
        </div>
    </div>
    <br/>
    <br/>
    <div>
        <span role="link" aria-describedby="service-principal-link-label" data-bind="html: servicePrincipalTip" class="getting-started-lighttext getting-started-vertical-small"></span>
        <div class="hidden" id="service-principal-link-label">${Resources.ServicePrincipalLinkLabel}</div>
        <!-- ko if: isSpnFeatureEnabled() -->
            <br/>
            <br/>
            <div data-bind="ifnot: isUpdate">
                <span data-bind="html: useAutoSpnCreateWindowFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
                <span class="getting-started-lighttext getting-started-vertical-small"><a role="button" tabindex="0" data-bind="click: switchSpnCreationMode, event: { keydown: onKeyDown }">${Resources.UseAutoSpnCreateWindowFooterLink}</a></span>
            </div>
            <div data-bind="if: (isUpdate && manualUpdateToAutoCreatedServiceEndpoint())">
                <span data-bind="html: useAutoSpnUpdateWindowFooter" class="getting-started-lighttext getting-started-vertical-small"></span>
                <span class="getting-started-lighttext getting-started-vertical-small"><a role="button" tabindex="0" data-bind="click: switchSpnCreationMode, event: { keydown: onKeyDown }">${Resources.UseAutoSpnCreateWindowFooterLink}</a></span>
            </div>
            <br/>
            <div data-bind="if: (isUpdate && manualUpdateToAutoCreatedServiceEndpoint())">
                <span data-bind="html: manualUpdateToAutoCreatedServiceEndpointNotSupported" class="getting-started-lighttext getting-started-vertical-small"></span>
            </div>
        <!-- /ko -->
    </div>`;

    private static _add_azurerm_dialog = `
    <div class="add_deployment_environments_dialog services_dialog">
        <style type="text/css" scoped="">
            .dialog-prevent-trim { top: 10% !important; left: 35% !important; }
        </style>
        <div id="connectionId" class="connectionId" data-bind="value: id, disable: isUpdate()"></div>
        <!-- ko if: isManagedServiceIdentityAuthenticationSchemeFeatureEnabled() -->
            ${AddAzureRmEndpointsDialog._azurerm_auth_scheme_selector}
         <!-- /ko -->
        <div data-bind="template: { name: ARMEndpointAuthenticationTemplate() }" />
        <div class="error-messages-div">
            <div data-bind="foreach: errors">
                <span role="alert" data-bind="html: $data"></span>
                <br />
            </div>
        </div>
    </div>`;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("AzureRMEndpointsManageDialog", exports);

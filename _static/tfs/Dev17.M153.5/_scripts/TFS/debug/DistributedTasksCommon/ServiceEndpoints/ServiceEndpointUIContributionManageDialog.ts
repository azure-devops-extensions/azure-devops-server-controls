/// <reference types="jquery" />
import Q = require("q");
import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import TFS_Admin_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import ServiceEndpoint_Utils = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Utils");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import ko = require("knockout");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import Contracts = require("TFS/DistributedTask/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import DistributedTaskExtension_Contracts = require("TFS/DistributedTask/ServiceEndpoint/ExtensionContracts");

export class AddServiceEndpointUIContributionConnectionModel extends AddServiceEndpointModel {
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public title: string = "";
    public successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void;
    public uiContribution: Contributions_Contracts.Contribution;
    public serviceEndpointUIExtensionDetails: DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails;
    public serviceEndpointId: string;
    public serviceEndpointType: string;
    public serviceEndpointDisplayName: string;
    public verifyConnectionStatus: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssTextClass: KnockoutObservable<string> = ko.observable("");
    public verifyConnectionStatusCssIconClass: KnockoutObservable<string> = ko.observable("");
    public showVerifyConnection: KnockoutComputed<boolean>;
    public isTestConnectionDataSourceAvailable: KnockoutObservable<boolean> = ko.observable(false);
    public getEndpointDetails: () => IPromise<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails>;
    public validateEndpointDetails: () => IPromise<boolean>;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _ICON_CLASS_SUCCESS: string = "bowtie-status-success";
    private _ICON_CLASS_FAILURE: string = "bowtie-status-failure";
    private _TEXT_CLASS_SUCCESS: string = "vc-status-success";
    private _TEXT_CLASS_FAILURE: string = "vc-status-failure";

    constructor(successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint) => void, dataSources: ServiceEndpoint_Contracts.DataSource[], uiContribution: Contributions_Contracts.Contribution, serviceEndpointType: string, serviceEndpointDisplayName: string, serviceEndpointUIExtensionDetails?: DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails, serviceEndpointId?: string, isUpdate?: boolean) {
        super(successCallBack);
        this.uiContribution = uiContribution;
        this.serviceEndpointType = serviceEndpointType;
        this.serviceEndpointDisplayName = serviceEndpointDisplayName;
        this.serviceEndpointUIExtensionDetails = serviceEndpointUIExtensionDetails;
        this.isUpdate(isUpdate);
        this.serviceEndpointId = serviceEndpointId;
        this.width = 750;
        this.height = 600;

        this.verifyConnectionStatus(Resources.ConnectionStatusNotVerified);

        this._context = Context.getDefaultWebContext();
        var connection: Service.VssConnection = new Service.VssConnection(this._context);
        this._distributedTaskClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);


        if (!!Utils_Array.first(dataSources, (e) => { return (Utils_String.equals(e.name, "TestConnection", true)) })) {
            this.isTestConnectionDataSourceAvailable(true);
        }

        this.showVerifyConnection = this._disposalManager.addDisposable(ko.computed((): boolean => {
            var showVerifyConnection = this.isTestConnectionDataSourceAvailable();
            return showVerifyConnection;
        }));

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
            } else {
                this.verifyConnectionStatusCssTextClass("");
                this.verifyConnectionStatusCssIconClass("");
            }
        }));
    }

    public verifyConnection(): void {
        this.errors([]);
        this.verifyConnectionStatus(Resources.ConnectionStatusVerifying);

        var validateEndpointDetails: IPromise<boolean>;
        var getEndpointDetails: IPromise<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails>;
        try {
            validateEndpointDetails = this.validateEndpointDetails();
        }
        catch (e) {
            this.errors.push(Utils_String.format(Resources.MethodExceptionInExtension, "validateEndpointDetails"));
            return null;
        }
        validateEndpointDetails.then((isValidEndpointDataSuccessful) => {
            if (isValidEndpointDataSuccessful) {
                var serviceEndpointDetailsPromise = this.getServiceEndpointDetailsFromUIContribution();
                serviceEndpointDetailsPromise.then((serviceEndpointDetails) => {
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
                    var resultTransformationDetails: ServiceEndpoint_Contracts.ResultTransformationDetails = {
                        resultTemplate: "",
                        callbackContextTemplate: "",
                        callbackRequiredTemplate: ""
                    };
                    var serviceEndpointRequest: any = {
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
                });
            }
            else {
                this.verifyConnectionStatus(Resources.ConnectionStatusFailed);
            }
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

    public getServiceEndpointFromUIContribution(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var defer = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        var validateEndpointDetails: IPromise<boolean>;
        var getEndpointDetails: IPromise<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails>;
        try {
            validateEndpointDetails = this.validateEndpointDetails();
        }
        catch (e) {
            this.errors.push(Utils_String.format(Resources.MethodExceptionInExtension, "validateEndpointDetails"));
            return null;
        }
        validateEndpointDetails.then((isValidEndpointDataSuccessful) => {
            if (isValidEndpointDataSuccessful) {
                var serviceEndpointDetailsPromise: IPromise<TFS_Admin_Common.ServiceEndpointDetails> = this.getServiceEndpointDetailsFromUIContribution();

                serviceEndpointDetailsPromise.then((serviceEndpointDetails) => {
                    if (!!serviceEndpointDetails) {
                        defer.resolve(serviceEndpointDetails.toServiceEndpoint());
                    }
                    else {
                        defer.resolve(null);
                    }
                }, (error) => {
                    defer.reject(error);
                });
            }
            else {
                return defer.resolve(null);
            }
        });
        return defer.promise;
    }

    private getServiceEndpointDetailsFromUIContribution(): IPromise<TFS_Admin_Common.ServiceEndpointDetails> {
        var defer = Q.defer<TFS_Admin_Common.ServiceEndpointDetails>();
        var serviceEndpointUIExtensionDetails: DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails;
        var apiData;
        var endpointId;

        try {
            var serviceEndpointDetailsPromise = this.getEndpointDetails();
        }
        catch (e) {
            this.errors.push(Utils_String.format(Resources.MethodExceptionInExtension, "getEndpointDetails"));
            return null;
        }

        serviceEndpointDetailsPromise.then((endpointDataFromUIContribution) => {
            serviceEndpointUIExtensionDetails = endpointDataFromUIContribution;

            if (this.isUpdate()) {
                endpointId = this.serviceEndpointId;
            }
            else {
                endpointId = ServiceEndpoint_Utils.GUIDUtils.newGuid();
            }

            if (serviceEndpointUIExtensionDetails) {
                apiData = serviceEndpointUIExtensionDetails;
                apiData.endpointName = serviceEndpointUIExtensionDetails.name;
                apiData.parameters = serviceEndpointUIExtensionDetails.data;
                apiData.authorizationInfo = serviceEndpointUIExtensionDetails.authorization;
            }
            else {
                this.errors.push(Utils_String.format(Resources.MethodExceptionInExtension, "getEndpointDetails"));
                defer.resolve(null);
            }

            apiData.endpointId = endpointId;
            apiData.type = this.serviceEndpointType;

            defer.resolve(new TFS_Admin_Common.ServiceEndpointDetails(apiData, apiData.authorizationInfo));
        });

        return defer.promise;
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

    private _context: Contracts_Platform.WebContext;
    private _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;
}

export class AddServiceEndpointUIContributionDialog extends AddServiceEndpointDialog {
    protected _model: AddServiceEndpointUIContributionConnectionModel;

    constructor(model: AddServiceEndpointModel) {
        super(model);
    }

    public initialize(): void {
        super.initialize();
        var extensionContainer = $('<div class="add-service-endpoint-ui-contribution-view">');
        extensionContainer.insertBefore(".add_service_endpoint_UI_contribution_connections_dialog");
        if (this._model.isUpdate()) {
            Contributions_Controls.createExtensionHost(extensionContainer, this._model.uiContribution, <DistributedTaskExtension_Contracts.IServiceEndpointUiExtensionConfig>{
                action: "update",
                serviceEndpointUiExtensionDetails: this._model.serviceEndpointUIExtensionDetails,
                validateEndpointDetailsFuncImpl: (validateEndpointDetailsFunc: () => IPromise<boolean>) => {
                    this._model.validateEndpointDetails = validateEndpointDetailsFunc;
                },
                getEndpointDetailsFuncImpl: (getEndpointDetailsFunc: () => IPromise<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails>) => {
                    this._model.getEndpointDetails = getEndpointDetailsFunc;
                }
            }, null, null, null, "file");
        }
        else {
            Contributions_Controls.createExtensionHost(extensionContainer, this._model.uiContribution, <DistributedTaskExtension_Contracts.IServiceEndpointUiExtensionConfig>{
                action: "create",
                validateEndpointDetailsFuncImpl: (validateEndpointDetailsFunc: () => IPromise<boolean>) => {
                    this._model.validateEndpointDetails = validateEndpointDetailsFunc;
                },
                getEndpointDetailsFuncImpl: (getEndpointDetailsFunc: () => IPromise<DistributedTaskExtension_Contracts.ServiceEndpointUiExtensionDetails>) => {
                    this._model.getEndpointDetails = getEndpointDetailsFunc;
                }
            }, null, null, null, "file");
        }
    }

    public getTitle(): string {
        var title;
        if (!this._model.isUpdate()) {
            title = Utils_String.format(Resources.AddUIContributionConnectionsDialogTitle, this._model.serviceEndpointDisplayName);
        }
        else {
            title = Utils_String.format(Resources.UpdateUIContributionConnectionsDialogTitle, this._model.serviceEndpointUIExtensionDetails.name);
        }

        return title;
    }

    public createConnectedService(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var endpointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        this.createServiceEndpoint().then((serviceEndpoint) => {
            if (serviceEndpoint == null) {
                var serviceEndpointPromise: IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> = this._model.getServiceEndpointFromUIContribution();
                serviceEndpointPromise.then((serviceEndpoint) => {
                    if (!serviceEndpoint) {
                        this.updateOkButton(true);
                        return;
                    }

                    this._distributedTaskClient.beginCreateServiceEndpoint(serviceEndpoint, this._model.isPipelineAuthorizationEnabled()).then((endpoint) => {
                            endpointPromise.resolve(endpoint);                        
                    }, (error) => {
                        this._model.errors.push(Resources.CouldNotFetchEndpointTypes);
                        endpointPromise.reject(new Error(error));
                    });
                });
            }
            else {
                endpointPromise.resolve(serviceEndpoint);
            }
        }, (error) => {
            endpointPromise.reject(new Error(error));
        });
        return endpointPromise.promise;
    }

    public updateConnectedService(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var endpointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        this.updateServiceEndpoint().then((serviceEndpoint) => {
            if (serviceEndpoint == null) {
                var serviceEndpointPromise: IPromise<any> = this._model.getServiceEndpointFromUIContribution();
                serviceEndpointPromise.then((serviceEndpoint) => {
                    if (!serviceEndpoint) {
                        this.updateOkButton(true);
                        return;
                    }

                    this._distributedTaskClient.beginUpdateServiceEndpoint(serviceEndpoint).then((endpoint) => {
                        endpointPromise.resolve(endpoint);
                    }, (error) => {
                        endpointPromise.reject(new Error(error));
                    });
                });
            } else {
                endpointPromise.resolve(serviceEndpoint);
            }

        }, (error) => {
            endpointPromise.reject(new Error(error));
        });
        return endpointPromise.promise;
    }

    protected createView(): JQuery {
        return $(AddServiceEndpointUIContributionDialog._add_static_template);
    }

    private static _add_static_template = `
    <div class="add_service_endpoint_UI_contribution_connections_dialog services_dialog">
    <div>
    <div class="input-container">
    <table class="auth-scheme-input">    
    <tbody class="verify-connection-container">
        <!-- ko if: showVerifyConnection() -->
    <tr>
    <td class="header-line td" colspan= "2" >
        <div class="header"></div>
    </td>
    </tr>
    <tr>
    <td>
    <div class="verify-connection-status">
    <span>${Resources.ConnectionLabel} </span>
    <span class="bowtie-icon dialog-field-tooltip" data-bind="css: verifyConnectionStatusCssIconClass"></span>
    <span class="status-main" data-bind="text: verifyConnectionStatus, css: verifyConnectionStatusCssTextClass"></span>
    </div>
    </td>
    <td >
    <div class="verify-action" >
    <span data-bind="click: verifyConnection, event: { keydown: onKeyDown }" > <a tabindex="0" role= "button" > ${Resources.VerifyConnection} </a></span>
    </div>
    </td>
    </tr>
    <tr>
    <td class="footer-line td" colspan= "2" >
    <div class="footer" > </div>
    </td>
    </tr>
        <!-- /ko -->
    </tbody>
    </table>
    </div>
    </div>
    <div class="error-messages-div"><div data-bind="foreach: errors"><span data-bind="text: $data"></span><br /></div></div></div>`;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ServiceEndpointUIContributionManageDialog", exports);

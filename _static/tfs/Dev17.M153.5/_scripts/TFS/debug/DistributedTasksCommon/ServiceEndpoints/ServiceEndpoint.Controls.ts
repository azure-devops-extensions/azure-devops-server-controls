///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
/// <reference types="knockout" />
/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Context = require("VSS/Context");
import Dialogs = require("VSS/Controls/Dialogs");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import ServiceEndpoint_Common = require("DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common");
import BuildClient = require("DistributedTasksCommon/DefinitionResourceReferenceBuildHttpClient");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Contracts = require("TFS/ServiceEndpoint/Contracts");
import BuildContracts = require("TFS/Build/Contracts");
import ConnectedService = require("TFS/Admin/Scripts/Generated/ConnectedService");
import ConnectedServiceHttpClient = require("TFS/Admin/Scripts/Generated/ConnectedServiceHttpClient");
import { IPromise } from "q";
import { ExtensionErrorAdditionalSteps } from "VSS/Resources/VSS.Resources.Common";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export class AddServiceEndpointModel implements Dialogs.IModalDialogOptions {
    public dialogTemplate: string = "";
    public errors: KnockoutObservableArray<string> = ko.observableArray([]);
    public id: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public serverUrl: KnockoutObservable<string> = ko.observable("");
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public userName: KnockoutObservable<string> = ko.observable("");
    public disconnectService: boolean = false;
    public isPipelineAuthorizationEnabled: KnockoutObservable<boolean> = ko.observable(true);
    public title: string = "";
    public successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint, isUpdate?: boolean) => void;
    public width: number;
    public height: number;
    constructor(successCallBack: (serviceEndpoint: ServiceEndpoint_Contracts.ServiceEndpoint, isUpdate?: boolean) => void) {
        this.successCallBack = successCallBack;
    }
}

export class AddServiceEndpointDialog extends Dialogs.ModalDialog {

    constructor(model: AddServiceEndpointModel) {
        super(model);
        this._model = model;
        this._tfsContext = Context.getDefaultWebContext();
        var connection: Service.VssConnection = new Service.VssConnection(this._tfsContext);
        this._distributedTaskClient = connection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
        this._oauthConnectedService = Service.getClient(ConnectedServiceHttpClient.ConnectedServiceHttpClient);


        var button_id = "ok";

        this._disposalManager.addDisposable(this._model.errors.subscribe((value: string[]) => {
            if (!!value && value.length > 0) {
                this._errorElement.show();
            } else {
                this._errorElement.hide();
            }
        }));

        // Subscribe to valid
        this._subscription = this._valid.subscribe((valid: boolean) => {
            if (!valid) {
                // Invalid
                this._errorElement.show();
            }
            else {
                // valid
                this.updateButtonStatus(button_id, false);
                this._errorElement.hide();
                this._model.errors([]);

                var connectedServicePromise: IPromise<any> = model.isUpdate()
                    ? this.updateConnectedService()
                    : this.createConnectedService();

                connectedServicePromise.then((service: ServiceEndpoint_Contracts.ServiceEndpoint) => {
                    this.close();
                    if (this._model.successCallBack) {
                        this._model.successCallBack(service, model.isUpdate());
                    }
                }, (error) => {
                    // Possibly duplicate errors, ignore? what about other errors?
                    this.updateButtonStatus(button_id, true);
                    if (!!error.message) {
                        this._model.errors.push(error.message);
                        this._errorElement.show();
                    }
                });
            }
        });
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            width: 600,
            buttons: {
                "ok": {
                    id: "ok",
                    text: (options && options.okText) || VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this._onOk),
                    disabled: "disabled"
                },
                "close": {
                    id: "close",
                    text: (options && options.okText) || VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this._onCancel)
                }
            }
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._$view = this.createView();
        this._$template = $(`<div />`).append(this._$view);

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint)
            && (!this._model.id() || (this._model.id() && !this._model.id().trim()))) {
            this._$template.append($(this.defaultAuthorizationPolicySection));
        }

        this._element.append(this._$template);
        ko.applyBindings(this._model, this._$template[0]);
        this.init();

        this.updateOkButton(true);

        var focusable = this._element.parent().find(":focusable");
        if (focusable && focusable.length > 1) {
            // focus the second item, not the close button in title bar.
            focusable[1].focus();
        }
        else {
            // fallback and focus the first item by default.
            focusable.first().focus();
        }

        // remove aria-describedBy of parent to avoid screen reader from reading whole dialog content on load
        this._element.parent().removeAttr("aria-describedBy");
    }

    public init(): void {
        this._errorElement = this._element.find(".error-messages-div");
        this._errorElement.hide();
        // Hide error element on change
        this._element.find('input').focus(() => {
            this._model.errors([]);
            this._errorElement.hide();
        });
        this._element.find('textarea').focus(() => {
            this._errorElement.hide();
        });
    }

    public _onOk(): void {
        this._preCheck();
        this.onOkClick();
    }

    private _onCancel(e?, args?): void {
        super.onCancelClick();
    }

    public dispose() {
        this._subscription.dispose();
        this._disposalManager.dispose();
        super.dispose();
    }

    protected createView(): JQuery {
        var template: JQuery = $(domElem("div"))
            .attr("data-bind", "template: { name: '" + this._model.dialogTemplate + "' }");

        return template;
    }

    protected preCheck(): boolean {
        return false;
    }

    private _preCheck(): void {
        var checkFailed = false;
        this._model.errors([]);

        // Input fields check
        checkFailed = this.preCheck();

        if (checkFailed && this._model.errors().length === 0) {
            this._model.errors.push(this._msgAllFieldsRequired);
        }

        // subscriber to _valid should always be called in this case
        this._valid.notifySubscribers(!checkFailed);
    }

    protected createConnectedService(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var endPointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        this.createServiceEndpoint().then((serviceEndpoint) => {
            if (serviceEndpoint == null) {
                serviceEndpoint = this.getServiceEndpoint();
                if (serviceEndpoint.authorization.scheme === ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2) {
                    this._oauthConnectedService.createAuthRequest(undefined, this._tfsContext.project.name, ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2, serviceEndpoint.authorization.parameters[ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId]).then((authRequest: ConnectedService.AuthRequest) => {
                        this._authRequestWindow = window.open(authRequest.url, "", "width = 960, height = 600, location = true, menubar = false, toolbar = false");
                        this._pollAuthRequestWindow().then((accessTokenKey: string) => {
                            serviceEndpoint.authorization.parameters[ServiceEndpoint_Common.EndpointAuthorizationParameters.AccessToken] = accessTokenKey;
                            this._distributedTaskClient.beginCreateServiceEndpoint(serviceEndpoint, this._model.isPipelineAuthorizationEnabled()).then((endPoint) => {
                                endPointPromise.resolve(endPoint);
                            }, (error) => {
                                endPointPromise.reject(new Error(error));
                            });

                        }, (error) => {
                            endPointPromise.reject(new Error(error));
                        });

                    }, (error) => {
                        endPointPromise.reject(new Error(error));
                    });

                } else {
                    this._distributedTaskClient.beginCreateServiceEndpoint(serviceEndpoint, this._model.isPipelineAuthorizationEnabled()).then((endPoint) => {
                        endPointPromise.resolve(endPoint);
                    }, (error) => {
                        endPointPromise.reject(new Error(error));
                    });
                }
            }
            else {
                endPointPromise.resolve(serviceEndpoint);
            }
        }, (error) => {
            endPointPromise.reject(new Error(error));
        });
        return endPointPromise.promise;
    }

    protected updateConnectedService(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        var endPointPromise = Q.defer<ServiceEndpoint_Contracts.ServiceEndpoint>();
        this.updateServiceEndpoint().then((serviceEndpoint) => {
            if (serviceEndpoint == null) {
                serviceEndpoint = this.getServiceEndpoint();
                // By design, we create new token for each update
                if (serviceEndpoint.authorization.scheme === ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2) {
                    this._oauthConnectedService.createAuthRequest(undefined, this._tfsContext.project.name, ServiceEndpoint_Common.EndpointAuthorizationSchemes.OAuth2, serviceEndpoint.authorization.parameters[ServiceEndpoint_Common.EndpointAuthorizationParameters.ConfigurationId]).then((authRequest: ConnectedService.AuthRequest) => {
                        this._authRequestWindow = window.open(authRequest.url, "", "width = 960, height = 600, location = true, menubar = false, toolbar = false");
                        this._pollAuthRequestWindow().then((accessTokenKey: string) => {
                            serviceEndpoint.authorization.parameters[ServiceEndpoint_Common.EndpointAuthorizationParameters.AccessToken] = accessTokenKey;
                            this._distributedTaskClient.beginUpdateServiceEndpoint(serviceEndpoint).then((endPoint) => {
                                endPointPromise.resolve(endPoint);
                            }, (error) => {
                                endPointPromise.reject(new Error(error));
                            });
                        }, (error) => {
                            endPointPromise.reject(new Error(error));
                        });

                    }, (error) => {
                        endPointPromise.reject(new Error(error));
                    });

                } else {
                    this._distributedTaskClient.beginUpdateServiceEndpoint(serviceEndpoint).then((endPoint) => {
                        endPointPromise.resolve(endPoint);
                    }, (error) => {
                        endPointPromise.reject(new Error(error));
                    });
                }
            } else {
                endPointPromise.resolve(serviceEndpoint);
            }

        }, (error) => {
            endPointPromise.reject(new Error(error));
        });
        return endPointPromise.promise;
    }

    protected updateButtonStatus(button: string, enabled: boolean): void {
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: button, enabled: enabled });
    }

    protected createServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        return Q.Promise<ServiceEndpoint_Contracts.ServiceEndpoint>((resolve, reject) => {
            resolve(null);
        });
    }

    protected updateServiceEndpoint(): IPromise<ServiceEndpoint_Contracts.ServiceEndpoint> {
        return Q.Promise<ServiceEndpoint_Contracts.ServiceEndpoint>((resolve, reject) => {
            resolve(null);
        });
    }

    protected getServiceEndpointDetails(): ServiceEndpoint_Common.ServiceEndpointDetails {
        return null;
    }

    protected getServiceEndpoint(): ServiceEndpoint_Contracts.ServiceEndpoint {
        var serviceEndpointDetails = this.getServiceEndpointDetails();
        return serviceEndpointDetails.toServiceEndpoint();
    }

    protected _checkEmpty(element: JQuery): boolean {
        return $.trim($(element).val()).length === 0;
    }

    private _pollAuthRequestWindow(): IPromise<string> {
        var defer = Q.defer<string>();
        this._monitorAuthProgress = new Utils_Core.DelayedFunction(this, 500, "monitorAuthProgress", () => {

            try {
                if (!this._authRequestWindow) {
                    defer.reject(Resources.CouldNotCompleteOAuth2);
                    this._cleanupAuthRequestWindow();
                } else if (this._authRequestWindow.closed) {
                    defer.reject(''); // not showing any message as closing window is not an error condition
                    this._cleanupAuthRequestWindow();
                } else {
                    try {
                        if (this._authRequestWindow.oauthcompleted) {
                            if (this._authRequestWindow.oautherrormessage) {
                                defer.reject(this._authRequestWindow.oautherrormessage);
                            } else if (this._authRequestWindow.strongboxkey) {
                                defer.resolve(this._authRequestWindow.strongboxkey);
                            } else {
                                defer.reject(Resources.CouldNotCompleteOAuth2);
                            }

                            this._cleanupAuthRequestWindow();

                        } else {
                            this._monitorAuthProgress.reset();
                        }
                    } catch (e1) {
                        this._monitorAuthProgress.reset();
                    }
                }
            } catch (e) {
                defer.reject(e);
                this._cleanupAuthRequestWindow();
            }
        });

        this._monitorAuthProgress.start();
        return defer.promise;
    }

    // Close auth window and stop checking for tokens or window closing
    private _cleanupAuthRequestWindow() {
        if (this._authRequestWindow) {
            try {
                this._authRequestWindow.close();
                this._authRequestWindow = null;
            } catch (e) {
                // ignore
            }
        }

        if (this._monitorAuthProgress) {
            this._monitorAuthProgress.cancel();
            delete this._monitorAuthProgress;
        }
    }

    private _subscription: any;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _errorElement: JQuery;
    private _$template: JQuery;
    private _$view: JQuery;
    private _tfsContext: Contracts_Platform.WebContext;

    private _msgAllFieldsRequired = Resources.AllFieldsRequired;

    public showPolicyTab: boolean = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServiceEndpoint_Common.FeatureAvailabilityFlags.ResourceAuthorizationforVGEndpoint);
    private _authRequestWindow: any;
    protected _model: AddServiceEndpointModel;
    protected _valid: KnockoutObservable<boolean> = ko.observable(false);
    protected _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;
    protected _oauthConnectedService: ConnectedServiceHttpClient.ConnectedServiceHttpClient;
    private _defResourceRefBuildClient: BuildClient.DefinitionResourceReferenceBuildHttpClient;
    private _monitorAuthProgress: Utils_Core.DelayedFunction = null;


    readonly defaultAuthorizationPolicySection: string =
        `<div class="policy-section">
        <input type="checkbox" id='default-pipeline-auth' data-bind="checked: isPipelineAuthorizationEnabled, css: 'default-pipeline-auth-checkbox'" />
        <label for='default-pipeline-auth' class='default-pipeline-auth-checkbox-label' >${Resources.ServiceConnectionDefaultAuthText}</label>
    </div>`;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ServiceEndpoint.Controls", exports);


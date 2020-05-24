/// <reference types="jquery" />


import ko = require("knockout");

import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import AdminHttpClient = require("Admin/Scripts/TFS.Admin.WebApi");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var domElem = Utils_UI.domElem;

export enum AuthType {
    Cert = 0,
    Credentials = 1
}

export class AddLegacyDeploymentEnvironmentsModel {
    public dialogTemplate: string = "add_deployment_environments_dialog";
    public authChoice: KnockoutObservable<AuthType> = ko.observable(AuthType.Cert);
    public errors: KnockoutObservableArray<string> = ko.observableArray([]);
    public id: KnockoutObservable<string> = ko.observable("");
    public subscriptionid: KnockoutObservable<string> = ko.observable("");
    public name: KnockoutObservable<string> = ko.observable("");
    public isUpdate: KnockoutObservable<boolean> = ko.observable(false);
    public isServicePrincipalEnabled: KnockoutObservable<boolean> = ko.observable(false);
    public disconnectService: boolean = false;
    public title: string = "";
    public authTemplate: () => string;
    public successCallBack: (id: string) => void;
    constructor(successCallBack: (id: string) => void) {
        this.successCallBack = successCallBack;
        this.authTemplate = () => {
            var templateName: string;
            if (this.authChoice() == AuthType.Cert) {
                templateName = "CertificateTemplate";
            }
            else if (this.authChoice() == AuthType.Credentials) {
                templateName = "CredentialTemplate";
            }

            return templateName;
        };
    }
}

// show with ControlsCommon.Dialog.show(AddLegacyDeploymentEnvironmentsDialog, model)
export class AddLegacyDeploymentEnvironmentsDialog extends Dialogs.ModalDialog {
    private _model: AddLegacyDeploymentEnvironmentsModel;
    private _$template: JQuery;
    private _valid: KnockoutObservable<boolean> = ko.observable(false);
    private _errorElement: JQuery;
    private _msgAllFieldsRequired = AdminResources.AllFieldsRequired;
    private _msgPasswordsMustMatch = AdminResources.PasswordsMustMatch;
    private _adminClient: AdminHttpClient.AdminHttpClient;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(model: AddLegacyDeploymentEnvironmentsModel) {
        super(model);
        this._model = model;
        this._tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection = new Service.VssConnection(this._tfsContext.contextData);
        this._adminClient = tfsConnection.getHttpClient<AdminHttpClient.AdminHttpClient>(AdminHttpClient.AdminHttpClient);
        var connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext);
        // Disabling Service Principal authentication for elgacy azure connections
        this._model.isServicePrincipalEnabled(false);

        // Subscribe to valid
        this._valid.subscribe((value: boolean) => {
            if (!value) {
                // Invalid
                this._errorElement.show();
            }
            else {
                // valid
                this._errorElement.hide();
                this._model.errors([]);
                this._performApiCall().then((service) => {
                    this.close();
                    if (this._model.successCallBack) {
                        this._model.successCallBack(service.connectedServiceName);
                    }
                }, (error) => { 
                    // Possibly duplicate errors, ignore? what about other errors?                                           
                    this._model.errors.push(error.message);
                    this._errorElement.show();
                });
            }
        });
    }

    private _performApiCall(): IPromise<AdminCommon.DeploymentEnvironmentMetadata> {
        var subscriptionName = this._model.name();
        var envData: AdminCommon.DeploymentEnvironmentApiData = {
            projectName: this._tfsContext.navigation.project,
            subscriptionId: this._model.subscriptionid(),
            deploymentName: subscriptionName,
            subscriptionName: subscriptionName,
            cert: "",
            username: "",
            password: "",
            disconnectSubscription: this._model.disconnectService
        };
        // Checkbox returns string hence avoid "==="
        if (this._model.authChoice() == AuthType.Cert) {
            envData.cert = this._element.find("#subscription-cert").val().trim();
        }
        else if (this._model.authChoice() == AuthType.Credentials) {
            envData.username = this._element.find("#username").val().trim();
            envData.password = this._element.find("#pwd").val().trim();
        }

        return this._adminClient.beginPutDeploymentEnvironment(envData);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 600,
            buttons: {
                "ok": {
                    id: "ok",
                    text: (options && options.okText) || VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick),
                    disabled: "disabled"
                },
                "close": {
                    id: "close",
                    text: (options && options.okText) || VSS_Resources_Platform.CloseButtonLabelText,
                    click: delegate(this, this.onCloseClick)
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this._$template = TFS_Knockout.loadHtmlTemplate(this._model.dialogTemplate);
        this._element.append(this._$template);
        ko.applyBindings(this._model, this._$template[0]);
        this.init();
        this.updateOkButton(true);
    }

    public init() {
        this._errorElement = this._element.find(".error-messages-div");
        this._errorElement.hide();
        // Hide error element on change
        this._element.find('input').focus(() => {
            this._errorElement.hide();
        });
        this._element.find('textarea').focus(() => {
            this._errorElement.hide();
        });
    }

    public getTitle(): string {
        var title = AdminResources.AddDeploymentEnvironmentsDialogTitle;
        if (this._model.title != "") {
            title = this._model.title;
        }
        return title;
    }

    private _checkEmpty(element: JQuery): boolean {
        return $.trim($(element).val()).length === 0;
    }

    private _preCheck() {
        var checkFailed = false;
        this._model.errors([]);
        // Input fields check
        this._element.find('input:visible').each((index: number, element: Element) => {
            if (this._checkEmpty($(element))) {
                checkFailed = true;
                return false; // Get out of "each" function
            }
        });
        // Based on Authentication mode
        if (!checkFailed && this._model.authChoice() == AuthType.Cert) {
            // TextArea
            checkFailed = this._checkEmpty(this._element.find('textarea'));
        }
        if (checkFailed) {
            this._model.errors.push(this._msgAllFieldsRequired);
        }
        // This order of "if" conditions is important! 
        if (this._model.authChoice() == AuthType.Credentials) {
            // password match check ( Inputs would have been already checked )
            if (this._element.find('#pwd').val() !== this._element.find('#pwd-check').val()) {
                checkFailed = true;
                this._model.errors.push(this._msgPasswordsMustMatch);
            }
        }

        if (!AdminCommon.isGuid(this._model.subscriptionid())) {
            checkFailed = true;
            this._model.errors.push(AdminResources.SubscriptionIdInvalid);
        }     
        // subscriber to _valid should always be called in this case
        if (!checkFailed) {
            this._valid.notifySubscribers(true);
        } else {
            this._valid.notifySubscribers(false);
        }
    }

    public onOkClick() {
        this._preCheck();
    }

    public onCloseClick() {
        this.close();
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.AzureLegacyDeploymentsManageDialog", exports);

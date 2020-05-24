/// <reference types="jquery" />

import ko = require("knockout");

import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import ConnectedService = require("Admin/Scripts/Generated/ConnectedService");
import ConnectedServiceHttpClient = require("Admin/Scripts/Generated/ConnectedServiceHttpClient");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

export enum AccessTokenType {
    GrantAuthorization = 0,
    UsernamePassword = 1
}

export class AddBitbucketConnectionsModel extends AddServiceEndpointModel {
    public tokenChoice: KnockoutObservable<AccessTokenType> = ko.observable(AccessTokenType.GrantAuthorization);
    public isHosted: KnockoutObservable<boolean> = ko.observable(false);
    public isAuthorizing: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationCompleted: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationSucceeded: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationCompletedText: KnockoutObservable<string> = ko.observable("");
    public authorizationScheme: string;

    constructor(successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallBack);
        this.isHosted(TFS_Host_TfsContext.TfsContext.getDefault().isHosted);
    }
}

// show with ControlsCommon.Dialog.show(AddBitbucketEndpointsDialog, model)
export class AddBitbucketEndpointsDialog extends AddServiceEndpointDialog {
    protected _model: AddBitbucketConnectionsModel;
    private _connectedServiceClient: ConnectedServiceHttpClient.ConnectedServiceHttpClient;
    private _authWindow: any;
    private _delayedFunction: Utils_Core.DelayedFunction;
    private _strongboxkey: string;

    constructor(model: AddBitbucketConnectionsModel) {
        super(model);
        this._model = model;
        this._connectedServiceClient = Service.getClient(ConnectedServiceHttpClient.ConnectedServiceHttpClient);
    }

    // Close auth window and stop checking for tokens or window closing
    private _cleanupAuthWindow() {
        if (this._authWindow) {
            try {
                this._authWindow.close();
                this._authWindow = null;
            } catch (e) {
                // ignore
            }
        }

        if (this._delayedFunction) {
            this._delayedFunction.cancel();
            delete this._delayedFunction;
        }
    }

    private _pollAuthWindow(): void {
        this._delayedFunction = Utils_Core.delay(this, 500, () => {
            this._delayedFunction.cancel();
            delete this._delayedFunction;

            try {
                if (!this._authWindow || this._authWindow.closed) {
                    this._model.isAuthorizing(false);
                    this._cleanupAuthWindow();
                } else {
                    if (this._authWindow.oauthcompleted) {
                        this._model.isAuthorizing(false);
                        this._model.authorizationCompleted(true);
                        if (this._authWindow.oautherrormessage) {
                            this._model.authorizationSucceeded(false);
                            this._model.authorizationCompletedText(Utils_String.format(AdminResources.BitbucketOauthAutherizationFailedFormat, this._authWindow.oautherrormessage));
                        }
                        if (this._authWindow.strongboxkey) {
                            this._model.authorizationSucceeded(true);
                            this._model.authorizationCompletedText(Utils_String.format(AdminResources.BitbucketOauthAutherizedFormat, this._authWindow.ownerlogin));
                            const $name = this._element.find("#connectionName");
                            if (!$name.val()) {
                                $name.val(this._authWindow.ownerlogin);
                            }
                            this._strongboxkey = this._authWindow.strongboxkey;
                        }
                        this._cleanupAuthWindow();
                    } else {
                        this._pollAuthWindow();
                    }
                }
            } catch (e) {
                this._pollAuthWindow();
            }
        });
    }

    public initialize(): void {
        super.initialize();

        if (!this._model.isHosted()) {
            this._model.tokenChoice(AccessTokenType.UsernamePassword);
        } else {
            if (this._model.isUpdate()) {
                if (this._model.isUpdate() && this._model.authorizationScheme == TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword) {
                    this._model.tokenChoice(AccessTokenType.UsernamePassword);
                } else {
                    this._model.authorizationCompleted(true);
                    this._model.authorizationSucceeded(true);
                    this._model.authorizationCompletedText(AdminResources.BitbucketOauthAlreadyAuthorized);
                }
            }
        }

        this.init();

        const that = this;
        const $button = this._element.find("#bitbucket-authorize-button");
        $button.click(function () {
            const projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
            that._connectedServiceClient.createAuthRequest(undefined, projectName, "bitbucket").then((authRequest: ConnectedService.AuthRequest) => {
                if (authRequest.errorMessage) {
                    alert(authRequest.errorMessage);
                } else {
                    that._model.isAuthorizing(true);
                    that._authWindow = window.open(authRequest.url, "", "width = 960, height = 600, location = true, menubar = false, toolbar = false");
                    that._pollAuthWindow();
                }
            });
        });

        this.updateOkButton(!this._model.isUpdate() || this._model.tokenChoice() == AccessTokenType.UsernamePassword);
    }

    public getTitle(): string {
        let title = AdminResources.AddBitbucketConnectionsDialogTitle;
        if (this._model.title !== "") {
            title = this._model.title;
        }
        return title;
    }

    // Perform validation prior to creating or updating the connection.
    protected preCheck(): boolean {

        // Clear the error state.
        let checkFailed = false;
        this._model.errors([]);

        // Verify the name is not empty
        const $name = this._element.find("#connectionName");
        if (this._checkEmpty($($name))) {
            this._model.errors.push(AdminResources.ConnectionNameIsRequired);
            checkFailed = true;
        }

        // Verify authorization was successful for a new Bitbucket OAUTH connection.
        if (this._model.tokenChoice() == AccessTokenType.GrantAuthorization) {
            if (!this._model.isUpdate() && !this._strongboxkey) {
                checkFailed = true;
                this._model.errors.push(AdminResources.AuthorizationNotSuccessful);
            }
        }

        // Verify username and password was specified for a new Bitbucket connection
        if (this._model.tokenChoice() == AccessTokenType.UsernamePassword) {
            const $username = this._element.find("#username");
            if (this._checkEmpty($($username))) {
                checkFailed = true;
                this._model.errors.push(AdminResources.BitbucketUsernameIsRequired);
            }

            // Only require password when creating a connection.  If blank, it will
            // be unchanged during update.
            if (!this._model.isUpdate()) {
                const $password = this._element.find("#pwd");
                if (this._checkEmpty($($password))) {
                    checkFailed = true;
                    this._model.errors.push(AdminResources.BitbucketPasswordIsRequired);
                }
            }
        }

        return checkFailed;
    }

    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        let connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }

        // Default username/accesstoken to null so that if we don't set it, it is ignored
        // when updating the endpoint's details
        let username: string = null;
        let accessToken: string = null;
        let scheme: string = null;
        if (this._strongboxkey) {
            username = "";
            accessToken = this._strongboxkey;
            scheme = TFS_Admin_Common.EndpointAuthorizationSchemes.OAuth;
        } else {
            const accessTokenInputValue = this._element.find("#pwd").val().trim();
            if (accessTokenInputValue.length > 0) {
                accessToken = accessTokenInputValue;
            }

            username = this._element.find("#username").val().trim();
            scheme = TFS_Admin_Common.EndpointAuthorizationSchemes.UsernamePassword;
        }

        const apiData: AdminCommon.IServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url: "https://api.bitbucket.org/",
            username: username,
            passwordKey: accessToken,
            type: TFS_Admin_Common.ServiceEndpointType.Bitbucket,
            scheme: scheme
        };

        const serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData);
        return serviceEndpointDetails;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.BitbucketEndpointsManageDialog", exports);

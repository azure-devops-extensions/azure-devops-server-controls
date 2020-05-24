/// <reference types="jquery" />

import ko = require("knockout");

import VSS = require("VSS/VSS");
import VSS_Combos = require("VSS/Controls/Combos");
import VSS_Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Contracts = require("TFS/DistributedTask/Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminCommon = require("Admin/Scripts/TFS.Admin.Common");
import ConnectedService = require("Admin/Scripts/Generated/ConnectedService");
import ConnectedServiceHttpClient = require("Admin/Scripts/Generated/ConnectedServiceHttpClient");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import { AddServiceEndpointModel, AddServiceEndpointDialog } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Controls";
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import { Installation } from "TFS/Admin/Scripts/Generated/ConnectedService";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export enum AccessTokenType {
    GrantAuthorization = 0,
    PersonalAccessToken = 1,
    InstallationToken = 2
}

export enum AuthenticateAs {
    MarketplaceApp = 0,
    User = 1
}

export class AddGitHubConnectionsModel extends AddServiceEndpointModel {
    public authAsChoice: KnockoutObservable<AuthenticateAs> = ko.observable(AuthenticateAs.User);
    public tokenChoice: KnockoutObservable<AccessTokenType> = ko.observable(AccessTokenType.GrantAuthorization);
    public isHosted: KnockoutObservable<boolean> = ko.observable(false);
    public isAuthorizing: KnockoutObservable<boolean> = ko.observable(false);
    public disableUpdateTokenBasedEndpoint: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationCompleted: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationSucceeded: KnockoutObservable<boolean> = ko.observable(false);
    public authorizationCompletedText: KnockoutObservable<string> = ko.observable("");
    public authorizationScheme: string;
    public selectedOrg: KnockoutObservable<Installation> = ko.observable();
    public appInstallations: KnockoutObservableArray<Installation> = ko.observableArray<Installation>([]);
    public appInstallationsLoaded: KnockoutObservable<boolean> = ko.observable(false);
    public userAvatarUrl: KnockoutObservable<string> = ko.observable("");

    public marketAppFeatureEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled("Build2.GitHubMarketplaceApp", false);

    constructor(successCallBack: (serviceEndpoint: ServiceEndpointContracts.ServiceEndpoint) => void) {
        super(successCallBack);
        this.isHosted(TFS_Host_TfsContext.TfsContext.getDefault().isHosted);
    }
}

// show with ControlsCommon.Dialog.show(AddGitHubEndpointsDialog, model)
export class AddGitHubEndpointsDialog extends AddServiceEndpointDialog {
    protected _model: AddGitHubConnectionsModel;
    private _connectedServiceClient: ConnectedServiceHttpClient.ConnectedServiceHttpClient;
    private _authWindow: any;
    private _delayedFunction: Utils_Core.DelayedFunction;
    private _strongboxkey: string;
    private _orgDropDown: VSS_Combos.Combo;
    private _authChoiceDropDown: VSS_Combos.Combo;
    private _authenticationChoices = [
        AdminResources.GitHubGrantAuthorizationLabel,
        AdminResources.GitHubPersonalAccessTokenLabel
    ];


    constructor(model: AddGitHubConnectionsModel) {
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

    private _pollAuthWindow(onAuthCompleteCallback?: () => void): void {
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
                            this._model.authorizationCompletedText(Utils_String.format(AdminResources.GitHubOauthAutherizationFailedFormat, this._authWindow.oautherrormessage));
                        }
                        if (this._authWindow.strongboxkey) {
                            this._model.authorizationSucceeded(true);
                            this._model.authorizationCompletedText(Utils_String.format(AdminResources.GitHubOauthAutherizedFormat, this._authWindow.ownerlogin));

                            this._strongboxkey = this._authWindow.strongboxkey;

                            if (onAuthCompleteCallback) {
                                onAuthCompleteCallback();
                            }
                        }
                        this._cleanupAuthWindow();
                    } else {
                        this._pollAuthWindow(onAuthCompleteCallback);
                    }
                }
            } catch (e) {
                this._pollAuthWindow(onAuthCompleteCallback);
            }
        });
    }

    public initialize(): void {
        super.initialize();

        // org select dropdown for GitHub Marketplace app
        const orgSelectorElement = this.getElement().find(".select-org-dropdown");
        const orgEnhancementOptions = <VSS_Controls.EnhancementOptions>{
            ariaAttributes: {
                label: "SelectOrganization"
            }
        };

        this._orgDropDown = <VSS_Combos.Combo>VSS_Controls.BaseControl.create(VSS_Combos.Combo, orgSelectorElement, $.extend({
            allowEdit: false,
            change: () => {
                const idx = this._orgDropDown.getSelectedIndex();
                if (idx >= 0) {
                    this._model.selectedOrg(this._model.appInstallations()[idx]);
                }
            },
            maxAutoExpandDropWidth: orgSelectorElement.width()
        }, orgEnhancementOptions));

        // authentication choice select dropdown for authenticate as user
        const authChoiceSelectorElement = this.getElement().find(".select-auth-choice-dropdown");
        const authChoiceEnhancementOptions = <VSS_Controls.EnhancementOptions>{
            ariaAttributes: {
                label: "SelectAuthenticateChoice"
            }
        };

        this._authChoiceDropDown = <VSS_Combos.Combo>VSS_Controls.BaseControl.create(VSS_Combos.Combo, authChoiceSelectorElement, $.extend({
            allowEdit: false,
            change: () => {
                const idx = this._authChoiceDropDown.getSelectedIndex();
                if (idx === 0) {
                    this._model.tokenChoice(AccessTokenType.GrantAuthorization);
                } else if (idx === 1) {
                    this._model.tokenChoice(AccessTokenType.PersonalAccessToken);
                }
            },
            maxAutoExpandDropWidth: authChoiceSelectorElement.width()
        }, authChoiceEnhancementOptions));
        this._authChoiceDropDown.setSource(this._authenticationChoices);
        this._authChoiceDropDown.setSelectedIndex(0);

        const installGitHubAppHelpElement = this.getElement().find("#install-app-help-text");
        installGitHubAppHelpElement.html(AdminResources.GitHubOrganizationNotInListHelp);

        this.init();

        if (!this._model.isHosted()) {
            this._model.tokenChoice(AccessTokenType.PersonalAccessToken);
            this._authChoiceDropDown.setSelectedIndex(1);
        } else {
            if (this._model.isUpdate()) {
                if (this._model.authorizationScheme === TFS_Admin_Common.EndpointAuthorizationSchemes.PersonalAccessToken) {
                    this._model.tokenChoice(AccessTokenType.PersonalAccessToken);
                    this._authChoiceDropDown.setSelectedIndex(1);
                } else if (this._model.authorizationScheme === TFS_Admin_Common.EndpointAuthorizationSchemes.Token) {
                    this._model.tokenChoice(AccessTokenType.InstallationToken);
                    this._model.authAsChoice(AuthenticateAs.MarketplaceApp);
                    // can't update any endpoint with installation tokens
                    this._model.disableUpdateTokenBasedEndpoint(true);
                } else {
                    this._model.authorizationCompleted(false);
                    this._model.authorizationSucceeded(false);
                }
            }
        }

        const that = this;

        const projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        const authenticate = (afterAuthCallback?: () => void) => {
            that._authWindow = window.open("", "", "width = 960, height = 600, location = true, menubar = false, toolbar = false");
            that._connectedServiceClient.createAuthRequest(undefined, projectName, "github").then((authRequest: ConnectedService.AuthRequest) => {
                if (authRequest.errorMessage) {
                    alert(authRequest.errorMessage);
                } else {
                    that._model.isAuthorizing(true);
                    that._authWindow.location.href = authRequest.url;
                    that._pollAuthWindow(afterAuthCallback);
                }
            });
        };

        const loadAppInstallations = (strongBoxKey: string) => {
            that._connectedServiceClient.getAppInstallations(projectName, "github", strongBoxKey).then((installations: ConnectedService.Installation[]) => {
                if (installations && installations.length > 0) {
                    that._model.appInstallations(installations);
                    that._orgDropDown.setSource(installations.map(i => i.name));
                    that._orgDropDown.setSelectedIndex(0);
                    that._model.selectedOrg(installations[0]);
                    const $name = that._element.find("#connectionName");
                    $name.val(Utils_String.format(AdminResources.GitHubOrganizationFormat, installations[0].name));
                }
                that._model.appInstallationsLoaded(true);
            });
        }

        const $button = this._element.find("#github-authorize-button");
        $button.click(() => authenticate(() => {
            const $name = that._element.find("#connectionName");
            if (!$name.val()) {
                $name.val(that._authWindow.ownerlogin);
            }

            if (that._authWindow.owneravatarurl && that._authWindow.owneravatarurl != "Unknown") {
               that._model.userAvatarUrl(this._authWindow.owneravatarurl);
            }
        }));

        const $loadInstallationButton = this._element.find("#github-load-installation-button");
        $loadInstallationButton.click(() => {
            if (that._strongboxkey) {
                // user has already authenticated as a user, no need to make oauth call again
                loadAppInstallations(that._strongboxkey);
            } else {
                authenticate(() => loadAppInstallations(that._authWindow.strongboxkey));
            }
        });

        this.updateOkButton(true);
    }

    public getTitle(): string {
        let title = AdminResources.AddGitHubConnectionsDialogTitle;
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

        // don't change to triple === as indicated by linter.  It is wrong!
        if (this._model.authAsChoice() == AuthenticateAs.User) {
            // Verify authorization was successful for a new GitHub OAUTH connection.
            if (this._model.tokenChoice() == AccessTokenType.GrantAuthorization) {
                if (!this._strongboxkey) {
                    checkFailed = true;
                    this._model.errors.push(AdminResources.AuthorizationNotSuccessful);
                }
            }

            // Verify access token was specified for a new or edited GitHub PAT
            if (this._model.tokenChoice() == AccessTokenType.PersonalAccessToken && !this._model.isUpdate()) {
                const $token = this._element.find("#accessToken");
                if (this._checkEmpty($($token))) {
                    checkFailed = true;
                    this._model.errors.push(AdminResources.GitHubPatIsRequired);
                }
            }

            if (this._model.tokenChoice() == AccessTokenType.InstallationToken) {
                checkFailed = true;
                this._model.errors.push(AdminResources.GitHubLaunchServiceEndpointUnmodifiable);
            }
        } else {
            // authenticated as app
            if (!this._model.selectedOrg()) {
                checkFailed = true;
                this._model.errors.push(AdminResources.GitHubNoOrganizationSelected);
            }
        }

        return checkFailed;
    }

    protected getServiceEndpointDetails(): AdminCommon.ServiceEndpointDetails {
        let connectionIdTemp = this._element.find("#connectionId").val();
        if (!connectionIdTemp) {
            connectionIdTemp = TFS_Core_Utils.GUIDUtils.newGuid();
        }

        let scheme: string = null;
        let accessToken: string = null;
        let params: { [key: string]: string; } = null;
        let authorizationInfo: Contracts.EndpointAuthorization = null;
        if (this._model.authAsChoice() == AuthenticateAs.User) {
            // Default accessToken to null so that if we don't set it, it is ignored
            // when updating the endpoint's details
            if (this._model.tokenChoice() == AccessTokenType.GrantAuthorization) {
                accessToken = this._strongboxkey;
                scheme = TFS_Admin_Common.EndpointAuthorizationSchemes.OAuth;
            } else {
                const accessTokenInputValue = this._element.find("#accessToken").val().trim();
                if (accessTokenInputValue.length > 0) {
                    accessToken = accessTokenInputValue;
                }
                scheme = TFS_Admin_Common.EndpointAuthorizationSchemes.PersonalAccessToken;
            }
            if (this._model.userAvatarUrl() != "") {
                params = {
                    AvatarUrl: this._model.userAvatarUrl()
                };
            }
        } else {
            // Authenticated as app, create an service endpoint with installation token
            const installation: Installation = this._model.selectedOrg();
            scheme = TFS_Admin_Common.EndpointAuthorizationSchemes.Token;
            params = {
                IdToken: installation.installationId,
                IdSignature: installation.signature,
                AvatarUrl: installation.imageUrl
            };
            authorizationInfo = {
                parameters: params,
                scheme: scheme
            };
        }

        const apiData: AdminCommon.IServiceEndpointApiData = {
            endpointId: connectionIdTemp,
            endpointName: this._element.find("#connectionName").val().trim(),
            url: "http://github.com",
            username: "",
            passwordKey: accessToken,
            type: TFS_Admin_Common.ServiceEndpointType.GitHub,
            scheme: scheme,
            parameters: params
        };

        const serviceEndpointDetails = new TFS_Admin_Common.ServiceEndpointDetails(apiData, authorizationInfo);
        return serviceEndpointDetails;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls.GitHubEndpointsManageDialog", exports);

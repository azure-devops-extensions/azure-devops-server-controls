/// <reference types="jquery" />

import Q = require("q");

import Context = require("VSS/Context");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import { IPromise } from "q";

export interface IVstsAadAuthorizer {
    authorize(tenantId: string, redirectUri: string, aadLoginPromptOption: DistributedTaskContracts.AadLoginPromptOption, completeCallbackPayload: string, completeCallbackByAuthCode: boolean, aadOAuthLoginUrl?: string): IPromise<string>;
}

export class VstsAadAuthorizer extends Service.VssService implements IVstsAadAuthorizer {
    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._distributedTaskClient = tfsConnection.getService<DistributedTaskModels.ConnectedServicesClientService>(DistributedTaskModels.ConnectedServicesClientService);
    }

    public authorize(tenantId: string, redirectUri: string, aadLoginPromptOption: DistributedTaskContracts.AadLoginPromptOption, completeCallbackPayload: string = Utils_String.empty, completeCallbackByAuthCode: boolean = false, aadOAuthLoginUrl?: string): IPromise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();

        this._getAadOAuthLoginUrl(tenantId, redirectUri, aadLoginPromptOption, completeCallbackPayload, completeCallbackByAuthCode, aadOAuthLoginUrl).then((oAuthUrl: any) => {
            oAuthUrl = oAuthUrl.value || oAuthUrl;
            this.authWindow = window.open(oAuthUrl, "", 'width = 960, height = 600, location = true, menubar = false, toolbar = false');

            if (completeCallbackPayload === Utils_String.empty) {
                this._pollAuthWindow().then((accessTokenKey: string) => {
                    deferred.resolve(accessTokenKey);
                }, (error) => {
                    deferred.reject(error);
                });
            }
            else {
                deferred.resolve(Utils_String.empty);
            }

        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }
    
    private _pollAuthWindow(): IPromise<string> {
        var defer = Q.defer<string>();

        this._monitorAuthProgress = new Utils_Core.DelayedFunction(this, 1000, "monitorAuthProgress", () => {
            try {
                if (!this.authWindow) {
                    defer.reject(Resources.CouldNotAuthenticateAAD);
                    this._cleanupAuthWindow();
                } else if (this.authWindow.closed) {
                    defer.reject(''); // not showing any message as closing window is not an error condition
                    this._cleanupAuthWindow();
                } else {
                    try {
                        if (this.authWindow.vstsaadoauthcompleted) {
                            if (this.authWindow.vstsaadoautherrormessage) {
                                defer.reject(this.authWindow.vstsaadoautherrormessage);
                            } else if (this.authWindow.vstsaadoauthaccesstokenkey) {
                                defer.resolve(this.authWindow.vstsaadoauthaccesstokenkey);
                            } else {
                                defer.reject(Resources.SpnAuthorizationFailedError);
                            }

                            this._cleanupAuthWindow();

                        } else {
                            this._monitorAuthProgress.reset();
                        }
                    } catch (e1) {
                        this._monitorAuthProgress.reset();
                    }
                }
            } catch (e) {
                defer.reject(e);
                this._cleanupAuthWindow();
            }
        });

        this._monitorAuthProgress.start();
        return defer.promise;
    }

    private _cleanupAuthWindow(): void {

        if (this.authWindow) {
            try {
                this.authWindow.close();
                this.authWindow = null;
            } catch (e) { }
        }

        if (this._monitorAuthProgress) {
            this._monitorAuthProgress.cancel();
            delete this._monitorAuthProgress;
        }
    }

    private _getAadOAuthLoginUrl(tenantId: string, redirectUri: string, aadLoginPromptOption: DistributedTaskContracts.AadLoginPromptOption, completeCallbackPayload: string = Utils_String.empty, completeCallbackByAuthCode: boolean = false, aadOAuthLoginUrl?: string): IPromise<string> {
        // if the OAuth login URL is provided we return the value as it is, else we query the service to get the login URL
        if (!!aadOAuthLoginUrl) {
            return Q.resolve(aadOAuthLoginUrl);
        }
        else {
            return this._distributedTaskClient.beginCreateOAuthRequest(tenantId, redirectUri, aadLoginPromptOption, completeCallbackPayload, completeCallbackByAuthCode);
        }
    }

    private _distributedTaskClient: DistributedTaskModels.ConnectedServicesClientService;
    private _monitorAuthProgress: Utils_Core.DelayedFunction = null;

    public authWindow: any;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("AzureAuthenticationHelper", exports);

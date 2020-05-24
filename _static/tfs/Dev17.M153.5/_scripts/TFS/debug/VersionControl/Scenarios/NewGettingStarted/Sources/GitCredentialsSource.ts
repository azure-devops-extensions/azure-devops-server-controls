import * as Q from "q";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as TFS_Core_Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import * as SecurityModels from "Account/Scripts/TFS.Details.Security.Common.Models";
import * as AccountResources from "Account/Scripts/Resources/TFS.Resources.Account";
import * as ProfileModels from "Account/Scripts/TFS.Details.Profile.Common.Models";
import {
    PatTokenDataPayload,
    AlternateCredentialsDataPayload,
} from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

/**
 * The Default lifetime of created Personal Access Tokens.
 */
const DEFAULT_ACCOUNT_TOKEN_EXPIRATION_DAYS: string = "365";

export class GitCredentialsSource {
    constructor(
        private _patTokensRootUrl: string,
        private _patUsername: string,
        private _collectionUri: string,
        private _collectionId: string,
    ) { }

    /**
     * This gets current alternate credentials model to initialize git credentials control
     */
    public getAlternateCredentialsData(): IPromise<AlternateCredentialsDataPayload> {
        const deferred = Q.defer<AlternateCredentialsDataPayload>();
        const altCredsDetailsUrl = Utils_String.format(
            "{0}{1}",
            this._collectionUri,
            "_details/security/altcreds/list");

        //Query the server for the current alternate credentials model.
        TFS_Core_Ajax.getMSJSON(
            altCredsDetailsUrl,
            null, // takes no input params
            (serverAlternateCredentialsModel: SecurityModels.AlternateCredentialsModel) => this._resolveAlternateCredentialsDataRequest(
                serverAlternateCredentialsModel,
                deferred
            ),
            (error: Error) => this._rejectAlternateCredentialsDataRequest(error, deferred));

        return deferred.promise;
    }

    /*
     * Logic to create a personal access token.
     */
    public getPatTokenData(): IPromise<PatTokenDataPayload> {
        const deferred = Q.defer<PatTokenDataPayload>();

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.CREATE_PAT,
            {})
        );

        const currentPatModel = this._getCurrentPatModel();

        //Make a server call to the tokens endpoint to create the PAT.
        TFS_Core_Ajax.postMSJSON(
            Utils_String.format("{0}/{1}", this._patTokensRootUrl, "Edit"),
            currentPatModel,
            (data: SecurityModels.PersonalAccessTokenDetailsModel) => this._resolvePatTokenDataRequest(data, deferred),
            (error: Error) => this._rejectPatTokenDataRequest(error, deferred)
        );

        return deferred.promise;
    }

    /*
     * This gets called on the alternate-credentials form-like view when the save button is activated.
     * It compiles the current changes to the alternate credentials model and makes a server call to update
     * the server version of the model.
     */
    public saveAlternateCredentialsChanges(dataToPass: SecurityModels.AlternateCredentialsModel): IPromise<void> {
        const deferred = Q.defer<void>();

        const UpdateConfigurationUrl = Utils_String.format(
            "{0}{1}",
            this._collectionUri,
            "_details/security/altcreds/UpdateConfiguration")

        TFS_Core_Ajax.postHTML(
            UpdateConfigurationUrl,
            {
                updatePackage: Core.stringifyMSJSON(dataToPass)
            },
            () => {
                deferred.resolve(undefined);
            },
            (error: Error) => this._rejectSaveAlternateCredentialsChangeRequest(error, deferred),
            null
        );

        return deferred.promise;
    }

    private _resolveAlternateCredentialsDataRequest = (
        serverAlternateCredentialsModel: SecurityModels.AlternateCredentialsModel,
        deferred: Q.Deferred<AlternateCredentialsDataPayload>,
    ): void => {
        //Get the value of the "WebAccess.VersionControl.DisableAlternateAuthInGitGettingStarted" 
        //to see whether creating alternate credentials is enabled.
        const disableAlternateCredentialsFlag = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlDisableAlternateAuthInGitGettingStarted,
            false
        );

        const alternateCredentialsData: AlternateCredentialsDataPayload = {
            basicAuthDisabledOnAccount:
            serverAlternateCredentialsModel.BasicAuthenticationDisabledOnAccount || disableAlternateCredentialsFlag,
            basicAuthHasPassword: serverAlternateCredentialsModel.BasicAuthenticationHasPassword,
            primaryUsername: serverAlternateCredentialsModel.PrimaryUsername,
            alias: serverAlternateCredentialsModel.BasicAuthenticationUsername,
        };

        deferred.resolve(alternateCredentialsData);
    }

    private _rejectAlternateCredentialsDataRequest = (error: Error, deferred: Q.Deferred<AlternateCredentialsDataPayload>): void => {
        let errorMessage: string;
        if (error && error.message) {
            errorMessage = Utils_String.htmlDecode(error.message);
        } else {
            errorMessage = VCResources.FailedToCreateGitCredentials;
        }

        deferred.reject(new Error(errorMessage));
    }

    private _resolvePatTokenDataRequest = (
        data: SecurityModels.PersonalAccessTokenDetailsModel,
        deferred: Q.Deferred<PatTokenDataPayload>,
    ): void => {
        if (data) {
            deferred.resolve({
                patUsername: this._patUsername,
                patPassword: data.Token,
            });
        } else {
            //If data is null we resolve undefined. It'll take the user to patTokensRootUrl.
            deferred.resolve(undefined);
        }
    }

    private _rejectPatTokenDataRequest = (error: Error, deferred: Q.Deferred<PatTokenDataPayload>): void => {
        let errorMessage: string;
        if (error && error.message) {
            errorMessage = Utils_String.htmlDecode(error.message);
        } else {
            errorMessage = AccountResources.TokenGenerationFailed;
        }

        deferred.reject(new Error(errorMessage));
    }

    private _rejectSaveAlternateCredentialsChangeRequest = (error: Error, deferred: Q.Deferred<void>): void => {
        let errorMessage: string;
        if (error && error.message) {
            errorMessage = Utils_String.htmlDecode(error.message);
        } else {
            errorMessage = AccountResources.AltCredsFailedSave;
        }

        deferred.reject(new Error(errorMessage));
    }

    private _getCurrentPatModel(): SecurityModels.EditTokenData {
        const data = new SecurityModels.EditTokenData();

        // Description
        data.Description = Utils_String.format(VCResources.GitPersonalAccessTokenFormat, this._collectionUri);

        // Expiration Date
        data.SelectedExpiration = DEFAULT_ACCOUNT_TOKEN_EXPIRATION_DAYS;

        // Create the token for this specific account.
        data.AccountMode = "SelectedAccounts";
        data.SelectedAccounts = this._collectionId;

        // Scopes
        data.ScopeMode = "SelectedScopes";
        data.SelectedScopes = "vso.code_write";

        // Antiforgery Token
        data.__RequestVerificationToken = $("input[name=__RequestVerificationToken]").val();

        // Id for edit/create
        data.AuthorizationId = Utils_String.empty;

        return data;
    }
}
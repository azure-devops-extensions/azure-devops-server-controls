import * as Utils_String from "VSS/Utils/String";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as ProfileModels from "Account/Scripts/TFS.Details.Profile.Common.Models";
import * as AlternateCredentialsForm from "Account/Scripts/TFS.Details.Security.AltCredentials.Controls";
import { StoresHub } from "VersionControl/Scenarios/NewGettingStarted/Stores/StoresHub";
import {
    ActionsHub,
    AlternateCredentialsDataPayload,
    PatTokenDataPayload,
    AliasUpdatePayload,
    PasswordUpdatePayload,
    ConfirmPasswordUpdatePayload,
} from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";
import { GitCredentialsSource } from "VersionControl/Scenarios/NewGettingStarted/Sources/GitCredentialsSource";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");

export class GitCredentialsActionsCreator {
    private _delayAnnounceHelper: DelayAnnounceHelper;

    constructor(
        private _actionsHub: ActionsHub,
        private _gitCredentialsSource: GitCredentialsSource,
        private _storesHub: StoresHub
    ) {
        this._delayAnnounceHelper = new DelayAnnounceHelper();
    }

    public updateAlias = (alias: string): void => {
        const aliasUpdatePayload: AliasUpdatePayload = {
            alias: alias,
            isAliasInvalid: this._isAliasError(alias)
        };

        this._actionsHub.alternateCredentialsAliasUpdated.trigger(aliasUpdatePayload);
        this._enableSaveGitCredentialsIfReady();
    }

    public updatePassword = (password: string): void => {
        const passwordUpdatePayload: PasswordUpdatePayload = {
            password: password,
            isPasswordInvalid: this._isPasswordError(password)
        };

        this._actionsHub.alternateCredentialsPasswordUpdated.trigger(passwordUpdatePayload);

        if (this._storesHub.getAggregatedState().gitCredentialsState.startValidatingConfirmPassword) {
            // Updating confirm password with current value in the store to trigger validation and show error message if any
            this.updateConfirmPassword(this._storesHub.getAggregatedState().gitCredentialsState.confirmPassword);
        }

        this._enableSaveGitCredentialsIfReady();
    }

    public updateConfirmPassword = (confirmPassword: string): void => {
        const confirmPasswordPayload: ConfirmPasswordUpdatePayload = {
            confirmPassword: confirmPassword,
            isConfirmPasswordInvalid: this._isConfirmPasswordError(confirmPassword),
        };

        this._actionsHub.alternateCredentialsConfirmPasswordUpdated.trigger(confirmPasswordPayload);
        this._enableSaveGitCredentialsIfReady();
    }

    public passwordEditingStarted = (): void => {
        if (!this._storesHub.getAggregatedState().gitCredentialsState.isAnyPasswordFieldEdited
            && this._storesHub.getAggregatedState().gitCredentialsState.isBasicAuthSet) {
            this._actionsHub.alternateCredentialsPasswordFieldsCleared.trigger(undefined);
            this._enableSaveGitCredentialsIfReady();
        }
    }

    public aliasEditingFinished = (): void => {
        this._actionsHub.alternateCredentialsAliasValidationStarted.trigger(undefined);
    }

    public passwordEditingFinished = (): void => {
        if (!this._storesHub.getAggregatedState().gitCredentialsState.isAnyPasswordFieldEdited
            && this._storesHub.getAggregatedState().gitCredentialsState.isBasicAuthSet) {
            this._actionsHub.alternateCredentialsPasswordFieldsReset.trigger(undefined);
            this._enableSaveGitCredentialsIfReady();
        } else {
            this._actionsHub.alternateCredentialsPasswordValidationStarted.trigger(undefined);
            // Updating password with current value in the store to trigger validation and show error message if any
            this.updatePassword(this._storesHub.getAggregatedState().gitCredentialsState.password);
        }
    }

    public confirmPasswordEditingFinished = (): void => {
        if (!this._storesHub.getAggregatedState().gitCredentialsState.isAnyPasswordFieldEdited
            && this._storesHub.getAggregatedState().gitCredentialsState.isBasicAuthSet) {
            this._actionsHub.alternateCredentialsPasswordFieldsReset.trigger(undefined);
            this._enableSaveGitCredentialsIfReady();
        } else {
            this._actionsHub.alternateCredentialsConfirmPasswordValidationStarted.trigger(undefined);
            // Updating confirm password with current value in the store to trigger validation and show error message if any
            this.updateConfirmPassword(this._storesHub.getAggregatedState().gitCredentialsState.confirmPassword);
        }
    }

    public saveAlternateCredentialsData = (): void => {
        this._actionsHub.waitingOnServerStarted.trigger(null);
        const dataToPass = new SecurityModels.AlternateCredentialsModel();
        const gitCredentialsState = this._storesHub.getAggregatedState().gitCredentialsState;
        const isPasswordEdited = gitCredentialsState.isAnyPasswordFieldEdited;

        dataToPass.BasicAuthenticationDisabled = false;

        if (isPasswordEdited) {
            dataToPass.BasicAuthenticationPassword = gitCredentialsState.password;
        } else {
            dataToPass.BasicAuthenticationPassword = null;
        }

        if (gitCredentialsState.alias && gitCredentialsState.alias.length > 0) {
            dataToPass.BasicAuthenticationUsername = gitCredentialsState.alias;
        } else {
            dataToPass.BasicAuthenticationUsername = null;
        }

        this._delayAnnounceHelper.startAnnounce(VCResources.CreatingGitCredentials);

        dataToPass.__RequestVerificationToken = $("input[name=__RequestVerificationToken]").val();
        this._gitCredentialsSource.saveAlternateCredentialsChanges(dataToPass).then(() => {
            //Reset the initial values of the alias, password and password confirmation to reset the form UI.
            //Moreover, mark save git credentials action completed and show success message callout.
            this._actionsHub.alternateCredentialsSaved.trigger(gitCredentialsState.alias);
            this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.SuccessfullyCreatedGitCredentials);
        }, (error: Error) => {
            this._actionsHub.gitCredentialsErrorOccurred.trigger(error.message);
            this._delayAnnounceHelper.stopAndCancelAnnounce(error.message, true);
        });
    }

    public initializeAlternateCredentialsData = (): void => {
        const aggregatedState = this._storesHub.getAggregatedState();
        const showGitCredentialsSection = aggregatedState.mainState.isHosted
            && !aggregatedState.gitCredentialsState.isUserAnonymous
            && !aggregatedState.gitCredentialsState.isUserPublic;

        if (showGitCredentialsSection) {
            this._gitCredentialsSource.getAlternateCredentialsData().then((payload: AlternateCredentialsDataPayload) => {
                this._actionsHub.alternateCredentialsDataUpdated.trigger(payload);
            }, (error: Error) => {
                this._actionsHub.gitCredentialsErrorOccurred.trigger(error.message);
            });
        }
    }

    public generateGitCredentialsButtonClicked = (): void => {
        if (this._storesHub.getAggregatedState().gitCredentialsState.isBasicAuthEnabled) {
            this._publishAlternateCredentialsTelemetry();
        } else {
            this._initializePatTokenData();
        }

        this._actionsHub.generateGitCredentialsButtonClicked.trigger(undefined);
    }

    public removeGenerateGitCredentialsError = (): void => {
        this._actionsHub.gitCredentialsErrorRemoved.trigger(undefined);
    }

    /*
    * This publishes telemetry when alternate credentials are enabled on account.
    */
    private _publishAlternateCredentialsTelemetry = (): void => {
        //If basicAuth is not disabled on this account, publish telemetry and 
        //show Alternate credentials form so that user can see and edit his alternate creds.
        VSS_Telemetry.publishEvent(
            new VSS_Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.CREATE_ALTERNATE_CREDS, {})
        );
    }

    /**
     * This gets called when alternate credentials are disabled on account and creates a personal access token.
     */
    private _initializePatTokenData = (): void => {
        this._actionsHub.waitingOnServerStarted.trigger(null);

        this._gitCredentialsSource.getPatTokenData().then((payload: PatTokenDataPayload) => {
            if (payload == null) {
                window.location.replace(this._storesHub.getAggregatedState().gitCredentialsState.patTokensRootUrl);
            } else {
                this._actionsHub.patTokenDataUpdated.trigger(payload);
            }
        }, (error: Error) => {
            this._actionsHub.gitCredentialsErrorOccurred.trigger(error.message);
        });
    }

    private _enableSaveGitCredentialsIfReady = (): void => {
        const gitCredentialsState = this._storesHub.getAggregatedState().gitCredentialsState;

        if ((gitCredentialsState.alias === gitCredentialsState.serverAlias
            && !gitCredentialsState.isAnyPasswordFieldEdited) //If none of the form fields have changed.
            || this._isAliasError(gitCredentialsState.alias) // Or there's a validation error on any of them.
            || this._isPasswordError(gitCredentialsState.password)
            || this._isConfirmPasswordError(gitCredentialsState.confirmPassword)
            || gitCredentialsState.waitingOnServer) {
            this._actionsHub.saveAlternateCredentialsDisabled.trigger(null);
        }
        else {
            this._actionsHub.saveAlternateCredentialsEnabled.trigger(null);
        }
    }

    private _isAliasError(alias: string): boolean {
        if (alias !== Utils_String.empty && !/^[A-Za-z0-9]+$/.test(alias)) {
            return true;
        }

        return false;
    }

    private _isPasswordError(password: string): boolean {
        if (!password || (this._storesHub.getAggregatedState().gitCredentialsState.isAnyPasswordFieldEdited
            && !this._checkPasswordStrength(password))) {
            return true;
        }

        return false;
    }

    private _checkPasswordStrength(password: string): boolean {
        return AlternateCredentialsForm.AlternateCredentialsForm._checkPasswordStrength(password);
    }

    private _isConfirmPasswordError(confirmPassword: string): boolean {
        if (this._storesHub.getAggregatedState().gitCredentialsState.password !== confirmPassword) {
            return true;
        }

        return false;
    }
}

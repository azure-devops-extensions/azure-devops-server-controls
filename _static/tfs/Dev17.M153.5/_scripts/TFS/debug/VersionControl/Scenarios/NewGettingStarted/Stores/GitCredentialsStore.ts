import * as VSSStore from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import * as AccountResources from "Account/Scripts/Resources/TFS.Resources.Account";
import * as ActionsHub from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface GitCredentialsState {
    // States for Inline Git Credentials Section
    isUserAnonymous: boolean;
    isUserPublic: boolean;
    isBasicAuthEnabled: boolean;
    errorMessage: string;
    waitingOnServer: boolean;
    patTokensRootUrl: string;
    isGenerateGitCredentialsButtonClicked: boolean;
    // States for Alternate Credentials Component
    primaryUsername: string;
    isBasicAuthSet: boolean;
    serverAlias: string;
    alias: string;
    password: string;
    confirmPassword: string;
    isAnyPasswordFieldEdited: boolean;
    arePasswordFieldsJustClearedOrReset: boolean;
    startValidatingAlias: boolean;
    startValidatingPassword: boolean;
    startValidatingConfirmPassword: boolean;
    isAliasInvalid: boolean;
    isPasswordInvalid: boolean;
    isConfirmPasswordInvalid: boolean;
    aliasErrorMessage: string;
    passwordErrorMessage: string;
    confirmPasswordErrorMessage: string;
    isSaveButtonDisabled: boolean;
    isAlternateCredentialsSavedSuccessfully: boolean;
    // States for PAT token Component
    patUsername: string;
    patPassword: string;
}

enum FieldType {
    Alias = 0,
    Password = 1,
    ConfirmPassword = 2,
}

const SERVER_PASSWORD_STRING = "********";

export class GitCredentialsStore extends VSSStore.Store {
    private _state: GitCredentialsState;

    constructor(
        patTokensRootUrl: string,
        isUserAnonymous: boolean,
        isUserPublic: boolean,
    ) {
        super();

        this._state = {
            isUserAnonymous,
            isUserPublic,
            isBasicAuthEnabled: false,
            errorMessage: null,
            waitingOnServer: false,
            patTokensRootUrl: patTokensRootUrl,
            isGenerateGitCredentialsButtonClicked: false,
            primaryUsername: null,
            serverAlias: null,
            isBasicAuthSet: false,
            alias: null,
            password: null,
            confirmPassword: null,
            isAnyPasswordFieldEdited: false,
            arePasswordFieldsJustClearedOrReset: false,
            startValidatingAlias: false,
            startValidatingPassword: false,
            startValidatingConfirmPassword: false,
            isAliasInvalid: false,
            isPasswordInvalid: false,
            isConfirmPasswordInvalid: false,
            aliasErrorMessage: '',
            passwordErrorMessage: '',
            confirmPasswordErrorMessage: '',
            isSaveButtonDisabled: true,
            isAlternateCredentialsSavedSuccessfully: false,
            patUsername: null,
            patPassword: null,
        };
    }

    public getState(): GitCredentialsState {
        return this._state;
    }

    public updateAlias = (aliasUpdatePayload: ActionsHub.AliasUpdatePayload): void => {
        const errorMessage = this._getErrorMessage(
            aliasUpdatePayload.isAliasInvalid,
            this._state.startValidatingAlias,
            FieldType.Alias);

        this._setState({
            alias: aliasUpdatePayload.alias,
            isAliasInvalid: aliasUpdatePayload.isAliasInvalid,
            aliasErrorMessage: errorMessage,
        } as GitCredentialsState);
    }

    public updatePassword = (passwordUpdatePayload: ActionsHub.PasswordUpdatePayload): void => {
        const errorMessage = this._getErrorMessage(
            passwordUpdatePayload.isPasswordInvalid,
            this._state.startValidatingPassword,
            FieldType.Password);

        const isReallyEdited = this._isReallyEdited(passwordUpdatePayload.password);

        this._setState({
            password: passwordUpdatePayload.password,
            isPasswordInvalid: passwordUpdatePayload.isPasswordInvalid,
            passwordErrorMessage: errorMessage,
            isAnyPasswordFieldEdited: isReallyEdited,
            arePasswordFieldsJustClearedOrReset: !isReallyEdited,
        } as GitCredentialsState);
    }

    public updateConfirmPassword = (confirmPasswordPayload: ActionsHub.ConfirmPasswordUpdatePayload): void => {
        const errorMessage = this._getErrorMessage(
            confirmPasswordPayload.isConfirmPasswordInvalid,
            this._state.startValidatingConfirmPassword,
            FieldType.ConfirmPassword);

        const isReallyEdited = this._isReallyEdited(confirmPasswordPayload.confirmPassword);

        this._setState({
            confirmPassword: confirmPasswordPayload.confirmPassword,
            isConfirmPasswordInvalid: confirmPasswordPayload.isConfirmPasswordInvalid,
            confirmPasswordErrorMessage: errorMessage,
            isAnyPasswordFieldEdited: isReallyEdited,
            arePasswordFieldsJustClearedOrReset: !isReallyEdited,
        } as GitCredentialsState);
    }

    public enableSaveGitCredentials = (): void => {
        this._setState({
            isSaveButtonDisabled: false,
            isAlternateCredentialsSavedSuccessfully: false,
            isAliasInvalid: false,
            isPasswordInvalid: false,
            isConfirmPasswordInvalid: false,
        } as GitCredentialsState);
    }

    public disableSaveGitCredentials = (): void => {
        this._setState({
            isSaveButtonDisabled: true,
            isAlternateCredentialsSavedSuccessfully: false,
        } as GitCredentialsState);
    }

    public startWaitingOnServer = (): void => {
        this._setState({
            errorMessage: null,
            waitingOnServer: true,
        } as GitCredentialsState);
    }

    public initializePatTokenData = (payload: ActionsHub.PatTokenDataPayload): void => {
        this._setState({
            patUsername: payload.patUsername,
            patPassword: payload.patPassword,
            waitingOnServer: false,
        } as GitCredentialsState);
    }

    public initializeAlternateCredentialsData = (payload: ActionsHub.AlternateCredentialsDataPayload): void => {
        this._setState({
            isSaveButtonDisabled: true,
            isAlternateCredentialsSavedSuccessfully: false,
            isBasicAuthEnabled: !payload.basicAuthDisabledOnAccount,
            primaryUsername: payload.primaryUsername,
            alias: payload.alias,
            serverAlias: payload.alias,
            isBasicAuthSet: payload.basicAuthHasPassword,
            waitingOnServer: false,
        } as GitCredentialsState);

        this._setPasswordFieldsAndValidationStates();
    }

    public generateGitCredentialsButtonClicked = (): void => {
        this._setState({
            isGenerateGitCredentialsButtonClicked: true,
        } as GitCredentialsState);
    }

    public showGitCredentialsError = (errorMessage: string): void => {
        this._setState({
            errorMessage: errorMessage,
            isSaveButtonDisabled: true,
            waitingOnServer: false,
        } as GitCredentialsState);
    }

    public hideGitCredentialsError = (): void => {
        this._setState({
            errorMessage: null,
        } as GitCredentialsState);
    }

    public updateAlternateCredentialsData = (alias: string): void => {
        this._setState({
            serverAlias: alias,
            isSaveButtonDisabled: true,
            isAlternateCredentialsSavedSuccessfully: true,
            isBasicAuthSet: true,
            waitingOnServer: false,
        } as GitCredentialsState);

        this._setPasswordFieldsAndValidationStates();

        setTimeout(() => {
            this._setState({
                isAlternateCredentialsSavedSuccessfully: false,
            } as GitCredentialsState);
        }, 2000);
    }

    public startValidatingAlias = (): void => {
        this._setState({
            startValidatingAlias: true,
            aliasErrorMessage: this._getErrorMessage(this._state.isAliasInvalid, true, FieldType.Alias),
        } as GitCredentialsState);
    }

    public startValidatingPassword = (): void => {
        this._setState({
            startValidatingPassword: true,
            passwordErrorMessage: this._getErrorMessage(this._state.isPasswordInvalid, true, FieldType.Password),
        } as GitCredentialsState);
    }

    public startValidatingConfirmPassword = (): void => {
        this._setState({
            startValidatingConfirmPassword: true,
            confirmPasswordErrorMessage: this._getErrorMessage(this._state.isConfirmPasswordInvalid, true, FieldType.ConfirmPassword),
        } as GitCredentialsState);
    }

    public clearPasswordFields = (): void => {
        this._setState({
            password: "",
            confirmPassword: "",
            arePasswordFieldsJustClearedOrReset: true,
        } as GitCredentialsState);
    }

    public resetPasswordFields = (): void => {
        this._setPasswordFieldsAndValidationStates(true);
    }

    private _getErrorMessage = (showError: boolean, validationStarted: boolean, fieldType: FieldType): string => {
        let errorMessage = '';
        if (showError && validationStarted) {
            switch (fieldType) {
                case FieldType.Alias:
                    errorMessage = AccountResources.UseProfileUsernameSecondary;
                    break;
                case FieldType.Password:
                    errorMessage = VCResources.GitCredentialsPasswordNotStrong;
                    break;
                case FieldType.ConfirmPassword:
                    errorMessage = AccountResources.PasswordsDoNotMatch;
                    break;
            }
        }

        return errorMessage;
    }

    private _getServerPassword = (): string => {
        return this._state.isBasicAuthSet ? SERVER_PASSWORD_STRING : Utils_String.empty;
    }

    private _isReallyEdited = (password: string): boolean => {
        return (!this._state.arePasswordFieldsJustClearedOrReset
            || (password !== Utils_String.empty && password !== SERVER_PASSWORD_STRING));
    }

    private _setPasswordFieldsAndValidationStates = (shouldSkipAlias?: boolean): void => {
        const serverPassword = this._getServerPassword();
        this._setState({
            password: serverPassword,
            confirmPassword: serverPassword,
            isAnyPasswordFieldEdited: false,
            startValidatingAlias: shouldSkipAlias ? this._state.startValidatingAlias : false,
            startValidatingPassword: false,
            startValidatingConfirmPassword: false,
            arePasswordFieldsJustClearedOrReset: this._state.isBasicAuthSet ? true : false,
        } as GitCredentialsState);
    }

    private _setState(partialState: GitCredentialsState): void {
        for (const key in partialState) {
            this._state[key] = partialState[key];
        }

        this.emitChanged();
    }
}
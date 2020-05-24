import { SupportedIde, SupportedIdeType } from "TFS/VersionControl/Contracts";
import { CallbackHub } from "VersionControl/Scenarios/Shared/CallbackHub";

export interface ChangeSelectedIdePayload {
    selectedIde: SupportedIde;
    isSelectedIdeVisualStudio: boolean;
}

export interface SetSupportedIdesPayload {
    ides: SupportedIde[];
    favoriteIdeType: SupportedIdeType;
    isFavoriteIdeVisualStudio: boolean;
}

export interface AlternateCredentialsDataPayload {
    basicAuthDisabledOnAccount: boolean;
    basicAuthHasPassword: boolean;
    primaryUsername: string;
    alias: string;
}

export interface PatTokenDataPayload {
    patUsername: string;
    patPassword: string;
}

export interface AliasUpdatePayload {
    alias: string;
    isAliasInvalid: boolean;
}

export interface PasswordUpdatePayload {
    password: string;
    isPasswordInvalid: boolean;
}

export interface ConfirmPasswordUpdatePayload {
    confirmPassword: string;
    isConfirmPasswordInvalid: boolean;
}

export class ActionsHub {
    public createFilesRequested = new CallbackHub<void>();
    public createFilesCompleted = new CallbackHub<string>();
    public setSupportedIdes = new CallbackHub<SetSupportedIdesPayload>();
    public changeSelectedIde = new CallbackHub<ChangeSelectedIdePayload>();
    public toggleButtonClicked = new CallbackHub<string>();
    public waitingOnServerStarted = new CallbackHub<void>();
    public alternateCredentialsDataUpdated = new CallbackHub<AlternateCredentialsDataPayload>();
    public patTokenDataUpdated = new CallbackHub<PatTokenDataPayload>();
    public gitCredentialsErrorOccurred = new CallbackHub<string>();
    public gitCredentialsErrorRemoved = new CallbackHub<void>();
    public saveAlternateCredentialsEnabled = new CallbackHub<void>();
    public saveAlternateCredentialsDisabled = new CallbackHub<void>();
    public alternateCredentialsSaved = new CallbackHub<string>();
    public alternateCredentialsAliasUpdated = new CallbackHub<AliasUpdatePayload>();
    public alternateCredentialsPasswordUpdated = new CallbackHub<PasswordUpdatePayload>();
    public alternateCredentialsConfirmPasswordUpdated = new CallbackHub<ConfirmPasswordUpdatePayload>();
    public alternateCredentialsPasswordFieldsCleared = new CallbackHub<void>();
    public alternateCredentialsPasswordFieldsReset = new CallbackHub<void>();
    public alternateCredentialsAliasValidationStarted = new CallbackHub<void>();
    public alternateCredentialsPasswordValidationStarted = new CallbackHub<void>();
    public alternateCredentialsConfirmPasswordValidationStarted = new CallbackHub<void>();
    public generateGitCredentialsButtonClicked = new CallbackHub<void>();
    public gitContributePermissionUpdated = new CallbackHub<boolean>();
}

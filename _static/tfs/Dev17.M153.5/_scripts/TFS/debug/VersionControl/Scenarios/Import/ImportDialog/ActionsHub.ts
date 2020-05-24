import { CallbackHub } from "VersionControl/Scenarios/Shared/CallbackHub";
import { ImportSourceType } from "VersionControl/Scenarios/Import/ImportDialog/Store";

export class ActionsHub {
    public setImportSourceType = new CallbackHub<ImportSourceType>();
    public setGitSourceUrl = new CallbackHub<string>();
    public setTfvcPath = new CallbackHub<string>();
    public setTfvcImportHistory = new CallbackHub<boolean>();
    public setTfvcImportHisotryDuration = new CallbackHub<number>();
    public setIsAuthenticationRequired = new CallbackHub<boolean>();
    public setUsername = new CallbackHub<string>();
    public setPassword = new CallbackHub<string>();
    public setValidationFailed = new CallbackHub<void>();
    public setImportRequestCreationInProgress = new CallbackHub<boolean>();
    public setImportRequestCreationError = new CallbackHub<string>();
    public setRepositoryName = new CallbackHub<string>();
    public clearAllErrors = new CallbackHub<void>();
}
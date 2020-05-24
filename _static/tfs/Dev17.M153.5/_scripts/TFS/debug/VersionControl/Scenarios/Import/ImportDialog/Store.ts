import { ActionsHub } from "VersionControl/Scenarios/Import/ImportDialog/ActionsHub";

import * as VSSStore from "VSS/Flux/Store";
import * as ImportResources from "VersionControl/Scripts/Resources/TFS.Resources.ImportDialog"

import {
    GitImportGitSource,
    GitImportTfvcSource,
} from "TFS/VersionControl/Contracts";

export const TfvcImportHistoryDurationInDaysInitialPoint = 30;

/**
 * Labels fror CI data, keeping const in Store as everyone has knowledge of store anyways
 */
export const RepositoryPickerCiDataLabel = "RepositoryPicker";
export const EmptyRepositoryPageCiDataLabel = "EmptyRepositoryPage";

/**
 * Enum for possible Import Source Types
 */
export enum ImportSourceType {
    Git = 0,
    Tfvc = 1
}

/**
 * this is to be used to maintain state for import repository component
 */
export interface State {
    DialogTitle: string;

    ImportSourceType: ImportSourceType;
    GitSource: GitImportGitSource;
    TfvcSource: GitImportTfvcSource;

    IsAuthenticationRequired: boolean;
    Username: string;
    Password: string;

    ValidationFailed: boolean;

    ImportRequestCreationInProgress: boolean;
    ImportRequestCreationError: string;

    RepositoryNameRequired: boolean;
    RepositoryNameSuggestionRequired: boolean;
    RepositoryName: string;

    EntryPointCiData: {
        [key: string]: any;
    };
}

/**
 * Store for import repository component
 */
export class Store extends VSSStore.Store {
    private state = {} as State;

    public getState(): State {
        return this.state;
    }

    constructor(actionsHub: ActionsHub, repositoryName: string) {
        super();

        this.state = {
            DialogTitle: ImportResources.ImportAnExistingGitRepositoryLabel,

            ImportSourceType: ImportSourceType.Git,
            GitSource: { url: null, overwrite: false },
            TfvcSource: null,

            IsAuthenticationRequired: false,
            Username: null,
            Password: null,

            ValidationFailed: false,

            ImportRequestCreationInProgress: false,
            ImportRequestCreationError: null,

            RepositoryNameSuggestionRequired: (repositoryName === null),
            RepositoryNameRequired: (repositoryName === null),
            RepositoryName: (repositoryName) ? repositoryName : "",

            EntryPointCiData: {
                "entryPoint": repositoryName
                    ? EmptyRepositoryPageCiDataLabel
                    : RepositoryPickerCiDataLabel
            }
        };

        actionsHub.setImportSourceType.subscribe(this.setImportSourceType);
        actionsHub.setGitSourceUrl.subscribe(this.setGitSourceUrl);
        actionsHub.setTfvcPath.subscribe(this.setTfvcPath);
        actionsHub.setTfvcImportHistory.subscribe(this.setTfvcImportHistory);
        actionsHub.setTfvcImportHisotryDuration.subscribe(this.setTfvcImportHisotryDuration);
        actionsHub.setIsAuthenticationRequired.subscribe(this.setIsAuthenticationRequired);
        actionsHub.setUsername.subscribe(this.setUsername);
        actionsHub.setPassword.subscribe(this.setPassword);
        actionsHub.setValidationFailed.subscribe(this.setValidationFailed);
        actionsHub.setImportRequestCreationInProgress.subscribe(this.setImportRequestCreationInProgress);
        actionsHub.setImportRequestCreationError.subscribe(this.setImportRequestCreationError);
        actionsHub.setRepositoryName.subscribe(this.setRepositoryName);
        actionsHub.clearAllErrors.subscribe(this.clearAllErrors);
    }

    public isImportRequestCreatable = (): boolean => {
        if (!this.state.RepositoryName) {
            return false;
        }

        switch (this.state.ImportSourceType) {
            case (ImportSourceType.Git):
                if (!this.state.GitSource.url || this.state.GitSource.url.trim().length < 1) {
                    return false;
                }

                if (this.state.IsAuthenticationRequired && (!this.state.Password || this.state.Password.trim().length < 1)) {
                    return false;
                }

                return true;
            case (ImportSourceType.Tfvc):
                if (!this.state.TfvcSource.path || this.state.TfvcSource.path.trim().length < 1) {
                    return false;
                }

                return true;
        }
    }

    private setImportSourceType = (importSourceType: ImportSourceType): void => {
        this.state.ValidationFailed = null;
        this.state.ImportRequestCreationError = null;

        this.state.ImportSourceType = importSourceType;

        switch (importSourceType) {
            case (ImportSourceType.Git):
                this.state.DialogTitle = ImportResources.ImportAnExistingGitRepositoryLabel;
                this.state.TfvcSource = null;
                this.state.GitSource = { url: "", overwrite: false };
                break;
            case (ImportSourceType.Tfvc):
                this.state.DialogTitle = ImportResources.ImportAnExistingTfvcRepositoryLabel;
                this.state.Username = null;
                this.state.Password = null;
                this.state.IsAuthenticationRequired = false;
                this.state.TfvcSource = {
                    importHistory: false,
                    importHistoryDurationInDays: TfvcImportHistoryDurationInDaysInitialPoint,
                    path: "",
                };
                this.state.GitSource = null;
                break;
        }

        this.emitChanged();
    }

    private setGitSourceUrl = (gitSourceUrl: string): void => {
        this.state.GitSource.url = gitSourceUrl;

        if (this.state.RepositoryNameSuggestionRequired === true) {
            this._getRepositoryNameSuggestionForGit(gitSourceUrl);
        }

        this.emitChanged();
    }

    private setTfvcPath = (tfvcPath: string): void => {
        this.state.TfvcSource.path = tfvcPath;
        this.emitChanged();
    }

    private setTfvcImportHistory = (tfvcImportHistory: boolean) => {
        this.state.TfvcSource.importHistory = tfvcImportHistory;
        this.state.TfvcSource.importHistoryDurationInDays = TfvcImportHistoryDurationInDaysInitialPoint;
        this.emitChanged();
    }

    private setTfvcImportHisotryDuration = (tfvcImportHistoryDuration: number) => {
        this.state.TfvcSource.importHistoryDurationInDays = tfvcImportHistoryDuration;
        this.emitChanged();
    }

    private setIsAuthenticationRequired = (isAuthenticationRequired: boolean) => {
        this.state.IsAuthenticationRequired = isAuthenticationRequired;
        if (!isAuthenticationRequired) {
            this.state.Username = null;
            this.state.Password = null;
        }

        this.emitChanged();
    }

    private setUsername = (username: string) => {
        this.state.Username = username;
        this.emitChanged();
    }

    private setPassword = (password: string) => {
        this.state.Password = password;
        this.emitChanged();
    }

    private setValidationFailed = () => {
        this.state.ImportRequestCreationInProgress = false;
        this.state.ValidationFailed = true;
        this.emitChanged();
    }

    private setImportRequestCreationInProgress = (importRequestCreationInProgress: boolean) => {
        this.state.ImportRequestCreationInProgress = importRequestCreationInProgress;
        this.state.ValidationFailed = false;
        this.state.ImportRequestCreationError = null;
        this.emitChanged();
    }

    private setImportRequestCreationError = (importRequestCreationError: string) => {
        this.state.ImportRequestCreationInProgress = false;
        this.state.ImportRequestCreationError = importRequestCreationError;
        this.emitChanged();
    }

    private setRepositoryName = (repositoryName: string) => {
        // this special check is required because repository name is coming from a controlled component
        if (this.state.RepositoryName === repositoryName) {
            return;
        }

        this.state.RepositoryNameSuggestionRequired = false;
        this.state.RepositoryName = repositoryName;
        this.emitChanged();
    }

    private clearAllErrors = () => {
        this.state.ValidationFailed = false;
        this.state.ImportRequestCreationError = null;
        this.emitChanged();
    }

    private _getRepositoryNameSuggestionForGit(gitCloneUrl: string): void {
        if (gitCloneUrl.toLowerCase().search("http") < 0 || gitCloneUrl.toLowerCase().search("/") < 0) {
            return;
        }

        const endPart = gitCloneUrl.substring(gitCloneUrl.lastIndexOf("/") + 1, gitCloneUrl.length);
        let suggestion = endPart;
        if (endPart.length > 4 && endPart.substr(endPart.length - 4).toLowerCase() === ".git") {
            suggestion = endPart.substr(0, endPart.length - 4);
        }

        if (suggestion && suggestion.length > 0) {
            this.state.RepositoryName = suggestion;
        }
    }
}
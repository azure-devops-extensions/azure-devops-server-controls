import { GitCredentialsStore, GitCredentialsState } from "VersionControl/Scenarios/NewGettingStarted/Stores/GitCredentialsStore";
import { MainStore, MainState } from "VersionControl/Scenarios/NewGettingStarted/Stores/MainStore";
import { ActionsHub } from "VersionControl/Scenarios/NewGettingStarted/ActionsHub";

export interface AggregatedState {
    mainState: MainState;
    gitCredentialsState: GitCredentialsState;
}

export class StoresHub {
    public mainStore: MainStore;
    public gitCredentialsStore: GitCredentialsStore;

    constructor(
        actionsHub: ActionsHub,
        isHosted: boolean,
        initialCloneURL: string,
        sshEnabled: boolean,
        sshUrl: string,
        patTokensRootUrl: string,
        isUserAnonymous: boolean,
        isUserPublic: boolean,
    ) {
        this.mainStore = new MainStore(isHosted, initialCloneURL, sshEnabled, sshUrl);
        actionsHub.createFilesCompleted.subscribe(this.mainStore.createFilesCompleted);
        actionsHub.createFilesRequested.subscribe(this.mainStore.createFilesRequested);
        actionsHub.setSupportedIdes.subscribe(this.mainStore.setSupportedIdes);
        actionsHub.changeSelectedIde.subscribe(this.mainStore.changeSelectedIde);
        actionsHub.toggleButtonClicked.subscribe(this.mainStore.setToggleButtonSelectedIndex);
        actionsHub.gitContributePermissionUpdated.subscribe(this.mainStore.updateGitContributePermission);

        this.gitCredentialsStore = new GitCredentialsStore(patTokensRootUrl, isUserAnonymous, isUserPublic);
        actionsHub.waitingOnServerStarted.subscribe(this.gitCredentialsStore.startWaitingOnServer);
        actionsHub.alternateCredentialsDataUpdated.subscribe(this.gitCredentialsStore.initializeAlternateCredentialsData);
        actionsHub.patTokenDataUpdated.subscribe(this.gitCredentialsStore.initializePatTokenData);
        actionsHub.gitCredentialsErrorOccurred.subscribe(this.gitCredentialsStore.showGitCredentialsError);
        actionsHub.gitCredentialsErrorRemoved.subscribe(this.gitCredentialsStore.hideGitCredentialsError);
        actionsHub.saveAlternateCredentialsEnabled.subscribe(this.gitCredentialsStore.enableSaveGitCredentials);
        actionsHub.saveAlternateCredentialsDisabled.subscribe(this.gitCredentialsStore.disableSaveGitCredentials);
        actionsHub.alternateCredentialsSaved.subscribe(this.gitCredentialsStore.updateAlternateCredentialsData);
        actionsHub.alternateCredentialsAliasUpdated.subscribe(this.gitCredentialsStore.updateAlias);
        actionsHub.alternateCredentialsPasswordUpdated.subscribe(this.gitCredentialsStore.updatePassword);
        actionsHub.alternateCredentialsConfirmPasswordUpdated.subscribe(this.gitCredentialsStore.updateConfirmPassword);
        actionsHub.alternateCredentialsPasswordFieldsCleared.subscribe(this.gitCredentialsStore.clearPasswordFields);
        actionsHub.generateGitCredentialsButtonClicked.subscribe(this.gitCredentialsStore.generateGitCredentialsButtonClicked);
        actionsHub.alternateCredentialsPasswordFieldsReset.subscribe(this.gitCredentialsStore.resetPasswordFields);
        actionsHub.alternateCredentialsAliasValidationStarted.subscribe(this.gitCredentialsStore.startValidatingAlias);
        actionsHub.alternateCredentialsPasswordValidationStarted.subscribe(this.gitCredentialsStore.startValidatingPassword);
        actionsHub.alternateCredentialsConfirmPasswordValidationStarted.subscribe(this.gitCredentialsStore.startValidatingConfirmPassword);
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            mainState: this.mainStore.getState(),
            gitCredentialsState: this.gitCredentialsStore.getState(),
        }
    }
}
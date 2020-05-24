// libs
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import { Debug } from "VSS/Diag";

// contracts
import { MessageBarType } from "OfficeFabric/MessageBar";
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { AutomaticReviewers, Build, Status } from "Policy/Scripts/PolicyTypes";
import { SettingsBase } from "Policy/Scripts/PolicyTypes";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IdentityRef } from "VSS/WebApi/Contracts";

// scenario
import { ActionsHub, Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import { SourcesHub } from "Policy/Scenarios/AdminPolicies/Sources/SourcesHub";
import { StoresHub } from "Policy/Scenarios/AdminPolicies/Stores/StoresHub";

// stores
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";
import { PolicyConfigStore } from "Policy/Scenarios/AdminPolicies/Stores/PolicyConfigStore";

// sources
import { IBuildDefinitionSource, BuildDefinitionsResult } from "Policy/Scenarios/AdminPolicies/Sources/BuildDefinitionSource";
import { IPolicyConfigSource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyConfigSource";
import { IPolicyIdentitySource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyIdentitySource";

// services and utils
import { PolicyConfigurationUtils } from "Policy/Scenarios/AdminPolicies/PolicyConfigurationUtils";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import * as NavigationServices from "VSS/Navigation/Services";
import { getService } from "VSS/Service";

// These are "convenience" definitions, they're not required for all action creation methods. If an action creator
// is often passed around as a prop, it's tedious to list a long type signature everywhere.
export namespace ActionCreationSignatures {
    export type CreateLocalPolicyConfig = (
        config: PolicyConfiguration,
        saveToServerImmediately?: boolean
    ) => void;

    export type UpdateLocalPolicyConfig = (
        configId: number,
        performUpdate: (config: PolicyConfiguration) => void,
        saveToServerImmediately?: boolean
    ) => void;

    export type ShowPolicyEditDialog = (
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement
    ) => void;

    export type ShowPolicyDeleteDialog = (
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement,
        errorMesssageTarget: MessageTarget,
        dialogToDismiss?: React.Component<any, any>,
    ) => void;
}

export class ActionCreator {
    private _tfsContext: TfsContext;

    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;
    private _storesHub: StoresHub;

    constructor(
        tfsContext: TfsContext,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub,
        storesHub: StoresHub
    ) {
        this._tfsContext = tfsContext;

        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
        this._storesHub = storesHub;
    }

    public initializeFeatureFlags() {
        // no feature flags
    }

    // Note that by its nature, this action must run synchronously. The browser sends the 'beforeunload' event and our code
    // needs to respond with a string immediately to prevent navigation. We can't return a promise here.
    @autobind
    public windowBeforeUnload(): (string | undefined) {
        let payload: Actions.WindowBeforeUnloadPayload = {};

        this._actionsHub.windowBeforeUnload.invoke(payload);

        return payload.userPrompt;
    }

    @autobind
    public showMessage(target: MessageTarget, messageType: MessageBarType, content: React.ReactNode): void {
        this._actionsHub.showMessage.invoke({
            messageType: messageType,
            content: content,
            target: target,
        });
    }

    @autobind
    public dismissMessages(id?: number, target?: MessageTarget): void {
        this._actionsHub.dismissMessages.invoke({ id: id, target: target });
    }

    @autobind
    public cacheIdentity(identity: (IdentityRef | IEntity)): void {
        this._actionsHub.cacheIdentity.invoke({ entry: identity });
    }

    @autobind
    public materializeAadGroup(identity: IEntity): void {
        this._actionsHub.beginMaterializingAadGroup.invoke({ identity: identity });

        const source: IPolicyIdentitySource = this._sourcesHub.policyIdentitySource;
        source.materializeAadGroup(identity.originId)
            .then((member) => {
                if (!member) {
                    this._actionsHub.failedMaterialization.invoke({ identity: identity });
                }
                else {
                    source.getGraphMemberStorageKey(member).then((storageKey) => {
                        this._actionsHub.completeMaterialization.invoke({ identity: identity, tfid: storageKey.value });
                    }, (error) => {
                        this._actionsHub.failedMaterialization.invoke({ identity: identity });
                    });
                }
            }, (error) => {
                this._actionsHub.failedMaterialization.invoke({ identity: identity });
            });
    }

    @autobind
    public retrieveAllBuildDefinitionsAsync(): void {
        let store = this._storesHub.buildDefinitionStore;
        let source = this._sourcesHub.buildDefinitionSource;

        if (store.noDefinitionsExist) {
            // This is a flag on the page data island which says "don't bother fetching, there aren't any builds defined"
            return;
        }

        let processResult = (result: BuildDefinitionsResult): void => {
            let continuationToken = result.continuationToken;
            let setAllDefinitionsLoaded = false;

            if (continuationToken != null) {
                // There are more build definitions to get
                source.getBuildDefinitionsAsync({ continuationToken })
                    .then(processResult);
            }
            else {
                setAllDefinitionsLoaded = true;
            }

            this._actionsHub.gotBuildDefinitions.invoke({ definitions: result.definitions, setAllDefinitionsLoaded, });
        }

        source.getBuildDefinitionsAsync({})
            .then(processResult);
    }

    @autobind
    public showBuildPolicyEditDialog(
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement,
    ): void {
        this.dismissMessages(null, MessageTarget.buildErrors);

        this._actionsHub.showBuildPolicyEditDialog.invoke({
            config: config,
            elementToFocusOnDismiss: elementToFocusOnDismiss,
        });
    }

    @autobind
    public showAutomaticReviewersPolicyEditDialog(
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement,
    ): void {
        this.dismissMessages(null, MessageTarget.reviewersErrors);

        this._actionsHub.showAutomaticReviewersPolicyEditDialog.invoke({
            config: config,
            elementToFocusOnDismiss: elementToFocusOnDismiss,
        });
    }

    @autobind
    public showStatusPolicyEditDialog(
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement,
    ): void {
        this.dismissMessages(null, MessageTarget.statusErrors);

        this._actionsHub.showStatusPolicyEditDialog.invoke({
            config: config,
            elementToFocusOnDismiss: elementToFocusOnDismiss,
        });
    }

    @autobind
    private _dismissDialog(dialogToDismiss: React.Component<any, any>): void {
        if (dialogToDismiss != null) {
            this._actionsHub.dismissDialog.invoke({ dialog: dialogToDismiss });
        }
    }

    @autobind
    public showPolicyDeleteDialog(
        config: PolicyConfiguration,
        elementToFocusOnDismiss: HTMLElement,
        errorMesssageTarget: MessageTarget,
        dialogToDismiss?: React.Component<any, any>,
    ): void {
        this._actionsHub.showPolicyDeleteDialog.invoke({
            config: config,
            elementToFocusOnDismiss: elementToFocusOnDismiss,
            onDelete: (cfg) => {
                this.updateLocalPolicyConfig(
                    config.id, (cfg) => {
                        cfg.isDeleted = true;
                    },
                    true,
                    errorMesssageTarget,
                    dialogToDismiss,
                );
            },
        });
    }

    @autobind
    public createLocalPolicyConfig(
        config: PolicyConfiguration,
        saveToServerImmediately?: boolean,
        errorMessageTarget?: MessageTarget,
        dialogToDismiss?: React.Component<any, any>,
    ): void {

        (config.settings as SettingsBase).scope = [this._storesHub.adminPoliciesHubStore.settingsScopeObject];

        this._actionsHub.createLocalPolicyConfig.invoke({ config: config });

        if (saveToServerImmediately) {
            this._saveLocalPolicyConfigToServer(config.id, errorMessageTarget, dialogToDismiss);
        }
    }

    @autobind
    public updateLocalPolicyConfig(
        configId: number,
        performUpdate: (config: PolicyConfiguration) => void,
        saveToServerImmediately?: boolean,
        errorMesssageTarget?: MessageTarget,
        dialogToDismiss?: React.Component<any, any>,
    ): void {
        this._actionsHub.updateLocalPolicyConfig.invoke({
            configId: configId,
            performUpdate: performUpdate,
        });

        if (saveToServerImmediately) {
            this._saveLocalPolicyConfigToServer(configId, errorMesssageTarget, dialogToDismiss);
        }
    }

    @autobind
    private _saveLocalPolicyConfigToServer(
        configId: number,
        errorMesssageTarget: MessageTarget,
        dialogToDismiss?: React.Component<any, any>,
    ): void {
        const store: PolicyConfigStore = this._storesHub.policyConfigStore;
        const source: IPolicyConfigSource = this._sourcesHub.policyConfigSource;

        let localConfig: PolicyConfiguration = store.getLocalConfigById(configId);
        let serverConfig: PolicyConfiguration = store.getServerConfigById(configId);

        if (localConfig == null) {
            // Martian case
            Debug.fail("Tried to save a policy that doesn't exist");
        }
        else if (localConfig.isDeleted) {
            // Deleted locally

            if (serverConfig == null) {
                // Never existed on server
                store.deleteLocalPolicyConfig(configId);
            }
            else {
                store.beginSaveOperation();

                source.deletePolicyConfigAsync(configId)
                    .then(
                    () => {
                        store.endSaveOperation();
                        this._actionsHub.serverPolicyConfigDeleted.invoke({ configId: configId, });
                        this._dismissDialog(dialogToDismiss);
                    },
                    (error) => {
                        store.endSaveOperation();
                        this._errorDuringSave(error, configId, errorMesssageTarget, (dialogToDismiss != null));
                    });
            }
        }
        else if (serverConfig == null) {
            // Created locally
            store.beginSaveOperation();

            source.createPolicyConfigAsync(localConfig)
                .then(
                (serverConfig) => {
                    store.endSaveOperation();
                    this._actionsHub.serverPolicyConfigCreated.invoke({ localConfig: localConfig, serverConfig: serverConfig, });
                    this._dismissDialog(dialogToDismiss);
                },
                (error) => {
                    store.endSaveOperation();
                    this._errorDuringSave(error, configId, errorMesssageTarget, (dialogToDismiss != null));
                });
        }
        else if (localConfig.revision !== serverConfig.revision) {
            // Updated locally
            store.beginSaveOperation();

            source.updatePolicyConfigAsync(localConfig)
                .then(
                (serverConfig) => {
                    store.endSaveOperation();
                    this._actionsHub.serverPolicyConfigUpdated.invoke({ config: serverConfig, });
                    this._dismissDialog(dialogToDismiss);
                },
                (error) => {
                    store.endSaveOperation();
                    this._errorDuringSave(error, configId, errorMesssageTarget, (dialogToDismiss != null));
                });
        }
        // else policy unchanged
    }

    @autobind
    public saveAllLocalPolicyConfigsToServer(): void {
        // saveLocalPolicyConfigToServer() only saves dirty configs
        this._storesHub.policyConfigStore.localPolicyConfigs.forEach((config) =>
            this._saveLocalPolicyConfigToServer(config.id, MessageTarget.page));
    }

    @autobind
    public abandonAllLocalPolicyConfigChanges(): void {
        this._actionsHub.abandonAllLocalPolicyConfigChanges.invoke(null);
    }

    public getPresetConfiguration(): void {
        const urlState = NavigationServices.getHistoryService().getCurrentState();
        const presetConfiguration: PolicyConfiguration = PolicyConfigurationUtils.parsePolicyConfiguration(urlState);

        if (presetConfiguration) {
            switch (presetConfiguration.type.id) {
                case Status.Id:
                    this.showStatusPolicyEditDialog(presetConfiguration, null);
                    break;

                case AutomaticReviewers.Id:
                    const identities = presetConfiguration.settings && (presetConfiguration.settings as AutomaticReviewers.Settings).requiredReviewerIds;
                    if (identities && identities.length > 0) {
                        // when reviewer ids provided try to resolve
                        this._sourcesHub.policyIdentitySource.getIdentities(identities)
                            .then(resolved => {
                                if (resolved && resolved.length === identities.length) {
                                    // remove all not resolved identities
                                    const resolvedReviewerIds = resolved.map(identity => identity && identity.id).filter(id => id);
                                    (presetConfiguration.settings as AutomaticReviewers.Settings).requiredReviewerIds = resolvedReviewerIds;
                                    this.showAutomaticReviewersPolicyEditDialog(presetConfiguration, null);
                                }
                            })
                            .then(null, error => null);
                    }
                    else {
                        this.showAutomaticReviewersPolicyEditDialog(presetConfiguration, null);
                    }
                    break;

                default:
                    break;
            }
        }

        this._actionsHub.presetConfigurationUpdated.invoke({ presetConfiguration });
    }

    /**
     * Remove preset parameters from URL
     */
    public cleanupUrl(): void {
        if (this._storesHub.policyConfigStore.presetPolicyConfig) {
            const urlState = NavigationServices.getHistoryService().getCurrentState();
            NavigationServices.getHistoryService().replaceHistoryPoint(null, { scope: urlState.scope });
        }
    }

    private _errorDuringSave(
        error: any,
        configId: number,
        messsageTarget: MessageTarget,
        abandonLocalChanges: boolean
    ): void {
        // Display the whole exception w/ any stack trace to the console
        console.error(error);

        if (abandonLocalChanges) {
            // Reset local policy to server version
            this._storesHub.policyConfigStore.abandonLocalPolicyConfigChanges({ configId: configId, });
        }

        // Display a text version with no stack trace as an error MessageBar
        const maxLength: number = 500;
        let errorText: string;

        // In certain cases, the inner exception message is a lot more useful
        if (error.serverError
            && error.serverError.typeKey == "PolicyChangeRejectedByPolicyException"
            && error.serverError.innerException
            && error.serverError.innerException.message
        ) {
            errorText = error.serverError.innerException.message;
        }
        else {
            errorText = ("" + error);
        }

        if (errorText.length > 500) {
            errorText = errorText.substr(0, 500) + "...";
        }

        this.showMessage(messsageTarget || MessageTarget.page, MessageBarType.error, errorText);
    }
}

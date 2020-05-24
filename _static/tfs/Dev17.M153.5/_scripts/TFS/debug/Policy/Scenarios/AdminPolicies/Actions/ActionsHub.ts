// libs
import * as React from "react";
import { Action } from "VSS/Flux/Action";
// scenario
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
// contracts
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { GitStatusContext } from "TFS/VersionControl/Contracts";
import { Build } from "Policy/Scripts/PolicyTypes";

export class ActionsHub {
    public readonly windowBeforeUnload = new Action<Actions.WindowBeforeUnloadPayload>();

    public readonly showMessage = new Action<Actions.ShowMessagePayload>();
    public readonly dismissMessages = new Action<Actions.DismissMessagesPayload>();

    public readonly cacheIdentity = new Action<Actions.CacheIdentityPayload>();

    public readonly beginMaterializingAadGroup = new Action<Actions.BeginMaterializingAadGroupPayload>();
    public readonly failedMaterialization = new Action<Actions.FailedMaterializationPayload>();
    public readonly completeMaterialization = new Action<Actions.CompleteMaterializationPayload>();

    public readonly statusesLoaded = new Action<Actions.PullRequestStatusesPayload>();

    public readonly createLocalPolicyConfig = new Action<Actions.CreateLocalPolicyConfigPayload>();
    public readonly updateLocalPolicyConfig = new Action<Actions.UpdateLocalPolicyConfigPayload>();

    public readonly abandonLocalPolicyConfigChanges = new Action<Actions.AbandonLocalPolicyConfigChangesPayload>();
    public readonly abandonAllLocalPolicyConfigChanges = new Action<void>();

    public readonly showBuildPolicyEditDialog = new Action<Actions.ShowPolicyEditDialogPayload>();
    public readonly showAutomaticReviewersPolicyEditDialog = new Action<Actions.ShowPolicyEditDialogPayload>();
    public readonly showStatusPolicyEditDialog = new Action<Actions.ShowPolicyEditDialogPayload>();
    public readonly showPolicyDeleteDialog = new Action<Actions.ShowPolicyDeleteDialogPayload>();
    public readonly dismissDialog = new Action<Actions.DismissDialogPayload>();

    public readonly serverPolicyConfigCreated = new Action<Actions.ServerPolicyConfigCreatedPayload>();
    public readonly serverPolicyConfigUpdated = new Action<Actions.ServerPolicyConfigUpdatedPayload>();
    public readonly serverPolicyConfigDeleted = new Action<Actions.ServerPolicyConfigDeletedPayload>();

    public readonly featureAvailabilityUpdated = new Action<Actions.FeatureAvailabilityPayload>();

    public readonly gotBuildDefinitions = new Action<Actions.GotBuildDefinitionsPayload>();

    public readonly presetConfigurationUpdated = new Action<Actions.PresetConfigurationPayload>();
}

export namespace Actions {
    export interface WindowBeforeUnloadPayload {
        // If defined, display a prompt to the user to stay on the current page due to unsaved changes.
        userPrompt?: string;
    }

    export interface ShowMessagePayload {
        messageType: MessageBarType;
        content: React.ReactNode;
        target: MessageTarget;
    }

    export interface DismissMessagesPayload {
        id?: number;
        target?: MessageTarget;
    }

    export interface CacheIdentityPayload {
        entry: (IdentityRef | IEntity);
    }

    export interface BeginMaterializingAadGroupPayload {
        identity: IEntity;
    }

    export interface FailedMaterializationPayload {
        identity: IEntity;
    }

    export interface CompleteMaterializationPayload {
        identity: IEntity;
        tfid: string;
    }

    export interface CreateLocalPolicyConfigPayload {
        config: PolicyConfiguration;
    }

    export interface UpdateLocalPolicyConfigPayload {
        configId: number;
        performUpdate: (config: PolicyConfiguration) => void;
    }

    export interface AbandonLocalPolicyConfigChangesPayload {
        configId: number;
    }

    export interface ShowPolicyEditDialogPayload {
        config: PolicyConfiguration;
        elementToFocusOnDismiss?: HTMLElement;
    }

    export interface ShowPolicyDeleteDialogPayload {
        config: PolicyConfiguration;
        onDelete: (config: PolicyConfiguration) => void;
        elementToFocusOnDismiss?: HTMLElement;
    }

    export interface DismissDialogPayload {
        dialog: React.Component<any, any>;
    }

    export interface PolicyConfigQueryCompletedPayload {
        configs: PolicyConfiguration[];
        error?: any;
    }

    export interface ServerPolicyConfigCreatedPayload {
        localConfig: PolicyConfiguration;
        serverConfig: PolicyConfiguration;
        error?: any;
    }

    export interface ServerPolicyConfigUpdatedPayload {
        config: PolicyConfiguration;
        error?: any;
    }

    export interface ServerPolicyConfigDeletedPayload {
        configId: number;
        error?: any;
    }

    export interface PullRequestStatusesPayload {
        statuses: GitStatusContext[];
    }

    export interface FeatureAvailabilityPayload {
        features: IDictionaryStringTo<boolean>;
    }

    export interface GotBuildDefinitionsPayload {
        definitions: Build.IBuildDefinitionSummary[];
        setAllDefinitionsLoaded: boolean;
    }

    export interface PresetConfigurationPayload {
        presetConfiguration: PolicyConfiguration;
    }
}

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
// scenario
import { ActionsHub } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import { BuildDefinitionStore } from "Policy/Scenarios/AdminPolicies/Stores/BuildDefinitionStore";
import { PolicyConfigStore } from "Policy/Scenarios/AdminPolicies/Stores/PolicyConfigStore";
import { MessageStore } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";
import { StatusesStore } from "Policy/Scenarios/AdminPolicies/Stores/StatusesStore";
import { AdminPoliciesHubStore } from "Policy/Scenarios/AdminPolicies/Stores/AdminPoliciesHubStore";

export class StoresHub {
    public readonly adminPoliciesHubStore: AdminPoliciesHubStore;
    public readonly messageStore: MessageStore;
    public readonly identityStore: IdentityStore;
    public readonly statusesStore: StatusesStore;
    public readonly policyConfigStore: PolicyConfigStore;
    public readonly buildDefinitionStore: BuildDefinitionStore;

    constructor(tfsContext: TfsContext, actionsHub: ActionsHub, pageData: any) {

        this.adminPoliciesHubStore = new AdminPoliciesHubStore(tfsContext, pageData);

        this.messageStore = new MessageStore(tfsContext, pageData);

        this.identityStore = new IdentityStore(tfsContext, pageData);

        this.statusesStore = new StatusesStore(pageData);

        this.policyConfigStore = new PolicyConfigStore(pageData);

        this.buildDefinitionStore = new BuildDefinitionStore(pageData);

        actionsHub.windowBeforeUnload.addListener(this.policyConfigStore.windowBeforeUnload);

        actionsHub.showMessage.addListener(this.messageStore.showMessage);
        actionsHub.dismissMessages.addListener(this.messageStore.dismissMessages);

        actionsHub.cacheIdentity.addListener(this.identityStore.cacheIdentity);
        actionsHub.beginMaterializingAadGroup.addListener(this.identityStore.beginMaterializingAadGroup);
        actionsHub.failedMaterialization.addListener(this.identityStore.failedMaterialization);
        actionsHub.completeMaterialization.addListener(this.identityStore.completeMaterialization);

        actionsHub.statusesLoaded.addListener(this.statusesStore.onStatusesLoaded);

        actionsHub.createLocalPolicyConfig.addListener(this.policyConfigStore.createLocalPolicyConfig);
        actionsHub.updateLocalPolicyConfig.addListener(this.policyConfigStore.updateLocalPolicyConfig);

        actionsHub.abandonLocalPolicyConfigChanges.addListener(this.policyConfigStore.abandonLocalPolicyConfigChanges);
        actionsHub.abandonAllLocalPolicyConfigChanges.addListener(this.policyConfigStore.abandonAllLocalPolicyConfigChanges);

        actionsHub.serverPolicyConfigCreated.addListener(this.policyConfigStore.onServerPolicyConfigCreated);
        actionsHub.serverPolicyConfigUpdated.addListener(this.policyConfigStore.onServerPolicyConfigUpdated);
        actionsHub.serverPolicyConfigDeleted.addListener(this.policyConfigStore.onServerPolicyConfigDeleted);

        actionsHub.gotBuildDefinitions.addListener(this.buildDefinitionStore.gotBuildDefinitions);

        actionsHub.presetConfigurationUpdated.addListener(this.policyConfigStore.presetConfigurationUpdated);
    }
}

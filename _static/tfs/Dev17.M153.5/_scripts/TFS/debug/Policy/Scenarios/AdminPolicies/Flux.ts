// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
// scenario
import { ActionsHub } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import { ActionCreator } from "Policy/Scenarios/AdminPolicies/Actions/AdminPoliciesActionCreator";
import { StoresHub } from "Policy/Scenarios/AdminPolicies/Stores/StoresHub";
import { SourcesHub } from "Policy/Scenarios/AdminPolicies/Sources/SourcesHub";
import { BuildDefinitionSource } from "Policy/Scenarios/AdminPolicies/Sources/BuildDefinitionSource";
import { PolicyConfigSource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyConfigSource";
import { PolicyIdentitySource } from "Policy/Scenarios/AdminPolicies/Sources/PolicyIdentitySource";

// These let us import what we need from the Flux model using a simple import line like this:
// import { Flux, StoresHub, ActionCreator } from ".../Flux"

export * from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
export * from "Policy/Scenarios/AdminPolicies/Actions/AdminPoliciesActionCreator";
export * from "Policy/Scenarios/AdminPolicies/Stores/StoresHub";
export * from "Policy/Scenarios/AdminPolicies/Sources/SourcesHub";

export interface IFlux {
    tfsContext: TfsContext;
    actionsHub: ActionsHub;
    storesHub: StoresHub;
    actionCreator: ActionCreator;
    sourcesHub: SourcesHub;
}

export class Flux implements IFlux {
    public readonly tfsContext: TfsContext;

    public readonly actionsHub: ActionsHub;
    public readonly storesHub: StoresHub;
    public readonly actionCreator: ActionCreator;
    public readonly sourcesHub: SourcesHub;

    constructor(tfsContext: TfsContext, pageData: any) {
        this.tfsContext = tfsContext;

        this.actionsHub = new ActionsHub();

        this.storesHub = new StoresHub(tfsContext, this.actionsHub, pageData);

        this.sourcesHub = new SourcesHub(
            new BuildDefinitionSource(tfsContext, this.storesHub.adminPoliciesHubStore.repositoryId),
            new PolicyConfigSource(tfsContext),
            new PolicyIdentitySource(tfsContext)
        );

        this.actionCreator = new ActionCreator(tfsContext, this.actionsHub, this.sourcesHub, this.storesHub);

        this.actionCreator.initializeFeatureFlags();
    }
}

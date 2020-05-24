export namespace CreateReleaseKeys {
    export const StoreKey_CreateReleaseStoreKey: string = "STORE_KEY_CREATE_RELEASE_STORE";
    export const ActionsCreatorKey_CreateReleaseActionsCreator: string = "ACTIONS_CREATOR_KEY_CREATE_RELEASE_ACTIONS_CREATOR";
    export const ActionHubKey_CreateReleaseActionHub: string = "ACTION_HUB_KEY_CREATE_RELEASE_ACTION_HUB";
}

export namespace CreateReleasePanelInstances {
    export const CreateReleasePanelInstanceId: string = "CanvasSelector_CreateReleasePanel";
    export const CreateReleaseEnvironmentCanvasItemSelectionInstanceId: string = "CreateRelease_EnvironmentCanvas_ItemSelection"; 
}

export namespace CreateReleaseEnvironmentNodeConstants {
    export const compactEnvironmentNodeHeight: number = 30;
    export const compactEnvironmentNodeWidth: number = 108;
    export const gridCellWidth: number = 5;
    export const gridCellHeight: number = 5;
    export const createReleaseEnvironmentCanvasVerticalMargin: number = 35;
    export const createReleaseEnvironmentCanvasVerticalMarginSmall: number = 20;
    export const createReleaseEnvironmentCanvasHorizontalMargin: number = 60;
    export const createReleaseEnvironmentCanvasHorizontalMarginSmall: number = 30;
    export const createReleaseEnvironmentCanvasLeftMargin: number = 60;
}

export namespace CreateReleaseProgressIndicatorAction {
    export const createReleaseAction: string = "createRelease";
    export const authorizeDeploymentAction: string = "authorizeDeployment";
    export const updateReleaseAction: string = "updateRelease";
    export const initializeDefinitionAction: string = "initializeDefinition";
    export const initializeArtifactVersionsAction: string = "initializeArtifactVersions";
    export const initializeEnvironmentPhaseWarningAction: string = "initializeEnvironmentPhaseWarning";
    export const initializeEnvironmentEndpointsAction: string = "initializeEnvironmentEndpoints";
    export const initializeOverridableVariablesAction: string = "initializeOverridableVariables";
}
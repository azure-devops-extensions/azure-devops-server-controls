import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ContributionConstants } from "CIWorkflow/Scripts/Common/Constants";
import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { StoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { YamlConstants, ContributionId_FeatureFlag_YamlCI } from "CIWorkflow/Scripts/Scenarios/Definition/Yaml";

import { ContributionActions } from "DistributedTaskControls/Actions/ContributionActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { TaskCIHubContributionId } from "DistributedTaskControls/Common/Common";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ContributionsStore } from "DistributedTaskControls/Stores/ContributionsStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { BuildDefinition } from "TFS/Build/Contracts";

import { getHistoryService } from "VSS/Navigation/Services";
import { equals } from "VSS/Utils/String";

export interface IYamlStoreState {
    isYaml: boolean;

    // remove this when YAML cannot be opted out
    isYamlFeatureAvailable: boolean;
}

/**
 * @brief This store invokes listeners if the current definition is of type yaml, be it a brand new definiton from template or an existing definition
 *        listen to this store, if you want to react to any yaml definition process type changes
 * @returns
 */
export class YamlStore extends StoreBase {
    private _buildDefinitionActions: BuildDefinitionActions;
    private _contributionActions: ContributionActions;
    private _contributionsStore: ContributionsStore;
    private _state: IYamlStoreState = null;

    // we could get Yaml availability update after we checked the definition object, so let's store the current one
    private _currentDefinition: BuildDefinition;

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return StoreKeys.StoreKey_YamlStore;
    }

    public initialize(): void {
        this._state = {
            isYaml: false,
            isYamlFeatureAvailable: false
        };

        this._contributionsStore = StoreManager.GetStore<ContributionsStore>(ContributionsStore);

        this._contributionActions = ActionsHubManager.GetActionsHub<ContributionActions>(ContributionActions);
        this._contributionActions.contributionsRetrieved.addListener(this._updateYamlAvailability);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._definitionUpdated);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._definitionUpdated);

        // initialize Yaml availability
        this._updateYamlAvailability();
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._definitionUpdated);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._definitionUpdated);
        this._contributionActions.contributionsRetrieved.removeListener(this._updateYamlAvailability);
    }

    public getState(): IYamlStoreState {
        return this._state;
    }

    private _definitionUpdated = (definition: BuildDefinition) => {
        this._currentDefinition = definition;
        this._updateState();
    }

    private _isYamlContributionAvailable(): boolean {
        let contributions = this._contributionsStore.getContributionsForTarget(TaskCIHubContributionId, ContributionId_FeatureFlag_YamlCI);
        return contributions && !!contributions[0];
    }

    private _updateYamlAvailability = () => {
        let isYamlAvailable = this._isYamlContributionAvailable();
        if (this._state.isYamlFeatureAvailable !== isYamlAvailable) {
            this._state.isYamlFeatureAvailable = isYamlAvailable;
            this.emitChanged();
            this._updateState();
        }
    }

    private _updateState() {
        let isYaml = this._isYamlDefinition();
        if (this._state.isYaml !== isYaml) {
            this._state.isYaml = isYaml;
            this.emitChanged();
        }
    }

    private _isYamlDefinition(): boolean {
        let isYaml = this._state.isYamlFeatureAvailable && isYamlDefinition(this._currentDefinition);
        return isYaml;
    }
}

export function isYamlDefinition(definition: BuildDefinition) {
    let isYaml = false;
    let checkDefinitionProcess = true;
    const definitionId = (definition && definition.id) || -1;
    // if id isn't valid, this is a brand new definition, in which case we look for navigation state to determine if this is of type YAML or not
    if (definitionId === -1) {
        const currentState = getHistoryService().getCurrentState();
        isYaml = !!currentState[YamlConstants.isYamlProperty];
    }

    if (definition && !isYaml) {
        let process = definition.process;
        if (process) {
            isYaml = process.type === ProcessType.Yaml;
        }
    }

    return isYaml;
}

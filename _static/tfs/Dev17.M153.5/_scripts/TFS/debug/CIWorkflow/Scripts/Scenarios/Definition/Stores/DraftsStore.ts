import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { BuildDefinition, DefinitionReference } from "TFS/Build/Contracts";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";

export interface IDraftsStoreState {
    currentDefinitionId?: number;
    drafts?: DefinitionReference[];
}

/**
 * @brief Stores build definition drafts returned initially by the data provider. Consequent API calls
 * do not return build definition drafts so we relly on this store to set drafts back to the definition.
 * @returns
 */
export class DraftsStore extends Store {
    private _buildDefinitionActions: BuildDefinitionActions;
    private _state: IDraftsStoreState = {};

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_DraftsStore;
    }

    public initialize(): void {
        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._definitionUpdated);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._definitionUpdated);
    }

    public getState(): IDraftsStoreState {
        return this._state;
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (this._state.currentDefinitionId === buildDefinition.id) {
            buildDefinition.drafts = this._state.drafts;
        }
        return buildDefinition;
    }

    public isDirty(): boolean {
        return false;
    }

    public isValid(): boolean {
        return true;
    }

    private _definitionUpdated = (definition: BuildDefinition): void => {
        if (!definition) {
            return;
        }

        if (this._state.currentDefinitionId !== definition.id) {
            this._state = {
                currentDefinitionId: definition.id,
                drafts: definition.drafts,
            }
        }
    }
}

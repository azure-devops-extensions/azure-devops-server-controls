import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IVisibilityPayload, ReleaseEnvironmentPropertiesContributionsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsActions";

import { autobind } from "OfficeFabric/Utilities";

export type ContributionsVisibilityMap = IDictionaryStringTo<boolean>;

export interface IReleaseEnvironmentPropertiesContributionsState {
    contributions: Contribution[];
    instanceIdToContributionsVisibilityMap: IDictionaryStringTo<ContributionsVisibilityMap>;
}

export class ReleaseEnvironmentPropertiesContributionsStore extends StoreBase {

    constructor() {
        super();

        this._state = {
            contributions: [],
            instanceIdToContributionsVisibilityMap: {}
        };

        this._visibleContributions = {};
    }

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentPropertiesContributionsStore;
    }

    public initialize(instanceId: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseEnvironmentPropertiesContributionsActions>(ReleaseEnvironmentPropertiesContributionsActions);

        this._actionsHub.updateContributions.addListener(this._handleUpdateContributions);
        this._actionsHub.updateVisibility.addListener(this._handleExtensionUpdateVisibility);
    }

    protected disposeInternal(): void {
        this._actionsHub.updateContributions.removeListener(this._handleUpdateContributions);
        this._actionsHub.updateVisibility.removeListener(this._handleExtensionUpdateVisibility);        
    }

    public getState(): IReleaseEnvironmentPropertiesContributionsState {
        return this._state;
    }

    public getVisibleContributions(): IDictionaryStringTo<number> {
        return this._visibleContributions;
    }
 
    @autobind
    private _handleUpdateContributions(contributions: Contribution[]): void {
        this._state.contributions = contributions;
        this.emitChanged();
    }

    @autobind
    private _handleExtensionUpdateVisibility(updateVisibilityPayload: IVisibilityPayload): void {
        if (!this._state.instanceIdToContributionsVisibilityMap[updateVisibilityPayload.environmentInstanceId]) {
            this._state.instanceIdToContributionsVisibilityMap[updateVisibilityPayload.environmentInstanceId] = {};
            this._visibleContributions[updateVisibilityPayload.environmentInstanceId] = 0;
        }

        // Check if state is updated or not
        let contributionVisibilityMap: ContributionsVisibilityMap = this._state.instanceIdToContributionsVisibilityMap[updateVisibilityPayload.environmentInstanceId];

        if (contributionVisibilityMap[updateVisibilityPayload.extensionid] !== updateVisibilityPayload.isVisible) {

            // Update visibility
            if (updateVisibilityPayload.isVisible) {
                this._visibleContributions[updateVisibilityPayload.environmentInstanceId]++;
            }
            else {
                // Decrement if visibility count is not already 0
                if (this._visibleContributions[updateVisibilityPayload.environmentInstanceId] > 0) {
                    this._visibleContributions[updateVisibilityPayload.environmentInstanceId]--;
                } 
            }

            contributionVisibilityMap[updateVisibilityPayload.extensionid] = updateVisibilityPayload.isVisible;
            this._state.instanceIdToContributionsVisibilityMap[updateVisibilityPayload.environmentInstanceId] = contributionVisibilityMap;
            this.emitChanged();
        }
    }

    private _state: IReleaseEnvironmentPropertiesContributionsState;
    private _actionsHub: ReleaseEnvironmentPropertiesContributionsActions;
    private _visibleContributions: IDictionaryStringTo<number>;
}
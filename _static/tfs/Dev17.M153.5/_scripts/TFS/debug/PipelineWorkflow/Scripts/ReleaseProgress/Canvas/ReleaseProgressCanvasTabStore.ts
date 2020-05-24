import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { ReleaseProgressCanvasTabActionsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTabActionsHub";
import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

import { autobind } from "OfficeFabric/Utilities";

export interface IReleaseProgressCanvasTabStoreState {
    showEnvironmentsSummaryView: boolean;
}

export class ReleaseProgressCanvasTabStore extends StoreBase {
    public constructor() {
        super();
        this._currentState = {
            showEnvironmentsSummaryView: false
        };
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseProgressCanvasTabActionsHub>(ReleaseProgressCanvasTabActionsHub);
        this._actionsHub.showEnvironmentsSummaryView.addListener(this._handleShowEnvironmentsSummaryView);
    }

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseProgressCanvasTabStore;
    }

    public getState(): IReleaseProgressCanvasTabStoreState {
        return this._currentState;
    }

    protected disposeInternal(): void {
        this._actionsHub.showEnvironmentsSummaryView.removeListener(this._handleShowEnvironmentsSummaryView);
    }

    @autobind
    private _handleShowEnvironmentsSummaryView(showEnvironmentsSummaryView: boolean): void {
        if (this._currentState) {
            this._currentState.showEnvironmentsSummaryView = showEnvironmentsSummaryView;
            this.emitChanged();
        }
    }

    private _currentState: IReleaseProgressCanvasTabStoreState;
    private _actionsHub: ReleaseProgressCanvasTabActionsHub;
}
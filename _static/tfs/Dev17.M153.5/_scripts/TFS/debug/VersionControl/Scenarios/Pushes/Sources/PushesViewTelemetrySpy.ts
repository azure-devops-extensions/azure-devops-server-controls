import { IScenarioDescriptor, getScenarioManager } from "VSS/Performance";

import * as Actions from "VersionControl/Scenarios/Pushes/ActionsHub";
import { ActionListener } from "VersionControl/Scenarios/Shared/ActionListener";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export class PushesViewTelemetrySpy {
    private _actionListner: ActionListener;
    private _applySearchCriteriaScenario: IScenarioDescriptor;
    private _showMorePushesScenario: IScenarioDescriptor;
    private performanceScenario = getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        "PushesViewPerformance",
        true);

    constructor(actionsHub: Actions.ActionsHub) {
        this._actionListner = new ActionListener();

        this.performanceScenario.addSplitTiming("startedInitialization");
        this._actionListner.addListener(actionsHub.pushesSearchCriteriaChanged, this._startSearchChangedScenario);
        this._actionListner.addListener(actionsHub.moreBranchUpdatesLoadStarted, this._startShowmoreClickedScenario);
    }

    public notifyScenarioChanged = (): void => {
        // individual methods will log telemetry only if scenario was active
        this._notifySearchCriteriaChanged();
        this._notifyShowmoreCriteriaChanged();
        this._notifyContentRendered();
    }

    public dispose = (): void => {
        if (this._actionListner) {
            this._actionListner.disposeActions();
            this._actionListner = undefined;
        }
    }

    private _startSearchChangedScenario = (): void => {
        this._applySearchCriteriaScenario = getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            "Git.PushesView.ApplySearchCriteria");
    }

    private _startShowmoreClickedScenario = (): void => {
        this._showMorePushesScenario = getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.BRANCH_UPDATES_LIST_SHOW_MORE_PERF);
    }

    private _notifySearchCriteriaChanged = (): void => {
        if (this._applySearchCriteriaScenario && this._applySearchCriteriaScenario.isActive()) {
            this._applySearchCriteriaScenario.addSplitTiming("searchCriteriaChanged");
            this._applySearchCriteriaScenario.end();
        }
    }

    private _notifyShowmoreCriteriaChanged = (): void => {
        if (this._showMorePushesScenario && this._showMorePushesScenario.isActive()) {
            this._showMorePushesScenario.end();
        }
    }

    private _notifyContentRendered = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("contentRendered");
            this.performanceScenario.end();
        }
    }
}

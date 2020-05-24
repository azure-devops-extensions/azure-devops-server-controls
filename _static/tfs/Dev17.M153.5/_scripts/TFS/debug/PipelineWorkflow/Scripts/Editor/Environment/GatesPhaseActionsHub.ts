import { ActionCreatorBase, ActionsHubBase, Action } from "DistributedTaskControls/Common/Actions/Base";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

export class GatesPhaseActionsHub extends ActionsHubBase{
    public static getKey(): string {
        return "GatesPhaseActionsHub";
    }
    
    public initialize(instanceId?: string): void {
        this._updateStabilizationTime = new Action<IDuration>();
        this._updateTimeout = new Action<IDuration>();
        this._updateSamplingInterval = new Action<IDuration>();
        this._updateMinimumSuccessDuration = new Action<IDuration>();
    }

    public get updateStabilizationTime(): Action<IDuration> {
        return this._updateStabilizationTime;
    }

    public get updateTimeout(): Action<IDuration> {
        return this._updateTimeout;
    }

    public get updateSamplingInterval(): Action<IDuration> {
        return this._updateSamplingInterval;
    }

    public get updateMinimumSuccessDuration(): Action<IDuration> {
        return this._updateMinimumSuccessDuration;
    }

    private _updateStabilizationTime: Action<IDuration>;
    private _updateTimeout: Action<IDuration>;
    private _updateSamplingInterval: Action<IDuration>;
    private _updateMinimumSuccessDuration: Action<IDuration>;    
}
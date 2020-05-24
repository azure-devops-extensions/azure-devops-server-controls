import { SelectedPathChangedPayload } from "VersionControl/Scenarios/History/CommonPayloadInterfaces"
import { ActionsHub } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionsHub";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export class TelemetrySpy {

    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryType: RepositoryType) {

        this._actionsHub.selectedPathChanged.addListener(this._selectionPathChangedListener);
        this._actionsHub.pathEditingStarted.addListener(this._pathEditingStartedListener);
    }

    public dispose(): void {
        this._actionsHub.selectedPathChanged.removeListener(this._selectionPathChangedListener);
        this._actionsHub.pathEditingStarted.removeListener(this._pathEditingStartedListener);
    }

    private _selectionPathChangedListener = (payload: SelectedPathChangedPayload) =>
        publishEvent(new TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.HISTORY_PATHCONTROL_PATH_CHANGE,
            {
                repositoryType: RepositoryType[this._repositoryType],
                source: payload.trigger,
            }));

    private _pathEditingStartedListener = (payload: string) =>
        publishEvent(new TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.HISTORY_PATH_EDIT_START,
            {
                repositoryType: RepositoryType[this._repositoryType],
            }));
}

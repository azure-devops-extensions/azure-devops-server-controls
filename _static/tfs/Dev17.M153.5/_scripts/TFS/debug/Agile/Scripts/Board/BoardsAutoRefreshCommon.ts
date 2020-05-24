import Telemetry = require("VSS/Telemetry/Services");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

import { EmbeddedHelper } from "Agile/Scripts/Common/EmbeddedHelper";

export module Settings {
    // This property is set to true for the session in which common settings config is changed.
    // It will be used to show manual refresh notification in Kanban board for all sessions,
    // except the session in which common settings config is changed.
    export var BoardSettingsChangedInCurrentSession = "VSS.Agile.Boards.SettingsChangedInCurrentSession";
}

export module Events {
    export var ItemsNeedAutoRefresh = "VSS.Agile.Boards.ItemsNeedAutoRefresh";
    export var CommonSettingsChanged = "VSS.Agile.Boards.CommonSettingsChanged";
    export var SignalRConnectionRevived = "VSS.Agile.Boards.SignalRConnectionRevived";
    export var SignalRConnectionStartTimedOut = "VSS.Agile.Boards.SignalRConnectionStartTimedOut";
    export var SignalRConnectionStarted = "VSS.Agile.Boards.SignalRConnectionStarted";
    export var ItemsAutoRefreshCompleted = "VSS.Agile.Boards.ItemsAutoRefreshCompleted";
    export var RefreshBoard = "VSS.Agile.Boards.RefreshBoard";
}

export module EventType {
    export var ItemUpdated = "Updated";
    export var ItemAdded = "Added";
    export var ItemDeleted = "Deleted";
    export var ItemRestored = "Restored";
    export var ItemCreated = "Created";
    export var ItemRemoved = "Removed";
}

export module TracePoints {
    export var ErrorInUpdate = "Board.autorefresh.update.error";
    export var WarningInUpdateNotOnBoard = "Board.autorefresh.update.warning.notonboard";
    export var WarningInUpdateAlreadyFresh = "Board.autorefresh.update.warning.alreadyfresh";
    export var ErrorInAdd = "Board.autorefresh.add.error";
    export var WarningInAddAlreadyOnBoard = "Board.autorefresh.add.warning.alreadyonboard";
    export var WarningInDeleteNotOnBoard = "Board.autorefresh.delete.warning.notonboard";
    export var ErrorInRestore = "Board.autorefresh.restore.error";
    export var InfoInRestoreAlreadyOnBoard = "Board.autorefresh.restore.info.alreadyonboard";
    export var ErrorUnknownEventType = "Board.autorefresh.error.unknowneventtype";
}

export class AutoRefreshEventPayload {
    public id: number;
    public changeType: string;
    public revision: number;
    public stackRank: string;
    public wasWorkItemAttached: boolean;
    public forceRefresh: boolean;

    public constructor(payload: { id: number, changeType: string, revision: number, stackRank: string }) {
        this.id = payload.id;
        this.changeType = payload.changeType;
        this.revision = payload.revision;
        this.stackRank = payload.stackRank;
        this.wasWorkItemAttached = false;
        this.forceRefresh = false;
    }
}

export enum AutoRefreshState {
    ENABLED,
    DISABLED
}

export interface AutoRefreshCommandSettings {
    state: AutoRefreshState;
    onEnabled(): void;
    onDisabled(): void;
}

/**
 * Used to log telemtry for events related to BoardRefresh.
 */
export function PublishAutoRefreshTelemetry(eventType: string, extensionId: string, ciData: IDictionaryStringTo<any>, immediate: boolean = false): void {
    ciData["EventType"] = eventType;
    ciData["ExtensionId"] = extensionId;
    ciData["IsEmbedded"] = EmbeddedHelper.isEmbedded();
    Telemetry.publishEvent(
        new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.KANBANBOARD_AUTOREFRESH,
            ciData),
        immediate);
}



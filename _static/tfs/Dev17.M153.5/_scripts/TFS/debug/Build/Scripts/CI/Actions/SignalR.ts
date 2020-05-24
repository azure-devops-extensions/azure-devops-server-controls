import { HubBase, HubFactory } from "Build/Scripts/Realtime";
import { loadSignalR } from "Build/Scripts/SignalR";

import { getService as getEventsService, EventService } from "VSS/Events/Services";
import { Action } from "VSS/Flux/Action";

export interface ISignalRActionCreatorProps {
    actionHub?: SignalRActionHub;
    eventService?: EventService;
}

export class SignalRActionCreator {
    private static s_eventScope = "CI.SignalR";

    private _actionHub: SignalRActionHub;
    private _hub: HubBase;
    private _eventService: EventService;

    private _eventSubscribedState: IDictionaryStringTo<Boolean> = {};
    private _projectSubscribedState: IDictionaryStringTo<Boolean> = {};

    constructor(options: ISignalRActionCreatorProps) {
        this._actionHub = options.actionHub || new SignalRActionHub();
        this._eventService = options.eventService || getEventsService();
    }

    public subscribeToEvents<T>(projectId: string, events: string[]) {
        this._subscribeToProject(projectId);

        (events || []).forEach((eventName) => {
            if (!this._eventSubscribedState[eventName]) {
                this._eventService.attachEvent(eventName, (sender, payload: T) => {
                    this._actionHub.getEventPayloadAvailableAction<T>(eventName).invoke(payload);
                });
            }
        });

    }

    private _subscribeToProject(projectId: string) {
        if (!this._projectSubscribedState[projectId]) {
            loadSignalR().then(() => {
                if (!this._hub) {
                    this._hub = HubFactory.createRealTimeHub(null);
                }

                this._hub.subscribeToProject(projectId);
                this._projectSubscribedState[projectId] = true;
            });
        }

    }

    public dispose() {
        if (this._hub) {
            this._hub.stop();
            this._hub = null;
        }

        this._projectSubscribedState = {};

        this._eventService.disposeScope(SignalRActionCreator.s_eventScope);

        this._eventSubscribedState = {};

        this._actionHub.dispose();
    }
}

export class SignalRActionHub {
    private _eventAvailableActionsMap: IDictionaryStringTo<Action<any>>;

    constructor() {
        this._eventAvailableActionsMap = {}
    }

    public dispose() {
        this._eventAvailableActionsMap = {};
    }

    public getEventPayloadAvailableAction<T>(eventName: string): Action<T> {
        if (!this._eventAvailableActionsMap[eventName]) {
            this._eventAvailableActionsMap[eventName] = new Action<T>();
        }

        return this._eventAvailableActionsMap[eventName];
    }
}
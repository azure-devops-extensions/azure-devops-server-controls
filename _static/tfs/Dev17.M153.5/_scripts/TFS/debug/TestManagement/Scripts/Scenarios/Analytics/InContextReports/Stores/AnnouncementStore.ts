import { AnnouncementActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/AnnouncementActions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { Store } from "VSS/Flux/Store";

export interface IAnnouncementState {
	announcementText: string;
}

export class AnnouncementStore extends Store {

	constructor(private _instanceId?: string) {
		super();
		this._initialize();
	}

	public static getInstance(instanceId?: string): AnnouncementStore {
		return FluxFactory.instance().get(AnnouncementStore, instanceId);
	}

	public static getKey(): string {
        return "AnnouncementStore";
	}

	public getState(): IAnnouncementState {
		return this._state;
	}

	public dispose(): void {
		this._actions.announceAction.removeListener(this._onUpdateAnnouncement);
	}

	private _initialize(): void {
        this._actions = AnnouncementActions.getInstance(this._instanceId);
        this._state = {} as IAnnouncementState;

        this._actions.announceAction.addListener(this._onUpdateAnnouncement);
	}
	
	private _onUpdateAnnouncement = (announcementText: string) => {
		this._state.announcementText = announcementText;

		this.emitChanged();
	}

	private _actions: AnnouncementActions;
	private _state: IAnnouncementState;
}
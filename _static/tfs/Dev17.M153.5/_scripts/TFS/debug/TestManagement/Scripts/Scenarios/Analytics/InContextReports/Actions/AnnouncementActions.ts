import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { Action } from "VSS/Flux/Action";

export class AnnouncementActions {
    
    constructor() {
        this._announceAction = new Action<string>();
    }

    public static getInstance(instanceId?: string): AnnouncementActions {
        return FluxFactory.instance().get(AnnouncementActions, instanceId);
    }

    public static getKey(): string {
        return "AnnouncementActions";
    }

    public get announceAction(): Action<string> {
        return this._announceAction;
    }

    public dispose(): void {
    }

    private _announceAction: Action<string>;
}
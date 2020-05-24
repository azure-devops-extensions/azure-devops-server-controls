import { IWorkItemsHubTriageData, setWorkItemsHubTriageData } from "WorkItemsHub/Scripts/WorkItemsViewRegistration";

export interface TriageDataUpdateEvent<T> extends CustomEvent {
    detail: T;
}

export class TriageDataEventHandler implements IDisposable {
    constructor(){
        document.body.addEventListener("triageDataUpdated", this.onTriageDataUpdated);
    }

    public dispose(): void {
        document.body.removeEventListener("triageDataUpdated", this.onTriageDataUpdated);
    }

    private onTriageDataUpdated = (event: TriageDataUpdateEvent<IWorkItemsHubTriageData>) => {
        setWorkItemsHubTriageData(event.detail);
    }
}

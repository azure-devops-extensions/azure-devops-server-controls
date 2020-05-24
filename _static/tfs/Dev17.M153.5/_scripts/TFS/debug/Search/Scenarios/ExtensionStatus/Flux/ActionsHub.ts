import * as Contracts from "Search/Scenarios/ExtensionStatus/Contracts";
import { Action } from "VSS/Flux/Action";


export interface ExtensionStatusRetrievalFailedPayload {
    error: any;
}

export class ActionsHub {
    public extensionStateDataLoaded = new Action<Contracts.ExtensionManagementDefaultServiceData>();
	public extensionStatusRetrievalFailed = new Action<ExtensionStatusRetrievalFailedPayload>();
	public extensionStateDataLoadStarted = new Action();
}
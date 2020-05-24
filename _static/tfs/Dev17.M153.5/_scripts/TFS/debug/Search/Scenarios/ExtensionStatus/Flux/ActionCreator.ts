import * as Sources_Extensions from "Search/Scenarios/ExtensionStatus/Flux/Sources/ExtensionSources";
import * as Contracts from "Search/Scenarios/ExtensionStatus/Contracts";
import { ActionsHub } from "Search/Scenarios/ExtensionStatus/Flux/ActionsHub";

export class ActionCreator {
    private readonly actionsHub: ActionsHub;    
    private readonly source: Sources_Extensions.ExtensionSource;

    constructor(actionsHub : ActionsHub){
        this.actionsHub = actionsHub;
        this.source = new Sources_Extensions.ExtensionSource();
    }
    
    public loadInitialState = (): void => {
	    this.actionsHub.extensionStateDataLoadStarted.invoke({});
        this.source.beginGetExtensionStatus()
        .then((allExtensionsData : Contracts.ExtensionManagementDefaultServiceData) => {
            this.actionsHub.extensionStateDataLoaded.invoke(allExtensionsData);
        }, error => {
		    this.actionsHub.extensionStatusRetrievalFailed.invoke({ error });
		});
    }

    public navigateToMarketplace = (url: string): void => {
        window.open(url, "_blank");
    }
}

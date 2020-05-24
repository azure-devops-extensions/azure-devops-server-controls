import * as VSSStore from "VSS/Flux/Store";
import * as Contracts from "Search/Scenarios/ExtensionStatus/Contracts";

export interface IExtensionStoreState {
    allExtensionsData: Contracts.ExtensionManagementDefaultServiceData;
    isInitialized: boolean;
    isError: boolean;
}

export function getExtensionStoreEmptyState(): IExtensionStoreState {
    return {
        allExtensionsData: null,
        isInitialized: false,
        isError: false
    };
}

export class ExtensionStore extends VSSStore.Store {
    public extensionStoreState: IExtensionStoreState = getExtensionStoreEmptyState();

    public onLoadExtensionStateData = (payload: Contracts.ExtensionManagementDefaultServiceData): void => {
        this.extensionStoreState.allExtensionsData = payload;
        this.extensionStoreState.isInitialized = true;
        this.emitChanged();
    }

    public onStartLoadExtensionStateData = (): void => {
        // do nothing
    }

    public onExtensionStatusRetrievalFailed = (): void => {
        this.extensionStoreState.isError = true;
        this.emitChanged();
    }
}

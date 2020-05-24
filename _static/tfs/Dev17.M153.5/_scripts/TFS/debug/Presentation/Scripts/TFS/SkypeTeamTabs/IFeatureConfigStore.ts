
import { IStore } from "VSS/Flux/Store";
import * as microsoftTeams from "@microsoft/teams-js";

export interface IFeatureConfigStore<V> extends IStore {

    /**
     * Returns an object with the current store data in a format to be rendered by an accompanying component.
     */
    getValue: () => V;

    /**
     * Checks if the current config data is valid to be saved as a tab.
     */
    isValueValid: () => boolean;

    /**
     * Returns store as an object in the MS Teams sdk format.
     */
    getTabSettings: () => microsoftTeams.settings.Settings;

    /**
     * Gets any Error messages that need to be displayed by the top level component
     * Will display the return value if the return value is not null.
     */
    getErrorMessage: () => string;

    /** 
     * Dismisses the error message for the given store
     */
    dismissErrorMessage: () => void;

}
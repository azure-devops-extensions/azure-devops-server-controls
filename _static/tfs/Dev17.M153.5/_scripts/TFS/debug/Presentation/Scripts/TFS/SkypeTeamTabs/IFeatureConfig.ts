
import { IFeatureConfigStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfigStore";
import { ComponentClass } from "react";
import { MSTeamsTheme } from "Presentation/Scripts/TFS/SkypeTeamTabs/MSTeamsTheme";
import * as microsoftTeams from "@microsoft/teams-js";

/**
 * Props that will be passed to the feature config component in an IFeatureConfig instance.
 */
export interface IFeatureConfigComponentProps<AC, V> {
    /** The action creator for the feature config */
    actionCreator: AC;

    /** The value of the store of the feature config */
    value: V;

    /** The color theme currently active in Microsoft Teams */
    msTeamsTheme: MSTeamsTheme;
}

export interface IFeatureConfig<AC, V, P extends IFeatureConfigComponentProps<AC, V>> {
    /**
     * A store which has a method for verification of data, and for getting props for the config to render.
     */
    store: IFeatureConfigStore<V>;

    /**
     * An action creator that gets passed to the config component.
     */
    actionCreator: AC;

    /**
     * A React Class to be rendered with props received from the store.
     */
    configComponent: ComponentClass<P>;

    /**
     * A function to call when the config is saved. This allows a feature to run custom code when the save button is pressed.
     * Implementers of this function must make a call to saveEvent.notifySuccess() or saveEvent.notifyFailure() to complete the save action.
     */
    onSave?: (saveEvent: microsoftTeams.settings.SaveEvent) => void;

    /**
     * Display name for the radio button option
     */
    displayName: string;

    /**
     * key for the radio button and the dictionary that uses this object.
     */
    key: string;

    /**
     * description of the current feature
     */
    description: string;

    /**
     * A Url linking to documentation of the current feature.
     */
    learnMoreUrl: string;

    /**
     * The text appearance for the learn more link.
     */
    learnMoreText: string;
}
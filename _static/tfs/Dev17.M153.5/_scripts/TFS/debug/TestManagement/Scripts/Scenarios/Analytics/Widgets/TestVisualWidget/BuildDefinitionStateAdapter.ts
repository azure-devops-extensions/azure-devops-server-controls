import * as Service from "VSS/Service";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";

import { ConfigState } from "VSSPreview/Config/Framework/ConfigState";
import { ConfigActionCreator } from "VSSPreview/Config/Framework/ConfigActionCreator";

/**
 * Components within a config can depend on data provided by other components.
 *
 * This class provides a strongly typed abstraction around lists of build definitions in Widget Config State.
 * Analagous to "AnalyticsSelector"
 */
export class BuildDefinitionStateAdapter {
    private static buildsKey = "ms.vsts.data.builds";

    public static isBuildsLoaded(state: ConfigState): boolean {
        return state.properties[BuildDefinitionStateAdapter.buildsKey] != null;
    }

    public static getBuilds(state: ConfigState): BuildDefinition[] {
        return state.properties[BuildDefinitionStateAdapter.buildsKey] as BuildDefinition[];
    }

    public static setBuilds(actionCreator: ConfigActionCreator, buildDefinitions: BuildDefinition[]): void {
        actionCreator.setProperty(BuildDefinitionStateAdapter.buildsKey, buildDefinitions);
    }
}
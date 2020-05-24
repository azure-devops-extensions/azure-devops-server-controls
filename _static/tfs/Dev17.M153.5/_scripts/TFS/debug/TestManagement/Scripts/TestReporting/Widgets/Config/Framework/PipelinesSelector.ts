import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";
import { Release } from "Widgets/Scripts/DataServices/ConfigurationQueries/Release";

import { PipelinesPropertyKeys } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesPropertyKeys";

/**
 * Components within a config can depend on data provided by other components.
 *
 * These shared data are stored in the ConfigState in an un-typed property bag.
 *
 * This class provides convenience methods to get strongly typed data out of this un-typed property bag.
 */
export class PipelinesSelector {

    public isBuildPipelinesLoaded(properties: { [key: string]: any }): boolean {
        return properties[PipelinesPropertyKeys.BuildPipelines] !== undefined;
    }

    public getBuildPipelines(properties: { [key: string]: any }): { [key: string]: BuildDefinition } {
        return properties[PipelinesPropertyKeys.BuildPipelines] as { [key: string]: BuildDefinition };
    }

    public isReleasePipelinesLoaded(properties: { [key: string]: any }): boolean {
        return properties[PipelinesPropertyKeys.ReleasePipelines] !== undefined;
    }

    public getReleasePipelines(properties: { [key: string]: any }): { [key: string]: Release } {
        return properties[PipelinesPropertyKeys.ReleasePipelines] as { [key: string]: Release };
    }
}
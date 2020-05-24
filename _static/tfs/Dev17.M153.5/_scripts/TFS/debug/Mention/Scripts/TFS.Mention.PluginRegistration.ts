import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import { IAutocompletePlugin, IAutocompletePluginOptions } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { IMentionParser } from "Mention/Scripts/TFS.Mention";
import { IAutocompletePluginConfig } from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import { WorkItemAutocompleteProvider } from "Mention/Scripts/TFS.Mention.WorkItems";
import "Mention/Scripts/TFS.Mention.WorkItems.Registration";  // to register work-item mention parser and provider
import "Mention/Scripts/TFS.Mention.People.Registration"; // to register people mention parser and provider
import { PersonAutocompleteProvider } from "Mention/Scripts/TFS.Mention.People";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export enum MentionPluginType {
    WorkItem,
    Person,
    PullRequest
}

interface IAutocompletePluginRegistration {
    requiredModules: string[];
    pluginConfig?: IAutocompletePluginConfig<IAutocompletePluginOptions>;
    featureFlag?: string;
}

var autocompletePluginRegistration: IDictionaryStringTo<IAutocompletePluginRegistration> = {
    [MentionPluginType.PullRequest]: {
        requiredModules: ["VersionControl/Scripts/Mentions/PullRequestMentionAutocomplete"],
        featureFlag: FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions
    }
};

export const ERROR_NO_REGISTERED_PLUGIN_TYPE: string = "NoMentionPluginRegisteredError";
export const ERROR_FAILED_TO_FIND_PLUGIN_TYPE: string = "FailToFindMentionPluginError";
export const ERROR_FEATURE_FLAG_DISABLED_TYPE: string = "MentionPluginFeatureFlagDisabledError";

/**
 * Get autocomplete plugins for the given mention types
 * @returns Promises resolving to the plugin configurations for the provided mention types
 */
export function getMentionPlugins(pluginTypes: MentionPluginType[]): IAutocompletePluginConfig<IAutocompletePluginOptions>[] {
    let pluginConfigs: IAutocompletePluginConfig<IAutocompletePluginOptions>[] = [];

    pluginTypes.forEach(pluginType => {
        // The original plugins can just be instantiated directly
        if(pluginType === MentionPluginType.WorkItem) {
            pluginConfigs.push({factory: options => new WorkItemAutocompleteProvider(options)});
        }
        else if(pluginType === MentionPluginType.Person) {
            pluginConfigs.push({factory: options => new PersonAutocompleteProvider(options)});
        }
        else {
            // For all other plugins, find the required objects and attempt to instantiate the factory
            let registration = autocompletePluginRegistration[pluginType];
            
            if (!registration) {
                pluginConfigs.push({
                    factoryPromise: Q.reject({
                        message: `No autocomplete plugin exists for the given plugin type '${pluginType}'.`,
                        type: ERROR_NO_REGISTERED_PLUGIN_TYPE
                    })
                });
            }
            else if (registration.pluginConfig) {
                pluginConfigs.push(registration.pluginConfig);
            }
            else if (!registration.featureFlag || FeatureAvailabilityService.isFeatureEnabled(registration.featureFlag, false)) {
                registration.pluginConfig = { factoryPromise: Q.Promise((resolve, reject) => {
                    VSS.using(registration.requiredModules, (pluginFactory) => {
                        resolve(options => { return pluginFactory.createPlugin(options) });
                    }, (error) => {
                        reject({
                            message: `Failed to find required module for ${pluginType} plugin`,
                            type: ERROR_FAILED_TO_FIND_PLUGIN_TYPE
                        });
                    });
                })};
    
                pluginConfigs.push(registration.pluginConfig);
            }
        }
    });

    return pluginConfigs;
}
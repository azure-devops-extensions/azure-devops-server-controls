import Q = require("q");
import VSS = require("VSS/VSS");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import { getContributedLinkedArtifactDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/ContributedDataProviderAdapter";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

interface IInternalDataProviderRegistration {
    requiredModules: string[];
    instancePromise?: IPromise<ILinkedArtifactsDataProvider>;
}

const internalDataProviderRegistration: IDictionaryStringTo<IInternalDataProviderRegistration> = {
    [Artifacts_Constants.ToolNames.WorkItemTracking.toLowerCase()]: {
        requiredModules: ["WorkItemTracking/Scripts/DataProviders/LinkedWorkItemDataProvider"]
    },

    [Artifacts_Constants.ToolNames.RemoteWorkItemTracking.toLowerCase()]: {
        requiredModules: ["WorkItemTracking/Scripts/DataProviders/RemoteLinkedWorkItemDataProvider"]
    },

    [Artifacts_Constants.ToolNames.TeamBuild.toLowerCase()]: {
        requiredModules: ["Build.Common/Scripts/DataProvider/LinkedArtifactsDataProvider"]
    },

    [Artifacts_Constants.ToolNames.Git.toLowerCase()]: {
        requiredModules: ["VersionControl/Scripts/DataProviders/GitDataProvider"]
    },

    [Artifacts_Constants.ToolNames.VersionControl.toLowerCase()]: {
        requiredModules: ["VersionControl/Scripts/DataProviders/VersionControlDataProvider"]
    },

    [Artifacts_Constants.ToolNames.Requirements.toLowerCase()]: {
        requiredModules: ["Requirements/Scripts/DataProviders/ExternalLinkDataProvider"]
    },

    [Artifacts_Constants.ToolNames.Hyperlink.toLowerCase()]: {
        requiredModules: ["Requirements/Scripts/DataProviders/ExternalLinkDataProvider"]
    },

    [Artifacts_Constants.ToolNames.TestManagement.toLowerCase()]: {
        requiredModules: ["TestManagement/Scripts/DataProviders/TestManagementDataProvider"]
    },

    [Artifacts_Constants.ToolNames.Wiki.toLowerCase()]: {
        requiredModules: ["Wiki/Scripts/LinkedArtifactsDataProvider"]
    },

    [Artifacts_Constants.ToolNames.GitHub.toLowerCase()]: {
        requiredModules: ["WorkItemTracking/Scripts/DataProviders/GitHubDataProvider"]
    }
};

const DATAPROVIDER_RESOLUTION_TIMEOUT_IN_MS: number = 30000;
export const ERROR_NODATAPROVIDERREGISTERED_TYPE: string = "NoDataProviderRegisteredError";

/**
 * Get data provider instance for the given tool
 * @param tool Tool to return data provider for
 * @returns Promise resolving to data provider instance
 */
export function getLinkedArtifactProvider(tool: string): IPromise<ILinkedArtifactsDataProvider> {
    tool = tool.toLowerCase();

    const registration = internalDataProviderRegistration[tool];

    if (!!registration){
        if (registration.instancePromise) {
            // Data providers are singletons so return any promise (resolved or ongoing) if there is already one
            return registration.instancePromise;
        }else{
            return createBuiltInLinkedArtifactProvider(registration, tool);
        }
    }

    // And inbuilt DataProvider not found. Try searching extensions providing the dataprovider.
    return getContributedLinkedArtifactDataProvider(tool).then((dataProvider: ILinkedArtifactsDataProvider)=>{
        return dataProvider;
    }, (err: any)=>{
        return Q.reject({
            message: `No linked artifacts provider registered for tool '${tool}'.`,
            type: ERROR_NODATAPROVIDERREGISTERED_TYPE
        });
    });
}

function createBuiltInLinkedArtifactProvider(registration: any, tool: string): IPromise<ILinkedArtifactsDataProvider>{

    let defer = Q.defer<ILinkedArtifactsDataProvider>();

    // Ensure any required module is loaded, then create new instance
    VSS.using(
        registration.requiredModules,
        (dataProvider: { default: new () => ILinkedArtifactsDataProvider }) => {
            try {
                defer.resolve(new dataProvider.default());
            } catch (e) {
                defer.reject(e);
            }
        },
        (error) => {
            defer.reject(error);
        }
    );

    registration.instancePromise = defer.promise
        .timeout(
            DATAPROVIDER_RESOLUTION_TIMEOUT_IN_MS,
            `Could not resolve linked artifacts for tool '${tool}' provider within ${DATAPROVIDER_RESOLUTION_TIMEOUT_IN_MS}ms`);

    return registration.instancePromise
        .then(
            promise => {
                return promise;
            },
            reason => {
                //  Request timed out. Retry retrieving data provider next time is requested.
                registration.instancePromise = null;
        });
}

/**
 * Checks if an in-built data provider exists for given tool.
 * in-built here means that it does not come from an extension.
 * @param tool Tool to return data provider for
 * @returns true if such a data provider exists. False otherwise.
 */
export function inBuiltDataProviderExistsForTool(tool: string): boolean{
    return !!internalDataProviderRegistration[tool.toLowerCase()];
}
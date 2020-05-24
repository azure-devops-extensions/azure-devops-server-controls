import { RepositoryProperties, RepositoryTypes, BuildVariables } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { PerfScenarios, TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";

import { BoolUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository, BuildResult } from "TFS/Build/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";

import * as Context from "VSS/Context";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

export interface ISourceLabelOption {
    key: string;
    text: string;
}

export interface ISourceLabelProps {
    sourceLabelOption: string;
    sourceLabelFormat: string;
    showSourceLabelFormat: boolean;
}

/**
 * @brief Helper for different scm providers.
 * Do not add references to any components here.
 */
export class ScmUtils {
    private static _servicesConnectionHubUrlFormat: string = "{0}{1}{2}/_admin/_services/?resourceId={3}";

    // Compares the provided input in combo box with branch present,
    // if is matched, 0 is returned otherwise 1 or -1
    // NOTE: Only use this comparer for UI matching; i.e. "mast" matches "master"
    public static branchFilterComparer(branch: string, input: string): number {
        // If nothing is provided, every branch should be displayed
        if (!input || input.trim().length === 0 || !branch) {
            return 0;
        }

        let trimmedInput = input.trim();
        let trimmedItem = branch.trim();

        // Check if "*" matching is required
        // Permitted only at the end
        if (trimmedInput.lastIndexOf("*") === trimmedInput.length - 1) {
            return ScmUtils.branchFilterComparer(branch, input.substr(0, input.length - 1));
        }

        return Utils_String.ignoreCaseComparer(trimmedItem.substr(0, trimmedInput.length), trimmedInput);
    }

    public static getGitRepository(buildRepository: BuildRepository): GitRepository {
        return {
            id: buildRepository.id,
            name: buildRepository.name,
            defaultBranch: buildRepository.defaultBranch,
            url: buildRepository.url,
            project: {
                id: Context.getDefaultWebContext().project.id
            }
        } as GitRepository;
    }

    public static getGitRepositoryForTfvc(projectId: string, projectName: string): GitRepository {
        return {
            name: TfvcConstants.DefaultTfvcPrefix + projectName,
            project: {
                id: projectId
            }
        } as GitRepository;
    }

    public static getPerfScenarioName(repositoryType, scenario: string): string {
        switch (scenario) {
            case PerfScenarios.RepositorySelected:
                return `VSO.TFS.CI.${repositoryType}.Selected`;
        }
    }

    public static getShallowFetchStatus(buildRepositoryProperties: IDictionaryStringTo<string>): boolean {
        return (buildRepositoryProperties &&
                buildRepositoryProperties.hasOwnProperty(RepositoryProperties.FetchDepth) &&
                buildRepositoryProperties[RepositoryProperties.FetchDepth])
            ? Utils_Number.parseInvariant(buildRepositoryProperties[RepositoryProperties.FetchDepth]) > 0
            : false;
    }

    public static isFetchDepthEmpty(buildRepositoryProperties: IDictionaryStringTo<string>, shallowFetchStatus: boolean): boolean {
        return (
            !shallowFetchStatus
            || Utils_String.equals(buildRepositoryProperties[RepositoryProperties.FetchDepth], Utils_String.empty)
        );
    }

    public static getWebAccessConnectionUrl(tfsContext: TfsContext, connectedServiceId: string): string {
        if (tfsContext && connectedServiceId) {
            const project = tfsContext.contextData.project.name;
            return Utils_String.format(ScmUtils._servicesConnectionHubUrlFormat, tfsContext.getHostUrl(),
                                       tfsContext.getServiceHostUrl(), project, connectedServiceId);
        }

        return Utils_String.empty;
    }

    public static getSourceBranchStatus(repositoryType: string, sourceBranch: string): string {
        if (repositoryType === RepositoryTypes.TfsVersionControl && !sourceBranch) {
            return Resources.SettingsRequired;
        }
        return Utils_String.empty;
    }

    public static convertRepoTypeToWellKnownRepoType(repoType: string): string {
        if (!repoType) {
            return repoType;
        }

        repoType = repoType.toLowerCase();

        switch (repoType) {
            case RepositoryTypes.TfsVersionControl.toLowerCase():
                return RepositoryTypes.TfsVersionControl;
            case RepositoryTypes.Svn.toLowerCase():
                return RepositoryTypes.Svn;
            case RepositoryTypes.GitHub.toLowerCase():
                return RepositoryTypes.GitHub;
            case RepositoryTypes.GitHubEnterprise.toLowerCase():
                return RepositoryTypes.GitHubEnterprise;
            case RepositoryTypes.Bitbucket.toLowerCase():
                return RepositoryTypes.Bitbucket;
            case RepositoryTypes.TfsGit.toLowerCase():
                return RepositoryTypes.TfsGit;
            case RepositoryTypes.Git.toLowerCase():
                return RepositoryTypes.Git;
            default:
                return Utils_String.empty;
        }
    }

    public static convertEndpointTypeToRepoType(endpointType: string): string {
        if (!endpointType) {
            return endpointType;
        }

        endpointType = endpointType.toLowerCase();

        switch (endpointType) {
            case ServiceEndpointType.Bitbucket.toLowerCase():
                return RepositoryTypes.Bitbucket;
            case ServiceEndpointType.ExternalGit.toLowerCase():
                return RepositoryTypes.Git;
            case ServiceEndpointType.GitHub.toLowerCase():
                return RepositoryTypes.GitHub;
            case ServiceEndpointType.GitHubEnterprise.toLowerCase():
                return RepositoryTypes.GitHubEnterprise;
            case ServiceEndpointType.Subversion.toLowerCase():
                return RepositoryTypes.Svn;
            default:
                return Utils_String.empty;
        }
    }

    public static isRepositoryPrivate(repository: IRepository): boolean {
        // Assume repositories are private unless proven otherwise
        if (!repository || !repository.data || !repository.data[RepositoryProperties.IsPrivate]) {
            return true;
        }
        const propertyValue: string = repository.data[RepositoryProperties.IsPrivate];
        if (!propertyValue) {
            return true;
        }
        return BoolUtils.parse(propertyValue);
    }

    public static getSourceLabelOptions(): ISourceLabelOption[] {
        let sourceLabelOptions: ISourceLabelOption[] = [];

        sourceLabelOptions.push({
            key: BuildResult.None.toString(),
            text: Resources.NeverText
        });
        sourceLabelOptions.push({
            key: (BuildResult.PartiallySucceeded | BuildResult.Succeeded).toString(),
            text: Resources.OnSuccessText
        });
        sourceLabelOptions.push({
            key: (BuildResult.Succeeded | BuildResult.PartiallySucceeded | BuildResult.Canceled | BuildResult.Failed).toString(),
            text: Resources.AlwaysText
        });

        return sourceLabelOptions;
    }

    public static validateLabelSourcesFormat(labelSourcesFormat: string): string {
        if (!labelSourcesFormat) {
            return Resources.SettingsRequired;
        }
        for (let i = 0, len = labelSourcesFormat.length; i < len; i++) {
            if (labelSourcesFormat[i] === ">" ||
                labelSourcesFormat[i] === "<" ||
                labelSourcesFormat[i] === "|" ||
                labelSourcesFormat[i] === "\"") {
                return Resources.LabelSourcesFormatInvalidMessage;
            }
            else if (labelSourcesFormat[i] === "$" &&
                (i + 1) < len &&
                labelSourcesFormat[i + 1] === "(") {
                let jumpToIndex: number = labelSourcesFormat.indexOf(")", i);
                //If there is a variable then jump to the position after varaible ends
                if (jumpToIndex > 1) {
                    i = jumpToIndex;
                }
            }
        }
        return Utils_String.empty;
    }

    public static getDefaultSourceLabelFormat(): string {
        return "$(" + BuildVariables.BuildNumber + ")";
    }
}

//*********************************************************************************************
//   Implementation of the VC services which are services that are accessible
//   from extensions.
//*********************************************************************************************
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Platform_VersionControl_Services from "TFS/VersionControl/Services";
import { IVersionControlRepositoryService } from "TFS/VersionControl/Services";
import * as VCConstants from "VersionControl/Scenarios/Shared/Constants";
import { DefaultRepositoryInformation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";

export class VersionControlRepositoryService implements IVersionControlRepositoryService {
    private static _serviceInstances: IDictionaryStringTo<VersionControlRepositoryService> = {};
    private _repository: GitRepository = null;

    constructor(repoInfo: DefaultRepositoryInformation) {
        if (repoInfo.defaultRepoIsGit) {
            this._repository = <GitRepository>{
                name: repoInfo.defaultGitRepoName,
                id: repoInfo.defaultRepoId,
                url: repoInfo.defaultGitRepoUrl,
                isFork: repoInfo.defaultRepoIsFork
            };
        }
    }

    /**
     * Factory method for creating/getting an instance of the version control repository service.
     *
     * @param contributionId The id of the contribution
     * @param contributionInstanceId The instance id of the contribution
     */
    public static getInstance(contributionId: string, contributionInstanceId: string): VersionControlRepositoryService {
        let pageData = VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData<DefaultRepositoryInformation>(VCConstants.navigationDataProviderId);
        pageData = pageData || <DefaultRepositoryInformation>{ defaultRepoId: "none" }; // "none" here is used only to construct a cache key for the null data case
        const serviceInstanceKey = `${contributionId}-${contributionInstanceId}-${pageData.defaultRepoId}`;
        let serviceInstance = VersionControlRepositoryService._serviceInstances[serviceInstanceKey];
        if (!serviceInstance) {
            serviceInstance = new VersionControlRepositoryService(pageData);
            VersionControlRepositoryService._serviceInstances[serviceInstanceKey] = serviceInstance;
        }

        return serviceInstance;
    }

    /**
     * Gets the currently selected Git repository. Returns null if a Git repository is not currently selected.
     */
    public getCurrentGitRepository(): Promise<GitRepository> {
        if (this._repository) {
            return Promise.resolve(this._repository);
        }

        return Promise.resolve(null);
    }
}

SDK_Shim.VSS.register(Platform_VersionControl_Services.VersionControlRepositoryService.fullyQualifiedContributionId, (context: IDefaultGetServiceContext) => {
    const instanceId = (context.hostManagementServiceOptions && context.hostManagementServiceOptions.initialConfig && context.hostManagementServiceOptions.initialConfig.instanceId)
                         || (context.hostManagementServiceOptions && context.hostManagementServiceOptions.contributionId);
    return VersionControlRepositoryService.getInstance(context.hostManagementServiceOptions.contributionId, instanceId);
});
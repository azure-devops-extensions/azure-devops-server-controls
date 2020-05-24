/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import { getPageContext } from "VSS/Context";
import * as VSSService from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import * as StringUtils from "VSS/Utils/String";
import { DefaultRepositoryInformation, VersionControlViewModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as Constants from "VersionControl/Scenarios/Shared/Constants";

export class ValidateRepository {
    private static _webPageDataService = VSSService.getService(WebPageDataService);

    /**
    * Returns true if the repository exists
    * @param versionControlViewModel: view model for the page
    * @param tfvcPage: boolean to specify tfvc/git page
    */
    public static repositoryExists(versionControlViewModel: VersionControlViewModel, isTfvcPage?: boolean): boolean {
        // TFVC might be at the collection level, so we check projectVersionControlInfo
        return !!versionControlViewModel
            && Object.keys(versionControlViewModel).length !== 0
            && (!isTfvcPage || !versionControlViewModel.projectVersionControlInfo || versionControlViewModel.projectVersionControlInfo.supportsTFVC);
    }

    /**
     * Validate we have a valid repostiory and it matches the page type
     * @param $element: element to add error message to
     * @param tfvcPage: boolean to specify tfvc/git page
     */
    public static repositoryForPageExists($element: JQuery, isTfvcPage?: boolean): boolean {
        const versionControlViewModel = ValidateRepository._webPageDataService.getPageData<VersionControlViewModel>(Constants.versionControlDataProviderId);

        //Error retrieving git or tfvc repository.  Show Repository Not Found information.
        if (!ValidateRepository.repositoryExists(versionControlViewModel, isTfvcPage)) {
            let repoNotFoundTitle = VCResources.RepoNotFound_Title;
            let navigateToRepoContent = VCResources.RepoNotFound_NavigateAway;

            //Try to look up the requested repository name and default Git repository link.
            const navigationData = ValidateRepository._webPageDataService.getPageData<DefaultRepositoryInformation>(Constants.navigationDataProviderId);

            if (navigationData && navigationData.notFoundRepoName) {
                repoNotFoundTitle = StringUtils.format(
                    VCResources.RepoNotFound_TitleWithName,
                    navigationData.notFoundRepoName);
            }
            if (navigationData && navigationData.defaultGitRepoUrl && navigationData.defaultGitRepoName) {
                const defaultRepoUrl = TfsContext.getDefault().getHostUrl() + navigationData.defaultGitRepoUrl;
                navigateToRepoContent = StringUtils.format(
                    VCResources.RepoNotFound_NavigateAwayWithDefault,
                    defaultRepoUrl, navigationData.defaultGitRepoName);
            }

            //Create Error Message
            const errorTemplate = ` 
                <div class="hub-view vc-repository-not-found"> 
                    <div class="hub-title">{0}</div>
                    <div class="hub-content">
                        <div class="hub-no-content-gutter">
                        <p>{1}</p>
                        <p>{2}<br>{3}</p>
                        </div>
                    </div>
                </div> 
                `;

            const errorContent: string = StringUtils.format(errorTemplate,
                repoNotFoundTitle,
                VCResources.RepoNotFound_Explanation,
                VCResources.RepoNotFound_UpdateBookmark,
                navigateToRepoContent
            );

            //Add Error to Page
            $element.append($(errorContent));
            return false;
        }
        return true;
    }

    public static isEmptyRepository(): boolean {
        const vcViewModel = ValidateRepository._webPageDataService.getPageData<any>(Constants.versionControlDataProviderId);
        return vcViewModel.isEmptyRepository;
    }

    public static getRepositoryInfo(): { projectId: string; repositoryId: string } {
        const vcViewModel = ValidateRepository._webPageDataService.getPageData<VersionControlViewModel>(Constants.versionControlDataProviderId);
        return {
            projectId: vcViewModel.gitRepository.project.id,
            repositoryId: vcViewModel.gitRepository.id,
        }
    }
}

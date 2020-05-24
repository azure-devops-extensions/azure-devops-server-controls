import * as Q from "q";
import * as VSS from "VSS/VSS";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { MembersData } from "ProjectOverview/Scripts/Generated/Contracts";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";

const projectMembersContributionKey = "ms.vss-tfs-web.project-members-data-provider";

export class ProjectMembersSource {

    public getProjectMembers(): IPromise<MembersData> {
 
        return getService(ExtensionService).getContribution(projectMembersContributionKey)
            .then(() => {
                    return getService(WebPageDataService).getPageData<MembersData>(projectMembersContributionKey);                
            },
            (error) => {
                Q.reject(error.message);
            });
    }

    public refreshProjectMemebers(): IPromise<MembersData> {
        const webPageDataService = getService(WebPageDataService);

        // no need to reject promise at any time - reloadCachedProviderData handles that internally
        return Q.Promise<MembersData>((resolve) => {
            let properties = {
                [ProjectOverviewConstants.ProjectMembers_ForceRefreshMembers] : true
            };

            webPageDataService.reloadCachedProviderData(projectMembersContributionKey, () => {
                resolve(webPageDataService.getPageData<MembersData>(projectMembersContributionKey));
            }, properties);
        });
    }
}
import { getData } from "VSS/Contributions/LocalPageData"
import { ILocalService, getLocalService } from "VSS/Service";
import { TeamProjectReference } from "TFS/Core/Contracts";

interface IPageData {
    project?: TeamProjectReference;
}

const dataContributionId = "ms.vss-tfs-web.page-data";

class PageService implements ILocalService {
    public getProject(): TeamProjectReference {
        const pageData = getData<IPageData>(dataContributionId) || {};
        return pageData.project;
    }
}

const pageService = getLocalService(PageService);

/** 
 * Gets details about the project which exists in the current route.
 * If there is no project in the route, returns undefined.
 */
export function getProject(): TeamProjectReference {
    return pageService.getProject();
}
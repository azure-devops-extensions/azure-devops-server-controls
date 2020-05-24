import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import {ContextIdentifier, HubGroup, WebContext}  from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import * as VSS_Utils_Uri from "VSS/Utils/Url";
import * as VSS_Locations from "VSS/Locations";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";

export class HubGroupLinksService extends VSS_Service.VssService {
    private _webPageDataService: Contribution_Services.WebPageDataService;
    private _hubGroupsContributionId: string = "ms.vss-tfs-web.project-quick-links-data-provider";
    private _hubGroups: HubGroup[] = [];
    private _hubs: Hub[] = [];

    constructor() {
        super();
        this._webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);

        const navigationData = this._webPageDataService.getPageData(this._hubGroupsContributionId);
        this._hubGroups = navigationData["HubGroups"];
        this._hubs = navigationData["Hubs"];
    }

    private _getUrl(hubGroup: HubGroup, project: string, team?: string): string {
        return VSS_Utils_Uri.combineUrl(
            VSS_Locations.urlHelper.getMvcUrl({ project: project, team: team }),
            hubGroup.uri);
    }

    public getHubGroups(project: ContextIdentifier, team?: ContextIdentifier): HubGroup[] {
        const projectIdentifier = (project as ContextIdentifier).name || (project as ContextIdentifier).id;
        const teamIdentifier = team ? (team as ContextIdentifier).name || (team as ContextIdentifier).id : null;
        const hubsService = VSS_Service.getLocalService(HubsService);
        const webContext = Context.getDefaultWebContext();

        return this._hubGroups.map((value: HubGroup) => {
            let hubGroup: HubGroup = $.extend(true, {}, value);
            hubGroup.uri = null;

            let hubGroupHubs = this._hubs.filter(x => x.groupId === value.id);
            Utils_Array.sortIfNotSorted(hubGroupHubs, (a, b) => {
                return Utils_Number.defaultComparer(a.order, b.order);
            });
            const defaultHubGroupHub = hubsService.getDefaultHubForHubGroup(hubGroup, hubGroupHubs);
            if (defaultHubGroupHub) {
                let relativeHubUri = defaultHubGroupHub.uri.replace(webContext.host.relativeUri, "/");
                let relativeHostUri = VSS_Locations.urlHelper.getMvcUrl({ project: project.name, team: team ? team.name : null });
                hubGroup.uri = VSS_Utils_Uri.combineUrl(relativeHostUri, relativeHubUri);
            }

            if (!hubGroup.uri) {
                hubGroup.uri = this._getUrl(value, projectIdentifier, teamIdentifier);
            }

            return hubGroup;
        });
    }
}
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { WorkItemRecentActivityType } from "TFS/WorkItemTracking/Contracts";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";

// note: we only return visited and edited types for my activity
export const MyActivityDateFieldFormats = {
    [WorkItemRecentActivityType[WorkItemRecentActivityType.Visited]]:
    PresentationResources.YouViewedDateFormat,

    [WorkItemRecentActivityType[WorkItemRecentActivityType.Edited]]:
    PresentationResources.YouUpdatedDateFormat
};

export const MyActivityDateFieldValues = {
    [WorkItemRecentActivityType[WorkItemRecentActivityType.Visited]]:
    Resources.MyActivityDetailsViewed,

    [WorkItemRecentActivityType[WorkItemRecentActivityType.Edited]]:
    Resources.MyActivityDetailsUpdated
};

export const WorkItemsHubViewName = "work-items-hub-view"; // this is defined at vss-work-web.json
export const WorkItemsHubTabGroupContributionId = "ms.vss-work-web.work-items-hub-tab-group";
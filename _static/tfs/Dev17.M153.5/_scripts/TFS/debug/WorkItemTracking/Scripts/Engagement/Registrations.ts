import EngagementDispatcher = require("Engagement/Dispatcher");
import Engagement = require("Engagement/Core");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

export module Ids {
    export const VisualizeYourWork = "VisualizeYourWork";
    export const TrackChangesToWorkItemsAndCode = "TrackChangesToWorkItemsAndCode";
    export const CustomizeYourWorkItems = "CustomizeYourWorkItems";
}

export function registerVisualizeYourWorkNewFeature(tfsContext: TFS_Host_TfsContext.TfsContext): void {
    var navigateToBackogs = tfsContext.getHostUrl() + tfsContext.getServiceHostUrl() + tfsContext.contextData.project.name + "/_backlogs/board";

    EngagementDispatcher.Dispatcher.getInstance().register(<Engagement.IEngagementModel>{
        id: Ids.VisualizeYourWork,
        type: Engagement.EngagementType.NewFeature,
        model: {
            engagementId: Ids.VisualizeYourWork,
            title: Resources.VisualizeYourWorkNewFeatureTitle,
            content: [{
                text: Resources.VisualizeYourWorkText,
                imageClassName: "newfeature-bubble-visualizeyourwork-image"
            }],
            learnMoreLinkTitle: Resources.NewFeatureViewBoardLinkTitle,
            learnMoreLink: navigateToBackogs,
        }
    });
}

export function registerTrackChangesNewFeature(): void {
    EngagementDispatcher.Dispatcher.getInstance().register(<Engagement.IEngagementModel>{
        id: Ids.TrackChangesToWorkItemsAndCode,
        type: Engagement.EngagementType.NewFeature,
        model: {
            engagementId: Ids.TrackChangesToWorkItemsAndCode,
            title: Resources.TrackChangesNewFeatureTitle,
            content: [{
                text: Resources.TrackChangesText,
                imageClassName: "newfeature-bubble-trackchanges-image"
            }],
            learnMoreLinkTitle: Resources.NewFeatureLearnMoreLinkTitle,
            learnMoreLink: "http://go.microsoft.com/fwlink/?LinkId=817332",
        }
    });
}

export function registerCustomizeWorkItemsNewFeature(tfsContext: TFS_Host_TfsContext.TfsContext): void {
    var navigateToAdmin = tfsContext.getHostUrl() + tfsContext.getServiceHostUrl() + tfsContext.contextData.project.name + "/_admin/_process";
    EngagementDispatcher.Dispatcher.getInstance().register(<Engagement.IEngagementModel>{
        id: Ids.CustomizeYourWorkItems,
        type: Engagement.EngagementType.NewFeature,
        model: {
            engagementId: Ids.CustomizeYourWorkItems,
            title: Resources.CustomizeWorkItemsNewFeatureTitle,
            content: [{
                text: Resources.CustomizeWorkItemsText,
                imageClassName: "newfeature-bubble-customizeworkitems-image"
            }],
            learnMoreLinkTitle: Resources.NewFeatureCustomizeProcessLinkTitle,
            learnMoreLink: navigateToAdmin,
        }
    });
}
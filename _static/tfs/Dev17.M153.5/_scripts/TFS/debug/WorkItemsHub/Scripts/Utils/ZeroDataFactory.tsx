import * as React from "react";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";

import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import * as Diag from "VSS/Diag";
import * as WitZeroDataResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.ZeroData";
import * as WorkItemTrackingZeroDataUtils from "WorkItemTracking/Scripts/Utils/WorkItemTrackingZeroDataUtils";
import { ZeroData } from "Presentation/Scripts/TFS/Components/ZeroData";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkIllustrationUrlUtils, GeneralZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";

type CreateZeroData = (isSupportedFeature?: boolean) => JSX.Element;

export namespace ZeroDataFactory {
    const KnownCreateMethods: IDictionaryNumberTo<CreateZeroData> = {
        [WorkItemsHubTabs.AssignedToMe]: () => WorkItemTrackingZeroDataUtils.createForAssignedToMe(null),
        [WorkItemsHubTabs.MyActivity]: () => WorkItemTrackingZeroDataUtils.createForMyActivity(null),
        [WorkItemsHubTabs.RecentlyUpdated]: () => WorkItemTrackingZeroDataUtils.createForRecentlyUpdated(null),
        [WorkItemsHubTabs.Following]: (isSupportedFeature: boolean) => isSupportedFeature ?
            WorkItemTrackingZeroDataUtils.createForFollowing() : WorkItemTrackingZeroDataUtils.createForFollowingNotconfigured(),
        [WorkItemsHubTabs.Mentioned]: () => WorkItemTrackingZeroDataUtils.createForMentioned(null),
        [WorkItemsHubTabs.RecentlyCreated]: () => WorkItemTrackingZeroDataUtils.createForRecentlyCreated(null),
        [WorkItemsHubTabs.RecentlyCompleted]: () => WorkItemTrackingZeroDataUtils.createForRecentlyCompleted(null),
        [WorkItemsHubTabs.MyTeams]: (isSupportedFeature: boolean) => isSupportedFeature ? 
            WorkItemTrackingZeroDataUtils.createForMyTeams(null) : WorkItemTrackingZeroDataUtils.createForMyTeamsNotconfigured()
    };

    export function createForEmptyData(tabId: string, isSupportedFeature: boolean, fromFilter: boolean = false): JSX.Element {
        if (fromFilter) {
            // Use same zero data filter experience
            return <GenericFilterZeroData artifactName={WitZeroDataResources.ZeroData_Filter_WorkItems_ArtifactName} />;
        }

        // Get Zero Day experience
        const createMethod: CreateZeroData = KnownCreateMethods[WorkItemsHubTabUtils.TabEnumValueByTabIdMap[tabId]];
        Diag.Debug.assert(!!createMethod, `Missing zero data component for tab '${tabId}'`);

        return createMethod(isSupportedFeature);
    }

    export function createForMissingTabData(): JSX.Element {
        return <ZeroData
            primaryText={Resources.UnableToLoadHubData}
            imageUrl={WorkIllustrationUrlUtils.getIllustrationImageUrl(GeneralZeroDataIllustrationPaths.SomethingWrongOnServer)}
            imageAltText={WitZeroDataResources.Illustrations_SomethingWrongOnServerAltText} />;
    }

    export const createForServerError = WorkItemTrackingZeroDataUtils.createForServerError;
}

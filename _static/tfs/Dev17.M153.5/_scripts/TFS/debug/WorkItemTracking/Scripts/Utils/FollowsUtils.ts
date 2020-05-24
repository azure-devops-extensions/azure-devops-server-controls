import Q = require("q");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Events_Services = require("VSS/Events/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import { FollowsService, ArtifactSubscription } from "Notifications/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";

/** Check whether mail settings are enabled to show follows
 *  @param tfsContext - the context to check mail settings in
 */
export function isFollowsEnabled(tfsContext: TfsContext): boolean {
    return (tfsContext.configuration && tfsContext.configuration.getMailSettings().enabled);
}

/** Do a call through FollowsService to see if the workitem is being followed
 *  @param workItem - Work item subscription is associated with
 *  @return - Promise for the async operation
 */
export function getFollowsState(workItem: WITOM.WorkItem): IPromise<ArtifactSubscription> {
    if (!workItem) {
        return Q.reject();
    }

    const tfsContext = workItem.workItemType.store.getTfsContext();
    const followsService: FollowsService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<FollowsService>(FollowsService);
    const workItemId = workItem.id;

    const artifact: ArtifactSubscription = getFollowableArtifact(workItem);

    if (!artifact) {
        return Q.reject();
    }

    let subscriberId = tfsContext.currentIdentity ? tfsContext.currentIdentity.id : null;
    return followsService.getSubscription(artifact, subscriberId);
}

/** Create and return ArtifactSubscription object
 *  @param workItem - Work item subscription is associated with
 *  @return - Resulting ArtifactSubscription object
 */
export function getFollowableArtifact(workItem: WITOM.WorkItem): ArtifactSubscription {
    if (workItem && !workItem.isNew() && !workItem.isDeleted()) {
        const followArtifact: ArtifactSubscription = {
            subscriptionId: 0,
            artifactId: workItem.id.toString(),
            artifactType: Artifacts_Constants.ArtifactTypeNames.WorkItem
        };
        return followArtifact;
    }
    return null;
}

/** Attach a handler to the follows changed event
 *  @param handler - Handles follows changed event
 */
export function attachFollowsChanged(handler: IEventHandler): void {
    const eventSvc = Events_Services.getService();
    eventSvc.attachEvent(FollowsService.FOLLOWS_STATE_CHANGED, handler);
}

/** Attach a handler to the follows changing event
 *  @param handler - Handles follows changed event
 */
export function attachFollowsChanging(handler: IEventHandler): void {
    const eventSvc = Events_Services.getService();
    eventSvc.attachEvent(FollowsService.FOLLOWS_STATE_CHANGING, handler);
}

/** Detach a handler from the follows changed event
 *  @param handler - Handler to remove
 */
export function detachFollowsChanged(handler: IEventHandler): void {
    const eventSvc = Events_Services.getService();
    eventSvc.detachEvent(FollowsService.FOLLOWS_STATE_CHANGED, handler);
}

/** Detach a handler from the follows changing event
 *  @param handler - Handler to remove
 */
export function detachFollowsChanging(handler: IEventHandler): void {
    const eventSvc = Events_Services.getService();
    eventSvc.detachEvent(FollowsService.FOLLOWS_STATE_CHANGING, handler);
}

/** Follow or unfollow a workitem artifact
 *  @param workItem - Work item subscription is associated with
 *  @param follow - Whether to follow the artifact or unfollow
 *  @param layer - Layer to include in the telemetry for this call.
 *  @return - Promise for the async operation
 */
export function setFollowState(workItem: WITOM.WorkItem, follow: boolean, layer: string): IPromise<ArtifactSubscription> {
    const tfsContext = workItem.workItemType.store.getTfsContext();
    const followsService: FollowsService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<FollowsService>(FollowsService);

    const artifact = getFollowableArtifact(workItem);

    if (!artifact) {
        return Q.reject();
    }

    let telemetry = {
        area: WIFormCIDataHelper.getArea(),
        layer: layer,
        customProperties: {}
    };

    telemetry.customProperties["workItem"] = {
        id: workItem.id,
        state: workItem.getState(),
        type: {
            name: workItem.workItemType.name,
            referenceName: workItem.workItemType.referenceName
        }
    }

    if (follow) {
        return followsService.followArtifact(artifact, telemetry);
    }
    else {
        let subscriberId = tfsContext.currentIdentity ? tfsContext.currentIdentity.id : null;
        return followsService.unfollowArtifact(artifact, subscriberId, telemetry);
    }
}

/** Clears the cached follow state of the specified work item.
 *  
 *  @param workItem - Work item subscription is associated with
 */
export function clearFollowState(workItem: WITOM.WorkItem): void {
    const tfsContext = workItem.workItemType.store.getTfsContext();
    const followsService: FollowsService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<FollowsService>(FollowsService);
    const artifact = getFollowableArtifact(workItem);

    if (!artifact) {
        return;
    }

    followsService.refresh(artifact);
}

import * as Service from "VSS/Service";

import { FeedServiceInstanceId } from "Feed/Common/Constants/Constants";

import { FollowsService } from "Notifications/Services";

export class FeedFollowsService extends FollowsService {
    public initializeConnection(tfsConnection: Service.VssConnection): void {
        super.initializeConnection(tfsConnection, FeedServiceInstanceId);
    }
}

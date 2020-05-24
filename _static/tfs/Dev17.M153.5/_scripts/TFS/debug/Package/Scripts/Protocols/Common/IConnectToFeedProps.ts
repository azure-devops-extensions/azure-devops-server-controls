import { Props } from "VSS/Flux/Component";

import { Feed } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { HubAction } from "Package/Scripts/Types/IHubState";

export interface IConnectToFeedProps extends Props {
    feed: Feed;
    hubAction: HubAction;
}

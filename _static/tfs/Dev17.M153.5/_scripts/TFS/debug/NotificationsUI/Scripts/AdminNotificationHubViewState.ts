import { IObservableValue, ObservableValue, IObservableArray, ObservableArray } from "VSS/Core/Observable";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewState, IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

/** Names of notification pivots */
export namespace AdminNotificationPivotNames {

    /** Settings */
    export const statistics = "statistics";
    
    /** Subscribers */
    export const subscribers = "subscribers";
    
    /** Default subscriptions */
    export const defaultSubscriptions = "defaultSubscriptions";
    
    /** Admin Settings */
    export const settings = "settings";
}

export interface IAdminNotificationHubViewState extends IVssHubViewState {
    identityId?: IObservableValue<string>;
}

export class AdminNotificationHubViewState extends VssHubViewState implements IAdminNotificationHubViewState {
    public identityId: IObservableValue<string>;

    constructor(options?: IVssHubViewStateOptions) {
        super(options, false);

        this.identityId = this.createNavParmObservableValue<string>("identity-selected", "identity", true, HistoryBehavior.newEntry);

        this.setupNavigation();
    }
}
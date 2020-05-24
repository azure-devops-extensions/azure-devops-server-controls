
import Action_Base = require("VSS/Flux/Action");
import Subscription_Actions = require("NotificationsUI/Scripts/Actions/SubscriptionActions");
import Store_Base = require("VSS/Flux/Store");

export class Store extends Store_Base.DefaultStore<any> {
    protected getAction(): Action_Base.Action<any> {
        return Subscription_Actions.GenericError
    }
}

export var GenericError = new Store();

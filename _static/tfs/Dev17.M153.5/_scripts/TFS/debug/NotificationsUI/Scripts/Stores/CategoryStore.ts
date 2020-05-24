
import * as NotificationContracts from "Notifications/Contracts";
import * as StoreBase from "VSS/Flux/Store";

import NotificationViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");

export class CategoryStore extends StoreBase.RemoteStore {

    private _categories: NotificationContracts.NotificationEventTypeCategory[];
    private _notificationViewModel: NotificationViewModel.NotificationsViewModel;

    constructor(viewModel: NotificationViewModel.NotificationsViewModel) {
        super();

        this._notificationViewModel = viewModel;
        
        this._categories = this._notificationViewModel.getCategories();
    }

    public getCategories(): NotificationContracts.NotificationEventTypeCategory[] {
        return this._categories;
    } 
}

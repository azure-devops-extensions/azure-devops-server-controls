
import * as NotificationContracts from "Notifications/Contracts";
import * as StoreBase from "VSS/Flux/Store";
import * as CategoryActions from "NotificationsUI/Scripts/Actions/CategoryActions";
import * as TemplateActions from "NotificationsUI/Scripts/Actions/TemplateActions";
import * as CategoryStore from "NotificationsUI/Scripts/Stores/CategoryStore";
import * as TemplateStore from "NotificationsUI/Scripts/Stores/TemplateStore";

import NotificationViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");

export class StoresHub extends StoreBase.RemoteStore {

    private _notificationViewModel: NotificationViewModel.NotificationsViewModel;

    public categoryStore: CategoryStore.CategoryStore;
    public templateStore: TemplateStore.TemplateStore;

    constructor(viewModel: NotificationViewModel.NotificationsViewModel, categoryId: string) {
        super();

        this._notificationViewModel = viewModel;

        this.categoryStore = new CategoryStore.CategoryStore(this._notificationViewModel);
        this.templateStore = new TemplateStore.TemplateStore(this._notificationViewModel, this._notificationViewModel.getCategories()[0].id);

        CategoryActions.CategorySelected.addListener(this.templateStore.onCategorySelectionChange.bind(this.templateStore));
        TemplateActions.TemplateSelected.addListener(this.templateStore.onTemplateSelectionChange.bind(this.templateStore));
    }
}

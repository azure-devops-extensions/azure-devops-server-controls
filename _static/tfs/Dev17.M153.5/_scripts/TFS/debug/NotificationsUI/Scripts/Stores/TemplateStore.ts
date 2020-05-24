
import * as NotificationContracts from "Notifications/Contracts";
import * as StoreBase from "VSS/Flux/Store";

import NotificationViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");

export class TemplateStore extends StoreBase.RemoteStore {

    private _templates: NotificationContracts.NotificationSubscriptionTemplate[];
    private _notificationViewModel: NotificationViewModel.NotificationsViewModel;
    private _selectedTemplate: NotificationContracts.NotificationSubscriptionTemplate;
    private _selectedCategoryId: string;
    private _matchedTemplates: NotificationContracts.NotificationSubscriptionTemplate[];

    constructor(viewModel: NotificationViewModel.NotificationsViewModel, categoryId: string) {
        super();

        this._notificationViewModel = viewModel;

        this._setTemplates(categoryId);
    }

    public getTemplates(templateType: NotificationContracts.SubscriptionTemplateType): NotificationContracts.NotificationSubscriptionTemplate[] {
        var matchedTemplates: NotificationContracts.NotificationSubscriptionTemplate[] = [];

        $.each(this._templates, (i: number, template: NotificationContracts.NotificationSubscriptionTemplate) => {
            if (template.type === templateType || template.type === NotificationContracts.SubscriptionTemplateType.Both) {
                matchedTemplates.push(template);
            }
        });

        this._matchedTemplates = matchedTemplates;

        return matchedTemplates;
    }

    public setSelectedTemplate(templateIndex: number) {
        this.onTemplateSelectionChange(this._matchedTemplates[templateIndex]);
    }

    private _setTemplates(categoryId: string) {
        this._templates = this._notificationViewModel.getSubscriptionTemplates(categoryId);
    }

    public onCategorySelectionChange(categoryId: string) {
        this._selectedCategoryId = categoryId;
        this._setTemplates(categoryId);
        this._selectedTemplate = this._matchedTemplates[0];
        this.emit("SelectedCategoryChanged", this);
    }

    public onTemplateSelectionChange(template: NotificationContracts.NotificationSubscriptionTemplate) {
        this._selectedTemplate = template;
    }

    public getSelectedTemplate(): NotificationContracts.NotificationSubscriptionTemplate {
        return this._selectedTemplate;
    }

    public getSelectedCategory(): string {
        return this._selectedCategoryId;
    }
}

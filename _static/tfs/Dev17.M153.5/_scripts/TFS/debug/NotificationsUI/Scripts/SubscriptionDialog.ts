/// <reference types="jquery" />

import * as ReactDOM from "react-dom";
import * as React from "react";

// VSS
import Combos = require("VSS/Controls/Combos");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Filters = require("VSS/Controls/Filters");
import FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
import Grids = require("VSS/Controls/Grids");
import TreeView = require("VSS/Controls/TreeView");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Validation = require("VSS/Controls/Validation");
import VSS = require("VSS/VSS");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

// Notifications
import Notifications_Contracts = require("Notifications/Contracts");

// Notifications UI
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");
import NotifViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");
import TemplateSelection = require("NotificationsUI/Scripts/TemplateSelectionPage");
import AlertConfiguration = require("NotificationsUI/Scripts/AlertEditorPage");
import StoresHub = require("NotificationsUI/Scripts/Stores/StoresHub");

var delegate = Utils_Core.delegate;

export interface SubscriptionDialogOptions extends Dialogs.IModalDialogOptions {
    webContext?: WebContext;
    viewModel: NotifViewModel.NotificationsViewModel;
    teamProjects: { [key: string]: string };
    selectedSubscription: Notifications_Contracts.NotificationSubscription;
    isReadOnly: boolean;
    subscriber: VSS_Common_Contracts.IdentityRef;
    isAdmin: boolean;
    currentProject: string;
    notificationSubscriber: Notifications_Contracts.NotificationSubscriber;
}

export class SubscriptionDialog extends Dialogs.ModalDialogO<SubscriptionDialogOptions> {

    pageNumber: number;
    numberOfPages: number;

    private _templatePage: TemplateSelection.TemplateSelectionPage;
    private _configurationPage: AlertConfiguration.AlertEditorPage;
    private _eventTypes: { [key: string]: Notifications_Contracts.NotificationEventType; };
    private _mapProjectIdToProjectName: { [key: string]: string };
    private _selectedSubscription: Notifications_Contracts.NotificationSubscription;
    private _viewModel: NotifViewModel.NotificationsViewModel;
    private _subscriptionFilterChanged: boolean;
    private _storesHub: StoresHub.StoresHub;
    private static operatorAnd: string = "And";
    private static operatorOr: string = "Or";    

    constructor(options?) {
        super(options);
        this._viewModel = this._options.viewModel;
        this._selectedSubscription = this._options.selectedSubscription;
        this._subscriptionFilterChanged = false;
        this.pageNumber = 0;
        this._storesHub = new StoresHub.StoresHub(this._viewModel, this._viewModel.getCategories()[0].id);
    }

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            buttons: [],
            beforeClose: delegate(this, this._beforeClose),
            noAutoCta: true
        }, options));
    }

    public initialize() {
        super.initialize();

        // if a custom subscription add the id to the title
        if (this._options.selectedSubscription != null && parseInt(this._options.selectedSubscription.id)) {
            var titleSpan = $(".ui-dialog-title");

            // avoid adding the id multiple times if the user clicks on the link multiple times
            if (titleSpan.html().indexOf(this._options.selectedSubscription.id) === -1) {
                var id = Utils_String.format("({0})", this._options.selectedSubscription.id);
                var $idSpab = $("<span />").text(id).addClass("dialog-id-title").appendTo(titleSpan);
            }
        }

        var content = ` 
          <div class="notif-fill" > 
              <div class="event-subscription-categories-page-root" > </div> 
              <div class="event-subscription-configuration-page-root notif-hide" > </div> 
          </div>`;

        var $webContent = this._element.append(content);

        this._createPages();
        this._createBindings();

        if (this._options.selectedSubscription != null) {
            // edit subscription
            this._configurationPage.updateSelectedSubscription(this._options.selectedSubscription);
            this._gotoPage(1);
        }
        else {
            // create a new subscription
            this._gotoPage(0);
        }
        this._updateButtons();
        this.updateOkButton(true);
    }

    private _createBindings() {
        var that = this;

        // Setup the subscription filter changed event handler 
        this._bind("subscriptionFilterChanged", delegate(this, this._onSubscriptionFilterChanged))

        // Setup the unload event
        $(window).bind('beforeunload', function (e) {
            if (that._configurationPage) {
                if (that._configurationPage.isModified()) {
                    return "unload";
                }
                else {
                    e = null;
                }
            }

        });
    }

    private _beforeClose() {
        var that = this;
        if (this._configurationPage && this._configurationPage.isModified() && !this._options.isReadOnly) {
            if (confirm(NotifResources.UnsavedChangesConfirm)) {
                this._configurationPage.setModified(false);
                this.close();
                return true;
            }
            else {
                return false;
            }
        }
        return true;
    }

    private _onSubscriptionFilterChanged() {
        this._configurationPage.setModified(true);
        this._subscriptionFilterChanged = true;
        this._updateButtons();
    }

    private _setModified(modified: boolean) {
        this._configurationPage.setModified(modified);
    }

    private _getDialogButtons() {
        var disabled = undefined;
        if (this._options.isReadOnly) {
            disabled = "disabled";
        }
        var finishButtonText = NotifResources.SubscriptionDialogSaveButtonText;
        if (!this._selectedSubscription || !parseInt(this._selectedSubscription.id)) {
            finishButtonText = NotifResources.SubscriptionDialogFinishButtonText;
        }
        return {
            "previous": {
                id: "previous",
                text: NotifResources.SubscriptionDialogPrevButtonText,
                click: this._onPreviousClick.bind(this),
                disabled: undefined
            },
            "next": {
                id: "next",
                text: NotifResources.SubscriptionDialogNextButtonText,
                click: this._onNextClick.bind(this),
                disabled: undefined
            },
            "finish": {
                id: "finish",
                text: finishButtonText,
                click: this._onFinishClick.bind(this),
                disabled: disabled,
                class: "cta"
            },
            "cancel": {
                id: "cancel",
                text: NotifResources.SubscriptionDialogCancelButtonText,
                click: this._onCancel.bind(this)
            }
        };
    }

    private _updateButtons() {
        var previousEnabled = this.pageNumber == 1 && !this._subscriptionFilterChanged && !this._options.isReadOnly && !parseInt(this._selectedSubscription.id);
        var nextEnabled = this.pageNumber == 0;
        $(".ui-dialog-buttonset").addClass("bowtie");

        const currentButtonConfiguration = (<any>this.getElement().dialog("option", "buttons")) as any[];

        const buttons = this._getDialogButtons();

        this.getElement().dialog( "option", "resizable", false );
        if (nextEnabled) {
            this.getElement().dialog("option", "buttons", [buttons.next, buttons.cancel]);
        }
        else if (previousEnabled) {
            this.getElement().dialog("option", "buttons", [buttons.previous, buttons.finish, buttons.cancel]);
        }
        else {
                this.getElement().dialog("option", "buttons", [buttons.finish, buttons.cancel]);
        }
        this.getElement().dialog( "option", "resizable", true );
        this.getElement().parent('.ui-dialog').find('.ui-resizable-handle.ui-icon').attr('tabindex', 0);
    }

    private _createPages() {
        var templateType: Notifications_Contracts.SubscriptionTemplateType = (this._options.subscriber && this._options.subscriber.isContainer) ? Notifications_Contracts.SubscriptionTemplateType.Team : Notifications_Contracts.SubscriptionTemplateType.User;
        ReactDOM.render(
            React.createElement(TemplateSelection.TemplateSelectionPage, { viewModel: this._viewModel, storesHub: this._storesHub, templateType: templateType }),
            this._element.find(".event-subscription-categories-page-root")[0]);

        this._configurationPage = new AlertConfiguration.AlertEditorPage(this._element, this._viewModel, this._options.isReadOnly, this._options.isAdmin, this._options.currentProject, this._options.notificationSubscriber);
    }

    private _gotoPage(pageNumber: number) {
        if (pageNumber < 0 || pageNumber > 1) {
            return;
        }

        this.pageNumber = pageNumber;

        if (pageNumber == 0) {
            this._element.find(".event-subscription-categories-page-root").removeClass("notif-hide");
            this._element.find(".event-subscription-configuration-page-root").addClass("notif-hide");
            this._templatePage
        } else if (pageNumber == 1) {
            this._element.find(".event-subscription-categories-page-root").addClass("notif-hide");
            this._element.find(".event-subscription-configuration-page-root").removeClass("notif-hide");
            this._configurationPage.setInitialFocus();
        }

        this._updateButtons();
    }

    public getDialogResult() {
        return this._selectedSubscription;
    }

    private _onPreviousClick() {
        this._gotoPage(this.pageNumber - 1);
    }

    private _onNextClick() {
        var selectedTemplate = this._storesHub.templateStore.getSelectedTemplate();
        this._selectedSubscription = $.extend(true, {}, selectedTemplate);
        this._selectedSubscription.id = undefined;
        this._selectedSubscription.filter.eventType = selectedTemplate.filter.eventType;
        this._selectedSubscription.subscriber = this._options.subscriber;
        this._configurationPage.updateSelectedSubscription(this._selectedSubscription);
        this._gotoPage(this.pageNumber + 1);
    }

    private _onFinishClick() {
        var valid = this._configurationPage.isValidSubscription();
        if (valid) {
            var eventSubscription: Notifications_Contracts.NotificationSubscription = this._configurationPage.getSubscription();
            // to pass unlocalized logical operators to REST apis and change [Member] to [Me] for team subs
            SubscriptionDialog._prepareFilter(eventSubscription);

            if (!parseInt(eventSubscription.id)) {
                this._createSubscription(eventSubscription);
            }
            else {
                this._saveSubscription(eventSubscription);
            }
        }
    }

    private static _prepareFilter(subscription: Notifications_Contracts.NotificationSubscription) {
        if (subscription.filter.hasOwnProperty('criteria')) {
            let clauses = (subscription.filter as Notifications_Contracts.ExpressionFilter).criteria.clauses;            
            SubscriptionDialog._unlocalizeLogicalOperators(clauses);
            
            let isTeam = subscription.subscriber && subscription.subscriber.isContainer;
            if (isTeam) {
                SubscriptionDialog._changeMemberToMe(clauses);
            }
        }

    }

    private static _changeMemberToMe(clauses: Notifications_Contracts.ExpressionFilterClause[]) {
        for (let clause of clauses) {
            if (clause.value === '[Member]') {
                clause.value = '[Me]';
            }
        }        
    }

    private static _unlocalizeLogicalOperators(clauses: Notifications_Contracts.ExpressionFilterClause[]) {
        for (let clause of clauses) {
            if (clause.logicalOperator != null && clause.logicalOperator.length !== 0) {
                clause.logicalOperator = Utils_String.equals(clause.logicalOperator, NotifResources.OperatorAnd, true) ? SubscriptionDialog.operatorAnd : SubscriptionDialog.operatorOr;
            }
        }
    }    

    private _createSubscription(eventSubscription: Notifications_Contracts.NotificationSubscription) {
        var that = this;
        this._preSaveSubscription();

        this._viewModel.createSubscription(eventSubscription, function (savedSubscription: Notifications_Contracts.NotificationSubscription) {
            that._onSubscriptionSaved(savedSubscription);
        }, function (error) {
            that._onSubscriptionSaveFailure(NotifResources.SubscriptionErrorCreate, error);
        });
    }

    private _saveSubscription(eventSubscription: Notifications_Contracts.NotificationSubscription) {
        var that = this;
        this._preSaveSubscription();

        this._viewModel.updateSubscription(this._selectedSubscription, eventSubscription, function (savedSubscription: Notifications_Contracts.NotificationSubscription) {
            that._onSubscriptionSaved(savedSubscription);
        }, function (error) {
            that._onSubscriptionSaveFailure(NotifResources.SubscriptionErrorSave, error);
        });
    }

    private _preSaveSubscription() {
        var $finishButton = $("#finish");
        $finishButton.html("");
        var $iconSpan = $("<span />").addClass("bowtie-icon bowtie-spinner").appendTo($finishButton);
        var $buttonText = $("<span />").addClass("saving-button").html(NotifResources.SubscriptionDialogSavingButtonText).appendTo($finishButton);
        this.onButtonStatusChange(undefined, { button: "finish", enabled: false });
        this._configurationPage.setReadOnly(true);
        // this for the create case if the filter has not changed
        var $previousButton = $("#previous");
        if ($previousButton) {
            this.onButtonStatusChange(undefined, { button: "previous", enabled: false });
        }
    }

    private _onSubscriptionSaved(eventSubscription: Notifications_Contracts.NotificationSubscription) {
        this._setModified(false);
        this._selectedSubscription = eventSubscription;
        this.onOkClick();
    }

    private _onSubscriptionSaveFailure(dialogTitle: string, error: any) {
        var $finishButton = $("#finish");
        this._configurationPage.setReadOnly(false);
        var buttonSpans = $finishButton.find("span");
        var $iconSpan = $(buttonSpans[0]);
        $iconSpan.removeClass("bowtie-icon bowtie-spinner");
        $(buttonSpans[1]).html("");
        this.onButtonStatusChange(undefined, { button: "finish", enabled: true });
        $finishButton.html(NotifResources.SubscriptionDialogSaveButtonText);
        // this for the create case if the filter has not changed
        var $previousButton = $("#previous");
        if ($previousButton) {
            this.onButtonStatusChange(undefined, { button: "previous", enabled: true });
        }

        if (error) {
            Dialogs.showMessageDialog(error.message || error, {
                title: dialogTitle,
                buttons: [Dialogs.MessageDialog.buttons.ok]
            });
        }
    }

    private _onCancel() {
        var that = this;
        if (this._configurationPage && this._configurationPage.isModified() && !this._options.isReadOnly) {
            if (confirm(NotifResources.UnsavedChangesConfirm)) {
                that._configurationPage.setModified(false);
                that.onCancelClick();
            }
        }
        else {
            this.onCancelClick();
        }
    }
}
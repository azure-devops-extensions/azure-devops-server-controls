/// <reference types="jquery" />

// VSS
import Combos = require("VSS/Controls/Combos");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Validation = require("VSS/Controls/Validation");

// Notifications
import Notifications_Contracts = require("Notifications/Contracts");

// Notifications UI
import AlertFilter = require("NotificationsUI/Scripts/AlertFilterControl");
import NotifViewModel = require("NotificationsUI/Scripts/NotificationsViewModel");
import NotifResources = require("NotificationsUI/Scripts/Resources/VSS.Resources.NotificationsUI");
import { validateEmail } from "NotificationsUI/Scripts/Util";

var delegate = Utils_Core.delegate;

export class AlertEditorPage {
    private _elementRoot: JQuery;
    private _$configurationPage: JQuery;
    private _configurationPageClass: string = "event-subscription-configuration-page-root";
    private _editor: AlertEditor;
    private _webContext: WebContext;
    private _subscription: Notifications_Contracts.NotificationSubscription;
    private _viewModel: NotifViewModel.NotificationsViewModel;
    private _isReadOnly: boolean;
    private _isTeam: boolean;
    private _isAdmin: boolean;
    private _currentProject: string;
    private _notificationSubscriber: Notifications_Contracts.NotificationSubscriber;

    constructor(elementRoot: JQuery, viewModel: NotifViewModel.NotificationsViewModel, isReadOnly: boolean, isAdmin: boolean, currentProject: string, notificationSubscriber: Notifications_Contracts.NotificationSubscriber) {
        this._elementRoot = elementRoot;
        this._webContext = Context.getDefaultWebContext();
        this._viewModel = viewModel;
        this._isReadOnly = isReadOnly;
        this._isAdmin = isAdmin;
        this._currentProject = currentProject;
        this._notificationSubscriber = notificationSubscriber;
        this._createPageContent();
    }

    private _createPageContent() {
        this._$configurationPage = this._elementRoot.find('.' + this._configurationPageClass);
        this._editor = <AlertEditor>Controls.BaseControl.createIn(AlertEditor, this._$configurationPage, {
            tfsContext: null,
            onlyMyScope: true,
            viewModel: this._viewModel,
            isReadOnly: this._isReadOnly,
            isAdmin: this._isAdmin,
            notificationSubscriber: this._notificationSubscriber
        });
    }

    private _refreshPageContent() {
        var subscriptionEventType: Notifications_Contracts.NotificationEventType = this._viewModel.getEventInfo(this._subscription.filter.eventType);
        this._editor.setEventType(subscriptionEventType);
        this._editor.setIsTeam(this._subscription.subscriber && this._subscription.subscriber.isContainer);
        this._createNewSubscription(subscriptionEventType);
        this._editor.bindAlert(this._subscription);
    }

    private _createNewSubscription(eventType) {
        var id = this._subscription.id;

        if (!parseInt(id)) {
            var projectGuid = AlertFilter.CollectionScope;

            if (!this._viewModel.isDefaultSubscription(this._subscription)) {
                this._editor.setModified(true);

                // only set the scope for custom subscriptions
                if (this._webContext && this._webContext.project) {
                    projectGuid = this._webContext.project.id;
                }
                else
                    if (this._currentProject) {
                        projectGuid = this._currentProject;
                    }
            }

            var channel;
            let isGroup = this._subscription.subscriber && this._subscription.subscriber.isContainer;
            // for groups the default channel is user
            if (isGroup && this._doesEventTypeHaveRoles(eventType.roles)) {
                channel = <Notifications_Contracts.ISubscriptionChannel>{
                    type: UserChannelType
                };
            }
            else {
                let notificationSubscriber = this._viewModel.getNotificationSubscriber();
                if (isGroup && notificationSubscriber && notificationSubscriber.deliveryPreference && (notificationSubscriber.deliveryPreference === Notifications_Contracts.NotificationSubscriberDeliveryPreference.EachMember || notificationSubscriber.deliveryPreference === Notifications_Contracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress)) {
                    channel = <Notifications_Contracts.SubscriptionChannelWithAddress>{
                        type: GroupChannelType,
                    };
                }
                else {
                    channel =
                        <Notifications_Contracts.SubscriptionChannelWithAddress>{
                            type: EmailChannelType,
                        };
                }
            }
            this._subscription.channel = channel;

            if (eventType && eventType.supportedScopes && eventType.supportedScopes.indexOf("project") > -1) {
                this._subscription.scope = <Notifications_Contracts.SubscriptionScope>{ id: projectGuid };
            }
        }
    }

    private _doesEventTypeHaveRoles(roles) {
        return (roles && Object.keys(roles).length > 0);
    }

    public updateSelectedSubscription(subscription: Notifications_Contracts.NotificationSubscription) {
        // user selected a new/different template
        this._subscription = $.extend(true, {}, subscription);
        this._refreshPageContent();
    }

    public setInitialFocus() {
        this._editor.setInitialFocus();
    }

    public getSubscription() {
        return this._editor.getSubscription();
    }

    public isValidSubscription() {
        return this._editor.isCurrentAlertValid();
    }

    public isModified(): boolean {
        return this._editor.isModified();
    }

    public setModified(modified: boolean) {
        this._editor.setModified(modified);
    }

    public setReadOnly(readOnly: boolean) {
        this._editor.setReadOnly(readOnly);
    }
}

export class AlertEditor extends Controls.BaseControl {
    private _alertsManager: any;
    private _currentSubscription: any;
    private _teamProjectsCombo: Combos.Combo;
    private _allTeamProjectsRadio: any;
    private _aTeamProjectRadio: any;
    private _allTeamProjectsLabel: JQuery;
    private _aTeamProjectLabel: JQuery;
    private _nameCombo: Combos.Combo;
    private _subscriberLabel: JQuery;
    private _subscriberCombo: Combos.Combo;
    private _toAddressText: Combos.Combo;
    private _toAddressCombo: Combos.Combo;
    private _toAddressLabel: any;
    private _rolesCombo: Combos.Combo;
    private _rolesLabel: JQuery;
    private _excludeInitiatorCheckbox: JQuery;
    private _excludeInitiatorLabel: JQuery;
    private _errorLabel: JQuery;
    private _filterControl: any;
    private _webContext: WebContext;
    private _tfsContext: any;
    private _eventTypeInfo: Notifications_Contracts.NotificationEventType;
    private _viewModel: NotifViewModel.NotificationsViewModel;
    private _isTeam: boolean;
    private _roles: { [key: string]: string };
    private _rolesNames: string[];
    private _isReadOnly: boolean;
    private _isAdmin: boolean;
    private _changed: boolean;
    private _notificationSubscriber: Notifications_Contracts.NotificationSubscriber;

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
        this._viewModel = options.viewModel;
        this._isReadOnly = options.isReadOnly;
        this._isAdmin = options.isAdmin;
        this._notificationSubscriber = options.notificationSubscriber;
    }

    public initialize() {
        var $filtersContainer: JQuery,
            that = this;

        super.initialize();

        this._bind("filterModified", function () { that._fireAlertModified(); });

        this._webContext = Context.getDefaultWebContext();
        this._createPropertiesEditor();

        $filtersContainer = $("<div />").addClass("alerts-filter-section-container bowtie");
        this._filterControl = <AlertFilter.AlertFilterControl>Controls.BaseControl.createIn(AlertFilter.AlertFilterControl, $filtersContainer, { readOnly: this._isReadOnly, enableRowAddRemove: !this._isReadOnly, hasFixedFields: false });
        $filtersContainer.appendTo(this._element);

        this.bindAlert(null);
    }

    public setInitialFocus() {
        this._nameCombo.focus();
    }

    public isModified(): boolean {
        return this._changed;
    }

    public setModified(modified: boolean) {
        this._changed = modified;
    }

    public isCurrentAlertValid() {
        if (this._nameCombo.getText().trim() === "") {
            this._errorLabel.text(NotifResources.DescriptionRequiredMessage);
            this._errorLabel.show();
            return false;
        }

        if (this._nameCombo.getText().length > 255) {
            this._errorLabel.text(NotifResources.DescriptionTooLongMessage);
            this._errorLabel.show();
            return false;
        }

        if (this._isDeliveryAddressEnabled()) {
            const emailAddress = this._toAddressText.getText().trim();
            const error = validateEmail(emailAddress, this._viewModel.getAsciiOnlyAddresses());
            if (error) {
                this._errorLabel.text(error);
                this._errorLabel.show();
                return false;
            }
        }

        if (this._isSoapDelivery()) {
            var soapUri = this._toAddressText.getText().trim();
            if (soapUri === "") {
                this._errorLabel.text(NotifResources.SoapRequiredUriMessage);
                this._errorLabel.show();
                return false;
            }
            else if (!this._validateUri(soapUri)) {
                this._errorLabel.text(NotifResources.SoapRequiredUriMessage);
                this._errorLabel.show();
                return false;
            }
        }

        if (this._isByRoleDeliveryOption() && (!this._currentSubscription.filter.inclusions || (this._currentSubscription.filter.inclusions.length == 0))) {
            this._errorLabel.text(NotifResources.RolesRequiredMessage);
            this._errorLabel.show();
            return false;
        }

        if (!this._filterControl.isValid()) {
            this._errorLabel.text(NotifResources.InvalidFilterMessage);
            this._errorLabel.show();
            return false;
        }

        this._errorLabel.hide();
        return true;
    }

    public setEventType(eventType: Notifications_Contracts.NotificationEventType) {
        this._eventTypeInfo = eventType;
    }

    public setIsTeam(isTeam: boolean) {
        this._isTeam = isTeam;
        if (this._isTeam) {
            this._populateRoles();
        }
    }

    public bindAlert(subscriptionToBind) {
        this._currentSubscription = null;

        if (subscriptionToBind) {
            this._currentSubscription = subscriptionToBind;
            this._element.show();

            //If there is no clauses create an empty one
            var criteria = subscriptionToBind.filter.criteria;
            if (!criteria) {
                var clause: Notifications_Contracts.ExpressionFilterClause = <Notifications_Contracts.ExpressionFilterClause>{ fieldName: "", operator: "=", value: "" };
                criteria = <Notifications_Contracts.ExpressionFilterModel>{ clauses: [clause] };
                subscriptionToBind.filter.criteria = criteria;
            }

            this._nameCombo.setText(subscriptionToBind.description || "", false);

            //Show/Hide the subscriber control
            this._updateSubscriberControl(subscriptionToBind.subscriber ? subscriptionToBind.subscriber.displayName : "");

            this._updateAddressControl(subscriptionToBind);
            var deliverToTeamAlias = this._isDeliveryToTeamAlias();
            this._teamProjectsCombo.setSource(this._viewModel.getSortedTeamProjectNames());

            // Set the filter
            this._viewModel.getFieldInputValues(subscriptionToBind, null, (values: Notifications_Contracts.NotificationEventField[]) => {
                // for new subscriptions fix scope if needed (in case the template has a field that does not support project scope)
                if (!parseInt(subscriptionToBind._id) && !this._viewModel.isDefaultSubscription(subscriptionToBind)) {
                    this._fixSubscriptionScope(subscriptionToBind, values);
                }

                this._updateScopeControl(subscriptionToBind);
                this._filterControl.setAlert(subscriptionToBind, this._eventTypeInfo, values, this._isTeam, deliverToTeamAlias, this._viewModel, this._webContext);

            });
        }
        else {
            this._element.hide();
        }
    }

    private _fixSubscriptionScope(subscription, fields) {
        if (!this._doesSubscriptionSupportProjectScope(subscription, fields)) {
            subscription.scope = <Notifications_Contracts.SubscriptionScope>{ id: AlertFilter.CollectionScope };
        }
    }

    private _doesSubscriptionSupportProjectScope(subscription, fields): boolean {
        if (subscription.filter && subscription.filter.criteria && subscription.filter.criteria.clauses) {
            for (let index in subscription.filter.criteria.clauses) {
                if (!this._doesFieldSupportScope(subscription.filter.criteria.clauses[index].fieldName, "project", fields)) {
                    return false;
                }
            }
        }
        return true;
    }

    private _doesFieldSupportScope(fieldName, scope, fields): boolean {
        let field;

        for (let index in fields) {
            if (Utils_String.equals(fields[index].name, fieldName, true)) {
                field = fields[index];
                break;
            }
        }

        if (field) {
            var doesFieldSupportScopes = field.supportedScopes && field.supportedScopes.length > 0
            return (!doesFieldSupportScopes || field.supportedScopes.indexOf(scope) > -1);
        }

        return true;
    }

    private _updateSubscriberControl(subscriber: string) {
        if (this._isAdmin) {
            this._subscriberLabel.show();
            this._subscriberCombo._element.show();
            if (subscriber.indexOf("\\") >= 0) {
                subscriber = subscriber.slice(subscriber.lastIndexOf("\\") + 1);
            }
            this._subscriberCombo.setText(subscriber || "", false);
        }
        else {
            this._subscriberLabel.hide();
            this._subscriberCombo._element.hide();
        }

    }

    private _validateUri(uriString: string): boolean {
        var regex = new RegExp("^https?://.+$");

        return regex.test(uriString.trim());
    }

    private _isByRoleDeliveryOption() {
        return (this._isTeam && (this._toAddressCombo.getSelectedIndex() === this._getRolesDeliveryOptionIndex()));
    }

    private _isDeliveryToTeamAlias() {
        return (this._isTeam && (this._toAddressCombo.getSelectedIndex() === this._getTeamAliasDeliveryOptionIndex()));
    }

    private _isSoapDelivery() {
        return (this._toAddressCombo.getSelectedIndex() === this._getSoapDeliveryOptionIndex());
    }

    private _supportsSoap() {
        for (var i = 0; i < soapy.length; i++)
        {
            if (soapy[i] === this._eventTypeInfo.id)
            {
                return true;
            }
        }
        return false;
    }

    private _getGroupPreferredDeliveryOptionIndex() {
        var groupPreferredDeliveryOptionIndex = 0;

        if (this._doesEventTypeHaveRoles()) {
            groupPreferredDeliveryOptionIndex = 1;
        }
        return groupPreferredDeliveryOptionIndex;
    }

    private _getTeamAliasDeliveryOptionIndex() {
        var teamAliasOptionIndex = 1;

        if (this._doesEventTypeHaveRoles()) {
            teamAliasOptionIndex = 2;
        }
        return teamAliasOptionIndex;
    }

    private _getSoapDeliveryOptionIndex() {
        var soapOptionIndex = -1;
        if (this._supportsSoap())
        {   
            soapOptionIndex = 3;

            if (this._doesEventTypeHaveRoles()) {
                soapOptionIndex = 4;
            }
        }       
        return soapOptionIndex;
    }

    private _getRolesDeliveryOptionIndex() {
        var rolesOptionIndex = -1;

        if (this._doesEventTypeHaveRoles()) {
            rolesOptionIndex = 0;
        }
        return rolesOptionIndex;
    }

    private _getEachMemberDeliveryOptionIndex() {
        var eachMemberOptionIndex = 2;

        if (this._doesEventTypeHaveRoles()) {
            eachMemberOptionIndex = 3;
        }
        return eachMemberOptionIndex;
    }

    public getSubscription() {
        var criteria = $.extend(true, {}, this._filterControl.getCriteria());
        var clauses = [];
        if (criteria) {
            for (var index in criteria.clauses) {
                if (criteria.clauses[index].fieldName) {
                    clauses.push(criteria.clauses[index]);
                }
            }

            criteria.clauses = clauses;
            this._currentSubscription.filter.criteria = criteria;
        }
        return this._currentSubscription;
    }

    public setReadOnly(readOnly: boolean) {
        this._isReadOnly = readOnly;
        this._nameCombo.setEnabled(!readOnly);
        this._toAddressCombo.setEnabled(!readOnly);
        this._toAddressText.setEnabled(!readOnly);
        this._rolesCombo.setEnabled(!readOnly);
        this._teamProjectsCombo.setEnabled(!readOnly && this._aTeamProjectRadio.attr("checked") === "checked");

        this._filterControl.setReadOnly(readOnly);

        if (this._isReadOnly) {
            var disabled = "disabled";
            this._excludeInitiatorCheckbox.attr("disabled", disabled);
            this._allTeamProjectsRadio.attr("disabled", disabled);
            this._aTeamProjectRadio.attr("disabled", disabled);
        }
        else {
            this._excludeInitiatorCheckbox.removeAttr("disabled");
            this._allTeamProjectsRadio.removeAttr("disabled");
            this._aTeamProjectRadio.removeAttr("disabled");
        }
    }

    private _populateRoles() {
        this._roles = {};
        this._rolesNames = [];
        for (var role in this._eventTypeInfo.roles) {
            var roleInfo = this._eventTypeInfo.roles[role];
            this._roles[roleInfo.id] = roleInfo.name;
            this._rolesNames.push(roleInfo.name);
        }
        this._rolesCombo.setSource(this._rolesNames);
    }

    private _createPropertiesEditor() {
        var that = this, id = Controls.getId();

        // Create the properties container
        const container = $("<div />").addClass("bowtie");
        const detailsContainer = $("<div />").appendTo(container);
        const $propertiesContainer = $("<table />").addClass("subscription-properties-table").appendTo(detailsContainer);

        // Create the header row and columns for the description 
        const headersRow = $("<tr />").appendTo($propertiesContainer);
        const descriptionHeaderCol = $("<td />").appendTo(headersRow);
        const subscriberHeaderCol = $("<td />").addClass("subscriber-col").appendTo(headersRow);

        const labelId = Controls.getId();
        $("<label />")
            .text(NotifResources.DescriptionLabelText)
            .attr({
                "for": id + "_alertEditor_name",
                "id": labelId
            })
            .appendTo(descriptionHeaderCol);

        this._subscriberLabel = $("<label />")
            .text(NotifResources.SubscriberLabelText)
            .attr("for", id + "_alertEditor_name")
            .appendTo(subscriberHeaderCol);

        const controlsRow = $("<tr />").appendTo($propertiesContainer);
        const descriptionCol = $("<td />").appendTo(controlsRow);
        const subscriberCol = $("<td />").addClass("subscriber-col").appendTo(controlsRow);

        this._nameCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, descriptionCol, {
            cssClass: "name-combo",
            mode: "text",
            id: id + "_alertEditor_name",
            allowEdit: true,
            enabled: !this._isReadOnly,
            change: function () { that._onPropertyChanged("name"); },
            ariaAttributes: {
                labelledby: labelId
            }
        });

        this._subscriberCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, subscriberCol, {
            cssClass: "name-combo",
            mode: "text",
            id: id + "_alertEditor_subscriber",
            allowEdit: false,
            enabled: false
        });

        const deliveryOptionsTable = $("<table />").addClass("subscription-properties-table").appendTo(detailsContainer);
        // create the row and columns for the delivery options headers
        const deliveryOptionsHeadersRow = $("<tr>").appendTo(deliveryOptionsTable);
        const deliveryOptionHeaderCol = $("<td />").addClass("subscription-delivery-options-header").appendTo(deliveryOptionsHeadersRow);
        const deliveryAddressHeaderCol = $("<td />").addClass("subscription-delivery-address-header").appendTo(deliveryOptionsHeadersRow);
        const rolesHeaderCol = $("<td />").addClass("subscription-delivery-options-initiator").appendTo(deliveryOptionsHeadersRow);

        $("<label />")
            .text(NotifResources.DeliverToLabelText)
            .attr("for", id + "_alertEditor_address")
            .appendTo(deliveryOptionHeaderCol);

        this._toAddressLabel = $("<label />")
            .text(NotifResources.DeliveryAddressLabelText)
            .attr("for", id + "_alertEditor_address")
            .appendTo(deliveryAddressHeaderCol);

        this._rolesLabel = $("<label />")
            .text(NotifResources.RolesLabelText)
            .attr("for", id + "_alertEditor_roles")
            .appendTo(deliveryAddressHeaderCol);

        // Create the row and columns for the delivery options controls.
        const deliveryOptionscontrolsRow = $("<tr>").appendTo(deliveryOptionsTable);
        const deliveryOptionCol = $("<td  />").addClass("subscription-delivery-options-cells").appendTo(deliveryOptionscontrolsRow);
        const deliveryAddressCol = $("<td  />").addClass("subscription-delivery-options-cells").appendTo(deliveryOptionscontrolsRow);
        const excludeInitiatorCol = $("<td  />").addClass("subscription-delivery-options-cells").appendTo(deliveryOptionscontrolsRow);

        this._toAddressCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, deliveryOptionCol, {
            cssClass: "address-combo",
            mode: "drop",
            enabled: !this._isReadOnly,
            id: id + "_alertEditor_address",
            allowEdit: false,
            change: function () { that._onPropertyChanged("deliveryOption"); },
            ariaAttributes: {
                label: NotifResources.DeliverToLabelText
            }
        });

        this._toAddressText = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, deliveryAddressCol, {
            cssClass: "address-combo",
            mode: "text",
            enabled: !this._isReadOnly,
            id: id + "_alertEditor_addressText",
            allowEdit: true,
            change: function () { that._onPropertyChanged("address"); },
            ariaAttributes: {
                label: NotifResources.ToAddress
            }
        });

        this._rolesCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, deliveryAddressCol, {
            cssClass: "address-combo",
            mode: "drop",
            enabled: !this._isReadOnly,
            id: id + "_alertEditor_rolesCombo",
            allowEdit: false,
            type: Combos.ComboTypeOptionsConstants.MultiValueType,
            change: function () { that._onPropertyChanged("includedRoles"); }
        });

        this._excludeInitiatorCheckbox = $("<input />")
            .attr("id", id + "_alertEditor_roles")
            .attr("type", "checkbox")
            .attr("title", NotifResources.ExcludeInitiatorToolTip)
            .change(delegate(this, this._handleExcludeInitiatorClick))
            .appendTo(excludeInitiatorCol);

        this._excludeInitiatorLabel = $("<label />")
            .text(NotifResources.ExcludeInitiatorLabelText)
            .attr("for", id + "_alertEditor_roles")
            .attr("title", NotifResources.ExcludeInitiatorToolTip)
            .appendTo(excludeInitiatorCol);

        // Create the team projects control
        const projectsContainer = $("<div />").addClass("alerts-filter-section-container scope-controls").appendTo(container);
        $("<legend />")
            .text(NotifResources.TeamProjectLabelText)
            .attr("for", id + "_alertEditor_teamprojects")
            .appendTo(projectsContainer);

        // Create the row and coluns for the project selection controls.
        const projectsTable = $("<table />").addClass("subscription-project-table").appendTo(projectsContainer);
        const row = $("<tr />").appendTo(projectsTable);
        const radioGroupCol = $("<td />").addClass("subscription-projects-radio-group-col").appendTo(row);
        const teamProjectsCol = $("<td />").addClass("subscription-project-combo").appendTo(row);

        const radioGroupContainer = $("<div />").addClass("subscription-projects-radio-group").attr("role", "radiogroup").appendTo(radioGroupCol);
        this._allTeamProjectsRadio = $("<input/>")
            .attr("type", "radio")
            .attr("name", id + "_alertEditor_teamproject")
            .attr("id", id + "_alertEditor_allteamprojects")
            .attr("value", NotifResources.AllTeamProjectsLabelText)
            .attr("checked", "checked")
            .appendTo(radioGroupContainer)
            .click(delegate(this, this._handleAllProjectsClick));

        this._allTeamProjectsLabel = $("<label />")
            .text(NotifResources.AllTeamProjectsLabelText)
            .attr("for", id + "_alertEditor_allteamprojects")
            .appendTo(radioGroupContainer);

        this._aTeamProjectRadio = $("<input/>")
            .addClass("specific-team-project-input")
            .attr("type", "radio")
            .attr("name", id + "_alertEditor_teamproject")
            .attr("id", id + "_alertEditor_specificteamproject")
            .attr("value", NotifResources.SpecificTeamProjectLabelText)
            .appendTo(radioGroupContainer)
            .click(delegate(this, this._handleSpecificProjectClick));

        this._aTeamProjectLabel = $("<label />")
            .text(NotifResources.SpecificTeamProjectLabelText)
            .attr("for", id + "_alertEditor_specificteamproject")
            .appendTo(radioGroupContainer);

        this._teamProjectsCombo = <Combos.Combo>Controls.BaseControl.createIn(
            Combos.Combo,
            teamProjectsCol,
            {
                mode: "drop",
                enabled: !this._isReadOnly,
                id: id + "_alertEditor_teamprojects",
                allowEdit: false,
                change: function () {
                    that._onPropertyChanged("projectScope");
                },
                ariaAttributes: {
                    label: NotifResources.TeamProject
                }
            });

        this._errorLabel = $("<label />")
            .attr("for", id + "_alertEditor_error")
            .addClass("subscription-dialog-error")
            .appendTo(projectsContainer);

        this._errorLabel.hide();

        $("<legend />")
        .text(NotifResources.FilterControlLabelText)
        .attr("for", id + "_alertEditor_teamprojects")
        .appendTo(projectsContainer);

        if (this._isReadOnly) {
            this._excludeInitiatorCheckbox.attr("disabled", "disabled");
            this._allTeamProjectsRadio.attr("disabled", "disabled");
            this._aTeamProjectRadio.attr("disabled", "disabled");
        }

        this._element.append(container);
    }

    private _isDeliveryAddressEnabled(): boolean {
        return (this._isDeliveryToTeamAlias() || (!this._isTeam && this._toAddressCombo.getSelectedIndex() == 1));
    }

    private _handleExcludeInitiatorClick() {
        this._changed = true;
        this._updateFilter(0, "ExcludeInitiator");
    }

    private _updateScopeControl(currentAlert) {
        var projectGuid = AlertFilter.CollectionScope;

        if (currentAlert.scope && currentAlert.scope.id != AlertFilter.CollectionScope && currentAlert.scope.id != Utils_String.EmptyGuidString) {
            this._teamProjectsCombo.setEnabled(!this._isReadOnly);
            this._allTeamProjectsRadio.removeAttr("checked");
            this._aTeamProjectRadio.prop("checked", true);
            projectGuid = currentAlert.scope.id;
        }
        else {
            this._aTeamProjectRadio.removeAttr("checked");
            this._allTeamProjectsRadio.prop("checked", true);
            this._teamProjectsCombo.setEnabled(false);
            if (this._eventTypeInfo && this._eventTypeInfo.supportedScopes && this._eventTypeInfo.supportedScopes.indexOf("project") === -1) {
                this._element.find(".scope-controls").addClass("notif-hide");
                return;
            }
        }

        var projectName = this._viewModel.getTeamProjectName(projectGuid);
        var projectIndex = this._viewModel.getSortedTeamProjectNames().indexOf(projectName);
        if (projectIndex !== -1) {
            this._teamProjectsCombo.setSelectedIndex(projectIndex);
        }
    }

    private _updateAddressControl(currentAlert) {
        var address: string = null;

        if (currentAlert.channel.useCustomAddress) {
            address = currentAlert.channel.address;
        }
        else
            if (currentAlert.channel.type === GroupChannelType) {
                address = this._getSubscriberDeliveryPreferenceText();
            }

        var userDeliveryOptionsSource: string[] = [
            NotifResources.PreferredEmailText,
            NotifResources.OtherEmailText
        ];

        let subscriberName = currentAlert.subscriber.displayName;

        if (this._isTeam) {
            subscriberName = subscriberName.slice(subscriberName.lastIndexOf('\\') + 1);
        }

        let isTeamSubscriber = this._notificationSubscriber && ((this._notificationSubscriber.flags & Notifications_Contracts.SubscriberFlags.IsTeam) === Notifications_Contracts.SubscriberFlags.IsTeam);
        let defaultPreference = isTeamSubscriber ? NotifResources.DefaultTeamDeliveryPreferenceText : NotifResources.DefaultGroupDeliveryPreferenceText;
        var teamDeliveryOptionsSource: string[] = [
            defaultPreference,
            NotifResources.TeamsPreferredEmailText,
            Utils_String.format(NotifResources.AllTeamMembersText, subscriberName)
        ];

        if (this._supportsSoap()) {
            userDeliveryOptionsSource.push(NotifResources.SoapOptionText);
            teamDeliveryOptionsSource.push(NotifResources.SoapOptionText);
        }

        var rolesDeliveryOption: string = Utils_String.format(NotifResources.MembersByRoleText, subscriberName);

        // in case of user subscriptions
        if (!this._isTeam) {
            this._toAddressCombo.setSource(userDeliveryOptionsSource);
            this._hideRoles();
            // the user has an email set
            if (address) {
                this._toAddressText.setEnabled(!this._isReadOnly);
                this._toAddressText.setText(address, false);
                if (currentAlert.channel.type === EmailChannelType) {
                    this._toAddressCombo.setSelectedIndex(1);
                }
                else {
                    this._toAddressCombo.setSelectedIndex(2);
                }
            }
            else {
                this._toAddressCombo.setSelectedIndex(0);
                this._toAddressText.setEnabled(false);
                address = this._notificationSubscriber ? this._notificationSubscriber.preferredEmailAddress : this._viewModel.getSubscriberEmail();
                this._toAddressText.setText(address, false);
            }
        }
        else {
            var hasRoles = this._doesEventTypeHaveRoles();
            let selectedIndex = 0;
            if (hasRoles) {
                teamDeliveryOptionsSource.splice(0, 0, rolesDeliveryOption);
            }

            // in case of team subscriptions
            this._toAddressCombo.setSource(teamDeliveryOptionsSource);

            // if this is not a new subscription or the event type does not have roles then we can check the channel directly
            if (parseInt(currentAlert.id) || !hasRoles) {
                if (currentAlert.channel.type === UserChannelType) {
                    // role based
                    if (currentAlert.filter.type === 'Actor') {
                        selectedIndex = this._getRolesDeliveryOptionIndex();
                        this._showRoles(false);
                        this._updateFilter(0, "NewAlert");
                    }
                    else
                    // path subscription
                    {
                        this._hideRoles();
                        selectedIndex = this._getEachMemberDeliveryOptionIndex();
                    }
                    this._toAddressLabel.hide();
                    this._toAddressText._element.hide();
                    this._toAddressCombo.setSelectedIndex(selectedIndex);
                }
                else {
                    let isGroupDelivery = false;
                    if (currentAlert.channel.type === GroupChannelType) {
                        selectedIndex = this._getGroupPreferredDeliveryOptionIndex();
                        isGroupDelivery = true;
                    }
                    else {
                        if (currentAlert.channel.type === SoapChannelType) {
                            selectedIndex = this._getSoapDeliveryOptionIndex();
                        }
                        else if (!address) {
                            selectedIndex = this._getEachMemberDeliveryOptionIndex();
                        }
                        else {
                            selectedIndex = this._getTeamAliasDeliveryOptionIndex();
                        }
                    }
                    this._toAddressText.setEnabled(!this._isReadOnly && !isGroupDelivery);
                    this._toAddressLabel.show();
                    this._toAddressText._element.show();
                    this._toAddressText.setText(address, false);
                    this._toAddressCombo.setSelectedIndex(selectedIndex);
                    this._hideRoles();
                }
            }
            else // if a new subscription and the event type supports roles then the default is roles
            {
                this._toAddressLabel.hide();
                this._toAddressText._element.hide();
                this._toAddressCombo.setSelectedIndex(0);
                this._showRoles(false);
                this._updateFilter(0, "NewAlert");
            }
        }
    }

    private _doesEventTypeHaveRoles() {
        return (this._roles && Object.keys(this._roles).length > 0);
    }

    private _updateRolesControl(currentAlert) {
        var inclusions = currentAlert.filter.inclusions;
        var exclusions = currentAlert.filter.exclusions;

        if (exclusions && exclusions.indexOf("initiator") > -1) {
            this._excludeInitiatorCheckbox.attr("checked", "true");
        }
        else {
            this._excludeInitiatorCheckbox.removeAttr("checked");
        }


        var includedRoles = this._getIncludedRoles(currentAlert);
        if (includedRoles.length > 0) {
            this._rolesCombo.setText(includedRoles.join(", "));
        }

    }

    private _getIncludedRoles(currentAlert): string[] {
        var inclusions = currentAlert.filter.inclusions;
        var includedRoles = [];

        if (!inclusions || inclusions.length == 0) {
            currentAlert.filter.inclusions = [];
        }

        // for new alerts all roles are checked by default
        for (var role in this._roles) {
            if (!inclusions || inclusions.length == 0) {
                includedRoles.push(this._roles[role]);
                currentAlert.filter.inclusions.push(role);
            }
            else {

                if (inclusions && inclusions.indexOf(role) > -1) {
                    includedRoles.push(this._roles[role]);
                }
            }
        }

        return includedRoles;
    }

    private _showRoles(excludeInitiator) {
        this._rolesCombo._element.show();
        this._rolesLabel.show();
        if (this._eventTypeInfo.hasInitiator) {
            this._excludeInitiatorCheckbox.show();
            this._excludeInitiatorLabel.show();
            var exclusions = [];
            if (this._currentSubscription.filter && this._currentSubscription.filter.exclusions) {
                exclusions = this._currentSubscription.filter.exclusions;

            }
            // for new subscriptions add initiator to exclusions by default
            if (!parseInt(this._currentSubscription.id) || excludeInitiator) {
                exclusions.push("initiator");
                this._currentSubscription.filter.exclusions = exclusions;
            }
        }
        else {
            this._excludeInitiatorCheckbox.hide();
            this._excludeInitiatorLabel.hide();
        }

        this._updateRolesControl(this._currentSubscription);
    }

    private _hideRoles() {
        this._rolesCombo._element.hide();
        this._rolesLabel.hide();
        this._excludeInitiatorCheckbox.hide();
        this._excludeInitiatorLabel.hide();
    }


    private _handleAllProjectsClick() {
        this._changed = true;
        this._teamProjectsCombo.setEnabled(false);
        this._currentSubscription.scope = <Notifications_Contracts.SubscriptionScope>{ id: AlertFilter.CollectionScope };
        this._refreshFieldsAfterScopeChange();
    }

    private _handleSpecificProjectClick() {
        this._changed = true;
        this._teamProjectsCombo.setEnabled(!this._isReadOnly);
        this._handleProjectScopeSelectionChange();
    }

    private _onPropertyChanged(propertyName) {
        var selectedIndex, newSubscriberId, newMail;

        if (this._currentSubscription) {
            switch (propertyName) {
                case "name":
                    if (Utils_String.localeIgnoreCaseComparer(this._currentSubscription.name, this._nameCombo.getText()) !== 0) {
                        this._currentSubscription.description = this._nameCombo.getText();
                        this._changed = true;
                    }
                    break;
                case "address":
                    if (!this._isTeam || this._isDeliveryToTeamAlias() || this._isSoapDelivery()) {
                        newMail = this._toAddressText.getText().trim();
                        if (Utils_String.localeIgnoreCaseComparer(this._currentSubscription.channel.address, newMail) !== 0) {
                            this._currentSubscription.channel.address = newMail;
                            this._changed = true;
                        }
                    }
                    break;
                case "deliveryOption":
                    this._onSetDeliveryOption();
                    this._changed = true;
                    break;
                case "projectScope":
                    this._handleProjectScopeSelectionChange();
                    this._changed = true;
                    break;
                case "includedRoles":
                    this._updateFilter(0, "IncludedRoles");
                    this._changed = true;
                    break;
            }
            if (this._changed) {
                this._currentSubscription.dirty = true;
                this._fireAlertModified();
            }
        }
    }

    private _onSetDeliveryOption() {
        var selectedIndex = this._toAddressCombo.getSelectedIndex();
        this._handleDeliveryOptionUpdated(selectedIndex);
    }

    private _handleProjectScopeSelectionChange() {
        var projectIndex = this._teamProjectsCombo.getSelectedIndex();
        if (projectIndex != -1) {
            var projectName = this._viewModel.getSortedTeamProjectNames()[projectIndex];
            var projectGuid = this._viewModel.getTeamProjectId(projectName);
            if (projectGuid) {
                var scope: Notifications_Contracts.SubscriptionScope = <Notifications_Contracts.SubscriptionScope>{ id: projectGuid, type: "project" };
                this._currentSubscription.scope = scope;
                this._refreshFieldsAfterScopeChange();
            }
        }
    }

    private _refreshFieldsAfterScopeChange() {
        this._viewModel.getFieldInputValues(this._currentSubscription, null, (values: FormInput_Contracts.InputValuesQuery) => {
            // get the updated subscription from the ui and refresh the ui to reflect the new scope
            this._filterControl.setAlert(this.getSubscription(), this._eventTypeInfo, values, this._isTeam, this._isDeliveryToTeamAlias(), this._viewModel, this._webContext);
        });
    }

    private _handleDeliveryOptionUpdated(selectedIndex) {
        if (this._isTeam) {
            this._handleTeamDeliveryOptionUpdated(selectedIndex);
        }
        else {
            this._handleUserDeliveryOptionUpdated(selectedIndex);
        }
    }

    private _handleUserDeliveryOptionUpdated(selectedIndex) {
        if (selectedIndex == 0) {
            this._toAddressText.setEnabled(false);
            this._toAddressText.setText(this._viewModel.getSubscriberEmail(), true);
            this._currentSubscription.channel.useCustomAddress = false;
            this._currentSubscription.channel.type = EmailChannelType;
        }
        else {
            this._toAddressText.setEnabled(true);
            this._toAddressText.setText("", true);
            this._currentSubscription.channel.useCustomAddress = true;
            if (selectedIndex == 2) {
                this._currentSubscription.channel.type = SoapChannelType;
            }
            else {
                this._currentSubscription.channel.type = EmailChannelType;
            }
        }

    }

    private _handleTeamDeliveryOptionUpdated(selectedIndex) {
        var rolesOptionIndex = 0;
        var preferredGroupOptionIndex = 1;
        var teamAiasOptionIndex = 2;
        var allTeamMembersOptionIndex = 3;
        var soapOptionIndex = 4;

        if (!this._doesEventTypeHaveRoles()) {
            rolesOptionIndex--;
            preferredGroupOptionIndex--;
            teamAiasOptionIndex--;
            allTeamMembersOptionIndex--;
            soapOptionIndex--;
        }


        if (selectedIndex == rolesOptionIndex) {
            this._showRoles(true);
            this._toAddressText._element.hide();
            this._toAddressLabel.hide();
            this._filterControl.setTeamDeliveryType(false);
            this._currentSubscription.channel.type = UserChannelType;
        }
        else {
            if (selectedIndex == teamAiasOptionIndex || selectedIndex == soapOptionIndex || selectedIndex == preferredGroupOptionIndex) {
                this._hideRoles();
                this._toAddressLabel.show();
                this._toAddressText._element.show();
                this._filterControl.setTeamDeliveryType(true);
                if (selectedIndex === soapOptionIndex) {
                    this._currentSubscription.channel.type = SoapChannelType;
                    this._toAddressText.setEnabled(!this._isReadOnly);
                    this._currentSubscription.channel.useCustomAddress = true;
                    var address = "";
                    this._toAddressText.setText(address, true);
                }
                else {
                    if (selectedIndex == teamAiasOptionIndex) {
                        this._currentSubscription.channel.type = EmailChannelType;
                        this._toAddressText.setEnabled(!this._isReadOnly);
                        this._currentSubscription.channel.useCustomAddress = true;
                        var address = "";
                        this._toAddressText.setText(address, true);
                    }
                    else {
                        // group preferred delivery preference
                        this._currentSubscription.channel.type = GroupChannelType;
                        this._toAddressText.setEnabled(false);
                        this._toAddressText.setText(this._getSubscriberDeliveryPreferenceText(), false);
                    }
                }
            }

            else {
                this._hideRoles();
                this._toAddressText._element.hide();
                this._toAddressLabel.hide();
                this._filterControl.setTeamDeliveryType(false);
                this._currentSubscription.channel.type = UserChannelType;
            }
        }


        this._updateFilter(selectedIndex, "DeliveryOptions");
    }

    private _updateFilter(selectedIndex, changeType) {

        var clauses: Notifications_Contracts.ExpressionFilterClause[] = [];
        var groups: Notifications_Contracts.ExpressionFilterGroup[] = [];
        var maxGroupLevel: number = 0;
        if (this._currentSubscription.filter.criteria) {
            clauses = this._currentSubscription.filter.criteria.clauses;
            groups = this._currentSubscription.filter.criteria.groups;
            maxGroupLevel = this._currentSubscription.filter.criteria.maxGroupLevel;
        }
        var filterModel: Notifications_Contracts.ExpressionFilterModel = <Notifications_Contracts.ExpressionFilterModel>{ clauses: clauses, groups: groups, maxGroupLevel: maxGroupLevel };
        var filter: any = { eventType: this._currentSubscription.filter.eventType, criteria: filterModel };

        if (selectedIndex == this._getRolesDeliveryOptionIndex()) {
            var inclusions = this._currentSubscription.filter.inclusions;
            var exclusions = this._currentSubscription.filter.exclusions;
            if (changeType == "IncludedRoles") {
                inclusions = [];
                var rolesResult = this._rolesCombo.getSelectedIndex();

                var selectedRoles = "";

                var dropPopUp = this._rolesCombo.getBehavior().getDropPopup<Combos.ComboMultiValueDropPopup>();

                if (dropPopUp) {
                    selectedRoles = dropPopUp.getValue();
                }

                if (selectedRoles != "") {
                    selectedRoles.split(", ").forEach((role) => {
                        inclusions.push(this._getRoleId(role.trim()));
                    });
                }
            }

            if (this._eventTypeInfo.hasInitiator && (changeType == "ExcludeInitiator" || changeType == "DeliveryOptions")) {

                if (this._excludeInitiatorCheckbox.is(':checked')) {
                    if (!exclusions) {
                        exclusions = [];
                    }
                    if (exclusions.indexOf("initiator") <= -1) {
                        exclusions.push("initiator");
                    }
                }
                else {
                    if (exclusions) {
                        var index = exclusions.indexOf("initiator");
                        if (index > -1) {
                            exclusions.splice(index);
                        }
                    }
                }
            }

            filter.inclusions = inclusions;
            filter.exclusions = exclusions;
            filter.type = "Actor";
        }
        else {
            filter.type = "Expression";
        }

        this._currentSubscription.filter = filter;
        this._currentSubscription.channel.address = "";
    }

    private _getRoleId(roleName: string): string {
        for (var role in this._roles) {
            if (this._roles[role] === roleName) {
                return role;
            }
        }
        return "";
    }

    private _fireAlertModified() {
        this._fire("alertModified", this._currentSubscription);
    }

    private _getSubscriberDeliveryPreferenceText(): string {
        let notificationSubscriber = this._viewModel.getNotificationSubscriber();
        if (notificationSubscriber && notificationSubscriber.deliveryPreference) {
            switch (notificationSubscriber.deliveryPreference) {
                case Notifications_Contracts.NotificationSubscriberDeliveryPreference.EachMember: return NotifResources.EachMemberDeliveryLabelText;
                case Notifications_Contracts.NotificationSubscriberDeliveryPreference.NoDelivery: return NotifResources.NoDeliveryLabelText;
                case Notifications_Contracts.NotificationSubscriberDeliveryPreference.PreferredEmailAddress: return notificationSubscriber.preferredEmailAddress;
                default : return NotifResources.NotSetTeamDeliveryPreferenceText;
            };
        }
        return NotifResources.NotSetTeamDeliveryPreferenceText;
    }
}

//  Hacky? Yes. But this list is never going to change.
var soapy = new Array(
    "ms.vss-work.workitem-changed-event",
    "ms.vss-code.checkin-event",
    "ms.vss-codereview.codereview-changed-event",
    "ms.vss-code.git-push-event",
    "ms.vss-code.git-pullrequest-event",
    "ms.vss-code.git-pullrequest-merge-event",
    "ms.vss-build.build-completed-event",
    "ms.vss-build.build-completion-legacy-event",
    "ms.vss-build.build-completion-legacy-event2",
    "ms.vss-build.build-definition-changed-event",
    "ms.vss-build.build-status-change-event",
    "ms.vss-build.build-definition-upgrade-completion-event",
    "ms.vss-code.shelveset-event"
)

export const EmailChannelType = "EmailHtml";
export const SoapChannelType = "Soap";
export const UserChannelType = "User";
export const GroupChannelType = "Group";
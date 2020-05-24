/// <amd-dependency path="jQueryUI/sortable"/>
/// <amd-dependency path="VSS/LoaderPlugins/Css!dashboard" />

import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import Utils_UI = require("VSS/Utils/UI");
import Contribution_Services = require("VSS/Contributions/Services");
import Navigation = require("VSS/Controls/Navigation");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import Utils_String = require("VSS/Utils/String");
import Utils_Html = require("VSS/Utils/Html");
import TFS_Dashboards_RestClient = require("TFS/Dashboards/RestClient");
import Controls_StatusIndicator = require("VSS/Controls/StatusIndicator");
import Controls_Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Context = require("VSS/Context");
import VSS_Notifications = require("VSS/Controls/Notifications");
import Dashboards_Notifications = require("Dashboards/Scripts/Notifications");
import TFS_Dashboards_UserPermissionsHelper = require("Dashboards/Scripts/Common.UserPermissionsHelper");
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import SDK = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import Security_RestClient = require("VSS/Security/RestClient");
import Contracts = require("VSS/Security/Contracts");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import IdentityRestClient = require("VSS/Identities/RestClient");
import WebApiConstants = require("VSS/WebApi/Constants");
import Q = require("q");

export interface IButton {
    id: string;
    text: string;
    click: IArgsFunctionR<any>;
    disabled: string;
    class?: string;
}

export class DashboardsManagerController2 {
    private initialDashboardslist: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];
    private _currentDashboardsList: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];
    public static defaultMinRefreshInterval: number = 5;
    public static defaultNonRefreshInterval: number = 0;

    public constructor(initialDashboardslist: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[]) {
        this.initialDashboardslist = initialDashboardslist;
    }

    /**
     * Get the next available dashboard position
     */
    public nextPosition(): number {
        var max: number = 0;
        this._currentDashboardsList.forEach(function (val, index) {
            if (val.position > max) {
                max = val.position;
            }
        });
        return max + 1;
    }

    /**
     * Get the index of given dashboard id, if doesn't exists return -1
     * @param id - dashboard id
     * @returns position of the dashboard
     */
    public getDashboardIndex(id: string): number {
        let index = -1;
        for (let i = 0; i < this._currentDashboardsList.length; i++) {
            if (this._currentDashboardsList[i].id === id) {
                return i;
            }
        }
        return index;
    }

    /**
     * Deletes dashboard given dashboard id exists
     * @param id - dashboard id
     */
    public deleteDashboard(id: string): void {
        if (this._currentDashboardsList.length === 1) {
            return;
        }
        var that = this;
        this._currentDashboardsList.some(function (val, index) {
            if (val.id === id) {
                that._currentDashboardsList.splice(index, 1);
                return true;
            }
            else {
                return false;
            }
        });
    }

    /**
     * Updates dashboard name if given dashboard id exists
     * @param id - dashboard id
     * @param name - new name for the dashboard
     */
    public updateDashboardName(id: string, name: string): void {
        var that = this;
        this._currentDashboardsList.some(function (val, index) {
            if (val.id === id) {
                Dashboards_Telemetry.DashboardsTelemetry.onDashboardRename(val.name, name, val.id);
                val.name = name;
                return true;
            }
            else {
                return false;
            }
        });
    }

    /**
     * Updates dashboard position if given dashboard id exists
     * @param id - dashboard id
     * @param position - new position for the dashboard
     */
    public updateDashboardPosition(id: string, position: number): void {
        this._currentDashboardsList.some(function (val, index) {
            if (val.id === id) {
                val.position = position;
                return true;
            }
            else {
                return false;
            }
        });
    }

    /**
     * adds dashboard to current list if name is non empty string
     * @param name - name of the dashboard
     */
    public addDashboard(name: string): void {
        if (name == null || name === "" || !this.canAddDashboard()) {
            return;
        }
        var nextPosition = this.nextPosition();
        this._currentDashboardsList.push({
            // This doesn't get sent to server, and is nulled when putting data
            id: "temp-" + TFS_Core_Utils.GUIDUtils.newGuid(),
            name: name,
            position: nextPosition,
            refreshInterval: DashboardsManagerController2.defaultNonRefreshInterval,
            url: null,
            _links: null,
            eTag: null,
            widgets: null,
            description: null,
            ownerId: null
        });
        Utils_Accessibility.announce(TFS_Dashboards_Resources.DashboardInlineEditor_AnnounceSuccessfullyAddedMessage, true);
    }

    /**
     * Updates the dashboards position based on its order in the list
     * @param ids - dashboard ids
     */
    public updateOrder(ids: string[]): void {
        for (var i = 0; i < ids.length; i++) {
            this.updateDashboardPosition(ids[i], i + 1);
        }
    }

    /**
    * update the refreshInterval for the dashboard refresh rate. Negative number would be ignored
    * @param {string} id The dashboard id that we want to update
    * @param {number} refreshInterval The minutes for each refresh to happen
    */
    public updateInterval(id: string, refreshInterval: number): void {
        Diag.Debug.assert(refreshInterval >= 0, "The refreshInterval value should not be less than zero");
        this._currentDashboardsList.some((value, index) => {
            if (value.id == id) {
                //set the interval value to 5, in order to make the value extensible.
                //In future, we might want to add more options to the interval value
                value.refreshInterval = refreshInterval;
                return true;
            }
            else {
                return false;
            }
        });
    }

    /**
     * Gets the dashboards sorted by its position
     */
    public getOrderedList(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        this._currentDashboardsList = TFS_Dashboards_Common.DashboardContractsExtension.sortDashboardsByPosition(this._currentDashboardsList);
        return this._currentDashboardsList;
    }

    /**
     * Checks whether current dashboard list length is within max limit of dashboards per group
     */
    public canAddDashboard(): boolean {
        return this._currentDashboardsList.length < TFS_Dashboards_Common.DashboardPageExtension.getMaxDashboardsPerGroup();
    }

    /**
    * Indicates if the given name is unique among existing dashboards.
    * @return True if given name is unique. False if not
    */
    public validateDashboardNameIsUnique(name: string): boolean {
        return TFS_Dashboards_Common.DashboardPageExtension.validateDashboardNameIsUnique(this._currentDashboardsList, name);
    }

    /**
     * Initializes the current list of dashboard, with list passed into the constructor
     */
    public loadData(): void {
        this._currentDashboardsList = this.initialDashboardslist.slice();
    }

    /**
     * Returns newly auto refresh enabled dashboards
     */
    public autoRefreshEnabledDashboardList(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {

        //Get the list of auto refresh enabled dashboards when user clicks done.
        var finalList: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] = new Array();
        this._currentDashboardsList.forEach((item) => {
            if (item.refreshInterval > 0) {
                finalList.push(item);
            }
        });

        //Minus the list of auto refresh enabled dashboards when the page loads
        //The result is for newly enabled dashboards list
        this.initialDashboardslist.forEach((item) => {
            if (item.refreshInterval > 0) {
                var found = finalList.indexOf(item);
                if (found >= 0) {
                    finalList.splice(found, 1);
                }
            }
        });
        return finalList;
    }
}

export interface DashboardsManagerControlOptions {
    initialDashboardsList: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    labelledByTabId: string;
    nextFocusableElement: JQuery;
}

export class DashboardsManagerControl extends Controls.Control<DashboardsManagerControlOptions> {
    private _$newDashboardButton: JQuery;
    private _$dashboardsList: JQuery;
    private _$newDashboardInput: JQuery;
    private _DashboardManagerController: DashboardsManagerController2;

    public static dashboardAutoRefreshCheckbox = "auto-refresh-checkbox";

    public initializeOptions(options?: DashboardsManagerControlOptions) {
        super.initializeOptions($.extend({
            cssClass: "dashboards-manager"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._DashboardManagerController = new DashboardsManagerController2(this._options.initialDashboardsList);

        this.getElement()
            .attr("role", "tabpanel")
            .attr("aria-labelledby", this._options.labelledByTabId);

        let tab = $(`#${this._options.labelledByTabId}`);
        tab.attr("aria-controls", this.getId());

        this.createNewDashboardControls();
        this.createDashboardListHeaders();
        this._$dashboardsList =
            $(Utils_UI.domElem("ul", TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListContainer))
                .attr("tabindex", "-1") // in firefox, the container tries to take focus if its contents are scrollable which isn't needed here.
                .appendTo(this.getElement());

        this.handleKeydownEventsOnGrid();
        this._loadData();
    }

    private createDashboardListHeaders(): void {
        var container = $("<div>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerListHeaderContainer)
            .addClass("clearfix") // Children are floated
            .appendTo(this.getElement());

        $("<span>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerListHeaderName)
            .text(TFS_Dashboards_Resources.DashboardManager_List_NameTitle).appendTo(container);

        $("<span>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerListHeaderAutorefresh)
            .text(TFS_Dashboards_Resources.DashboardManager_List_AutorefreshTitle).appendTo(container);
    }

    public notifyError(errorMessage: string): void {
        alert(errorMessage);
    }

    private createNewDashboardControls(): void {
        var addDashboard = () => {
            if (!this._DashboardManagerController.canAddDashboard()) {
                this.notifyError(Utils_String.format(TFS_Dashboards_Resources.ErrorCreateDashboardTooManyDashboard,
                    TFS_Dashboards_Common.DashboardPageExtension.getMaxDashboardsPerGroup()));
                return;
            }

            if (!this._DashboardManagerController.validateDashboardNameIsUnique(this._$newDashboardInput.val())) {
                this.notifyError(TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
                return;
            }

            this._DashboardManagerController.addDashboard(this._$newDashboardInput.val());
            this._renderList();

            this._$newDashboardInput.val("");
            this._$newDashboardInput.focus();
        };

        var $container = $("<div>")
            .addClass(TFS_Dashboards_Constants.BowTieClassNames.Bowtie)
            .appendTo(this.getElement());

        var $fieldset = $("<fieldset>")
            .addClass(TFS_Dashboards_Constants.BowTieClassNames.SideBySide)
            .appendTo($container);

        $("<label>")
            .attr("for", TFS_Dashboards_Constants.DomIds.DashboardManager_CreateNewDashboard_Textbox)
            .text(TFS_Dashboards_Resources.DashboardManager_CreateNewDashboardLabel)
            .appendTo($fieldset);

        const $createDashboardFieldWrapper = $("<div/>")
            .addClass("create-dashboard-field-wrapper")
            .appendTo($fieldset);

        this._$newDashboardInput = $("<input type='text'>")
            .attr("id", TFS_Dashboards_Constants.DomIds.DashboardManager_CreateNewDashboard_Textbox)
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerCreateNewDashboardTextbox)
            .attr("placeholder", TFS_Dashboards_Resources.ManageDashboardsDialogNewDashboardPlaceholderText)
            .attr("maxlength", TFS_Dashboards_Constants.DashboardWidgetLimits.MaxDashboardNameLength)
            .appendTo($createDashboardFieldWrapper);

        this._$newDashboardButton = $("<button>")
            .attr("type", "button")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerCreateNewDashboardButton)
            .text(TFS_Dashboards_Resources.DashboardManager_CreateNewDashboard_ButtonText)
            .click(() => {
                addDashboard();
                this.toggleCTAButtonState($(this), true);
            })
            .appendTo($createDashboardFieldWrapper);


        if (this._options.allowCreate) {
            this._$newDashboardInput
                .keyup((event) => {
                    if (event.which == Utils_UI.KeyCode.ENTER) {
                        event.preventDefault();
                        addDashboard();
                        this.toggleCTAButtonState(this._$newDashboardButton, true);
                    }
                    else {
                        // Disable the new dashboard button if there is no text entered
                        this.toggleCTAButtonState(this._$newDashboardButton, $(event.target).val().length === 0);
                    }
                });
        } else {
            this.setDisabled(this._$newDashboardInput);
        }

        // make a non submit button in the dialog accessible.
        Utils_UI.accessible(this._$newDashboardButton);

        // Start with the add button disabled
        this.setDisabled(this._$newDashboardButton);
    }

    private toggleCTAButtonState(element: JQuery, isDisabled: boolean) {
        element.prop("disabled", isDisabled);
        element.toggleClass("cta", !isDisabled);
    }

    private _loadData() {
        this._DashboardManagerController.loadData();
        this._renderList();
    }

    private getDashboardItemElements(val: TFS_Dashboards_Contracts.DashboardGroupEntryResponse): JQuery {
        let dashboardId = val.id;
        let listItem: JQuery = $("<li/>")
            .attr("tabindex", "0")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItem)
            .attr(TFS_Dashboards_Constants.JQuerySelectors.ManagerListID, val.id);

        let dragHandle: JQuery = $("<span/>")
            .addClass("bowtie-icon")
            .addClass("bowtie-resize-grip")
            .addClass("dashboad-manager-drag-handle");

        let dashboardNameInputContainer = $("<div/>")
            .attr("tabindex", "0")
            .addClass("dashboard-list-item-name-container");

        let dashboardNameInput: JQuery = $("<input/>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItemName)
            .attr("type", "text")
            .attr("value", val.name)
            .attr("maxlength", TFS_Dashboards_Constants.DashboardWidgetLimits.MaxDashboardNameLength)
            .attr("aria-label", TFS_Dashboards_Resources.Manager_Input_AriaLabel)
            .attr(TFS_Dashboards_Constants.JQuerySelectors.ManagerListID, dashboardId)
            .appendTo(dashboardNameInputContainer);

        let dashboardRefreshCheckBox: JQuery = $("<input/>")
            .addClass(DashboardsManagerControl.dashboardAutoRefreshCheckbox)
            .attr("type", "checkbox")
            .attr("aria-label", Utils_String.format(TFS_Dashboards_Resources.AutoRefreshAriaLabelFormat, val.name))
            .attr(TFS_Dashboards_Constants.JQuerySelectors.ManagerListID, dashboardId);

        let deleteDashboardButton: JQuery = $("<button/>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItemDelete)
            .attr("aria-label", Utils_String.format(TFS_Dashboards_Resources.ManagerRemoveDashboardAriaLabelFormat, val.name))
            .attr(TFS_Dashboards_Constants.JQuerySelectors.ManagerListID, dashboardId)
            .click((event: JQueryEventObject) => {
                this.deleteDashboard(dashboardId);
                return false;
            }).focus((event: JQueryEventObject) => {
                // if SHIFT+TAB sets focus on delete button move focus to first row
                if (this._options.nextFocusableElement[0] === event.relatedTarget) {
                    this._$dashboardsList.children()[0].focus();
                    return false;
                }
            });

        if (!this._options.allowDelete) {
            deleteDashboardButton.attr("disabled", "disabled");
        }

        // make a non submit button accessible in the dialog
        Utils_UI.accessible(deleteDashboardButton);

        let deleteIcon = $("<span/>")
            .addClass("bowtie-icon bowtie-edit-delete disabled-color")
            .appendTo(deleteDashboardButton);

        this.handleListItemKeydownEvent(listItem, dashboardNameInputContainer);
        this.handleNameInputContainerKeydownEvent(dashboardNameInputContainer, dashboardNameInput, dashboardRefreshCheckBox, listItem);
        this.handleDashboardNameInputKeydownEvent(dashboardNameInput, dashboardNameInputContainer);
        this.handleRefreshCheckboxKeydownEvent(dashboardRefreshCheckBox, deleteDashboardButton, dashboardNameInputContainer);
        this.handleDeleteDashboardKeydown(deleteDashboardButton, dashboardId, listItem, dashboardRefreshCheckBox);

        let disableDeleteIcon = () => {
            this.toggleDeleteIconButton(deleteIcon, false);
        };

        let enableDeleteIcon = () => {
            this.toggleDeleteIconButton(deleteIcon, deleteDashboardButton.prop("disabled") === false);
        };

        listItem
            .focusin(enableDeleteIcon)
            .focusout(disableDeleteIcon)
            .hover(enableDeleteIcon, disableDeleteIcon);

        listItem
            .append(dragHandle)
            .append(dashboardNameInputContainer)
            .append(dashboardRefreshCheckBox)
            .append(deleteDashboardButton);

        return listItem;
    }

    private handleKeydownEventsOnGrid() {
        this._$dashboardsList.on("keydown", (event: JQueryKeyEventObject) => {
            let code = event.which || event.keyCode;
            switch (code) {
                case Utils_UI.KeyCode.TAB:
                    if (event.shiftKey) {
                        if (this._$newDashboardButton.prop("disabled") === false) {
                            this._$newDashboardButton.focus();
                        } else {
                            this._$newDashboardInput.focus();
                        }
                    } else {
                        this._options.nextFocusableElement.focus();
                    }
                    return false;
                case Utils_UI.KeyCode.UP:
                    this.gridUpOrDown(event, true);
                    return false;
                case Utils_UI.KeyCode.DOWN:
                    this.gridUpOrDown(event, false);
                    return false;
                case Utils_UI.KeyCode.HOME:
                    let first = event.currentTarget.firstChild;
                    if (first) {
                        $(first).focus();
                    }
                    return false;
                case Utils_UI.KeyCode.END:
                    let last = event.currentTarget.lastChild;
                    if (last) {
                        $(last).focus();
                    }
                    return false;
            }
        });
    }

    /**
     *
     * @param event - keydown event object
     * @param up - true if UP arrow is pressed, false if DOWN arrow is pressed
     */
    private gridUpOrDown(event: JQueryKeyEventObject, up: boolean) {
        let sibling = up ? event.target.previousSibling : event.target.nextSibling;
        if (sibling) {
            if (event.ctrlKey) {
                if (sibling.nodeName === "LI") {
                    up ? $(event.target).insertBefore($(sibling)) : $(event.target).insertAfter($(sibling));
                    this._$dashboardsList.trigger("sortupdate");
                    $(event.target).focus();
                }
            } else {
                if (sibling.nodeName === "LI") {
                    $(sibling).focus();
                } else {
                    // if arrow is pressed on input, checkbox or button inside row, will set focus on previous/next row
                    let currentParent = $(sibling).closest("li")[0];
                    let neighbour = up ? currentParent.previousSibling : currentParent.nextSibling;
                    neighbour
                        ? $(neighbour).focus()
                        : $(currentParent).focus(); // when there is only one row, then set focus on itself
                }
            }
        }
    }

    private handleListItemKeydownEvent(listItem: JQuery, dashboardNameInputContainer: JQuery) {
        listItem.on("keydown", (event: JQueryEventObject) => {
            let code = event.which || event.keyCode;
            if (code === Utils_UI.KeyCode.RIGHT) {
                dashboardNameInputContainer.focus();
                return false;
            }
        });
    }

    private deleteButtonHandleUpOrDown(event: JQueryEventObject, listItem: JQuery, up: boolean): boolean {
        if (event.ctrlKey) {
            event.stopImmediatePropagation();
        } else {
            let sibling = up ? listItem[0].previousSibling : listItem[0].nextSibling;
            let previousSibling = sibling;
            if (previousSibling) {
                $(previousSibling).focus();
            } else {
                listItem.focus();
            }
            return false;
        }
    }

    private handleDeleteDashboardKeydown(deleteDashboardButton: JQuery, dashboardId: string, listItem: JQuery, dashboardRefreshCheckBox: JQuery) {
        deleteDashboardButton.on("keydown", (event: JQueryEventObject) => {
            let code = event.which || event.keyCode;
            switch (code) {
                case Utils_UI.KeyCode.ENTER:
                    this.deleteDashboard(dashboardId);
                    return false;
                case Utils_UI.KeyCode.UP:
                    return this.deleteButtonHandleUpOrDown(event, listItem, true);
                case Utils_UI.KeyCode.DOWN:
                    return this.deleteButtonHandleUpOrDown(event, listItem, false);
                case Utils_UI.KeyCode.RIGHT:
                    listItem.focus();
                    return false;
                case Utils_UI.KeyCode.LEFT:
                    dashboardRefreshCheckBox.focus();
                    return false;
            }
        });
    }

    private deleteDashboard(dashboardId: string) {
        let dashboardIndex = this._DashboardManagerController.getDashboardIndex(dashboardId);
        let numberOfDashboards = this._$dashboardsList.children().length;

        this._DashboardManagerController.deleteDashboard(dashboardId);
        this._renderList();

        // if last dashboard is deleted, set focus on previous element else set focus at same position
        if (dashboardIndex + 1 === numberOfDashboards) {
            dashboardIndex = dashboardIndex - 1;
        }

        let element = this._$dashboardsList.children()[dashboardIndex];
        element.focus();
    }

    private handleNameInputContainerKeydownEvent(dashboardNameInputContainer: JQuery, dashboardNameInput: JQuery, dashboardRefreshCheckBox: JQuery, listItem: JQuery) {
        dashboardNameInputContainer.on("keydown", (event: JQueryEventObject) => {
            let code = event.which || event.keyCode;
            switch (code) {
                case Utils_UI.KeyCode.ENTER:
                    dashboardNameInput.focus();
                    return false;
                case Utils_UI.KeyCode.F2:
                    dashboardNameInput.focus();
                    return false;
                case Utils_UI.KeyCode.RIGHT:
                    dashboardRefreshCheckBox.focus();
                    return false;
                case Utils_UI.KeyCode.LEFT:
                    listItem.focus();
                    return false;
            }
        });
    }

    private handleDashboardNameInputKeydownEvent(dashboardNameInput: JQuery, dashboardNameInputContainer: JQuery) {
        dashboardNameInput.on("keydown", (event: JQueryEventObject) => {
            let code = event.which || event.keyCode;
            switch (code) {
                case Utils_UI.KeyCode.ENTER:
                    dashboardNameInputContainer.focus();
                    return false;
                case Utils_UI.KeyCode.F2:
                    dashboardNameInputContainer.focus();
                    return false;
                case Utils_UI.KeyCode.ESCAPE:
                    dashboardNameInputContainer.focus();
                    return false;
                case Utils_UI.KeyCode.RIGHT:
                case Utils_UI.KeyCode.LEFT:
                case Utils_UI.KeyCode.HOME:
                case Utils_UI.KeyCode.END:
                    event.stopImmediatePropagation();
            }
        });
    }

    private handleRefreshCheckboxKeydownEvent(dashboardRefreshCheckBox: JQuery, deleteDashboardButton: JQuery, dashboardNameInputContainer: JQuery) {
        dashboardRefreshCheckBox.on("keydown", (event: JQueryEventObject) => {
            let code = event.which || event.keyCode;
            if (code === Utils_UI.KeyCode.RIGHT) {
                deleteDashboardButton.focus();
                return false;
            } else if (code === Utils_UI.KeyCode.LEFT) {
                dashboardNameInputContainer.focus();
                return false;
            }
        });
    }

    private _renderList(): void {

        var dashboardsArray = this._DashboardManagerController.getOrderedList();

        var dashboardsList: JQuery[] = [];
        dashboardsArray.forEach((val) => {
            let dashboard: JQuery = this.getDashboardItemElements(val);
            let checkbox = dashboard.find("." + DashboardsManagerControl.dashboardAutoRefreshCheckbox);
            //we might want set the interval to different value for on-prem users, so here we just check if the interval is larger than 0
            checkbox.prop("checked", val.refreshInterval > 0);

            dashboardsList.push(dashboard);
        });
        this._$dashboardsList.empty();
        this._$dashboardsList.append(dashboardsList);

        var that = this;

        if (this._options.allowDelete) {
            // Disable the delete button if there is only one dashboard
            // Otherwise add click and hover event handlers
            if (dashboardsList.length === 1) {
                var deleteIconButton = $(this._$dashboardsList).find(".dashboard-list-item-delete .bowtie-icon");
                that.toggleDeleteIconButton(deleteIconButton, false);
                // Also make the button not tabable.
                deleteIconButton.attr("tabindex", -1);
                $(this._$dashboardsList).find("." + TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItemDelete)
                    .prop("disabled", true);
            }
        }

        if (this._options.allowEdit) {
            $(this._$dashboardsList).find("." + DashboardsManagerControl.dashboardAutoRefreshCheckbox)
                .change((arg) => {
                    let isChecked = $(arg.target).is(":checked");
                    let interval = isChecked ? DashboardsManagerController2.defaultMinRefreshInterval : DashboardsManagerController2.defaultNonRefreshInterval;

                    this._DashboardManagerController.updateInterval(arg.target.attributes["data-id"].value, interval);
                });

            $(this._$dashboardsList).find("." + TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItemName)
                .change((arg) => {
                    var updatedName = $(arg.target).val();

                    // If user tried to empty out the dashboard name, re-render list so it resets it
                    if (updatedName == "") {
                        this._renderList();
                    }
                    else if (!this._DashboardManagerController.validateDashboardNameIsUnique(updatedName)) {
                        this.notifyError(TFS_Dashboards_Resources.ErrorCreateDashboardNameAlreadyExists);
                        this._renderList();
                    }
                    else {
                        // Don't need to re-render as this should be in sync
                        this._DashboardManagerController.updateDashboardName(
                            arg.target.attributes["data-id"].value, updatedName);
                    }
                });

            this._$dashboardsList.sortable({
                opacity: 0.4,
            });
            this._$dashboardsList.on("sortupdate", () => {
                this._updateOrder();
            });

        } else {
            this.disableDashboardList(this._$dashboardsList);
        }
    }

    private disableDashboardList($dashboardsList: JQuery): void {
        // Disable dashboard name inputs
        this.setDisabled($dashboardsList.find(`.${TFS_Dashboards_Constants.DomClassNames.ManagerDashboardListItemName}`));

        // Disable auto-refresh checkboxes
        this.setDisabled($dashboardsList.find(`.${DashboardsManagerControl.dashboardAutoRefreshCheckbox}`));
    }

    private setDisabled($elements: JQuery): void {
        $elements.prop("disabled", true);
    }

    private _updateOrder(): void {
        // Get sorted array of elements from JQuery UI .sortable() and update the positions
        var sortedList = <string[]><any>this._$dashboardsList.sortable("toArray",
            { attribute: TFS_Dashboards_Constants.JQuerySelectors.ManagerListID } as JQueryUI.SortableOptions);
        this._DashboardManagerController.updateOrder(sortedList);
    }

    public toggleDeleteIconButton(element: JQuery, isEnabled: boolean): void {
        element.toggleClass(TFS_Dashboards_Constants.DomClassNames.DisabledColor, !isEnabled);
    }

    public getOrderedList(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        return this._DashboardManagerController.getOrderedList();
    }

    public autoRefreshEnabledDashboardList(): TFS_Dashboards_Contracts.DashboardGroupEntryResponse[] {
        return this._DashboardManagerController.autoRefreshEnabledDashboardList();
    }

    public notifySizeChange(size: number): void {
        var currentHeight = this._$dashboardsList.height();
        this._$dashboardsList.height(currentHeight - size);
    }
}

export interface PermissionsManagerControlOptions {
    initialValue: TFS_Dashboards_Contracts.TeamDashboardPermission | TFS_Dashboards_Contracts.GroupMemberPermission; // This is a number if we are using the new security namespace.
    allowEdit: boolean;
    labelledByTabId: string;
    isAdminPage?: boolean;
}

/*
 * Deprecated:
 * This Dialog operates with the Legacy permissions namespace. this uses radio buttons to select a permissions level
 * Operates with the GroupMemberPermission Enum.
 */
export class LegacyPermissionsManagerControl extends Controls.Control<PermissionsManagerControlOptions> {
    public static get radioGroupName() { return "permissions"; }
    public static get radioButtonJQuerySelector() { return `input[name='${LegacyPermissionsManagerControl.radioGroupName}']`; }

    public initializeOptions(options?: PermissionsManagerControlOptions) {
        super.initializeOptions($.extend({
            // TODO: Remove bowtie from here and put on DashboardsManagerDialog2 once the DashboardsManagerControl is ready for updating (don't forget to update CSS accordingly)
            cssClass: `permissions-manager ${TFS_Dashboards_Constants.BowTieClassNames.Bowtie}`
        }, options));
    }

    public initialize(): void {
        super.initialize();

        var legend = $("<legend/>")
            .text(TFS_Dashboards_Resources.ManagePermissionsLegend);

        this.createDocumentationLink(legend);

        this.getElement()
            .attr("role", "tabpanel")
            .attr("aria-labelledby", this._options.labelledByTabId)
            .append($("<fieldset/>")
                .append(legend)
                .append(this.createRadioOption(TFS_Dashboards_Contracts.GroupMemberPermission.None,
                    "permissions-none",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionNone,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionNone))
                .append(this.createRadioOption(TFS_Dashboards_Contracts.GroupMemberPermission.Edit,
                    "permissions-edit",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionEdit,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionEdit))
                .append(this.createRadioOption(TFS_Dashboards_Contracts.GroupMemberPermission.Manage,
                    "permissions-manage",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionManage,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionManage)));

        let tab = $(`#${this._options.labelledByTabId}`);
        tab.attr("aria-controls", this.getId());

        if (!this._options.allowEdit) {
            this.disable();
        }
    }

    public getSelected(): TFS_Dashboards_Contracts.GroupMemberPermission {
        var selectedValue: string = this.getElement().find(`${LegacyPermissionsManagerControl.radioButtonJQuerySelector}:checked`).val();
        return +selectedValue;
    }

    private disable(): void {
        this.getElement().find(LegacyPermissionsManagerControl.radioButtonJQuerySelector).prop("disabled", true);
    }

    private createRadioOption(value: TFS_Dashboards_Contracts.GroupMemberPermission, id: string, text: string, description: string): JQuery {
        return $("<div/>")
            .append($("<input/>")
                .attr("type", "radio")
                .attr("name", LegacyPermissionsManagerControl.radioGroupName)
                .attr("id", id)
                .prop("checked", value === this._options.initialValue)
                .val(value.toString()))
            .append($("<label/>").attr("for", id).text(text))
            .append($("<div/>").addClass("description").text(description));
    }

    /**
     * Creates a documentation link
     * @returns {JQuery} The paragraph with documentation link
     */
    private createDocumentationLink(container: JQuery): void {
        var link = $("<a>");
        link.attr("href", TFS_Dashboards_Common.FwLinks.PermissionsOnManageDashboards);
        link.attr("target", "_blank");
        link.text(TFS_Dashboards_Resources.ManagePermissionsLearnMoreFwLink);

        var icon = $("<span class='" + TFS_Dashboards_Constants.BowTieClassNames.Icon + " bowtie-navigate-external'></span>");

        container.append(link);
        container.append(icon);
    }
}

/*
 * A new dialog for managing permissions. This dialog interacts with the new security namespace as of M125.
 * This operates with the TeamDashboardPermission Enum.
 * Checkbox values are unioned together bitwise and passed as an enum union. 
 * For the old permission namespace model see the LegacyPermissionsManagerControl.
 */
export class PermissionsManagerControl extends Controls.Control<PermissionsManagerControlOptions> {
    public static get checkboxGroupName() { return "permissions"; }
    public static get checkboxJQuerySelector() { return `input[name='${PermissionsManagerControl.checkboxGroupName}']`; }

    private _securityHttpClient: Security_RestClient.SecurityHttpClient;
    private _currentPermissions: Contracts.AccessControlList[];
    private _adminAclPromise: Q.Deferred<void>;
    private _dashboardsHttpClient: TFS_Dashboards_RestClient.DashboardHttpClient;

    public initializeOptions(options?: PermissionsManagerControlOptions) {
        super.initializeOptions($.extend({
            // TODO: Remove bowtie from here and put on DashboardsManagerDialog2 once the DashboardsManagerControl is ready for updating (don't forget to update CSS accordingly)
            cssClass: `permissions-manager ${TFS_Dashboards_Constants.BowTieClassNames.Bowtie}`
        }, options));
    }

    public initialize(): void {
        super.initialize();

        if (this._options.isAdminPage) {
            this._adminAclPromise = Q.defer();

            this._securityHttpClient = Service.getClient<Security_RestClient.SecurityHttpClient>(Security_RestClient.SecurityHttpClient);
            this._dashboardsHttpClient = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();

            const getDashboardsToMaterialize = this._dashboardsHttpClient.getDashboards(TFS_Dashboards_Common.getTeamContext());
            const getAccessControlLists = this.getAccessControlLists();

            Q.all([getDashboardsToMaterialize, getAccessControlLists]).then(() => {
                this.configureCheckboxes();
                this._adminAclPromise.resolve();
            }, (error: any) => {
                this._adminAclPromise.reject(error);
            });

        } else {
            this.configureCheckboxes();
        }
    }

    public getSelected(): number {
        var selectedValues: JQuery = this.getElement().find(`${PermissionsManagerControl.checkboxJQuerySelector}:checked`);
        var newPermissions = TFS_Dashboards_Contracts.TeamDashboardPermission.Read; // Read permission is not revokable at this time.
        selectedValues.each(function () {
            newPermissions |= $(this).val();
        });
        return newPermissions;
    }

    private configureCheckboxes() {

        let $container: JQuery = this.getElement();
        let $adminHeaderContainer: JQuery = $("<div/>").appendTo($container);
        let $checkboxContainer: JQuery = $("<div/>");

        if (this._options.isAdminPage) {
            let $adminHeaderContainer: JQuery = $("<div/>").addClass('admin-header-container').appendTo($container);

            $adminHeaderContainer
                .append($("<div/>")
                    .addClass('admin-hub-title')
                    .text(TFS_Dashboards_Resources.AdminDashboardsHub))
                .append($("<div/>")
                    .addClass('admin-hub-subtitle')
                    .text(TFS_Dashboards_Resources.AdminDashboardsSecuritySubTitle))
                .append($("<div/>")
                    .addClass('admin-hub-description')
                    .text(TFS_Dashboards_Resources.AdminDashboardsSecurityDescription))

            $checkboxContainer.addClass('admin-checkbox-container');
        } else {
            var legend = $("<legend/>")
                .text(TFS_Dashboards_Resources.ManagePermissionsLegend);

            this.createDocumentationLink(legend);
        }
        
        $checkboxContainer
            .attr("role", "tabpanel")
            .attr("aria-labelledby", this._options.labelledByTabId)
            .append($("<fieldset/>")
                .append(legend)
                .append(this.createCheckboxOption(TFS_Dashboards_Constants.DashboardsPermissions.Create,
                    "permissions-create",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionCreate,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionCreate))
                .append(this.createCheckboxOption(TFS_Dashboards_Constants.DashboardsPermissions.Edit,
                    "permissions-edit",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionEdit,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionEdit))
                .append(this.createCheckboxOption(TFS_Dashboards_Constants.DashboardsPermissions.Delete,
                    "permissions-manage",
                    TFS_Dashboards_Resources.ManagePermissionsDialogOptionDelete,
                    TFS_Dashboards_Resources.ManagePermissionsDialogDescriptionDelete)))
                .appendTo($container);

        let tab = $(`#${this._options.labelledByTabId}`);
        tab.attr("aria-controls", this.getId());

        if (!this._options.allowEdit) {
            this.disable();
        }
    }

    private disable(): void {
        this.getElement().find(PermissionsManagerControl.checkboxJQuerySelector).prop("disabled", true);
    }

    private createCheckboxOption(value: number, id: string, text: string, description: string): JQuery {
        return $("<div/>")
            .append($("<input/>")
                .attr("type", "checkbox")
                .attr("name", PermissionsManagerControl.checkboxGroupName)
                .attr("id", id)
                .prop("checked", this.getCheckboxCheckedState(value))
                .val(value.toString())
                .change(() => {
                    if (this._options.isAdminPage) {
                        this.saveAdminData();
                    }
                }))
            .append($("<label/>").attr("for", id).text(text))
            .append($("<div/>").addClass("description").text(description));
    }

    private getCheckboxCheckedState(value: number): boolean {
        let allow = this._options.initialValue;
        if (this._options.isAdminPage) {
            let acesDictionary = this._currentPermissions[0] ? this._currentPermissions[0].acesDictionary : undefined;
            allow = acesDictionary ? acesDictionary[Object.keys(acesDictionary)[0]].allow : 1;
        }
        return (value & allow) != 0;
    }

    private getAccessControlLists(): IPromise<void> {
        let identityHttpClient = Service.VssConnection.getConnection().getHttpClient(IdentityRestClient.IdentitiesHttpClient, WebApiConstants.ServiceInstanceTypes.SPS);

        const teamContext = TFS_Dashboards_Common.getDashboardTeamContext();
        const context = Context.getDefaultWebContext();

        let projectId = context.project.id;
        let teamId = teamContext.id;
        let securityToken = "$/" + projectId + "/" + teamId;

        return identityHttpClient.readIdentities(null, teamId).then((identities: any[]) => {
            let identityDescriptor = identities[0].descriptor;
            return this._securityHttpClient.queryAccessControlLists(TFS_Dashboards_Constants.DashboardSecurity.SecurityNamespaceGuid, securityToken, identityDescriptor, true, false).then((acls: Contracts.AccessControlList[]) => {
                this._currentPermissions = acls;
            });
        });
    }

    private saveAdminData(): IPromise<boolean> {
        let aces = null;
        let updatedAcls: Contracts.AccessControlList[] = [];

        return Q.allSettled([this._adminAclPromise]).then(() => {
            let selectedPermissions = this.getSelected()
            this._currentPermissions.map(acl => {
                aces = acl.acesDictionary;
                Object.keys(aces).forEach(currentKey => {
                    aces[currentKey].allow = selectedPermissions;
                    aces[currentKey].deny = ~selectedPermissions &
                        (TFS_Dashboards_Constants.DashboardsPermissions.Read |
                        TFS_Dashboards_Constants.DashboardsPermissions.Create | 
                        TFS_Dashboards_Constants.DashboardsPermissions.Edit |
                        TFS_Dashboards_Constants.DashboardsPermissions.Delete |
                        TFS_Dashboards_Constants.DashboardsPermissions.ManagePermissions); // We want to strip off the trailing 1's after inverting.
                });

                let updatedAcl: Contracts.AccessControlList = acl;
                updatedAcl.acesDictionary = aces;
                updatedAcls.push(updatedAcl);
            });

            let aclCollectionWrapper = {
                value: updatedAcls as Contracts.AccessControlListsCollection
            } as WebApi_Contracts.VssJsonCollectionWrapperV<Contracts.AccessControlListsCollection>

            return this._securityHttpClient.setAccessControlLists(aclCollectionWrapper, TFS_Dashboards_Constants.DashboardSecurity.SecurityNamespaceGuid).then(() => {
                return true;
            });
        });

    }

    /**
     * Creates a documentation link
     * @returns {JQuery} The paragraph with documentation link
     */
    private createDocumentationLink(container: JQuery): void {

        var link = $("<a>");
        link.attr("href", TFS_Dashboards_Common.FwLinks.PermissionsOnManageDashboards);
        link.attr("target", "_blank");
        link.text(TFS_Dashboards_Resources.ManagePermissionsLearnMoreFwLink);

        var icon = $("<span class='" + TFS_Dashboards_Constants.BowTieClassNames.Icon + " bowtie-navigate-external'></span>");

        container.append(link);
        container.append(icon);
    }
}

export interface DashboardsManagerDialog2Options extends Controls_Dialogs.IModalDialogOptions {
    closeCallback: (dashboardsGroup?: TFS_Dashboards_Contracts.DashboardGroup) => void;
}

export class DashboardsManagerDialog2 extends Controls.Control<DashboardsManagerDialog2Options> {
    static width = 570;
    static height = 476;

    public static dashboardsManagerTabId = "dashboards-manager-tab";
    public static permissionsManagerTabId = "permissions-manager-tab";
    private okButtonId = "ok";

    /**
     * Public for tests only.
     */
    public static get tabInfo(): Navigation.IPivotViewItem[] {
        return [
            {
                text: TFS_Dashboards_Resources.DashboardManager_DashboardsTabName,
                id: DashboardsManagerDialog2.dashboardsManagerTabId
            },
            {
                text: TFS_Dashboards_Resources.DashboardManager_PermissionsTabName,
                id: DashboardsManagerDialog2.permissionsManagerTabId
            },
        ];
    };

    private client: TFS_Dashboards_RestClient.DashboardHttpClient;

    private _dialogContainer: Controls_Dialogs.ModalDialog;
    private _dialogOptions: Controls_Dialogs.IModalDialogOptions;
    private _statusControl: Controls_StatusIndicator.StatusIndicator;

    private pivotView: Navigation.PivotView;

    private messageAreaContainer: JQuery;
    private _messageArea: VSS_Notifications.MessageAreaControl;

    private _dashboardsManager: DashboardsManagerControl;
    private _permissionsManager: PermissionsManagerControl | LegacyPermissionsManagerControl;
    private _initialGroupPermissions: any; // This is an int if we are using the new security namespace. otherwise it is a TFS_Dashboards_Contracts.GroupMemberPermission
    private _initialDashboardList: TFS_Dashboards_Contracts.DashboardGroupEntryResponse[];

    constructor(options: DashboardsManagerDialog2Options) {
        super(options);

        this.client = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();

        this._dialogOptions = {
            width: DashboardsManagerDialog2.width,
            height: DashboardsManagerDialog2.height,
            resizable: false,
            autoOpen: true, // For JQuery-UI
            buttons: this._getButtons(),
            title: TFS_Dashboards_Resources.ManageDashboardsDialogTitleText,
            cssClass: TFS_Dashboards_Constants.DomClassNames.ManagerDialog,
            close: () => this._options.closeCallback()
        } as Controls_Dialogs.IModalDialogOptions;
    }

    public initialize() {
        super.initialize();

        this._dialogContainer = <Controls_Dialogs.ModalDialog>Controls_Dialogs.ModalDialog.create(
            Controls_Dialogs.ModalDialog,
            this._dialogOptions);
        this._dialogContainer.getElement().focus();

        this._statusControl = Controls.create<Controls_StatusIndicator.StatusIndicator, Controls_StatusIndicator.IStatusIndicatorOptions>(
            Controls_StatusIndicator.StatusIndicator,
            this._dialogContainer.getElement(), {
                center: true,
                imageClass: "big-status-progress",
                message: TFS_Dashboards_Resources.LoadingMessage
            });
        this._statusControl.start();

        this._attachMessageArea();

        this.client.getDashboards(TFS_Dashboards_Common.getTeamContext())
            .then(dashboardGroup => {
                var webContext = Context.getDefaultWebContext();

                var enablePermissionsManager = TFS_Dashboards_UserPermissionsHelper.CanManagePermissionsForDashboards();

                var enableDashboardEdit = TFS_Dashboards_UserPermissionsHelper.CanEditDashboard();
                var enableDashboardCreate = TFS_Dashboards_UserPermissionsHelper.CanCreateDashboards();
                var enableDashboardDelete = TFS_Dashboards_UserPermissionsHelper.CanDeleteDashboards();
                var enableAllManageOperations = enableDashboardEdit || enableDashboardCreate || enableDashboardDelete;

                var groupPermission: any;
                var permissionsManagerClass: any = LegacyPermissionsManagerControl;

                if (dashboardGroup.teamDashboardPermission) { // If modernPermissions comes down then we are in the new security namespace.
                    groupPermission = dashboardGroup.teamDashboardPermission;
                    permissionsManagerClass = PermissionsManagerControl; // use the modern class instead.
                } else {
                    groupPermission = dashboardGroup.permission;
                }

                this._initialGroupPermissions = groupPermission;
                this._initialDashboardList = $.extend(true, [], dashboardGroup.dashboardEntries);

                this._attachNavigation();

                this._dashboardsManager = Controls.create<DashboardsManagerControl, DashboardsManagerControlOptions>(
                    DashboardsManagerControl,
                    this._dialogContainer.getElement(), {
                        initialDashboardsList: dashboardGroup.dashboardEntries,
                        allowCreate: enableDashboardCreate,
                        allowEdit: enableDashboardEdit,
                        allowDelete: enableDashboardDelete,
                        labelledByTabId: DashboardsManagerDialog2.dashboardsManagerTabId,
                        nextFocusableElement: this._dialogContainer.getElement().parent("div.ui-dialog").find("#" + this.okButtonId),
                    });




                this._permissionsManager = Controls.create<LegacyPermissionsManagerControl, PermissionsManagerControlOptions>(
                    permissionsManagerClass,
                    this._dialogContainer.getElement(), {
                        initialValue: groupPermission,
                        allowEdit: enablePermissionsManager,
                        labelledByTabId: DashboardsManagerDialog2.permissionsManagerTabId
                    });

                if (!enableAllManageOperations) {
                    this.setMessageArea(TFS_Dashboards_Resources.ManageDashboardsDialogInsufficientPermissions, VSS_Notifications.MessageAreaType.Info);
                    this._dialogContainer.updateOkButton(false);
                } else if (!enableDashboardEdit || !enableDashboardCreate || !enableDashboardDelete) {
                    this.setMessageArea(TFS_Dashboards_Resources.ManageDashboardsDialogAllOperationsNotPermitted, VSS_Notifications.MessageAreaType.Info);
                }

                // Select default tab
                this.pivotView.setSelectedView(DashboardsManagerDialog2.dashboardsManagerTabId);

                this._dashboardsManager.getElement().find(":tabbable").first().focus();

                this._statusControl.complete();
            });
    }

    public getDialog(): Controls_Dialogs.ModalDialog {
        return this._dialogContainer;
    }

    private _attachMessageArea(): void {
        this.messageAreaContainer = $("<div>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.ManagerMessageArea)
            .css("display", "none")
            .appendTo(this._dialogContainer.getElement());

        this._messageArea = Controls.create(VSS_Notifications.MessageAreaControl,
            this.messageAreaContainer, {
                closeable: false,
                showIcon: true
            });
    }

    private setMessageArea(message: string, messageType?: VSS_Notifications.MessageAreaType): void {
        this.messageAreaContainer.css("display", "block");
        this._messageArea.setMessage(message, messageType);
        this.adjustDashboardListHeight(this.messageAreaContainer.outerHeight(true));
    }

    private adjustDashboardListHeight(size: number): void {
        this._dashboardsManager.notifySizeChange(size);
    }

    private _attachNavigation(): void {
        var $tabsContainer = $("<div/>").addClass("views");
        this._populateTabs($tabsContainer);

        this._dialogContainer.getElement()
            .append($tabsContainer);
    }

    private _populateTabs($container: JQuery): void {
        this.pivotView = Controls.create(Navigation.PivotView, $container, { items: DashboardsManagerDialog2.tabInfo });

        // The id property of IPivotViewItem objects is used to set data-id of the <li>
        // parent of the tabs rather than the id attribute of the tab <a> tags themselves.
        // We want to set the id attribute on the tab elements, so we retrieve the
        // data-id we set and use it to set the id of the tabs here.
        this.pivotView.getElement()
            .find("li")
            .each((i, e) => {
                let dataId = e.getAttribute("data-id");
                e.setAttribute("id", dataId);
            });
        this.pivotView.getElement().on("changed", (sender, view) => this._onTabChanged(sender, view));
    }

    private _onTabChanged(sender: JQueryEventObject, view: Navigation.IPivotViewItem): void {
        switch (view.id) {
            case DashboardsManagerDialog2.dashboardsManagerTabId:
                this._permissionsManager.hideElement();
                this._dashboardsManager.showElement();
                break;
            case DashboardsManagerDialog2.permissionsManagerTabId:
                this._dashboardsManager.hideElement();
                this._permissionsManager.showElement();
                break;
            default:
                break;
        }
    }

    private _getButtons(): IButton[] {
        return [
            {
                id: this.okButtonId,
                text: TFS_Dashboards_Resources.DashboardManager_SaveButtonText,
                click: Utils_Core.delegate(this, this._onDoneClicked),
                disabled: null,
                class: "cta"
            }, {
                id: "cancel-button",
                text: TFS_Dashboards_Resources.ManageDashboardsDialogCancelText,
                click: () => this._dialogContainer.close(),
                disabled: null
            }];
    }

    private _onDoneClicked() {
        this.telemetryForEnablingAutoRefresh();
        this.saveData()
            .then(dashboardsGroup => {
                this._dialogContainer.close();
                this._options.closeCallback(dashboardsGroup);
            }, e => {
                if (e.status === 403 /* permissions */) {
                    var message = Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_PermissionDenied,
                        `<a onclick='location.reload(true)' href='${window.location.href}'>${TFS_Dashboards_Resources.Refresh_Link}</a>`);

                    this.notifyAndClose(message);
                }
                else if (e.status === 409 /* conflict */ || e.status === 404 /* Not found */) {
                    var message = Utils_String.format(TFS_Dashboards_Resources.Error_DashboardOutOfSync,
                        `<a onclick='location.reload(true)' href='${window.location.href}'>${TFS_Dashboards_Resources.ManageDashboardsDialog_RefreshLink}</a>`);

                    this.notifyAndClose(message);
                }
                else {
                    // TODO: Use ErrorParser.stringifyError(e) for error. Requires moving utility from Widgets to Dashboards project.
                    this.setMessageArea(e.message);
                }
            });
    }

    private notifyAndClose(message: string): void {
        Dashboards_Notifications.DashboardMessageArea.setMessage(VSS_Notifications.MessageAreaType.Error, message, true);
        this._dialogContainer.close();
    }

    private saveData(): IPromise<TFS_Dashboards_Contracts.DashboardGroup> {
        var dashboardsList = this._dashboardsManager.getOrderedList();

        let dashboardsAdded = 0;
        dashboardsList.forEach(function (dash) {
            if (dash.id.lastIndexOf("temp-") >= 0) {
                dash.id = null;
                ++dashboardsAdded;
            }
        });

        let index;
        let dashboardsReordered = 0;
        const sortInitialList = TFS_Dashboards_Common.DashboardContractsExtension.sortDashboardsByPosition(
            this._initialDashboardList);
        const length = Math.min(sortInitialList.length, dashboardsList.length);
        for (index = 0; index < length; ++index) {
            if (index === sortInitialList.length || index === dashboardsList.length) {
                break;
            }
            if (sortInitialList[index].id !== dashboardsList[index].id) {
                ++dashboardsReordered;
            }
        }

        var radioButtonSelectedPermissions: TFS_Dashboards_Contracts.GroupMemberPermission = null; // Used pre-migration to the new namespace.
        var checkboxSelectedPermissions: TFS_Dashboards_Contracts.TeamDashboardPermission = null;

        var effectiveSelectedPermissions: any = null;

        // Depending on which permissions manager we have, we will evaluate selected permissions differently
        if (this._permissionsManager instanceof LegacyPermissionsManagerControl) {
            radioButtonSelectedPermissions = this._permissionsManager.getSelected();
            effectiveSelectedPermissions = radioButtonSelectedPermissions;
        }
        else {
            checkboxSelectedPermissions = this._permissionsManager.getSelected();
            effectiveSelectedPermissions = checkboxSelectedPermissions;
        }

        var dashboardGroup: TFS_Dashboards_Contracts.DashboardGroup = {
            dashboardEntries: dashboardsList,
            permission: radioButtonSelectedPermissions,
            teamDashboardPermission: checkboxSelectedPermissions, // Server will use this if it is not null.
            _links: null,
            url: null
        };

        return this.client.replaceDashboards(dashboardGroup, TFS_Dashboards_Common.getTeamContext()).then((dashboardGroup: TFS_Dashboards_Contracts.DashboardGroup) => {
            Dashboards_Telemetry.DashboardsTelemetry.onReplaceDashboards(dashboardGroup);
            if (dashboardsAdded > 0 || dashboardsReordered > 0) {
                Dashboards_Telemetry.DashboardsTelemetry.onSaveDashboards(dashboardsAdded, dashboardsReordered);
            }
            if (effectiveSelectedPermissions != this._initialGroupPermissions) {
                Dashboards_Telemetry.DashboardsTelemetry.onPermissionsChanged(effectiveSelectedPermissions);
            }
            return dashboardGroup;
        });
    }

    //Telemetry for how many dashboards have enabled auto refresh
    private telemetryForEnablingAutoRefresh() {
        var listForTelemetry = this._dashboardsManager.autoRefreshEnabledDashboardList();
        listForTelemetry.forEach((item) => {
            Dashboards_Telemetry.DashboardsTelemetry.onEnablingAutoRefresh(item.id);
        });
    }
}

SDK.registerContent("hubs.dashboardsPermissions", (context) => {

    // For new vertical settings hub, we will have a specific team defined from the request.
    // We will overwrite the old legacy TFS context's team information with this so that
    // the existing hub continues to work as expected.
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const teamData = pageDataService.getPageData<{ team: { id: string, name: string }}>("ms.vss-tfs-web.team-data");
    if (teamData) {
        const webContext = Context.getDefaultWebContext();
        if (!webContext.team) {
            webContext.team = { id: teamData.team.id, name: teamData.team.name };
        }
        else {
            webContext.team.id = teamData.team.id;
            webContext.team.name = teamData.team.name;
        }
    }

    return Controls.create(PermissionsManagerControl, context.$container, {
        initialValue: TFS_Dashboards_UserPermissionsHelper.getTeamPermissions(),
        allowEdit: TFS_Dashboards_UserPermissionsHelper.CanManagePermissionsForDashboards(),
        labelledByTabId: '',
        isAdminPage: true
    });
});
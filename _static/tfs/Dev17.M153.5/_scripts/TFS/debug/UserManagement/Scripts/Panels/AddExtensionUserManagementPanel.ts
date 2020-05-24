import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Utils_String = require("VSS/Utils/String");
import ExtStatusCtrl = require("UserManagement/Scripts/Controls/ExtensionLicenseStatusLabelControl");
import RowSvMgr = require("UserManagement/Scripts/Utils/RowSavingManager");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class AddExtensionUserManagementPanel extends Controls.BaseControl {
    private static IDENTITY_PICKER_CONSUMER_ID: string = "0C97B5EF-EF13-4DB5-A722-F628738045AB";
    private static _controlType = "AddExtensionUserManagementPanel";
    public static placeHolderString = "pending";
    public $extensionLicenseStatusLabelControl: ExtStatusCtrl.ExtensionLicenseStatusLabelControl;

    private _displayPanel: any;
    private _panelContainer: any;
    private _addUserToExtensionSave: any;
    private _editAction: any;
    private _resetAction: any;
    private _extensionId: any;
    private _menuItem: any;
    private _messageArea: any;
    private _maximumEmailLength = 256;
    private _savingManager: RowSvMgr.RowSavingManager;
    private _rowIds: number[];
    private _licenseCount: any;
    private _selectedUsers: Identities_RestClient.IEntity[];
    private _identityPickerSearchControl: IdentityPicker.IdentityPickerSearchControl;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this.$extensionLicenseStatusLabelControl = <ExtStatusCtrl.ExtensionLicenseStatusLabelControl>Controls.Enhancement.enhance(
            ExtStatusCtrl.ExtensionLicenseStatusLabelControl,
            $(".userHub-account-view"),
            { tfsContext: this._options.tfsContext });

        this._displayPanel = this._options.displayPanel;
        this._menuItem = this._options.menuItem;
        this._messageArea = this._options.messageArea;
        this._savingManager = this._options.savingManager;
        this._createPanel();
        $(this._addUserToExtensionSave).bind("click", delegate(this, this._submitPanel));
        $(this._panelContainer).bind("keydown", delegate(this, this._enterSubmit));
    }

    public setExtensionId(extensionId: string) {
        this._extensionId = extensionId;
    }

    private _enterSubmit(e): boolean {
        if (e.which === $.ui.keyCode.ENTER) {
            if (!this._identityPickerSearchControl || !this._identityPickerSearchControl.isDropdownVisible()) {
                this._submitPanel();
                e.stopPropagation();
                return false;
            }
            return true;
        }
        if (e.which === $.ui.keyCode.ESCAPE) {
            if (!this._identityPickerSearchControl || !this._identityPickerSearchControl.isDropdownVisible()) {
                this.exitPanel();
                e.stopPropagation();
                return false;
            }
            return true;
        }
        return true;
    }

    /// <summary>Set up the html elements for the add panel</summary>
    public _createPanel() {
        this._element.hide();
        this._panelContainer = $(domElem("div")).appendTo(this._element).addClass("add-extension-panel");

        var assignUsersToExtensionRow = $(domElem("div")).appendTo(this._panelContainer).attr("id", "assignUsersToExtensionRow").addClass("assign-users-to-extension-row");
        var closePanel = $(domElem("div")).appendTo(assignUsersToExtensionRow).addClass("bowtie-icon bowtie-navigate-close user-hub-bowtie-exit-panel").attr("tabindex", "0").click(delegate(this, this.exitPanel));

        var bowtieExtensionRow = $(domElem('div')).appendTo(assignUsersToExtensionRow).attr("class", "bowtie");
        var bowtieExtensionFieldset = $(domElem('fieldset')).appendTo(bowtieExtensionRow);

        var assignUsersToExtensionLabel = bowtieExtensionFieldset.append("<label id=\"assignUsersToExtensionLabel\" class=\"assign-users-to-extension-label\" for=\"name\">" + AccountResources.AssignUsersToExtensionLabel + "</label>");
        var inputContainer = $(domElem("div")).appendTo(bowtieExtensionFieldset).addClass("identity-container");


        var buttonContainer = $(domElem('div')).appendTo(bowtieExtensionFieldset).addClass("button-container").attr('tabindex', '1');
        var buttonString = "<button class=\"cta assign-users-to-extension-button\">" + AccountResources.AddUserToExtensionSave + "</button>";
        this._addUserToExtensionSave = buttonContainer.append(buttonString);

        inputContainer.addClass("identity-picker-search-container");
        var operationScope: Identities_Services.IOperationScope = {
            IMS: true,
        };
        var identityType: Identities_Services.IEntityType = {
            User: true,
            Group: false,
        };

        this._identityPickerSearchControl = Controls.create(
            IdentityPicker.IdentityPickerSearchControl,
            inputContainer,
            <IdentityPicker.IIdentityPickerSearchOptions>{
                operationScope: operationScope,
                identityType: identityType,
                multiIdentitySearch: true,
                showContactCard: true,
                showMru: true,
                pageSize: 5,
                elementId: "add-extension-user-email-input",
                size: IdentityPicker.IdentityPickerControlSize.Large,
                consumerId: AddExtensionUserManagementPanel.IDENTITY_PICKER_CONSUMER_ID
            });
    }


    /// <summary>Attempts to add a user to the user hub grid</summary>
    private _submitPanel() {
        this._messageArea.clear();

        var result = this._identityPickerSearchControl.getIdentitySearchResult();
        var usernames = result.resolvedEntities;
        this._disableAdd();
        this._rowIds = [];
        var nextRow = this._savingManager._grid.length();

        var usersObject = [];
        for (var i in usernames) {
            var userObject = {
                UserName: usernames[i].signInAddress.trim(),
                DisplayName: usernames[i].displayName.trim(),
                ObjectId: usernames[i].localId.trim()
            };
            usersObject.push(userObject);
        }

        var ciData = {
            TotalLicenses: this.$extensionLicenseStatusLabelControl.$labelDiv.getTotal(),
            InUseLicenses: this.$extensionLicenseStatusLabelControl.$labelDiv.getInUse(),
            AssignSource: AddExtensionUserManagementPanel._controlType
        };

        //Make call to get data.
        CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl("AddMultipleUsersToExtension", "apiusermanagement"),
            {
                serializedUsers: JSON.stringify(usersObject),
                extensionId: this._extensionId,
                ciData: JSON.stringify(ciData)
            },
            delegate(this, this._addUserToExtensionSuccess),
            delegate(this, this._addUserToExtensionFailed)
        );

        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.clear();
            this._disableAdd();
        }
        this.hideElement();
    }

    /// <summary>Change grid state based on response from server</summary>
    private _addUserToExtensionSuccess(data) {
        var bools = [false, true, true, false, false, true];
        this._enableAdd();
        if (data.error) {
            this._messageArea.setMessage(data.error, Notifications.MessageAreaType.Error);
            for (var i in this._rowIds) {
                this._savingManager.clearRowSaving(this._rowIds[i]);
                this._savingManager._grid.removePlaceholder();
            }
            this._rowIds = [];
        } else {
            for (var i in this._rowIds) {
                this._savingManager.clearRowSaving(this._rowIds[i]);
            }
            this._rowIds = [];
            var errors = false;
            var errorText = "";
            for (var i in data) {
                if (data[i].error) {
                    errors = true;
                    errorText += ("\n" + data[i].error);
                }
            }

            if (data.aad) {
                if (data.aadTenantName) {
                    this._messageArea.setMessage($("<div> " + Utils_String.format(AccountResources.AddAADUserWithTenantName, data.aadTenantName) + "</div>"), Notifications.MessageAreaType.Warning);
                    eventService.fire("tfs-update-grid", null);
                } else {
                    this._messageArea.setMessage($("<div> " + AccountResources.AddAADUser + "</div>"), Notifications.MessageAreaType.Warning);
                    eventService.fire("tfs-update-grid", null);
                }
            }

            if (errors) {
                this._messageArea.setMessage(errorText.trim(), Notifications.MessageAreaType.Error);
                eventService.fire("tfs-update-grid", null);
            } else {
                eventService.fire("tfs-update-grid", true);
            }
            eventService.fire("tfs-update-menubar", bools);
        }
    }

    /// <summary> Clean up after adding user has failed</summary>
    private _addUserToExtensionFailed(error) {
        this._messageArea.setMessage(AccountResources.AddUserError, Notifications.MessageAreaType.Error);
        for (var i in this._rowIds) {
            this._savingManager.clearRowSaving(this._rowIds[i]);
            this._savingManager._grid.removePlaceholder();
        }
        this._rowIds = [];
        this.exitPanel();
        this._enableAdd();
    }

    private _disableAdd() {
        $(this._addUserToExtensionSave).find(":input").prop("disabled", true);
    }

    private _enableAdd() {
        $(this._addUserToExtensionSave).find(":input").removeAttr("disabled");
    }

    /// <summary> Close the add panel</summary>
    public exitPanel() {
        this._element.hide();
        this._menuItem.removeClass("highlight-button");
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.clear();
        }

        var obj = { "panel": "add", "open": false };
        eventService.fire("tfs-resize-grid", obj);
    }

    public _focusSearchInput() {
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.focusOnSearchInput();
        }
    }
}

VSS.initClassPrototype(AddExtensionUserManagementPanel, {
    _displayPanel: null,
    _panelContainer: null,
    _editAction: null,
    _resetAction: null,
    _extensionId: null,
    _messageArea: null,
    _maximumEmailLength: 0,
    _savingManager: null,
    _addUser: null,
    _menuItem: null
});

VSS.classExtend(AddExtensionUserManagementPanel, SPS_Host_TfsContext.TfsContext.ControlExtensions);
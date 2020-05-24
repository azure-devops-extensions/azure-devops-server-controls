
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
import RowSvMgr = require("UserManagement/Scripts/Utils/RowSavingManager");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

/// This class represents the elements used to add a user to the grid
export class AddUserManagementPanel extends Controls.BaseControl {

    private static _controlType: string = 'AddUserManagementPanel';
    public static _placeHolderString: string = 'pending';

    private _displayPanel: any;
    private _panelContainer: any;
    private _licenseElem: any;
    private _licenseCombo: any;
    private _addUser: any;
    private _emailInput: any;
    private _licenseValues: any;
    private _editAction: any;
    private _resetAction: any;
    private _licenses: any;
    private _menuItem: any;
    private _emailValidationPattern: any;
    private _messageArea: any;
    private _emailError: any;
    private _maximumEmailLength: number = 256;
    private _savingManager: RowSvMgr.RowSavingManager;
    private _rowIds: number[];
    private _isAadAccount: boolean;
    private _licenseCount: any;
    private _tenantName: string;
    private _selectedUsers: Identities_RestClient.IEntity[];
    private _identityPickerSearchControl: IdentityPicker.IdentityPickerSearchControl;

    /// <summary>This view is responsible for managing the account signup2 page.</summary>
    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        //check if the account is Aad backed and the featureflag is set to use related features
        this._isAadAccount = false;
        if (this._options.isAadAccount) {
            this._isAadAccount = true;
        }
        if (this._options.tenantName) {
            this._tenantName = this._options.tenantName;
        }

        this._displayPanel = this._options.displayPanel;
        this._menuItem = this._options.menuItem;
        this._emailValidationPattern = /^([a-zA-Z0-9_\-\.']+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,12}|[0-9]{1,3})(\]?)$/;
        this._messageArea = this._options.messageArea;
        this._savingManager = this._options.savingManager;
        this._createPanel();
        this._emailInput = this._element.find('#email-input');
        if (!this._isAadAccount) {
            $(this._emailInput).bind("keyup", delegate(this, this._keyupEmail));
        }
        $(this._addUser).bind("click", delegate(this, this._submitPanel));
        $(this._panelContainer).bind("keyup", delegate(this, this._enterSubmit));

        eventService.attachEvent("tfs-update-adduserdropdown", delegate(this, this._updateDropDown));
        this._bind(IdentityPicker.IdentityPickerSearchControl.INVALID_INPUT_EVENT, delegate(this, this._disableAdd));
        this._bind(IdentityPicker.IdentityPickerSearchControl.VALID_INPUT_EVENT, delegate(this, this._enableAdd));
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
                this._exitPanel();
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
        this._panelContainer = $(domElem('div')).appendTo(this._element).addClass("add-panel");

        var emailRow = $(domElem('div')).appendTo(this._panelContainer).attr("id", "emailRow").addClass("email-row");
        var licenseRow = $(domElem('div')).appendTo(this._panelContainer).attr("id", "licenseRow").addClass("license-row");

        var closePanel = $(domElem('div')).appendTo(emailRow).addClass("bowtie-icon bowtie-navigate-close user-hub-bowtie-exit-panel").attr('tabindex', '0').click(delegate(this, this._exitPanel));

        //Set up license row
        var bowtieLicenseRow = $(domElem('div')).appendTo(licenseRow).attr("class", "bowtie");
        var bowtieLicenseFieldset = $(domElem('fieldset')).appendTo(bowtieLicenseRow);
        var licenseLabel = bowtieLicenseFieldset.append("<div id=\"licenseLabel\" class=\"license-label\"><label for=\"name\">" + AccountResources.LicenseLabel + "</label></div>");
        var icon = $(domElem('label')).appendTo(bowtieLicenseFieldset).addClass("icon-holder").attr("data-tooltip", AccountResources.UserPanelToolTip);
        this._licenseElem = $(domElem('div')).appendTo(bowtieLicenseFieldset).addClass("license-combo");

       

        //Create LicenseCombo
        this._licenseCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._licenseElem, {
            allowEdit: false
        });

        var buttonContainer = $(domElem('div')).appendTo(bowtieLicenseFieldset).addClass("adjust-bowtie-container button-container").attr('tabindex', '1');
        var addButtonContainer = $(domElem('div')).appendTo(buttonContainer).addClass("add-button");
        var buttonString = "<button class=\"cta\">" + AccountResources.AddUserButtonText + "</button>";
        this._addUser = addButtonContainer.append(buttonString);

        var emailLabel: JQuery;
        //Set up email Row
        var bowtieEmailRow = $(domElem('div')).appendTo(emailRow).attr("class", "bowtie");
        var bowtieEmailFieldset = $(domElem('fieldset')).appendTo(bowtieEmailRow);
        if (!this._isAadAccount) {
            emailLabel = bowtieEmailFieldset.append("<label for=\"name\" id=\"emailLabel\" class=\"email-label\">" + AccountResources.EmailLabel + "</label>");
        }
        else {
            emailLabel = bowtieEmailFieldset.append("<label for=\"name\" id=\"emailLabel\" class=\"email-label\">" + AccountResources.AadEmailLabel + "</label>");
        }

        var inputContainer = $(domElem('div')).appendTo(bowtieEmailFieldset).addClass("email-container");
        if (!this._isAadAccount) {
            this._emailInput = inputContainer.append('<input type="text" class="email-input" id="email-input" /> ');
        }
        else {
            inputContainer.addClass("identity-picker-search-container");
            var operationScope: Identities_Services.IOperationScope = {
                AAD: true
            };
            var identityType: Identities_Services.IEntityType = {
                User: true,
            };
            this._identityPickerSearchControl = Controls.create(IdentityPicker.IdentityPickerSearchControl, inputContainer, <IdentityPicker.IIdentityPickerSearchOptions>{
                //Directory Service params
                operationScope: operationScope,
                identityType: identityType,
                multiIdentitySearch: true,
                showContactCard: true,
                elementId: "email-input",
                consumerId: "9BF7C35C-4919-4A62-BBC8-DA7ED4BB48B5",
                size: IdentityPicker.IdentityPickerControlSize.Large,
            });
            this._identityPickerSearchControl.getElement().attr("aria-expanded", "false")
            inputContainer.css('height', 'auto'); // setting it back to original min-max value
            $('.add-button', this._panelContainer).attr("disabled", "disabled");
        }
        this._emailError = $(domElem('div')).appendTo(emailRow).attr("id", "errorRow").addClass("error-row");
    }

    /// <summary>Attempts to add a user to the user hub grid</summary>
    private _submitPanel() {
        this._messageArea.clear();
        if (this._validate()) {
            var usernames = [];
            if (this._isAadAccount) {
                usernames = this._selectedUsers;
            } else {
                var emails = [];
                emails = $(this._emailInput).val().trim().split(";");
                $.each(emails, function () {
                    var email = this.trim();
                    if (email) {
                        usernames.push(email);
                    }
                });
            }
            $(this._emailInput).attr("value", "");
            this._disableAdd();
            this._rowIds = [];
            var nextRow = this._savingManager._grid.length();
            for (var i in usernames) {
                //Add placeholder object to the grid and mark row as raving
                if (this._isAadAccount) {
                    var placeholder = {
                        isMsdn: false,
                        LicenseType: this._licenseCombo.getText(),
                        Name: usernames[i].displayName.trim(),
                        SignInAddress: usernames[i].signInAddress.trim(),
                        Status: "",
                        UserId: AddUserManagementPanel._placeHolderString
                    };
                } else {
                    var placeholder = {
                        isMsdn: false,
                        LicenseType: this._licenseCombo.getText(),
                        Name: usernames[i].trim(),
                        SignInAddress: usernames[i].trim(),
                        Status: "",
                        UserId: AddUserManagementPanel._placeHolderString
                    };
                }
                this._rowIds.push(nextRow);
                this._savingManager._grid.addPlaceholder(placeholder);
                this._savingManager.markRowAsSaving(nextRow);
                //Notify Hub control that save is in progress
                this._fire("saveInProgess", { currentRow: nextRow });
                nextRow++;
            }
            var usersObject = [];
            var license = this._licenseValues[this._licenseCombo.getText()];
            for (var i in usernames) {
                var userObject: UserObject;
                if (this._isAadAccount) {
                    userObject = { UserName: usernames[i].signInAddress.trim(), LicenseType: license, DisplayName: usernames[i].displayName.trim(), ObjectId: usernames[i].originId.trim() };
                } else {
                    userObject = { UserName: usernames[i].trim(), LicenseType: license, DisplayName: "", ObjectId: "" };
                }
                usersObject.push(userObject);
            }

            //Make call to get data.
            CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl('AddMultipleUsers', 'apiusermanagement'),
                {
                    serializedUsers: JSON.stringify(usersObject)
                },
                // handle success.
                delegate(this, this._addUserSuccess),
                // handle error.
                delegate(this, this._addUserFailed)
            );

            if (this._identityPickerSearchControl) {
                this._identityPickerSearchControl.clear();
                this._disableAdd();
            }
            this.hideElement();
        }
    }

    /// <summary> Create dictionary to map friendly license name to license enums</summary>
    private _initDictionary() {
        var licenseValues = {};
        $.each(this._licenses, function () {
            licenseValues[this.LicenseType] = this.LicenseEnum;
        });

        return licenseValues;
    }

    /// <summary> Validate user to add to grid</summary>
    private _validate() {
        var flag = true;
        var signInAddresses = [];
        if (this._isAadAccount) {
            var idr = this._identityPickerSearchControl.getIdentitySearchResult();
            if ((idr.unresolvedQueryTokens && idr.unresolvedQueryTokens.length > 0) || !idr.resolvedEntities || idr.resolvedEntities.length == 0) {
                return false;
            }
            this._selectedUsers = idr.resolvedEntities;
            signInAddresses = this._selectedUsers;
        } else {
            var emails = [];
            emails = $(this._emailInput).val().trim().split(";");
            var that = this;
            $.each(emails, function () {
                var email = this.trim();
                if (email) {
                    if (!that._emailValidationPattern.test(email) || email.length > email._maximumEmailLength) {
                        flag = false;
                    } else {
                        signInAddresses.push(email);
                    }
                }
            });
            if (signInAddresses.length == 0) {
                flag = false;
            }
            if (!flag) {
                $(this._emailInput).css("border-color", "#e6b9b9");
                this._emailError.show();
                this._emailError.text(AccountResources.UserHubInvalidEmail);
                return flag;
            }
        }
        var licenseEnum = this._licenseValues[this._licenseCombo.getText()];
        if (licenseEnum == "Account-Express" || licenseEnum == "Account-Professional" || licenseEnum == "Account-Advanced") {
            if (this._licenseCount[licenseEnum].Maximum - this._licenseCount[licenseEnum].InUse < signInAddresses.length) {
                flag = false;
                this._emailError.show();
                this._emailError.text(Utils_String.format(AccountResources.UserHubNotEnoughLicenses, this._licenseCombo.getText()));
                return flag;
            }
        }
        // Save is currently in progress
        if (this._rowIds && this._rowIds[0] && this._savingManager.isRowSaving(this._rowIds[0])) {
            flag = false;
            $(this._emailInput).css("border-color", "#e6b9b9");
            this._emailError.show();
            this._emailError.text(AccountResources.InProgressOperation);
        }
        return flag;
    }

    /// <summary >Update license drop down</summary>
    private _updateDropDown(data, licenseCount) {
        this._licenses = data;
        this._licenseCount = licenseCount;
        this._licenseValues = this._initDictionary();

        //populate LicenseCombo
        this._licenseCombo.setSource($.map(this._licenses, function (License) {
            if (License.Available > 0) {
                return License.LicenseType;
            }
        }));

        this._licenseCombo.setSelectedIndex(0, true);

        if (this._element.is(":visible")) {
            this._focusEmail();
        }
    }

    /// <summary>Change grid state based on response from server</summary>
    private _addUserSuccess(data) {
        var bools = [false, true, true];
        this._enableAdd();
        if (data.error) {
            this._messageArea.setMessage(data.error, Notifications.MessageAreaType.Error);
            for (var i in this._rowIds) {
                this._savingManager.clearRowSaving(this._rowIds[i]);
                this._savingManager._grid.removePlaceholder();
            }
            this._rowIds = [];
        }
        else {
            for (var i in this._rowIds) {
                this._savingManager.clearRowSaving(this._rowIds[i]);
            }
            this._rowIds = [];
            var errors = false;
            var errorText = "";
            for (var i in data) {
                if (data[i].error) {
                    errors = true;
                    errorText += ('\n' + data[i].error);
                }
            }
            if (!this._isAadAccount) {
                if (data.aad) {
                    if (data.aadTenantName) {
                        this._messageArea.setMessage($("<div> " + Utils_String.format(AccountResources.AddAADUserWithTenantName, data.aadTenantName) + "</div>"), Notifications.MessageAreaType.Warning);
                        eventService.fire("tfs-update-grid", null);
                    }
                    else {
                        this._messageArea.setMessage($("<div> " + AccountResources.AddAADUser + "</div>"), Notifications.MessageAreaType.Warning);
                        eventService.fire("tfs-update-grid", null);
                    }
                }
            }
            if (errors) {
                this._messageArea.setMessage(errorText.trim(), Notifications.MessageAreaType.Error);
                eventService.fire("tfs-update-grid", null);
            }
            else {
                eventService.fire("tfs-update-grid", true);
            }
            eventService.fire("tfs-update-menubar", bools);
            $(this._emailInput).attr("value", "");
            this._emailError.hide();
        }
    }

    /// <summary> Clean up after adding user has failed</summary>
    private _addUserFailed(error) {
        this._messageArea.setMessage(AccountResources.AddUserError, Notifications.MessageAreaType.Error);
        for (var i in this._rowIds) {
            this._savingManager.clearRowSaving(this._rowIds[i]);
            this._savingManager._grid.removePlaceholder();
        }
        this._rowIds = [];
        this._exitPanel();
        $(this._emailInput).attr("value", "");
        this._emailError.hide();
        this._enableAdd();

    }

    private _focusEmail() {
        $(this._emailInput).focus();
    }

    public _focusSearchInput() {
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.focusOnSearchInput();
        }
    }

    private _disableAdd() {
        $(this._addUser).find(':input').prop('disabled', true);
    }

    private _enableAdd() {
        $(this._addUser).find(':input').removeAttr('disabled');
    }

    /// <summary> Close the add panel</summary>
    public _exitPanel() {
        this._emailError.hide();
        $(this._emailInput).css("border-color", "");
        this._element.hide();
        $(this._emailInput).attr("value", "");
        this._menuItem.removeClass("highlight-button");
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.clear();
        }

        var obj = { "panel": "add", "open": false };
        eventService.fire("tfs-resize-grid", obj);
    }

    /// <summary> Key up actions</summary>
    private _keyupEmail() {
        var email = $(this._emailInput).val().trim();
        this._emailError.hide();
        this._emailError.text("");

        if (email.length > 0) {
            $(this._emailInput).css("border-color", "");
        }
    }
}

VSS.initClassPrototype(AddUserManagementPanel, {
    _displayPanel: null,
    _panelContainer: null,
    _editAction: null,
    _resetAction: null,
    _licenseElem: null,
    _licenseCombo: null,
    _licenseValues: null,
    _emailValidationPattern: null,
    _messageArea: null,
    _maximumEmailLength: 0,
    _savingManager: null,
    _emailInput: null,
    _addUser: null,
    _menuItem: null
});

export interface UserObject {
    UserName: string;
    LicenseType: string;
    ObjectId: string;
    DisplayName: string;
}

VSS.classExtend(AddUserManagementPanel, SPS_Host_TfsContext.TfsContext.ControlExtensions);

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

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

/// This class represents the elements used to edit a user
export class EditUserManagementPanel extends Controls.BaseControl {

    private static _controlType: string = 'EditUserManagementPanel';

    private _displayPanel: any;
    private _panelContainer: any;
    private _licenseElem: any;
    private _licenseCombo: any;
    private _resendInvite: any;
    private _edit: any;
    private _licenseValues: any;
    private _licenses: any;
    private _menuItem: any;
    private _messageArea: any;
    private _userId: any;
    private _userLicense: any;
    private _isAdmin: any;
    private _userStatus: any;
    private _buttonContainer_invitation: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._displayPanel = this._options.displayPanel;
        this._menuItem = this._options.menuItem;
        this._messageArea = this._options.messageArea;
        this._createPanel();

        $(this._resendInvite).bind("click", delegate(this, this._submitPanel));
        $(this._edit).bind("click", delegate(this, this._submitEdit));
        $(this._panelContainer).bind("keyup", delegate(this, this._enterSubmit));
        eventService.attachEvent("tfs-update-edituserdropdown", delegate(this, this._updateDropDown));
    }

    /// <summary> Create html elements for the edit panel</summary>
    public _createPanel() {

        this._element.hide();
        this._panelContainer = $(domElem('div')).appendTo(this._element).addClass("edit-panel");

        var licenseRow = $(domElem('div')).appendTo(this._panelContainer).attr("id", "lice  seRow").addClass("license-row");
        var closePanel = $(domElem('div')).appendTo(licenseRow).addClass("bowtie-icon bowtie-navigate-close user-hub-bowtie-exit-panel").attr('tabindex', '0').click(delegate(this, this._exitPanel));

        //Set up license row
        var bowtieLicenseRow = $(domElem('div')).appendTo(licenseRow).attr("class", "bowtie");
        var bowtieLicenseFieldset = $(domElem('fieldset')).appendTo(bowtieLicenseRow);
        var licenseLabel = bowtieLicenseFieldset.append("<label id=\"licenseLabel\" class=\"license-label\" for=\"name\">" + AccountResources.LicenseLabel + "</label>");
        var icon = $(domElem('label')).appendTo(bowtieLicenseFieldset).addClass("icon-holder").attr("data-tooltip", AccountResources.UserPanelToolTip);

        this._licenseElem = $(domElem('div')).appendTo(bowtieLicenseFieldset).addClass("license-combo");


        this._licenseCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._licenseElem, {
            allowEdit: false
        });

        this._licenseCombo.setSelectedIndex(0, true);

        var buttonContainer = $(domElem('div')).appendTo(bowtieLicenseFieldset).addClass("adjust-bowtie-container button-container").attr('tabindex', '0');
        var buttonString = "<button class=\"cta\">" + AccountResources.EditUserButtonText + "</button>";
        this._edit = buttonContainer.append(buttonString);

        this._buttonContainer_invitation = $(domElem('div')).appendTo(bowtieLicenseFieldset).addClass("adjust-bowtie-container button-container").attr('tabindex', '0');
        var addButtonContainer = $(domElem('div')).appendTo(this._buttonContainer_invitation).addClass("add-button");
        var buttonString_invitation = "<button>" + AccountResources.AddUserButtonText + "</button>";
        this._resendInvite = addButtonContainer.append(buttonString_invitation);
        this._buttonContainer_invitation.hide();
    }

    /// <summary> Handle special commands for the panel</summary>
    private _enterSubmit(e) {
        if (e.which === $.ui.keyCode.ENTER) {
            this._submitPanel();
        }
        if (e.which === $.ui.keyCode.ESCAPE) {
            this._exitPanel();
        }
    }

    /// <summary> Focus license drop down</summary>
    public _focusLicense() {
        $(this._licenseCombo).focus();
    }

    /// <summary> Submit user selected license from the license drop down</summary>
    private _submitPanel() {
        //Make call to send a new invitation
        CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl('ResendInvitation', 'apiusermanagement'),
            {
                userId: this._userId,
                licenseType: this._licenseValues[this._licenseCombo.getText()]
            },
            // handle success.
            delegate(this, this._editUserSuccess),
            //handle error.
            delegate(this, this._editUserFailed)
        );
    }

    /// <summary> Submit user selected license from the license drop down</summary>
    private _submitEdit() {

        if (this._validate()) {
            //Make call to get data.
            CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl('EditUser', 'apiusermanagement'),
                {
                    userId: this._userId,
                    licenseType: this._licenseValues[this._licenseCombo.getText()]
                },
                // handle success.
                delegate(this, this._editUserSuccess),
                //handle error.
                delegate(this, this._editUserFailed)
            );
        }
    }

    /// <summary> Map friendly license names to license enums in the drop down</summary>
    private _initDictionary() {
        var licenseValues = {};
        $.each(this._licenses, function () {
            licenseValues[this.LicenseType] = this.LicenseEnum;
        });

        return licenseValues;
    }
    /// <summary> Update license drop down</summary>
    private _updateDropDown(data) {
        this._licenses = data;
        this._licenseValues = this._initDictionary();

        //populate LicenseCombo
        this._licenseCombo.setSource($.map(this._licenses, function (License) {
            if (License.Available > 0) {
                return License.LicenseType;
            }
        }));

        this._licenseCombo.setSelectedIndex(0, true);
    }

    /// <summary> Validate selected license</summary>
    private _validate() {
        var license = this._licenseValues[this._licenseCombo.getText()];

        if (this._licenseCombo.getText() === this._userLicense && this._userStatus.length === 0) {
            this._exitPanel();
            return false;
        }

        return true;

    }

    /// <summary> Callback on edit user success</summary>
    private _editUserSuccess(data) {
        var bools = [false, true, true];

        if (data.error) {
            this._messageArea.setMessage(data.error, Notifications.MessageAreaType.Error);
        }
        else {
            eventService.fire("tfs-update-grid", true);
            eventService.fire("tfs-update-menubar", bools);
            this._exitPanel();

        }
    }

    /// <summary> Callback on edit user failure</summary>
    private _editUserFailed(error) {
        this._messageArea.setMessage(AccountResources.AddUserError, Notifications.MessageAreaType.Error);
        this._exitPanel();
    }

    /// <summary> Close edit panel</summary>
    public _exitPanel() {
        this._element.hide();
        this._menuItem.removeClass("highlight-button");
        var obj = { "panel": "edit", "open": false };
        eventService.fire("tfs-resize-grid", obj);
    }

    /// <summary> Set the current user being edited</summary>
    public _setUser(User, isAdmin) {
        var MSDN = true;

        this._userId = User.UserId;
        this._userLicense = User.LicenseType;
        this._userStatus = User.Status;
        var currentLicense = this._userLicense;

        // showing and hiding the "send invitation" button
        if (User.LastAccessed === AccountResources.UserGridNeverMessage) {
            this._buttonContainer_invitation.show();
        } else {
            this._buttonContainer_invitation.hide();
        }

        if (this._licenses) {
            var availableLicenses = this._licenses.slice(0);
            //Determine if user is MSDN
            if (User.isMsdn) {
                availableLicenses = availableLicenses.slice(0, availableLicenses.length - 1);
            }
            //populate LicenseCombo
            this._licenseCombo.setSource($.map(availableLicenses, function (License) {
                if (License.Available > 0) {
                    return License.LicenseType;
                }
            }));
        }

        this._licenseCombo.setText(User.LicenseType, true);
        this._isAdmin = isAdmin;
    }

}

VSS.initClassPrototype(EditUserManagementPanel, {
    _displayPanel: null,
    _panelContainer: null,
    _licenseElem: null,
    _licenseCombo: null,
    _resendInvite: null,
    _edit: null,
    _licenseValues: null,
    _licenses: null,
    _menuItem: null,
    _messageArea: null,
    _userID: null,
    _userLicense: null,
    _isAdmin: null,
    _userStatus: null,
    _userLastAccess: null
});

VSS.classExtend(EditUserManagementPanel, SPS_Host_TfsContext.TfsContext.ControlExtensions);
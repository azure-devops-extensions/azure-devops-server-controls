/// <reference types="jquery" />

import TFS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import TreeViewControls = require("VSS/Controls/TreeView");
import Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_UI = require("VSS/Utils/UI");
import TFSAdminDialogs = require("Admin/Scripts/TFS.Admin.Dialogs");

import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import ProfileControls = require("Account/Scripts/TFS.Details.Profile.Common.Controls");
import ProfileModels = require("Account/Scripts/TFS.Details.Profile.Common.Models");

var delegate = Core.delegate;
var domElem = TFS_UI.domElem;
var hostConfig = TFS_Host.TfsContext.getDefault().configuration;

export class EditableIdentityHeaderControl extends Controls.BaseControl {
    public static _controlType: string = 'EditableIdentityHeaderControl';

    constructor(options?) {
        super(options);
    }

    private identityImageElement(id: string, altText: string = ""): JQuery {
        var altTextString = "";
        if (altText) {
            altTextString = altText;
        }

        return $(Utils_String.format("<img src=\"/_api/_common/identityImage?Id={0}&size={2}&t={3}&__v=1\" alt=\"{1}\" />", id, altTextString, 2, $.now()))
            .addClass("profile-identity-image")
            .addClass("identity-" + id);
    }

    public initialize() {
        this._element.addClass('identity-header');
        this._element.append(this.identityImageElement(this._options.teamFoundationId, this._options.header));

        $(domElem('div')).appendTo(this._element)
            .addClass('identity-header-name')
            .text(this._options.header);

        $(domElem('div')).appendTo(this._element)
            .addClass('identity-header-subheader')
            .text(this._options.subHeader);

        $(domElem('div')).appendTo(this._element)
            .addClass('edit-image-action edit-item action-link')
            .text(accountResources.UserProfileInformationChangePicture);
    }
}

export enum ProfileInformationFormElement {
    DisplayName,
    PreferredEmail,
    SaveButton,
    CancelButton
}

export class ProfileInformationPage extends Controls.BaseControl {
    // This doesn't actually override anything, only for informational purposes
    public static _controlType: string = 'ProfileInformationPage';

    private _identityHeader: any;
    private _navColumn: any;
    private _navEnhancement: any;
    private _initialModel: ProfileModels.UserProfileInformationModel;
    private _data: ProfileModels.UserProfileInformationModel;

    private _getFormJqueryElement(elementType: ProfileInformationFormElement): JQuery {
        switch (elementType) {
            case ProfileInformationFormElement.DisplayName:
                return this._element.find(".display-name");
            case ProfileInformationFormElement.PreferredEmail:
                return this._element.find(".preferred-email");
            case ProfileInformationFormElement.SaveButton:
                return this._element.find(".profile-submit-button");
            case ProfileInformationFormElement.CancelButton:
                return this._element.find(".profile-cancel-button");
        }
    }

    constructor(options?) {
        super(options);

        // get this at the whole page level (this is not scoped to the control)
        this._navColumn = $("#profile-area-nav"); 
    }

    private _changePicture(e?: JQueryEventObject) {
        Dialogs.show(TFSAdminDialogs.ChangeImageDialog, 
            { tfid: this._data.IdentityInformation.TeamFoundationId, 
              isGroup: this._data.IdentityInformation.IdentityType !== 'user' });
    }

    private _populate(data: ProfileModels.UserProfileInformationModel) {
        this._identityHeader = $(domElem('div')).appendTo(this._element.find('.profile-header-wrapper'));
        <EditableIdentityHeaderControl>Controls.BaseControl.createIn(
            EditableIdentityHeaderControl, this._identityHeader, {
                header: data.IdentityInformation.FriendlyDisplayName,
                subHeader: Utils_String.format("{0}{1}", data.IdentityInformation.Domain ? data.IdentityInformation.Domain + "\\":  "", data.IdentityInformation.AccountName),
                teamFoundationId: data.IdentityInformation.TeamFoundationId
            });

        this._element.find('.edit-image-action').click(Core.delegate(this, this._changePicture));

        var displayNameElement = this._getFormJqueryElement(ProfileInformationFormElement.DisplayName);

        this._element.find(".edit-profile-action").show().click(Core.delegate(this, this._edit));

        this._getFormJqueryElement(ProfileInformationFormElement.CancelButton).click(Core.delegate(this, this._cancelEdit));
        this._element.find('.edit-form').submit(Core.delegate(this, this._submitEdit));

        displayNameElement
            .change(Core.delegate(this, this._determineSaveButtonState))
            .keyup(Core.delegate(this, this._determineSaveButtonState));

        if (data.CustomDisplayName && data.CustomDisplayName.length > 0) {
            displayNameElement.val(data.CustomDisplayName);
        } else {
            displayNameElement.val(data.ProviderDisplayName);
        }

        this._getFormJqueryElement(ProfileInformationFormElement.PreferredEmail)
            .val(data.MailAddress)
            .change(Core.delegate(this, this._determineSaveButtonState))
            .keyup(Core.delegate(this, this._determineSaveButtonState));

        if (data.IsEmailConfirmationPending) {
            this._element.find(".confirmation-pending-notice")
                .append($("<span />").text(accountResources.UserProfileConfirmationPending)) // email confirmation pending
                .append($("<span />").addClass("icon icon-warning")); // warning yellow triangle
            this._getFormJqueryElement(ProfileInformationFormElement.PreferredEmail).addClass("pending");
        }
    }

    private _edit(e?: JQueryEventObject) {
        this._element.removeClass("disabled");
        this._element.find(".edit-form").show();
        this._element.find(".edit-profile-action").hide();
        this._element.find(".edit-item").show();
        // fixes issue with picture link spanning whole page
        this._element.find(".edit-image-action").css("display", "inline-block");
    }

    private _cancelEdit(e?: JQueryEventObject) {
        this._element.addClass("disabled");
        this._element.find(".edit-form").hide();
        this._element.find(".edit-item").hide();

        // reset form values
        this._getFormJqueryElement(ProfileInformationFormElement.DisplayName).val(this._initialModel.CustomDisplayName);
        this._getFormJqueryElement(ProfileInformationFormElement.PreferredEmail).val(this._initialModel.MailAddress);

	    this._element.find(".edit-profile-action").show();

        // remove any validation messages
        ProfileControls.MessageAreaHelper.ClearMessageAreaMessage();
    }

    private _determineSaveButtonState(e?: JQueryEventObject) {
        var target_elements = 
            [this._getFormJqueryElement(ProfileInformationFormElement.SaveButton)];
        if (this._isDiff(this._getCurrentModel(), this._initialModel)) {
            for (var target_element in target_elements){
                target_elements[target_element].removeAttr("disabled");
                target_elements[target_element].removeClass("disabled");
            }
        } else {
            for (var target_element in target_elements) {
                target_elements[target_element].attr("disabled", "disabled");
                target_elements[target_element].addClass("disabled");
            }
        }
    }

    private _validate(data: ProfileModels.UserPreferencesModel) {
        return true;
    }

    private _submitEdit(e?: JQueryEventObject) {
        var data: ProfileModels.UserProfileInformationModel, dataToPass: ProfileModels.UserPreferencesModel = new ProfileModels.UserPreferencesModel(), that = this, re : RegExp, result : RegExpExecArray;

        data = this._getModelDiff(this._getCurrentModel(), this._initialModel);

	    dataToPass.PreferredEmail = data.MailAddress;

	    // translate the email address if its in the format Display name <user@host>
    	// for now we won't do anything with the display name but since we say we accept it
        re = /.*<(.*)>/;
    	result = re.exec(dataToPass.PreferredEmail)
    	if(result != null && result.length > 1 && result[1]){
    	    dataToPass.PreferredEmail = result[1];
    	}

        dataToPass.CustomDisplayName = data.CustomDisplayName;
        dataToPass.__RequestVerificationToken = $("input[name=__RequestVerificationToken]").val();

        if(dataToPass.CustomDisplayName === ""){
            dataToPass.ResetDisplayName = true;
        }

        if(dataToPass.PreferredEmail === ""){
            dataToPass.ResetEmail = true;
        }

        if (!this._validate(dataToPass)) {
            return false;
        }

        this._element.find(".edit-form .wait").show();

        this._getFormJqueryElement(ProfileInformationFormElement.SaveButton)
            .addClass("disabled")
            .attr("disabled", "disabled");

        this._getFormJqueryElement(ProfileInformationFormElement.CancelButton)
            .addClass("disabled")
            .attr("disabled", "disabled");

        if (this._isDiff(this._getCurrentModel(), this._initialModel)) {
            TFS_Core_Ajax.postHTML(
                this._element.find(".edit-form").attr("data-action-url"),
                {
                    updatePackage: Core.stringifyMSJSON(dataToPass)
                },
                function (data) {
                    window.location.reload();
                },
                function (error) {
                    that._getFormJqueryElement(ProfileInformationFormElement.SaveButton)
                        .removeClass("disabled")
                        .removeAttr("disabled");

                    that._getFormJqueryElement(ProfileInformationFormElement.CancelButton)
                        .removeClass("disabled")
                        .removeAttr("disabled");

                    that._element.find(".edit-form .wait").hide();

                    if (error && error.message) {
                        ProfileControls.MessageAreaHelper.SetMessageAreaMessage(error.message);
                    } else {
                        ProfileControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.UserProfileInformationSaveFailed);
                    }
                },
                null
            );
        }
        return false;
    }

    // This is a helper method which equates null and empty strings
    private _equals(a: any, b: any) {
        return (a === null && b === "" || b === null && a === "") ? true : a === b;
    }

    private _getCurrentModel(): ProfileModels.UserProfileInformationModel {
        var data = new ProfileModels.UserProfileInformationModel();
        data.MailAddress = this._getFormJqueryElement(ProfileInformationFormElement.PreferredEmail).val();
        data.CustomDisplayName = this._getFormJqueryElement(ProfileInformationFormElement.DisplayName).val();
        return data;
    }

    private _getModelDiff(current: ProfileModels.UserProfileInformationModel, original: ProfileModels.UserProfileInformationModel): ProfileModels.UserProfileInformationModel {
        var data = new ProfileModels.UserProfileInformationModel();

        if (!this._equals(current.MailAddress, original.MailAddress))
            data.MailAddress = current.MailAddress;

        if (!this._equals(current.CustomDisplayName, original.CustomDisplayName))
            data.CustomDisplayName = current.CustomDisplayName;

        return data;
    }

    private _isDiff(current: ProfileModels.UserProfileInformationModel, original: ProfileModels.UserProfileInformationModel): boolean {
        return !(this._equals(current.CustomDisplayName, original.CustomDisplayName) &&
            this._equals(current.MailAddress, original.MailAddress));
    }

    public initialize() {
        super.initialize();
        var that = this, url = this._element.find(".profile-header-wrapper").attr("data-action-url");

        TFS_Core_Ajax.getMSJSON(
            url,
            {},
            function (data) {
                that._data = data;
                that._populate.call(that, data);
                that._initialModel = that._getCurrentModel();
                that._determineSaveButtonState();
            },
            null,
            null
        );

        this._initializeNav();
    }

    /// <summary>Initialized the navigation on the left side</summary>
    private _initializeNav() {
        var navContainer = $("<div class='nav-container' />").appendTo(this._navColumn);
        this._navEnhancement = <ProfileControls.ProfileNav>Controls.Enhancement.enhance(ProfileControls.ProfileNav, navContainer, { gutter: false, selectedNavItem: "information" });
    }
}

TFS.classExtend(ProfileInformationPage, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(ProfileInformationPage, ".profile-information")

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Profile.Information.Controls", exports);

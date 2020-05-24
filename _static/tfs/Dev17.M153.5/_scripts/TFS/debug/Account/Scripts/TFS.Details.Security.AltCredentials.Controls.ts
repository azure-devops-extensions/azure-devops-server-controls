/// <reference types="jquery" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import TFS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Grids = require("VSS/Controls/Grids");
import MenuControls = require("VSS/Controls/Menus");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import SecurityControls = require("Account/Scripts/TFS.Details.Security.Common.Controls");
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import ProfileModels = require("Account/Scripts/TFS.Details.Profile.Common.Models");
import { SecurityNav } from "Account/Scripts/Components/SecurityNav";

// Declare the action urls which gets populated in the json island in the view
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;

export enum AlternateCredentialsFormElement {
    Enable,
    UsernameSecondary,
    Password,
    PasswordConfirm,
    SaveButton,
    CancelButton,
    PasswordConfirmError,
    PasswordError,
    UsernameError
}

// To be used with AlternateCredentials/EditTemplate.ascx
export class AlternateCredentialsForm extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.altcredentials.add";

    public $leftNav: any;
    public $navCol: any;
    public initialData: SecurityModels.AlternateCredentialsModel;
    private _formElementCache: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this.$navCol = $("#security-area-nav");

        if(this.$navCol.length > 0) {
            this._initializeNav();
        }

        $(".hub-content").css("overflow", "hidden");
        $("div.alt-cred-warning > span > a").attr("href", ActionUrls.PersonalAccessToken.Index);
        
        // Check if an element (checkbox) to modify alternate authentication credentials settings is available.        
        // This element is available if alternate authentication credentials is set to 'Allow' in settings.
        // This element is rendered by \alternatecredentials\index.aspx if Model.BasicAuthenticationDisabledOnAccount == false.
        var enableAuthCredsElement = $(".enable-authcreds");
        if (enableAuthCredsElement && enableAuthCredsElement.length == 1) {
            this._formElementCache = {};

            this.initialData = this.getCurrentModel();
            this.populate();

            this.getFormJqueryElement(AlternateCredentialsFormElement.Password).focusout({ that: this }, this._validatePassword);

            this._element.find('#enable-altcreds-check').keypress(function (e) {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    $(this).trigger('click');
                }
            });
        }
    }

    public getFormJqueryElement(elementType: AlternateCredentialsFormElement): JQuery {
        var numberElementType: number = elementType, element: JQuery = null;

        if (numberElementType in this._formElementCache)
            return this._formElementCache[numberElementType];

        switch (elementType) {
            case AlternateCredentialsFormElement.Enable:
                element = this._element.find(".enable-authcreds");
                break;
            case AlternateCredentialsFormElement.Password:
                element = this._element.find(".password");
                break;
            case AlternateCredentialsFormElement.PasswordConfirm:
                element = this._element.find(".password-confirm");
                break;
            case AlternateCredentialsFormElement.UsernameSecondary:
                element = this._element.find(".username-secondary");
                break;
            case AlternateCredentialsFormElement.SaveButton:
                element = this._element.find(".alt-creds-submit-button");
                break;
            case AlternateCredentialsFormElement.CancelButton:
                element = this._element.find(".alt-creds-cancel-button");
                break;
            case AlternateCredentialsFormElement.PasswordConfirmError:
                element = this._element.find(".password-confirm-error");
                break;
            case AlternateCredentialsFormElement.UsernameError:
                element = this._element.find(".username-secondary-error");
                break;
            case AlternateCredentialsFormElement.PasswordError:
                element = this._element.find(".password-error");
                break;
        }

        this._formElementCache[elementType] = element;
        return element;
    }

    public populate() {
        this.getFormJqueryElement(AlternateCredentialsFormElement.Enable).change(Core.delegate(this, this._toggleEnableCheckbox));
        this.getFormJqueryElement(AlternateCredentialsFormElement.Enable).change(Core.delegate(this, this._determineSaveButtonState));
        this._toggleEnableCheckbox();

        this.getFormJqueryElement(AlternateCredentialsFormElement.CancelButton).click(Core.delegate(this, this._cancelChanges));
        this.getFormJqueryElement(AlternateCredentialsFormElement.SaveButton).click(Core.delegate(this, this._saveChanges));
        this._determineSaveButtonState();

        this.getFormJqueryElement(AlternateCredentialsFormElement.UsernameSecondary)
            .change(Core.delegate(this, this._determineSaveButtonState))
            .keyup(Core.delegate(this, this._determineSaveButtonState));

        this.getFormJqueryElement(AlternateCredentialsFormElement.Password)
            .change(Core.delegate(this, this._determineSaveButtonState))
            .keyup(Core.delegate(this, this._determineSaveButtonState));

        this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm)
            .change(Core.delegate(this, this._determineSaveButtonState))
            .keyup(Core.delegate(this, this._determineSaveButtonState));
    }

    // The duplication of logic here is bad, try to either use this directly to populate form
    // or just refresh page and use view logic
    private _cancelChanges(e?: JQueryEventObject) {
        var defaultPassword: string = this.getFormJqueryElement(AlternateCredentialsFormElement.Password).attr("data-default-value");
        if (!this.initialData.BasicAuthenticationDisabled && this.initialData.BasicAuthenticationHasPassword) {
            this.getFormJqueryElement(AlternateCredentialsFormElement.Enable).attr("checked", "checked");
        } else {
            this.getFormJqueryElement(AlternateCredentialsFormElement.Enable).removeAttr("checked");
        }

        this._toggleEnableCheckbox();

        this.getFormJqueryElement(AlternateCredentialsFormElement.UsernameSecondary).val(this.initialData.BasicAuthenticationUsername);
        if (this.initialData.BasicAuthenticationHasPassword) {
            this.getFormJqueryElement(AlternateCredentialsFormElement.Password).val(defaultPassword);
            this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm).val(defaultPassword);
        } else {
            this.getFormJqueryElement(AlternateCredentialsFormElement.Password).val("");
            this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm).val("");
        }
    }

    private _determineSaveButtonState(e?: JQueryEventObject) {
        var target_elements = [this.getFormJqueryElement(AlternateCredentialsFormElement.SaveButton),
        this.getFormJqueryElement(AlternateCredentialsFormElement.CancelButton)];

        if (this.isDiff(this.getCurrentModel(), this.initialData)) {
            for (var target_element in target_elements) {
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

    public getCurrentModel(): SecurityModels.AlternateCredentialsModel {
        var data = new SecurityModels.AlternateCredentialsModel(), password = this.getFormJqueryElement(AlternateCredentialsFormElement.Password).val();
        data.BasicAuthenticationDisabled = !this.getFormJqueryElement(AlternateCredentialsFormElement.Enable)[0].checked;
        data.BasicAuthenticationUsername = this.getFormJqueryElement(AlternateCredentialsFormElement.UsernameSecondary).val();
        data.BasicAuthenticationHasPassword = false;

        if (this.getFormJqueryElement(AlternateCredentialsFormElement.Password).attr("data-default-value") !== password) {
            data.BasicAuthenticationPassword = this.getFormJqueryElement(AlternateCredentialsFormElement.Password).val();
            if (password && password != null && password.length > 0) {
                data.BasicAuthenticationHasPassword = true;
            }
        } else {
            if (password && password != null && password.length > 0) {
                data.BasicAuthenticationHasPassword = true;
            }
        }

        return data;
    }

    // This is a helper method which equates null and empty strings
    private _equals(a: any, b: any) {
        return (a === null && b === "" || b === null && a === "") ? true : a === b;
    }

    public isDiff(current: SecurityModels.AlternateCredentialsModel, original: SecurityModels.AlternateCredentialsModel): boolean {
        return !(
            this._equals(current.BasicAuthenticationDisabled, original.BasicAuthenticationDisabled) &&
            this._equals(current.BasicAuthenticationPassword, original.BasicAuthenticationPassword) &&
            this._equals(current.BasicAuthenticationUsername, original.BasicAuthenticationUsername));
    }

    // Copied from TFS.Admin.Dialog.ts
    public static _checkPasswordStrength(password: string): boolean {
        // This function is mirrored on the server side by BasicAuthService.IsValidBasicPassword
        var hasDigit: boolean = false;
        var hasUpper: boolean = false;
        var hasLower: boolean = false;
        var hasSymbol: boolean = false;

        for (var i = 0; i < password.length; ++i) {
            var c: string = password.charAt(i);

            // Convert character-by-character to avoid worries about differing Unicode representations
            //  of continuing characters.  (E.g. o-with-umlauts can be an 'o' character followed by an umlaut
            //  combining character or it could be a single character.)
            var cUpper = c.toUpperCase();
            var cLower = c.toLowerCase();
            if (c >= "0" && c <= "9") {
                hasDigit = true;
            }
            else if (c == cUpper && c == cLower) {
                // JavaScript doesn't supply character class functions, we'll fake it by
                //  assuming that toLower(c)!=toUpper(c) implies it's a letter.
                hasSymbol = true;
            }
            else if (c == cUpper) {
                hasUpper = true;
            }
            else { // c == cLower
                hasLower = true;
            }
        }
        var charCategoryCount = (hasDigit ? 1 : 0)
            + (hasUpper ? 1 : 0)
            + (hasLower ? 1 : 0)
            + (hasSymbol ? 1 : 0);
        return password.length >= 8 && password.length <= 32 && charCategoryCount >= 3;
    }

    private _clearPasswordValidation() {
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        this.getFormJqueryElement(AlternateCredentialsFormElement.Password).removeClass("invalid");
    }

    private clearValidation() {
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm).removeClass("invalid");
        this._clearPasswordValidation();
        this.getFormJqueryElement(AlternateCredentialsFormElement.UsernameSecondary).removeClass("invalid");
    }

    private _validatePassword(e?: JQueryEventObject) {
        var password = $(this).val();
        var defaultPassword = $(this).attr("data-default-value");
        var context = e.data.that;
        context._clearPasswordValidation();

        if (password.length > 0 && password !== defaultPassword && !AlternateCredentialsForm._checkPasswordStrength(password)) {
            SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.PasswordNotStrong);
            context.getFormJqueryElement(AlternateCredentialsFormElement.Password).addClass("invalid");
            return false;
        }
    }

    private validate(modelDiff: SecurityModels.AlternateCredentialsModel): boolean {
        var password = this.getFormJqueryElement(AlternateCredentialsFormElement.Password).val(),
            passwordConfirm = this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm).val(),
            defaultPassword = this.getFormJqueryElement(AlternateCredentialsFormElement.Password).attr("data-default-value");

        this.clearValidation();

        if (!modelDiff.BasicAuthenticationDisabled && password !== defaultPassword && (!modelDiff.BasicAuthenticationPassword || modelDiff.BasicAuthenticationPassword == null || modelDiff.BasicAuthenticationPassword.length == 0)) {
            SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.PasswordNotStrong);
            this.getFormJqueryElement(AlternateCredentialsFormElement.Password).addClass("invalid");
            return false;
        }

        // if the password is changed
        if (modelDiff.BasicAuthenticationPassword && modelDiff.BasicAuthenticationPassword !== "") {
            // check if the password and confirmation match
            if (!this._equals(password, passwordConfirm)) {
                SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.PasswordsDoNotMatch);
                this.getFormJqueryElement(AlternateCredentialsFormElement.PasswordConfirm).addClass("invalid");
                return false;
            }

            // check password strength
            if (!AlternateCredentialsForm._checkPasswordStrength(password)) {
                SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.PasswordNotStrong);
                this.getFormJqueryElement(AlternateCredentialsFormElement.Password).addClass("invalid");
                return false;
            }
        }

        // if the secondary username is changed
        if (modelDiff.BasicAuthenticationUsername && modelDiff.BasicAuthenticationUsername !== "") {
            var regx = /^[A-Za-z0-9]+$/; // alphanumeric
            if (!regx.test(modelDiff.BasicAuthenticationUsername)) {
                SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.UseProfileUsernameSecondary);
                this.getFormJqueryElement(AlternateCredentialsFormElement.UsernameSecondary).addClass("invalid");
                return false;
            }
        }

        return true;
    }

    private _saveChanges(e?: JQueryEventObject) {
        var currentModel = this.getCurrentModel(),
            data: SecurityModels.AlternateCredentialsModel,
            that = this,
            dataToPass: SecurityModels.AlternateCredentialsModel = new SecurityModels.AlternateCredentialsModel();

        if (!this.isDiff(currentModel, this.initialData)) {
            return;
        }

        data = this.getCurrentModel();

        // validate
        if (!this.validate(data)) {
            return; // validation failed
        }

        dataToPass.BasicAuthenticationDisabled = data.BasicAuthenticationDisabled;
        if (data.BasicAuthenticationPassword && data.BasicAuthenticationPassword != null && data.BasicAuthenticationPassword.length > 0) {
            dataToPass.BasicAuthenticationPassword = data.BasicAuthenticationPassword;
        } else {
            dataToPass.BasicAuthenticationPassword = null;
        }

        if (this.initialData.BasicAuthenticationDisabled !== currentModel.BasicAuthenticationDisabled) {
            dataToPass.BasicAuthenticationPassword = data.BasicAuthenticationPassword;
        }

        if (data.BasicAuthenticationUsername && data.BasicAuthenticationUsername != null && data.BasicAuthenticationUsername.length > 0) {
            dataToPass.BasicAuthenticationUsername = data.BasicAuthenticationUsername;
        } else {
            dataToPass.BasicAuthenticationUsername = null;
        }

        dataToPass.__RequestVerificationToken = $("input[name=__RequestVerificationToken]").val();

        this._element.find(".wait").show();
        this.getFormJqueryElement(AlternateCredentialsFormElement.SaveButton)
            .addClass("disabled")
            .attr("disabled", "disabled");
        this.getFormJqueryElement(AlternateCredentialsFormElement.CancelButton)
            .addClass("disabled")
            .attr("disabled", "disabled");

        TFS_Core_Ajax.postHTML(
            ActionUrls.AlternateCredentials.UpdateConfiguration,
            {
                updatePackage: Core.stringifyMSJSON(dataToPass)
            },
            function (data: SecurityModels.AlternateCredentialsModel) {
                window.location.reload();
            },
            function (error) {
                that.getFormJqueryElement(AlternateCredentialsFormElement.SaveButton)
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that.getFormJqueryElement(AlternateCredentialsFormElement.CancelButton)
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that._element.find(".wait").hide();

                if (error && error.message) {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(Utils_String.htmlDecode(error.message));
                } else {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.AltCredsFailedSave);
                }
            },
            null
        );
    }

    // We don't bother with the parameters here because we want to be able to call it initially to set the visibility
    // based on whether it is enabled when the page loads
    private _toggleEnableCheckbox() {
        var sourceElement = this.getFormJqueryElement(AlternateCredentialsFormElement.Enable)[0];
        var targetElement = $(".altcreds-view .primary-form-collapsible");

        if (sourceElement.checked) {
            targetElement.show();
        } else {
            targetElement.hide();
        }
    }

    /// <summary>Initialized the navigation on the left side</summary>
    public _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, { selectedNavItem: "altcreds" }), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(AlternateCredentialsForm, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(AlternateCredentialsForm, ".altcreds-view")

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Detail.Security.AltCredentials.Controls", exports);

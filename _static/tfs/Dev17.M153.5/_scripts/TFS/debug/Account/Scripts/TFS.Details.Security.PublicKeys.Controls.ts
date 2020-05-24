/// <reference types="jquery" />


import * as React from "react";
import * as ReactDOM from "react-dom";

/*
 * Common Imports
 */
import AccountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Services = require("VSS/Events/Services");
import Grids = require("VSS/Controls/Grids");
import Utils_String = require("VSS/Utils/String");
import MenuControls = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Service = require("VSS/Service");
import TFS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_UI = require("VSS/Utils/UI");

/*
 * Security Area Imports
 */
import SecurityControls = require("Account/Scripts/TFS.Details.Security.Common.Controls");
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import { SecurityNav } from "Account/Scripts/Components/SecurityNav";

/*
 * Declare the action urls which gets populated in the json island in the view, this lets the 
 * urls be dynamically computed by the framework instead of being hardcoded in the typescript
 */
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;

/*
 * Index Page
 */

export class PublicKeyModel {
    public AuthorizationId: string; // Guid
    public Description: string;
    public Data: string; // Base64 encoded public key if available, not always sent
    public Fingerprint: string;
    public FormattedCreatedTime: string; // CreatedTime also exists, but is a DateTime (in C#)
    public IsValid: boolean;
}

/// <summay>Class for the grid that appears on the index page of oauth authorizations to list all the applications</summary>
export class PublicKeyGrid extends SecurityControls.SecurityGrid {
    public static enhancementTypeName: string = "tfs.security.publicKeyGrid";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._getPublicKeys();
    }

    ///<summary>Gets the list of public keys from the server and calls into the registered callbacks to populate the grid view</summary>
    private _getPublicKeys(): void {
        var url, dummy = new Date();
        url = ActionUrls.PublicKey.List;
        TFS_Core_Ajax.getMSJSON(url,
            {
                _t: dummy.getTime() // prevents caching
            },
            Core.delegate(this, this._getPublicKeysSuccess),
            Core.delegate(this, this._getPublicKeysFailure)
        );
    }

    ///<summary>Generates functions for use with the grid, displaying data using the column index</summary>
    private _useColumnIndexFuncGenerator(width: number, cssClass: string) {
        return function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
            var cell, title = this.getColumnValue(dataIndex, column.index);

            cell = $("<div />").addClass('grid-cell').css('width', (column.width || width));
            cell.append($("<span />").addClass(cssClass).text(title));
            return cell;
        }
    }

    //<summary>Called by _getPublicKeys on success, takes in the result of the list call and populates the grid based on the values returned</summary>
    private _getPublicKeysSuccess(data: SecurityModels.PublicKeyModel[]) {
        var publicKeyList = [], index = 0, publicKey;
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();

        if (data != null) {
            for (index = 0; index < data.length; index++) {
                publicKey = data[index];
                publicKeyList[index] = publicKey;
            }
        }

        if (data.length === 0) {
            // display the message saying there's no public keys
            $(".key-grid").html(AccountResources.SSH_NoKeys).addClass("no-publickey-message");
        }

        this._options.columns = [
            {
                text: AccountResources.SSH_KeyDescription,
                width: 250,
                index: "Description",
                canSortBy: true,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, url, linkHtml, cellValue = this.getColumnValue(dataIndex, column.index);
                    var appendChar = (ActionUrls.PersonalAccessToken.Edit.indexOf("?") > -1) ? "&" : "?";
                    cell = $("<div />").addClass('grid-cell grid-cell-display-name').css('width', (column.width || 250));
                    url = ActionUrls.PublicKey.Edit + appendChar + "authorizationId=" + this.getColumnValue(dataIndex, "AuthorizationId");
                    linkHtml = $("<a />").attr({ "href": url }).addClass('token-key-name').text(cellValue);
                    cell.append(linkHtml);

                    return cell;
                }
            },
            {
                text: AccountResources.SSH_KeyFingerprint,
                index: "Fingerprint",
                width: 300,
                canSortBy: true,
                getCellContents: this._useColumnIndexFuncGenerator(300, "publickey-fingerprint")
            },
            {
                text: AccountResources.SSH_KeyAdded,
                width: 150,
                index: "FormattedCreatedTime",
                canSortBy: true,
                getCellContents: this._useColumnIndexFuncGenerator(150, "publickey-added")
            },
            {
                text: AccountResources.TokenActionsColumnTitle,
                width: 150,
                index: "AuthorizationId",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var isActive = this.getColumnValue(dataIndex, "IsValid");
                    if (isActive) {
                        var cellContents,
                            description = this.getColumnValue(dataIndex, "Description"),
                            fingerprint = this.getColumnValue(dataIndex, "Fingerprint"),
                            authorizationId = this.getColumnValue(dataIndex, column.index);
                        var deleteLink = $("<i aria-label=\"" + AccountResources.SSH_TokenRemoveText + "\" id='delete-" + authorizationId + "' class='bowtie-icon bowtie-edit-remove' />")
                            .attr("data-tabbable", "1");
                        var deleteButton = $("<button aria-label=\"" + AccountResources.SSH_TokenRemoveText + "\" class='icon-action' />").append(deleteLink)
                            .keypress({ that: this }, this.showDialogCallbackOnEnterKey(RevokePublicKeyDialog, { args: { name: name, authorizationId: authorizationId } }))
                            .click({ that: this }, this.showDialogCallbackGenerator(RevokePublicKeyDialog, { args: { name: name, authorizationId: authorizationId } }));
                        cellContents = $("<span />")
                            .addClass("key-action-link");
                        cellContents.append(deleteButton);
                        return $("<div />").addClass("grid-cell").css('width', (column.width || 150)).append(cellContents);
                    }
                }
            }
        ];

        this._options.source = publicKeyList;
        this._originalData = publicKeyList;
        this.initializeDataSource();
    }

    private _getPublicKeysFailure(error) {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(AccountResources.SSH_KeysFailedToLoad);
    }

    /// <summary>Refreshes the grid data and redraws the grid</summary>
    public refresh() {
        this._getPublicKeys();
        super.refresh();
    }
}

TFS.initClassPrototype(PublicKeyGrid, {
    _originalData: null,
    _previousWindowHeight: 0,
    _minHeight: 0,
    _maxHeight: 0,
    _openPanel: null,
    _panelHeight: 0
});

TFS.classExtend(PublicKeyGrid, TFS_Host.TfsContext.ControlExtensions);

/// <summary>Represents the index page, manages the grid and the nav</summary>
class PublicKeyHub extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.publicKey";
    public _menuBar: MenuControls.MenuBar;

    private $keyGridContainer: any;
    private $navCol: any;
    private $keyGridControl: PublicKeyGrid;
    private $leftNav: SecurityControls.SecurityNav;
    private $panelContainer: any;
    private $messageArea: Notifications.MessageAreaControl;
    private $messageAreaContainer: any;
    private $menuBarContainer: any;
    private $addMenuItem: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this.$keyGridContainer = this._element.find('.key-grid');
        this.$navCol = $("#security-area-nav");
        this.$menuBarContainer = this._element.find('.key-menu');
        this.$messageAreaContainer = this._element.find('#commonMessage');
        $(".hub-content").css("overflow", "hidden");

        this._initializeSetup();
    }

    private _initializeSetup() {
        this.$messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.$messageAreaContainer);
        $(this.$messageAreaContainer).addClass('message-bar');

        if(this.$navCol.length > 0) {
            this._initializeNav(); // must happen before grid so that the callback can be passed
        }
        this._initializeMenu();
        this._initializeGrid();

        this._getServerFingerprint();
    }

    private _getServerFingerprint(): void {
        // If SSH authentication is disabled by policy, a fingerprint DIV doesn't exist, so don't try to populate it
        if (this._element.find(".display-fingerprint").length === 0) {
            return;
        }

        var dummy = new Date();
        var url = ActionUrls.PublicKey.GetServerFingerprint;
        TFS_Core_Ajax.getMSJSON(url,
            {
                _t: dummy.getTime() // prevents caching
            },
            Core.delegate(this, this._displayServerFingerprintSuccess),
            Core.delegate(this, this._displayServerFingerprintError)
        );
    }

    private _displayServerFingerprintSuccess(data) {
        if (data) {
            var message = "";
            if (data[0] && data[0].Fingerprint) {
                message = Utils_String.format(AccountResources.SSH_Fingerprint, data[0].HashAlgorithm, data[0].Fingerprint, data[0].Encryption);
            }
            if (data[1] && data[1].Fingerprint) {
                message += Utils_String.format(AccountResources.SSH_Fingerprint, data[1].HashAlgorithm, data[1].Fingerprint, data[1].Encryption);
            }
            if (message) {
                var fingerprintMessage = null;
                var tfsContext = TFS_Host.TfsContext.getDefault();
                if (tfsContext.isHosted) {
                    fingerprintMessage = Utils_String.format(AccountResources.SSH_ServerFingerprintMessage, message);
                } else {
                    fingerprintMessage = Utils_String.format(AccountResources.SSH_ServerFingerprintMessageOnPrem, message);
                }
                $(TFS_UI.domElem('div', 'server-fingerprint')).appendTo(this._element.find(".display-fingerprint")).append($("<div id='fingerprint-message'>" + fingerprintMessage + "</div>"));
            }
        }
    }

    //Silently fail if there is an error in getting server fingerprint.
    private _displayServerFingerprintError() {
    }


    private _initializeMenu() {
        var actionsControlElement = $(TFS_UI.domElem('div')).appendTo(this.$menuBarContainer).addClass('key-actions toolbar');
        this._menuBar = <MenuControls.MenuBar>Controls.BaseControl.createIn(MenuControls.MenuBar, actionsControlElement, {
            items: this._toolsItems(),
            executeAction: Core.delegate(this, this._onMenuItemClick)
        });

        this.$addMenuItem = this._menuBar._menuItems[0]._element;
        this.$addMenuItem.focus();
    }

    private _toolsItems() {
        return <any[]>[
            { id: "add", text: AccountResources.SSH_AddMenuItem, icon: "icon-add", noIcon: true }
        ];
    }

    /// <summary>Determine command name</summary>
    private _getCommandName(e?: any): string {
        return e.get_commandName();
    }

    /// <summary>Handle menu item clicks</summary>
    public _onMenuItemClick(e?: any): any {
        var command = this._getCommandName(e);
        var menuItem = e._commandSource._element;

        switch (command) {
            case 'add':
                this._addItem();
                return false;
        }
    }

    /// <summary>Callback for when the user clicks the add key menu item</summary>
    private _addItem() {
        var url = ActionUrls.PublicKey.Edit;
        window.location.replace(url);
    }

    /// <summary>Initialize the grid for public keys</summary>
    private _initializeGrid() {
        // If SSH authentication is disabled by policy, keyGridContainer doesn't exist, so don't try to populate it
        if (this.$keyGridContainer.length === 0) {
            return;
        }

        var container = $("<div class='key-container' />").appendTo(this.$keyGridContainer);
        this.$keyGridControl = <PublicKeyGrid>Controls.Enhancement.enhance(PublicKeyGrid, container, { gutter: false });
    }

    /// <summary>Initialized the navigation on the left side</summary>
    private _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, { selectedNavItem: "publicKey" }), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(PublicKeyHub, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(PublicKeyHub, ".keyHub-key-view");

export class RevokePublicKeyDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: AccountResources.DialogCancel,
                dialogClass: "key-revoke-dialog key-dialog",
                successButtonText: AccountResources.SSH_TokenRemoveText,
                title: AccountResources.SSH_RevokeDialogTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return AccountResources.SSH_RevokeKey
            .replace("$tokenName", Utils_String.htmlEncodeJavascriptAttribute(args.description))
            .replace("$keyFingerprint", Utils_String.htmlEncodeJavascriptAttribute(args.fingerprint));
    }

    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.PublicKey.Revoke + "?authorizationId=" + args.authorizationId;

        $.ajax(url, {
            type: 'DELETE',
            success: SecurityControls.DialogGenerators.CommonDialogSuccessGenerator(that),
            error: SecurityControls.DialogGenerators.CommonDialogFailureGenerator(that, AccountResources.TokenRevokeFailure)
        });
    }
}

TFS.initClassPrototype(RevokePublicKeyDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RevokePublicKeyDialog, TFS_Host.TfsContext.ControlExtensions);

/*
 * Edit Page
 */

/// <summary>Makes the add token form interactable, does not actually generate the form, the form is
/// statically defined inside EditTemplate.ascx</summary>
export class AddKeyForm extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.keys.add";

    public $leftNav: any;
    public $navCol: any;
    private _elementCache: any;
    private _initialData: SecurityModels.PublicKeyModel;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var keyId = this._element.find(".key-id").val();
        var keyEnabled = this._element.find(".key-is-valid").val();

        if (keyEnabled === "true" || keyEnabled === "True") {
            this._element.find(".key-form").submit(Core.delegate(this, this.addKey));
            this._element.find("input, select, textarea").change(Core.delegate(this, this._determineSaveState));
        } else {
            this._element.find("input, select, textarea").attr("disabled", "disabled");
        }

        this._element.find(".key-cancel-button").click(Core.delegate(this, this.cancelKeyAdd));

        this.$navCol = $("#security-area-nav");
        if(this.$navCol.length > 0) {
            this._initializeNav();
        }

        this._initialData = this._getCurrentModel();
        this._element.find("input[name=\"description\"]").keyup(Core.delegate(this, this._determineSaveState));
    }

    private _determineSaveState() {
        var saveButton = this._element.find(".key-save-button");
        if (this._isDiff()) {
            saveButton.removeAttr('disabled');
            saveButton.removeClass('disabled');
        } else {
            saveButton.attr('disabled', 'disabled');
            saveButton.addClass('disabled');
        }
    }

    public validateForm() {
        var isValid = true;

        // Clear previous validation
        var descriptionElement = this._element.find(".description");
        var dataElement = this._element.find(".data");
        descriptionElement.removeClass("invalid");
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();

        // Validate
        var descriptionValue = descriptionElement.val();
        if (descriptionValue.trim().length === 0) {
            SecurityControls.MessageAreaHelper.SetMessageAreaMessage(AccountResources.TokenDescriptionTooShort);
            descriptionElement.addClass("invalid");
            isValid = false;
        }

        var dataValue = dataElement.val();
        if (dataValue.trim().length === 0) {
            SecurityControls.MessageAreaHelper.SetMessageAreaMessage(AccountResources.SSH_DataMustNotBeBlank);
            dataElement.addClass("invalid");
            isValid = false;
        }

        return isValid;
    }

    /// <summary>Returns the current model represented by the data on the form</summary>
    private _getCurrentModel(): SecurityModels.PublicKeyModel {
        var data = new SecurityModels.PublicKeyModel();

        // Description
        data.Description = this._element.find(".description").val();

        // Add the antiforgery Token
        (<any>data).__RequestVerificationToken = this._element.find("input[name=__RequestVerificationToken]").val();

        // Id for edit/create
        data.AuthorizationId = this._element.find(".key-id").val();

        data.Data = Utils_String.htmlEncode(this._element.find(".data").val());

        return data;
    }

    /// <summary>Returns true if the two models are the same otherwise returns false</summary>
    private _isDiff(currentData?: SecurityModels.PublicKeyModel, initialData?: SecurityModels.PublicKeyModel) {
        if (!currentData) {
            currentData = this._getCurrentModel();
        }

        if (!initialData) {
            initialData = this._initialData;
        }

        return !(currentData.AuthorizationId === initialData.AuthorizationId &&
            currentData.Data === initialData.Data &&
            currentData.Description === initialData.Description);
    }

    public cancelKeyAdd() {
        var url = ActionUrls.PublicKey.Index;
        window.location.replace(url);
    }

    public addKey() {
        var url: string, that = this, data = this._getCurrentModel();

        if (!this.validateForm()) {
            return false;
        }

        // show waiter and disable buttons
        this._element.find(".wait").show();
        this._element.find(".key-cancel-button")
            .addClass("disabled")
            .attr("disabled", "disabled");
        this._element.find(".key-save-button")
            .addClass("disabled")
            .attr("disabled", "disabled");

        TFS_Core_Ajax.postMSJSON(
            ActionUrls.PublicKey.Update || ActionUrls.PublicKey.Edit,
            data,
            function () {
                url = ActionUrls.PublicKey.Index;
                window.location.replace(url); // redirect to the grid if this is an edit action
            },
            function (error) {
                that._element.find(".key-cancel-button")
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that._element.find(".key-save-button")
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that._element.find(".wait").hide();

                if (error && error.message) {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(Utils_String.htmlDecode(error.message));
                } else {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(AccountResources.SSH_KeySaveFailed);
                }
            },
            null
        );

        return false;
    }

    /// <summary>Initialized the navigation on the left side</summary>
    public _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, { selectedNavItem: "publicKey" }), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(AddKeyForm, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(AddKeyForm, ".add-key-form")

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Security.PublicKeys.Controls", exports);

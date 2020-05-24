///<amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jquery" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import TFS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Notifications = require("VSS/Controls/Notifications");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Grids = require("VSS/Controls/Grids");
import MenuControls = require("VSS/Controls/Menus");
import TFS_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");

import SecurityControls = require("Account/Scripts/TFS.Details.Security.Common.Controls");
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import { SecurityNav } from "Account/Scripts/Components/SecurityNav";

// Declare the action urls which gets populated in the json island in the view
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;

export function CommonDialogSuccessGenerator(context: any) {
    var localContextCopy = context;
    return function (jqXHR, textStatus) {
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        try { $(localContextCopy).dialog('close'); } catch (err) {}
        
    }
}

export function CommonDialogFailureGenerator(context: any, failureMessage: string) {
    var localContextCopy = context;
    return function (jqXHR, textStatus, errorThrown) {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(failureMessage);
        try { $(localContextCopy).dialog('close'); } catch (err) {}
    }
}

/// <summay>Class for the grid that appears on the index page of oauth authorizations to list all the applications</summary>
export class OAuthGrid extends SecurityControls.SecurityGrid {
    public static enhancementTypeName: string = "tfs.tokens.oauthGrid";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._getOAuthList();
    }

    private _getOAuthList() {
        var url, dummy = new Date();
        url = ActionUrls.OAuthAuthorizations.List;
        TFS_Core_Ajax.getMSJSON(url,
            {
                _t: dummy.getTime() // prevents caching
            },
            Core.delegate(this, this._getOAuthSuccess),
            Core.delegate(this, this._getOAuthFailed)
            );
    }

    // Set up the display columns for the user grid
    private _getOAuthSuccess(data: SecurityModels.OAuthAuthorizationsModel[]) {
        var authList = [], index = 0, authorization;
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();

        if (data != null) {
            for (index = 0; index < data.length; index++) {
                authorization = data[index];
                authList[index] = authorization;
            }
        }

        if (data.length === 0) {
            // display the message saying there's no personal access tokens
            this._element.find(".oauth-grid").text(accountResources.OAuthNoAuthorizationsMessageText).addClass("noitems-message");
            $(".menu-bar li[command=revokeAll]").off("click mouseover mouseout mousedown mouseup").addClass("disabled"); // disable revoke all if no tokens
        }

        // set up the displayed columns in the grid
        this._options.columns = [
            {
                text: accountResources.OAuthApplicationColumnTitle,
                width: 250,
                index: "ApplicationId",
                canSortBy: true,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellContents, descriptionContents, descriptionContentsToggle, url, linkHtml, descriptionClass,
                        hasImage = this.getColumnValue(dataIndex, "HasApplicationImage"),
                        clientId = this.getColumnValue(dataIndex, column.index),
                        imageUrl = this.getColumnValue(dataIndex, "ApplicationImage"),
                        description = this.getColumnValue(dataIndex, "ApplicationDescription"),
                        title = this.getColumnValue(dataIndex, "ApplicationName");

                    cell = $("<div />").addClass('grid-cell').width(column.width || 180);
                    if (hasImage) {
                        cell.append($("<img src=" + imageUrl + " />").addClass("oauth-application-image"));
                    } else {
                        cell.append($("<span />").addClass("oauth-application-title").text(title));
                    }

                    if (description && description.length > 0) {
                        descriptionClass = "oauth-application-description-" + clientId;
                        descriptionContents = $("<span />").addClass(descriptionClass).addClass("oauth-application-description").text(description);
                        descriptionContentsToggle = $("<span />").addClass("oauth-application-descriptionlink").text("Details").click({ that: this },
                            function (e: JQueryEventObject) {
                                $("." + descriptionClass).toggle();

                                if ($("." + descriptionClass).is(":visible")) {
                                    $(this).text(accountResources.HideDescription);
                                } else {
                                    $(this).text(accountResources.Details);
                                }

                                $(this).closest('div[class^="grid-row"]').css("height", ""); // remove the height
                                e.data.that.recalculateRowPositions();
                            });

                        cell.append($("<br />")).append(descriptionContentsToggle).append($("<br />")).append(descriptionContents);
                    }

                    return cell;
                }
            },
            {
                text: accountResources.OAuthProviderColumnTitle,
                index: "Provider",
                width: 150,
                canSortBy: true,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellValue = this.getColumnValue(dataIndex, column.index), url = this.getColumnValue(dataIndex, "ProviderUrl"), cellLink;
                    cellLink = $("<a href=\"" + url + "\">" + cellValue + "</a>");
                    cell = $("<div />").addClass("grid-cell").width(column.width || 150).append(cellLink);
                    return cell;
                }
            },
            {
                text: accountResources.OAuthIssueDateColumnTitle,
                width: 150,
                index: "IssueDateDisplay",
                canSortBy: true,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div />").addClass("grid-cell").width(column.width || 150).text(cellValue);
                    return cell;
                }
            },
            {
                text: accountResources.OAuthExpirationColumnTitle,
                width: 150,
                index: "ExpirationDateDisplay",
                canSortBy: true,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div />").addClass("grid-cell").width(column.width || 150).text(cellValue);
                    return cell;
                }
            },
            {
                text: accountResources.OAuthScopesColumnTitle,
                width: 150,
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    return $("<div />").addClass("grid-cell").width(column.width || 150).text(accountResources.TokenAllScopesSelection);
                }
            },
            {
                text: accountResources.TokenActionsColumnTitle,
                width: 150,
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cellContents, applicationName = this.getColumnValue(dataIndex, "ApplicationName"), clientId = this.getColumnValue(dataIndex, "ApplicationId");
                    cellContents = $("<span />")
                        .addClass("token-action-link")
                        .text(accountResources.TokenRevokeText)
                        .click({ that: this }, this.showDialogCallbackGenerator(RevokeAuthDialog, { args: { name: applicationName, clientId: clientId } }));
                    return $("<div />").addClass("grid-cell").width(column.width || 150).append(cellContents);
                }
            },

        ];

        //Initialize grid data source
        this._options.source = authList;
        this._originalData = authList;
        this.initializeDataSource();
    }

    // Notify the message error that getting grid data has failed
    private _getOAuthFailed(error) {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.OAuthLoadingAuthorizationsFailed);
    }

    /// <summary>Refreshes the grid data and redraws the grid</summary>
    public refresh() {
        this._getOAuthList();
        super.refresh();
    }
}

TFS.initClassPrototype(OAuthGrid, {
    _originalData: null,
    _previousWindowHeight: 0,
    _minHeight: 0,
    _maxHeight: 0,
    _openPanel: null,
    _panelHeight: 0
});

TFS.classExtend(OAuthGrid, TFS_Host.TfsContext.ControlExtensions);

/// <summary>Represents the index page, manages the grid and the nav</summary>
class OAuthHub extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.oauthHub";
    public _menuBar: MenuControls.MenuBar;

    private $userCol: any;
    private $navCol: any;
    private $oauthGrid: OAuthGrid;
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
        this.$userCol = this._element.find('.oauth-grid');
        this.$navCol = $("#security-area-nav");
        this.$menuBarContainer = this._element.find('.oauth-menu');
        this.$messageAreaContainer = this._element.find('#commonMessage');
        $(".hub-content").css("overflow", "hidden");

        this._initializeSetup();
    }

    private _initializeSetup() {
        // set up for Message Area.
        this.$messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.$messageAreaContainer);
        $(this.$messageAreaContainer).addClass('message-bar');

        this._initializeNav();  // This is for the left nav (must happen before grid so that the callback can be passed)
        this._setupMenuBars();  // This is for Menu.
        this._initializeGrid(); // This is for Grid.
    }

    public _setupMenuBars() {
        // Create actions container.
        var actionsControlElement = $(TFS_UI.domElem('div')).appendTo(this.$menuBarContainer).addClass('token-actions toolbar');
        this._menuBar = <MenuControls.MenuBar>Controls.BaseControl.createIn(MenuControls.MenuBar, actionsControlElement, {
            items: this.toolsItems(),
            executeAction: Core.delegate(this, this._onMenuItemClick)
        });

        this.$addMenuItem = this._menuBar._menuItems[0]._element;
        this.$addMenuItem.focus(); 
    }

    private toolsItems() {
        return <any[]>[
            { id: "revokeAll", text: accountResources.TokenRevokeAllMenuItemText, icon: "icon-remove", noIcon: true }
        ];
    }

    /// <summary>Determine command name</summary>
    public _getCommandName(e?: any): string {
        return e.get_commandName();
    }

    /// <summary>Handle menu item clicks</summary>
    public _onMenuItemClick(e?: any): any {
        //get item id
        var command = this._getCommandName(e);
        var menuItem = e._commandSource._element;

        switch (command) {
            case 'revokeAll':
                this._revokeAllTokens();
                return false;
        }
    }
    
    private _revokeAllTokens() {
        Dialogs.show(RevokeAllDialog, null);
    }

    /// <summary>Initialize the grid</summary>
    private _initializeGrid() {
        var container = $("<div class='oauthauthorizations-container' />").appendTo(this.$userCol);
        this.$oauthGrid = <OAuthGrid>Controls.Enhancement.enhance(OAuthGrid, container, { gutter: false });
    }

    /// <summary>Initialized the navigation on the left side</summary>
    private _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, { selectedNavItem: "oauth" }), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(OAuthHub, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(OAuthHub, ".oauth-authorization-view")

export class RevokeAllDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: accountResources.DialogCancel,
                dialogClass: "oauth-revokeall-dialog oauth-dialog",
                successButtonText: accountResources.TokenRevokeAllMenuItemText,
                title: accountResources.OAuthRevokeAllAccessTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return accountResources.OAuthRevokeAllAuthorizations;
    }

    /// <summary>Captures the client id in the click callback</summary>
    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.OAuthAuthorizations.RevokeAll;
        try { $(that).dialog('close'); } catch (err) {}
        $.ajax(url, {
            type: 'DELETE',
            success: function () {
                Service.getLocalService(Events_Services.EventService).fire(SecurityControls.UpdateGridEvent);
                SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
                try { $(that).dialog('close'); } catch (err) { }
            },
            error: CommonDialogFailureGenerator(that, accountResources.OAuthRevokeFailure)
        });
    }
}

TFS.initClassPrototype(RevokeAllDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RevokeAllDialog, TFS_Host.TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.OAuth.Controls", exports);

export class RevokeAuthDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: accountResources.DialogCancel,
                dialogClass: "oauth-revoke-dialog oauth-dialog",
                successButtonText: accountResources.TokenRevokeText,
                title: accountResources.OAuthRevokeAccessTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return Utils_String.format(accountResources.OAuthRevokeAuthorization, args.name);
    }

    /// <summary>Captures the client id in the click callback</summary>
    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.OAuthAuthorizations.Revoke + "?clientId=" + args.clientId;
        try { $(that).dialog('close'); } catch (err) { }
        $.ajax(url, {
            type: 'DELETE',
            success: function () {
                Service.getLocalService(Events_Services.EventService).fire(SecurityControls.UpdateGridEvent);
                SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
                try { $(that).dialog('close'); } catch (err) { }
            },
            error: CommonDialogFailureGenerator(that, accountResources.OAuthRevokeFailure)
        });
    }
}

TFS.initClassPrototype(RevokeAuthDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RevokeAuthDialog, TFS_Host.TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Security.OAuth.Controls", exports);

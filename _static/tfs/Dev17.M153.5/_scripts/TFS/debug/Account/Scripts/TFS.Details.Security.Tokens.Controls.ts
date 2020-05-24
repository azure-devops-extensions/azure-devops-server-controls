///<amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jquery" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import TFS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Grids = require("VSS/Controls/Grids");
import MenuControls = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import TFS_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Events_Services = require("VSS/Events/Services");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Menus = require("VSS/Controls/Menus");
import { announce } from "VSS/Utils/Accessibility";

import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");

import SecurityControls = require("Account/Scripts/TFS.Details.Security.Common.Controls");
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import { SecurityNav } from "Account/Scripts/Components/SecurityNav";

// Declare the action urls which gets populated in the json island in the view
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;
var _ElementCache: any = {};
const LoadMoreElemId: string = "pat-loadmore-id";

/*
 * Helper Functions
 */
export function GetSecretContainer(authorizationId: string) {
    var element: JQuery;
    if (authorizationId in _ElementCache) {
        return _ElementCache[authorizationId];
    }

    element = $("#container-" + authorizationId);
    _ElementCache[authorizationId] = element;

    return element;
}

function CommonDialogSuccessGenerator(context: any, narratorAnnouncement?: string) {
    var localContextCopy = context;
    return function (jqXHR, textStatus) {

        if (narratorAnnouncement) {
            announce(narratorAnnouncement);
        }
        
        Events_Services.getService().fire(SecurityControls.UpdateGridEvent);
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        try {
            $(localContextCopy).dialog('close');
        } catch (err) {
            // this can fail if the dialog is already closed
        }
    }
}

function CommonDialogFailureGenerator(context: any, failureMessage: string) {
    var localContextCopy = context;
    return function (jqXHR, textStatus, errorThrown) {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(failureMessage);
        try {
            $(localContextCopy).dialog('close');
        } catch (err) {
            // this can fail if the dialog is already closed
        }
    }
}

// Overriden for the sake of improved ctrl + c functionality copying the correct data
export class TokenGridFormatter implements Grids.ITableFormatter {
    public _options: any;
    public _grid: Grids.Grid;

    constructor(grid: Grids.Grid, options?: any) {
        this._options = options;
        this._grid = grid;
    }

    public getTableFromSelectedItems(): string {
        var that = this,
            grid = this._grid,
            selectedItems = grid.getSelectedDataIndices(),
            sb = new Utils_String.StringBuilder(),
            columns: Grids.IGridColumn[];

        // We don't really handle multiple tokens at this time, we should probably fix the json in data-selected to be a list of items
        $.each(selectedItems, function (index, row) {
            var authorizationId = grid.getColumnValue(row, "AuthorizationId");
            var tokenDataString = $(".pat-grid").attr("data-selected"), tokenData: SecurityModels.PersonalAccessTokenIndexModel;
            if (tokenDataString && tokenDataString.length > 0)
                tokenData = JSON.parse(tokenDataString);
            if (tokenData && tokenData.authorizationId == authorizationId) {
                sb.append(tokenData.accessToken);
            }
        });

        return sb.toString();
    }
}

TFS.initClassPrototype(TokenGridFormatter, {
    _options: null,
    _grid: null
});

/// <summay>Class for the grid that appears on the index page of personal access tokens to list all the tokens with support for pagination and filtering</summary>
export class TokenGrid extends SecurityControls.SecurityGrid {
    public static enhancementTypeName: string = "tfs.tokens.TokenGrid";
    public hideRevokedTokens = true;
    private static displayFilterOption: SecurityModels.DisplayFilterOptions = 1;
    private static createdByOption: SecurityModels.CreatedByOptions = 1;
    private static currSortIndex: string = "Status";
    private static currSortOrder: string = "asc";
    private static rowNumberToRequest: number = 1;
    private static pageSize: number = 100;
    private static pageRequestTimeStamp: string = new Date().toUTCString();
    private static currVisibleTopGridRowIndex: string = "2";//first row after header starts with 2

    private _gridElement: JQuery;
    private _initialSort: boolean;
    private _isScrollEventBound: boolean;
    private _isRequestedByLoadMore: boolean;
    private _tokenHub: TokenHub;

    constructor(options?) {
        super(options);

        if (!FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            this._initialSort = true;
        } else {
            this._isScrollEventBound = false;
            this._isRequestedByLoadMore = false;
            $(".rightPane").css("overflow", "hidden");

            // display the gray box showing the disclaimer about personal access tokens
            $(".token-notice").html(accountResources.TokenHaveTokenNoticeHtml).show();
        }
    }

    public initializeOptions(options?: any) {
        options = $.extend(options, { allowTextSelection: true, formatterType: TokenGridFormatter });
        super.initializeOptions(options);
    }

    public initialize() {
        this._gridElement = $(".rightPane .pat-grid");
        super.initialize();
        this._getTokenList();

        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            this._registerChangeEvents();
        }
    }

   public SetTokenHubValue(tokenHubValue: TokenHub) {
        this._tokenHub = tokenHubValue;
    }

    private _resetContinuationData() {
        TokenGrid.rowNumberToRequest = 1;
        TokenGrid.pageRequestTimeStamp = new Date().toUTCString();
        TokenGrid.currVisibleTopGridRowIndex = "2";
    }

    private _registerChangeEvents() {
        var that = this;
        $('#pat-createdby-select').on('change', function () {
            TokenGrid.createdByOption = this.value;
            that._resetContinuationData();
            that._getTokenList();
        });

        $('#pat-display-select').on('change', function () {
            TokenGrid.displayFilterOption = this.value;
            that._resetContinuationData();
            that._getTokenList();
        });

        $(window).on("resize", that._setGridCanvasElementsHeight);
    }

    private _getPageDataRequest(): SecurityModels.TokenPageRequest {
        var patPageDataRequest = new SecurityModels.TokenPageRequest();
        patPageDataRequest.CreatedByOption = TokenGrid.createdByOption;
        patPageDataRequest.DisplayFilterOption = TokenGrid.displayFilterOption;
        patPageDataRequest.SortByOption = this._GetSortByOptionsEnumFromSortIndex(TokenGrid.currSortIndex);
        patPageDataRequest.IsSortAscending = (TokenGrid.currSortOrder === "asc") ? true : false;
        //Next page number is already set at the end of previous page result or during initialization if it's the first time
        patPageDataRequest.StartRowNumber = TokenGrid.rowNumberToRequest;
        patPageDataRequest.PageSize = TokenGrid.pageSize;
        patPageDataRequest.PageRequestTimeStamp = TokenGrid.pageRequestTimeStamp;
        return patPageDataRequest;
    }

    private _GetSortByOptionsEnumFromSortIndex(sortIndex: string): SecurityModels.SortByOptions {
        switch (sortIndex) {
            case "DisplayName":
                return SecurityModels.SortByOptions.DisplayName;
            case "DisplayDate":
                return SecurityModels.SortByOptions.DisplayDate;
            case "Status":
                return SecurityModels.SortByOptions.Status;
        }
    }

    private _getTokenList() {
        var url, dummy = new Date();
        url = ActionUrls.PersonalAccessToken.List;

        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {

            TFS_Core_Ajax.getMSJSON(url,
                this._getPageDataRequest(),
                Core.delegate(this, this._jointSuccessDelegate),
                Core.delegate(this, this._getTokensFailed)
            );
        } else {
            TFS_Core_Ajax.getMSJSON(url,
                {
                    _t: dummy.getTime() // prevents caching
                },
                Core.delegate(this, this._jointSuccessDelegate),
                Core.delegate(this, this._getTokensFailed)
            );
        }
    }

    // Helper to wrap the success callbacks for _getTokenList
    private _jointSuccessDelegate(data) {
        this._getTokensSuccess(data);
        this._checkAutoloadSecret();
    }

    // TODO remove this method of passing secrets
    // Checks the url for the guid in the case that it contains a link to auto display a token
    // This happens when redirecting from the add token form
    // should probably come up with a better way of passing this data back from the add form
    private _checkAutoloadSecret() {
        var tokenDataString = $(".pat-grid").attr("data-selected"), tokenData: SecurityModels.PersonalAccessTokenIndexModel;
        if (tokenDataString && tokenDataString.length > 0) {
            tokenData = JSON.parse(tokenDataString);
            if (tokenData) {
                this.showSecret(tokenData.authorizationId, tokenData.accessToken);
            }
        }
    }

    private _isHidingRevokedPATs() {
        return this.hideRevokedTokens;
    }

    // Set up the display columns for the user grid
    private _getTokensSuccess(pageData: SecurityModels.PersonalAccessTokenPageData) {

        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();

        var data = pageData.PersonalAccessTokenDetailsModelList;

        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            if (this._isRequestedByLoadMore) {
                if (this._options.source != null) {
                    data = this._options.source.concat(data);
                }

                this._isRequestedByLoadMore = false;
            }

            if (data.length === 0) {
                // display the message saying there's no personal access tokens
                this._gridElement.addClass("hidden");
                $('#no-pats-text').text(accountResources.NoPersonalAccessTokens).removeClass("hidden");
            } else {
                $('#no-pats-text').addClass("hidden");
                this._gridElement.removeClass("hidden");

                // set up the displayed columns in the grid
                this._options.columns = [
                    {
                        text: accountResources.TokenDescriptionColumnTitle,
                        width: 180,
                        index: "DisplayName",
                        canSortBy: true,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, url, linkHtml, cellValue = this.getColumnValue(dataIndex, column.index);
                            var appendChar = (ActionUrls.PersonalAccessToken.Edit.indexOf("?") > -1) ? "&" : "?";
                            cell = $("<div />").addClass('grid-cell grid-cell-display-name').css('width', (column.width || 180));
                            url = ActionUrls.PersonalAccessToken.Edit + appendChar + "authorizationId=" + this.getColumnValue(dataIndex, "AuthorizationId");
                            linkHtml = $("<a />").attr({ href: url, title: accountResources.EditPATTooltip }).addClass('token-key-name').text(cellValue);
                            cell.append(linkHtml);

                            return cell;
                        }
                    },
                    {
                        text: accountResources.TokenExpirationColumnTitle,
                        index: "DisplayDate",
                        width: 150,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                            cell = $("<div />").addClass("grid-cell grid-cell-expiration").css('width', (column.width || 150)).text(cellValue);

                            return cell;
                        },
                        comparer: (column, order: number, item1, item2) => {
                            var date1 = new Date(item1["DisplayDate"]),
                                date2 = new Date(item2["DisplayDate"]);
                            return Utils_Date.defaultComparer(date1, date2);
                        }
                    },
                    {
                        text: accountResources.TokenStatusColumn,
                        width: 150,
                        index: "Status",
                        canSortBy: true,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                            cell = $("<div />").addClass("grid-cell grid-cell-status").css('width', (column.width || 150)).text(cellValue);
                            return cell;
                        }
                    },
                    {
                        text: accountResources.TokenActionsColumnTitle,
                        width: 150,
                        index: "AuthorizationId",
                        canSortBy: false,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, copyLink, showLink, deleteLink, deleteButton, secret_container,
                                authorizationId = this.getColumnValue(dataIndex, column.index),
                                name = this.getColumnValue(dataIndex, "DisplayName"),
                                status = this.getColumnValue(dataIndex, "Status");

                            copyLink = $("<span id='copy-" + authorizationId + "' class='token-action-link token-action-link-copy hidden'>" + accountResources.TokenCopyText + "</span>")
                                .click({ name: name, authorizationId: authorizationId, that: this }, this.copyToken);
                            deleteLink = $("<i aria-hidden='true' id='delete-" + authorizationId + "' class='bowtie-icon bowtie-edit-remove' />");
                            deleteButton = $("<button aria-label=\"" + accountResources.TokenRevokeText + "\" class='icon-action' />").append(deleteLink)
                                .keypress({ that: this }, this.showDialogCallbackOnEnterKey(RevokeTokenDialog, { args: { name: name, authorizationId: authorizationId } }))
                                .click({ that: this }, this.showDialogCallbackGenerator(RevokeTokenDialog, { args: { name: name, authorizationId: authorizationId } }));
                            secret_container = $("<div id='container-" + authorizationId + "' class='token-container'>").hide();
                            cell = $("<div />").addClass('grid-cell grid-cell-actions').css('width', (column.width || 150));

                            cell.append(copyLink);

                            if (status !== accountResources.TokenStatusRevoked) {
                                cell.append(deleteButton);
                            }

                            cell.append(secret_container);

                            return cell;
                        }
                    }];

                //Initialize grid data source
                this._options.source = data;
                this._originalData = data;
                this.initializeDataSource();
                this.updateUserGridSize();

                // sort grid
                if (data && data.length !== 0) {
                    var sortOrder = [{ index: TokenGrid.currSortIndex, order: TokenGrid.currSortOrder }];
                    this._sortBy(sortOrder[0]);
                }

                $('input.token-container-content').focus();

                if (data && data.length !== 0) {
                    this._assignAccessibilityLabels();
                }

                TokenGrid.rowNumberToRequest = pageData.NextRowNumber;

                if (TokenGrid.rowNumberToRequest > 0) {
                    this._addLoadMoreLink();
                }
                else {
                    TokenGrid.rowNumberToRequest = 1;//For refresh, we start from first page
                    this._removeLoadMoreLink();
                }

                this._setGridCanvasElementsHeight();

                var $gridCanvasElem = $(".rightPane .grid-canvas").first();
                var that = this;
                if (!this._isScrollEventBound) {
                    $gridCanvasElem.scroll(that._setFirstVisibleRowOffsetTopValue);
                    this._isScrollEventBound = true;
                }

                var gridCanvasOffset = $gridCanvasElem.offset().top;
                var currVisibleTopRowOffset = $gridCanvasElem.find(".grid-row[aria-rowindex='" + TokenGrid.currVisibleTopGridRowIndex + "']").offset().top;
                var scrollTopPosition = currVisibleTopRowOffset - gridCanvasOffset;
                $gridCanvasElem.scrollTop(scrollTopPosition);
            }

            this._tokenHub.UpdateMenubarMenuItemStates();

        } else {//Existing flow
            var tokenList = [], index = 0, token, filteredList = [], filteredIndex = 0;
            if (data != null) {
                for (index = 0; index < data.length; index++) {
                    token = data[index];
                    tokenList[index] = token;

                    if (token.IsValid) {
                        filteredList[filteredIndex] = token;
                        filteredIndex++;
                    }
                }
            }

            if (data.length === 0) {
                // display the message saying there's no personal access tokens
                this._gridElement.addClass("hidden");
                $('#no-pats-text').text(accountResources.NoPersonalAccessTokens).removeClass("hidden");
                $(".menu-bar li[command=revokeAll]").off("click mouseover mouseout mousedown mouseup").addClass("disabled"); // disable revoke all if no tokens
            } else {
                $('#no-pats-text').addClass("hidden");
                this._gridElement.removeClass("hidden");
                // display the gray box showing the disclaimer about personal access tokens
                $(".token-notice").html(accountResources.TokenHaveTokenNoticeHtml).show();

                // set up the displayed columns in the grid
                this._options.columns = [
                    {
                        text: accountResources.TokenDescriptionColumnTitle,
                        width: 180,
                        index: "DisplayName",
                        canSortBy: true,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, url, linkHtml, cellValue = this.getColumnValue(dataIndex, column.index);
                            var appendChar = (ActionUrls.PersonalAccessToken.Edit.indexOf("?") > -1) ? "&" : "?";
                            cell = $("<div />").addClass('grid-cell grid-cell-display-name').css('width', (column.width || 180));
                            url = ActionUrls.PersonalAccessToken.Edit + appendChar + "authorizationId=" + this.getColumnValue(dataIndex, "AuthorizationId");
                            linkHtml = $("<a />").attr({ "href": url }).addClass('token-key-name').attr("title", accountResources.EditPATTooltip).text(cellValue);
                            cell.append(linkHtml);

                            return cell;
                        }
                    },
                    {
                        text: accountResources.TokenExpirationColumnTitle,
                        index: "DisplayDate",
                        width: 150,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                            cell = $("<div />").addClass("grid-cell grid-cell-expiration").css('width', (column.width || 150)).text(cellValue);

                            return cell;
                        },
                        comparer: (column, order: number, item1, item2) => {
                            var date1 = new Date(item1["DisplayDate"]),
                                date2 = new Date(item2["DisplayDate"]);
                            return Utils_Date.defaultComparer(date1, date2);
                        }
                    },
                    {
                        text: accountResources.TokenStatusColumn,
                        width: 150,
                        index: "Status",
                        canSortBy: true,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                            cell = $("<div />").addClass("grid-cell grid-cell-status").css('width', (column.width || 150)).text(cellValue);
                            return cell;
                        }
                    },
                    {
                        text: accountResources.TokenActionsColumnTitle,
                        width: 815,
                        index: "AuthorizationId",
                        canSortBy: false,
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            var cell, copyLink, showLink, deleteLink, deleteButton, secret_container,
                                authorizationId = this.getColumnValue(dataIndex, column.index),
                                name = this.getColumnValue(dataIndex, "DisplayName"),
                                status = this.getColumnValue(dataIndex, "Status");

                            copyLink = $("<span id='copy-" + authorizationId + "' class='token-action-link token-action-link-copy hidden'>" + accountResources.TokenCopyText + "</span>")
                                .click({ name: name, authorizationId: authorizationId, that: this }, this.copyToken);
                            deleteLink = $("<i aria-hidden='true' id='delete-" + authorizationId + "' class='bowtie-icon bowtie-edit-remove' />");
                            deleteButton = $("<button aria-label=\"" + accountResources.TokenRevokeText + "\" class='icon-action' />").append(deleteLink)
                                .keypress({ that: this }, this.showDialogCallbackOnEnterKey(RevokeTokenDialog, { args: { name: name, authorizationId: authorizationId } }))
                                .click({ that: this }, this.showDialogCallbackGenerator(RevokeTokenDialog, { args: { name: name, authorizationId: authorizationId } }));
                            secret_container = $("<div id='container-" + authorizationId + "' class='token-container'>").hide();
                            cell = $("<div />").addClass('grid-cell grid-cell-actions').css('width', (column.width || 815));

                            cell.append(copyLink);

                            if (status !== accountResources.TokenStatusRevoked) {
                                cell.append(deleteButton);
                            }

                            cell.append(secret_container);

                            return cell;
                        }
                    }];

                //Initialize grid data source
                this._options.source = this._isHidingRevokedPATs() ? filteredList : tokenList;
                this._originalData = this._isHidingRevokedPATs() ? filteredList : tokenList;
                this.initializeDataSource();
                this.updateUserGridSize();

                // default sort
                if (data && data.length !== 0 && this._initialSort) {
                    var sortOrder = [{ index: "Status", order: "desc" }];
                    this._sortBy(sortOrder[0]);
                    this._initialSort = false; // only sort once when we initially load the data
                }

                $('input.token-container-content').focus();

                if (data && data.length !== 0) {
                    this._assignAccessibilityLabels();
                }                
            }
        }
    }

    private _setFirstVisibleRowOffsetTopValue() {
        var $gridCanvasElem = $(".rightPane .grid-canvas").first();
        var cutoff = $gridCanvasElem.offset().top;
        $gridCanvasElem.find(".grid-row").each(function () {
            if ($(this).offset().top >= cutoff) {
                TokenGrid.currVisibleTopGridRowIndex = $(this).attr("aria-rowindex");
                return false; // stops the iteration after the first one on screen
            }
        });
    }

    private _setGridCanvasElementsHeight() {
        var hubViewHeight = $('div.hub-view').outerHeight();
        var headerContentHeight = $('.rightPane .header-content').outerHeight();
        var noticeHeight = $('.rightPane .token-notice').outerHeight();
        var patMenuHeight = $('.rightPane .pat-menu').outerHeight();
        var gridHeaderHeight = $('.rightPane .grid-header').outerHeight();
        var perfBarHeight = $('.perf-bar-container').outerHeight();

        var remainingHeight = hubViewHeight - (headerContentHeight + noticeHeight + patMenuHeight + gridHeaderHeight + perfBarHeight + 10/* leave some margin after the load more option */);

        $('.rightPane .grid-canvas').css('overflow-x', 'hidden');
        $('.rightPane .tokens-container.grid.has-header, .rightPane .grid-content-spacer, .rightPane .grid-canvas').css('height', remainingHeight + 'px');
    }

    private _addLoadMoreLink() {
        var that = this;
        var $loadMoreElem = $('#' + LoadMoreElemId);
        var $lastGridRowElem = $('.pat-grid .grid-row').last();
        var gridRowHeight = $lastGridRowElem.height();
        var lastGridTop = $lastGridRowElem.position().top;

        if ($loadMoreElem.length != 0) {
            //Remove the stale link
            $loadMoreElem.remove();
        }

        var $loadMoreDiv = $("<div />").attr("id", LoadMoreElemId).css("top", gridRowHeight + lastGridTop + "px").on('click dblclick mouseup mousedown keydown keyup keypress', function () {
            return false; //don't let the grid canvas react to these events on 'load more' div
        });

        $("<a />").attr("href", '#').text(accountResources.PatGridShowMoreLink).css("font-size", "14px").on("click", function () {
            $(this).replaceWith("<span>" + accountResources.Loading + "</span>");
            return that._loadMoreClickOrKeypressHandler();
        }).on("keypress", function (e?: JQueryEventObject) {
            if (e && e.keyCode == TFS_UI.KeyCode.ENTER) {
                $(this).replaceWith("<span>" + accountResources.Loading + "</span>");
                return that._loadMoreClickOrKeypressHandler();
            }
        }).appendTo($loadMoreDiv);

        $lastGridRowElem.after($loadMoreDiv);
    }

    private _loadMoreClickOrKeypressHandler(): boolean {
        this._isRequestedByLoadMore = true;
        setTimeout(() => this._getTokenList(), 0);
        return false;
    }

    private _removeLoadMoreLink() {
        $('#' + LoadMoreElemId).remove();
    }

    private _assignAccessibilityLabels() {
        var that = this;
        var $rows = $('.pat-grid .tokens-container .grid-row');

        $rows.each(function () {
            var rowId = $(this).attr('id');
            var rowSelector = '#' + rowId;
            var customAriaLabel = that._createAriaLabelForRow(rowSelector);
            $(rowSelector).attr('label', customAriaLabel);
            $(rowSelector).attr('aria-label', customAriaLabel);
        });
    }

    private _createAriaLabelForRow(rowSelector: string) {
        var name = "";
        var $row = $(rowSelector);
        var $cells = $row.children(".grid-cell").each(function () {
            var $this = $(this);
                        
            var firstLinkVal = $this.children("a").text();
            var firstButtonAriaLabel = $this.children("button").attr("aria-label");

            if (firstLinkVal && firstLinkVal.length > 0) {
                name += firstLinkVal + " ";
            }
            else if (firstButtonAriaLabel && firstButtonAriaLabel.length > 0) {
                name += firstButtonAriaLabel + " ";
            }
            else {
                name += $(this).text() + " ";
            }
        });

        return name;
    }

    // Notify the message error that getting grid data has failed
    private _getTokensFailed(error) {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.GetTokensDataFailedMessage);
    }

    /// <summary>Toggles the display of the token secret</summary>
    public showSecret(authorizationId: string, secret: string) {
        var url, element = $("#container-" + authorizationId);
        element.html("");
        element.append($("<div class='token-container-message' > " + accountResources.TokenOneTimeDisplayWarning + " </div>"));
        element.append(($("<input type=\"text\" class=\"token-container-content\" value=\"" + secret + "\" size=\"" + secret.length + "\" />")
            .focus(function () { this.select(); })
            .click(function () { this.select(); })));
        element.closest('div[class^="grid-row"]').css("height", "76"); // increase height of row manually
        element.css("display", "block");
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        $("#copy-" + authorizationId).css("display", "inline-block");
        $('input.token-container-content').focus();
        this.recalculateRowPositions();
    }

    /// <summary>Copies the token if supported</summary>
    public copyToken(e?: JQueryEventObject) {
        var url, that, authorizationId, dummy = new Date(), secret;
        that = e.data.that;
        authorizationId = e.data.authorizationId;

        if ($("#container-" + authorizationId).is(":visible")) { // if the secret is displayed and loaded
            secret = $("#container-" + authorizationId + " > .token-container-content").val();
            Utils_Clipboard.copyToClipboard(secret);
            SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
        }
    }

    private _getSecretToClipboardSuccess(secret: string) {
        Utils_Clipboard.copyToClipboard(secret);
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
    }

    private _getSecretToClipboardFailure() {
        SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.TokenCopyActionFailure);
    }

    /// <summary>Refreshes the grid data and redraws the grid</summary>
    public refresh() {
        this._getTokenList();
        this.updateUserGridSize();
        $('input.token-container-content').focus();
        this._assignAccessibilityLabels();
    }

    public layout() {
        super.layout();
        this._checkAutoloadSecret();
    }

    public onSort(sortOrder: any, sortColumns?: any): any {
        var retVal: any;
        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            retVal = super.onSort([{ index: TokenGrid.currSortIndex, order: TokenGrid.currSortOrder }], sortColumns);
        }
        else {
            retVal = super.onSort(sortOrder, sortColumns);
        }

        this._assignAccessibilityLabels();

        return retVal;
    }

    public _onHeaderClick(e?: JQueryEventObject): any {
        var continueWithUISort = true;

        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            var columnIndex, column, headerColumn, separator;
            headerColumn = $(e.target).closest(".grid-header-column");

            if (headerColumn.length > 0) {
                separator = $(e.target).closest(".separator");

                if (separator.length <= 0) {
                    columnIndex = headerColumn[0]._data.columnIndex;
                    column = this._columns[columnIndex];
                    if (column.canSortBy && !column.fixed) {
                        var currSortOrder = TokenGrid.currSortOrder;
                        //More pages to load so, save the sort state and pass it to grid after loading more pages
                        if (TokenGrid.currSortIndex === column.index) {
                            TokenGrid.currSortOrder = (currSortOrder === "asc") ? "desc" : "asc"; //Flip the order in preparation for sort following loading more data
                        } else {
                            TokenGrid.currSortIndex = column.index;
                            TokenGrid.currSortOrder = "asc";
                        }

                        if (TokenGrid.rowNumberToRequest > 1) {
                            continueWithUISort = false;
                        }
                    }
                }
            }
        }

        if (continueWithUISort) {
            return super._onHeaderClick(e);
        } else {
            this._resetContinuationData();
            setTimeout(() => this._getTokenList(), 0);//New sort order will be set after data is loaded
            return false;
        }
    }
}

TFS.initClassPrototype(TokenGrid, {
    _originalData: null,
    _previousWindowHeight: 0,
    _minHeight: 0,
    _maxHeight: 0,
    _openPanel: null,
    _panelHeight: 0
});

TFS.classExtend(TokenGrid, TFS_Host.TfsContext.ControlExtensions);

/// <summary>Represents the index page, manages the grid and the nav - with support for pagination and filtering of PAT grid</summary>
export class TokenHub extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.tokenHub";
    public _menuBar: MenuControls.MenuBar;

    private $tokenCol: any;
    private $navCol: any;
    private $tokenGrid: TokenGrid;
    private $leftNav: SecurityControls.SecurityNav;
    private $menuBarContainer: any;
    private $filterContainer: any;
    private $panelContainer: any;
    private $messageArea: Notifications.MessageAreaControl;
    private $messageAreaContainer: any;
    private $addMenuItem: any;
    private $hideRevokedCheckBox: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this.$tokenCol = this._element.find('.pat-grid');
        this.$navCol = $("#security-area-nav");
        this.$menuBarContainer = this._element.find('.pat-menu');
        this.$messageAreaContainer = this._element.find('.common-message');
        $(".hub-content").css("overflow", "hidden");

        this._initializeSetup();
    }

    private _initializeSetup() {
        // set up for Message Area.
        this.$messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.$messageAreaContainer);
        $(this.$messageAreaContainer).addClass('message-bar');

        if (this.$navCol.length > 0) {
            this._initializeNav();  // This is for the left nav (must happen before grid so that the callback can be passed)
        }

        this._setupMenuBars();  // This is for Menu.
        if (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            this._setupFilters(); //For filters
        }
        this._initializeGrid(); // This is for Grid.
    }

    private _setupFilters() {
        var unorderedListInMenu = $('.pat-menu ul');

        var createdBylistElement = $(TFS_UI.domElem('li')).addClass('createdby-list-container menu-item').css('display', 'inline-block');
        var createdBySelectElement = $(TFS_UI.domElem('select')).attr('id', 'pat-createdby-select');
        $(TFS_UI.domElem('option')).attr('value', '1').attr('selected', 'selected').text('Manual').appendTo(createdBySelectElement);
        $(TFS_UI.domElem('option')).attr('value', '2').text('Auto-generated').appendTo(createdBySelectElement);
        $(TFS_UI.domElem('option')).attr('value', '3').text('All').appendTo(createdBySelectElement);
        $(TFS_UI.domElem('label')).text('Creation Method').attr('for', 'pat-createdby-select').css('padding-right', '5px').appendTo(createdBylistElement);
        createdBySelectElement.appendTo(createdBylistElement);
        createdBylistElement.appendTo(unorderedListInMenu);

        var displayListElement = $(TFS_UI.domElem('li')).addClass('display-list-container menu-item').css('display', 'inline-block');
        var displaySelectElement = $(TFS_UI.domElem('select')).attr('id', 'pat-display-select');
        $(TFS_UI.domElem('option')).attr('value', '1').attr('selected', 'selected').text('Active').appendTo(displaySelectElement);
        $(TFS_UI.domElem('option')).attr('value', '2').text('Revoked').appendTo(displaySelectElement);
        $(TFS_UI.domElem('option')).attr('value', '3').text('Expired').appendTo(displaySelectElement);
        $(TFS_UI.domElem('option')).attr('value', '4').text('All').appendTo(displaySelectElement);
        $(TFS_UI.domElem('label')).text('Filter By').attr('for', 'pat-display-select').css('padding-right', '5px').appendTo(displayListElement);
        displaySelectElement.appendTo(displayListElement);
        displayListElement.appendTo(unorderedListInMenu);
    }

    public _setupMenuBars() {
        // Create actions container.
        var actionsControlElement = $(TFS_UI.domElem('div')).appendTo(this.$menuBarContainer).addClass('token-actions toolbar');
        this._menuBar = <MenuControls.MenuBar>Controls.BaseControl.createIn(MenuControls.MenuBar, actionsControlElement, {
            items: (FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) ? this.toolsItemsLatest() : this.toolsItems(),
            executeAction: Core.delegate(this, this._onMenuItemClick),
            getCommandState: Core.delegate(this, this._getToolbarItemCommandState)
        });

        this.$addMenuItem = this._menuBar._menuItems[0]._element;
        this.$addMenuItem.focus();
    }

    public UpdateMenubarMenuItemStates() {
        this._menuBar.updateMenuItemStates();
    }

    private _getToolbarItemCommandState(command: string) {  
    switch (command) {
        case "revokeAll":
        // Disable RevokeAll menu item if the grid showing items is hidden.
        var patGrid = $(".rightPane .pat-grid");
        if(patGrid && patGrid.length == 1 && patGrid[0].className == "pat-grid hidden") {
            return Menus.MenuItemState.Disabled;
        }

        break;
       }        
    }

    private toolsItemsLatest() {
        return <any[]>[
            { id: "addToken", text: accountResources.TokenAddMenuItemText, icon: "icon-add", noIcon: true, ariaLabel: accountResources.TokenAddMenuItemText },
            { id: "revokeAll", text: accountResources.TokenRevokeAllMenuItemText, icon: "icon-remove", noIcon: true, ariaLabel: accountResources.TokenRevokeAllMenuItemText }
        ];
    }

    private toolsItems() {
        return <any[]>[
            { id: "addToken", text: accountResources.TokenAddMenuItemText, icon: "icon-add", noIcon: true, ariaLabel: accountResources.TokenAddMenuItemText },
            { id: "revokeAll", text: accountResources.TokenRevokeAllMenuItemText, icon: "icon-remove", noIcon: true, ariaLabel: accountResources.TokenRevokeAllMenuItemText },
            { id: "hideRevokedPATs", text: accountResources.TokenShowRevokedPATs, noIcon: true, ariaLabel: accountResources.TokenShowRevokedPATs }
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
            case 'addToken':
                this._addToken();
                return false;
            case 'revokeAll':
                this._revokeAll();
                return false;
            case 'hideRevokedPATs':
                this._hideRevokedPATRows();
                return false;
        }
    }

    /// <summary>Redirects to the add new token page</summary>
    private _addToken() {
        var url = ActionUrls.PersonalAccessToken.Edit;
        window.location.replace(url);
    }

    private _revokeAll() {
        Dialogs.show(RevokeAllTokensDialog, null);
    }

    private _hideRevokedPATRows() {
        this.$tokenGrid.hideRevokedTokens = !this.$tokenGrid.hideRevokedTokens;

        var label = this.$tokenGrid.hideRevokedTokens ? accountResources.TokenShowRevokedPATs : accountResources.TokenHideRevokedPATs;

        var toggleButton = $('li[command=hideRevokedPATs] > span.text')[0];
        toggleButton.innerHTML = label;
        $('li[command=hideRevokedPATs]').attr("aria-label", label);
        this.$tokenGrid.refresh();
    }

    /// <summary>Initialize the grid</summary>
    // This needs to happen AFTER the navigation has been initialized
    private _initializeGrid() {
        var container = $("<div class='tokens-container' />").appendTo(this.$tokenCol);
        this.$tokenGrid = <TokenGrid>Controls.Enhancement.enhance(TokenGrid, container, { gutter: false });

        this.$tokenGrid.SetTokenHubValue(this);
    }

    /// <summary>Initialize the navigation on the left side</summary>
    private _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, {selectedNavItem: "pat"}), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(TokenHub, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(TokenHub, ".tokenHub-token-view")

export class RevokeTokenDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: accountResources.DialogCancel,
                dialogClass: "token-revoke-dialog token-dialog",
                successButtonText: accountResources.TokenRevokeText,
                title: accountResources.TokenRevokeDialogTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return accountResources.TokenRevokeHtmlMessage.replace("$tokenName", Utils_String.htmlEncodeJavascriptAttribute(args.name));
    }

    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.PersonalAccessToken.Revoke + "?authorizationId=" + args.authorizationId;
        try {
            var tokenDataString = $(".pat-grid").attr("data-selected"), tokenData: SecurityModels.PersonalAccessTokenIndexModel;
            if (tokenDataString && tokenDataString.length > 0) {
                tokenData = JSON.parse(tokenDataString);
                if (tokenData && tokenData.authorizationId === args.authorizationId) {
                    $(".pat-grid").attr("data-selected", ""); // clear the data if the token got revoked
                }
            }

            $(that).dialog('close'); // close dialog before action completed to avoid double clicks etc.
        } catch (err) {
            // this can fail if it already closed
        }

        $.ajax(url, {
            type: 'DELETE',
            success: CommonDialogSuccessGenerator(that, accountResources.TokenRevokeSuccess),
            error: CommonDialogFailureGenerator(that, accountResources.TokenRevokeFailure)
        });
    }
}

TFS.initClassPrototype(RevokeTokenDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RevokeTokenDialog, TFS_Host.TfsContext.ControlExtensions);

export class RegenerateTokenDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: accountResources.DialogCancel,
                dialogClass: "token-regenerate-dialog token-dialog",
                successButtonText: accountResources.TokenRegenerateLinkText,
                title: accountResources.TokenRegenerateDialogTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return accountResources.TokenRegenerateHtmlMessage.replace("$tokenName", Utils_String.htmlEncodeJavascriptAttribute(args.name));
    }

    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.PersonalAccessToken.Regenerate + "?authorizationId=" + args.authorizationId;
        try { $(that).dialog('close'); } catch (err) { }
        $.ajax(url, {
            type: 'PATCH',
            success: function (data: SecurityModels.PersonalAccessTokenDetailsModel) {
                var dataToPass = new SecurityModels.PersonalAccessTokenIndexModel();
                dataToPass.authorizationId = data.AuthorizationId;
                dataToPass.accessToken = data.Token;

                $(".pat-grid").attr("data-selected", JSON.stringify(dataToPass));
                Events_Services.getService().fire(SecurityControls.UpdateGridEvent);
                SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();
                try { $(that).dialog('close'); } catch (err) { }
            },
            error: CommonDialogFailureGenerator(that, accountResources.TokenRegenerateFailure)
        });
    }
}
TFS.initClassPrototype(RegenerateTokenDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RegenerateTokenDialog, TFS_Host.TfsContext.ControlExtensions);

export class RevokeAllTokensDialog extends SecurityControls.SecurityDialog {
    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            params: {
                cancelButtonText: accountResources.DialogCancel,
                dialogClass: "token-revokeall-dialog token-dialog",
                successButtonText: accountResources.TokenRevokeAllMenuItemText,
                title: accountResources.TokenRevokeDialogTitle
            }
        }, options));
    }

    public getMessage(args: any) {
        return accountResources.TokenRevokeAllHtmlMessage;
    }

    public onSuccess(args: any, that: any, thatDialog: SecurityControls.SecurityDialog) {
        var url, dummy = new Date();
        url = ActionUrls.PersonalAccessToken.RevokeAll;
        try { $(that).dialog('close'); } catch (err) { }
        $.ajax(url, {
            type: 'DELETE',
            success: CommonDialogSuccessGenerator(that, accountResources.RevokeAllTokensSuccess),
            error: CommonDialogFailureGenerator(that, accountResources.RevokeAllTokensFailure)
        });
    }
}
TFS.initClassPrototype(RevokeAllTokensDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(RevokeAllTokensDialog, TFS_Host.TfsContext.ControlExtensions);

export class CopyTokenDialog extends Dialogs.ModalDialog {
    public params: any;
    public args: any;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            height: 200,
            resizable: false,
            hasProgressElement: false,
            allowMultiSelect: false,
            modal: true,
            title: accountResources.CopyPersonalAccessToken,
            close: Core.delegate(this, this._onClose)
        }, options));

        if (options.params) {
            this.params = options.params;
        }

        if (options.args) {
            this.args = options.args;
        }
    }

    public initialize() {
        super.initialize();

        var wrapper = $("<div />").addClass("token-copy-dialog token-dialog").html(this.getMessage(this.args));
        this.getElement().append(wrapper);
        $('.ui-dialog-buttonset').css('display', 'none');//Hide both 'Ok' and 'Cancel' buttons
        $('.token-copy-dialog .token-container-message').css({ "color": "#C73436", "font-weight": "bold" });
        $('.token-copy-dialog input.token-container-content').focus(function () { this.select(); }).click(function () { this.select(); });
        $('.token-copy-dialog input.token-container-content').focus(); //Focus token field by default        
    }

    public getMessage(args: any) {
        return Utils_String.format("<div class='token-container-message'>{0}</div><input type='text' class='token-container-content' value={1} size={2} />", accountResources.TokenOneTimeDisplayWarning, this.args.secret, this.args.secret.length + 5/* space for margin */);
    }

    private _onClose(eventArgs: any) {
        super.close();
        window.location.replace(ActionUrls.PersonalAccessToken.Index); //Load token grid
    }
}

TFS.initClassPrototype(CopyTokenDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(CopyTokenDialog, TFS_Host.TfsContext.ControlExtensions);

/// <summary>Makes the add token form interactable, does not actually generate the form, the form is
/// statically defined inside EditTemplate.ascx</summary>
export class AddTokenForm extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.tokens.add";

    public $leftNav: any;
    public $navCol: any;
    private _initialData: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._element.find(".scope-mode-all").click(Core.delegate(this, this.setAllScopes));
        this._element.find(".scope-mode-selected").click(Core.delegate(this, this.setSelectedScopes));
        var tokenId = this._element.find(".token-id").val();
        var tokenEnabled = this._element.find(".token-is-valid").val();
        if (tokenEnabled === "True") { // save operations need a regen warning for now
            this._element.find(".token-form").submit(Core.delegate(this, this.addToken));
            this._element.find("input, select").change(Core.delegate(this, this._determineSaveState));
        } else {
            this._element.find("input, select").attr("disabled", "disabled");
        }
        this._element.find(".token-cancel-button").click(Core.delegate(this, this.cancelToken));

        this.$navCol = $("#security-area-nav");
        if (this.$navCol.length > 0) {
            this._initializeNav();
        }
        this._initialData = this._getCurrentModel();

        this._element.find("input[name=\"description\"]").keyup(Core.delegate(this, this._determineSaveState));

        var tokenForm = this._element;
        tokenForm.find('span.scope-check-wrapper > input[type="checkbox"]').keydown(function (e) {
            var currElemRow = $(this).data('row');
            var currElemCol = $(this).data('col');
            var row = -1;
            var col = -1;
            var keyCode = keyCode = TFS_UI.KeyCode;

            switch (e.keyCode) {
                case keyCode.DOWN:
                    row = currElemRow + 1;
                    col = currElemCol;
                    break;
                case keyCode.UP:
                    row = currElemRow - 1;
                    col = currElemCol;
                    break;
                case keyCode.LEFT:
                    row = currElemRow;
                    col = currElemCol - 1;
                    break;
                case keyCode.RIGHT:
                    row = currElemRow;
                    col = currElemCol + 1;
                    break;
                case keyCode.ENTER:
                    $(this).trigger('click');
                    break;
                default:
                    return;
            }

            var elemToFocusSelector = 'span.scope-check-wrapper > input[type="checkbox"][data-row=' + row + '][data-col=' + col + ']';
            tokenForm.find(elemToFocusSelector).trigger('focus');
        });
    }

    private _determineSaveState() {
        var saveButton = this._element.find(".token-save-button");
        if (this._isDiff()) {
            saveButton.removeAttr('disabled');
            saveButton.removeClass('disabled');
        } else {
            saveButton.attr('disabled', 'disabled');
            saveButton.addClass('disabled');
        }
    }

    public setSelectedScopes() {
        this._element.find(".check-field input").removeAttr('disabled'); // enable all the check boxes for scope
        this._element.find(".scope-label").removeClass("disabled");
        this._element.find(".scopes").removeClass("disabled");
    }

    public setAllScopes() {
        this._element.find(".check-field input").attr('disabled', 'disabled');
        this._element.find(".scope-label").addClass("disabled");
        this._element.find(".scopes").addClass("disabled");
    }

    public cancelToken() {
        var url = ActionUrls.PersonalAccessToken.Index;
        window.location.replace(url);
    }

    public validateForm() {
        var isValid = true;
        var errorMessage = "";

        // Clear previous validation
        this._element.find(".description").removeClass("invalid");
        SecurityControls.MessageAreaHelper.ClearMessageAreaMessage();

        // Validate description
        var descriptionValue = this._element.find(".description").val();
        if (descriptionValue.trim().length === 0) {
            errorMessage += accountResources.TokenDescriptionTooShort;
            this._element.find(".description").addClass("invalid");
            isValid = false;
        }

        // Validate Selected Scopes - atleast one scope must be selected if "Selected scopes" option is chosen
        if ($("input[class=scope-mode-selected]:checked").length > 0) {
            if ($("input[class='selected-scope-checkbox']:checked").length == 0) {
                if (errorMessage.length > 0) {
                    errorMessage += "; \n";
                }
                errorMessage += accountResources.TokenNoScopeSelectedMessage;
                isValid = false;
            }
        }

        if (!isValid) {
            SecurityControls.MessageAreaHelper.SetMessageAreaHtmlMessage(errorMessage);
        }

        return isValid;
    }

    private _getCurrentModel(): SecurityModels.EditTokenData {
        var data = new SecurityModels.EditTokenData();

        // Description
        data.Description = this._element.find(".description").val();

        // Expiration Date
        // We just pass the value selected (number of days) directly back to the controller
        // This avoids any kind of hacky serialization or use of epoch time
        data.SelectedExpiration = this._element.find(".expiration").val();

        // Account Mode / Selected Accounts
        // If all the boxes are checked then send as AllAccounts
        // otherwise send the value in #accountMode
        data.SelectedAccounts = this._element.find(".account").val();
        if (data.SelectedAccounts === "all_accounts") {
            data.AccountMode = "AllAccounts";
        } else {
            data.AccountMode = "SelectedAccounts";
        }

        // Scopes
        data.ScopeMode = this._element.find("input[name=scopeMode]:checked").val();
        data.SelectedScopes = this._element.find(".scopes input:checked").map(function () { return this.value; }).get().join(",");

        // Antiforgery Token
        data.__RequestVerificationToken = this._element.find("input[name=__RequestVerificationToken]").val();

        // Id for edit/create
        data.AuthorizationId = this._element.find(".token-id").val();

        return data;
    }

    private _isDiff(currentData?: SecurityModels.EditTokenData, initialData?: SecurityModels.EditTokenData) {
        if (!currentData) {
            currentData = this._getCurrentModel();
        }

        if (!initialData) {
            initialData = this._initialData;
        }

        return !(currentData.Description === initialData.Description &&
            currentData.SelectedExpiration === initialData.SelectedExpiration &&
            currentData.SelectedAccounts === initialData.SelectedAccounts &&
            currentData.AccountMode === initialData.AccountMode &&
            currentData.ScopeMode === initialData.ScopeMode &&
            currentData.SelectedScopes === initialData.SelectedScopes);
    }

    public addToken() {
        // validation here
        var url: string, that = this, data = this._getCurrentModel();

        if (!this.validateForm()) {
            return false;
        }

        this._element.find(".wait").show();
        this._element.find(".token-cancel-button")
            .addClass("disabled")
            .attr("disabled", "disabled");
        this._element.find(".token-save-button")
            .addClass("disabled")
            .attr("disabled", "disabled");

        TFS_Core_Ajax.postMSJSON(
            ActionUrls.PersonalAccessToken.Update || ActionUrls.PersonalAccessToken.Edit,
            data,
            function (data: SecurityModels.PersonalAccessTokenDetailsModel) {
                url = ActionUrls.PersonalAccessToken.Index;
                if (data) {
                    if (data.Token && //Fallback to old behaviour for editing an existing token as there's no token to display
                        FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
                        Dialogs.show(CopyTokenDialog, { args: { secret: data.Token } });
                    } else {
                        var form = $(Utils_String.format("<form id=\"postback-form\" action=\"{0}\" method=\"POST\" />", url));
                        form.append($(Utils_String.format("<input type=\"hidden\" name=\"authorizationId\" value=\"{0}\" />", data.AuthorizationId)));
                        form.append($(Utils_String.format("<input type=\"hidden\" name=\"accessToken\" value=\"{0}\" />", data.Token)));
                        form.append("<input type=\"submit\" />");
                        form.appendTo(document.body);
                        form.submit();
                    }
                } else {
                    window.location.replace(url); // redirect to the grid if this is an edit action
                }
            },
            function (error) {
                that._element.find(".token-cancel-button")
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that._element.find(".token-save-button")
                    .removeClass("disabled")
                    .removeAttr("disabled");
                that._element.find(".wait").hide();

                if (error && error.message) {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(Utils_String.htmlDecode(error.message));
                } else {
                    SecurityControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.TokenGenerationFailed);
                }
            },
            null
        );

        return false;
    }

    /// <summary>Initialized the navigation on the left side</summary>
    public _initializeNav() {
        ReactDOM.render(
            React.createElement(SecurityNav, {selectedNavItem: "pat"}), document.getElementById('security-area-nav'));
    }
}

TFS.classExtend(AddTokenForm, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(AddTokenForm, ".add-token-form")

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Security.Tokens.Controls", exports);

///<amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jquery" />

import TFS = require("VSS/VSS");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_UI = require("VSS/Utils/UI");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Events_Services = require("VSS/Events/Services");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");

var delegate = Core.delegate;

// TFS event service event name for refreshing the token grid contents
export var UpdateGridEvent = "tfs-update-grid";

// Declare the action urls which gets populated in the json island in the view
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;

export module DialogGenerators {
    export function CommonDialogSuccessGenerator(context: any) {
        var localContextCopy = context;
        return function (jqXHR, textStatus) {
            Events_Services.getService().fire(UpdateGridEvent);
            MessageAreaHelper.ClearMessageAreaMessage();
            try {
                $(localContextCopy).dialog('close');
            } catch (err) {
                // this can fail if the dialog is already closed
            }
        }
    }

    export function CommonDialogFailureGenerator(context: any, failureMessage: string) {
        var localContextCopy = context;
        return function (jqXHR, textStatus, errorThrown) {
            MessageAreaHelper.SetMessageAreaMessage(failureMessage);
            try {
                $(localContextCopy).dialog('close');
            } catch (err) {
                // this can fail if the dialog is already closed
            }
        }
    }
}

export class SecurityNav extends Grids.GridO<any> {
    private NodeIdCounter;
    private selectedNavItem;
    private nodes = [];

    constructor(options?) {
        super(options);

        if (options) {
            if (options.selectedNavItem) {
                this.selectedNavItem = options.selectedNavItem;
            }
        }
    }

    public initializeOptions(options?: any) {
        options = $.extend({
            header: false,
            allowMultiSelect: false,
            allowMoveColumns: false,
            source: [],
            initialSelection: false,
            columns: [{ index: "SecurityItem" }],
            asyncInit: false,
        }, options);

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        var publicKeysEnabled = FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.SSHPublicKeys, false);
        this.NodeIdCounter = 1;
        var node, links = [
            { name: "pat", text: accountResources.TokenListPageTitle, url: ActionUrls.PersonalAccessToken.Index }
        ];

        var tfsContext = TFS_Host.TfsContext.getDefault();
        if (tfsContext.isHosted) {
            links.push({ name: "altcreds", text: accountResources.AlternateCredentialsPageTitle, url: ActionUrls.AlternateCredentials.Index });
            links.push({ name: "oauth", text: accountResources.OAuthPageTitle, url: ActionUrls.OAuthAuthorizations.Index });
        }

        if (publicKeysEnabled) {
            links.push({ name: "publicKey", text: accountResources.SSH_IndexPageTitle, url: ActionUrls.PublicKey.Index });
        }
        
        for (var link in links) {
            node = this.createLinkNode(this.NodeIdCounter, links[link].text, links[link].url, links[link].name);

            // Mark the selected node
            if (links[link].name == this.selectedNavItem) {
                node.selected = true;
            }

            this.nodes.push(node);
            this.NodeIdCounter += 1;
        }

        this._options.columns = [
            {
                text: "",
                index: "SecurityPanels",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var tabIndex = -1;
                    if (this.nodes[dataIndex].Id == 1)
                        tabIndex = 0;
                    var linkHtml = $("<a />").attr({ "href": this.nodes[dataIndex].href }).attr("tab-index", tabIndex);
                    linkHtml.append($("<div />").addClass("node-content").attr("id", "SecurityNav" + this.nodes[dataIndex].id).append($("<span />").text(this.nodes[dataIndex].title)));
                    return linkHtml;
                }
            }]

        this._options.source = this.nodes;
        this.initializeDataSource();
        this._expandedCount = this.nodes.length;
    }

    public initializeDataSource() {
        super.initializeDataSource();
        this.fixRowLabels();
        this.recalculateRowPositions();
        this._setSelectedNavItem();

        $('.nav-container')[0].onkeypress = function (e) {
            if (e.keyCode == 13 || e.keyCode == 32) {
                $('.grid-row-selected > a')[0].click();
            }
        }
    }

    /// <summary>Determines selected grid row item by name and set it</summary>
    private _setSelectedNavItem() {
        //Find the selected row index
        var rows = this.nodes.filter(x => x.name == this.selectedNavItem);
        if (rows && rows.length > 0) {
            var index = rows[0].id;
            this.setSelectedRowIndex(index-1);
        }        
    }

    public recalculateRowPositions() {
        $(".leftPane .grid-canvas, .leftPane .grid-content-spacer, .leftPane .grid, .leftPane .nav-container").css("height", this.getGridHeight());

        this._canvas.children(".grid-row").each(function (index: any, elem: Element) {
            $(this).css("width", 275 + "px");
        });

        // unbound height of the whole grid
        this._canvas.children(".grid-canvas, .grid-content-spacer, .grid").css("height", this.getGridHeight());
    }

    /// <summary>Determines the height of the grid from its children</summary>
    public getGridHeight() {
        var totalHeight = 100;
        this._canvas.children(".grid-row").each(function () {
            totalHeight += $(this).outerHeight(true);
        });

        return totalHeight;
    }

    /// <summary>Redraws the grid</summary>
    public updateUserGridSize() {
        this._onContainerResize(null);
    }

    /// <summary>This method is called whenever the container is resized</summary>
    public _onContainerResize(e?: JQueryEventObject): any {
        this._element.find('.leftPane .grid-canvas').css('overflow-x', 'auto');
        super._onContainerResize(e);

        // fixes a small issue with the x overflow showing up when collapsing left nav and window is maximized
        this._canvas.css("overflow-x", "hidden");
        // remove the height of the grid elements
        this._canvas.find(".grid-row").css("height", "");

        this.recalculateRowPositions();
    }

    public _redraw(includeNonDirtyRows?: boolean) {
        super._redraw(includeNonDirtyRows);
        this.recalculateRowPositions();
    }

    private fixRowLabels() {
        this._canvas.children(".grid-row").each(function (index: any, elem: Element) {
            var labellingDiv = $(this).children("div").id;
            $(this).attr("aria-labelledby", labellingDiv);
        });
    }

    private createLinkNode(id, text, link, name) {
        var node = { id: id, title: text, expanded: false, href: link, name: name }
        return node;
    }
}

TFS.classExtend(SecurityNav, TFS_Host.TfsContext.ControlExtensions);

export class SecurityGrid extends Grids.Grid {
    public _originalData: any;              // copy of the data that got loaded via ajax
    public _previousWindowHeight: number;  // previous window height for calculation on resize
    public _minHeight: number;             // min grid height for calculation on resize
    public _maxHeight: number;             // max grid height for calculation on resize
    public _panelHeight: number;           // inner panel height for calculation on resize

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        options = $.extend({
            header: true,
            allowMultiSelect: false,
            source: [],
            initialSelection: false,
            columns: [],
            asyncInit: false
        }, options);

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        this._previousWindowHeight = $(window).height();
        this._minHeight = 100;
        this._maxHeight = screen.availHeight - 100;
        this._panelHeight = 70;

        $(this._element[0]).css('height', $(this._element[0]).height());
        Events_Services.getService().attachEvent(UpdateGridEvent, Core.delegate(this, this.refresh));
    }

    public _onContainerMouseDown(e?: JQueryEventObject): any {
        return true;
    }

    // Update the grid size on initialize of data source
    public initializeDataSource() {
        super.initializeDataSource();
        this.updateUserGridSize();
    }

    /// <summary>Always show everything, without this line the initial load will only show 5, because this function in VSS.UI.Controls.Grids.js will end up
    /// calculating the visible size based on the canvas height which happens to be 0. It calculates the number of visible rows as 2
    /// then adds 3 for buffer. Once 5 is loaded the rest of the data can't be viewed until the data is reloaded (most likely due to caching)</summary>
    public _getVisibleRowIndices(): {
        first: number;
        last: number;
    } {
        var last = 0;
        if (this._originalData) {
            last = this._originalData.length;
        }
        return { first: 0, last: last };
    }

    public showDialogCallbackOnEnterKey(dialogType: any, params?: any) {
        return function (e?: JQueryEventObject) {
            if (e && e.keyCode == TFS_UI.KeyCode.ENTER) {
                // wrap whatever data you need into options
                for (var param in params) {
                    e.data.that._options[param] = params[param];
                }

                Dialogs.show(dialogType, e.data.that._options);
            }
        }
    }

    public showDialogCallbackGenerator(dialogType: any, params?: any) {
        return function (e?: JQueryEventObject) {
            // wrap whatever data you need into options
            for (var param in params) {
                e.data.that._options[param] = params[param];
            }

            Dialogs.show(dialogType, e.data.that._options);
        }
    }

    /// <summary>Recalculates the row positions
    /// This is necessary because the row height can change when showing the secret value and the row position is calculated and coded into the css</summary>
    public recalculateRowPositions() {
        // determine the height of each row
        var offset = 0;
        this._canvas.children(".grid-row").each(function (index: any, elem: Element) {
            $(this).css("top", offset + "px");
            offset += $(this).outerHeight(true);
        });

        // unbound height of the whole grid
        $(".rightPane > .grid-canvas, .rightPane > .grid-canvas.grid-content-spacer, .rightPane .grid, .tokens-container, .key-container").css("height", this.getGridHeight());
    }

    /// <summary>Determines the height of the grid from its children</summary>
    public getGridHeight() {
        var totalHeight = 100;
        this._canvas.children(".grid-row").each(function () {
            totalHeight += $(this).outerHeight(true);
        });

        return totalHeight;
    }

    /// <summary>Number of rows in the grid</summary>
    public length() {
        return this._originalData.length;
    }

    /// <summary>Redraws the grid</summary>
    public updateUserGridSize() {
        this._onContainerResize(null);
    }

    /// <summary>Refreshes the grid data and redraws the grid</summary>
    public refresh() {
        this.updateUserGridSize();
        this.recalculateRowPositions();
    }

    public _onColumnResize(column: any) {
        super._onColumnResize(column);
        this.updateUserGridSize();
    }

    public _onColumnMove(sourceIndex: any, targetIndex: any) {
        super._onColumnMove(sourceIndex, targetIndex);
        this.updateUserGridSize();
    }

    public _redraw(includeNonDirtyRows?: boolean) {
        super._redraw(includeNonDirtyRows);
        this.recalculateRowPositions();
    }

    /// <summary>This method is called whenever the container is resized</summary>
    public _onContainerResize(e?: JQueryEventObject): any {
        if (!FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PATPaginationAndFiltering, false)) {
            this._element.find('.rightPane .grid-canvas').css('overflow-x', 'auto');
        }
        super._onContainerResize(e);

        // Add horizontal scroll only when row width is greater than container width after grid-row resize
        // Otherwise horizontal scroll bar will appear and disappear as the grid-row width changes
        var gridRow = this._canvas.find(".grid-row");
        if (gridRow && (gridRow.width() > Math.ceil(this._canvasWidth))) {
            this._canvas.css('overflow-x', 'auto');
        }
        else {
            this._canvas.css('overflow-x', 'hidden');
        }

        // remove the height of the grid elements
        gridRow.css("height", "");

        this.recalculateRowPositions();
    }
}

TFS.initClassPrototype(SecurityGrid, {
    _originalData: null,
    _previousWindowHeight: 0,
    _minHeight: 0,
    _maxHeight: 0,
    _openPanel: null,
    _panelHeight: 0
});

TFS.classExtend(SecurityGrid, TFS_Host.TfsContext.ControlExtensions);

export class SecurityDialogOptions {
    public title: string;
    public dialogClass: string;
    public successButtonText: string;
    public cancelButtonText: string;
}

export class SecurityDialog extends Dialogs.ModalDialog {
    private _cancelButton: any;
    private _confirmButton: any;
    public params: SecurityDialogOptions;
    public args: any;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 450,
            minWidth: 450,
            height: 300,
            resizable: false,
            hasProgressElement: false,
            allowMultiSelect: false,
            modal: true,
            title: options.params.title
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

        var wrapper = $("<div />").addClass(this.params.dialogClass).html(this.getMessage(this.args));
        this.getElement().append(wrapper);
        this._initializeButtons();
        this.getElement().height("auto");

        $("#dialog-success-button").focus();
    }

    public getMessage(args: any): string {
        return "";
    }

    private onSuccessProxy(that: any, thatDialog: SecurityDialog) {
        thatDialog.onSuccess(thatDialog.args, that, thatDialog);
    }

    public onSuccess(args: any, that: any, thatDialog: SecurityDialog) {
        // to be overridden
    }

    /// <summary>Initializes buttons</summary>
    private _initializeButtons() {
        var that = this;

        this._confirmButton = {
            id: 'dialog-success-button',
            text: this.params.successButtonText,
            click: function () {
                that.onSuccessProxy(this, that);
            }
        };

        this._cancelButton = {
            id: 'dialog-cancel-button',
            text: this.params.cancelButtonText,
            click: function () {
                $(this).dialog('close');
            }
        };

        this._element.dialog('option', 'buttons', [this._confirmButton, this._cancelButton]);
    }
}

TFS.initClassPrototype(SecurityDialog, {
    _cancelButton: null,
    _confirmButton: null
});

TFS.classExtend(SecurityDialog, TFS_Host.TfsContext.ControlExtensions);

/// <summary>Helper functions for setting and clearing the common message area message</summary>
export module MessageAreaHelper {
    export function SetMessageAreaMessage(text: string) {
        var messageAreaContainer = $('#commonMessage');
        messageAreaContainer.attr('role', 'alert');
        messageAreaContainer.text(text);
        messageAreaContainer.show();
        Events_Services.getService().fire("tfs-update-messageArea", null, null);
    }

    export function SetMessageAreaHtmlMessage(htmlMessage: string) {
        var messageAreaContainer = $('#commonMessage');
        messageAreaContainer.attr('role', 'alert');
        messageAreaContainer.html(htmlMessage).wrap('<pre />');
        messageAreaContainer.show();
        Events_Services.getService().fire("tfs-update-messageArea", null, null);
    }

    export function ClearMessageAreaMessage() {
        var messageAreaContainer = $('#commonMessage');
        messageAreaContainer.text("");
        messageAreaContainer.hide();
        Events_Services.getService().fire("tfs-update-messageArea", null, null);
    }
}

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Security.Common.Controls", exports);

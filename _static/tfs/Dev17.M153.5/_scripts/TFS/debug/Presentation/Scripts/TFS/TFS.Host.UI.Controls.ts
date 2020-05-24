//Auto converted from Presentation/Scripts/TFS/TFS.Host.UI.AccountHomeView.debug.js

/// <reference types="jquery" />
 


import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Html = require("VSS/Utils/Html");
import Menus = require("VSS/Controls/Menus");
import TFSHOSTUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Diag = require("VSS/Diag");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Telemetry = require("VSS/Telemetry/Services");

var delegate = Utils_Core.delegate;
export var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class GridListControl extends Controls.BaseControl {
    private _outerContainer: JQuery;
    private _titleContainer: JQuery;
    private _buttonContainer: JQuery;
    public template: string;

    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this.template = this._getTemplate();
    }

    public render(): void {
        /// <summary>Renders the containers for the control.</summary>   
        this._outerContainer = $('<ul class="grid-list"></ul>').appendTo(this.getElement());
        this._titleContainer = $('<li class="grid-cell-title"></li>').appendTo(this._outerContainer);        
    }

    public addGridControlTitle(title: string): JQuery {
        /// <summary>Add title to the grid control.</summary>
        /// <param name="title">Title for the grid control.</param>
        $('<span class="cell-title" />').html(title)
          .appendTo(this._titleContainer);
        return this._titleContainer;
    }

    public addCloseButtonToGridHeader(iconTitle: string, onCloseCallback: any, iconClass: string = "icon-close-small"): JQuery {
        /// <summary>Add close/hide icon to the grid control.</summary>
        /// <param name="iconTitle">Title for the close button.</param>
        /// <param name="iconClass">Class that specifies what icon is to be used for the close button.</param>
        var $closeIcon = $('<span class="icon close-icon ' + iconClass + '" title="' + iconTitle + '"></span>')
            .appendTo(this._titleContainer)
            .click(onCloseCallback);

        Utils_UI.accessible($closeIcon);

        return this._titleContainer;
    }

    public addContextButtons(buttons: GridListContextButton[]): JQuery[] {
        /// <summary>Add buttons to the grid list control context menu.</summary>
        /// <param name="buttons">Buttons for the list control context menu.</param>
        var elements: JQuery[] = [];
        if (!buttons) {
            return elements;
        }

        $.each(buttons, (i, button: GridListContextButton) => {
            elements.push(this.addContextButton(button));
        });

        return elements;
    }
    
    public addActionLinkToGridHeader(actionTitle: string, actionClass: string, linkUrl: string, telemetryEventData?: Telemetry.TelemetryEventData, id?: string): JQuery {
        /// <summary>Add action title to the grid control.</summary>
        /// <param name="actiontitle">Action Title for the grid control.<summary>
        /// <param name="linkUrl">URL to open.<summary>
        /// <param name="telemetryEventData">Data for a single telemetry event.<summary>
        /// <param name="id">The id of the html element for the link.<summary>
        var actionLink = $('<a href class="actionlink ' + actionClass + '" />')
          .attr("target", "_blank").attr("href", linkUrl).text(actionTitle)
          .appendTo(this._titleContainer);

        if (id)
            actionLink.attr("id", id);

        if (telemetryEventData)
        {
            actionLink.click(() => {
                Telemetry.publishEvent(telemetryEventData);
            });
        }
        
        return this._titleContainer;
    }

    public addContextButton(button: GridListContextButton): JQuery {
        this._buttonContainer = $('<li class="context-button-container"></li>').appendTo(this._outerContainer);
        var contextButton = $('<a href="#" class="context-button"></a>').appendTo(this._buttonContainer)
            .attr("title", button.title)
            .html(button.text)
            .addClass(this._getClassFromArray(button.classNames));
        if (button.id)
            contextButton.attr("id", button.id);
        return contextButton
    }

    private _getClassFromArray(classes: string[]): string {
        if (!classes) {
            return;
        }

        var str = '';
        $.each(classes, (i, className: string) => {
            str += className + " ";
        });

        return str.trim();
    }

    public addListItems(items: GridListItem[]): JQuery[] {
        var elements: JQuery[] = [];
        if (!items) {
            return elements;
        }
        this._element.find(".no-item-message").remove();
        $.each(items, (i, item: GridListItem) => {
            elements.push(this.addListItem(item));
        });

        return elements;
    }

    public addHtmlListItem(html: string): JQuery {
        return this._addItem('<li class="grid-cell-item">' + html + '</li>');
    }

    public addListItem(item: GridListItem): JQuery {
        var html = Utils_Html.TemplateEngine.tmpl(this.template, item);
        return this._addItem(html);
    }

    public addNoItemMessage(message: string) {
        var element = $("<div>").addClass("no-item-message").text(message);
        $(this._outerContainer).append(element);
        return element;
    }

    public addNoItemMessageHtml(htmlMessage: string) {
        /// <summary>Add no item message with embedded HTML allowed.</summary>
        /// <param name="htmlMessage">No item message.</param>

        var element = $("<div>").addClass("no-item-message").html(htmlMessage);
        $(this._outerContainer).append(element);
        return element;
    }

    public ItemCount(): number {
        return this._element.find(".grid-cell-item").length;
    }

    private _addItem(html: string): JQuery {
        var element = $(html);
        this._element.find(".no-item-message").remove();
        $(this._outerContainer).append(element);
        return element;
    }

    private _getTemplate() {
        return '<li class="grid-cell-item">' +
            '<a href="${url}" class="icon-container" tabindex="-1">' +
            '<span class="icon ${icon}" alt="${iconTitle}"></span>' +
            '</a>' +
            '<span class="grid-cell-item-text">' +
            '<span>' +
            '<div class="grid-cell-item-title">' +
            '<a id="${id}" href="${url}" title="${title}" style="display:block">${title}</a>' +
            '</div> ' +
            '<span class="${hoverIcon}" title="${hoverIconTitle}"></span>' +
            '<span class="grid-cell-item-subTitle">${subTitle}</span>' +
            '</span>' +
            '</span>' +
            '</li>';
    }

    public getLastAccessedFriendly(lastAccessed: string) {
        return lastAccessed === null ? '' : Utils_Date.friendly(new Date(lastAccessed));
    }
}

export class GridListItem {
    /// <summary>Represents an item in the grid list.</summary>
    public icon: string;
    public iconTitle: string;
    public title: string;
    public url: string;
    public subTitle: string;
    public hoverIcon: string;
    public hoverIconTitle: string;
    public id: string;

    constructor(icon: string, iconTitle: string, title: string, url: string, subTitle: string, hoverIcon: string, hoverIconTitle: string, id?: string) {
        /// <summary>Constructor for GridListItem.</summary>
        /// <param name="icon">The icon to be used for the grid list item.</param>
        /// <param name="iconTitle">The tooltip to be used for the icon.</param>
        /// <param name="title">The title of the item.</param>
        /// <param name="url">The url of the item.</param>
        /// <param name="subTitle">The subTitle of the item.</param>
        /// <param name="hoverIcon">The icon to be shown when the item is hovered on.</param>
        /// <param name="hoverIconTitle">The tooltip for the hover icon.</param>
        this.icon = icon;
        this.iconTitle = iconTitle;
        this.title = title;
        this.url = url;
        this.subTitle = subTitle;
        this.hoverIcon = hoverIcon;
        this.hoverIconTitle = hoverIconTitle;
        if (id)
            this.id = id;
    }
}

export class GridListContextButton {
    /// <summary>The button to be used in the context menu of the grid list control.</summary>

    public text: string;
    public title: string;
    public classNames: string[];
    public id: string;
    constructor(text: string, title: string, classNames: string[], id?: string)
    /// <summary>Constructor for GridListContextButton</summary>
    /// <param name="text">The text to be shown for the button.</param>
    /// <param name="title">The tooltip to be used for the button.</param>
    /// <param name="classNames">The classes to be applied to the button.</param>
    {
        this.text = text;
        this.title = title;
        this.classNames = classNames;
        if (id)
            this.id = id;
    }
}

export class HorizontalGridControl extends Controls.BaseControl {
    private _outerContainer: JQuery;
    private _titleContainer: JQuery;
    private _outerTable: JQuery;
    private _outerTableRow: JQuery;
    public template: string;

    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this.template = this._getTemplate();
    }

    public render(): void {
        /// <summary>Renders the containers for the control.</summary>   
        this._outerContainer = $('<ul class="grid-list"></ul>').appendTo(this.getElement());
        this._titleContainer = $('<li class="grid-cell-title"></li>').appendTo(this._outerContainer);
        this._outerTable = $('<table class="hgrid-table"></table>').appendTo(this._outerContainer);
        this._outerTableRow = $('<tr class="hgrid-row"></tr>').appendTo(this._outerTable);
    }
    
    public addGridControlTitle(title: string): JQuery {
        /// <summary>Add title to the grid control.</summary>
        /// <param name="title">Title for the grid control.<summary>
        $('<span class="cell-title" />').html(title)
          .appendTo(this._titleContainer);
        return this._titleContainer;
    }

    public addCloseButtonToGridHeader(iconTitle: string, onCloseCallback: any, iconClass: string = "icon-close-small"): JQuery {
        /// <summary>Add close/hide icon to the grid control.</summary>
        /// <param name="iconTitle">Title for the close button.</param>
        /// <param name="iconClass">Class that specifies what icon is to be used for the close button.</param>
        var $closeIcon = $('<span class="icon close-icon ' + iconClass + '" title="' + iconTitle + '"></span>')
            .appendTo(this._titleContainer)
            .click(onCloseCallback);

        Utils_UI.accessible($closeIcon);

        return this._titleContainer;
    }

    public addActionLinkToGridHeader(actionTitle: string, actionClass: string, onCloseCallback: any, id?: string): JQuery {
        /// <summary>Add action title to the grid control.</summary>
        /// <param name="actiontitle">Action Title for the grid control.</param>
        if (id) {
            $('<a id="' + id + '"href class="actionlink ' + actionClass + '"><span>' + actionTitle + '</span></a>')
                .appendTo(this._titleContainer).click(delegate(this, onCloseCallback));
        }
        else {
            $('<a href class="actionlink ' + actionClass + '"><span>' + actionTitle + '</span></a>')
                .appendTo(this._titleContainer).click(delegate(this, onCloseCallback));
        }
        return this._titleContainer;
    }

    public addListItem(item: HorizontalGridListItem): JQuery {
        var html = Utils_Html.TemplateEngine.tmpl(this.template, item);
        var element = $(html);
        $(this._outerTableRow).append(element);
        return element;
    }

    public addGenericItem(className: string): JQuery {
        var $td = $(Utils_UI.domElem('td', 'hgrid-cell-item')).appendTo(this._outerTableRow).addClass(className);
        return $td;
    }

    private _getTemplate() {
        return '<td class="hgrid-cell-item">' +
            '<div class="grid-cell-bgfill ${tileBgColorClass}">' +
            '<a id="${id}" href="${url}" title="{{html tooltip}}" target="_blank">' + 
            '<div class="grid-cell-content">' +
            '<span class="grid-cell-item-title">${title}</span>' +
            '<span class="grid-cell-item-subTitle">${subTitle}</span>' +
            '</div>' +
            '<span class="icon ${icon}"></span>' +
            '</a>' +
            '</div>' +
            '</td>';
    }
}

export class HorizontalGridListItem {
    /// <summary>Represents an item in the horizontal grid list.</summary>
    public icon: string;
    public title: string;
    public url: string;
    public subTitle: string;
    public tileBgColorClass: string;
    public tooltip: string;
    public id: string;

    constructor(icon: string, title: string, url: string, subTitle: string, tooltip: string, tileBgColorClass ?: string, id?: string) {
        /// <summary>Constructor for GridListItem.</summary>
        /// <param name="icon">The icon to be used for the grid list item.</param>        
        /// <param name="title">The title of the item.</param>
        /// <param name="url">The url of the item.</param>
        /// <param name="subTitle">The subTitle of the item.</param>     
        /// <param name="id">The id of the item.>/param>       
        this.icon = icon;
        this.title = title;
        this.url = url;
        this.subTitle = subTitle;
        this.tooltip = tooltip;

        if (id)
            this.id = id;

        if (tileBgColorClass != null) {
            this.tileBgColorClass = tileBgColorClass;
        }
        else {
            this.tileBgColorClass = "DefaultTileClass";
        }
    }
}

export class GridTile extends Controls.BaseControl {
    private _tileData: TileData;
    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._tileData = this._options.tileData;
    }

    public render() {
    }
}

export class TileData {
    private title: string;
    private subTitle: string;
    private data: string;
    private tileClasses: string[];
    constructor(title: string, subTitle: string, data: string, tileClasses: string[]) {
        this.title = title;
        this.subTitle = subTitle;
        this.data = data;
        this.tileClasses = tileClasses;
    }
}

export class SimpleListControl extends Controls.BaseControl {
    private _outerContainer: JQuery;
    private _titleContainer: JQuery;  
    public template: string;

    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
        this.template = this._getTemplate();
    }

    public render(): void {
        /// <summary>Renders the containers for the control.</summary>   
        this._outerContainer = $('<ul class="grid-list"></ul>').appendTo(this.getElement());
        this._titleContainer = $('<li class="grid-cell-title"></li>').appendTo(this._outerContainer);
    }

    public addGridControlTitle(title: string): JQuery {
        /// <summary>Add title to the grid control.</summary>
        /// <param name="title">Title for the grid control.</param>
        $('<span class="cell-title" />').html(title)
          .appendTo(this._titleContainer);
        return this._titleContainer;
    }
   
    public addSimpleListItem(item: SimpleListItem): JQuery {       
        var html = Utils_Html.TemplateEngine.tmpl(this.template, item);
        var element = $(html);       
        $(this._outerContainer).append(element);
        return element;       
    }   

    private _getTemplate() {
        return '<li class="grid-cell-item simplelist">' +            
            '<span class="simple-list-item-text"><span>' +
            '<span class="grid-cell-item-title">' +
            '<a href="${url}" title="${title}" target="${target}" id="${id}">${title}</a>' +
            '</span>' +            
            '</li>';
    }

    public addActionLinkToGridHeader(actionTitle: string, actionClass: string, iconClass: string, onCallback: any): JQuery {
        /// <summary>Add action title to the grid control.</summary>
        /// <param name="actiontitle">Action Title for the grid control.</param>
        /// <param name="actionClass">Class name for the action</param>
        /// <param name="iconClass">Class for the icon to be loaded</param>
        /// <param name="onCallback">Callback method</param>

        var icon;
        if (iconClass != '') {
            icon = '<span class="icon ' + iconClass + '" />';
        }

        $('<a href class="actionlink ' + actionClass + '"><span>' + actionTitle + '</span></a>').append(icon)
            .appendTo(this._titleContainer).click(delegate(this, onCallback));

        return this._titleContainer;
    }
}

export class SimpleListItem {
    /// <summary>Represents an item in the grid list.</summary>
    public title: string;
    public url: string;
    public target: string;
    public id: string;
   
    constructor(title: string, url: string, target: string, id?: string) {
        /// <summary>Constructor for GridListItem.</summary>        
        /// <param name="title">The title of the item.</param>
        /// <param name="url">The url of the item.</param>   
        if (id)
            this.id = id;     
        this.title = title;
        this.url = url;
        this.target = target;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Host.UI.Controls", exports);

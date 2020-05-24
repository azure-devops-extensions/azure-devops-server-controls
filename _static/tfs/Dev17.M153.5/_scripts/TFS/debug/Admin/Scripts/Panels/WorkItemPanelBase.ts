import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Panels = require("VSS/Controls/Panels");

export interface IWorkItemPanelBaseOptions extends Panels.IAjaxPanelOptions {
    className?: string;
    headerHtml?: string;
    headerTooltip?: string;
}

/**
 *  Base work item panel
 */
export abstract class WorkItemPanelBase<TOptions extends IWorkItemPanelBaseOptions> extends Panels.AjaxPanelO<TOptions> {

    public static BASE_PANEL_CLASS_NAME: string = "work-item-panel";

    protected _errorMessageArea: Notifications.MessageAreaControl;
    protected _warningMessageArea: Notifications.MessageAreaControl;
    protected _infoMessageArea: Notifications.MessageAreaControl;

    protected _toolBar: Menus.MenuBar;
    protected _$headerElement: JQuery;
    protected _$contentContainerElement: JQuery;

    constructor(options?: TOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var $thisElement = this.getElement().addClass(WorkItemPanelBase.BASE_PANEL_CLASS_NAME);

        this._$headerElement = $('<div class="process-grid-view-header bowtie">').appendTo($thisElement);
        this._setHeader(this._options.headerHtml, this._options.headerTooltip);

        this._createContainer($thisElement);
        this._errorMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
            Notifications.MessageAreaControl, this._$contentContainerElement, <Notifications.IMessageAreaControlOptions>{
                type: Notifications.MessageAreaType.Error,
                showIcon: true
            });
        this._infoMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
            Notifications.MessageAreaControl, this._$contentContainerElement, <Notifications.IMessageAreaControlOptions>{
                type: Notifications.MessageAreaType.Info,
                showIcon: true
            });
        this._warningMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
            Notifications.MessageAreaControl, this._$contentContainerElement, <Notifications.IMessageAreaControlOptions>{
                type: Notifications.MessageAreaType.Warning,
                showIcon: true
            });
    }

    protected _addToolbar(items: Menus.IMenuItemSpec[]) {
        var toolBarDiv = $('<div class="toolbar process-admin-wit-toolbar">')
            .insertBefore(this._$contentContainerElement);

        this._toolBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolBarDiv, { items: items });
    }

    protected _setHeader(headerHtml: string, tooltip: string, trimLearnMoreAnchorFromTooltip: boolean = false) {
        this._$headerElement.html(headerHtml)
            .attr("title", trimLearnMoreAnchorFromTooltip ? tooltip.replace(/<a[^>]+>Learn more\.?<\/a>\.?$/, '').trim() : tooltip);
    }

    protected _clearContent() {
        this._$contentContainerElement.children().not('.message-area-control').remove();
    }

    /**
     * Adds a container for fields
     * @param $element
     */
    private _createContainer($element: JQuery) {
        this._$contentContainerElement = $('<div class="work-item-panel-container bowtie">')
            .addClass(this._options.className);
        $element.append(this._$contentContainerElement);
    }
}

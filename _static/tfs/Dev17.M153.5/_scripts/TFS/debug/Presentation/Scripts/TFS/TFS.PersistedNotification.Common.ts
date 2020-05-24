import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import PersistedNotificationConstants = require("Presentation/Scripts/TFS/Generated/TFS.PersistedNotification.Constants");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Html = require("VSS/Utils/Html");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;

export class PersistedNotificationResult {
    private _notification: PersistedNotificationConstants.Notification;
    private _iconCss: string;
    private _backgroundCss: string;

    constructor(notification: PersistedNotificationConstants.Notification) {
        this._notification = notification;

        // TODO maolivo by 6/22/2014 - Fix createdTime rest return result so it either correctly typecasts to a Date object
        //      or it simply always returns a string of a Date and we convert it on the UI end
        this._notification.createdTime = new Date(this._notification.createdTime.toString());

        this._setCSSClassesByType();
    }

    public getActionUrl() {
        return this._notification.actionUrl;
    }

    public getCategory() {
        return this._notification.category;
    }

    public getCreatedTime() {
        return this._notification.createdTime;
    }

    public getId() : number {
        return this._notification.id;
    }

    public getTemplateData() {
        return {
            content: this._notification.content,
            timestamp: this._getDisplayTextForTimestamp(),
            iconCss: this._iconCss,
            backgroundCss: this._backgroundCss
        };
    }

    private _setCSSClassesByType() {
        if (this._notification.category === "WorkItem") {
            this._iconCss = "notification-work-item-icon";
            this._backgroundCss = "notification-work-item-background";
        } else if (this._notification.category === "PullRequest") {
            this._iconCss = "notification-pull-request-icon";
            this._backgroundCss = "notification-pull-request-background";
        } else if (this._notification.category === "TeamRoom") {
            this._iconCss = "notification-team-room-icon";
            this._backgroundCss = "notification-team-room-background";
        }
    }
    
    private _getDisplayTextForTimestamp() {
        var createdTime: Date = this._notification.createdTime;
        var currentTime: Date = Utils_Date.getNowInUserTimeZone();

        return Utils_Date.ago(createdTime, currentTime);
    }
}

export class PopupMenu extends Controls.BaseControl {
    private CLICK_EVENT_NAMESPACE: string = "click.popupmenu";
    private HOVER_CLASS: string = "hover";

    private _$mainContainer: JQuery;
    private _$otherMenus: JQuery;
    private _$iconArea: JQuery;
    private _$popupArea: JQuery;

    private _isShown: boolean = false;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._$mainContainer = $(".main-container");
        this._$otherMenus = $(".menu-item");

        this._$iconArea = $(domElem("li", "menu-item popup-menu-icon-area"))
            .appendTo(this._element)
            .click(delegate(this, this._onIconClick))
            .hover(delegate(this, this._onHoverEnter), delegate(this, this._onHoverLeave))

        this._$popupArea = $(domElem("div", "menu sub-menu"))
            .appendTo(this._element);

        Diag.logTracePoint("PopupMenu.ctor.complete");
    }

    // Public Methods

    public getIconArea(): JQuery {
        return this._$iconArea;
    }

    public getPopupArea(): JQuery {
        return this._$popupArea;
    }

    public isPopupShown(): boolean {
        return this._isShown;
    }

    // Public Overriden Methods

    public onIconHoverEntered() {

    }

    public onIconClicked() {

    }

    public onPopupShown() {

    }

    public onPopupHidden() {

    }

    // Private Methods

    private _showPopup() {
        this.getPopupArea().on(this.CLICK_EVENT_NAMESPACE, delegate(this, this._onPopupClick));

        this._$mainContainer.on(this.CLICK_EVENT_NAMESPACE, delegate(this, this._onDocumentClick));
        this._$otherMenus.on(this.CLICK_EVENT_NAMESPACE, delegate(this, this._onDocumentClick));

        var popupSize = this.getPopupArea().width();
        var iconRightPosition = Math.floor(this.getIconArea().offset().left + this.getIconArea().outerWidth());
        this.getPopupArea().css("left", iconRightPosition - popupSize);

        this._isShown = true;

        this.onPopupShown();
    }

    private _hidePopup() {
        this.getPopupArea().off(this.CLICK_EVENT_NAMESPACE);

        this._$mainContainer.off(this.CLICK_EVENT_NAMESPACE);
        this._$otherMenus.off(this.CLICK_EVENT_NAMESPACE);

        this._isShown = false;

        this.onPopupHidden();
    }

    // Event Methods

    private _onHoverEnter() {
        this.getIconArea().addClass(this.HOVER_CLASS);

        this.onIconHoverEntered();
    }

    private _onHoverLeave() {
        if (!this.isPopupShown()) {
            this.getIconArea().removeClass(this.HOVER_CLASS);
        }
    }

    private _onIconClick(e: Event) {
        this.onIconClicked();

        if (!this.isPopupShown()) {
            this._showPopup();
        }
        else {
            this._hidePopup();
        }

        e.stopPropagation();
    }

    private _onDocumentClick() {
        if (this.isPopupShown()) {
            this._hidePopup();
            this.getIconArea().removeClass(this.HOVER_CLASS);
        }
    }

    private _onPopupClick(e: Event) {
        e.stopPropagation();
    }
}

import Q = require("q");
import { BaseControl } from "VSS/Controls";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { initClassPrototype } from "VSS/VSS";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemFormBase, IBaseWorkItemFormOptions, IWorkItemViewBase } from "WorkItemTracking/Scripts/Controls/WorkItemFormBase";
import { WorkItemToolbar } from "WorkItemTracking/Scripts/Controls/WorkItemToolbar";
import { WorkItemInfoBar } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemInfoBar";
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import { delay } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as WorkItemTypeColorAndIconUtils from "WorkItemTracking/Scripts/Utils/WorkItemTypeColorAndIconUtils";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";

interface IWorkItemFormNotificationOptions {
    /**
     * Used to specify the icon class that will be added to the notification message
     */
    notificationIconClass: string;
}

/**
 * Utility to show notification message on old/new WIT forms in popup
 */
class WorkItemFormNotification {

    /* Note that below selectors are used to calculate position of popup on the old/new forms.
     * It's important to make these in sync with form layouts
     */
    private static NEW_FORM_HEADER = ".witform-layout-content-container:visible .work-item-form-main-header";
    private static OLD_FORM_VIEW = ".work-item-view:visible";

    /**
     * shows the given message on WIT form
     *
     * @param content message to show
     */
    public static showNotificationMessage(content: string, options?: IWorkItemFormNotificationOptions) {
        // delay execute to ensure WIT form is fully populated
        delay(this, 10, () => {
            WorkItemFormNotification.removeNotificationMessage();
            this._showNotificationMessageInternal(content, options);
        });
    }

    /**
     * removes notification message from DOM
     */
    public static removeNotificationMessage() {
        const $notification = $(".work-item-form-notification");
        if ($notification && $notification.length > 0) {
            $notification.remove();
        }
    }

    /**
     * show notification message on WIT form under tool bar area
     *
     * @param workItem instance of a work item object
     */
    private static _showNotificationMessageInternal(content: string, options?: IWorkItemFormNotificationOptions) {
        let $container: JQuery;
        let top = 0;
        let right: number;
        $container = $(WorkItemFormNotification.NEW_FORM_HEADER);
        top = $container.outerHeight();
        right = 10;

        if ($container && $container.length >= 1) {
            const $icon = $("<div/>").addClass("bowtie-icon bowtie-edit-delete close-action");
            const $content = $("<div />").addClass("work-item-form-notification")
                .html(content)
                .append($icon)
                .click(() => {
                    $content.remove();
                });

            if (options && options.notificationIconClass) {
                const $followsIcon = $("<span/>").addClass(options.notificationIconClass);
                $content.append($followsIcon);
            }

            $content.css({ top: top, right: right });
            $content.appendTo($container[$container.length - 1]);
        }
    }
}

export interface IWorkItemView extends IWorkItemViewBase {
    getToolbar(toolbarOptions: any): WorkItemToolbar;
}

export interface IWorkItemFormDialogOptions {
    toggleFullScreen?: () => void;
}

export interface IWorkItemFormOptions extends IBaseWorkItemFormOptions {
    headerToolbar?: WorkItemToolbar;
    infoBar?: any;
    toolbar?: any;
    beginSaveCallback?: IResultCallback;
    saveErrorCallback?: IResultCallback;
    dialogOptions?: IWorkItemFormDialogOptions;
}

export class WorkItemForm extends WorkItemFormBase {
    public static enhancementTypeName: string = "tfs.WorkItemForm";

    private _ownToolbar: boolean;
    private _ownHeaderToolbar: boolean;
    private _ownInfoBar: boolean;
    private _newFormLinksCountTab: JQuery;
    private _newFormAttachmentsCountTab: JQuery;

    public toolbar: WorkItemToolbar;
    public headerToolbar: WorkItemToolbar;
    public infoBar: WorkItemInfoBar;
    public currentView: IWorkItemView;
    public _options: IWorkItemFormOptions;

    public initialize() {
        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMFORM_INITIALIZE, true);

        if (this._options.headerToolbar) {
            if (this._options.headerToolbar instanceof WorkItemToolbar) {
                this.headerToolbar = this._options.headerToolbar;
                this._element.addClass("no-headertoolbar");
            } else {
                this.headerToolbar = <WorkItemToolbar>BaseControl.createIn(WorkItemToolbar, this._element, $.extend(this._options.headerToolbar
                    , { contributionIds: [] }));

                this._ownHeaderToolbar = true;
                this._hideHeaderToolbar();
            }
            this.headerToolbar.getElement().addClass("workitem-header-toolbar");
        } else {
            this._element.addClass("no-headertoolbar");
        }

        if (this._options.infoBar) {
            if (this._options.infoBar instanceof WorkItemInfoBar) {
                this.infoBar = this._options.infoBar;
                this._element.addClass("no-info-bar");
            } else {
                this.infoBar = <WorkItemInfoBar>BaseControl.createIn(WorkItemInfoBar, this._element, (<any>this._options.infoBar).options);
                this._ownInfoBar = true;
                this._hideInfoBar();
            }
        } else {
            this._element.addClass("no-info-bar");
        }

        this._wrapToolbarOptions();
        if (this._options.toolbar) {
            if (this._options.toolbar instanceof WorkItemToolbar) {
                this.toolbar = this._options.toolbar;
                this._element.addClass("no-toolbar");
            }
        }

        if (!this._options.formViewType) {
            this._options.formViewType = WorkItemFormView;
        }

        // Trapping ALT + Key field shortcut for publishing CI event
        this._element.keydown((e: JQueryEventObject) => {
            if (e.altKey && e.keyCode !== 18) {
                WIFormCIDataHelper.fieldKeyboardShortcutPressed(String.fromCharCode(e.keyCode));
            }
        });

        super.initialize();

        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.WORKITEMFORM_INITIALIZE, false);
    }

    public createDropTargetContainer(): HTMLElement {
        const dropTargetContainer = document.createElement("div");
        dropTargetContainer.classList.add("drop-target-container", "absolute-fill");
        dropTargetContainer.setAttribute("aria-hidden", "true");
        this._element.append(dropTargetContainer);
        return dropTargetContainer;
    }

    public initializeOptions(options?: IWorkItemFormOptions) {
        super.initializeOptions($.extend({
            infoBar: true,
            toolbar: {
                inline: true
            }
        }, options));
    }

    public _dispose() {
        if (this._options) {
            this._options = null;
        }

        if (this._newFormLinksCountTab) {
            this._newFormLinksCountTab = null;
        }

        if (this._newFormAttachmentsCountTab) {
            this._newFormAttachmentsCountTab = null;
        }

        if (this._ownHeaderToolbar && this.headerToolbar) {
            this.headerToolbar.dispose();
            this.headerToolbar = null;
        }
        if (this._ownInfoBar && this.infoBar) {
            this.infoBar.dispose();
            this.infoBar = null;
        }
        if (this._ownToolbar && this.toolbar) {
            this.toolbar.dispose();
            this.toolbar = null;
        }

        super._dispose();
    }

    public getDialogOptions(): IWorkItemFormDialogOptions {
        if (this._options) {
            return this._options.dialogOptions;
        }
        return null;
    }

    protected onBind(workItem: WorkItem) {
        if (this.isDisposed()) {
            return;
        }
        this._resetCountingTabs();

        if (this._options.toolbar && !(this._options.toolbar instanceof WorkItemToolbar)) {
            this.toolbar = this.currentView.getToolbar(this._options.toolbar);
            this._ownToolbar = true;
        } else {
            this._element.addClass("no-toolbar");
        }

        this._showInfoBar();
        if (this.infoBar) {
            this.infoBar.bind(workItem);
        }

        this._showToolbar();
        if (this.toolbar) {
            this.toolbar.bind(workItem);
        }

        this._showHeaderToolbar();
        if (this.headerToolbar) {
            this.headerToolbar.bind(workItem);
        }

        const color = WorkItemTypeColorAndIconUtils.getWorkItemTypeColor(workItem.workItemType);
        if (color) {
            this._applyBorderColor(color);
        } else {
            WorkItemTypeColorAndIconUtils.beginGetWorkItemTypeColor(workItem.workItemType).then(
                value => {
                    if (!this.isDisposed()) {
                        this._applyBorderColor(value);
                    }
                },
                reason => {
                    if (!this.isDisposed()) {
                        this._applyBorderColor(WorkItemTypeColorAndIconUtils.DefaultColor);
                    }
                }
            );
        }

        this._getCountingTabs();
        this._onLinksChanged(workItem);
    }

    protected onUnbind() {
        if (this.infoBar) {
            this.infoBar.unbind();
        }

        if (this.toolbar) {
            this.toolbar.unbind();
        }
        if (this.headerToolbar) {
            this.headerToolbar.unbind();
        }
    }

    /**
     * Override
     */
    public showNotification(message: string, iconClasses?: string) {
        let options: IWorkItemFormNotificationOptions = null;

        if (iconClasses) {
            options = {
                notificationIconClass: iconClasses
            };
        }

        WorkItemFormNotification.showNotificationMessage(message, options);
    }

    /**
     * Override
     */
    public clearNotification() {
        WorkItemFormNotification.removeNotificationMessage();
    }

    public addAlertToInfobarError() {
        // Tells the infobar to add role=alert to the error text in the infobar next time it updates
        // This tells the screenreader to read the text
        this.infoBar.getElement().data("read-error-text", true);
    }

    public setHeaderToolbar(toolbar: WorkItemToolbar) {
        this.headerToolbar = toolbar;
        this._ownHeaderToolbar = true;
        this.headerToolbar._element.addClass("workitem-header-toolbar");
    }

    private _hideHeaderToolbar() {
        if (this._ownHeaderToolbar) {
            this.headerToolbar.hideElement();
        }
    }

    private _showHeaderToolbar() {
        if (this._ownHeaderToolbar) {
            this.headerToolbar.showElement();
        }
    }

    private _hideToolbar() {
        if (this._ownToolbar) {
            this.toolbar.hideElement();
        }
    }

    private _showToolbar() {
        if (this._ownToolbar) {
            this.toolbar.showElement();
        }
    }

    private _hideInfoBar() {
        if (this._ownInfoBar) {
            this.infoBar.hideElement();
        }
    }

    private _showInfoBar() {
        if (this._ownInfoBar) {
            this.infoBar.showElement();
        }
    }

    protected _clearCanvas() {
        super._clearCanvas();
        this._hideInfoBar();
        this._hideToolbar();
    }

    protected _applyBorderColor(color: string) {
        const formattedColor = color || "#fff";
        const element = this.getElement();
        if (element) {
            const headerElement = element.find(".work-item-form-main-header");
            headerElement.css("border-left-color", formattedColor);
        }
        if (this.infoBar) {
            this.infoBar.getElement().css("border-left-color", formattedColor);
        }
    }

    private _wrapToolbarOptions() {
        if (this._options.toolbar && !(this._options.toolbar instanceof WorkItemToolbar)) {
            const toolbarAsOptions: any = <{}>this._options.toolbar;

            const originalBeginSaveCallback = $.isFunction(this._options.beginSaveCallback) ?
                toolbarAsOptions.beginSaveCallback : _ => undefined;
            const originalSaveErrorCallback = $.isFunction(this._options.saveErrorCallback) ?
                toolbarAsOptions.saveErrorCallback : _ => undefined;

            toolbarAsOptions.beginSaveCallback = (closeOnSave: boolean) => {
                originalBeginSaveCallback();
                if (closeOnSave) {
                    // we don't need to update fields since we're closing
                    this.suppressFieldUpdates();
                }
            };
            toolbarAsOptions.saveErrorCallback = (closeOnSave: boolean) => {
                originalSaveErrorCallback(closeOnSave);
                this.suppressFieldUpdates(false);
            };
        }
    }

    private _resetCountingTabs() {
        this._getCountingTabs();
        this._newFormLinksCountTab.text("");
        this._newFormAttachmentsCountTab.text("");
    }

    private _getCountingTabs() {
        this._newFormLinksCountTab = this.getElement().find(".work-item-form-tab .link-count");
        this._newFormAttachmentsCountTab = this.getElement().find(".work-item-form-tab .attachment-count");
    }

    protected _onLinksChanged(workItem: WorkItem) {
        // This returns all links and attachments that have not been removed or deleted
        const links = workItem.getLinks();

        const attachmentsCount = links.filter((x) => { return Utils_String.ignoreCaseComparer(x.baseLinkType, "Attachment") === 0; }).length;
        const linksCount = links.length - attachmentsCount;
        this._resetCountingTabs();

        if (linksCount !== 0) {
            this._newFormLinksCountTab.text(Utils_String.format("  ({0})", linksCount));
        }

        if (attachmentsCount !== 0) {
            this._newFormAttachmentsCountTab.text(Utils_String.format("  ({0})", attachmentsCount));
        }
    }
}

initClassPrototype(WorkItemForm, {
    toolbar: null,
    _ownToolbar: false,
    infoBar: null,
    _ownInfoBar: false,
    headerToolbar: null,
    _ownHeaderToolbar: false
});

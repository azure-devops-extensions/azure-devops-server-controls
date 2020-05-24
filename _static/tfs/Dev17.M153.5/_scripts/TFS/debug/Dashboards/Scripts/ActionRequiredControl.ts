import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import Tfs_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Controls = require("VSS/Controls");
import Controls_Dialogs = require("VSS/Controls/Dialogs");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import {addTooltipIfOverflow} from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";

import { WidgetSizeConverter  } from "TFS/Dashboards/WidgetHelpers";
import { isEmbeddedPage } from "Dashboards/Scripts/Common.PageHelpers";

/*
 * Provides standard UI for an "action required" experience in Widgets.
 */
export class ActionRequiredControl<TOptions extends Dashboard_Shared_Contracts.IActionRequiredControlOptions> extends Controls.Control<TOptions> {
    public static DomClassTitle: string = "title-container";
    public static DomClassMessage: string = "widget-message-text";
    public static DomClassSubMessage: string = "widget-message-sub-text";
    public static DomClassLinkText: string = "link-text";
    public static DomClassLink: string = "action-required-link";
    public static DomClassOverlayImage: string = "bgImage";
    public static DomClassBodyContent: string = "content";

    public initializeOptions(options: TOptions): void {
        if (options == null) {
            throw new Error("Option required");
        }
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();        
        this.render();
    }

    /*
     * Render the Control. At this point no further behavior is driven by the control.
     */
    private render()
    {
        let $title = $("<h2>")
            .addClass(ActionRequiredControl.DomClassTitle)
            .text(this._options.titleName);

        addTooltipIfOverflow($title);
        
        var $message = $("<div>")
            .addClass(ActionRequiredControl.DomClassMessage)
            .text(this._options.message);

        if (this._options.subMessage) {
            var $subMessage = $("<div>")
                .addClass(ActionRequiredControl.DomClassSubMessage)
                .text(this._options.subMessage);
            $message.append($subMessage);
        }

        var $body = $("<div>")
            .addClass(ActionRequiredControl.DomClassBodyContent)
            .append($message);

        if (this._options.imageUrl) {
            var $image: JQuery;
            if (this._options.isImageOptionalBackground) {
                $image = $("<div>").css("background-image", Utils_String.format("url('{0}')", this._options.imageUrl));
            }
            else {
                $image = $("<img/>").attr("src", this._options.imageUrl);
            }
            $image.addClass(ActionRequiredControl.DomClassOverlayImage);
            $body.append($image);
        }

        if (this._options.clickHandler || this._options.linkUrl) {
            var $linkText = $("<span>")
                .addClass(ActionRequiredControl.DomClassLinkText)
                .text(this._options.linkText);

            $body.append($linkText);

            var $link = $("<a>")
                .addClass(ActionRequiredControl.DomClassLink)
                .attr("aria-label", this._options.ariaLabel)
                .append($title)
                .append($body);

            if (this._options.clickHandler) {
                $link.click(this._options.clickHandler)
                    .attr("tabindex","0")
                    .attr("role", "button");

                Utils_UI.accessible($link);
            }
            else {
                $link.attr("href", this._options.linkUrl);
                if (isEmbeddedPage()) {
                    $link.attr("target", "_blank");
                }
            }

            this.getElement().append($link);
        }   

        else {
            this.getElement()
                .addClass(ActionRequiredControl.DomClassLink)
                .append($title)
                .append($body);
        }  
    }
}

export interface IWidgetNotificationDialogOptions extends Controls_Dialogs.IModalDialogOptions {
    
    /**
    *  css class applied to the dialog
    */
    cssClass: string;

    /**
    * boolean denoting if the content is richtext or not
    */
    isRichText: boolean;

}

export const WidgetNotificationDialogFixedOptions = {
    useBowtieStyle: true,
    resizable: false,
    draggable: false,
    autoOpen: true,
    minWidth: 510,
    minHeight: 310
}

/**
* Renders an overlay over existing widget with a title, message, an image and a link in that order
* has the ability to show a modal dialog with more details
*/
export class WidgetNotification<TOptions extends Dashboard_Shared_Contracts.IWidgetNotificationOptions> extends ActionRequiredControl<TOptions> {
    public _dialogContainer: Controls_Dialogs.ModalDialog;
    public static WidgetNotificationCssClassName: string = "widget-notification";
   
    public initializeOptions(options: TOptions): void {
        var additionalCssClass = WidgetNotification.WidgetNotificationCssClassName + " rowspan-" + options.widgetSize.rowSpan + " colspan-" + options.widgetSize.columnSpan;
        if (options.cssClass) {
            options.cssClass += " " + additionalCssClass;
        } else {
            options.cssClass = additionalCssClass;
        }

        // If dialogOptions are provided then set the clickHandler such that a dialog with given options is opened on click
        if (options.dialogOptions) {
            options.clickHandler = (e) => {
                e.preventDefault();
                WidgetNotification.showDialog(options.dialogOptions);
                return false;
            }
        }
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        if (this._options.widgetSize != null) {
            this.getElement()
                .width(WidgetSizeConverter.ColumnsToPixelWidth(this._options.widgetSize.columnSpan))
                .height(WidgetSizeConverter.RowsToPixelHeight(this._options.widgetSize.rowSpan));
        }
    }
        
    public static getWidgetOverlay(): JQuery {
        return $('.ui-widget-overlay');
    }

    public static showDialog(dialogOptions: IWidgetNotificationDialogOptions): void {
        var dialogContainer = WidgetNotification.getNotificationDialog(dialogOptions);            
        //Soft dismiss on dialog
        WidgetNotification.getWidgetOverlay().click((e) => {
            WidgetNotification.softDismiss(e, dialogContainer);
        });
    }

    public static softDismiss(e: JQueryEventObject, dialogContainer: Controls_Dialogs.ModalDialog): void {
        var dialogContainerJQuery: JQuery = dialogContainer.getElement().closest('.ui-dialog');
        if (!dialogContainerJQuery.is(e.target) && dialogContainerJQuery.has(e.target).length == 0) {
            dialogContainer.close();
        }
    }

    public static getNotificationDialog(dialogOptions: IWidgetNotificationDialogOptions): Controls_Dialogs.ModalDialog {
        
        // If isRichText is set to true and content is not set, then set dialogOptions.content with html form of dialogOptions.contentText
        if (dialogOptions.isRichText && dialogOptions.contentText && dialogOptions.content == undefined) {
            //Content Parent - Acts as home for top level presentation including images
            dialogOptions.content = $("<div>"); 
            $("<div>").addClass("scrollzone").html(dialogOptions.contentText).appendTo(dialogOptions.content);
            dialogOptions.contentText = undefined;
        }
        
        // If height, width and cancelText are not provided, then set defaults
        if (!dialogOptions.width) {
            dialogOptions.width = WidgetNotificationDialogFixedOptions.minWidth;
        }
        if (!dialogOptions.height) {
            dialogOptions.height = WidgetNotificationDialogFixedOptions.minHeight;
        }
        if (!dialogOptions.cancelText) {
            dialogOptions.cancelText = TFS_Dashboards_Resources.WidgetNotificationDialogClose;
        }

        // Certain dialog options are overriden by the WidgetNotification control, no matter what the caller of WidgetNotification sets.
        $.extend(dialogOptions, WidgetNotificationDialogFixedOptions);

        // Create the dialog!!
        var dialog = <Controls_Dialogs.ModalDialog>Controls_Dialogs.ModalDialog.create(
            Controls_Dialogs.ModalDialog,
            dialogOptions
            );

        // Find the dialog container, add a class to it so that we can additional styles
        dialog.getElement().closest('.ui-dialog').addClass('widget-notification-dialog').addClass(dialogOptions.cssClass);

        return dialog;
    }
}


import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Notifications = require("VSS/Controls/Notifications");


export class DashboardMessageArea extends Notifications.MessageAreaControl {
    private static Dashboard_Message_Queue = "dashboard-msg-queue";
    private static Dashboard_Message_Clear = "dashboard-msg-clear";

    public constructor() {
        var options: Notifications.IMessageAreaControlOptions = {
            closeable: true,
            showIcon: true
        };

        super(options);
    }

    public initialize() {
        super.initialize();
        this._registerMessageListeners();
    }

    private _registerMessageListeners() {
        Events_Action.getService().registerActionWorker(DashboardMessageArea.Dashboard_Message_Queue, (actionArgs, next) => {
            this._updateNotificationText(actionArgs.message, actionArgs.messageType, actionArgs.isHtml);
        });

        Events_Action.getService().registerActionWorker(DashboardMessageArea.Dashboard_Message_Clear, (actionArgs, next) => {
            this.clear();
        });
    }

    private _updateNotificationText(message: string, messageType: Notifications.MessageAreaType, isTrustedHtml: boolean) {
        var $header = $("<div>");
        if (isTrustedHtml) {
            $header.html(message); //Supplied message is trusted from caller
        }
        else
        {
            $header.text(message);
        }
        this.setMessage({
            header: $header,
            type: messageType
        });
        this.getElement().find(":focusable").first().focus();
    }

    ///<summary>Set the message on the message area, it would replace the previous message immediately</summary>
    public static setMessage(messageType: Notifications.MessageAreaType, message: string, isHtml: boolean = false) {
        Events_Action.getService().performAction(DashboardMessageArea.Dashboard_Message_Queue, { message: message, messageType: messageType, isHtml: isHtml });
    }

    public static clearMessage() {
        Events_Action.getService().performAction(DashboardMessageArea.Dashboard_Message_Clear);
    }
}

Controls.Enhancement.registerEnhancement(DashboardMessageArea, ".dashboard-notification-message");


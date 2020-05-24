/// <reference types="jquery" />
import Q = require("q");

import * as Controls_NO_REQUIRE from "VSS/Controls";
import * as Notifications_NO_REQUIRE from "VSS/Controls/Notifications";
import { using, handleError as VSSHandleError } from "VSS/VSS";

var messageHandler: MessageHandler = null;

export const BuildPlatformErrorHolderClass = "build-platform-message-handlers-section";

export function handleError(error: TfsError) {
    getHandler().then((handler) => {
        handler.showError(error);
    }, (handlerError) => {
        console.log(handlerError);
        // fallback
        VSSHandleError(error);
    });
}

function getHandler(): IPromise<MessageHandler> {
    let deferred = Q.defer<MessageHandler>();
    let element = $("." + BuildPlatformErrorHolderClass);
    if (element.length == 0) {
        deferred.reject("Cannot find wellknown class: " + BuildPlatformErrorHolderClass);
    }
    else if (!messageHandler) {
        using(["VSS/Controls", "VSS/Controls/Notifications"], (_Controls: typeof Controls_NO_REQUIRE, _Notifications: typeof Notifications_NO_REQUIRE) => {
            messageHandler = new MessageHandler(element, _Controls, _Notifications);
            deferred.resolve(messageHandler);
        });
    }
    else {
        deferred.resolve(messageHandler);
    }

    return deferred.promise;
}

class MessageHandler {
    private _messageArea: Notifications_NO_REQUIRE.MessageAreaControl = null;

    constructor(element: JQuery, Controls: typeof Controls_NO_REQUIRE, Notification: typeof Notifications_NO_REQUIRE) {
        this._messageArea = <Notifications_NO_REQUIRE.MessageAreaControl>Controls.BaseControl.createIn(Notification.MessageAreaControl, element);
    }

    public showError(error: TfsError) {
        this._messageArea.setError(error.message);
    }
}


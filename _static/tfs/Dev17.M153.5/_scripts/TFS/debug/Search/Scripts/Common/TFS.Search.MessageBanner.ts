// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Notifications = require("VSS/Controls/Notifications");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import FlashMessageController_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.UI.Controls.FlashMessage");


/**
* Class corresponding to message banner displayed on portal Page
*/
export class SearchMessageBanner {
    private static SEARCHBOX_MESSAGEBANNER_ELEMENT_SELECTOR: string = "#search-banner";

    //Draw message banner of passed type and containg the passed content
    public static drawMessageBanner(content: string, type: Notifications.MessageAreaType): void {
        SearchMessageBanner.clear();
        VSS.using(["Presentation/Scripts/TFS/TFS.UI.Controls.FlashMessage"], (FlashMessageController: typeof FlashMessageController_NO_REQUIRE) => {
            var banner: JQuery = $(SearchMessageBanner.SEARCHBOX_MESSAGEBANNER_ELEMENT_SELECTOR),
                message = new FlashMessageController.Message(),
                view = new FlashMessageController.FlashMessage();

            message.content = $(`<span>` + content + `</span>`);
            message.type = type;
            view.message = message;

            FlashMessageController.Widget.enhanceElement(banner, view);

            Utils_Accessibility.announce(content, true);
        });
    }

    public static clear(): void {
        $(SearchMessageBanner.SEARCHBOX_MESSAGEBANNER_ELEMENT_SELECTOR).empty();
        $(SearchMessageBanner.SEARCHBOX_MESSAGEBANNER_ELEMENT_SELECTOR).removeClass();
    }

    public static isMessageBannerShown(): boolean {
        return $.trim($(SearchMessageBanner.SEARCHBOX_MESSAGEBANNER_ELEMENT_SELECTOR).html()).length > 0;
    }
}

export class WorkItemSearchBannerMessage extends Notifications.MessageAreaControl {
    private _$container: JQuery;
    private _isVisible: boolean;

    constructor(_$container: JQuery) {
        super();
        this._$container = _$container;
        this._isVisible = false;
    }

    public showBanner(messageContent: any, type: Notifications.MessageAreaType, showIcon: boolean, onCloseCallBack?: Function): void {
        VSS.using(["Presentation/Scripts/TFS/TFS.UI.Controls.FlashMessage"],
            (FlashMessageController: typeof FlashMessageController_NO_REQUIRE) => {
                var message = new FlashMessageController.Message(),
                    flashMessage = new FlashMessageController.FlashMessage();
                flashMessage.showIcon = showIcon;

                message.content = messageContent;
                message.type = type;
                flashMessage.message = message;

                this._$container.empty();
                FlashMessageController.Widget.enhanceElement(this._$container, flashMessage);

                this._bind(this._$container, "event-close-icon-clicked", Utils_Core.delegate(this, () => {
                    if (onCloseCallBack) {
                        onCloseCallBack();
                    }
                }));

                Utils_Accessibility.announce(messageContent, true);
                this._isVisible = true;
            });
    }

    public removeBanner(): void {
        this._isVisible = false;
        this._$container.remove();
        this._unbind(this._$container, "event-close-icon-clicked");
        this._$container.empty();
    }

    public isVisible(): boolean {
        return this._isVisible;
    }
}

import Utils_UI = require("VSS/Utils/UI");
import domElem = Utils_UI.domElem;

export function loadTemplates() {
    $(domElem('script'))
        .attr('id', "vc-pullrequest-notification-ko")
        .attr('type', 'text/html')
        .html(notificationBarTemplate)
        .appendTo($('body'));
}

const notificationBarTemplate = 
    `<div class="vc-pullrequest-notification-area" data-bind="visible: notificationViewModel.hasError() || notificationViewModel.hasNotification() ">
        <div class="vc-pullrequest-information" data-bind="visible: notificationViewModel.hasNotification">
            <span data-bind="text: notificationViewModel.notificationMessages"></span>
            <a data-bind="text: notificationViewModel.notificationLink, click: notificationViewModel.notificationLinkAction"></a>
        </div>
        <div class="vc-pullrequest-error" data-bind="visible: notificationViewModel.hasError">
            <span data-bind="text: notificationViewModel.errorMessages"></span>
        </div>
    </div>`;

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import * as Performance from "VSS/Performance";
import * as SDK_Shim from "VSS/SDK/Shim";
import { AdminNotificationsHub } from "NotificationsUI/Scripts/Components/AdminNotificationsHub";

SDK_Shim.registerContent("overviewNotifications.managementHub", (context) => {

    Performance.getScenarioManager().split("overviewNotifications.managementHub.start");

    ReactDOM.render(
        <AdminNotificationsHub pageContext={context.options._pageContext}/>,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
});
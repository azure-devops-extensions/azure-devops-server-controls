
import { IActionRequiredControlOptions } from "Dashboards/Scripts/Contracts";
import { BaseControl } from "VSS/Controls";
import { WidgetSettings } from "TFS/Dashboards/WidgetContracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_String from "VSS/Utils/String";
import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as ActionRequiredControl_Async from "Dashboards/Scripts/ActionRequiredControl";
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");

export module AnalyticsActionControl {
    /**
    * Creates an action required control to overlay on the widget.
    */
    export function createNotReadyActionControl(element: JQuery, widgetSettings: WidgetSettings): void {
        VSS.requireModules(["Dashboards/Scripts/ActionRequiredControl"]).spread(
            (ActionRequiredControl: typeof ActionRequiredControl_Async) => {
                BaseControl.createIn(
                    ActionRequiredControl.ActionRequiredControl,
                    element,
                    {
                        titleName: widgetSettings.name,
                        message: Resources.Analytics_FirstUseMessage,
                        subMessage: Resources.Analytics_FirstUseSubMessage,
                        cssClass: "analytics-action-required",
                        widgetSize: widgetSettings.size,
                        imageUrl: Utils_String.format(
                            "{0}Dashboards/{1}",
                            TfsContext.getDefault().configuration.getResourcesPath(),
                            encodeURIComponent("service-setup.svg"))
                    } as IActionRequiredControlOptions);

                element.addClass("with-loading-img");
            });
    }
}
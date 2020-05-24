import * as Page from "VSS/Events/Page";
import * as Service from "VSS/Service";
import { ExtensionService } from "VSS/Contributions/Services";
import * as Context from "VSS/Context";
import { WebContext } from "VSS/Common/Contracts/Platform";
import { IMenuItemSpec } from "VSS/Controls/Menus";

import { DashboardGroup } from "TFS/Dashboards/Contracts";

import { TfsCommands, DomClassNames } from "Dashboards/Scripts/Generated/Constants";
import { DashboardProviderPropertyBagNames } from "Dashboards/Scripts/Generated/Constants";
import { WidgetDataForPinning } from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import { PinArgs, commandArgsForPinning, PushToDashboardInternal, PushToDashboardResponse } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";

import { showAddToDashboard } from "TFSUI/Dashboards/AddToDashboard";

import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

//For pages other than dashboards, data provider needs to be explicitly downloaded
//For performace reasons, get data provider data after page is interactive
Page.getService().subscribe(Page.CommonPageEvents.PageInteractive, (event: Page.IPageEvent) => {
    const context = Context.getDefaultWebContext();

    if (context.project) {
        Service.getService(ExtensionService).getContribution(DashboardProviderPropertyBagNames.TeamContextData);
    }
});

// Contract containing essential information to pin a widget to a dashboard.
export interface PushToDashboardProps {
    // Current context project.
    projectId: string;
    
    // Object encapsulating all the data needed to create the widget.
    widgetData: WidgetDataForPinning;
    
    // Callback to invoke once pinning is completed.
    actionCallback: (args: PinArgs) => void;

    // Area which is the entry point for pinning.
    sourceArea?: string;
}

export class PushToDashboard {

    /**
    * Returns a menuItem which displays a panel to select a target dashboard for pinning widget.
    * @param webContext - webcontext used to get projectId.
    * @param {WidgetDataForPinning} widgetData - an object encapsulating all the data needed to create the widget
    * @param {(PinArgs) => void} actionCallback - callback to trigger actions once the widget has been pinned to the dashboard.
    * @param {string} menuItemText - display name for the menu item.
    * @param {string} sourceArea - area which is the entry point for pinning.
    * @return IMenuItemSpec
    */
    public static createMenu(
        webContext: WebContext,
        widgetData: WidgetDataForPinning,
        actionCallback: (args: PinArgs) => void = null,
        menuItemText: string = Resources.PushToDashboardTitle,
        sourceArea?: string
    ): IMenuItemSpec {
        return {
            id: TfsCommands.PushToDashboard,
            text: menuItemText,
            icon: DomClassNames.AddIconThin,
            action: (context: any) => {
                let pushToDashboardProps: PushToDashboardProps = {
                    projectId: webContext.project.id,
                    widgetData: widgetData,
                    actionCallback: actionCallback,
                    sourceArea: sourceArea
                };

                // Invoke add to dashboard panel.
                showAddToDashboard(pushToDashboardProps);
            }
        };
    }

    /**
     * [LEGACY]
     * Retrieves the dashboards available in this context.
     * TODO: Remove this after VersionControl is updated to use the new add to dashboard experience.
     * @return The available dashboards in a DashboardGroup structure.
     */
    public static getDashboards(): IPromise<DashboardGroup> {
        return PushToDashboardInternal.getDashboards();
    }

    /**
     * [LEGACY]
     * Adds a widget to a dashboard as per the information in the commandArgs object. 
     * NOTE: This method has been retained since it serves as an entry point for stakeholders today.
     *       Remove this method once stakeholders no longer have a dependency: https://aka.ms/Bs8jj1
     * @param webContext - webcontext used to get projectId.
     * @param {commandArgsForPinning} commandArgs - The commandArgs Object that implements the interface commandArgsForPinning.
     */
    public static pinToDashboard(webContext: WebContext, commandArgs: commandArgsForPinning, callerType?: string): IPromise<PushToDashboardResponse> {
        return PushToDashboardInternal.addToDashboard(null, commandArgs);
    }
}

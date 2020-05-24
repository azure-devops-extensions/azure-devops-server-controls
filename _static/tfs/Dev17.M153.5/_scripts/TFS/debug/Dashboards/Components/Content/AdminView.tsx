import { Control } from "VSS/Controls";
import * as Events_Action from "VSS/Events/Action";

import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

import { AdminView } from "Dashboards/Scripts/AdminView";
import { DashboardEvents } from "Dashboards/Scripts/DashboardEvents";
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import { IDashboardsHubContext } from "Dashboards/Components/DashboardsHubContext";
import { BladeLevelConstants } from "Dashboards/Scripts/BladeConstants";

export interface AdminViewProps extends ILegacyComponentProps {
    onBladeToggled?: (boolean, BladeLevelConstants) => void;
    onWidgetCopiedToDashboard?: (args: PinArgs) => void;
}

/**
 * Legacy component that wraps the admin view to be used with the contribution router. 
 */
export class AdminViewComponent extends LegacyComponent<AdminView, AdminViewProps, {}> {

    // admin view manages its own lifecycle so we noop the react update. 
    public shouldComponentUpdate(nextProps: any, nextState: any): boolean {
        return false;
    }

    public createControl(element: HTMLElement, props: AdminViewProps, state: any): AdminView {
        return Control.create(AdminView, $(element),  { onWidgetCopiedToDashboard: props.onWidgetCopiedToDashboard }) as AdminView;
    }

    public componentDidMount() {
        super.componentDidMount();        
        Events_Action.getService().registerActionWorker(DashboardEvents.BladeToggled, (actionArgs: any, next: any) => {
            if (this.props.onBladeToggled) {
                this.props.onBladeToggled(actionArgs.isOpen as boolean, actionArgs.bladeLevel);
            }
            next(actionArgs);
        });
    }

    public componentWillUnmount() {
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.BladeToggled);
        super.componentWillUnmount();
    }
}
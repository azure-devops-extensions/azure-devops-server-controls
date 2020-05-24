import { Control } from "VSS/Controls";

import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

import { BaseView } from "Dashboards/Scripts/BaseView";
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import { IDashboardsHubContext } from "Dashboards/Components/DashboardsHubContext";

export interface BaseViewProps extends ILegacyComponentProps {
    onWidgetCopiedToDashboard?: (args: PinArgs) => void;
}

/**
 * Legacy component that wraps the base view to be used with the contribution router. 
 */
export class BaseViewComponent extends LegacyComponent<BaseView, BaseViewProps, {}> {

    // base view manages its own lifecycle so we noop the react update
    public shouldComponentUpdate(nextProps: any, nextState: any): boolean {
        return false;
    }

    public createControl(element: HTMLElement, props: BaseViewProps, state: any): BaseView {
        return Control.create(BaseView, $(element), { onWidgetCopiedToDashboard: props.onWidgetCopiedToDashboard }) as BaseView;
    }
}

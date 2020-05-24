import React = require("react");

import { Icon, IconType } from "OfficeFabric/Icon";
import { autobind, BaseComponent, css, IBaseProps } from "OfficeFabric/Utilities";

import { registerLWPComponent } from "VSS/LWP";
import { ObservableValue } from "VSS/Core/Observable";
import Events_Action = require("VSS/Events/Action");
import * as VSS from "VSS/VSS";

import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import { DashboardRefreshManager } from "Dashboards/Components/Content/DashboardRefreshManager";
import { DashboardPageExtension, RefreshTimerEvents } from "Dashboards/Scripts/Common";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";

import TFS_Dashboards_L2Menu_Async = require("Dashboards/Scripts/L2Menu");
import Dialogs_Async = require("VSS/Controls/Dialogs");

var l2MenuInstance: IPromise<TFS_Dashboards_L2Menu_Async.L2Menu>;

function getL2MenuInstance(): IPromise<TFS_Dashboards_L2Menu_Async.L2Menu> {
    if (!l2MenuInstance) {
        return VSS.requireModules(["Dashboards/Scripts/L2Menu"]).spread(
            (TFS_Dashboards_L2Menu: typeof TFS_Dashboards_L2Menu_Async) => {
                return TFS_Dashboards_L2Menu.L2Menu.getHiddenLegacyL2Menu();
            });
    }

    return l2MenuInstance;
}


class ManageDashboardDialogShimComponent extends BaseComponent<{}, {}> {
    public static componentType = "manageDashboardDialogShim";

    public render(): JSX.Element {
        getL2MenuInstance().then((l2Menu: TFS_Dashboards_L2Menu_Async.L2Menu) => {
            l2Menu.getDashboardsRightPanel().showManagementDialog();
        });

        return null;
    }
}

class AddDashboardDialogShimComponent extends BaseComponent<{}, {}> {
    public static componentType = "addDashboardDialogShim";

    public render(): JSX.Element {
        VSS.using(["VSS/Controls/Dialogs"], (Dialogs: typeof Dialogs_Async) => {
            getL2MenuInstance().then((l2Menu: TFS_Dashboards_L2Menu_Async.L2Menu) => {
                Dialogs.Dialog.show(
                    TFS_Dashboards_L2Menu_Async.DashboardsInlineEditorDialog,
                    l2Menu.getInlineEditorOptions());
            });
        });

        return null;
    }
}

class DashboardAutoRefreshShimComponent extends BaseComponent<{}, {}>  {
    public static componentType = "dashboardAutoRefreshShim";
    private refreshElement: HTMLDivElement;
    
    public componentDidMount(): void {
        super.componentDidMount();
    }

    public render(): JSX.Element {
        Events_Action.getService().performAction(RefreshTimerEvents.OnRefresh);
        return null;
    }
}

registerLWPComponent(ManageDashboardDialogShimComponent.componentType, ManageDashboardDialogShimComponent);
registerLWPComponent(AddDashboardDialogShimComponent.componentType, AddDashboardDialogShimComponent);
registerLWPComponent(DashboardAutoRefreshShimComponent.componentType, DashboardAutoRefreshShimComponent);
import * as React from "react";
import * as ReactDOM from "react-dom";

import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";

import * as Utils_UI from "VSS/Utils/UI";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { DirectoryViewComponentBase } from "Dashboards/Components/Directory/DirectoryViewComponentBase";
import { SharedContext } from "Dashboards/Components/DashboardsHubContext";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import {
    DashboardLoadingState,
    DashboardsDirectoryPivotState,
    IDirectoryRow,
    IGroupRow,
    IDashboardRow
} from "Dashboards/Components/Directory/Contracts";
import { UrlConstants } from "Dashboards/Components/Constants";

import "VSS/LoaderPlugins/Css!Dashboards/Components/Directory/MyDashboardsDirectoryViewComponent";

export class MyDashboardsDirectoryViewComponent extends DirectoryViewComponentBase {
    constructor(props: any) {
        super(props);

        this.state = {
            loadingState: DashboardLoadingState.Loading,
        } as DashboardsDirectoryPivotState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.dashboardDirectoryActionCreator.loadDashboardsForMyPivot(TfsContext.getDefault().contextData.project.id, this.props.initialFilter);
    }

    protected getState(): DashboardsDirectoryPivotState {
        return this.dashboardDirectoryStore.getState(this.getPivotName());
    }

    protected getPivotName(): string {
        return UrlConstants.MineView;
    }

    protected getComponentClassName(): string {
        return "dashboards-directory-mine";
    }

    protected getListClassName(): string {
        return "my-dashboards-list";
    }

    protected getColumnActionsMode(): ColumnActionsMode {
        return ColumnActionsMode.disabled;
    }

    protected getColumns(): IColumn[] {
        return this.generateDirectoryColumns();
    }

    protected processKeyDown(e: React.KeyboardEvent<HTMLDivElement>, directoryRow: IDirectoryRow) {
        // Only handle key presses for the group header rows 
        if (directoryRow.isGroupRow) {
            let groupRow = directoryRow.directoryRow as IGroupRow;

            if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                this.onGroupHeaderToggle(groupRow);
            }
            else if (groupRow.isCollapsed && e.keyCode === Utils_UI.KeyCode.RIGHT) {
                this.dashboardDirectoryActionCreator.expandGroupInPivot(this.getPivotName(), groupRow.teamId);
            }
            else if (!groupRow.isCollapsed && e.keyCode === Utils_UI.KeyCode.LEFT) {
                this.dashboardDirectoryActionCreator.collapseGroupInPivot(this.getPivotName(), groupRow.teamId);
            }
        }
    }

    protected onColumnClick(event?: React.MouseEvent<HTMLElement>, column?: IColumn): void {
        // no op any behaviour.
    }
}
import * as React from "react";
import * as ReactDOM from "react-dom";

import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { DirectoryViewComponentBase } from "Dashboards/Components/Directory/DirectoryViewComponentBase";
import { SharedContext } from "Dashboards/Components/DashboardsHubContext";
import {
    DashboardLoadingState,
    DashboardsDirectoryPivotState,
    IDirectoryRow
} from "Dashboards/Components/Directory/Contracts";
import { UrlConstants } from "Dashboards/Components/Constants";

export class AllDashboardsDirectoryViewComponent extends DirectoryViewComponentBase {
    constructor(props: any) {
        super(props);
        this.state = {
            loadingState: DashboardLoadingState.Loading
        } as DashboardsDirectoryPivotState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.dashboardDirectoryActionCreator.loadDashboardsForAllPivot(TfsContext.getDefault().contextData.project.id, this.props.initialFilter);
    }

    protected getPivotName(): string {
        return UrlConstants.AllView;
    }

    protected getState(): DashboardsDirectoryPivotState {
        return this.dashboardDirectoryStore.getState(UrlConstants.AllView);
    }

    protected getComponentClassName(): string {
        return "dashboards-directory-all";
    }

    protected getListClassName(): string {
        return "all-dashboards-list";
    }

    protected getColumns(): IColumn[] {
        return this.generateDirectoryColumns();
    }

    protected getColumnActionsMode(): ColumnActionsMode {
        return ColumnActionsMode.clickable;
    }

    protected processKeyDown(e: React.KeyboardEvent<HTMLDivElement>, directoryRow: IDirectoryRow) {
        // nothing to be done in case of all dashboards. 
    }

    protected onColumnClick(event?: React.MouseEvent<HTMLElement>, column?: IColumn): void {
        if (column) {
            this.dashboardDirectoryActionCreator.changeColumnSortForPivot(this.getPivotName(), column.fieldName);
        }
    }
}
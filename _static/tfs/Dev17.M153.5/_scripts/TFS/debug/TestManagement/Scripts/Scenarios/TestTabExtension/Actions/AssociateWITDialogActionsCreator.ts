import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {
    AssociateWITDialogActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/AssociateWITDialogActionsHub";
import * as QueryRequirementHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/QueryWorkItemHelper";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import { IWorkItemInfo } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/AssociateWITDialogStore";
import { WorkItem } from "TFS/WorkItemTracking/Contracts";
import { delegate } from "VSS/Utils/Core";
import * as VSS from "VSS/VSS";

export class AssociateWITDialogActionsCreator {
    constructor(private _resultsActionHub: AssociateWITDialogActionsHub, private _source: TestResultSource) {
    }

    public fetchCategoryTypeWorkItems(searchKey: string, categoryType: QueryRequirementHelper.workItemCategoryType) {
        this._resultsActionHub.fetchingWorkItems.invoke(null);

        let that = this;
        this._source.getWorkItems(
            searchKey,
            categoryType,
            delegate(that, that._afterGettingResult),
            delegate(that, that._onGettingError)
        );
    }

    private _afterGettingResult(results: any) {

        let workItemTypeColorAndIcon = {};
        let WorkItemsStateColor = {};

        if (results && (results as WorkItem[]).length > 0) {
            let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
            let projectName = webContext.project.name;

            const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();

            colorsProvider.ensureColorAndIconsArePopulated([projectName]).then(
                () => {
                    const stateColorsProvider = WorkItemStateColorsProvider.getInstance();

                    stateColorsProvider.ensureColorsArePopulated([projectName]).then(
                        () => {

                            results.forEach(res => {
                                let state = res.fields[WITConstants.CoreFieldRefNames.State];
                                if (!WorkItemsStateColor[state]) {
                                    WorkItemsStateColor[state] = stateColorsProvider.getColor(projectName, res.fields[WITConstants.CoreFieldRefNames.WorkItemType], state);
                                }

                                let workItemType = res.fields[WITConstants.CoreFieldRefNames.WorkItemType];
                                if (!workItemTypeColorAndIcon[workItemType]) {
                                    workItemTypeColorAndIcon[workItemType] = colorsProvider.getColorAndIcon(projectName, res.fields[WITConstants.CoreFieldRefNames.WorkItemType]);
                                }
                            });

                            this._resultsActionHub.initializeResult.invoke({ workItems: results, workItemTypeColorAndIcon: workItemTypeColorAndIcon, WorkItemsStateColor: WorkItemsStateColor } as IWorkItemInfo);
                        }
                    );
                }
            );
        }
        else {
            this._resultsActionHub.initializeResult.invoke({ workItems: results, workItemTypeColorAndIcon: workItemTypeColorAndIcon, WorkItemsStateColor: WorkItemsStateColor } as IWorkItemInfo);
        }
    }

    public _onGettingError(error: any) {
        this._resultsActionHub.onError.invoke(VSS.getErrorMessage(error));
    }

    public closeInfoBar() {
        this._resultsActionHub.closeInfoBar.invoke(null);
    }

    public onColumnSorted(WorkItems: WorkItem[]) {
        this._resultsActionHub.onColumnSorted.invoke(WorkItems);
    }

    public clearResult() {
        this._resultsActionHub.clearStore.invoke(null);
    }
}
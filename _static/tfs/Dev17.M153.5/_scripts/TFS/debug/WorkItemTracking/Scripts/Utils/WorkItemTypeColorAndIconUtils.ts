import Q = require("q");
import Diag = require("VSS/Diag");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import * as DataProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export const DefaultColor = DataProvider.WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR;

/**
 * Get color for the given work item type, if the data is already available on the client
 * @param workItemType Work item type to retrieve color for
 */
export function getWorkItemTypeColor(workItemType: WITOM.WorkItemType): string {

    const dataProvider = DataProvider.WorkItemTypeColorAndIconsProvider.getInstance();
    const projectName = workItemType.project.name;

    if (dataProvider.isPopulated(projectName)) {
        return dataProvider.getColor(projectName, workItemType.name);
    }

    return null;
}

/**
 * Get color for the given work item type. If data is not availble on the client, it will be retrieved
 * @param workItemType Work item type to retrieve color for
 */
export function beginGetWorkItemTypeColor(workItemType: WITOM.WorkItemType): IPromise<string> {
    Diag.Debug.assertParamIsNotNull(workItemType, "workItemType");

    const dataProvider = DataProvider.WorkItemTypeColorAndIconsProvider.getInstance();
    return dataProvider.getColorAsync(workItemType.project.name, workItemType.name);
}
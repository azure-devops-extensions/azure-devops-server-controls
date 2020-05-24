import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ClassificationFieldsMruSettingsUtils, IClassificationFieldsMruSettingsUtils } from "WorkItemTracking/Scripts/MruClassificationPicker/Actions/ClassificationFieldsMruSettingsUtils";
import { CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export async function setClassificationNodesUsingMRU(workItem: WorkItem, projectId: string): Promise<void> {
    const mruUtils: IClassificationFieldsMruSettingsUtils = new ClassificationFieldsMruSettingsUtils();

    const [node, mruValues] = await Promise.all([
        workItem.project.nodesCacheManager.beginGetNodes(),
        mruUtils.getMru(projectId)
    ]);

    if (mruValues.areaPathMru && mruValues.areaPathMru.length > 0) {
        const firstAreaPath: number = mruValues.areaPathMru[0];
        if (node && workItem.project.nodesCacheManager.findNodeById(firstAreaPath)) {
            workItem.setFieldValue(CoreField.AreaId, firstAreaPath);
        }
    }

    if (mruValues.iterationPathMru && mruValues.iterationPathMru.length > 0) {
        const firstIterationPath: number = mruValues.iterationPathMru[0];
        if (node && workItem.project.nodesCacheManager.findNodeById(firstIterationPath)) {
            workItem.setFieldValue(CoreField.IterationId, firstIterationPath);
        }
    }
}

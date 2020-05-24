import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import StringUtils = require("VSS/Utils/String");

export namespace CloneUtils {
    /**
     * The only identifying information about WorkItemTypeBehaviors are their ID and URL. This uses the ID of the desired behavior in the original process and finds the corresponding behavior in the
     * new process. 
     * @param id
     * @param oldBehaviors
     * @param newBehaviors
     */
    export function  _findWitBehaviorId(id: string, oldBehaviors: ProcessContracts.ProcessBehavior[], newBehaviors: ProcessContracts.ProcessBehavior[]): string {
        var oldBehaviorIdMatches: ProcessContracts.ProcessBehavior[] = oldBehaviors.filter(behavior => StringUtils.equals(behavior.referenceName, id));

        if (oldBehaviorIdMatches.length > 0) {
            var newBehaviorIdMatches: ProcessContracts.ProcessBehavior[] = newBehaviors.filter(behavior => StringUtils.equals(behavior.name, oldBehaviorIdMatches[0].name, true));
            if (newBehaviorIdMatches.length > 0) {
                return newBehaviorIdMatches[0].referenceName;
            } else {
                return null;
            }
        } else {
            // not found in list of custom behaviors, must be system behavior, all system behaviors have same ID
            return id;
        }
    }

    export function  _findPageIdByLabel(label: string, layout: ProcessContracts.FormLayout): string {
        var pages: ProcessContracts.Page[] = layout.pages.filter(page => StringUtils.equals(page.label, label, true));

        if (pages.length > 0) {
            return pages[0].id;
        } else {
            return null;
        }
    }

    export function  _getFieldReferenceName(control: ProcessContracts.Control, fieldList: ProcessContracts.ProcessWorkItemTypeField[]): string {
        var fieldRefName: ProcessContracts.ProcessWorkItemTypeField[] = fieldList.filter(field => StringUtils.equals(field.name, control.label, true));

        if (fieldRefName.length > 0) {
            return fieldRefName[0].referenceName;
        } else {
            return control.id;
        }
    }

}
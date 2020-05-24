import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { FieldStatus } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { ILayout, ILayoutGroup, ILayoutPage, ILayoutSection } from "WorkItemTracking/Scripts/Form/Layout";
import { equals } from "VSS/Utils/String";

/**
 * Returns a value indicating whether a work item has any invalid field that is *not* visible on any of the
 * work item form's pages.
 * 
 * @param layout Layout of the work item type
 * @param workItem Work item to check for invalid fields
 */
export function isWorkItemInvalidDueToInvisibleField(layout: ILayout, workItem: WorkItem): boolean {
    if (workItem.isValid()) {
        return false;
    }

    const invalidFields = workItem.getInvalidFields(false);
    if (invalidFields && invalidFields.length) {
        // There can be invalid fields that are not on any page
        return invalidFields.some(invalidField => {
            return layout.pages.every(page => !pageContainsVisibleField(invalidField.fieldDefinition.referenceName, page));
        });
    }

    return false;
}

function pageContainsVisibleField(fieldReferenceName: string, page: ILayoutPage): boolean {
    return !page.sections || page.sections.some(section => sectionContainsVisibleField(fieldReferenceName, section));
}

function sectionContainsVisibleField(fieldReferenceName: string, section: ILayoutSection): boolean {
    return !section.groups || section.groups.some(group => groupContainsVisibleField(fieldReferenceName, group));
}

function groupContainsVisibleField(fieldReferenceName: string, group: ILayoutGroup): boolean {
    return !group.controls || group.controls.some(control => {
        const controlFieldReferenceName = control.id;

        return equals(controlFieldReferenceName, fieldReferenceName, true);
    });
}

/**
 * Returns a value indicating whether all of the sections in this page are valid for the given work item
 * @param page Page to validate
 * @param workItem Work item to check the status for
 */
export function isPageValid(page: ILayoutPage, workItem: WorkItem): boolean {
    return formElementValidator(workItem, () => {
        return page.sections.every(section => isSectionValid(section, workItem));
    });
}

/**
 * Returns a value indicating whether all of the groups in this section are valid for the given work item
 * @param section Section to validate
 * @param workItem Work item to check the status for
 */
export function isSectionValid(section: ILayoutSection, workItem: WorkItem): boolean {
    return formElementValidator(workItem, () => {
        return section.groups.every(group => isGroupValid(group, workItem));
    });
}

/**
 * Returns a value indicating whether all of the fields shown by the controls in this 
 * group are valid for the given work item
 * @param group Group to validate
 * @param workItem Work item to check the status for
 */
export function isGroupValid(group: ILayoutGroup, workItem: WorkItem): boolean {
    return formElementValidator(workItem, () => {
        const hasControls = group.controls && group.controls.length > 0;
        return !hasControls
            || group.controls.every(control => {
                const fieldRefName = control.id;
                const hasFieldRefName = !!fieldRefName;
                const field = workItem.getField(fieldRefName);
                return !hasFieldRefName || !field
                    || workItem.getField(fieldRefName).getStatus() === FieldStatus.Valid;
            });
    });
}

function formElementValidator(workItem: WorkItem, validator: () => boolean): boolean {
    if (workItem.isValid()) {
        return true;
    }

    return validator();
}
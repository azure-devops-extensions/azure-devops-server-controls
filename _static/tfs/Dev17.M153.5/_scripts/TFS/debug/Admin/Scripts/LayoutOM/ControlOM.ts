import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";

import { Page, Section, Group, Control } from "TFS/WorkItemTracking/ProcessContracts";
import { FieldType } from "TFS/WorkItemTracking/ProcessContracts";
//import { getClient } from "TFS/WorkItemTracking/ProcessRestClient";
import * as ControlsDialogs from "VSS/Controls/Dialogs";
import * as Utils_String from "VSS/Utils/String";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as TFS_Dialogs_LayoutControlExtension from "Admin/Scripts/Dialogs/WorkItemLayoutControlExtensionDialog";
import { EditFieldDialog } from "Admin/Scripts/Dialogs/EditFieldDialog";
import { ILayoutOMOptions, IBeginAddFieldToWorkItemType } from "Admin/Scripts/LayoutOM/ProcessLayoutOM";
import { ProcessField, ProcessDefinitionFieldUsageData } from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import { Utils } from "Admin/Scripts/Common/Utils";

export class ControlOM {
    constructor(
        private readonly _options: ILayoutOMOptions,
        private readonly _processFieldHelper: AdminProcessCommon.ProcessFieldHelper,
        private readonly _getField: (fieldId: string) => ProcessField,
        private readonly _getFieldUsageData: () => ProcessDefinitionFieldUsageData,
    ) { }
    private _showFieldControlEditDialog(
        page: Page,
        section: Section,
        group: Group,
        control: Control,
        beginAddFieldToWorkItemType: IBeginAddFieldToWorkItemType,
    ): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const field = this._getField(control.id);
        if (!field) {
            this._options.setError(AdminResources.FieldDefinitionNotFound);
        }
        const existingField: AdminDialogFieldContracts.Field = {
            id: control.id,
            name: control.label,
            type: FieldType[field.Type],
            description: null,
            url: null,
            isIdentity: FieldType[field.Type] == FieldType.Identity,
            addedToWIT: true
        };

        const fieldData: AdminDialogFieldContracts.FieldData = {
            id: control.id,
            name: field.Name,
            type: FieldType[field.Type],
            existing: true,
            label: control.label,
            description: this._processFieldHelper.getDescription(field, this._options.getWorkItemType()),
            required: this._processFieldHelper.getIsRequired(field, this._options.getWorkItemType()),
            default: this._processFieldHelper.getDefaultValue(field, this._options.getWorkItemType()),
            groupId: group.id,
            groupName: group.label,
            existingField: existingField,
            isVisibleOnForm: control.visible === false ? false : true,
            pickListId: field.PickListId,
            allowGroups: this._processFieldHelper.getAllowGroups(field, this._options.getWorkItemType())
        };

        const options: AdminDialogFieldContracts.EditFieldDialogOptions = {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            processName: this._options.getProcess().name,
            processRefName: this._options.getProcess().refName,
            fieldData: fieldData,
            allProcessFields: this._getFieldUsageData(),
            refresh: (pageId: string, groupId: string, controlId: string) => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh(pageId, groupId, controlId);
            },
            tfsContext: this._options.tfsContext,
            disableGroup: control.inherited === true,
            focusLayoutTab: true, // always focus on layout if it is called from layout view
            isInherited: this._processFieldHelper.isInheritedField(field, this._options.getWorkItemType()),
            hideShowFieldInForm: true,
            page: page,
            sectionId: section.id,
            beginAddFieldToWorkItemType
        };
        ControlsDialogs.show(EditFieldDialog, options);
    }

    private _showControlExtensionEditDialog = (page: Page, group: Group, control: Control, beginAddFieldToWorkItemType: IBeginAddFieldToWorkItemType): void => {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const options = <AdminDialogFieldContracts.AddControlExtensionDialogOptions>{
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            processName: this._options.getProcess().name,
            processRefName: this._options.getProcess().refName,
            allProcessFields: this._getFieldUsageData(),
            controlContributionInputLimit: this._options.controlContributionInputLimit,
            refresh: (pageId: string, groupId: string, controlId: string) => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh(pageId, groupId, controlId);
            },
            groupId: group.id,
            controlId: control.id,
            groupName: group.label,
            page: page,
            label: control.label,
            contributionId: control.contribution.contributionId,
            inputs: control.contribution.inputs,
            beginAddFieldToWorkItemType
        };

        ControlsDialogs.show(TFS_Dialogs_LayoutControlExtension.EditControlExtensionDialog, options);
    }

    private _moveControlError = (): void => {
        this._options.setError(AdminResources.AdminLayoutMoveRequestFailureDragDropDisabledMessage);
        this._options.disableOrdering();
    }

    public edit(page: Page, section: Section, group: Group, control: Control, beginAddFieldToWorkItemType: IBeginAddFieldToWorkItemType): void {
        if (control.isContribution) {
            this._showControlExtensionEditDialog(page, group, control, beginAddFieldToWorkItemType);
        } else {
            this._showFieldControlEditDialog(page, section, group, control, beginAddFieldToWorkItemType);
        }
    }

    public addExtension(page: Page, beginAddFieldToWorkItemType: IBeginAddFieldToWorkItemType, groupId?: string): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const options = <AdminDialogFieldContracts.AddControlExtensionDialogOptions>{
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            processName: this._options.getProcess().name,
            processRefName: this._options.getProcess().refName,
            allProcessFields: this._getFieldUsageData(),
            controlContributionInputLimit: this._options.controlContributionInputLimit,
            refresh: (pageId: string, groupId: string, controlId: string) => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh(pageId, groupId, controlId);
            },
            groupId: groupId,
            page: page,
            label: "",
            contributionId: "",
            inputs: {},
            beginAddFieldToWorkItemType,
        };
        ControlsDialogs.show(TFS_Dialogs_LayoutControlExtension.AddControlExtensionDialog, options);
    }

    public move(control: Control, targetGroupId: string, sourceGroupId: string): void {
        const onControlMoveAction = () => {
            // modify the control's group membership in Layout object (remove from source group and add to target group in the required order)
            // otherwise we wont be able to move it back to its previous group without refreshing the page
            const sourceGroup = AdminProcessCommon.ProcessLayoutHelpers.groupFromId(this._options.getWorkItemType().layout, sourceGroupId);
            const targetGroup = AdminProcessCommon.ProcessLayoutHelpers.groupFromId(this._options.getWorkItemType().layout, targetGroupId);

            if (sourceGroup) {
                sourceGroup.controls = $.grep(sourceGroup.controls, function (c: Control) { return c.id !== control.id; });
            } else {
                targetGroup.controls = $.grep(targetGroup.controls, function (c: Control) { return c.id !== control.id; });
            }

            const targetControlOrder = control.order !== null && control.order !== undefined ? control.order : targetGroup.controls.length;
            targetGroup.controls.splice(targetControlOrder, 0, control);
        };

        if (!sourceGroupId || Utils_String.equals(sourceGroupId, targetGroupId, true)) {
            // move the control in the same group
            Utils.getProcessClient().updateControl(control, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, targetGroupId, control.id).then(
                () => {
                    onControlMoveAction();
                },
                (error) => {
                    this._moveControlError();
                });
        } else {
            // move the control in a different group
            Utils.getProcessClient().moveControlToGroup(control, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, targetGroupId, control.id, sourceGroupId).then(
                () => {
                    onControlMoveAction();
                },
                (error) => {
                    this._moveControlError();
                }
            );
        }
    }
}

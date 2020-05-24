import { getClient } from "TFS/WorkItemTracking/ProcessRestClient";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import DeleteProcessLayoutNodeConfirmationDialog = require("Admin/Scripts/DeleteProcessLayoutNodeConfirmationDialog");
import * as ControlsDialogs from "VSS/Controls/Dialogs";
import * as TFS_Admin_Dialogs from "Admin/Scripts/TFS.Admin.Dialogs";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as Telemetry from "VSS/Telemetry/Services";
import * as AdminDialogs from "Admin/Scripts/TFS.Admin.Dialogs";
import { CustomerIntelligenceConstants } from "Admin/Scripts/TFS.Admin";
import { AddFieldDialog } from "Admin/Scripts/Dialogs/AddFieldDialog";
import { CustomizationType } from "TFS/WorkItemTracking/ProcessContracts";
import { FormLayout, Page, Group, Control } from "TFS/WorkItemTracking/ProcessContracts";
import * as Q from "q";
import { ILayoutOMOptions, IBeginAddFieldToWorkItemType } from "Admin/Scripts/LayoutOM/ProcessLayoutOM";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import { ProcessField, ProcessDefinitionFieldUsageData } from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import { Utils } from "Admin/Scripts/Common/Utils";

export class FieldOM {
    constructor(
        private readonly _options: ILayoutOMOptions,
        private readonly _processFieldHelper: AdminProcessCommon.ProcessFieldHelper,
        private readonly _getField: (fieldId: string) => ProcessField,
        private readonly _getFieldUsageData: () => ProcessDefinitionFieldUsageData,
        private readonly _createChildWorkItemType: (callback?: (workItemTypeId: string) => void) => void,
    ) {}
    public add(page: Page, beginAddFieldToWorkItemType: IBeginAddFieldToWorkItemType, groupId?: string, sectionId?: string): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const options: AdminDialogFieldContracts.AddFieldDialogOptions = {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            processName: this._options.getProcess().name,
            processRefName: this._options.getProcess().refName,
            allProcessFields: this._getFieldUsageData(),
            refresh: (pageId: string, groupId: string, controlId: string) => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh(pageId, groupId, controlId);
            },
            tfsContext: this._options.tfsContext,
            hideShowFieldInForm: true,
            groupId: groupId,
            showRemovedLayoutFields: true,
            page: page,
            resizable: false,
            sectionId: sectionId,
            disablePageAndSectionSelection: Boolean(sectionId),
            beginAddFieldToWorkItemType,
        };
        ControlsDialogs.show(AddFieldDialog, options);
    }

    public setVisible(group: Group, control: Control, visible: boolean): void {
        const controlField = this._getField(control.id);
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const hideAction: () => void = () => {
            const editFieldLayoutPackage: Control = {
                order: null,
                isContribution: false,
                label: control.label,
                readOnly: control.readOnly,
                visible: visible,
                controlType: control.controlType,
                id: control.id,
                metadata: control.metadata,
                inherited: control.inherited,
                overridden: control.overridden,
                watermark: control.watermark,
                contribution: null,
                height: null
            };

            Utils.getProcessClient().updateControl(
                editFieldLayoutPackage,
                this._options.getProcess().processTypeId,
                this._options.getWorkItemType().referenceName,
                group.id, controlField ? controlField.Id : control.id
            ).then(
                () => {
                    if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                        this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                    }
                    this._options.refresh();

                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.Process.AREA,
                        CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
                        {
                            "event": "hideFieldFromLayout",
                            "process": this._options.getProcess() ? this._options.getProcess().name : "",
                            "isSytemProcess": this._options.getProcess() && this._options.getProcess().isSystem,
                            "isInheritedProcess": this._options.getProcess() && this._options.getProcess().isInherited,
                            "workItemType": this._options.getWorkItemType() ? this._options.getWorkItemType().name : "",
                        }));
                },
                (error) => {
                    const options: AdminDialogFieldContracts.ErrorMessageDialogOptions = {
                        title: Utils_String.format(
                            AdminResources.AdminLayoutShowHideErrorDialogTitle,
                            visible ? AdminResources.Show : AdminResources.Hide,
                            controlField ? AdminResources.Field : AdminResources.Control
                        ),
                        contentText: AdminResources.AdminLayoutRequestFailureMessage
                    };

                    ControlsDialogs.show(TFS_Admin_Dialogs.ErrorMessageDialog, options);
                });
        };

        const enhancedHideAction: () => void = () => {
            if (this._options.getWorkItemType().customization === CustomizationType.System) {
                this._createChildWorkItemType(() => {
                    hideAction();
                });
            } else {
                hideAction();
            }
        };

        const fieldIsRequired: boolean = controlField ? this._processFieldHelper.getIsRequired(controlField, this._options.getWorkItemType()) : false;
        const fieldDefaultValue = controlField ? this._processFieldHelper.getDefaultValue(controlField, this._options.getWorkItemType()) : null;

        // If the field is not required or is required, but has a default value, it's safe to remove it from the layout.
        // Otherwise const's show a confirmation dialog because the user is about to break the form.
        if (visible || !fieldIsRequired || fieldDefaultValue) {
            enhancedHideAction();
        } else {
            const options: AdminDialogs.IConfirmRemoveDialogOptions = {
                title: AdminResources.HideFieldFromLayoutDialogTitle,
                okCallback: enhancedHideAction,
                dialogTextStrings: [
                    Utils_String.format(
                        AdminResources.HideFieldFromLayoutDialogText1,
                        controlField ? controlField.Name : (control.label || group.label),
                        this._options.getWorkItemType().name
                    ),
                    AdminResources.RemovingRequiredFieldWarningText
                ],
                successCallback: null
            };

            ControlsDialogs.show(DeleteProcessLayoutNodeConfirmationDialog, options);
        }
    }

    public removeFromLayout(
        layout: FormLayout,
        group: Group,
        control: Control,
        contributions: Contribution[],
        fieldIdsToRemoveFromWorkItemType: string[]
    ): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const controlField = this._getField(control.id);
        fieldIdsToRemoveFromWorkItemType = fieldIdsToRemoveFromWorkItemType || [];

        const completeCallback = () => {
            if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
            }
            this._options.refresh();

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.Process.AREA,
                CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
                {
                    "event": "removeFieldFromLayout",
                    "process": this._options.getProcess() ? this._options.getProcess().name : "",
                    "isSytemProcess": this._options.getProcess() && this._options.getProcess().isSystem,
                    "isInheritedProcess": this._options.getProcess() && this._options.getProcess().isInherited,
                    "workItemType": this._options.getWorkItemType() ? this._options.getWorkItemType().name : "",
                }));
        };

        const removeAction: () => void = () => {
            const processId = this._options.getProcess().processTypeId;
            const witId = this._options.getWorkItemType().referenceName;
            Utils.getProcessClient().removeControlFromGroup(processId, witId, group.id, controlField ? controlField.Id : control.id).then(
                () => {
                    if (fieldIdsToRemoveFromWorkItemType.length === 0) {
                        completeCallback();
                        return;
                    }

                    const removeFieldsFromWorkItemType = () => {
                        return fieldIdsToRemoveFromWorkItemType.map(
                            (fieldId) => Utils.getProcessClient().removeWorkItemTypeField(processId, witId, fieldId));
                    };

                    Q.allSettled([removeFieldsFromWorkItemType()])
                        .then((results) => {
                            const resultStates = results as Q.PromiseState<any>[];

                            const errors: Error[] = [];
                            errors.push(...resultStates.filter((result) => result.state !== "fulfilled").map((result) => result.reason));

                            if (errors.length === 0) {
                                completeCallback();
                                return;
                            }

                            this._options.setError(errors.join(" "));
                        });
                },
                (error) => {
                    this._options.setError(AdminResources.AdminLayoutRequestFailureMessage);
                });
        };

        const fieldIsRequired: boolean = controlField ? this._processFieldHelper.getIsRequired(controlField, this._options.getWorkItemType()) : false;

        const dialogText = [];
        let dialogConfirmText: string;

        if (control.isContribution) {
            let label = control.label || control.contribution.contributionId;
            if (contributions) {
                const contribution = Utils_Array.first(contributions, (c: Contribution) => {
                    return Utils_String.equals(c.id, control.contribution.contributionId, true);
                });
                if (contribution) {
                    label = AdminProcessCommon.ProcessContributionHelpers.getContributionLabel(contribution);
                }

            }

            dialogConfirmText = Utils_String.format(AdminResources.RemoveCustomControlFromLayoutDialogText1, label, this._options.getWorkItemType().name);
        } else {
            dialogConfirmText = Utils_String.format(
                fieldIdsToRemoveFromWorkItemType.length === 0 ?
                    AdminResources.RemoveFieldFromLayoutDialogText1 : AdminResources.RemoveFieldFromLayoutAndWorkItemTypeDialogText1,
                controlField ? controlField.Name : (control.label || group.label),
                this._options.getWorkItemType().name);
        }

        if (fieldIsRequired) {
            dialogText.push(AdminResources.RemovingRequiredFieldWarningText + dialogConfirmText);
        } else {
            dialogText.push(dialogConfirmText);
        }

        if (control.isContribution) {
            dialogText.push(AdminResources.RemoveCustomControlFromLayoutDialogText2);
        } else {
            dialogText.push(AdminResources.RemoveFieldFromLayoutDialogText2);
        }

        // Show a confirmation dialog because the user is about to remove a custom field from the form.
        const options: AdminDialogs.IConfirmRemoveDialogOptions = {
            title: fieldIdsToRemoveFromWorkItemType.length === 0 ?
                AdminResources.RemoveFieldFromLayoutDialogTitle : AdminResources.RemoveFieldFromLayoutAndWorkItemTypeDialogTitle,
            okCallback: removeAction,
            dialogTextStrings: dialogText,
            successCallback: null
        };

        ControlsDialogs.show(DeleteProcessLayoutNodeConfirmationDialog, options);
    }
}

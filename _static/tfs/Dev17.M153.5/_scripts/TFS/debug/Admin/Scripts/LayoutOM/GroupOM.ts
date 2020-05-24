import { CustomizationType } from "TFS/WorkItemTracking/ProcessContracts";
import { Page, Section, Group } from "TFS/WorkItemTracking/ProcessContracts";
import * as Utils_String from "VSS/Utils/String";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as Notifications from "VSS/Controls/Notifications";
import * as AdminCommonLoadingOverlay from "Admin/Scripts/Common/LoadingOverlay";
import { ILayoutOMOptions } from "Admin/Scripts/LayoutOM/ProcessLayoutOM";
import * as ControlsDialogs from "VSS/Controls/Dialogs";
import * as WorkItemDialogBase from "Admin/Scripts/Dialogs/WorkItemDialogBase";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as TFS_Admin_Dialogs from "Admin/Scripts/TFS.Admin.Dialogs";
import * as TFS_Dialogs_LayoutGroup from "Admin/Scripts/Dialogs/WorkItemLayoutGroupDialog";
import { CustomerIntelligenceConstants } from "Admin/Scripts/TFS.Admin";
import * as Telemetry from "VSS/Telemetry/Services";
import { Utils } from "Admin/Scripts/Common/Utils";

export class GroupOM {
    constructor(
        private readonly _options: ILayoutOMOptions,
        private readonly _createChildWorkItemType: (callback?: (workItemTypeId: string) => void) => void,
    ) { }
    public add(page: Page): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const options: TFS_Dialogs_LayoutGroup.IWorkItemLayoutGroupDialogOptions = {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            okCallback: (
                dialog: TFS_Dialogs_LayoutGroup.WorkItemLayoutGroupDialog,
                value: TFS_Dialogs_LayoutGroup.IGroupData,
                loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
                errorMessageArea: Notifications.MessageAreaControl,
                succeeded: boolean) => {
                if (succeeded) {
                    if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                        this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                    }
                    this._options.refresh(dialog.selectedPageId, value.id);
                }
            },
            tfsContext: this._options.tfsContext,
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Add,
            page: page
        };
        ControlsDialogs.show(TFS_Dialogs_LayoutGroup.WorkItemLayoutGroupDialog, options);
    }

    public edit(page: Page, section: Section, group: Group): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;

        const groupData: TFS_Dialogs_LayoutGroup.IGroupData = {
            id: group.id,
            name: group.label,
            existing: true,
            sectionId: section.id
        };
        const options: TFS_Dialogs_LayoutGroup.IWorkItemLayoutGroupDialogOptions = {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            model: groupData,
            okCallback: (
                dialog: TFS_Dialogs_LayoutGroup.WorkItemLayoutGroupDialog,
                value: TFS_Dialogs_LayoutGroup.IGroupData,
                loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
                errorMessageArea: Notifications.MessageAreaControl,
                succeeded: boolean) => {
                if (succeeded) {
                    if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                        this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                    }
                    this._options.refresh(dialog.selectedPageId, value.id);
                }
            },
            tfsContext: this._options.tfsContext,
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Edit,
            disableColumn: group.inherited,
            page: page
        };
        ControlsDialogs.show(TFS_Dialogs_LayoutGroup.WorkItemLayoutGroupDialog, options);
    }

    public remove(page: Page, section: Section, group: Group): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        Utils.getProcessClient().removeGroup(this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, page.id, section.id, group.id).then(
            () => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh();

                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.Process.AREA,
                    CustomerIntelligenceConstants.Process.LAYOUT_VIEW,
                    {
                        "event": "removeGroupFromLayout",
                        "process": this._options.getProcess() ? this._options.getProcess().name : "",
                        "isSytemProcess": this._options.getProcess() && this._options.getProcess().isSystem,
                        "isInheritedProcess": this._options.getProcess() && this._options.getProcess().isInherited,
                        "workItemType": this._options.getWorkItemType() ? this._options.getWorkItemType().name : "",
                    }));
            },
            (error) => {

                const options: AdminDialogFieldContracts.ErrorMessageDialogOptions = {
                    title: AdminResources.AdminLayoutRemoveGroupDialogTitle,
                    contentText: AdminResources.AdminLayoutRequestFailureMessage
                };

                ControlsDialogs.show(TFS_Admin_Dialogs.ErrorMessageDialog, options);
            });
    }

    public move(page: Page, group: Group, targetSectionId: string, sourceSectionId: string): void {

        if (sourceSectionId === null) {
            sourceSectionId = targetSectionId;
        }

        const moveGroup = () => {
            Utils.getProcessClient().moveGroupToSection(group, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, page.id, targetSectionId, group.id, sourceSectionId)
                .then(
                () => {
                    // modify the group's section membership in Layout object (remove from source section and add to target section in the required order)
                    // otherwise we wont be able to move it back to its previous section without refreshing the page
                    const sourceSection = AdminProcessCommon.ProcessLayoutHelpers.sectionFromId(page, sourceSectionId);
                    const targetSection = AdminProcessCommon.ProcessLayoutHelpers.sectionFromId(page, targetSectionId);
                    const targetGroup = AdminProcessCommon.ProcessLayoutHelpers.groupFromId(this._options.getWorkItemType().layout, group.id);

                    if (sourceSection) {
                        sourceSection.groups = $.grep(sourceSection.groups, function (g: Group) { return g.id !== group.id; });
                    } else {
                        targetSection.groups = $.grep(targetSection.groups, function (g: Group) { return g.id !== group.id; });
                    }

                    const targetGroupOrder = group.order !== null && group.order !== undefined ? group.order : targetSection.groups.length;
                    targetSection.groups.splice(targetGroupOrder, 0, targetGroup);

                },
                (error) => {
                    if (error && error.status < 500) {
                        this._options.setError(error.message);
                    } 
                    else {
                        this._options.setError(AdminResources.AdminLayoutMoveRequestFailureDragDropDisabledMessage);
                    }
                    this._options.disableOrdering();
                });
        };

        if (this._options.getWorkItemType().customization === CustomizationType.System) {
            this._createChildWorkItemType(() => {
                moveGroup();
            });
        } else {
            moveGroup();
        }
    }

    public setVisible(page: Page, section: Section, group: Group, visible: boolean): void {
        const editedGroup: Group = $.extend(true, {}, group, {
            controls: null,
            visible: visible,
            order: null,
            overridden: null,
            inherited: null
        });
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;

        const editGroup = () => {
            Utils.getProcessClient().updateGroup(editedGroup, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, page.id, section.id, group.id).then(
            () => {
                if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                    this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                }
                this._options.refresh();
            },
            (error) => {
                const options: AdminDialogFieldContracts.ErrorMessageDialogOptions = {
                    title: Utils_String.format(
                        AdminResources.AdminLayoutShowHideErrorDialogTitle,
                        visible ? AdminResources.Show : AdminResources.Hide,
                        AdminResources.Group
                    ),
                    contentText: AdminResources.AdminLayoutRequestFailureMessage
                };

                ControlsDialogs.show(TFS_Admin_Dialogs.ErrorMessageDialog, options);
            });
        };

        // if the inhertied type has already been created, we
        // can directly edit the group.  otherwise we have to
        // create the inherited type and then edit the group.
        if (this._options.getWorkItemType().customization !== CustomizationType.System) {
            editGroup();
        } else {
            this._createChildWorkItemType((workItemTypeId: string) => {
                editGroup();
            });
        }
    }
}

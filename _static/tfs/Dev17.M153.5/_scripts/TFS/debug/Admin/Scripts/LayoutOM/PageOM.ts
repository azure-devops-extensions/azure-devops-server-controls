import * as Utils_String from "VSS/Utils/String";
import * as AdminDialogFieldContracts from "Admin/Scripts/TFS.Admin.Dialogs.FieldContracts";
import * as TFS_Dialogs_LayoutPage from "Admin/Scripts/Dialogs/WorkItemLayoutPageDialog";
import * as Notifications from "VSS/Controls/Notifications";
import * as AdminCommonLoadingOverlay from "Admin/Scripts/Common/LoadingOverlay";
import { ILayoutOMOptions } from "Admin/Scripts/LayoutOM/ProcessLayoutOM";
import * as ControlsDialogs from "VSS/Controls/Dialogs";
import * as WorkItemDialogBase from "Admin/Scripts/Dialogs/WorkItemDialogBase";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import { CustomizationType }  from "TFS/WorkItemTracking/ProcessContracts"; 
import { Page } from "TFS/WorkItemTracking/ProcessContracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as TFS_Admin_Dialogs from "Admin/Scripts/TFS.Admin.Dialogs";
import { Utils } from "Admin/Scripts/Common/Utils";

export class PageOM {
    constructor(
        private readonly _options: ILayoutOMOptions,
        private readonly _createChildWorkItemType: (callback?: (workItemTypeId: string) => void) => void,
    ) { }
    public add(): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        ControlsDialogs.show(TFS_Dialogs_LayoutPage.WorkItemLayoutPageDialog, {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            okCallback: (
                dialog: TFS_Dialogs_LayoutPage.WorkItemLayoutPageDialog,
                value: TFS_Dialogs_LayoutPage.IPageData,
                loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
                errorMessageArea: Notifications.MessageAreaControl,
                succeeded: boolean) => {
                if (succeeded) {
                    if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                        this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                    }
                    this._options.refresh(value.pageId);
                }
            },
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Add
        });
    }

    public edit(page: Page): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        ControlsDialogs.show(TFS_Dialogs_LayoutPage.WorkItemLayoutPageDialog, {
            workItemType: this._options.getWorkItemType(),
            processId: this._options.getProcess().processTypeId,
            model: <TFS_Dialogs_LayoutPage.IPageData>{
                pageId: page.id,
                pageLabel: page.label,
                order: page.order,
                numSections: page.sections.length
            },
            okCallback: (
                dialog: TFS_Dialogs_LayoutPage.WorkItemLayoutPageDialog,
                value: TFS_Dialogs_LayoutPage.IPageData,
                loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
                errorMessageArea: Notifications.MessageAreaControl,
                succeeded: boolean) => {
                if (succeeded) {
                    if (this._options.getWorkItemType().referenceName !== oldWorkItemTypeId) {
                        this._options.addHistoryPoint({ type: this._options.getWorkItemType().referenceName });
                    }
                    this._options.refresh(value.pageId);
                }
            },
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Edit
        });
    }

    public move(page: Page, order: number): void {
        const movedPage: Page = $.extend({}, page);
        movedPage.order = order;
        movedPage.sections = null; // we need to set sections as null in order to edit the page

        const movePage = () => {
          Utils.getProcessClient().updatePage(movedPage, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName).then(
                () => {
                    const oldIndex = Utils_Array.findIndex(this._options.getWorkItemType().layout.pages, (p: Page) => {
                        return p.id === page.id;
                    });
                    this._options.getWorkItemType().layout.pages = Utils_Array.reorder(this._options.getWorkItemType().layout.pages, oldIndex, order, 0);
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
                movePage();
            });
        } else {
            movePage();
        }
    }

    public remove(page: Page): void {
        if (!page.isContribution) {
           Utils.getProcessClient().removePage(this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName, page.id).then(
                () => {
                    this._options.getWorkItemType().layout.pages = $.grep(this._options.getWorkItemType().layout.pages, function (p: Page) { return p.id !== page.id; });
                },
                (error) => {
                    const options: AdminDialogFieldContracts.ErrorMessageDialogOptions = {
                        title: AdminResources.AdminLayoutRemovePageDialogTitle,
                        contentText: AdminResources.AdminLayoutRequestFailureMessage
                    };

                    ControlsDialogs.show(TFS_Admin_Dialogs.ErrorMessageDialog, options);
                });
        }
    }

    public setVisible(page: Page, visible: boolean): void {
        const oldWorkItemTypeId = this._options.getWorkItemType().referenceName;
        const editedPage: Page = $.extend(true, {}, page, {
            visible: visible,
            sections: null
        });

        const editPage = () => {
            Utils.getProcessClient().updatePage(editedPage, this._options.getProcess().processTypeId, this._options.getWorkItemType().referenceName).then(
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
                        AdminResources.Page
                    ),
                    contentText: AdminResources.AdminLayoutRequestFailureMessage
                };

                ControlsDialogs.show(TFS_Admin_Dialogs.ErrorMessageDialog, options);
            });
        };

        if (this._options.getWorkItemType().customization !== CustomizationType.System) {
            editPage();
        } else {
            this._createChildWorkItemType((workItemTypeId: string) => {
                editPage();
            });
        }
    }
}

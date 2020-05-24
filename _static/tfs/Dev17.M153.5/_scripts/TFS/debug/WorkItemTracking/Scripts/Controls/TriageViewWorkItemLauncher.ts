import Controls = require("VSS/Controls");
import { WorkItemForm } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { IShowWorkItemFormOptions } from "WorkItemTracking/Scripts/OM/TriageViewInterfaces";

export namespace TriageViewWorkItemLauncher {
    let workItemForm: WorkItemForm;

    /**
     * Shows a workitem in triageview
     * @param id id of the workitem
     * @param workItemoptions IShowWorkItemFormOptions
     * @param forceShow Optional boolean, If true will show the workitem even if it is in the view
     * @param forceCreateForm Optional boolean, If true will recreate workitem form object
     * @param errorCallback Optional error callback, invoked after work item form is failed to show work item.
     */
    export function showWorkItem(id: number, workItemoptions: IShowWorkItemFormOptions, forceShow?: boolean, forceCreateForm?: boolean, errorCallback?: (error: any) => void) {
        if (!workItemoptions.container) {
            return;
        }

        if (!workItemForm || forceCreateForm) {

            const tabHandler = (e: JQueryKeyEventObject): boolean => {
                if (workItemForm && workItemForm.getElement().is(":visible") && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                    workItemForm.focus({ force: true });
                    e.preventDefault();
                    return false;
                }
                return true;
            };

            const toolbarOptions = {
                toolbar: {
                    inline: true,
                    showFullScreenMenu: false
                },
                headerToolbar: {
                    workItemsNavigator: workItemoptions.workItemsNavigator,
                    showWorkItemMenus: false
                }
            };

            workItemForm = <WorkItemForm>Controls.BaseControl.createIn(WorkItemForm, workItemoptions.container,
                {
                    ...toolbarOptions,
                    tfsContext: workItemoptions.tfsContext,
                    infoBar: {
                        options: {
                            workItemsNavigator: workItemoptions.workItemsNavigator
                        }
                    },
                    close: function () {
                        return false;
                    },
                    formViewType: WorkItemFormView
                });

            workItemoptions.grid.attachTabBehavior(this._tabHandler);
        }

        const start = () => {
            const options = { "forceShow": forceShow };
            if (QueryResultsProvider.isRecycleBinQueryResultsProvider(workItemoptions.workItemsProvider)) {
                $.extend(options, { isDeleted: true });
            }

            workItemForm.beginShowWorkItem(
                id,
                () => {
                    if (workItemoptions.workItemsNavigator) {
                        workItemoptions.workItemsNavigator.prefetchNextAvailableWorkItem(workItemoptions.tfsContext);
                    }
                },
                (error) => errorCallback && errorCallback(error),
                options,
                null
            );
        };

        if (id) {
            workItemForm.showElement();
            start();
        } else {
            unBindWorkItem();
        }
    }

    export function unBindWorkItem(detachLayout?: boolean) {
        if (workItemForm) {
            workItemForm.unbind(detachLayout);
            workItemForm.hideElement();
        }
    }
}
import * as React from "react";
import VSS = require("VSS/VSS");
import Performance = require("VSS/Performance");

import Events_Action = require("VSS/Events/Action");
import { registerLWPComponent, getLWPService } from "VSS/LWP";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";

import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";

import * as WITControls_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls";
import { handleError } from "VSS/VSS";

/** Keep track of required module to allow sub-sequent calls to be synchronous */
let witControlsModule: typeof WITControls_Async = null;

/**
 * Open the given work item in a dialog
 * @param workItem Work item to open
 * @param options Optional parameters for dialog
 */
export function showWorkItem(workItem: WorkItem, options?: WITControls_Async.IWorkItemDialogOptions): void {
    ensureModules(witModule => {
        witModule.WorkItemFormDialog.showWorkItem(workItem, options);
    });
}

/**
 * Open the work item identified by the given id
 * @param workItemId Id of work item to open
 * @param options Optional parameters for dialog
 */
export function showWorkItemById(workItemId: number, options?: any): void;
/**
 * Open the work item identified by the given id
 * @param workItemId Id of work item to open
 * @param tfsContext Tfs context to use
 * @param options Optional parameters for dialog
 */
export function showWorkItemById(workItemId: number, tfsContext: TFS_Host_TfsContext.TfsContext, options?: any): void;
export function showWorkItemById(workItemId: number, tfsContext: TFS_Host_TfsContext.TfsContext | any, options?: any) {
    let tfsContextToUse: TFS_Host_TfsContext.TfsContext;
    let optionsToUse: any;

    if (arguments.length === 3) {
        tfsContextToUse = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        optionsToUse = options;
    } else {
        tfsContextToUse = TFS_Host_TfsContext.TfsContext.getDefault();
        optionsToUse = tfsContext;
    }

    ensureModules(() => {
        Events_Action.getService().performAction(WorkItemActions.ACTION_WORKITEM_OPEN, {
            id: workItemId,
            tfsContext: tfsContextToUse,
            options: optionsToUse
        });
    });
}

export function showWorkItemDialogById(
    workItemId: number,
    tfsContext: TFS_Host_TfsContext.TfsContext,
    options?: WITControls_Async.IWorkItemDialogOptions,
    tryGetLatest?: boolean
) {
    ensureModules(() => {
        Events_Action.getService().performAction(WorkItemActions.ACTION_WORKITEM_OPEN_DIALOG, {
            id: workItemId,
            tfsContext: tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(),
            options: options,
            tryGetLatest: tryGetLatest
        });
    });
}

export function showNewWorkItemDialog(
    workItemTypeName: string,
    initialValues: { [fieldName: string]: any },
    tfsContext: TFS_Host_TfsContext.TfsContext,
    options?: WITControls_Async.IWorkItemDialogOptions
) {
    ensureModules(() => {
        Events_Action.getService().performAction(WorkItemActions.ACTION_WORKITEM_NEW_DIALOG, {
            workItemTypeName: workItemTypeName,
            tfsContext: tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(),
            initialValues: initialValues,
            options: options
        });
    });
}

/**
 * Open the work item identified by the given id in a new tab
 * @param workItemId Id of work item to open
 * @param tfsContext Tfs context to use
 */
export function showWorkItemByIdInNewTab(workItemId: number, tfsContext?: TFS_Host_TfsContext.TfsContext): void {
    tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

    const url = tfsContext.getPublicActionUrl(ActionUrl.ACTION_EDIT, "workitems", { parameters: workItemId });
    window.open(url);
}

/**
 * Create a new work item
 * @param workItemTypeName Name of work item type to create new work item from
 * @param tfsContext Tfs context to use
 * @param initialValues Optional initial values to set
 */
export function createNewWorkItem(
    workItemTypeName: string,
    tfsContext?: TFS_Host_TfsContext.TfsContext,
    initialValues?: IDictionaryStringTo<any>
): void {
    tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

    ensureModules(() => {
        Events_Action.getService().performAction(WorkItemActions.ACTION_WORKITEM_NEW, {
            workItemTypeName: workItemTypeName,
            tfsContext: tfsContext,
            initialValues: initialValues
        });
    });
}

interface INewWorkItemDialogComponentProps {
    workItemTypeName: string;

    onDismiss: () => void;
}

class NewWorkItemDialogComponent extends React.Component<INewWorkItemDialogComponentProps, {}> {
    public static componentType = "createNewWorkItemDialog";

    public render(): null {
        showNewWorkItemDialog(this.props.workItemTypeName, null, null, { close: this.props.onDismiss });
        return null;
    }
}

registerLWPComponent(NewWorkItemDialogComponent.componentType, NewWorkItemDialogComponent);

interface IWorkItemDialogComponentProps {
    workItemId: number;
    options?: WITControls_Async.IWorkItemDialogOptions;
    onDismiss: () => void;
}

class WorkItemDialogComponent extends React.Component<IWorkItemDialogComponentProps, {}> {
    public static readonly componentType = "WorkItemDialog";

    public render(): null {
        return null;
    }

    public componentDidMount(): void {
        const { workItemId, onDismiss } = this.props;
        const options = this.props.options || {};

        showWorkItemDialogById(workItemId, null, {
            ...options,
            close: (workItem: WorkItem) => {
                if (options.close) {
                    options.close(workItem);
                }

                onDismiss();
            }
        });
    }
}

registerLWPComponent(WorkItemDialogComponent.componentType, WorkItemDialogComponent);

/**
 * Prefetch scripts required for displaying a work item form
 * @param tfsContext Optional tfs context to determine form state
 */
export function prefetchFormModules(tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault()): IPromise<void> {
    return determineModulesToLoad().then(modules => VSS.requireModules(modules));
}

/**
 * Shows work item in a modal view.
 * It will show workitem either in dialog mode or panel mode depending on if user has social work item feature turned on
 * @param workItemId ID of the work item
 * @param options Optional options to be passed to the modal. Casting it as "any" as it can either be work item dialog options (from old plat) or work item panel options (from new plat)
 */
export function showWorkItemModal(workItemId: number, options?: any) {
    const workItemService = getLWPService("work-item-service");

    // if workItemService cannot be loaded, which will happen for old hubs (like old boards/backlogs hub), then render the dialog.
    if (workItemService) {
        workItemService.openWorkItem(workItemId, options);
    } else {
        showWorkItemDialogById(workItemId, null, options);
    }
}

function ensureModules(callback: (mod: typeof WITControls_Async) => void) {
    if (!witControlsModule) {
        const witFormScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario("WIT", "FormShim.LoadModules");

        determineModulesToLoad().then(
            modules =>
                VSS.requireModules(modules).spread((WITControls: typeof WITControls_Async) => {
                    witControlsModule = WITControls;

                    callback(witControlsModule);

                    witFormScenario.end();
                }),
            handleError
        );
    } else {
        const witFormScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario("WIT", "FormShim");
        callback(witControlsModule);
        witFormScenario.end();
    }
}

function determineModulesToLoad(): IPromise<string[]> {
    return WitFormModeUtility.ensureWitFormModeLoaded().then(() => {
        return ["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"];
    });
}

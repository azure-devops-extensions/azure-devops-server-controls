import * as Diag from "VSS/Diag";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { WorkHubShortcutGroup } from "WorkItemTracking/Scripts/WorkShortcutGroup";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { WorkItemsHubCommandProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubCommandProvider";
import { WorkItemsHubView } from "WorkItemsHub/Scripts/Components/WorkItemsHubView";
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

export class WorkItemsHubShortcutGroup extends ShortcutGroupDefinition {
    public static readonly Filter = "mod+shift+f";
    public static readonly CopyToClipboard = "mod+c";
    public static readonly Delete = "del";

    constructor(protected _commandProvider: WorkItemsHubCommandProvider, protected _workItemsHubView: WorkItemsHubView, hubViewState: IVssHubViewState) {
        super(Resources.KeyboardShortcutGroup_WorkItems);

        // register work page shortcuts
        new WorkHubShortcutGroup(hubViewState);
    }

    /**
     * Reregisters shortcuts for Work Items Hub.
     * @param scopeElement Element to scope the shortcuts to
     */
    public reregisterWorkItemsHubShortcuts(scopeElement: Element): void {
        Diag.Debug.assertIsNotNull(scopeElement, "scopeElement should not be null or undefined");

        this.unRegisterShortcut(WorkItemsHubShortcutGroup.Filter);
        this.registerShortcut(
            WorkItemsHubShortcutGroup.Filter,
            {
                description: WITResources.KeyboardShortcutDescription_FilterResults,
                action: () => this._workItemsHubView.activateFilter(),
                globalCombos: [WorkItemsHubShortcutGroup.Filter]
            }
        );

        this.unRegisterShortcut(WorkItemsHubShortcutGroup.CopyToClipboard);
        this.registerShortcut(
            WorkItemsHubShortcutGroup.CopyToClipboard,
            {
                description: WITResources.CopyToClipboard,
                action: () => this._commandProvider.copyWorkItemsToClipboard(true),
                element: scopeElement,
                globalCombos: [WorkItemsHubShortcutGroup.CopyToClipboard]
            }
        );

        this.unRegisterShortcut(WorkItemsHubShortcutGroup.Delete);
        if(this._commandProvider.getDeleteHelper().hasDeletePermission()) {
            this.registerShortcut(
                WorkItemsHubShortcutGroup.Delete,
                {
                    description: WITResources.DeleteSelectedWorkItems,
                    action: () => this._commandProvider.deleteWorkItems(true),
                    element: scopeElement,
                    globalCombos: [WorkItemsHubShortcutGroup.Delete]
                }
            );
        }
    }
}

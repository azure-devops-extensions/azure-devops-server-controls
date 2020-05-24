import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { ICapacityActionContext, ICapacityState, LoadingStatus } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";

/**
 * Build capacity specific commands
 * @param capacityContext The pivot context
 * @param capacityState The next state of the capacity pivot
 */
export function getCapacityCommands(capacityContext: ICapacityActionContext, capacityState: ICapacityState): IPivotBarAction[] {
    const allCommandsDisabled = capacityState.capacityDataStatus === LoadingStatus.Loading
        || (capacityState.asyncOperationStatus && capacityState.asyncOperationStatus.inprogress)
        || (capacityState.capacityOptions && !capacityState.capacityOptions.isEditable);

    const disableSave = !capacityState.isValid; // Cannot save if in invalid state, but can undo
    const disableSaveAndUndo = !capacityState.isDirty || allCommandsDisabled;

    return [
        {
            key: "new-item",
            disabled: allCommandsDisabled,
            name: CapacityPivotResources.AddUser,
            iconProps: {
                iconName: "bowtie-math-plus-light",
                iconType: VssIconType.bowtie
            },
            important: true,
            onClick: capacityContext.onAddNewItem
        },
        {
            key: "save-capacity",
            disabled: disableSaveAndUndo || disableSave,
            name: CapacityPivotResources.Save,
            iconProps: {
                iconName: "bowtie-save",
                iconType: VssIconType.bowtie
            },
            important: true,
            onClick: capacityContext.onSaveCapacity
        },
        {
            key: "undo-changes",
            disabled: disableSaveAndUndo,
            name: CapacityPivotResources.Undo,
            iconProps: {
                iconName: "bowtie-edit-undo",
                iconType: VssIconType.bowtie
            },
            important: true,
            onClick: capacityContext.onUndoChanges
        },
        {
            key: "add-missing-team-members",
            disabled: allCommandsDisabled,
            name: CapacityPivotResources.AddMissingTeamMembers,
            iconProps: {
                iconName: "bowtie-add-team",
                iconType: VssIconType.bowtie
            },
            important: false,
            onClick: capacityContext.onAddMissingTeamMembers
        },
        {
            key: "copy-capacity",
            disabled: allCommandsDisabled || !capacityContext.pivotContext.previousIteration,
            name: CapacityPivotResources.Copy,
            iconProps: {
                iconName: "bowtie-edit-copy",
                iconType: VssIconType.bowtie
            },
            important: false,
            onClick: capacityContext.onCopyCapacity
        }
    ];
}

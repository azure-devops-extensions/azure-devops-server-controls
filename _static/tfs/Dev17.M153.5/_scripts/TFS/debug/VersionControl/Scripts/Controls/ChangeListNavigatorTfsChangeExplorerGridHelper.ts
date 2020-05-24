import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import VCChangeListNavigatorChangeExplorerGrid = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid");
import VCChangeListNavigatorChangeExplorerGridHelper = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGridHelper");
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

export class TfsChangeExplorerGridHelper extends VCChangeListNavigatorChangeExplorerGridHelper.ChangeExplorerGridHelper {

    constructor(grid: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid) {
        super(grid);
    }

    public getGridItemIconCss(change: VCLegacyContracts.Change) {
        let css = "type-icon bowtie-icon ";

        if ((<VCLegacyContracts.TfsItem>change.item).isBranch && (<VCLegacyContracts.TfsItem>change.item).isFolder) {
            css += "bowtie-tfvc-branch";
        }
        else if (change.item.isFolder) {
            css += "bowtie-folder";
        }
        else {
            css += VCFileIconPicker.getIconNameForFile(change.item.serverItem);
        }

        return css;
    }

    public getGridItemType(change: VCLegacyContracts.Change) {
        let type: ChangeExplorerItemType = ChangeExplorerItemType.File;
        let tfsItem = <VCLegacyContracts.TfsItem>change.item;

        // All Shelveset items (files and folders) within a newly created branch have isBranch=true, so just check isFolder.
        if (tfsItem.isFolder || (!tfsItem.isPendingChange && tfsItem.isBranch)) {
            type = ChangeExplorerItemType.Folder;
        }

        return type;
    }

    public getParentKey(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        return gridItem.parentFolder.toLowerCase();
    }

    public getPathLookupKey(path: string) {
        return path.toLowerCase();
    }
}

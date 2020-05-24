import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import {ChangeExplorerItemType} from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerItemType";
import VCChangeListNavigatorChangeExplorer = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer");
import VCChangeListNavigatorChangeExplorerGrid = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid");
import VCChangeListNavigatorChangeExplorerGridHelper = require("VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGridHelper");
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

export class GitChangeExplorerGridHelper extends VCChangeListNavigatorChangeExplorerGridHelper.ChangeExplorerGridHelper {

    private _repositoryContext: GitRepositoryContext;

    constructor(grid: VCChangeListNavigatorChangeExplorerGrid.ChangeExplorerGrid, repositoryContext: RepositoryContext) {
        super(grid);

        this._repositoryContext = <GitRepositoryContext>repositoryContext;
    }

    public setGridSource(keepSelection: boolean, keepExpandStates: boolean) {
        this.getGrid().setGridSource(keepSelection, keepExpandStates);
    }

    public getGridItemIconCss(change: VCLegacyContracts.Change) {
        let item: VCLegacyContracts.GitItem = <VCLegacyContracts.GitItem> change.item;
        let css = "type-icon bowtie-icon ";
        css += item.isFolder ? "bowtie-folder" : VCFileIconPicker.getIconNameForFile(item.serverItem);
        return css;
    }

    public getCellCssClass(changeType: ChangeExplorerItemType) {
        let cssClass: string;
        switch (changeType) {
            case ChangeExplorerItemType.Folder:
                cssClass = "folder-item";
                break;

            case ChangeExplorerItemType.File:
                cssClass = "file-item";
                break;

            case ChangeExplorerItemType.DiscussionComment:
                cssClass = "discussion-item";
                break;

            case ChangeExplorerItemType.InformationMessage:
                cssClass = "message-item";
                break;
        }

        return cssClass;
    }

    public getGridItemType(change: VCLegacyContracts.Change) {
        let item: VCLegacyContracts.GitItem = <VCLegacyContracts.GitItem> change.item,
            type: ChangeExplorerItemType = ChangeExplorerItemType.File;

        if (item.isFolder) {
            type = ChangeExplorerItemType.Folder;
        }

        return type;
    }

    public getParentKey(gridItem: VCChangeListNavigatorChangeExplorer.ChangeExplorerItem) {
        return gridItem.parentFolder;
    }

    public getPathLookupKey(path: string) {
        return path;
    }
}

import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCChangeListSummaryFilesControl = require("VersionControl/Scripts/Controls/ChangeListSummaryFilesControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import domElem = Utils_UI.domElem;

export class DiffChangeListControl extends VCChangeListSummaryFilesControl.FilesSummaryControl {

    private getGitContext() {
        return <GitRepositoryContext>this._repositoryContext;
    }

    public _onMoreChangesClick() {
        // Double the number of changes (fetch at least 1000 items)
        let maxChanges = Math.max(1000, 2 * this._changeListModel.changes.length);

        this.getGitContext().getGitClient().beginGetCommitFileDiff(
            this.getGitContext(),
            this._oversion,
            this._mversion,
            maxChanges,
            this._changeListModel.changes.length,
            (resultModel) => {

                let changes = resultModel.changes,
                    changeCounts: any;

                this._changeListModel.changes = (this._changeListModel.changes || []).concat(changes);
                this._changeListModel.allChangesIncluded = resultModel.allChangesIncluded;

                changeCounts = resultModel.changeCounts;
                if (changeCounts) {
                    if (this._changeListModel.changeCounts) {
                        $.each(this._changeListModel.changeCounts, (changeType, count) => {
                            changeCounts[changeType] = (changeCounts[changeType] || 0) + count;
                        });
                    }
                    this._changeListModel.changeCounts = changeCounts;
                }

                this.refreshChangedFiles();

                // If someone wants to be notified when this control updates the
                // the ChangesModel changes, then notify them now.
                if (this._options.changesModelChangesChangedCallback) {
                    this._options.changesModelChangesChangedCallback();
                }
            });
    }

    public _getContextMenuItems(repositoryContext: RepositoryContext, path: string, changeList: VCLegacyContracts.ChangeList, change: VCLegacyContracts.Change) {
        let menuItems: any[] = [];

        menuItems.push({
            id: "explore-as-of-version",
            text: Utils_String.format(VCResources.ExploreSpecificVersionMenuText, VCSpecs.VersionSpec.parse(this._mversion).toDisplayText()),
            title: VCResources.ExploreThisVersionMenuTooltip,
            icon: "bowtie-icon bowtie-folder"
        });

        menuItems.push({ separator: true });

        menuItems.push({ id: "view-content", text: VCResources.ViewContentsMenu });
        menuItems.push({ id: "view-history", text: VCResources.ViewHistory, icon: "bowtie-icon bowtie-navigate-history" });

        if (!VCOM.ChangeType.hasChangeFlag(change.changeType, VCLegacyContracts.VersionControlChangeType.Delete)) {
            menuItems.push({ separator: true });

            menuItems.push({
                id: "download",
                text: VCResources.DownloadFile,
                icon: "bowtie-icon bowtie-transfer-download",
                action: "navigate",
                "arguments": {
                    url: VersionControlUrls.getFileContentUrl(repositoryContext, path, changeList.version),
                    target: "_blank"
                }
            });
        }

        if (this._discussionManager) {
            menuItems.push({ separator: true });

            menuItems.push({
                id: "add-file-discussion",
                text: VCResources.AddCommentAction,
                icon: "bowtie-icon bowtie-comment-add",
                arguments: {
                    discussionManager: this._discussionManager,
                    itemPath: path
                }
            });
        }

        return menuItems;
    }

    public _createFileLink($container: JQuery, changeEntry: VCLegacyContracts.Change, linkText: string, initialState: any) {
        let action: string,
            params: any;

        // deletes don't actually get a link
        if (changeEntry.changeType !== VCLegacyContracts.VersionControlChangeType.Delete) {
            params = {
                version: this._mversion
            };
            if (VCOM.ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Edit)) {
                action = VCControlsCommon.VersionControlActionIds.Compare;
                params.oversion = this._oversion;

                if (VCOM.ChangeType.hasChangeFlag(changeEntry.changeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
                    params.opath = changeEntry.sourceServerItem;
                }
            }
            else {
                action = VCControlsCommon.VersionControlActionIds.Contents;
            }

            $("<a />")
                .addClass("file-name-link")
                .attr("href", VersionControlUrls.getExplorerUrl(this._repositoryContext, changeEntry.item.serverItem, action, params))
                .text(linkText)
                .appendTo($container);
        }
        else {
            $(domElem("span"))
                .text(linkText)
                .appendTo($container);
        }
    }
}

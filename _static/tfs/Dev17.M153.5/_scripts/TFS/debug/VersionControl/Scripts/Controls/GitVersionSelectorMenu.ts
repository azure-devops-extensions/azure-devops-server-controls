/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import * as Q from "q";

import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");
import * as Utils_UI from "VSS/Utils/UI";

import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { IGitVersionSelector, IGitVersionSelectorItem } from "TFS/VersionControl/Controls";
import VCContracts = require("TFS/VersionControl/Contracts");

import { GitClientService } from "VersionControl/Scripts/GitClientService";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { GitVersionSelectorControl, GitVersionSelectorControlOptions } from "VersionControl/Scripts/Controls/GitVersionSelectorControl";

export interface GitVersionSelectorMenuOptions extends TFS_FilteredListDropdownMenu.IFilteredListDropdownMenuOptions {
    /** Hides the "Tags" tab */
    disableTags?: boolean,
    /** Hides the "Branches" tab */
    disableBranches?: boolean,
    /** Hides the "Mine" tab populated with branches created or favorited by the user, plus the default branch. Defaults false.  */
    disableMyBranches?: boolean,
    /** Shows the "Commit" tab */
    showCommits?: boolean,
    /** Shows action menu items (Example: New branch) */
    showVersionActions?: boolean,
    /** Waits until asynchronously fetched branches/tags arrive before taking action on the Enter key */
    waitOnFetchedItems?: boolean,
    /** Includes basic popup alignments and optionally allowUnmatchedSelection (for backward compat). */
    popupOptions?: any,
    /** Allows returning the search string as the selected item even if it does not match any items in the list. */
    allowUnmatchedSelection?: boolean,
    /** Default place holder text to fill the selector. */
    placeholder?: string,
}

export class GitVersionSelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu implements IGitVersionSelector {

    protected _repositoryContext: GitRepositoryContext;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
            },
            ariaDescribedByText: VCResources.GitVersionSelectorDescribe,
            setMaxHeightToFitWindow: true,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });

        // ARIA attributes.  Because of the complexity of the control, consider this a button that shows a dialog.
        this._element.attr("role") || this._element.attr("role", "button");
        this._getPopupEnhancement().getElement().attr("role", "dialog");
    }

    public setRepository(repositoryContext: GitRepositoryContext) {
        this._repositoryContext = repositoryContext;
        if (this.gitVersionSelectorControl) {
            this.gitVersionSelectorControl.setRepository(repositoryContext);
        }
    }

    public setRepositoryId(repositoryId: string): IPromise<VCContracts.GitRepository> {
        const tfsContext = TfsContext.getDefault();
        const gitService = <GitClientService>ProjectCollection.getConnection(tfsContext).getService(GitClientService);
        return Q.Promise<VCContracts.GitRepository>((resolve, reject) => {
            gitService.beginGetRepository(repositoryId, (repository: VCContracts.GitRepository) => {
                const repositoryContext = GitRepositoryContext.create(repository, tfsContext);
                this.setRepository(repositoryContext);
                resolve(repository);
            }, reject);
        });
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return Controls.Enhancement.enhance(
            GitVersionSelectorControl, $container, {
            repositoryContext: this._repositoryContext,
            disableTags: (this._options ? this._options.disableTags : null),
            showCommits: (this._options ? this._options.showCommits : null),
            disableBranches: (this._options ? this._options.disableBranches : null),
            disableMyBranches: this._options.disableMyBranches,
            showVersionActions: this._options.showVersionActions,
            allowUnmatchedSelection: this._options.allowUnmatchedSelection || this._options.popupOptions.allowUnmatchedSelection,
            waitOnFetchedItems: this._options.waitOnFetchedItems,
            customerIntelligenceData: this._options.customerIntelligenceData,
            elementToFocusOnDismiss: this._element[0],
        } as GitVersionSelectorControlOptions) as GitVersionSelectorControl;
    }

    public _getItemIconClass(item: any): string {
        if (item instanceof VCSpecs.GitBranchVersionSpec) {
            return "bowtie-icon bowtie-tfvc-branch";
        }
        else if (item instanceof VCSpecs.GitTagVersionSpec) {
            return "bowtie-icon bowtie-tag";
        }
        else if (item instanceof VCSpecs.GitCommitVersionSpec) {
            return "bowtie-icon bowtie-tfvc-commit";
        }
    }

    protected _getItemIconAriaLabel(item: any): string {
        if (item instanceof VCSpecs.GitBranchVersionSpec) {
            return VCResources.GitRefBranch;
        }
        else if (item instanceof VCSpecs.GitTagVersionSpec) {
            return VCResources.GitRefTag;
        }
        else if (item instanceof VCSpecs.GitCommitVersionSpec) {
            return VCResources.GitRefCommit;
        }
    }

    public _getItemDisplayText(item: any): string {
        if (item instanceof VCSpecs.GitBranchVersionSpec) {
            return (<VCSpecs.GitBranchVersionSpec>item).branchName || "";
        }
        else if (item instanceof VCSpecs.GitTagVersionSpec) {
            return (<VCSpecs.GitTagVersionSpec>item).tagName || "";
        }
        else if (item instanceof VCSpecs.GitCommitVersionSpec) {
            return (<VCSpecs.GitCommitVersionSpec>item).getShortCommitId();
        }
        else if (item) {
            return item.toDisplayText();
        }
        else if (this._options.placeholder) {
            return this._options.placeholder;
        }
        else if (this._options.disableBranches) {
            return VCResources.SelectTag;
        }
        else {
            return VCResources.SelectBranch;
        }
    }

    public _getItemTooltip(item: any): string {

        if (item instanceof VCSpecs.GitCommitVersionSpec) {
            return (<VCSpecs.GitCommitVersionSpec>item).toLongDisplayText();
        }
        else if (item) {
            return item.toDisplayText();
        }
        else {
            return "";
        }
    }

    public getSelectedVersion(): IGitVersionSelectorItem {
        return <VCSpecs.VersionSpec>this._getSelectedItem() as any;
    }

    public setSelectedVersion(versionSpec: VCSpecs.VersionSpec | IGitVersionSelectorItem) {
        if (versionSpec && !(versionSpec as VCSpecs.VersionSpec).toVersionString) {
            const gitVersion = versionSpec as IGitVersionSelectorItem;
            if (gitVersion.branchName) {
                versionSpec = new VCSpecs.GitBranchVersionSpec(gitVersion.branchName);
            }
            else if (gitVersion.tagName) {
                versionSpec = new VCSpecs.GitTagVersionSpec(gitVersion.tagName);
            }
        }

        this.setSelectedItem(versionSpec);
    }

    private get gitVersionSelectorControl() {
        return this.getFilteredList() as GitVersionSelectorControl;
    }
}

SDK_Shim.registerContent("tfs.versioncontrol.git-version-selector", (context) => {
    return Controls.create(GitVersionSelectorMenu, context.$container, context.options);
});

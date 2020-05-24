/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
import Utils_String = require("VSS/Utils/String");
import Controls = require("VSS/Controls");

import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCCreateBranchDialogBase = require("VersionControl/Scripts/Controls/CreateBranchDialogBase");
import GitRefService = require("VersionControl/Scripts/Services/GitRefService");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";

/**
* Dialog for handling branch creation from an existing git branch or tag.
* Expects options.sourceVersionSpec and an optional suggested branchName.
*/
export class CreateBranchFromVersionSpecDialog extends VCCreateBranchDialogBase.CreateBranchDialogBase {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-create-branch-from-git-ref-dialog vc-create-branch-dialog",
            okText: VCResources.CreateBranchDialogCreateButton,
            ariaAttributes: <Controls.AriaAttributes>{
                label: VCResources.CreateBranchDialogInputsDescription,
            },
        }, options));
    }

    public initialize() {
        super.initialize();
        this._sourceRefVersion(this._options.sourceVersionSpec);

        if (this._options.branchName) {
            this._branchNameInput(this._options.branchName);
            this._selectBranchNameInput();
        }
    }

    public onOkClick(e?: JQueryEventObject): any {
        this.updateOkButton(false);

        const createRefOptions = <GitRefService.ICreateRefOptions>{
            sourceRef: <VCSpecs.IGitRefVersionSpec>this._sourceRefVersion(),
            newRef: new VCSpecs.GitBranchVersionSpec(this._branchNameInput())
        };

        const gitRefService = GitRefService.getGitRefService(this._repositoryContext);
        gitRefService.createRef(createRefOptions).then(refUpdate => {
            this.setDialogResult(<VCControlsCommon.CreateBranchParameters>{
                branchName: GitRefUtility.getRefFriendlyName(refUpdate.name),
                newObjectId: refUpdate.newObjectId,
                repositoryContext: this._repositoryContext,
                workItemIdsToLink: this._workItemIdsToShow
            });

            super.onOkClick(e);
        }, (error: Error) => { this._handleError(error) });
    }

    private _handleError(error: Error) {
        const message = Utils_String.format(VCResources.CreateBranchDialogFailedToCreateBranchFromRefMessage, this._branchNameInput(), this._sourceRefVersion().toDisplayText(), error.message);
        this._setErrorMessage(message); 
    }
}

/**
* Dialog for handling branch creation as apart of an item commit
*/
export class CreateBranchFromItemDialog extends VCCreateBranchDialogBase.CreateBranchDialogBase {

    private _itemVersion: string;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-create-branch-from-item-dialog vc-create-branch-dialog",
            okText: VCResources.CreateBranchDialogCreateButton
        }, options));

        this._itemVersion = this._options.itemVersion;
    }

    public initialize() {
        super.initialize();

        this._sourceRefVersion(VCSpecs.VersionSpec.parse(this._itemVersion));
        this._addCreatePullRequestCheckbox(this._element, true);
    }

    public onOkClick(e?: JQueryEventObject): any {
        this.updateOkButton(false);

        const branchName = this._branchNameInput();
        this.setDialogResult(<VCControlsCommon.CreateBranchParameters> {
            branchName: branchName,
            switchToBranch: true,
            createPullRequest: this._createPullRequestChecked()
        });

        const commitItemCallback: (createBranchParams: VCControlsCommon.CreateBranchParameters) => JQueryPromise<VCSpecs.VersionSpec> = this._options.commitItemCallback;
        commitItemCallback(this.getDialogResult()).done(() => {
            this._repositoryContext.getGitClient().clearBranchesCache(this._repositoryContext.getRepository());
            super.onOkClick(e);
        }).fail((error: Error) => {
            this._setErrorMessage(error.message);
        });
    }
}

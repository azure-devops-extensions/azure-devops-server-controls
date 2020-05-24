import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import * as _VCCreateBranchDialog from "VersionControl/Scripts/Controls/CreateBranchDialog";
import VCLazyDialog = require("VersionControl/Scripts/Controls/LazyDialog");
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";

/**
* Show a dialog which prompts the user to enter a new branch name for an item commit to new branch operation.
* (No operation is performed, it simply runs the commitItemCallback with the new branch parameters)
*
* @param repositoryContext RepositoryContext to validate against existing branches
* @param itemPath Path to the file to be added or edited in the commit
* @param itemVersion Branch version string of the item to be commited to the new branch
* @param commitItemCallback Method invoked with create branch parameters when the user clicks OK
*/

queueModulePreload("VersionControl/Scripts/Controls/CreateBranchDialog");

export function createBranchFromItemCommit(
    repositoryContext: RepositoryContext,
    itemPath: string,
    itemVersion: string,
    commitItemCallback: (createBranchParams: VCControlsCommon.CreateBranchParameters) => JQueryPromise<VCSpecs.VersionSpec>) {

    return VCLazyDialog.show<_VCCreateBranchDialog.CreateBranchFromItemDialog>(
        "VersionControl/Scripts/Controls/CreateBranchDialog",
        (scriptType: typeof _VCCreateBranchDialog) => scriptType.CreateBranchFromItemDialog,
        {
            title: VCResources.CreateBranchDialogFromCommitTitle,
            okText: VCResources.EditFileCommit,
            width: 560,
            draggable: true,
            repositoryContext: repositoryContext,
            itemPath: itemPath,
            itemVersion: itemVersion,
            commitItemCallback: commitItemCallback
        }
    );
}

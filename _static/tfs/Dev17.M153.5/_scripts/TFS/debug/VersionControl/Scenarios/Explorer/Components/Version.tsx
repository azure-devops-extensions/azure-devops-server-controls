import * as React from "react";

import { ChangesetVersion } from "VersionControl/Scenarios/Explorer/Components/ChangesetVersion";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export const VersionContainer = VCContainer.create(
    ["version", "context", "permissions"],
    ({ versionState, repositoryContext, permissionsState }, { actionCreator }) => {
        if (permissionsState.isLoading) {
            return null;
        }
        if (!versionState.isGit) {
            return <ChangesetVersion
                version={versionState.versionSpec && versionState.versionSpec.toVersionString()}
                onShowLatestClick={() => actionCreator.goLatestChangeset("version-selector")}
            />;
        }

        const canCreateBranch = versionState.allowEditing && permissionsState.createBranch;

        return <GitRefDropdownSwitch
            className={"vc-branches-container"}
            repositoryContext={repositoryContext as GitRepositoryContext}
            viewMyBranches={permissionsState.viewMyBranches}
            versionSpec={versionState.versionSpec}
            isOpen={versionState.isBranchSelectorOpened}
            onToggleDropdown={actionCreator.toggleBranchSelector}
            onSelectionChanged={actionCreator.changeVersionFromSelector}
            onCreateBranchClick={canCreateBranch && actionCreator.promptCreateBranch}
        />;
});

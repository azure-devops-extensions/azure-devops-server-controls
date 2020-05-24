import {GitRef} from "TFS/VersionControl/Contracts";
import {IStateless, IEnhancedGitRef} from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import * as React from "react";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import {BranchStoreFactory, StoreIds} from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as RepoContext from "VersionControl/Scenarios/Branches/Stores/RepoContextStore";
import * as String_Utils from "VSS/Utils/String";

export interface NoDefaultRowProperties {
    key: string;
    defaultBranch: IEnhancedGitRef;
    filterText: string;
}

/**
 * Prints a header row letting the user know how to set the default branch
 */
export class NoDefaultRow extends React.Component<NoDefaultRowProperties, IStateless> {

    public render() {

        if (!this.props.defaultBranch.ref && !this.props.filterText) {
            const securityLink = VersionControlUrls.getBranchSecurityUrl(
                BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(),
                null);

            return (
                <div className="vc-no-default-branch">
                  <span className="bowtie-icon bowtie-status-error-outline" ></span>
                        <span className="vc-no-default-error">{BranchResources.NoDefaultError}</span>
                        <span>
                           {BranchResources.NoDefaultBranchStart}
                           <a href={securityLink} className="vc-settings-link">{BranchResources.NoDefaultBranchLink}</a>
                           {BranchResources.NoDefaultBranchEnd}
                            </span>
                     <a href="http://go.microsoft.com/fwlink/?LinkId=808415" className="vc-settings-line vc-more-info">{BranchResources.MoreInfo}</a>
                    </div>
            );
        }
        return null;
    }
}

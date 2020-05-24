import * as Q from "q";
import { css } from "OfficeFabric/Utilities";

// VSS
import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");

import { evaluatePermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import * as Branches from "VersionControl/Scenarios/Branches/BranchesView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { FavoritesPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/ClearFilterButton";
import "VSS/LoaderPlugins/Css!VersionControl/Branches/BranchesView";

///////////////////////////////////////////////////////////////////////////////
// BranchesHub
///////////////////////////////////////////////////////////////////////////////

export class BranchesHub extends HubBase {

    public initialize() {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const id = Controls.getId();
        const { projectId, repositoryId } = ValidateRepository.getRepositoryInfo();

        const gitPermissionsSource = new GitPermissionsSource(projectId, repositoryId);
        const favoritesPermissionSource = new FavoritesPermissionsSource();
        const settingsPermissionsSource = new SettingsPermissionsSource();

        Q.all([
            gitPermissionsSource.queryDefaultGitRepositoryPermissionsAsync(),
            favoritesPermissionSource.queryFavoritesPermissionsAsync(),
            settingsPermissionsSource.querySettingsPermissionsAsync(),
        ]).then(([repositoryPermissionSet, favoritesPermissions, settingsPermissions]) => {
            const permissions = evaluatePermissions({ repositoryPermissionSet, favoritesPermissions, settingsPermissions });

            const hasPermissionToUpdateBranches = repositoryPermissionSet.repository && permissions.createBranch;
            const newBranchButton: string = hasPermissionToUpdateBranches ?
                `<span>\
                    <div class="button-with-tooltip-container">\
                        <button class="btn-cta vc-newbranches-create-branch">${BranchResources.NewBranch}</button>\
                    </div>\
                </span>`
                : "";

            // Add Branches Header
            const headerContent = ` \
            <div class="hub-view vc-newbranches-view git-repositories-view"> \
                <div class="hub-title" > \
                    <div class="vc-page-title-area vc-newbranches" style> \
                        <div class="vc-title-area" > \
                            <div class="vc-title-group bowtie vc-right clear-button-container" > \
                                <div class="vc-newbranches-actions" > \
                                    <button class="clear-filter-button bowtie-icon bowtie-search-filter disabled" aria-label="${VCResources.FilterClearFiltersTooltip}" aria-disabled="true"></button>
                                    <div class="vc-newbranches-filter-container" role="search"> \
                                        <input type="text" aria-label="${BranchResources.BranchSearch}" class="vc-newbranches-filter" placeholder= "${BranchResources.BranchSearch}" /> \
                                    </div> \
                                    <span class="vc-newbranches-filter-icon bowtie-icon bowtie-edit-remove disabled" role="button" aria-label="${BranchResources.ClearText}" > </span> \
                                    <span class="vc-newbranches-filter-icon bowtie-icon bowtie-search" role="button" aria-label="${BranchResources.SearchText}" > </span> \
                                    ${newBranchButton}\
                                </div> \
                            </div> \
                        <div class="vc-title-group vc-left" > \
                            <h1 class="vc-newbranches-title" id="${"comparing-label" + id}"></h1> \
                            <div class="vc-branch-selector vc-newbranches" style="display: none;" > \
                                <div class="vc-branches-container-target" > </div> \
                                <div class="vc-branch-selector-text" id="${"to-label" + id}">${BranchResources.BranchesComparingTo2}</div> \
                                <div class="vc-branches-container-base" > </div> \
                            </div> \
                        </div> \
                    </div> \
                </div> \
            </div> `;

            const $header = $(headerContent);
            this._element.append($header);

            const mineTabElement: string = permissions.viewMyBranches
                ? `<li class="selected" data-id="mine"><a href="#_a=mine">${BranchResources.BranchesTab_Mine}</a></li>`
                : `<li class="disabled" disabled="disabled" data-id="mine"><a href="#_a=mine">${BranchResources.BranchesTab_Mine}</a></li>`;
            const allTabClass: string = css({ "selected": !permissions.viewMyBranches });

            // Add Pivot Container
            const pivotContent = ` \
            <div class="hub-content"> \
                <div class="hub-pivot"> \
                    <div class="views"> \
                        <div class="vc-newbranches-pivot-area"> \
                            <ul class="empty pivot-view enhance vc-newbranches-tabs" id="3"> \
                                ${mineTabElement}
                                <li class="${allTabClass}" data-id="all"><a href="#_a=all">${BranchResources.BranchesTab_All}</a></li > \
                                <li data-id="stale"><a href="#_a=stale">${BranchResources.BranchesTab_Stale}</a></li > \
                                <li class="disabled" data-id="commits" disabled="disabled"><a href="#_a=commits">${BranchResources.BranchesTab_Commits}</a></li> \
                                <li class="disabled" data-id="files" disabled="disabled"><a href="#_a=files">${BranchResources.BranchesTab_Compare}</a></li> \
                            </ul> \
                        </div> \
                    </div> \
                    <div class="filters"></div> \
                </div> \
                <div class="hub-pivot-content"> \
                    <div class="vc-newbranches-content"> \
                    </div> \
                </div> \
            </div> `;

            this._element.find(".hub-view").append($(pivotContent));

            // Render View
            Controls.Enhancement.enhance(Branches.NewBranchesView, this._element, { permissions });
        });
    }
}

SDK_Shim.VSS.register("versionControl.branchesHub", (context) => {
    return Controls.create(BranchesHub, context.$container, context.options);
});

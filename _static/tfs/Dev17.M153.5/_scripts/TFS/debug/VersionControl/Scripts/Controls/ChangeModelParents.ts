import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import VCChangeModel = require("VersionControl/Scripts/ChangeModel");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import domElem = Utils_UI.domElem;

export class ChangeModelParents {
    constructor(private changeModel: VCChangeModel.ChangeList, private repositoryContext: GitRepositoryContext) { }

    /** 
     * Returns an element that has links to the ChangeModel's/commit's parents 
     */
    public getElement(): JQuery {
        let $parentIdLinks: JQuery[] = [],
            result = $(domElem("span"));

        if (this.changeModel.isGitCommit()) {
            const gitCommit = this.changeModel.getAsGitCommit();
            $parentIdLinks = gitCommit.parents.map(parentCommit => {
                return $(domElem("div")).append($(domElem("a", "parent-commit-link"))
                    .attr("href", VersionControlUrls.getCommitUrl(this.repositoryContext, parentCommit.objectId.full))
                    .attr("title", parentCommit.objectId.full)
                    .text(parentCommit.objectId.short));
            });
        }

        if ($parentIdLinks.length === 1) {
            const html = Utils_String.format(VCResources.ParentLinksSingleParentFormat, $parentIdLinks[0].html());
            result.html(html);
        }
        else if ($parentIdLinks.length > 1) {
            const parentIdLinksStr = $parentIdLinks.map($link => $link.html()).join(" + ");
            const html = Utils_String.format(VCResources.ParentLinksMultipleParentFormat, parentIdLinksStr);
            result.html(html);
        }

        return result;
    }
}
import Controls = require("VSS/Controls");
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { getChangesetsHubContributionId } from "VersionControl/Scripts/CodeHubContributionsHelper";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {navigateToUrl} from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

export class ChangesetSearchAdapter extends HostUI.SearchAdapter {

    public getWatermarkText(): string {
        return VCResources.ChangesetSearchWatermark;
    }

    public getTooltip(): string {
        return "";
    }

    public performSearch(searchText: string) {
        let id = Math.floor(Number(searchText)),
            tfsRepositoryContext: TfvcRepositoryContext;

        if (id > 0) {
            tfsRepositoryContext = TfvcRepositoryContext.create(TFS_Host_TfsContext.TfsContext.getDefault());
            tfsRepositoryContext.getClient().beginGetChangeList(tfsRepositoryContext, new VCSpecs.ChangesetVersionSpec(id).toVersionString(), 0, (changeList) => {
                const linkHref = VersionControlUrls.getChangesetUrl(id);
                navigateToUrl(linkHref, getChangesetsHubContributionId(tfsRepositoryContext))
            }, (error) => {
                alert(error.message);
            });
        }
        else {
            alert(VCResources.ChangesetSearchInvalidText);
        }
    }
}

Controls.Enhancement.registerEnhancement(ChangesetSearchAdapter, ".vc-search-adapter-changesets");

import Controls = require("VSS/Controls");
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { getShelvesetsHubContributionId } from"VersionControl/Scripts/CodeHubContributionsHelper";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";

export class ShelvesetSearchAdapter extends HostUI.SearchAdapter {

    public getWatermarkText(): string {
        return VCResources.ShelvesetSearchWatermark;
    }

    public getTooltip(): string {
        return "";
    }

    public performSearch(searchText: string) {
        let tfsRepositoryContext: TfvcRepositoryContext,
            versionSpec = new VCSpecs.ShelvesetVersionSpec(searchText);

        tfsRepositoryContext = TfvcRepositoryContext.create(TFS_Host_TfsContext.TfsContext.getDefault());
        tfsRepositoryContext.getClient().beginGetChangeList(tfsRepositoryContext, versionSpec.toVersionString(), 0, (shelveset) => {
            const linkHref = VersionControlUrls.getShelvesetUrl(searchText);
            navigateToUrl(linkHref, getShelvesetsHubContributionId(tfsRepositoryContext))
        }, (error) => {
            alert(error.message);
        });
    }
}

Controls.Enhancement.registerEnhancement(ShelvesetSearchAdapter, ".vc-search-adapter-shelvesets");

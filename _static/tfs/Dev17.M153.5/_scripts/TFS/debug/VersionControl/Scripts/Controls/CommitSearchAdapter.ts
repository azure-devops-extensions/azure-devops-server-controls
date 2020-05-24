import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import VCContracts = require("TFS/VersionControl/Contracts");

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { navigateToUrl } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

export class CommitSearchAdapter extends HostUI.SearchAdapter {

    private _repositoryContext: GitRepositoryContext;

    public getWatermarkText(): string {
        return VCResources.CommitSearchWatermark;
    }

    public getTooltip(): string {
        return "";
    }

    public setRepository(repositoryContext: GitRepositoryContext) {
        this._repositoryContext = repositoryContext;
    }

    public performSearch(searchText: string) {
        if (CommitIdHelper.isValidPartialId(searchText)) {
            if (this._repositoryContext) {

                let searchCriteria: VCContracts.ChangeListSearchCriteria;

                if (searchText.length === CommitIdHelper.SHA1_HASH_LENGTH) {
                    // The full commit Id was entered. Goto the commit if it exists
                    this._repositoryContext.getClient().beginGetChangeList(this._repositoryContext, new VCSpecs.GitCommitVersionSpec(searchText).toVersionString(), 0, (changeList) => {
                        const linkHref = VersionControlUrls.getCommitUrl(this._repositoryContext, searchText);
                        navigateToUrl(linkHref, CodeHubContributionIds.historyHub)
                    }, (error) => {
                        this.setErrorMessage(error, searchText);
                    });
                }
                else {
                    // A partial commit Id was entered. Lookup commits that begin with that id.
                    searchCriteria = <VCContracts.ChangeListSearchCriteria>$.extend(CommitIdHelper.getStartsWithSearchCriteria(searchText), { top: 2 });
                    this._repositoryContext.getClient().beginGetHistory(this._repositoryContext, searchCriteria, (model: VCLegacyContracts.GitHistoryQueryResults) => {
                        if (model.results.length === 0) {
                            this.setErrorMessage(Utils_String.format(VCResources.NoCommitsStartsWithError, searchText), searchText);
                        }
                        else if (model.results.length === 1 && !model.unpopulatedCount) {
                            const linkHref = VersionControlUrls.getCommitUrl(this._repositoryContext, (model.results[0].changeList as VCLegacyContracts.GitCommit).commitId.full);
                            navigateToUrl(linkHref, CodeHubContributionIds.historyHub)
                        }
                        else {
                            const linkHref = VersionControlUrls.getCommitsSearchUrl(this._repositoryContext, { commitStartsWith: searchText });
                            navigateToUrl(linkHref, CodeHubContributionIds.historyHub)
                        }
                    });
                }
            }
        }
        else {
            this.setErrorMessage(VCResources.CommitSearchInvalidText, searchText);
        }
    }
}

Controls.Enhancement.registerEnhancement(CommitSearchAdapter, ".vc-search-adapter-commits", { ariaLabelSearchBox: VCResources.SearchBoxAriaLabel });

/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Notifications = require("VSS/Controls/Notifications");
import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCBranchesSummaryGrid = require("VersionControl/Scripts/Controls/BranchesSummaryGrid");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCUIContracts = require("TFS/VersionControl/UIContracts");
import VCBranchesDiffChangeListControl = require("VersionControl/Scripts/Controls/BranchesDiffChangeListControl");
import {ClientGitRef} from "VersionControl/Scripts/ClientGitRef";
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export module ActionIds {
    export let Summary = "summary";
    export let CommitDiff = "commits";
    export let FileDiff = "files";
}

export class BranchSummaryTab extends Navigation.NavigationViewTab {
    private _defaultNumOfBranchToCompare = 100;

    private _branchesGrid: VCBranchesSummaryGrid.SummaryGrid;
    private _branchRefsNotYetCompared: string[];
    private _branchTotalCount: number;
    private _repositoryContext: GitRepositoryContext;
    private _state;

    private _$branchesGridContainer: JQuery;
    private _showMoreInfoBar: JQuery;
    private _baseVersion: string;

    public initialize() {
        super.initialize();

        this._showMoreInfoBar = this._getShowMoreInfoBar();
        this._showMoreInfoBar.appendTo(this._element);
        this._showMoreInfoBar.hide();

        this._$branchesGridContainer = $(domElem("div", "vc-branch-summary-grid-container")).appendTo(this._element);
        this._branchesGrid = <VCBranchesSummaryGrid.SummaryGrid>Controls.BaseControl.createIn(VCBranchesSummaryGrid.SummaryGrid, this._$branchesGridContainer, {
            height: '100%',
            repositoryContext: this._options.navigationView._repositoryContext,
            contextActionId: ActionIds.CommitDiff
        });

        let featureAvailabilityService: FeatureAvailability_Services.FeatureAvailabilityService = <FeatureAvailability_Services.FeatureAvailabilityService>TFS_OM_Common.Application.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService(FeatureAvailability_Services.FeatureAvailabilityService);
        if (featureAvailabilityService) {
            let reduceBranchComparisonDefaultCount = featureAvailabilityService.isFeatureEnabledLocal(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlGitReduceBranchComparisonDefaultCount);
            if (reduceBranchComparisonDefaultCount) {
                this._defaultNumOfBranchToCompare = 20;
            }
        }
    }

    public beginRefreshGrid(): void {
        (<GitRepositoryContext>this._state.repositoryContext).getGitClient().beginGetGitBranches(this._state.repositoryContext.getRepository(),(branches: ClientGitRef[]) => {
            let baseRefName: string,
                removeCountFromInitialCall: number = 1;

            if (this._state.baseVersion && this._state.baseVersion.tagName) {
                    baseRefName = "refs/tags/" + this._baseVersion.substring(2);
                    removeCountFromInitialCall = 0;
                }
                else {
                    baseRefName = "refs/heads/" + this._baseVersion.substring(2);
                }

            this._repositoryContext = this._state.repositoryContext;
                this._branchRefsNotYetCompared = branches.map(x => x.name).filter(y => { return (Utils_String.defaultComparer(y, baseRefName) !== 0) });
                this._branchTotalCount = branches.length;
                // Automatically includes baseVersion in the first call, so reduce one from the number to keep the count clean
                let branchRefs = this._getNextBranchBatchToCompare(this._defaultNumOfBranchToCompare - removeCountFromInitialCall);
                if (removeCountFromInitialCall != 0) {
                    branchRefs.push(baseRefName);
                }
            this._beginUpdateGrid(<GitRepositoryContext>this._state.repositoryContext, this._baseVersion, branchRefs, false);
        });
    }

    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        CustomerIntelligenceData.publishFirstTabView("BranchSummaryTab", parsedState, this._options);

        this._state = parsedState;
        this._baseVersion = parsedState.baseVersion.toVersionString();
        if (this._baseVersion !== this._branchesGrid._options.baseVersionSpec) {
            this._branchesGrid._options.source = [];
            this._branchesGrid.initializeDataSource();
            this.beginRefreshGrid();
        }
        else {
            this._branchesGrid.initializeDataSource();
            this._branchesGrid.onSort(this._branchesGrid._options.sortOrder);
        }
    }

    private _getRepositoryContext(): GitRepositoryContext {
        return this._repositoryContext;
    }

    private _getBaseVersion(): string {
        return this._baseVersion;
    }

    private _beginUpdateGrid(repositoryContext: GitRepositoryContext, baseVersion: string, branchRefs: string[], filterBaseBranch: boolean, clearExistingEntries = true) {
        if (branchRefs && branchRefs.length > 0) {
            repositoryContext.getGitClient().beginGetBranchDiffSummary(repositoryContext.getRepository(), baseVersion, branchRefs,(diffs) => {
                this._branchesGrid._options.baseVersionSpec = baseVersion;

                let source = this._mapBranchDiff(diffs, baseVersion, filterBaseBranch);

                if (clearExistingEntries) {
                    this._branchesGrid._options.source = [].concat(source);
                } else {
                    this._branchesGrid._options.source = this._branchesGrid._options.source.concat(source);
                }

                $.each(this._branchesGrid._options.columns,(index, column) => {
                    delete column.maxValue;
                });

                this._branchesGrid.initializeDataSource();

                if (!filterBaseBranch) {
                    // if my base branch should be included (not filtered out), I should sort the list so the base branch appears on the top
                    this._branchesGrid.onSort(this._branchesGrid._options.sortOrder);
                }

                this._setShowMoreLinkVisibility(this._branchRefsNotYetCompared.length > 0);

                if ($.isFunction(this._options.scenarioComplete)) {
                    this._options.scenarioComplete();
                }
            },
                (error) => {
                    this._options.navigationView.showError(error);
                });
        }
    }

    private _mapBranchDiff(diffs: VCLegacyContracts.GitBranchDiff[], baseVersion: string, filterBaseVersion: boolean) {
        let branchDiffs = [];

        $.each(diffs,(index, diff) => {
            if (!diff.isBaseCommit || !filterBaseVersion) {
                let branchDiff = {
                    name: diff.branchName,
                    committer: diff.commit.committer,
                    commitTime: diff.commit.commitTime,
                    isBaseCommit: diff.isBaseCommit,
                    isLockedBy: diff.isLockedBy
                };
                if (!diff.isBaseCommit) {
                    let href = Navigation_Services.getHistoryService().getFragmentActionLink(ActionIds.CommitDiff, {
                        baseVersion: baseVersion,
                        targetVersion: new VCSpecs.GitBranchVersionSpec(diff.branchName).toVersionString()
                    });
                    $.extend(branchDiff, {
                        aheadCount: diff.aheadCount,
                        behindCount: diff.behindCount,
                        href: href,
                        behindHref: Navigation_Services.getHistoryService().getFragmentActionLink(ActionIds.CommitDiff, {
                            baseVersion: new VCSpecs.GitBranchVersionSpec(diff.branchName).toVersionString(),
                            targetVersion: baseVersion
                        }),
                        aheadHref: href
                    });
                }
                branchDiff["getContributionContext"] = this._getContributionContext.bind(this, diff, this._repositoryContext);

                branchDiffs.push(branchDiff);
            }
        });
        return branchDiffs;
    }

    private _getContributionContext(branchDiff: VCLegacyContracts.GitBranchDiff, repository: RepositoryContext): VCUIContracts.GitBranchDiffContext {
        let commitDiff = <VCContracts.GitCommitDiffs> {
            aheadCount: branchDiff.aheadCount,
            behindCount: branchDiff.behindCount,
            commonCommit: branchDiff.commit.commitId.full
        };
        return {
            repository: repository.getRepository(),
            gitBranchDiff: commitDiff,
            view: this._getContributionContextView()
        };
    }

    private _getContributionContextView(): { refresh(): void } {
        if (this._options.contributionContextView) {
            return this._options.contributionContextView;
        } else {
            return {
                refresh: () => {
                    this._branchesGrid._options.source = [];
                    this.beginRefreshGrid();
                }
            }
        }
    }

    private _getNextBranchBatchToCompare(numberOfBranchesToCompare: number) {
        let nextBatch = [];
        if (this._branchRefsNotYetCompared) {
            nextBatch = this._branchRefsNotYetCompared.slice(0, numberOfBranchesToCompare);
            this._branchRefsNotYetCompared = this._branchRefsNotYetCompared.slice(nextBatch.length);
        }

        return nextBatch;
    }

    private _getShowMoreInfoBar() {
        let $link = $(domElem("div")).append($(domElem("a")).text(VCResources.ShowMore));
        let $branchesShowingCount = $(domElem("div")).append($(domElem("span", "vc-more-link-branch-show-count")));
        let $branchesTotalCount = $(domElem("div")).append($(domElem("span", "vc-more-link-branch-total-count")));

        let $showMoreInfoBar = $(domElem('div', 'vc-show-more-link-bar'));
        let $textArea = $(domElem('div', 'vc-show-more-link-textarea')).html(Utils_String.format(VCResources.BranchRefsCompareShowingCount, $branchesShowingCount.html(), $branchesTotalCount.html(), $link.html()));
        $textArea.appendTo($showMoreInfoBar);

        $showMoreInfoBar.find('a').click(() => {
            let repositoryContext = this._getRepositoryContext();
            let nextBranchBatch = this._getNextBranchBatchToCompare(this._defaultNumOfBranchToCompare);
            let baseVersion = this._getBaseVersion();

            this._beginUpdateGrid(repositoryContext, baseVersion, nextBranchBatch, true, false);
        });

        return $showMoreInfoBar;
    }

    private _setShowMoreLinkVisibility(isVisible: boolean) {
        if (isVisible) {
            let $branchesShowingCount = this._showMoreInfoBar.find('.vc-more-link-branch-show-count');
            $branchesShowingCount.text(this._branchesGrid._options.source.length);

            let $branchesTotalCount = this._showMoreInfoBar.find('.vc-more-link-branch-total-count');
            $branchesTotalCount.text(this._branchTotalCount);

            this._showMoreInfoBar.show()
        }
        else {
            this._showMoreInfoBar.hide();
        }
        this._$branchesGridContainer.toggleClass("vc-branches-with-show-more", isVisible);
    }
}

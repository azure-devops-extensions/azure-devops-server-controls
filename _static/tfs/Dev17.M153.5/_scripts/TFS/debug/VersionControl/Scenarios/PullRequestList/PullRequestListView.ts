import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListView";

import { PullRequestListViewBase, Flux } from "VersionControl/Scenarios/PullRequestList/PullRequestListViewBase";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Controls from "VSS/Controls";
import { format } from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TabInfoActionCreator, ITabInfoActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/TabInfoActionCreator";
import * as PullRequestListTopView from "VersionControl/Scenarios/PullRequestList/PullRequestListTopView";

import { PagePerformance, SplitNames } from "VersionControl/Scenarios/Shared/PagePerformance";

export class PullRequestListView extends PullRequestListViewBase {

    public initialize(options?) {
        super.initialize(options);

        // set page title
        if (this._repositoryContext) {
            const repository = this._repositoryContext.getRepository();

            if (repository && repository.name) {
                this.setViewTitle(format(
                    VCResources.PullRequestsTitleFormat, repository.name));
            }
        }
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        if (this._tryRedirectToNewPullRequests(action, rawState)) {
            // redirected successfully no reason to continue
            return;
        }

        if (this._emptyRepository) {
            PagePerformance.scenario.addSplitTiming(SplitNames.emptyRepositoryLoaded);
            PagePerformance.scenario.end();
            return;
        }

        callback(action, {});
    }

    protected _tryRedirectToNewPullRequests(action: string, rawState: any): boolean {
        if (action && VCPullRequestsControls.PullRequestsActions.CREATENEW === action.toLocaleLowerCase()) {
            // this has moved so redirect
            const url = VersionControlUrls.getCreatePullRequestUrl(<GitRepositoryContext>this._repositoryContext,
                rawState.sourceRef ? decodeURIComponent(rawState.sourceRef) : null,
                rawState.targetRef ? decodeURIComponent(rawState.targetRef) : null);

            if (!Flux.instance) {
                return false;
            }

            Flux.instance.actionCreator.navigateToUrl(url);

            return true;
        }
        return false;
    }

    protected getTabsInfoInitializer(): ITabInfoActionCreator {
        return new TabInfoActionCreator(Flux.instance.actionsHub, Flux.instance.sourcesHub.featureAvailabilitySource, this._tfsContext);
    }

    protected attachTopView(container: HTMLElement): void {
        Flux.instance.actionCreator.setInitialSearchCriteriaFromNavigationState().then(criteria => {
            if (Flux.instance) {
                PullRequestListTopView.PullRequestListTopView.attachView(container, {
                    storesHub: Flux.instance.storesHub,
                    actionCreators: Flux.instance.actionCreator,
                    repositoryContext: this._repositoryContext as GitRepositoryContext,
                    tfsContext: this._tfsContext,
                    pivotViewActions: Flux.instance.actionsHub.pivotViewActions,
                    onSearchCriteriaUpdated: (searchCriteria) => Flux.instance.actionCreator.applySearchCriteria(searchCriteria),
                });
            }
        });
    }
}

VSS.classExtend(PullRequestListView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(PullRequestListView, PullRequestListView.hubContentSelector);
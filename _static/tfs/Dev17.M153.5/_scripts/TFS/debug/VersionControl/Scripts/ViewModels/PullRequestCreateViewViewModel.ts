import ko = require("knockout");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestsCreateViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsCreateViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VSS_Telemetry = require("VSS/Telemetry/Services");

export class ViewViewModel extends VCViewModel.VersionControlViewModel {
    /**
     * View model for the "create new" pull request tab.
     */
    public createNewPullRequestViewModel: VCPullRequestsCreateViewModel.CreateViewModel;

    public pageTitle: KnockoutComputed<string>;

    public viewMode: KnockoutObservable<VCPullRequestsControls.PullRequestViewMode>;

    public workItemIds: KnockoutObservableArray<number>;

    constructor(repositoryContext: RepositoryContext, options?) {
        super(repositoryContext, null, options);

        this.workItemIds = ko.observableArray<number>(null);

        this._initialize();

        this.pageTitle = ko.computed(this._computeTitleText, this);
    }

    private _initialize() {
        this.createNewPullRequestViewModel = new VCPullRequestsCreateViewModel.CreateViewModel(this.repositoryContext, this);
    }

    private _computeTitleText(): string {
        return VCResources.PullRequest_CreatePullRequestTitle;
    }

    public getWorkItemIds(): number[] {
        return this.workItemIds();
    }

    public setWorkItemIds(workItemIds: number[]): void {
        this.workItemIds(workItemIds);
    }

    public onRemoveWorkItem(workItemId: number): void {
        const index = $.inArray(workItemId, this.workItemIds());
        if (index >= 0) {
            this.workItemIds.splice(index, 1);
        }
    }

    public onAddWorkItem(workItemId: number): void {
        this.workItemIds.push(workItemId);
    }

    public handleError(error) {
        this.createNewPullRequestViewModel.notificationViewModel.clear();

        if (typeof error === "string") {
            this.createNewPullRequestViewModel.notificationViewModel.addError(error);
        }
        else {
            this.createNewPullRequestViewModel.notificationViewModel.addError(error.message);
        }
    }
}

export interface ErrorMessageWriter {
    (msg: string): void;
}

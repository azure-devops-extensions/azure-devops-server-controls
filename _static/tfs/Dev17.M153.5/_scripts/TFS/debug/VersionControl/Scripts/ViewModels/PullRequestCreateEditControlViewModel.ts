import ko = require("knockout");

import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import {IdentityRef} from "VSS/WebApi/Contracts";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export class CreateEditControlViewModel {
    private _repositoryContext: RepositoryContext;

    public title: KnockoutObservable<string>;
    public description: KnockoutObservable<string>;

    public reviewers: KnockoutObservableArray<IdentityRef>;

    public hasTitle: KnockoutComputed<boolean>;
    public paramsAreValid: KnockoutComputed<boolean>;
    public isVisible: KnockoutObservable<boolean>;
    public isShowingDetailedView: KnockoutComputed<boolean>;
    public createMode: KnockoutObservable<number>;
    public canModifyReviewers: KnockoutObservable<boolean>;
    public buttonCaption: KnockoutObservable<string>;
    public descriptionHasFocus: KnockoutObservable<boolean>;
    public actionsButtonDisabled: KnockoutObservable<boolean>;
    //Used by PullRequestCreateViewModel to signal that we've finished collecting potential work items to link to this pull request
    public hasFetchedWorkItems: KnockoutObservable<boolean>;

    /**
     * Text displayed to let the user know the number of auto-linked work items exceeds the batch limit
     */
    public workItemsExceededText: KnockoutObservable<string>;

    public ok: () => void;
    public cancel: () => void;
    public toggleDetailedCreateView: () => void;

    private _okHandler: any;
    private _cancelHandler: any;

    constructor(repositoryContext: RepositoryContext, options?) {
        this._repositoryContext = repositoryContext;

        this.title = <KnockoutObservable<string>>ko.observable("");
        this.description = <KnockoutObservable<string>>ko.observable("");
        this.reviewers = <KnockoutObservableArray<IdentityRef>>ko.observableArray([]);

        this.hasTitle = ko.computed(this._computeHasTitle, this);
        this.isVisible = ko.observable(false);
        this.createMode = ko.observable(VCWebAccessContracts.CodeReviewCreateMode.Advanced);
        this.isShowingDetailedView = ko.computed(this._computeIsShowingDetails, this);
        this.canModifyReviewers = ko.observable(false);
        this.actionsButtonDisabled = ko.observable(false);
        this.buttonCaption = <KnockoutObservable<string>>ko.observable(VCResources.PullRequest_OK);
        this.descriptionHasFocus = ko.observable(true);
        this.hasFetchedWorkItems = ko.observable(false);
        this.workItemsExceededText = ko.observable("");

        this.ok = () => {
            if (this._okHandler) {
                this._okHandler();
            }
        };

        this.cancel = () => {
            if (this._cancelHandler) {
                this._cancelHandler();
            }
            else {
                this.hide();
            }
        };

        this.toggleDetailedCreateView = () => {
            if (this.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Advanced) {
                this.createMode(VCWebAccessContracts.CodeReviewCreateMode.Basic);
            }
            else if (this.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Basic) {
                this.createMode(VCWebAccessContracts.CodeReviewCreateMode.Advanced);
            }
            this._saveUserPreference(this.createMode());
        }

        if (options) {
            if (options.ok) {
                this._okHandler = options.ok;
            }

            if (options.canModifyReviewers) {
                this.canModifyReviewers(options.canModifyReviewers);
            }

            if (options.okButtonCaption) {
                this.buttonCaption(options.okButtonCaption);
            }

            if (options.createMode) {
                this.createMode(options.createMode);
            }
        }
    }

    public show() {
        this.isVisible(true);
    }

    public hide() {
        this.isVisible(false);
    }

    public clear() {
        this.title("");
        this.description("");
        this.reviewers.removeAll();
    }

    public updateReviewers(reviewers: IdentityRef[]) {
        this.reviewers.removeAll();
        $.each(reviewers, (index, reviewer) => this.reviewers.push(reviewer));
    }

    private _computeHasTitle(): boolean {
        if (this.title()) {
            return this.title().length > 0;
        }

        return false;
    }

    private _saveUserPreference(mode: number) {
        if (mode === VCWebAccessContracts.CodeReviewCreateMode.Basic || mode === VCWebAccessContracts.CodeReviewCreateMode.Advanced) {
            this._repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
                preferences.codeReviewCreateMode = mode;
                this._repositoryContext.getClient().beginUpdateUserPreferences(preferences);
            });
        }
    }

    private _computeIsShowingDetails(): boolean {
        if (!this.createMode()) {
            return true;
        }

        return this.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Advanced;
    }
}

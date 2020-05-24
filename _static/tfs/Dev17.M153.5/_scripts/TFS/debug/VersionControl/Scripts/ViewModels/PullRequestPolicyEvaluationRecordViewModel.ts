import ko = require("knockout");

import Utils_String = require("VSS/Utils/String");
import PolicyContracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCPullRequestViewModel = require("VersionControl/Scripts/ViewModels/PullRequestViewModel");

/// <summary>This is a temporary way to extract policy evaluation references from the view model to remove a circular reference.</summary>
export interface IPolicyViewViewModel {
    isSourceOutOfDate: KnockoutObservable<boolean>;
    isTargetOutOfDate: KnockoutObservable<boolean>;
    isMergeInProgress: KnockoutComputed<boolean>;
    isMergeSuccessful: KnockoutComputed<boolean>;

    retryMerge(): void;
    pullRequest: KnockoutObservable<VCPullRequestViewModel.ViewModel>;
}

export interface IPolicyExtensionManager {
    getExtension(id: string): any;
}

export class PolicyEvaluationRecordViewModel extends VCViewModel.VersionControlViewModel {
    private _extensionManager: IPolicyExtensionManager;

    public policyEvaluation: PolicyContracts.PolicyEvaluationRecord;

    public status: KnockoutObservable<PolicyContracts.PolicyEvaluationStatus>;
    public canShowStatusIndicator: KnockoutComputed<boolean>;

    public isRejected: KnockoutComputed<boolean>;
    public isApproved: KnockoutComputed<boolean>;
    public isInProgress: KnockoutComputed<boolean>;
    public isQueued: KnockoutComputed<boolean>;
    public isBroken: KnockoutComputed<boolean>;
    public isNotApplicable: KnockoutComputed<boolean>;

    public hasErrorMessage: KnockoutComputed<boolean>;

    public statusIconClass: KnockoutComputed<string>;
    public statusString: KnockoutComputed<string>;
    public errorMessage: KnockoutComputed<string>;

    public hasDetailsUrl: KnockoutComputed<boolean>;
    public detailsUrl: KnockoutObservable<string>;

    public hasSubStatus: KnockoutComputed<boolean>;
    public subStatusString: KnockoutComputed<string>;

    public hasSubStatusActionString: KnockoutComputed<boolean>;
    public subStatusActionString: KnockoutComputed<string>;
    public subStatusAction: () => void;
    public isSubStatusActionHidden: KnockoutObservable<boolean>;

    // Whether or not to show the sub-status action text inline (next to the policy evaluation) or 
    //  with the sub-status action string. If this is set to false, the sub-status action string
    //  will only be visible if the sub-status string is also visible.
    public isSubStatusActionInline: KnockoutComputed<boolean>;

    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, extensionManager: IPolicyExtensionManager, options?) {
        super(repositoryContext, parent, options);

        this._extensionManager = extensionManager;

        this.policyEvaluation = options.policyEvaluation;

        this.status = ko.observable(this.policyEvaluation.status);
        this.canShowStatusIndicator = ko.computed(this._computeCanShowStatusIndicator, this);

        this.isRejected = ko.computed(this._computeIsRejected, this);
        this.isApproved = ko.computed(this._computeIsApproved, this);
        this.isInProgress = ko.computed(this._computeIsInProgress, this);
        this.isQueued = ko.computed(this._computeIsQueued, this);
        this.isBroken = ko.computed(this._computeIsBroken, this);
        this.isNotApplicable = ko.computed(this._computeIsNotApplicable, this);

        this.hasErrorMessage = ko.computed(this._computeHasErrorMessage, this);

        this.detailsUrl = ko.observable<string>();
        this.hasDetailsUrl = ko.computed(this._computeHasDetailsUrl, this);

        this.statusIconClass = ko.computed(this._computeStatusIconClass, this);
        this.statusString = ko.computed(this._computeStatusString, this);
        this.errorMessage = ko.computed(this._computeErrorMessage, this);

        this.subStatusString = ko.computed(this._computeSubStatusString, this);
        this.hasSubStatus = ko.computed(this._computeHasSubStatus, this);

        this.subStatusActionString = ko.computed(this._computeSubStatusActionString, this);
        this.hasSubStatusActionString = ko.computed(this._computeHasSubStatusActionString, this);
        this.subStatusAction = () => {
            this._subStatusAction();
        };

        this.isSubStatusActionHidden = <KnockoutObservable<boolean>>ko.observable();
        this.isSubStatusActionHidden(false);

        this.isSubStatusActionInline = ko.computed(this._computeIsSubStatusActionInline, this);

        this.detailsUrl(this._computeDetailsUrl());
    }

    private _computeIsRejected(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.Rejected);
    }

    private _computeIsApproved(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.Approved);
    }

    private _computeIsInProgress(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.Running);
    }

    private _computeIsQueued(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.Queued);
    }

    private _computeIsBroken(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.Broken);
    }

    private _computeIsNotApplicable(): boolean {
        return this._isStatus(PolicyContracts.PolicyEvaluationStatus.NotApplicable);
    }

    private _computeHasErrorMessage(): boolean {
        return this.policyEvaluation &&
            this.policyEvaluation.context &&
            this.policyEvaluation.context.errorCode;
    }

    private _computeErrorMessage(): string {
        if (this.hasErrorMessage()) {
            const policyExtension = this._getPolicyExtension();
            if (policyExtension) {
                return policyExtension.getErrorMessage(this);
            }
        }

        return null;
    }

    private _computeCanShowStatusIndicator(): boolean {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            return policyExtension.canShowStatusIndicator();
        }

        return null;
    }

    private _computeStatusIconClass(): string {
        let customStatusIcon: string;
        const policyExtension = this._getPolicyExtension();

        if (policyExtension) {
            customStatusIcon = policyExtension.getCustomStatusIconClass(this);

            if (customStatusIcon) {
                return customStatusIcon;
            }
        }

        switch (this.status()) {
            case PolicyContracts.PolicyEvaluationStatus.Queued:
            case PolicyContracts.PolicyEvaluationStatus.NotApplicable:
                return "bowtie-icon bowtie-status-waiting";

            case PolicyContracts.PolicyEvaluationStatus.Running:
                return "icon status-progress";

            case PolicyContracts.PolicyEvaluationStatus.Approved:
                return "bowtie-icon bowtie-status-success";

            case PolicyContracts.PolicyEvaluationStatus.Rejected:
            case PolicyContracts.PolicyEvaluationStatus.Broken:
                return "bowtie-icon bowtie-status-failure";
        }
    }

    private _computeStatusString(): string {
        let statusMessage = null;
        let displayName = null;

        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            statusMessage = policyExtension.getCustomStatus(this);
            displayName = policyExtension.getCustomDisplayName(this);
        }

        if (!displayName) {
            displayName = this.policyEvaluation.configuration.type.displayName;
        }

        if (!statusMessage) {
            let resource = VCResources.PullRequest_Policies_Awaiting;

            if (this.isRejected()) {
                resource = VCResources.PullRequest_Policies_Rejected;
            }
            else if (this.isApproved()) {
                resource = VCResources.PullRequest_Policies_Approved;
            }
            else if (this.isInProgress()) {
                resource = VCResources.PullRequest_Policies_InProgress;
            }
            else if (this.isBroken()) {
                resource = VCResources.PullRequest_Policies_Broken;
            }
            else if (this.isNotApplicable()) {
                resource = VCResources.PullRequest_Policies_NotApplicable;
            }

            statusMessage = Utils_String.format(resource, displayName);
        }

        return statusMessage;
    }

    private _computeHasDetailsUrl(): boolean {
        return this.detailsUrl() != null;
    }

    private _computeDetailsUrl(): string {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            policyExtension
                .getDetailsLink(this.repositoryContext.getTfsContext(), this)
                .then(url => this.detailsUrl(url));
        }

        return null;
    }

    private _computeHasSubStatus(): boolean {
        return this.subStatusString() != null;
    }

    private _computeSubStatusString(): string {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            return policyExtension.getSubStatus(this);
        }

        return null;
    }

    private _subStatusAction(): void {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            policyExtension.handleSubStatusAction(this.repositoryContext.getTfsContext(), this, this, this._subStatusActionResult);
            
            // Whenever the sub-status action is clicked, it will be hidden until the action string is 
            //  recomputed as visible. This prevents the user from spamming the sub-status action until
            //  it is automatically hidden by the recomputation of the action string.
            if (this.isSubStatusActionHidden) {
                this.isSubStatusActionHidden(true);
            }
        }
    }

    private _subStatusActionResult(context: any, evaluation: PolicyContracts.PolicyEvaluationRecord) {
        // Force a recomputation of the status so that the display updates once the new evaluation record is known.
        context.policyEvaluation = evaluation;
        context.status(context.policyEvaluation.status);
    }

    private _computeHasSubStatusActionString(): boolean {
        return this.subStatusActionString() != null;
    }

    private _computeSubStatusActionString(): string {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            return policyExtension.getSubStatusActionString(this);
        }

        return null;
    }

    private _computeIsSubStatusActionInline(): boolean {
        const policyExtension = this._getPolicyExtension();
        if (policyExtension) {
            return policyExtension.isSubStatusActionInline(this);
        }

        return null;
    }

    /// Attempts to retrieve the current policy extension given the current policy evaluation.
    /// Returns the policy extension if found, else null.
    private _getPolicyExtension() {
        if (this.policyEvaluation &&
            this.policyEvaluation.configuration &&
            this.policyEvaluation.configuration.type &&
            this.policyEvaluation.configuration.type.id) {

            return this._extensionManager.getExtension(this.policyEvaluation.configuration.type.id);
        }
        return null;
    }

    private _isStatus(status: PolicyContracts.PolicyEvaluationStatus): boolean {
        if (this.status() === status) {
            return true;
        }

        return false;
    }

    public getParent(): IPolicyViewViewModel {
        const policyViewModel = <IPolicyViewViewModel><any>this.parent;

        // note that since this is a compile time cast, 
        // any type can be cast to an interface at runtime
        // so we need to do runtime checks here
        if (!policyViewModel.pullRequest ||
            !policyViewModel.isSourceOutOfDate ||
            !policyViewModel.isTargetOutOfDate ||
            !policyViewModel.isMergeInProgress ||
            !policyViewModel.isMergeSuccessful) {
            return null;
        }

        return policyViewModel;
    }
}

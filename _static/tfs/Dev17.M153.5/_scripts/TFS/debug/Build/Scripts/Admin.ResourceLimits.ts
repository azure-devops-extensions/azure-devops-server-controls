/// <reference types="jquery" />

import ko = require("knockout");

import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import PlanGroupsQueueUtils = require("Build/Scripts/Utilities/PlanGroupsQueueUtils");
import BuildUtils = require("Build/Scripts/Utilities/Utils");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import { LicenseFeatureIds, FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import DistributedTask = require("TFS/DistributedTask/Contracts");

import Dialogs = require("VSS/Controls/Dialogs");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

var delegate: typeof Utils_Core.delegate = Utils_Core.delegate;

class ResourceLimitsFwdLinkURLs {
    public static getLearnMoreURL(isHosted: boolean = false): string {
        var isResourceLimitsEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.BuildAndReleaseResourceLimits, false);

        return isHosted && isResourceLimitsEnabled
            ? "https://go.microsoft.com/fwlink/?LinkId=832649"
            : "https://go.microsoft.com/fwlink/?LinkID=761061";
    }

    public static getPrivatePipelineExtensionURL(): string {
        return "https://go.microsoft.com/fwlink/?LinkId=832650";
    }

    public static getHostedPipelineExtensionURL(): string {
        return "https://go.microsoft.com/fwlink/?LinkId=832651";
    }
}

export class OneButtonModalDialog extends Dialogs.ModalDialogO<any> {
    public initializeOptions(options?: any) {
        var buttons: { [key: string]: { id: string, text: string, click: IArgsFunctionR<any> } } = {};
        var closeButtonText: string = BuildResources.CloseButtonText;

        if (!!options && !!options.closeButtonText) {
            closeButtonText = options.closeButtonText;
            options.closeButtonText = null;
        }

        buttons["Close"] = {
            id: "close",
            text: closeButtonText,
            click: delegate(this, this.close)
        }

        super.initializeOptions($.extend({
            content: (!!options && !!options.content) ? $(Utils_Html.HtmlNormalizer.normalize(options.content)) : "",
            resizable: true,
            width: 430,
            closeOnEscape: true,
            draggable: true,
            dialogClass: "bowtie " + (!!options && !!options.dialogClass) ? options.dialogClass : "",
            buttons: buttons
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public close(): void {
        super.close();
    }
}

export class AdminResourceLimitsViewModel implements IDisposable {
    public isHosted: KnockoutObservable<boolean> = ko.observable(true);
    public hasBasicLicense: KnockoutObservable<boolean> = ko.observable(false);
    public canManageOnPremUsers: KnockoutObservable<boolean> = ko.observable(false);

    public freeLicenseCount: KnockoutObservable<number> = ko.observable(1);
    public freeAdditionalGrants: KnockoutObservable<string> = ko.observable("");
    public enterpriseUsersCount: KnockoutObservable<number> = ko.observable(0);
    //// Only applicable to Hosted accounts
    public freeHostedLicenseCount: KnockoutObservable<number> = ko.observable(0);
    public freeHostedAdditionalGrants: KnockoutObservable<number> = ko.observable(0);
    public purchasedHostedLicenseCount: KnockoutObservable<number> = ko.observable(0);
    public purchasedLicenseCountValue: KnockoutObservable<string> = ko.observable("0");
    public hostedAgentMinutesUsedText: KnockoutObservable<string> = ko.observable("");
    public hostedAgentMinutesHelpText: KnockoutObservable<string> = ko.observable("");

    public purchasedLicenseCount: KnockoutComputed<number>;
    public totalLicenseCount: KnockoutComputed<string>;
    public totalPrivatePipelinesCount: KnockoutComputed<string>;
    public totalHostedPipelinesCount: KnockoutComputed<number>;

    public isDirty: KnockoutComputed<boolean>;
    public isInvalid: KnockoutComputed<boolean>;
    public enableSave: KnockoutComputed<boolean>;
    public isPurchasedInvalid: KnockoutComputed<boolean>;

    public learnMoreURL: string;
    // For private pipelines
    public privatePipelineExtensionURL: string;
    // For hosted pipelines
    public hostedPipelineExtensionURL: string;
    public manageUsersURL: string;
    public manageVSEnterpriseUsersHelp: string;
    public pipelinesImgURL: string;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, licenseDetails: DistributedTask.TaskHubLicenseDetails, canManageOnPremUsers: boolean) {
        this._disposalManager = new Utils_Core.DisposalManager();
        this._tfsContext = tfsContext;
        this._canManageOnPremUsers = canManageOnPremUsers;

        this._initializeBasicDataAndObservables();

        this._initializeLicenseDetails(licenseDetails);

        this._initializeAdditionalObservables();

        this.isDirty(false);
        this.isInvalid(false);
    }

    public dispose(): void {
        this._disposalManager.dispose();
    }

    public updateLicenseLimits(): void {
        if (!this.enableSave()) {
            return;
        }

        if (!this._taskHubLicenseClient) {
            var tfsConnection: Service.VssConnection = new Service.VssConnection(this._tfsContext.contextData);
            this._taskHubLicenseClient = tfsConnection.getHttpClient<DistributedTaskApi.TaskAgentHttpClient>(DistributedTaskApi.TaskAgentHttpClient);
        }

        this._taskHubLicenseClient.updateTaskHubLicenseDetails(this.getValue(), "Release").then(
            (licenseDetails: DistributedTask.TaskHubLicenseDetails) => {
                this._initializeLicenseDetails(licenseDetails);
            },
            (error) => {
                if (!!error) {
                    Dialogs.show(OneButtonModalDialog, {
                        title: BuildResources.ErrorLabelText,
                        closeButtonText: BuildResources.CloseButtonText,
                        dialogClass: "r-upd-license-error-dialog",
                        content: Utils_String.format("<div>{0}</div>", error.message || error)
                    });
                }
            });
    }

    public getValue(): DistributedTask.TaskHubLicenseDetails {
        return { purchasedLicenseCount: this.purchasedLicenseCount() } as DistributedTask.TaskHubLicenseDetails;
    }

    public onBuyMoreLicenses(): void {
        // Applicable only for OnPrem
        var content: string = Utils_String.localeFormat(
                                BuildResources.BuyMoreParallelReleasesHelpAllText,
                                ResourceLimitsFwdLinkURLs.getPrivatePipelineExtensionURL(),
                                ResourceLimitsFwdLinkURLs.getLearnMoreURL());

        Dialogs.show(OneButtonModalDialog, {
            title: BuildResources.BuyMoreParallelReleasesHelpDialogTitleText,
            width: 550,
            closeButtonText: BuildResources.CloseButtonText,
            dialogClass: "r-buy-more-help-dialog",
            content: content
        });
    }

    public onLinkKeyDown(viewModel: any, event: JQueryEventObject): boolean {
        return BuildUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event)
    }

    public showPlanGroupsQueueDialog(viewModel: any, event: JQueryEventObject): void {
        PlanGroupsQueueUtils.showPlanGroupsQueueDialogHelper(event);
    }

    private _initializeBasicDataAndObservables(): void {
        this.isHosted(this._tfsContext.isHosted);
        this.hasBasicLicense(TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(LicenseFeatureIds.ReleaseManagement));

        this.learnMoreURL = ResourceLimitsFwdLinkURLs.getLearnMoreURL(this.isHosted());
        this.privatePipelineExtensionURL = ResourceLimitsFwdLinkURLs.getPrivatePipelineExtensionURL();
        this.hostedPipelineExtensionURL = ResourceLimitsFwdLinkURLs.getHostedPipelineExtensionURL();
        this.manageVSEnterpriseUsersHelp = BuildResources.ManageVSEnterpriseUsersHelp;
        this.manageUsersURL = this._getManageUsersURL(this.isHosted());
        this.pipelinesImgURL = Utils_String.format("{0}{1}/{2}",
                                                    TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesPath(),
                                                    "Build",
                                                    encodeURIComponent("pipelines-main.svg"));

        this.purchasedLicenseCount = this._disposalManager.addDisposable(ko.computed(() => {
            return this._getNumber(this.purchasedLicenseCountValue(), 0);
        }));

        this.isPurchasedInvalid = this._disposalManager.addDisposable(ko.computed(() => {
            return this._getNumber(this.purchasedLicenseCountValue(), -1) < 0;
        }));
    }

    private _initializeLicenseDetails(licenseDetails: DistributedTask.TaskHubLicenseDetails): void {
        this._originalLicenseDetails = licenseDetails;

        this._initializeMissingOriginalDetails();
        this._fillLicenseDetails();

        this.purchasedLicenseCountValue.valueHasMutated();
    }

    private _fillLicenseDetails(): void {
        if (!!this._originalLicenseDetails) {
            if (this._originalLicenseDetails.freeLicenseCount > this.freeLicenseCount()) {
                this.freeAdditionalGrants(this._getTextForNumber(this._originalLicenseDetails.freeLicenseCount - this.freeLicenseCount()));
            }

            this.enterpriseUsersCount(this._originalLicenseDetails.enterpriseUsersCount);
            this.purchasedHostedLicenseCount(this._originalLicenseDetails.purchasedHostedLicenseCount);
            this.purchasedLicenseCountValue(this._originalLicenseDetails.purchasedLicenseCount.toString());

            if (this._originalLicenseDetails.freeHostedLicenseCount > this.freeHostedLicenseCount()) {
                this.freeHostedAdditionalGrants(this._originalLicenseDetails.freeHostedLicenseCount);
            }

            this.hostedAgentMinutesUsedText(Utils_String.localeFormat(BuildResources.HostedAgentMinutesUsedText, this._originalLicenseDetails.hostedAgentMinutesUsedCount));
            this.hostedAgentMinutesHelpText(Utils_String.localeFormat(BuildResources.HostedAgentMinutesHelpText, this._originalLicenseDetails.hostedAgentMinutesFreeCount));

            this.canManageOnPremUsers(this._canManageOnPremUsers && this.hasBasicLicense());
        }
    }

    private _initializeAdditionalObservables(): void {
        this.isDirty = this._disposalManager.addDisposable(ko.computed({
            read: () => {
                return (this.purchasedLicenseCount() !== this._originalLicenseDetails.purchasedLicenseCount);
            },
            write: (value: boolean) => {
                return value;
            }
        }));

        this.isInvalid = this._disposalManager.addDisposable(ko.computed({
            read: () => {
                return (this.isPurchasedInvalid());
            },
            write: (value: boolean) => {
                return value;
            }
        }));

        this.enableSave = this._disposalManager.addDisposable(ko.computed(() => {
            return this.isDirty() && !this.isInvalid();
        }));

        this.totalLicenseCount = this._disposalManager.addDisposable(ko.computed(() => {
            var totalCount = this.enterpriseUsersCount()
                             + this.purchasedLicenseCount()
                             + this.purchasedHostedLicenseCount()
                             + this._originalLicenseDetails.freeLicenseCount
                             + this._originalLicenseDetails.freeHostedLicenseCount;
            return this._getTextForNumber(totalCount);
        }));

        this.totalPrivatePipelinesCount = this._disposalManager.addDisposable(ko.computed(() => {
            let total = this.enterpriseUsersCount() + this.purchasedLicenseCount() + this._originalLicenseDetails.freeLicenseCount;

            return this._getTextForNumber(total);
        }));

        this.totalHostedPipelinesCount = this._disposalManager.addDisposable(ko.computed(() => {
            return this.purchasedHostedLicenseCount() + this._originalLicenseDetails.freeHostedLicenseCount;
        }));
    }

    private _getNumber(value: string, defaultValue: number = -1): number {
        var returnValue: number = Utils_Number.parseInvariant(value);
        return (Utils_Number.isPositiveNumber(returnValue) || returnValue === 0) ? returnValue : defaultValue;
    }

    private _getTextForNumber(value: number): string {
        if (value >= AdminResourceLimitsViewModel._licenseInfinityCount) {
            return BuildResources.UnlimitedText;
        }
        else {
            // No localization, as we do not want to show delimiters in number like 1,000 etc.
            return value.toString();
        }
    }

    private _getManageUsersURL(isHosted: boolean): string {
        return isHosted
            ? TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("", "", { area: "user", project: "" })
            : TFS_Host_TfsContext.TfsContext.getDefault().getCollectionActionUrl("", "", "licenses", { area: "admin", project: "" });
    }

    private _initializeMissingOriginalDetails() {
        if (!this._originalLicenseDetails.freeLicenseCount) {
            this._originalLicenseDetails.freeLicenseCount = 0;
        }

        if (!this._originalLicenseDetails.freeHostedLicenseCount) {
            this._originalLicenseDetails.freeHostedLicenseCount = 0;
        }

        if (!this._originalLicenseDetails.purchasedLicenseCount) {
            this._originalLicenseDetails.purchasedLicenseCount = 0;
        }

        if (!this._originalLicenseDetails.purchasedHostedLicenseCount) {
            this._originalLicenseDetails.purchasedHostedLicenseCount = 0;
        }

        if (!this._originalLicenseDetails.enterpriseUsersCount) {
            this._originalLicenseDetails.enterpriseUsersCount = 0;
        }

        if (!this._originalLicenseDetails.hostedAgentMinutesFreeCount) {
            this._originalLicenseDetails.hostedAgentMinutesFreeCount = 0;
        }

        if (!this._originalLicenseDetails.hostedAgentMinutesUsedCount) {
            this._originalLicenseDetails.hostedAgentMinutesUsedCount = 0;
        }
    }

    // This is C# Int32.MaxValue [2^32-1], and decreased by one to accommodate default free count
    private static readonly _licenseInfinityCount: number = 2147483646;
    private _originalLicenseDetails: DistributedTask.TaskHubLicenseDetails;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _taskHubLicenseClient: DistributedTaskApi.TaskAgentHttpClient;
    private _disposalManager: Utils_Core.DisposalManager;
    private _canManageOnPremUsers: boolean;
}

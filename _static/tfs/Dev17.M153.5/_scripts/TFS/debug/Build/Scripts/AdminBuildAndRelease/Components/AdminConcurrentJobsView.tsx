/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Q = require("q");

import { css } from "OfficeFabric/Utilities";
import { Icon } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";

import Component_Base = require("VSS/Flux/Component");

import DistributedTask = require("TFS/DistributedTask/Contracts");
import DistributedTaskApi = require("TFS/DistributedTask/TaskAgentRestClient");
import DTConstants = require("Presentation/Scripts/TFS/Generated/TFS.DistributedTask.Constants");
import Resources = require("Build/Scripts/Resources/TFS.Resources.Build");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { AdminBuildQueueComponentProps } from "Build/Scripts/Components/AdminBuildQueue";
import { ViewInprogressJobsView } from "Build/Scripts/AdminBuildAndRelease/Components/ViewInprogressJobsView";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";

import Service = require("VSS/Service");
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/Scripts/AdminBuildAndRelease/Components/AdminConcurrentJobsView";

export interface IProps extends Component_Base.Props {
    resourceUsages: DistributedTask.ResourceUsage[];
    taskHubLicenseDetails: DistributedTask.TaskHubLicenseDetails;
    selfHostedLicensePurchaseLink: string;
    microsoftHostedLicensePurchaseLink: string;
}

export interface Concurrency {
    parallelismTag: string;
    isHosted: boolean;
    totalConcurrentJobsCount: number;
    freeConcurrentJobsCount: number;
    visualStudioEnterpriseUsersConcurrentJobsCount: number;
    purchasedConcurrentJobsCount: number;
    totalFreeMinutes: number;
    consumedFreeMinutes: number;
}

export interface ConcurrentJobsState extends Component_Base.State {
    publicProjectsMicrosoftHostedConcurrency: Concurrency;
    publicProjectsSelfHostedConcurrency: Concurrency;
    totalMarketplacePurchasedLicenseCount: number;
}

export class AdminConcurrentJobsView extends Component_Base.Component<IProps, ConcurrentJobsState> {
    constructor(props: IProps) {
        super(props);

        let tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        this._httpClient = tfsConnection.getHttpClient<DistributedTaskApi.TaskAgentHttpClient>(DistributedTaskApi.TaskAgentHttpClient);

        let collectionUrl: string = tfsContext.contextData.collection.uri;
        this._privateProjectSelftHostedPurchaseLink = this._getRedirectUrl(collectionUrl, props.selfHostedLicensePurchaseLink);
        this._privateProjectsMicrosoftHostedPurchaseLink = this._getRedirectUrl(collectionUrl, props.microsoftHostedLicensePurchaseLink);

        this._microsoftHostedImageUrl = Utils_String.format("{0}{1}/{2}", tfsContext.configuration.getResourcesPath(), "Build", encodeURIComponent("concurrency-icon-microsoft-hosted.png"));
        this._selfHostedImageUrl = Utils_String.format("{0}{1}/{2}", tfsContext.configuration.getResourcesPath(), "Build", encodeURIComponent("concurrency-icon-self-hosted.png"));
    }

    public componentWillMount(): void {

        let state: ConcurrentJobsState = {
            publicProjectsMicrosoftHostedConcurrency: null,
            publicProjectsSelfHostedConcurrency: null,
            totalMarketplacePurchasedLicenseCount: 0
        };

        if (this.props.resourceUsages && this.props.taskHubLicenseDetails) {
            this.props.resourceUsages.forEach((resourceUsage: DistributedTask.ResourceUsage) => {
                if (resourceUsage && resourceUsage.resourceLimit) {
                    let freeJobsCount = 0;
                    let purchasedJobsCount = 0;
                    let visualStudioEnterpriseUsersCount = 0;
                    if (resourceUsage.resourceLimit.resourceLimitsData) {
                        if (resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.FreeCount]) {
                            freeJobsCount = parseInt(resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.FreeCount]);
                        }
                        
                        if (resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.PurchasedCount]) {
                            purchasedJobsCount = parseInt(resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.PurchasedCount]);
                        }
                        
                        if (resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.EnterpriseUsersCount]) {
                            visualStudioEnterpriseUsersCount = parseInt(resourceUsage.resourceLimit.resourceLimitsData[DTConstants.ResourceLimitConstants.EnterpriseUsersCount]);
                        }
                    }
    
                    let concurrency: Concurrency = {
                        parallelismTag: resourceUsage.resourceLimit.parallelismTag,
                        isHosted: resourceUsage.resourceLimit.isHosted,
                        totalConcurrentJobsCount: resourceUsage.resourceLimit.totalCount,
                        freeConcurrentJobsCount: freeJobsCount,
                        visualStudioEnterpriseUsersConcurrentJobsCount: visualStudioEnterpriseUsersCount,
                        consumedFreeMinutes: resourceUsage.usedMinutes,
                        totalFreeMinutes: resourceUsage.resourceLimit.totalMinutes,
                        purchasedConcurrentJobsCount: purchasedJobsCount
                    };
    
                    if (Utils_String.equals(concurrency.parallelismTag, DTConstants.ParallelismTagTypes.Public, true) && concurrency.isHosted) {
                        state.publicProjectsMicrosoftHostedConcurrency = concurrency;
                    }
                    else if (Utils_String.equals(concurrency.parallelismTag, DTConstants.ParallelismTagTypes.Public, true) && !concurrency.isHosted) {
                        state.publicProjectsSelfHostedConcurrency = concurrency;
                    }
                }
            });

            const concurrency = this.props.taskHubLicenseDetails;
            state.totalMarketplacePurchasedLicenseCount = concurrency.marketplacePurchasedHostedLicenses ? concurrency.marketplacePurchasedHostedLicenses.reduce((total, current) => total + current.purchaseUnitCount, 0) : 0;
        }

        this.setState(state);
    }

    public render(): JSX.Element {
        if (!this.state) {
            return (<div className="admin-concurrency-jobs-view" />);
        }

        return (<div className="admin-concurrency-jobs-view">
                    {
                        this.state.publicProjectsMicrosoftHostedConcurrency &&
                        this.state.publicProjectsSelfHostedConcurrency &&
                        <label className={css('private-concurrency-title')}>{Resources.PrivateProjectsLabel}</label>                        
                    }
                    { 
                        this._getPrivateProjectsMicrosoftHostedConcurrencyView() 
                    }
                    {
                        this._getPrivateProjectsSelfHostedConcurrencyView()
                    }
                    {
                        this.state.publicProjectsMicrosoftHostedConcurrency &&
                        this.state.publicProjectsSelfHostedConcurrency &&
                        this._getPublicProjectsSection()
                    }
                </div>);
    }

    private _getPublicProjectsSection(): JSX.Element {
        return (<div>
                    <div className={css('public-concurrency-title-section')}>
                        <label className={css('public-concurrency-title')}>{Resources.PublicProjectsLabel}</label>
                        <label className={css('free-suffix free-text')}>{Resources.FreeText}</label>
                    </div>
                    { this._getPublicProjectsMicrosoftHostedConcurrencyView(this.state.publicProjectsMicrosoftHostedConcurrency) }
                    { this._getPublicProjectsSelfHostedConcurrencyView(this.state.publicProjectsSelfHostedConcurrency) }
                </div>);
    }

    private _getPrivateProjectsMicrosoftHostedConcurrencyView(): JSX.Element {
        const concurrency = this.props.taskHubLicenseDetails;
        const showFreeTier = !concurrency.hostedLicensesArePremium;
        return (<div>
                    <div className={css('concurrency-row title-row')}>
                        <div className={css('title-header-section')}>
                            <img className="concurrency-type-icon" src={this._microsoftHostedImageUrl} />
                            <div className={css('title-and-link-section')}>
                                <div className={css('title-section')}>
                                    <label className={css('large-font')}>{Resources.MicrosoftHostedConcurrencyTitle}</label>
                                    <InfoButton
                                        isIconFocusable={true}
                                        calloutContent={{
                                                            calloutDescription: Resources.MicrosoftHostedConcurrencyInfoText,
                                                            calloutLink: this._microsoftHostedLearnMoreLink,
                                                            calloutLinkText: Resources.LearnMoreText
                                                        } as ICalloutContentProps} />
                                </div>
                                <Link className={css('small-font view-inprogress-jobs-link')} onClick={(event: React.MouseEvent<HTMLElement>) =>
                                    this._showInProgressJobs(Resources.PrivateProjectsLabel, this._microsoftHostedImageUrl, Resources.MicrosoftHostedConcurrencyTitle,
                                    {
                                        parallelismTag: DTConstants.ParallelismTagTypes.Private,
                                        isHosted: true,
                                        totalConcurrentJobsCount: concurrency.totalHostedLicenseCount,
                                        freeConcurrentJobsCount: concurrency.freeHostedLicenseCount,
                                        visualStudioEnterpriseUsersConcurrentJobsCount: concurrency.enterpriseUsersCount,
                                        consumedFreeMinutes: concurrency.hostedAgentMinutesUsedCount,
                                        totalFreeMinutes: concurrency.hostedAgentMinutesFreeCount,
                                        purchasedConcurrentJobsCount: concurrency.purchasedHostedLicenseCount
                                    } as Concurrency, event.currentTarget)}>{Resources.ViewInProgressJobsText}</Link>
                            </div>
                        </div>
                        {
                            showFreeTier &&
                            (<div className={css('free-minutes-section')}>
                                <label className={css('medium-font free-text')}>{Resources.FreeTierText}</label>
                                <label className={css('small-font')}>{Utils_String.format(Resources.TotalFreeMinutesFormat, concurrency.hostedAgentMinutesFreeCount)}</label>
                            </div>)
                        }
                        {
                            !showFreeTier &&
                            (<div className={css('value-header-section')}>
                                <label className={css('extralarge-font')}>{concurrency.totalHostedLicenseCount}</label>
                                <label className={css('small-font')}>{Resources.ConcurrentJobsText}</label>
                            </div>)
                        }
                    </div>
                    {
                        showFreeTier &&
                        (<div className={css("concurrency-row")}>
                            <label className={css('medium-font')}>
                                {Utils_String.format(Resources.ConsumedFreeMinutesFormat, concurrency.hostedAgentMinutesUsedCount, concurrency.hostedAgentMinutesFreeCount)}
                            </label>
                            <Link className={css('medium-font purchase-jobs-link purchase-concurrentjobs-link')} target="_blank" href={this._privateProjectsMicrosoftHostedPurchaseLink} >{Resources.PurchaseConcurrentJobsText}</Link>
                        </div>)
                    }
                    {
                        !showFreeTier &&
                        (<div className={css("concurrency-row")}>
                            <label className={css('medium-font')}>
                                {Resources.MonthlyPurchasesText}
                            </label>
                            <div className={css('medium-font floatright-section')}>
                                <label className={css('medium-font concurrency-count')}>{concurrency.purchasedHostedLicenseCount}</label>
                                <Link className={css('medium-font purchase-jobs-link')} target="_blank" href={this._privateProjectsMicrosoftHostedPurchaseLink} >{Resources.ChangeText}</Link>
                            </div>
                        </div>)
                    }
                    {
                        !showFreeTier && this._getMarketplaceHostedConcurrencyViewEntries(concurrency.marketplacePurchasedHostedLicenses)
                    }
                </div>);
    }

    private _getMarketplaceHostedConcurrencyViewEntries(marketplacePurchasedHostedLicenses: DistributedTask.MarketplacePurchasedLicense[]): JSX.Element[] {
        const marketplaces = marketplacePurchasedHostedLicenses.map(x => x.marketplaceName).filter((elem, index, self) => index == self.indexOf(elem));
        const entries: JSX.Element[] = [];
        marketplaces.sort();
        for (const marketplace of marketplaces) {
            const purchasedHostedLicenses = marketplacePurchasedHostedLicenses.filter((x) => x.marketplaceName === marketplace);

            entries.push(
                <div className={css("concurrency-row-middle")}>
                    <label className={css('medium-font')}>
                        {Utils_String.format(Resources.ResourceLimitMarketplace, marketplace)}
                    </label>
                </div>);

            for (const purchasedLicense of purchasedHostedLicenses) {
                entries.push(
                    <div className={css("concurrency-row-sub-middle")}>
                        <label className={css('medium-font')}>
                            {purchasedLicense.purchaserName}
                        </label>
                        <div className={css('medium-font floatright-section')}>
                            <label className={css('medium-font concurrency-count')}>{purchasedLicense.purchaseUnitCount}</label>
                        </div>
                    </div>);
            }
            entries.push(<div className={css("concurrency-row-end")}/>);
        }

        return entries;
    }

    private _getPrivateProjectsSelfHostedConcurrencyView(): JSX.Element {
        const concurrency = this.props.taskHubLicenseDetails;
        return (<div>
            <div className={css('concurrency-row title-row')}>
                <div className={css('title-header-section')}>
                    <img className="concurrency-type-icon" src={this._selfHostedImageUrl} />
                    <div className={css('title-and-link-section')}>
                        <div className={css('title-section')}>
                            <label className={css('large-font')}>{Resources.SelfHostedConcurrencyTitle}</label>
                            <InfoButton
                                        isIconFocusable={true}
                                        calloutContent={{
                                                            calloutDescription: Resources.SelfHostedConcurrencyInfoText,
                                                            calloutLink: this._selfHostedLearnMoreLink,
                                                            calloutLinkText: Resources.LearnMoreText                                                            
                                                        } as ICalloutContentProps} />                            
                        </div>
                        <Link className={css('small-font view-inprogress-jobs-link')} onClick={(event: React.MouseEvent<HTMLElement>) => this._showInProgressJobs(Resources.PrivateProjectsLabel, this._selfHostedImageUrl, Resources.SelfHostedConcurrencyTitle, 
                            {
                                parallelismTag: DTConstants.ParallelismTagTypes.Private,
                                isHosted: false,
                                totalConcurrentJobsCount: concurrency.totalLicenseCount,
                                freeConcurrentJobsCount: concurrency.freeHostedLicenseCount,
                                visualStudioEnterpriseUsersConcurrentJobsCount: concurrency.enterpriseUsersCount,
                                consumedFreeMinutes: concurrency.hostedAgentMinutesUsedCount,
                                totalFreeMinutes: concurrency.hostedAgentMinutesFreeCount,
                                purchasedConcurrentJobsCount: concurrency.purchasedHostedLicenseCount
                            } as Concurrency, event.currentTarget)}>{Resources.ViewInProgressJobsText}</Link>
                    </div>
                </div>
                <div className={css('value-header-section')}>
                    <label className={css('extralarge-font')}>{concurrency.totalPrivateLicenseCount}</label>
                    <label className={css('small-font')}>{Resources.ConcurrentJobsText}</label>
                </div>                
            </div>
            <div className={css("concurrency-row")}>
                <label className={css('medium-font free-text')}>{Resources.FreeText}</label>
                <label className={css('medium-font')}>{Resources.ConcurrentJobsSmallText}</label>
                <label className={css('medium-font concurrency-count floatright-section')}>{concurrency.freeLicenseCount}</label>
            </div>
            <div className={css("concurrency-row")}>
                <label className={css('medium-font')}>{Resources.VisualStudioEnterpriseSubscribersText}</label>
                <InfoButton
                    isIconFocusable={true}
                    calloutContent={{
                                        calloutDescription: Resources.VisualStudioEnterpriseUsersInfoText,
                                        calloutLink: this._msdnSubscribersLearnMoreLink,
                                        calloutLinkText: Resources.LearnMoreText
                                    } as ICalloutContentProps} />                            
                <label className={css('medium-font concurrency-count floatright-section')}>{concurrency.enterpriseUsersCount}</label>
            </div>                        
            <div className={css("concurrency-row")}>
                <label className={css('medium-font')}>{Resources.MonthlyPurchasesText}</label>
                <div className={css('medium-font floatright-section')}>
                    <label className={css('medium-font concurrency-count')}>{concurrency.purchasedLicenseCount}</label>
                    <Link className={css('medium-font purchase-jobs-link')} target="_blank" href={this._privateProjectSelftHostedPurchaseLink}>{Resources.ChangeText}</Link>
                </div>
            </div>
        </div>);
    }

    private _getPublicProjectsMicrosoftHostedConcurrencyView(concurrency: Concurrency): JSX.Element {
        return (<div>
            <div className={css('concurrency-row title-row')}>
                <div className={css('title-header-section')}>
                    <img className="concurrency-type-icon" src={this._microsoftHostedImageUrl} />
                    <div className={css('title-and-link-section')}>
                        <div className={css('title-section')}>
                            <label className={css('large-font')}>{Resources.MicrosoftHostedConcurrencyTitle}</label>
                            <InfoButton
                                isIconFocusable={true}
                                calloutContent={{
                                                    calloutDescription: Resources.MicrosoftHostedConcurrencyInfoText,
                                                    calloutLink: this._microsoftHostedLearnMoreLink,
                                                    calloutLinkText: Resources.LearnMoreText                                                    
                                                } as ICalloutContentProps} />
                        </div>
                        <Link className={css('small-font view-inprogress-jobs-link')} onClick={(event: React.MouseEvent<HTMLElement>) => this._showInProgressJobs(Resources.PublicProjectsLabel, this._microsoftHostedImageUrl, Resources.MicrosoftHostedConcurrencyTitle, concurrency, event.currentTarget)}>{Resources.ViewInProgressJobsText}</Link>
                    </div>
                </div>
                <div className={css('value-header-section')}>
                    <label className={css('extralarge-font')}>{concurrency.totalConcurrentJobsCount}</label>
                    <label className={css('small-font')}>{Resources.ConcurrentJobsText}</label>
                </div>                
            </div>
        </div>);
    }

    private _getPublicProjectsSelfHostedConcurrencyView(concurrency: Concurrency): JSX.Element {
        return (<div>
            <div className={css('concurrency-row title-row')}>
                <div className={css('title-header-section')}>
                    <img className="concurrency-type-icon" src={this._selfHostedImageUrl} />
                    <div className={css('title-and-link-section')}>
                        <div className={css('title-section')}>
                            <label className={css('large-font')}>{Resources.SelfHostedConcurrencyTitle}</label>
                            <InfoButton
                                isIconFocusable={true}
                                calloutContent={{
                                                    calloutDescription: Resources.SelfHostedConcurrencyInfoText,
                                                    calloutLink: this._selfHostedLearnMoreLink,
                                                    calloutLinkText: Resources.LearnMoreText                                                   
                                                } as ICalloutContentProps} />                            
                        </div>
                        <Link className={css('small-font view-inprogress-jobs-link')} onClick={(event: React.MouseEvent<HTMLElement>) => this._showInProgressJobs(Resources.PublicProjectsLabel, this._selfHostedImageUrl, Resources.SelfHostedConcurrencyTitle, concurrency, event.currentTarget)}>{Resources.ViewInProgressJobsText}</Link>
                    </div>
                </div>
                <div className={css('value-header-section')}>
                    <label className={css('extralarge-font')}>{concurrency.totalConcurrentJobsCount}</label>
                    <label className={css('small-font')}>{Resources.ConcurrentJobsText}</label>
                </div>                
            </div>
        </div>);
    }

    private _showInProgressJobs(projectsTitle: string, imgUrl: string, concurrencyTitle: string, concurrency: Concurrency, elementToFocusOnDismiss: HTMLElement): void {
        this._httpClient.getResourceUsage(concurrency.parallelismTag, concurrency.isHosted, true).then((resourceUsage: DistributedTask.ResourceUsage) => {

            this._viewInprogressJobsPanelContainer = document.createElement("div");
            document.body.appendChild(this._viewInprogressJobsPanelContainer);
    
            let component = React.createElement(ViewInprogressJobsView, {
                projectsTitle: projectsTitle,
                imgUrl: imgUrl,
                concurrencyTitle: concurrencyTitle,
                resourceUsage: resourceUsage,
                onClosed: this._handleOnClosed,
                elementToFocusOnDismiss: elementToFocusOnDismiss
            });
    
            ReactDOM.render(component, this._viewInprogressJobsPanelContainer);

        },
        (error) => {
                alert(error.message || error);
        });
    }

    private _handleOnClosed = () => {
        ReactDOM.unmountComponentAtNode(this._viewInprogressJobsPanelContainer);
        this._viewInprogressJobsPanelContainer.remove();
    }

    private _getRedirectUrl(collectionUrl: string, targetUrl: string): string {
        return collectionUrl + "_redirect?target=" + encodeURIComponent(targetUrl);
    }

    private _httpClient: DistributedTaskApi.TaskAgentHttpClient;
    private _viewInprogressJobsPanelContainer: HTMLElement;
    private _privateProjectsMicrosoftHostedPurchaseLink: string;
    private _privateProjectSelftHostedPurchaseLink: string;
    private _microsoftHostedImageUrl: string;
    private _selfHostedImageUrl: string;

    private readonly _msdnSubscribersLearnMoreLink: string = "https://aka.ms/msdnsubscribers";
    private readonly _microsoftHostedLearnMoreLink: string = "https://aka.ms/microsofthosted";
    private readonly _selfHostedLearnMoreLink: string = "https://aka.ms/selfhosted";
}
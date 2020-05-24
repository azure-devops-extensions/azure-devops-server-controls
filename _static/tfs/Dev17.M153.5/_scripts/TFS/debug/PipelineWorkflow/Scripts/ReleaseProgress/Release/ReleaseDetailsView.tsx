import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import { ContributionIds, SupportedContributionTypes } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseSummaryView } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryView";
import { ReleaseSummaryOptionsView, IReleaseSummaryOptionsViewProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryOptionsView";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { IReleaseDetailsViewState, ReleaseDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseDetailsViewStore";
import { ContributionTelemetryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ContributionTelemetryUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as ReleaseExtensionContracts from "ReleaseManagement/Core/ExtensionContracts";

import * as Utils_String from "VSS/Utils/String";
import {MutatedItemProvider } from "VSSUI/Utilities/ItemContribution";
import { IVssContributedPivotBarItem, IVssPivotBarItemProvider} from "VSSUI/PivotBar";
import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { PivotBar, PivotBarItem } from "VSSUI/PivotBar";

import { SpinnerSize } from "OfficeFabric/Spinner";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseDetailsView";

export class ReleaseDetailsView extends Base.Component<Base.IProps, IReleaseDetailsViewState> {

    public componentWillMount() {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseDetailsViewStore = StoreManager.GetStore<ReleaseDetailsViewStore>(ReleaseDetailsViewStore);
        this._releaseActionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);

        this._releaseStore.addChangedListener(this._onReleaseStoreChanged);
        this._releaseDetailsViewStore.addChangedListener(this._handleStoreChanged);

        this.setState(this._releaseDetailsViewStore.getState());
    }

    public componentDidMount() {
        ContributionTelemetryUtils.publishReleaseProgressContributionTelemetry(ContributionIds.ReleaseDetailsViewContributionId);
    }

    public componentWillUnmount() {
        this._releaseStore.removeChangedListener(this._onReleaseStoreChanged);
        this._releaseDetailsViewStore.removeChangedListener(this._handleStoreChanged);
    }

    public render(): JSX.Element {

        return (
            <div className="release-summary-details-container">
                <OverlayPanelHeading
                    label={this.state.releaseName}
                    description={this.state.releaseStatusText}
                    infoButtonRequired={false}>
                </OverlayPanelHeading>

                <PivotBar
                    selectedPivot={this.state.selectedPivotKey}
                    onPivotClicked={this._onPivotClicked}
                    pivotProviders={this._getPivotProviders()}
                    className={"release-summary-details-pivot-bar"}>

                    {this._getSummaryPivotItem()}
                    {this._getOptionsPivotItem()}

                </PivotBar>
            </div>
        );

    }

    private _getSummaryPivotItem(): JSX.Element {
        return (
            <PivotBarItem
                className="customPadding release-summary-pivot-item"
                itemKey={ReleaseDetailsView.SUMMARY_TAB_KEY}
                name={Resources.SummaryTabTitle}
                order={1}>
                <ReleaseSummaryView />
            </PivotBarItem>
        );
    }

    private _getOptionsPivotItem(): JSX.Element {
        return (
            <PivotBarItem
                className="customPadding release-options-pivot-item"
                itemKey={ReleaseDetailsView.OPTIONS_TAB_KEY}
                name={Resources.OptionsTabItemTitle}
                order={2}>
                <ReleaseSummaryOptionsView
                    releaseNameFormat={this.state.releaseNameFormat}
                    reportDeploymentStatusToCodeEnvironmentList={this.state.reportDeploymentStatusToCodeEnvironmentList} />
            </PivotBarItem>
        );
    }

    private _onPivotClicked = (ev: React.MouseEvent<HTMLElement>, pivotKey: string): void => {
        this._releaseActionCreator.updateSelectedPivotKey(pivotKey);

        // If key is other than "summary" call the callback function
        if (Utils_String.ignoreCaseComparer(pivotKey, ReleaseDetailsView.SUMMARY_TAB_KEY)) {
            if (this._onDisplayCallBackHandler[pivotKey]) {
                this._onDisplayCallBackHandler[pivotKey]();
            }

            ContributionTelemetryUtils.publishExtensionInvokedTelemetry(ContributionIds.ReleaseDetailsViewContributionId, pivotKey);
        }
    }

    private _getPivotProviders(): IVssPivotBarItemProvider[] {
        if (!this._contributablePivotItemProviders) {
            this._contributablePivotItemProviders = [];

            let releaseStore: ReleaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
            let release: ReleaseContracts.Release = releaseStore.getRelease();
            // Using callbacks here looks ugly, but exists for supporting legacy contract.
            const provider = new ContributablePivotItemProvider<ReleaseExtensionContracts.IReleaseViewExtensionConfig>(
                [ContributionIds.ReleaseDetailsViewContributionId],
                (contribution: Contribution) => {
                    return {
                        isReleaseV2: true,
                        onReleaseChanged: (releaseCallBack) => {
                            releaseCallBack(release);
                            this._releaseActionCreator.updateToolbarContributionCallBack(contribution.id, releaseCallBack);
                        },
                        onViewDisplayed: (onDisplayCallBack) => {
                            if (!this._onDisplayCallBackHandler[contribution.id]) {
                                onDisplayCallBack();
                                this._onDisplayCallBackHandler[contribution.id] = onDisplayCallBack;
                            }
                        },
                        // This is required only for summary view, adding here just for null ref
                        selectTab: (tabId: string) => {
                        }
                    } as ReleaseExtensionContracts.IReleaseViewExtensionConfig;
                },
                {   
                    expectedContributionTypes: [SupportedContributionTypes.ReleaseSummaryTabContributionTypeId],
                    loadingComponent: () => <LoadingComponent className="cd-contributed-pivot-loading-component" ariaLabel={Resources.Loading} size={SpinnerSize.medium} />
                }
            );
            this._contributablePivotItemProviders.push(new MutatedItemProvider<IVssContributedPivotBarItem>(provider, this._mutatePivotBarItem));
        }

        return this._contributablePivotItemProviders;
    }

    private _mutatePivotBarItem = (pivotBarItem: IVssContributedPivotBarItem) => {
        let contribution = pivotBarItem.sourceContribution;
        if (contribution && contribution.properties && contribution.properties.supportsTasks) {
            pivotBarItem.hidden = this._isContributionHidden(contribution.properties.supportsTasks, this._releaseStore.getTaskIdsInUse());
        }
        return pivotBarItem;
    }

    private _isContributionHidden = (supportsTasks: string[], usedTasks: string[]): boolean => {
        supportsTasks = supportsTasks || [];
        usedTasks = usedTasks || [];
        let found = false;
        // if none of them is being used, then it's hidden
        for (let index = 0; index < supportsTasks.length; index++) {
            const element = supportsTasks[index];
            if (usedTasks.indexOf(element && element.toLowerCase()) > -1) {
                // found atleast one, done
                found = true;
                break;
            }
        }
        return !found;
    }

    private _handleStoreChanged = (): void => {
        this.setState(this._releaseDetailsViewStore.getState());
    }

    private _onReleaseStoreChanged = (): void => {
        let release: ReleaseContracts.Release = this._releaseStore.getRelease();

        for (const contributionId in this.state.releaseChangedContributionCallBack) {
            if (this.state.releaseChangedContributionCallBack.hasOwnProperty(contributionId)) {
                if (this.state.releaseChangedContributionCallBack[contributionId]) {
                    this.state.releaseChangedContributionCallBack[contributionId](release);
                }
            }
        }
    }

    private static readonly SUMMARY_TAB_KEY: string = "summary";
    private static readonly OPTIONS_TAB_KEY: string = "options";
    private _releaseDetailsViewStore: ReleaseDetailsViewStore;
    private _releaseStore: ReleaseStore;
    private _contributablePivotItemProviders: IVssPivotBarItemProvider[] = null;
    private _onDisplayCallBackHandler = {};
    private _releaseActionCreator: ReleaseActionCreator;
}

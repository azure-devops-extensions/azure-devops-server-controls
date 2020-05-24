/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/TestResultDetailsView";

import { Fabric } from "OfficeFabric/Fabric";
import { Icon } from "OfficeFabric/Icon";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { BugsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsCreator";
import { BugsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsHub";
import { BugsGridView, IBugsGridViewProps } from "TestManagement/Scripts/Scenarios/BugsGridView/ControllerViews/BugsGridView";
import { BugsGridViewSource } from "TestManagement/Scripts/Scenarios/BugsGridView/Sources/BugsGridViewSource";
import { BugsGridViewStore } from "TestManagement/Scripts/Scenarios/BugsGridView/Stores/BugsGridViewStore";
import { AttachmentsViewActionsCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsCreator";
import { AttachmentsViewActionsHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsHub";
import { HistoryViewActionsCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsCreator";
import { HistoryViewActionsHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsHub";
import { TestResultDetailsActionCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionCreator";
import { TestResultDetailsPanePivot } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { DebugDetailsComponent } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Components/DebugDetails";
import { ResultDetailsHeaderComponent } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Components/ResultDetailsHeader";
import { AttachmentsView, IAttachmentsViewProps } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/AttachmentsView";
import { HistoryView, IHistoryViewProps } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/HistoryView";
import { AttachmentsLogStoreViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsLogStoreViewSource";
import { AttachmentsViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsViewSource";
import { HistoryViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/HistoryViewSource";
import { AttachmentsViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/AttachmentsViewStore";
import { HistoryViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/HistoryViewStore";
import { ITestResultDetailsViewState, TestMode, TestResultDetailsViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/TestResultDetailsViewStore";
import { RequirementsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsCreator";
import { RequirementsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsHub";
import { IRequirementsGridViewProps, RequirementsGridView } from "TestManagement/Scripts/Scenarios/RequirementsGridView/ControllerViews/RequirementsGridView";
import { RequirementsGridViewSource } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Sources/RequirementsGridViewSource";
import { RequirementsGridViewStore } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Stores/RequirementsGridViewStore";
import { AddWorkItemHelperForDetailPanel } from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/AddWorkItemHelper";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import { IPivotBarAction, PivotBar, PivotBarItem } from "VSSUI/PivotBar";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";


export interface ITestResultDetailsViewProps extends ComponentBase.Props {
    resultDetailsStore: TestResultDetailsViewStore;
    resultDetailActionCreator: TestResultDetailsActionCreator;
    viewContext: IViewContextData;
    isFullScreen: boolean;
    showHistory: boolean;
    showHeader: boolean;
    hideTestCaseTitle?: boolean;
    showBugAndLink?: boolean;
    linkedStackTrace?: boolean;
}

export class TestResultDetailsView extends ComponentBase.Component<ITestResultDetailsViewProps, ITestResultDetailsViewState> {

    public componentWillMount(): void {
        this._handleStoreChange();

        this._addWorkItemHelper = new AddWorkItemHelperForDetailPanel(this.props.resultDetailsStore, this.props.viewContext);
    }

    public componentDidMount(): void {
        this.props.resultDetailsStore.addChangedListener(this._handleStoreChange);
    }

    public componentDidUpdate(): void {
        if (!this.state.isLoading) {
            PerformanceUtils.endScenario(TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
        }
    }

    public componentWillUnmount(): void {
        this.props.resultDetailsStore.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        const isLoading: boolean = this.state.isLoading;

        let element: JSX.Element = null;

        if (isLoading) {
            element = <div className="test-result-details-view">
                {
                    this._getLoadingSpinner()
                }
            </div>;
        } else if (this.state.loadingErrorMessage) {
            element = <div className="test-result-details-view">
                {
                    this._getErrorMessageBar()
                }
            </div>;
        } else if (this.state.testMode === TestMode.TestResult) {
            element = this._getTestResultdetailsViewBody();
        } else {
            element = this._getTestRunDetailsViewBody();
        }

        return element;
    }

    private _getTestRunDetailsViewBody(): JSX.Element {
        return (
            <div className="test-result-details-view">
                {
                    this._getTestRunNameElement()
                }
                {
                    this._getTestRunHeaderElement()
                }
                {
                    this._getRunPivotBarElement()
                }
            </div>
        );
    }

    private _getTestRunNameElement(): JSX.Element {
        return (
            <div className="test-case-title">
                <TooltipHost content={this.state.testRun.name} overflowMode={TooltipOverflowMode.Self}>
                    <span className="test-case-name">
                        {this.state.testRun.name}
                    </span>
                </TooltipHost>
            </div>
        );
    }

    private _getTestRunHeaderElement(): JSX.Element {
        return (
            <div className="test-result-header">
                <ResultDetailsHeaderComponent
                    duration={this.state.testRun.duration}
                    state={this.state.testRun.state}
                    startedDate={this.state.testRun.startedDate}
                    completedDate={this.state.testRun.completedDate}
                    testMode={TestMode.TestRun}
                />
            </div>
        );
    }

    private _getRunPivotBarElement(): JSX.Element {
        return (
            <PivotBar
                selectedPivot={this.state.selectedPivot}
                onPivotClicked={this._onPivotClicked}
                className="test-result-details-pivot-bar"
            >
                <PivotBarItem
                    itemKey={TestResultDetailsPanePivot.Debug}
                    name={Resources.DebugPivotLabel}
                    className="customPadding test-details-pane-debug test-result-details-pivot-bar-customPadding">
                    <DebugDetailsComponent
                        errorMessage={this.state.testRun.errorMessage}
                        comment={this.state.testRun.comment}>
                    </DebugDetailsComponent>
                </PivotBarItem>
                <PivotBarItem
                    className="customPadding test-details-pane-attachments"
                    itemKey={TestResultDetailsPanePivot.Attachments}
                    name={Resources.AttachmentsHeaderText}>
                    <AttachmentsView {
                        ...this._getAttachmentsViewProps(this.state.testMode)
                    } />
                </PivotBarItem>
            </PivotBar>
        );
    }

    private _getTestResultdetailsViewBody(): JSX.Element {

        let shouldShowTestRunName: boolean = this.props.isFullScreen && !!this.state.testResults
            && !!this.state.testResults.result && !!this.state.testResults.result.testRun;

        return (
            <div className="test-result-details-view">
                {
                    this.props.showHeader &&
                    !this.props.hideTestCaseTitle &&
                    <div className="test-case-title">
                        {
                            shouldShowTestRunName &&
                            <span className="test-run-name">
                                {this.state.testResults.result.testRun.name}
                            </span>
                        }
                        {
                            shouldShowTestRunName &&
                            <Icon className="test-title-sep" iconName="ChevronRight"></Icon>
                        }
                        <TooltipHost content={this.state.testResults.test} overflowMode={TooltipOverflowMode.Self}>
                            <span className="test-case-name">
                                {this.state.testResults.test}
                            </span>
                        </TooltipHost>
                    </div>
                }
                {
                    this.props.showHeader &&
                    <div className="test-result-header">
                        <ResultDetailsHeaderComponent
                            outcome={this.state.testResults.outcome}
                            duration={this.state.testResults.duration}
                            state={this.state.testResults.state}
                            startedDate={this.state.testResults.startedDate}
                            completedDate={this.state.testResults.completedDate}
                            failingContextName={this.state.testResults.failingContextName}
                            failingContextId={this.state.testResults.failingContextId}
                            isCurrentArtifact={this.state.testResults.isCurrentArtifact}
                            owner={this.state.testResults.owner}
                            computerName={this.state.testResults.computerName}
                            viewContext={this.props.viewContext.viewContext}
                            testMode={TestMode.TestResult}
                        />
                    </div>
                }

                <PivotBar
                    selectedPivot={this.state.selectedPivot}
                    className="test-result-details-pivot-bar"
                    onPivotClicked={this._onPivotClicked}
                    commands={
                        ((this.props.isFullScreen || this.props.showBugAndLink) && this.state.testMode === TestMode.TestResult)
                            ? this._getPivotBarActions()
                            : null
                    }
                >
                    <PivotBarItem
                        itemKey={TestResultDetailsPanePivot.Debug}
                        name={Resources.DebugPivotLabel}
                        className="customPadding test-details-pane-debug test-result-details-pivot-bar-customPadding">
                        <DebugDetailsComponent
                            comment={this.state.testResults.comment}
                            errorMessage={this.state.testResults.errorMessage}
                            stackTrace={this.state.testResults.stackTrace}
                            linkedStackTrace={this.props.linkedStackTrace}
                            viewContext={this.props.viewContext}
                        >
                        </DebugDetailsComponent>
                    </PivotBarItem>
                    <PivotBarItem
                        itemKey={TestResultDetailsPanePivot.WorkItems}
                        name={Resources.WorkItemsText}
                        hidden= {!TCMPermissionUtils.PermissionUtils.isWorkServiceEnabled()}
                        className="customPadding test-details-pane-workItems test-result-details-pivot-bar-customPadding">
                        {
                            this.state.testResults.result &&
                            <BugsGridView {...this._getBugsGridViewProps()} />
                        }
                        {
                            this.state.testResults.result &&
                            <RequirementsGridView {...this._getRequirementsGridViewProps()} />
                        }
                    </PivotBarItem>
                    <PivotBarItem
                        className="customPadding test-details-pane-attachments"
                        itemKey={TestResultDetailsPanePivot.Attachments}
                        name={Resources.AttachmentsHeaderText}>
                        <AttachmentsView {...this._getAttachmentsViewProps(TestMode.TestResult)} />
                    </PivotBarItem>

                    <PivotBarItem
                        className="customPadding test-result-details-pivot-bar-customPadding test-details-pane-history"
                        hidden={!(TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isTestCaseHistoryForNewUIEnabled() && this.props.showHistory)}
                        itemKey={TestResultDetailsPanePivot.History}
                        name={Resources.HistoryHeaderText}>
                        <HistoryView {...this._getHistoryViewProps()} />
                    </PivotBarItem>

                </PivotBar>
            </div>
        );
    }

    protected _getPivotBarActions(): IPivotBarAction[] {

        let pivotBarActions: IPivotBarAction[] = [];
        const hasCreateWorkItemPermission = TCMPermissionUtils.PermissionUtils.hasCreateWorkItemPermission(TfsContext.getDefault().navigation.projectId);
        if (hasCreateWorkItemPermission) {
            pivotBarActions.push(this._addWorkItemHelper.getAddBugAction());
            pivotBarActions.push(this._addWorkItemHelper.getLinkAction());
        }

        return pivotBarActions;
    }

    private _getAttachmentsViewProps(testMode: TestMode): IAttachmentsViewProps {
        let attachmentSource = null;
        let runId: number = 0;
        if (testMode === TestMode.TestResult) {
            attachmentSource = TMUtils.AttachmentSource.testResult;
            runId = this.state.testResults.runId;
        } else {
            attachmentSource = TMUtils.AttachmentSource.testRun;
            runId = this.state.testRun.runId;
        }
        const actionsHub = new AttachmentsViewActionsHub();
        const source = new AttachmentsViewSource();
        const sourceLogStore = new AttachmentsLogStoreViewSource();
        const attachmentProps: IAttachmentsViewProps = {
            testRunId: runId,
            testResultId: (this.state.testResults && this.state.testResults.result) ? this.state.testResults.result.id : 0,
            subResultId: (this.state.testResults && this.state.testResults.subResultId) ? this.state.testResults.subResultId : 0,
            attachmentSource: attachmentSource,
            store: new AttachmentsViewStore(actionsHub),
            actionsCreator: new AttachmentsViewActionsCreator(actionsHub, source, sourceLogStore)
        };

        return attachmentProps;
    }

    private _getHistoryViewProps(): IHistoryViewProps {
        const historyViewActionsHub = new HistoryViewActionsHub();
        const historyViewSource = new HistoryViewSource();
        const historyViewProps: IHistoryViewProps = {
            testCaseResult: this.state.testResults.result,
            subResultId: this.state.testResults.subResultId ? this.state.testResults.subResultId : 0,
            store: new HistoryViewStore(historyViewActionsHub),
            actionsCreator: new HistoryViewActionsCreator(historyViewActionsHub, historyViewSource),
            viewContext: this.props.viewContext,
            isFullScreen: this.props.isFullScreen
        };

        return historyViewProps;
    }

    private _getBugsGridViewProps(): IBugsGridViewProps {
        const bugsGridViewActionsHub = new BugsGridViewActionsHub();
        const bugsGridViewSource = new BugsGridViewSource();
        const bugsGridViewStore = new BugsGridViewStore(bugsGridViewActionsHub);
        const bugsGridViewActionsCreator = new BugsGridViewActionsCreator(bugsGridViewActionsHub, bugsGridViewSource);
        const bugsGridViewProps: IBugsGridViewProps = {
            actionsCreator: bugsGridViewActionsCreator,
            store: bugsGridViewStore,
            testCaseResult: this.state.testResults.result
        };

        return bugsGridViewProps;
    }

    private _getRequirementsGridViewProps(): IRequirementsGridViewProps {
        const requirementsGridViewActionsHub = new RequirementsGridViewActionsHub();
        const requirementsGridViewSource = new RequirementsGridViewSource();
        const requirementsGridViewStore = new RequirementsGridViewStore(requirementsGridViewActionsHub);
        const requirementsGridViewActionsCreator = new RequirementsGridViewActionsCreator(requirementsGridViewActionsHub, requirementsGridViewSource);
        const requirementsGridViewProps: IRequirementsGridViewProps = {
            actionsCreator: requirementsGridViewActionsCreator,
            store: requirementsGridViewStore,
            testCaseResult: this.state.testResults.result
        };

        return requirementsGridViewProps;
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.resultDetailsStore.getState());

        if (this.state) {
            if (this.state.isLoading) {
                announce(Resources.LoadingTestResultDetailsLabel);
            } else if (!this.state.isLoading && !this.state.loadingErrorMessage) {
                announce(Resources.TestResultDetailsLoadedMessage);
            }
        }
    }

    private _getLoadingSpinner(): JSX.Element {
        return <Spinner
            ariaLabel={Resources.Loading}
            className="test-result-details-view-loading-spinner"
            size={SpinnerSize.large}
            label={Resources.LoadingMessage} />;
    }

    private _getErrorMessageBar(): JSX.Element {
        return <Fabric className="test-result-details-view-error-message-bar">
            <MessageBar
                messageBarType={MessageBarType.error}
                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                className="test-result-details-view-error-message"
                isMultiline={false}>
                {this.state.loadingErrorMessage.toString()}
            </MessageBar>
        </Fabric>;
    }

    private _onPivotClicked = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pivotKey: string): void => {
        if (!!this.props.resultDetailActionCreator) {
            this.props.resultDetailActionCreator.pivotSelected(pivotKey);
        }
    }

    private _addWorkItemHelper: AddWorkItemHelperForDetailPanel;
}

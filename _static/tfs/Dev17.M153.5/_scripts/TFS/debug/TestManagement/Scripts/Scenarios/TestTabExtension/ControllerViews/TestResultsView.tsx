/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultsView";

import { CommandButton } from "OfficeFabric/Button";
import { Image } from "OfficeFabric/Image";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    ITestResultDetailsViewProps,
    TestResultDetailsView,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/TestResultDetailsView";
import {
    TestResultsListToolbarActionCreator,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionCreator";
import {
    TestResultsListToolbarActionsHub,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionsHub";
import * as SummaryView from "TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/SummaryView";
import {
    ITestResultLeftViewProps,
    TestResultLeftView,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/ControllerViews/TestResultLeftView";
import {
    TestResultsListCommandBarStore,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsListCommandBarStore";
import {
    DetailsPaneMode,
    ITestResultsViewState,
    TestResultsViewStore,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsViewStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import { ViewContext } from "TestManagement/Scripts/TestReporting/Common/Common";
import { DataProviderErrorCodes } from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { ViewContextStatus } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Html from "VSS/Utils/Html";
import { KeyCode } from "VSS/Utils/UI";
import { Splitter } from "VSSPreview/Flux/Components/Splitter";

export interface ITestResultsBaseProps extends ComponentBase.Props {
    summaryViewProps: SummaryView.ISummaryViewProps;
    leftViewProps: ITestResultLeftViewProps;
    testResultsViewStore: TestResultsViewStore;
    resultDetailsProps: ITestResultDetailsViewProps;
}

export class TestResultsView extends ComponentBase.Component<ITestResultsBaseProps, ITestResultsViewState> {

    public componentWillMount(): void {
        this._handleStoreChange();
        TestTabTelemetryService.TestResultsViewStore = this.props.testResultsViewStore;
        TestTabTelemetryService.ViewContext = ViewContext[this.props.resultDetailsProps.viewContext.viewContext];
    }

    public componentDidMount(): void {
        this.props.testResultsViewStore.addChangedListener(this._handleStoreChange);
        this._initializeToolbarActions();
        this._toggleSplitter();
    }

    public componentDidUpdate() {
        this._toggleSplitter();
    }

    public componentWillUnmount(): void {
        this.props.testResultsViewStore.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        if (this.state.isLoading) {
            return this._getLoadingSpinner();
        }

        if (this.state.errorMessage) {
            return this._getErrorMessageElement();
        }

        let left: JSX.Element = this._renderLeftPanel();
        let right: JSX.Element = null;
        if (this._shouldShowDetailsPanel()) {
            right = this._renderDetailPanel();
        }

        return <div className="test-results-container">
            {
                this.state.detailsPaneMode === DetailsPaneMode.FullScreen ?
                    right :
                    <Splitter
                        ref={this._resolveRef("_splitterComponent")}
                        left={left}
                        right={right}
                        fixedSide="right"
                        className="horizontal test-overlay-panel-component right-fix"
                        leftClassName="overview-panel scrollable-container"
                        rightClassName="details-panel"
                        initialSize={this._getInitialWidth()}
                        minWidth={this._rightPaneMinWidth}
                        isFixedPaneVisible={this._shouldShowDetailsPanel()}
                        maxWidth={this._getMaxWidth()}>
                    </Splitter>
            }
        </div>;
    }

    private _renderLeftPanel() {
        let leftViewProps: ITestResultLeftViewProps = {
            ...this.props.leftViewProps,
            context: this.state.context,
            commandBarStore: this._commandBarStore,
            testResultsToolbarActionCreator: this._toolbarActionCreator
        };
        return (
            <div className="overlay-left-section">
                <div className="test-results-summary-view">
                    <SummaryView.SummaryView {...this.props.summaryViewProps}> </SummaryView.SummaryView>
                </div>
                <TestResultLeftView {...leftViewProps} />
            </div>
        );
    }

    private _renderDetailPanel() {
        let fullScreenButton = null;
        if (this.state.detailsPaneMode === DetailsPaneMode.HalfScreen) {
            fullScreenButton = <TooltipHost
                hostClassName="overlay-panel-full-screen"
                content={Resources.EnterFullScreenModeText}>
                <CommandButton
                    ariaLabel={Resources.EnterFullScreenModeText}
                    className="enter-full-screen"
                    iconProps={{ iconName: "FullScreen" }}
                    onClick={this._enterDetailsPanelFullScreen}>
                </CommandButton>
            </TooltipHost>;

        } else if (this.state.detailsPaneMode === DetailsPaneMode.FullScreen) {
            fullScreenButton = <TooltipHost
                hostClassName="overlay-panel-full-screen"
                content={Resources.ExitFullScreenModeText}>
                <CommandButton
                    ariaLabel={Resources.ExitFullScreenModeText}
                    className="exit-full-screen"
                    iconProps={{ iconName: "BackToWindow" }}
                    onClick={this._exitDetailsPanelFullScreen}>
                </CommandButton>
            </TooltipHost>;
        }

        return (
            <div className="result-detail-panel overlay-right-section">
                {fullScreenButton}
                {
                    this.state.detailsPaneMode === DetailsPaneMode.HalfScreen &&
                    <TooltipHost
                        hostClassName="overlay-panel-close-button"
                        content={Resources.CloseDetailsPane}>
                        <CommandButton
                            ariaLabel={Resources.CloseDetailsPane}
                            iconProps={{ iconName: "Cancel" }}
                            onClick={this._closePanel}
                            onKeyDown={this._closePanelKeybordEvent}
                            ariaDescription={Resources.CloseOverlayPanel}>
                        </CommandButton>
                    </TooltipHost>
                }

                <TestResultDetailsView {...this.props.resultDetailsProps} isFullScreen={this.state.detailsPaneMode === DetailsPaneMode.FullScreen}> </TestResultDetailsView>
            </div>
        );
    }

    private _getErrorMessageElement(): JSX.Element {
        if (this.state.context.status !== ViewContextStatus.Completed
            && this._shouldShowWaitingForResultsImage(this.state.errorCode)) {
            return this._getWaitingForResultsImage();
        } else {
            return this._getEmptyResultsMessageBar(this.state.errorMessage);
        }
    }

    private _getWaitingForResultsImage(): JSX.Element {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile("waiting-for-results.png");

        return (
            <div className={"waiting-for-results-div"}>
                <Image className={"waiting-for-results-image"} src={resourceFileName} />
                <span className={"waiting-for-results-message"}>{Resources.NoTestResultsMessage}</span>
            </div>);
    }

    private _getEmptyResultsMessageBar(message: string): JSX.Element {
        /* tslint:disable:react-no-dangerous-html */
        return (
            <div className={"empty-results-div"}>
                <span
                    className={"empty-results-message-bar"}
                    dangerouslySetInnerHTML={{ __html: Utils_Html.HtmlNormalizer.normalize(message) }}
                >
                </span>
            </div>
        );
        /* tslint:enable:react-no-dangerous-html */
    }

    private _shouldShowWaitingForResultsImage(errorCode: any): boolean {
        if (errorCode &&
            (errorCode === DataProviderErrorCodes.NoTestResultsInScenario ||
                errorCode === DataProviderErrorCodes.ScenarioNotCompleted)) {
            return true;
        } else {
            return false;
        }
    }

    private _getLoadingSpinner(): JSX.Element {
        return (
        <div className="test-results-loading-spinner-div">
            <Spinner
                ariaLabel={Resources.LoadingTestResultDetailsLabel}
                className="testresultsview-loading-spinner"
                size={SpinnerSize.large}
                label={Resources.LoadingTestResultDetailsLabel} />
        </div>);
    }

    private _toggleSplitter(): void {
        if (this._splitterComponent) {
            if (this._shouldShowDetailsPanel()) {
                this._splitterComponent.expand();
            }
            else {
                this._splitterComponent.collapse();
            }
        }
    }

    private _shouldShowDetailsPanel(): boolean {
        return this.state.detailsPaneMode !== DetailsPaneMode.Off;
    }

    private _closePanel = () => {
        this.props.leftViewProps.testResultDetailsActionCreator.closeDetailsPane();
        this.props.leftViewProps.testResultsListViewActionCreator.clearTestResultFocus();

        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_PanelClose, { "count": 1 });
    }

    private _closePanelKeybordEvent = (event) => {
        // On enter pressed on the close button
        if (event.keyCode === KeyCode.ENTER) {
            this.props.leftViewProps.testResultDetailsActionCreator.closeDetailsPane();
            this.props.leftViewProps.testResultsListViewActionCreator.enableTestResultFocus();
        }
    }

    private _enterDetailsPanelFullScreen = () => {
        this.props.leftViewProps.testResultDetailsActionCreator.enterDetailsPaneFullScreen();

        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_TestRunComment, { "count": 1 });
    }

    private _exitDetailsPanelFullScreen = () => {
        this.props.leftViewProps.testResultDetailsActionCreator.exitDetailsPaneFullScreen();
    }

    private _getInitialWidth(): number {
        return Math.max(this._rightPaneMinWidth, this.props.leftViewProps.element.offsetWidth * this._initialWidthPercent / 100);
    }

    private _getMaxWidth(): number {
        return Math.max(this._rightPaneMinWidth, this.props.leftViewProps.element.offsetWidth * this._rightPaneMaxWidthPercentage / 100);
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.testResultsViewStore.getState());
    }

    private _resolveRef(refName: string) {
        if (!this._resolves) {
            this._resolves = {};
        }
        if (!this._resolves[refName]) {
            this._resolves[refName] = (ref) => {
                return this[refName] = ref;
            };
        }

        return this._resolves[refName];
    }

    private _initializeToolbarActions() {
        if (!this._commandBarStore) {
            const commandActionHub = new TestResultsListToolbarActionsHub();
            this._commandBarStore = new TestResultsListCommandBarStore(!!this.props.leftViewProps ? this.props.leftViewProps.testResultsListActionHub : null, commandActionHub, this.props.leftViewProps.treeStore, this.state.context);
            this._toolbarActionCreator = new TestResultsListToolbarActionCreator(commandActionHub);
        }
    }

    private _resolves: { [name: string]: (ref: any) => any };

    private _splitterComponent: Splitter;

    private _initialWidthPercent = 50;
    private _rightPaneMinWidth = 600;
    private _rightPaneMaxWidthPercentage = 80;

    private _commandBarStore: TestResultsListCommandBarStore;
    private _toolbarActionCreator: TestResultsListToolbarActionCreator;
}
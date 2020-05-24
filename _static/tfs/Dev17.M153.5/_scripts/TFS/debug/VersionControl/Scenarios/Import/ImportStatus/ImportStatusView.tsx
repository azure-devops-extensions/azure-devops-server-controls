/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

import { GitAsyncOperationStatus, GitImportRequestParameters, GitImportStatusDetail } from "TFS/VersionControl/Contracts";

import * as InjectDependency from "VersionControl/Scenarios/Shared/InjectDependency";
import { ColoredButton } from "VersionControl/Scenarios/Shared/ColoredButton";
import { ProgressIndicator } from "OfficeFabric/ProgressIndicator";
import { Spinner } from "OfficeFabric/Spinner";

import { ActionsHub, IImportStatusUpdatedPayload } from "VersionControl/Scenarios/Import/ImportStatus/ActionsHub";
import { ActionCreator } from "VersionControl/Scenarios/Import/ImportStatus/ActionCreator";
import { Store, IState } from "VersionControl/Scenarios/Import/ImportStatus/Store";

import * as Telemetry from "VSS/Telemetry/Services";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as ImportStatusResources from "VersionControl/Scripts/Resources/TFS.Resources.ImportStatus";

import "VSS/LoaderPlugins/Css!VersionControl/Import/ImportStatus/ImportStatus";

const isRetryOptionAvailable = false;

export interface IImportStatusViewOptions {
    repositoryId: string;
    repositoryName: string;
    projectId: string;
    importStatus: IImportStatusUpdatedPayload;
    importRequestParameters: GitImportRequestParameters;
    operationId: number;
}

export function createIn(element: HTMLElement, options: IImportStatusViewOptions) {
    ReactDOM.render(
        <ImportStatusView options={options} />,
        element);
}

export interface IImportStatusViewProps {
    options: IImportStatusViewOptions;
}

export class ImportStatusView extends React.Component<IImportStatusViewProps, IState> {

    private _storeChangeDelegate = Utils_Core.delegate(this, this._onStoreChanged);
    private actionsCreator: ActionCreator;
    private store: Store;

    constructor(props: IImportStatusViewProps, context?: any) {
        super(props, context);
        this._initialize();
        this.state = this.store.getState();
    }

    public componentDidMount() {
        this.store.addChangedListener(this._storeChangeDelegate);
    }

    public componentWillUnmount() {
        this.store.removeChangedListener(this._storeChangeDelegate);
    }

    public render(): JSX.Element {

        let topMessage: string;
        let importImage: string
        let overAllMessage: string;
        let importSourceUrl: string;
        let importImageClass = '';
        let footerComponent: JSX.Element;
        let showProgress = false;

        if (this.props.options.importRequestParameters.tfvcSource) {
            importSourceUrl = this.props.options.importRequestParameters.tfvcSource.path;
        }
        else {
            importSourceUrl = this.props.options.importRequestParameters.gitSource.url
        }

        switch (this.state.importStatus.status) {
            case (GitAsyncOperationStatus.Completed):
                {
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.IMPORTSTATUS_IMPORT_COMPLETED,
                            {
                                "operationId": this.props.options.operationId
                            }
                        )
                    );
                    importImage = 'repoImportBoxSucceeded.png';
                    importImageClass = 'import-succeed';
                    topMessage = ImportStatusResources.Success_ImportSuccessful;
                    overAllMessage = String.format(ImportStatusResources.Success_SuccessMessage, importSourceUrl);
                    footerComponent = <ImportSucceededFooter message={overAllMessage}/>;
                    break;
                }
            case (GitAsyncOperationStatus.Failed):
                {
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.IMPORTSTATUS_IMPORT_FAILED,
                            {
                                "operationId": this.props.options.operationId
                            }
                        )
                    );

                    importImage = 'repoImportBoxFailed.png';
                    topMessage = ImportStatusResources.Failed_ImportFailed;
                    overAllMessage = String.format(ImportStatusResources.Failed_FailureMessage, importSourceUrl, this.state.importStatus.statusDetail.errorMessage);
                    footerComponent = <ImportFailedFooter
                        message={overAllMessage}
                        isRetryOptionAvailable={isRetryOptionAvailable}
                        onRetryClicked={() => this.actionsCreator.retryImportOperation()}
                        onCancelClicked={() => this.actionsCreator.cancelImportOperation()}
                        areActionButtonsEnabled={this.state.isPatchRequestInProgress}
                        importRequestParameters={this.props.options.importRequestParameters}
                    />;
                    break;
                }

            case (GitAsyncOperationStatus.Queued):
            case (GitAsyncOperationStatus.InProgress):
                {
                    importImage = 'repoImportTruckMoving.png';
                    topMessage = ImportStatusResources.Progress_OnItsWay;
                    overAllMessage = String.format(ImportStatusResources.Progress_ImportMessage, importSourceUrl);
                    footerComponent = <ImportInProgressFooter message={overAllMessage}/>;
                    showProgress = true;
                    break;
                }
            default:
                {
                    Telemetry.publishEvent(
                        new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                            CustomerIntelligenceConstants.IMPORTSTATUS_UNEXPECTED_STATE,
                            {
                                "operationId": this.props.options.operationId
                            }
                        )
                    );
                    return <div/>
                }
        }

        return (
            <div className="import-progress bowtie-style">
                <div className="import-top-message">
                    {topMessage}
                </div>
                <div className="import-image-container">
                    <ImportImage imageName={importImage} className={importImageClass}/>
                </div>
                {
                    showProgress &&
                    <ImportProgressIndicator status={this.state.importStatus.statusDetail}/>
                }
                <div aria-live="polite">
                    {footerComponent}
                </div>

            </div>);
    }

    private _initialize() {
        const actionsHub = new ActionsHub();
        this.store = new Store(actionsHub, this.props.options.importStatus);
        this.actionsCreator = this._createActionsCreator(actionsHub, this.store);
    }

    private _createActionsCreator(actionsHub: ActionsHub, store: Store): ActionCreator {
        const actionsCreator = new ActionCreator(
            this.props.options.projectId,
            this.props.options.repositoryId,
            this.props.options.operationId,
            actionsHub);

        actionsCreator.startGitImportPolling();

        return actionsCreator;
    }

    private _onStoreChanged() {
        this.setState(this.store.getState());
    }
}

const ImportProgressIndicator = (props: { status: GitImportStatusDetail }): JSX.Element => {
    return (
        <div aria-live="polite">
            <ProgressIndicator percentComplete={props.status.currentStep /
                props.status.allSteps.length} />
            <Spinner label={props.status.errorMessage == null ?
                props.status.allSteps[props.status.currentStep - 1] :
                props.status.errorMessage} />
        </div>);
}

const ImportInProgressFooter = (props: { message: string }): JSX.Element => {

    return (
        <div>
            <div className="import-overall-status">
                {props.message}
            </div>
            <div className="import-footer-message">
                {ImportStatusResources.Progress_Footer}
            </div>
        </div>);
}

const ImportSucceededFooter = (props: { message: string }): JSX.Element => {

    return (
        <div>
            <div className="import-overall-status">
                {props.message}
            </div>
            <div className="import-footer-message">
                {ImportStatusResources.Success_Footer}
                <a href={window.location.href}>{ImportStatusResources.ClickHere} </a>
            </div>
        </div>);
}

const ImportFailedFooter = (props: {
    message: string,
    isRetryOptionAvailable: boolean,
    onRetryClicked(): void,
    onCancelClicked(): void,
    areActionButtonsEnabled: boolean,
    importRequestParameters: GitImportRequestParameters,
}): JSX.Element => {

    return (
        <div>
            <div className="import-overall-status">
                {props.message}
            </div>
            {
                props.importRequestParameters.gitSource &&
                <a
                    href={VCResources.ImportRepositoryLearnMoreHyperlink}
                    target="_blank"
                    rel="noopener noreferrer">
                    {VCResources.ImportRepositoryLearnMoreAboutErrorLabel}
                </a>
            }
            {
                props.importRequestParameters.tfvcSource &&
                <a
                    href={VCResources.ImportRepositoryTFVCLearnMoreHyperlink}
                    target="_blank"
                    rel="noopener noreferrer">
                    {VCResources.ImportRepositoryLearnMoreAboutErrorLabel}
                </a>
            }
            <div className="import-footer-message">
                {ImportStatusResources.Failed_Footer}
            </div>
            {
                props.isRetryOptionAvailable &&
                <span className="import-status-button" key="retrySpan">
                    <ColoredButton
                        buttonText={ImportStatusResources.Retry}
                        key="button"
                        isCta={true}
                        onClick={() => props.onRetryClicked()}
                        disabled={props.areActionButtonsEnabled} />
                </span>
            }
            <span className="import-status-button" key="cancelSpan">
                <ColoredButton
                    buttonText={ImportStatusResources.Cancel}
                    key="button"
                    isCta={false}
                    onClick={() => props.onCancelClicked()}
                    disabled={props.areActionButtonsEnabled} />
            </span>
        </div>);
}

interface ImportImageProps {
    imageName: string;
    className: string;
}

const ImportImage = InjectDependency.useTfsContext<ImportImageProps>((tfsContext, props) =>
    <img alt="" className={"import-image" + " " + props.className} src={tfsContext.configuration.getResourcesFile(props.imageName)} />);

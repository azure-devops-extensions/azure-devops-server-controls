/// <reference types="react" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { IReleaseEnvironmentNodeExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import {
    IReleaseEnvironmentTestResultsProps,
    IReleaseEnvironmentDetails,
    ReleaseEnvironmentTestResults
} from "TestManagement/Scripts/Scenarios/ReleaseCanvas/ControllerViews/ReleaseEnvironmentTestResults";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";

export interface ITestResultsReleaseCanvasExtension extends IReleaseEnvironmentNodeExtensionContext {
}

export class TestResultsReleaseCanvasExtension extends Controls.Control<ITestResultsReleaseCanvasExtension> {

    public initialize(): void {
        super.initialize();
        this._rootElement = this.getElement()[0];
        this._createView();
    }

    public dispose() {
        super.dispose();
        ReactDOM.unmountComponentAtNode(this._rootElement);
    }

    private _createView(): void {
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureCanvasInRelease_canvasRendered, {
            [TestTabTelemetryService.featureCanvasInRelease_releaseId]: this._options.releaseId,
            [TestTabTelemetryService.featureCanvasInRelease_releaseEnvironmentId]: this._options.releaseEnvironmentId
        });
        if (this._options.releaseId && this._options.releaseId > 0) {
            const releaseEnvironmentDetails: IReleaseEnvironmentDetails = {
                releaseId: this._options.releaseId,
                releaseEnvironmentId: this._options.releaseEnvironmentId,
                environmentStatus: this._options.initialStatus
            };

            const props: IReleaseEnvironmentTestResultsProps = {
                releaseEnvironmentDetails: releaseEnvironmentDetails,
                hostEventUpdateId: this._options.hostEventUpdateId,
                setVisibility: this._options.setVisibilityState
            };

            ReactDOM.render(
                React.createElement(ReleaseEnvironmentTestResults, props),
                this._rootElement
            );
        }
    }

    private _rootElement: HTMLElement;
}

SDK.registerContent("releaseCanvas.testResults.details.initialize", (context) => {
    return Controls.Control.create<TestResultsReleaseCanvasExtension, ITestResultsReleaseCanvasExtension>(
        TestResultsReleaseCanvasExtension, context.$container, context.options);
});

/// <reference types="react" />
import { ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import { ITestResultAnalyticsExtensionOptions, TestResultAnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { ITestReportContext } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as TCMContracts from "TFS/TestManagement/Contracts";


export interface ITestResultsAnalyticsReportOptions extends ITestResultAnalyticsExtensionOptions {
    definitionId: number;
    contextType: TCMContracts.TestResultsContextType;
}

export class TestResultsAnalyticsReport extends TestResultAnalyticsExtension<ITestResultsAnalyticsReportOptions> {

    public initialize(){        
        this.definitionId = this._options.definitionId;
        this.contextType = this._options.contextType;        
        super.initialize();
    }

    protected _createView(): void {
        if (!!this.definitionId) {
            let testReportContext: ITestReportContext;
            switch (this._options.contextType) {
                case TCMContracts.TestResultsContextType.Build:
                    testReportContext = {
                        contextType: TCMContracts.TestResultsContextType.Build,
                        build: { definitionId: this.definitionId } as TCMContracts.BuildReference,
                        definitionId: this.definitionId
                    } as ITestReportContext;
                    break;
                case TCMContracts.TestResultsContextType.Release:
                    testReportContext = {
                        contextType: TCMContracts.TestResultsContextType.Release,
                        release: { definitionId: this.definitionId } as TCMContracts.ReleaseReference,
                        definitionId: this.definitionId
                    } as ITestReportContext;
                    break;
            }

            if (!!testReportContext) {
                this._createReportView(testReportContext, this.definitionId.toString());
            }
        }
    }

    protected _getAnalyticsComponentsLoadingSpinnerProps(): ISpinnerProps {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.large
        } as ISpinnerProps;
    }
}
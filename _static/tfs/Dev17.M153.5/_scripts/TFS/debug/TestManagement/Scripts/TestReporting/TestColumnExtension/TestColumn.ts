
import q = require("q");

import { Release, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { IContributionHtmlData, IContributionHtmlSpanData, IContributionHtmlLink } from "ReleaseManagement/Core/ExtensionContracts";

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";

import TCMContracts = require("TFS/TestManagement/Contracts");

import { delegate } from "VSS/Utils/Core";
import { logVerbose, logInfo, logError } from "VSS/Diag";
import { format as StringFormat, localeFormat as StringLocalFormat } from "VSS/Utils/String";

/**
 * @brief Class to fetch release information from server and create content for test column
 */
export class TestColumn {

    /**
     * @brief prepares data to be passed back to contribution host
     * @param release
     */
    public getData(release: Release): IPromise<IDictionaryNumberTo<IContributionHtmlData>> {
        let data: IDictionaryNumberTo<IContributionHtmlData> = {};
        let promises: IPromise<IContributionHtmlData>[] = [];

        this._resetTelemetryNumbers();

        release.environments.forEach((environment: ReleaseEnvironment) => {
            let promise: IPromise<IContributionHtmlData>;

            promise = this._getHtmlDataForEnvironment(release, environment);
            promise.then((htmlData: IContributionHtmlData) => {
                data[environment.id] = htmlData;
            });

            promises.push(promise);
        });

        this._telemetryEnvironmentCount = release.environments.length;

        return q.all(promises).then(() => {
            this._updateTelemetryNumbers();
            return data;
        }, (error) => {
            logError(StringFormat("Error fetching data: {0}", error.message || error));
            return error;
        });
    }

    public selectTab: (tabId: string, additionalUrlParams?: IDictionaryStringTo<string>) => void;

    private _getHtmlDataForEnvironment(release: Release, environment: ReleaseEnvironment): IPromise<IContributionHtmlData> {
        let htmlData: IContributionHtmlData;

        let queryParameter = DataProvider.getTestQueryParameter(CommonBase.ViewContext.Release, <Common.IData>{
            mainData: release,
            subData: { environment: environment }
        });

        return DataProvider.getDataProvider(CommonBase.ViewContext.Release).then((dataProvider) => {
            return dataProvider.getViewContextData(queryParameter, DataProviderCommon.DataType.TestReport);
        }).then<IContributionHtmlData>((resultSummary: TCMContracts.TestResultSummary) => {
            let passPercent: string;

            passPercent = this._getPassPercent(resultSummary);
            htmlData = <IContributionHtmlData>{
                spanItems: [this._getPassPercentSpanData(environment.id, passPercent)]
            };

            return q.resolve(htmlData);
        }, (error) => {
            if (error.errorCode === DataProviderCommon.DataProviderErrorCodes.NoTestResultsInScenario) {
                htmlData = <IContributionHtmlData>{
                    spanItems: [this._getNoTestHtmlSpanData()]
                };
                return q.resolve(htmlData) as any;
            } else {
                q.reject(error);
            }
        });
    }

    private _getNoTestHtmlSpanData(): IContributionHtmlSpanData {
        return <IContributionHtmlSpanData>{
            text: Resources.NoTestsText,
            foregroundColor: Common.Constants.SuppressedTextForegroundColor,
            link: null
        };
    }

    private _getPassPercentSpanData(environmentId: number, passPercent: string): IContributionHtmlSpanData {
        return <IContributionHtmlSpanData>{
            text: StringLocalFormat(Resources.TestRunPassPercentString, passPercent),
            foregroundColor: Common.Constants.HyperLinkTextForegroundColor,
            link: this._getLink(environmentId.toString())
        };
    }

    private _getPassPercent(resultSummary: TCMContracts.TestResultSummary): string {
        let numerator = (resultSummary.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed]) ? resultSummary.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed].count : 0x00;
        let denominator = resultSummary.aggregatedResultsAnalysis.totalTests || 0x01;

        let passPercent = (numerator / denominator) * 100;

        this._telemetryEvironmentCountWithTests++;

        if (resultSummary.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Failed]) {
            this._telemetryEnvironmentCountWithFailedTests++;
        }

        return (passPercent === Math.round(passPercent)) ? passPercent.toString() : CommonUtils.TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(passPercent, 2);
    }

    private _getLink(linkId: string): IContributionHtmlLink {
        return <IContributionHtmlLink>{
            linkId: linkId,
            onLinkClicked: delegate(this, this._openTestTab)
        };
    }

    private _openTestTab(environmentId: string): void {
        if ($.isFunction(this.selectTab)) {
            this.selectTab(Common.ExtensionNames.TestTabInReleaseSummary, {
                [Common.Constants.SelectedEnvironmentIdUrlOption]: environmentId
            });
        } else {
            logError("selecTab is not a function.");
        }
    }

    private _updateTelemetryNumbers(): void {
        TelemetryService.publishEvents(TelemetryService.featureTestColumnExtension, {
            ["TotalEnvironmentCount"]: this._telemetryEnvironmentCount,
            ["TotalEnvironmentCountWithTests"]: this._telemetryEvironmentCountWithTests,
            ["TotalEnvironmentCountWithFailedTests"]: this._telemetryEnvironmentCountWithFailedTests,
            ["TotalTestsExist"]: (this._telemetryEvironmentCountWithTests > 0) ? "Yes" : "No",
            ["FailedTestsExist"]: (this._telemetryEnvironmentCountWithFailedTests > 0) ? "Yes" : "No"
        });
    }

    private _resetTelemetryNumbers(): void {
        this._telemetryEvironmentCountWithTests = 0;
        this._telemetryEvironmentCountWithTests = 0;
        this._telemetryEnvironmentCountWithFailedTests = 0;
    }

    private _telemetryEvironmentCountWithTests: number;
    private _telemetryEnvironmentCountWithFailedTests: number;
    private _telemetryEnvironmentCount: number;
}

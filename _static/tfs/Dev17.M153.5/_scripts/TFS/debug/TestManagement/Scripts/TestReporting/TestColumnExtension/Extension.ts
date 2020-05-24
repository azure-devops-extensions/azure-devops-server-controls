
import { Release } from "ReleaseManagement/Core/Contracts";
import { IReleaseEnvironmentsSummaryDataExtension, IReleaseEnvironmentsSummaryDataExtensionConfig, IContributionHtmlData } from "ReleaseManagement/Core/ExtensionContracts";

import { TestColumn } from "TestManagement/Scripts/TestReporting/TestColumnExtension/TestColumn";
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { ReleaseDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Release.DataProvider";
import { IDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { ViewContext } from "TestManagement/Scripts/TestReporting/Common/Common";

import * as Diag from "VSS/Diag";
import { registerContent as SdkRegisterContent, InternalContentContextData } from "VSS/SDK/Shim";
import { delegate } from "VSS/Utils/Core";
import { format as StringFormat } from "VSS/Utils/String";

export interface ITestResultsInEnvironmentContributionOptions extends IReleaseEnvironmentsSummaryDataExtension {
}

/**
 * @brief Contribution for Test column in Environment summary section.
 * @Detailed The contribution adds a column named Test in the Environment summary section and shows pass percentage for each environment.
 */
export class TestColumnInEnvironmentSummaryContribution implements ITestResultsInEnvironmentContributionOptions {

    /**
     * @brief constructor initializes the onReleaseChanged delegate
     * @param options passed from the contribution host
     */
    public constructor(config: IReleaseEnvironmentsSummaryDataExtensionConfig) {
        this._testColumn = new TestColumn();
        this._testColumn.selectTab = delegate(config, config.selectTab);
        this._initializeDataProviders();
    }

    /**
     * @brief Callback method that will be called on every release changed event
     * @param release
     */
    public onReleaseChanged(release: Release): IPromise<IDictionaryNumberTo<IContributionHtmlData>> {
        Diag.logVerbose(StringFormat("[TestColumnInEnvironmentSummaryContribution._handleReleaseChangedEvent]: received onReleaseChanged event. ReleaseId: {0}", release.id));
        return this._testColumn.getData(release);
    }

    /**
     * @brief Added only for Testability. Not to be used in Product.
     */
    public getTestColumnObjectForTesting(): TestColumn {
        if (Diag.getDebugMode()) {
            return this._testColumn;
        } else {
            throw new Error("This method is to be used only in Unit test");
        }
    }

    private _initializeDataProviders(): void {
        if (!DataProvider.IsInitialized(ViewContext.Release)) {
            this._dataProvider = new ReleaseDataProvider();
            DataProvider.initializeDataProvider(ViewContext.Release, this._dataProvider);
        }
    }

    private _testColumn: TestColumn;
    private _dataProvider: IDataProvider;
}

SdkRegisterContent("ms.vss-test-web.test-results-environments-summary-data", (context: InternalContentContextData) => {
    return new TestColumnInEnvironmentSummaryContribution(context.options);
});
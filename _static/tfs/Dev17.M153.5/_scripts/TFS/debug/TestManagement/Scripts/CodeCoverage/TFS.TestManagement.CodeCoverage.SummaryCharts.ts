import ko = require("knockout");

import BuildContracts = require("TFS/Build/Contracts");
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import ResultsSummaryCharts = require("TestManagement/Scripts/TestReporting/TestTabExtension/Summary");
import Utils = require("TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils");

import TCMContracts = require("TFS/TestManagement/Contracts");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import domElement = Utils_UI.domElem;

/// <summary>
/// Code coverage summary charts section control
/// </summary>
export class CodeCoverageSummaryCharts extends Controls.Control<CodeCoverageSummaryChartViewModel> {
    constructor(viewModel: CodeCoverageSummaryChartViewModel) {
        super(viewModel);
        this._viewModel = viewModel;
    }

    public initialize() {
        super.initialize();
        this._load();
    }

    private _load(): void {
        let content: JQuery,
            layout: JQuery;

        layout = $(`
                    <!-- ko if: showCoverageData -->
                        <div class='summary-charts-section'>
                            <!-- ko foreach: codeCoverageData -->
                                <div class='config-summary-chart-section'>
                                    <!-- ko if: (buildFlavor() && buildPlatform())  -->
                                        <div class='config-summary-build-platform'>
                                                <div class='build-value' data-bind='text: buildFlavor'/>
                                                <div class='platform-value' data-bind='text: buildPlatform'/>
                                        </div>
                                    <!-- /ko -->
									<!-- ko if: (buildFlavor() && !buildPlatform())  -->
                                        <div class='config-summary-build-platform'>
                                                <div class='build-value' data-bind='text: buildFlavor'/>
                                        </div>
                                    <!-- /ko -->
									<!-- ko if: (!buildFlavor() && buildPlatform())  -->
                                        <div class='config-summary-build-platform'>
                                                <div class='platform-value' data-bind='text: buildPlatform'/>
                                        </div>
                                    <!-- /ko -->
                                    <!-- ko foreach: codeCoverageStats -->
                                        <div class='config-stat-chart-section'>
                                            <div class='chart-heading' data-bind='text: label ' />
                                            <div class='chart-content'>
                                                <div class='bar-chart-container'>
                                                    <div class='covered-bar' data-bind='style : { width: coveredPercentage, "border-width": coveredBorder } ' />
                                                    <div class='not-covered-bar' data-bind='style : { width: notCoveredPercentage, "border-width": notCoveredBorder }' />
                                                </div>
                                                <div class='value-surface'>
                                                    <div class='main-value' data-bind='text: percentageText' />
                                                    <!-- ko if: diff().diffType == 0 -->
                                                        <div class='increment-value-improved' data-bind='text: diff().value' />
                                                        <div class="bowtie-icon bowtie-arrow-up-right success" />
                                                    <!-- /ko -->
                                                    <!-- ko if: diff().diffType == 1 -->
                                                        <div class='increment-value-worsened' data-bind='text: diff().value' />
                                                        <div class="bowtie-icon bowtie-arrow-down-right error" />
                                                    <!-- /ko -->
                                                </div>
                                                <div class='stat-surface'>
                                                    <div class='coverage-stat' data-bind='text: coverageStat' />
                                                </div>
                                            </div>
                                        </div>
                                        <!-- ko if: $index() !== arrayLength() -->
                                            <div class='separator' />
                                        <!-- /ko -->
                                    <!-- /ko -->
                                    <div class='config-stat-link-section'>
                                        <span class='config-stat-link-section-span'>
                                            <!-- ko if: buildCodeCoverageSummaryVisibility -->
                                                <a data-bind='visible: buildCodeCoverageSummaryVisibility, attr: { href: buildCodeCoverageSummaryLink }, text: buildCodeCoverageSummaryTitle, click: pushDownloadCCTelemetry'></a>
                                            <!-- /ko -->
                                            <!-- ko ifnot: buildCodeCoverageSummaryVisibility -->
                                                <div class='config-stat-link-not-available-text' data-bind='text: buildCodeCoverageNoSummaryLink' />
                                            <!-- /ko -->
                                        </span>
                                    </div>
                                </div>
                            <!-- /ko -->
                        </div>
                    <!-- /ko -->
                `);

        this._element.append(layout);

    }

    private _viewModel: CodeCoverageSummaryChartViewModel;
}


export class CodeCoverageSummaryChartViewModel implements ViewModel.IResultsViewModel {

    constructor(messageViewModel: MessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel) {
        viewModelList.add(this);
        this._messageViewModel = messageViewModel;
    }



    public load(viewContextdata: Common.IViewContextData): void {
        this.showUnavailabiltyMessage(false);
        this._messageViewModel.logInfo(Resources.FetchingCodeCoverageData);
        Diag.logVerbose("[CodeCoverageSummaryChartViewModel : load]: Processing callback");
        Diag.logVerbose(Utils_String.format("[CodeCoverageSummaryChartViewModel : load]: Build Id : {0}", viewContextdata.data.mainData.id));

        let testQueryParam = DataProvider.getTestQueryParameter(viewContextdata.viewContext, viewContextdata.data);
        this._fetchData(viewContextdata, testQueryParam);
    }

    public handleOnDisplayed(): void {
        // Do nothing...
    }

    private update(codeCoverageData: CodeCoverageDataViewModel[]): void {
        Diag.logVerbose("[CodeCoverageSummaryChartViewModel.update]: Update method called");
        if (codeCoverageData) {
            this._messageViewModel.clear();
            this.showCoverageData(true);
            this.codeCoverageData(codeCoverageData);
            this.codeCoverageData.valueHasMutated();
        }
    }

    public createCoverageDataModel(codeCoverageData: TCMContracts.CodeCoverageSummary, vsTestCoverageData?: TCMContracts.BuildCoverage[], downloadUrl?: string): void {
        Diag.logVerbose("[CodeCoverageSummaryChartViewModel.update]: Creating coverage data models");
        let _this = this;
        let codeCoverageDataModels: CodeCoverageDataViewModel[] = [];

        for (let index = 0; index < codeCoverageData.coverageData.length; index++) {
            if (!downloadUrl && vsTestCoverageData && vsTestCoverageData[index]) {
                codeCoverageDataModels.push(new CodeCoverageDataViewModel(codeCoverageData.coverageData[index], vsTestCoverageData[index].codeCoverageFileUrl));
            }
            else if (downloadUrl) {
                codeCoverageDataModels.push(new CodeCoverageDataViewModel(codeCoverageData.coverageData[index], downloadUrl));
            }
            else {
                codeCoverageDataModels.push(new CodeCoverageDataViewModel(codeCoverageData.coverageData[index], null));
            }
        }

        _this.update(codeCoverageDataModels);
    }

    // BuildCoverage[] Data Contract is for VSTest coverage summaries only. It is required to fetch 
    // the download urls for VsTest runs.
    private _fetchData(viewContext: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): void {

        DataProvider.getDataProvider(viewContext.viewContext).then((dataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.BuildCodeCoverage)
                .then((vsTestCodeCoverageData: TCMContracts.BuildCoverage[]) => {

                    Diag.logVerbose("[CodeCoverageSummaryChartViewModel : load]: Promise resolved");
                    if (vsTestCodeCoverageData.length > 0) {
                        this._tryLoadCodeCoverageSummary(viewContext, testQueryParam, vsTestCodeCoverageData);
                    }
                    else {
                        this._tryLoadCodeCoverageSummary(viewContext, testQueryParam);
                    }
                },
                (reason) => {
                    if (reason.buildInProgress) {
                        Diag.logInfo("[CodeCoverageSummaryChartViewModel : load]: Promise rejected because build is in progress.");
                        this._messageViewModel.logInfo(reason.info);
                    } else {
                        Diag.logVerbose("[CodeCoverageSummaryChartViewModel : load]: Promise rejected");
                        this._tryLoadCodeCoverageSummary(viewContext, testQueryParam);
                    }
                });
        }, (error) => {
            Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
        });
    } 

    // CodeCoverageSummary Data Contract is for both VsTest and Java based runs. This is used for generating final
    // charts for both Vstest and Java summaries.
    private _tryLoadCodeCoverageSummary(viewContextdata: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters, vsTestCodeCoverageData?: TCMContracts.BuildCoverage[]): void {

        DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.CodeCoverageSummary)
                .then((codeCoverageData: TCMContracts.CodeCoverageSummary) => {

                    Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _tryLoadCodeCoverageSummary]: Promise resolved");
                    this._updateCodeCoverageSummary(viewContextdata, testQueryParam, codeCoverageData, vsTestCodeCoverageData);


                },
                (reason) => {
                    Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _tryLoadCodeCoverageSummary]: Promise rejected");

                    if (reason && reason.info) {
                        this._messageViewModel.clear();
                        this.showUnavailabiltyMessage(true);
                        Diag.logVerbose("Info : " + reason.info);
                    }
                    else {
                        Diag.logInfo("Reason : " + reason);
                        this._messageViewModel.logError(reason);
                    }
                });
        }, (error) => {
            Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
        });
    }

    // BuildArtifact[] data contract is required for fetching the urls for Java based tests only.
    private _updateCodeCoverageSummary(viewContextdata: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters, codeCoverageData: TCMContracts.CodeCoverageSummary, vsTestCodeCoverageData?: TCMContracts.BuildCoverage[]): void {

        if (!vsTestCodeCoverageData) {
            Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: Fetching artifacts from build");
            DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.Artifacts)
                    .then((buildArtifacts: BuildContracts.BuildArtifact[]) => {
                        Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: Promise resolved");
                        if (buildArtifacts && buildArtifacts.length > 0) {
                            let filteredArtifacts = buildArtifacts.filter((artifact: BuildContracts.BuildArtifact) => {
                                // for now the uploaded coverage artifact name is called "CodeCoverageReport", the artifact download link will 
                                // ultimately be needed to be provided by the CodeCoverageSummary object
                                return (Utils_String.equals(artifact.name, Utils_String.format("Code Coverage Report_{0}", viewContextdata.data.mainData.id)));
                            });

                            if (filteredArtifacts.length >= 1 && filteredArtifacts[0].resource.downloadUrl && filteredArtifacts[0].resource.downloadUrl.length > 0) {

                                let url = filteredArtifacts[0].resource.downloadUrl;
                                Diag.logVerbose(Utils_String.format("URL : {0}", url));
                                Diag.logVerbose(Utils_String.format("Artifact name : {0}", filteredArtifacts[0].name));

                                Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: Updating code coverage summary view model");
                                this.createCoverageDataModel(codeCoverageData, null, url);
                            }
                            else {
                                Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: No artifacts found for downloading");
                                this.createCoverageDataModel(codeCoverageData, null, null);
                            }
                        }
                        else {
                            Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: No artifacts found for downloading");
                            this.createCoverageDataModel(codeCoverageData, null, null);
                        }
                    },
                    (reason) => {
                        Diag.logVerbose("[CodeCoverageSummaryChartViewModel : _updateCodeCoverageSummary]: Promise rejected");

                        if (reason && reason.info) {
                            this._messageViewModel.clear();
                            this.showUnavailabiltyMessage(true);
                            Diag.logVerbose("Info : " + reason.info);
                        }
                        else {
                            Diag.logInfo("Reason : " + reason);
                            this._messageViewModel.logError(reason);
                        }
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        }
        else {
            this.createCoverageDataModel(codeCoverageData, vsTestCodeCoverageData, null);
        }
    }

    public codeCoverageData: KnockoutObservableArray<CodeCoverageDataViewModel> = ko.observableArray(<CodeCoverageDataViewModel[]>[]);
    public showCoverageData: KnockoutObservable<boolean> = ko.observable(false);
    public showUnavailabiltyMessage: KnockoutObservable<boolean> = ko.observable(false);
    public coverageDataUnavailableMessage: string = Resources.BuildDetailsSummaryNoCodeCoverageNoLink;

    private _messageViewModel: MessageArea.MessageAreaViewModel;
}

/**
 * Viewmodel for build level code coverage summary
 */
export class CodeCoverageDataViewModel {
    public codeCoverageStats: KnockoutObservableArray<CodeCoverageStatViewModel> = ko.observableArray(<CodeCoverageStatViewModel[]>[]);
    public buildFlavor: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public buildPlatform: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    public buildCodeCoverageSummaryLink: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public buildCodeCoverageSummaryTitle: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public buildCodeCoverageSummaryVisibility: KnockoutObservable<boolean> = ko.observable(false);
    public buildCodeCoverageNoSummaryLink: KnockoutObservable<string> = ko.observable(Resources.BuildCodeCoverageNoResults);

    public pushDownloadCCTelemetry() {
        TCMTelemetry.TelemetryService.publishEvent(TCMTelemetry.TelemetryService.featureDownloadCodeCoverageResults, TCMTelemetry.TelemetryService.eventClicked, 1);
        return true;
    }

    constructor(codeCoverage: TCMContracts.CodeCoverageData, url: string) {
        let len: number;
        len = codeCoverage.coverageStats.length - 1;

        if (codeCoverage.coverageStats) {
            for (let index = 0; index < codeCoverage.coverageStats.length; index++) {
                this.codeCoverageStats.push(new CodeCoverageStatViewModel(codeCoverage.coverageStats[index], len));
            }
        }

        this.buildFlavor(codeCoverage.buildFlavor);
        this.buildPlatform(codeCoverage.buildPlatform);

        if (url) {
            this.buildCodeCoverageSummaryLink(url);
            this.buildCodeCoverageSummaryTitle(Resources.DownloadCodeCoverageResults);
            if(Utils.PermissionUtils.isMember())
            {
                this.buildCodeCoverageSummaryVisibility(true);
            }
            
        }

    }
}

/**
 * Viewmodel for build level code coverage summary
 */
export class CodeCoverageStatViewModel {
    public label: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public arrayLength: KnockoutObservable<number> = ko.observable(0);

    public coveredPercentage: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public notCoveredPercentage: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public coveredBorder: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public notCoveredBorder: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public percentageText: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public coverageStat: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public diff: KnockoutObservable<ResultsSummaryCharts.IDifference> = ko.observable(null);
    constructor(codeCoverageStat: TCMContracts.CodeCoverageStatistics, length: number) {
        let coveredPercentage: number;
        let notCoveredPercentage: number;
        let diff: number;

        coveredPercentage = parseFloat((codeCoverageStat.covered * 100 / codeCoverageStat.total).toFixed(2));
        notCoveredPercentage = parseFloat(((codeCoverageStat.total - codeCoverageStat.covered) * 100 / codeCoverageStat.total).toFixed(2));
        diff = codeCoverageStat.isDeltaAvailable ? parseFloat(codeCoverageStat.delta.toFixed(2)) : 0;

        this.label(codeCoverageStat.label);
        this.coveredPercentage(this.pctToWidth(coveredPercentage));
        this.notCoveredPercentage(this.pctToWidth(notCoveredPercentage));

        this._getBorderForCodeCoverageBars(coveredPercentage, notCoveredPercentage);

        this.arrayLength(length);

        this.diff(this._getDifference(diff, true, (val: number) => { return val.toFixed(1); }));

        this.percentageText(Utils_String.format("{0}%", (coveredPercentage === Math.round(coveredPercentage)) ? coveredPercentage : coveredPercentage.toFixed(2)));
        this.coverageStat(this._getCoverageStat(codeCoverageStat.covered, codeCoverageStat.total, "/"));
    }

    private _getBorderForCodeCoverageBars(coveredPercentage: number, notCoveredPercentage: number) {
        let coveredSize = parseFloat(this.pctToWidth(coveredPercentage).slice(0, -1));
        let notCoveredSize = parseFloat(this.pctToWidth(notCoveredPercentage).slice(0, -1));        

        if (coveredSize > 0 && coveredSize < 2) {
            coveredSize = Math.round(coveredSize);
            this.coveredPercentage("0%");
        }
        
        if (notCoveredSize > 0 && notCoveredSize < 1) {
            notCoveredSize = Math.round(notCoveredSize);
            this.notCoveredPercentage("0%");
        }

        if (coveredSize === 0) {
            this.coveredBorder("1px 0px 1px 0px");
        }
        else if (coveredSize === 1) {
            this.coveredBorder("1px 1px 1px 0px");
        }
        else {
            this.coveredBorder("1px 1px 1px 1px");
        }

        if (notCoveredSize === 0) {
            this.notCoveredBorder("1px 0px 1px 0px");
        }        
        else if (coveredSize === 0) {
            this.notCoveredBorder("1px 1px 1px 1px");
        }
        else {
            this.notCoveredBorder("1px 1px 1px 0px");
        }
    }

    private _getDifference(differenceValue: number,
        increaseInValueIndicatesImprovement: boolean,
        stringConverter?: (number) => string,
        stringToAppend?: string): ResultsSummaryCharts.IDifference {

        let difference: ResultsSummaryCharts.IDifference;
        if (!stringToAppend) {
            stringToAppend = Utils_String.empty;
        }

        if (!stringConverter) {
            stringConverter = (val: number) => {
                return val.toString();
            };
        }

        if (differenceValue < 0) {
            difference = {
                value: Utils_String.localeFormat("{0}{1}", stringConverter(Math.abs(differenceValue)), stringToAppend),
                diffType: increaseInValueIndicatesImprovement ? ResultsSummaryCharts.DifferenceType.Worsened : ResultsSummaryCharts.DifferenceType.Improved
            };
        }
        else if (differenceValue > 0) {
            difference = {
                value: Utils_String.localeFormat("{0}{1}", stringConverter(differenceValue), stringToAppend),
                diffType: increaseInValueIndicatesImprovement ? ResultsSummaryCharts.DifferenceType.Improved : ResultsSummaryCharts.DifferenceType.Worsened
            };
        }
        else {
            difference = {
                value: Utils_String.localeFormat("{0}{1}", stringConverter(0), stringToAppend),
                diffType: ResultsSummaryCharts.DifferenceType.Unchanged
            };
        }

        return difference;
    }

    private _getCoverageStat(covered: number, total: number, separator?: string): string {
        if (!separator) {
            separator = "/";
        }

        return Utils_String.localeFormat("{0}{1}{2}", covered.toLocaleString(), separator, total.toLocaleString());
    }

    private pctToWidth(pct: number): string {
        return (pct * 0.985).toFixed(2) + "%";
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TFS.TestManagement.CodeCoverage.SummaryCharts", exports);

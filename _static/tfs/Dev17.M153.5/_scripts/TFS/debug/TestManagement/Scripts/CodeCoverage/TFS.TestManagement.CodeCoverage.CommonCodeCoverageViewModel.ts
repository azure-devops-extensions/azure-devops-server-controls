
import ko = require("knockout");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import DataProvider = require("TestManagement/Scripts/TestReporting/Common/Extension.DataProvider");
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMCommon = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import TCMMessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import TMUtils = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.Utils");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import BuildContracts = require("TFS/Build/Contracts");
import TCMContracts = require("TFS/TestManagement/Contracts");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Performance = require("VSS/Performance");
import Utils = require("TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils");
import {LicenseAndFeatureFlagUtils} from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { ICodeCoverageSummaryViewProps } from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageSummaryView";
import { ICodeCoverageModuleDetails } from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageDetailsList";
import { ICodeCoverageDetails } from "TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.BuildCodeCoverage";

export class CommonCodeCoverageViewModel implements ViewModel.IResultsViewModel {

    constructor(viewModel: TCMMessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel) {
        Diag.logVerbose("[CommonCodeCoverageViewModel : constructor]: Registering for callback");
        viewModelList.add(this);
        this._messageAreaViewModel = viewModel;
        this._buildCodeCoverageData = null;
    }

    public load(viewContextdata: TCMCommon.IViewContextData): void {

        this.buildCodeCoverageVisibility(false);
        this.codeCoverageSummaryVisibility(false);
        this._messageAreaViewModel.logInfo(Resources.FetchingCodeCoverageData);

        if (!this._browserIsModern()) {
            this._messageAreaViewModel.logInfo(Resources.UpgradeToModernBrowser);
            this.modernBrowserAvailable(false);
        }
        else {

            let testQueryParam: DataProviderCommon.ITestsQueryParameters = {
                viewContextData: viewContextdata.data,
                sourceWorkflow: null,
                groupBy: null,
                filter: null
            };

            Diag.logVerbose("[CommonCodeCoverageViewModel : load]: Processing callback");
            Diag.logVerbose(Utils_String.format("[CommonCodeCoverageViewModel : load]: Build Id : {0}", viewContextdata.data.mainData.id));
            Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.CodeCoverageInCCTab_BeginFetchSummaryData);

            DataProvider.DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.BuildCodeCoverage)
                    .then((codeCoverageData: TCMContracts.BuildCoverage[]) => {

                        Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.CodeCoverageInCCTab_EndFetchBuildCoverageSummaryData);
                        Diag.logVerbose("[CommonCodeCoverageViewModel : load]: Promise resolved");
                        if (codeCoverageData.length > 0) {
                            this._updateBuildCodeCoverage(codeCoverageData);
                        } else {
                            this._tryLoadCodeCoverageSummary(viewContextdata, testQueryParam);
                        }
                    },
                    (reason) => {
                        if (reason.buildInProgress) {
                            Diag.logInfo("[CommonCodeCoverageViewModel : load]: Promise rejected because build is in progress.");
                            this._messageAreaViewModel.logInfo(reason.info);
                            Performance.getScenarioManager().abortScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);
                        } else {
                            Diag.logVerbose("[CommonCodeCoverageViewModel : load]: Promise rejected");
                            this._messageAreaViewModel.logInfo(reason.info);
                            this._tryLoadCodeCoverageSummary(viewContextdata, testQueryParam);
                        }
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        }
    }

    public getCodeCoverageDetails(selectedConfigurationIndex: number): ICodeCoverageDetails {
        if (!this._buildCodeCoverageData) {        
            return null;
        }
        
        const coverageData: TCMContracts.BuildCoverage = this._buildCodeCoverageData[selectedConfigurationIndex];
        const codeCoverageModuleList: ICodeCoverageModuleDetails[] = [];
        let totalLines = 0;
        let totalCoveredLines = 0;

        coverageData.modules.forEach(coverageModule => {
            Diag.logVerbose("[CommonCodeCoverageViewModel : _updateBuildCodeCoverage]: Module Codecoverage Url : " + coverageModule.fileUrl);
            
            const linesCovered = coverageModule.statistics.linesCovered | 0;
            const linesNotCovered = coverageModule.statistics.linesNotCovered | 0;
            const linesPartiallyCovered = coverageModule.statistics.linesPartiallyCovered | 0;
            
            const linesInModule = (linesCovered + linesNotCovered + linesPartiallyCovered);
            totalLines = totalLines + linesInModule;
            totalCoveredLines = totalCoveredLines + linesCovered;
            
            codeCoverageModuleList.push({
                moduleName: coverageModule.name,
                moduleUrl: coverageModule.fileUrl, 
                coveredLines: linesCovered, 
                totalLines: linesInModule,
                lineCoverage: Utils_String.localeFormat("{0}%", (linesInModule ? ((linesCovered / linesInModule) * 100) : 0).toFixed(2)),
            } as ICodeCoverageModuleDetails);
        });

        return {
            codeCoverageModuleList,
            summaryViewProps: {
                moduleCount: coverageData.modules.length,
                totalLines,
                totalCoveredLines,
                coveragePercent: Utils_String.localeFormat("{0}%", (totalLines ? ((totalCoveredLines / totalLines) * 100) : 0).toFixed(2))
            } as ICodeCoverageSummaryViewProps,

        } as ICodeCoverageDetails;
    }

    public getBuildConfigurations(): TCMContracts.BuildConfiguration[] {
        if (!this._buildCodeCoverageData) {
            return null;
        }
        return this._buildCodeCoverageData.map((coverageData: TCMContracts.BuildCoverage) => { return coverageData.configuration; });
    }

    public handleOnDisplayed(): void {
        // Do nothing
    }

    private _updateBuildCodeCoverage(codeCoverageData: TCMContracts.BuildCoverage[]): void {

        Diag.logVerbose("[CommonCodeCoverageViewModel : _updateBuildCodeCoverage]: Updating build code coverage view model");
        Diag.logVerbose("[CommonCodeCoverageViewModel : _updateBuildCodeCoverage]: File Url : " + codeCoverageData[0].codeCoverageFileUrl);

        this.buildCodeCoverageLink(codeCoverageData[0].codeCoverageFileUrl);
        this.buildCodeCoverageTitle(Resources.DownloadCodeCoverageResults);
        this._buildCodeCoverageData = codeCoverageData;

        this._messageAreaViewModel.clear();
        this.codeCoverageSummaryVisibility(false);

        if (Utils.PermissionUtils.isMember())
        {
            if (codeCoverageData[0].modules.length > 0 && LicenseAndFeatureFlagUtils.isModuleCoverageMergeEnabled())
            {
                this.buildCodeCoverageModuleVisibility(true);
                this.buildCodeCoverageVisibility(false);
            }
            else
            {
                this.buildCodeCoverageVisibility(true);
                this.buildCodeCoverageModuleVisibility(false);
            }
        }

        Performance.getScenarioManager().endScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);
    }

    private _tryLoadCodeCoverageSummary(viewContextdata: TCMCommon.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): void {

        DataProvider.DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.CodeCoverageSummary)
                .then((codeCoverageData: TCMContracts.CodeCoverageSummary) => {

                    Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.CodeCoverageInCCTab_EndFetchCodeCoverageSummaryData);
                    Diag.logVerbose("[CommonCodeCoverageViewModel : _tryLoadCodeCoverageSummary]: Promise resolved");
                    this._updateCodeCoverageSummary(viewContextdata, testQueryParam);
                },
                (reason) => {
                    Diag.logVerbose("[CommonCodeCoverageViewModel : _tryLoadCodeCoverageSummary]: Promise rejected");

                    if (reason && reason.info) {
                        Diag.logVerbose("Info : " + reason.info);
                        this._messageAreaViewModel.logInfoJQuery($("<span>" + reason.info + "</span>"));
                    }
                    else {
                        Diag.logInfo("Reason : " + reason);
                        this._messageAreaViewModel.logError(reason);
                    }

                    Performance.getScenarioManager().abortScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);
                });
        }, (error) => {
            Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
        });
    }

    private _updateCodeCoverageSummary(viewContextdata: TCMCommon.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): void {

        Diag.logVerbose("[CommonCodeCoverageViewModel : _updateCodeCoverageSummary]: Fetching artifacts from build");

        DataProvider.DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.Artifacts)
                .then((buildArtifacts: BuildContracts.BuildArtifact[]) => {

                    Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.CodeCoverageInCCTab_EndFetchBuildArtifactData);
                    Diag.logVerbose("[CommonCodeCoverageViewModel : _updateCodeCoverageSummary]: Promise resolved");
                    if (buildArtifacts && buildArtifacts.length > 0) {
                        let filteredArtifacts = buildArtifacts.filter((artifact: BuildContracts.BuildArtifact) => {
                            // for now the uploaded coverage artifact name is called "CodeCoverageReport", the artifact download link will 
                            // ultimately be needed to be provided by the CodeCoverageSummary object                        
                            return (Utils_String.equals(artifact.name, Utils_String.format("Code Coverage Report_{0}", viewContextdata.data.mainData.id)));
                        });

                        if (filteredArtifacts.length >= 1 && filteredArtifacts[0].resource && filteredArtifacts[0].resource.data && filteredArtifacts[0].resource._links.web.href && filteredArtifacts[0].resource._links.web.href.length > 0 && filteredArtifacts[0].resource.data && filteredArtifacts[0].resource.data.length > 0) {

                            let collectionUri = this._getTfsContext().collection.uri;
                            let project = this._getTfsContext().project.id;
                            let containerPath = filteredArtifacts[0].resource.data;

                            // Data format will be in this format (#/ContainerId/FolderPath)
                            // Double check if that's the format and if not take precautions
                            if (containerPath.charAt(0) === "#") {
                                containerPath = containerPath.substring(1);
                            }
                            if (containerPath.charAt(0) !== "/") {
                                containerPath = "/" + containerPath;
                            }

                            // index.html is the one that should be retrieved
                            // preferred to hardcode at client rather than at server
                            let url = collectionUri.lastIndexOf("/") === collectionUri.length - 1 ? collectionUri : collectionUri + "/"; 
                            url = url + project + "/_apis/test/CodeCoverage/browse" + containerPath + "/index.html";

                            Diag.logVerbose(Utils_String.format("URL : {0}", url));
                            Diag.logVerbose(Utils_String.format("Container Path : {0}", containerPath));

                            let locationDetails = this._getWindow();
                            if (Utils_String.equals(locationDetails.hostname, "localhost")) {
                                let urlString: string = url;
                                let portIndex: number = urlString.indexOf(locationDetails.port);
                                if (portIndex > -1) {
                                    portIndex = portIndex + locationDetails.port.length;

                                    let path: string = urlString.substr(portIndex);
                                    url = Utils_String.format("{0}{1}", locationDetails.origin, path);
                                    Diag.logVerbose(Utils_String.format("URL updated to : {0}", url));
                                    Diag.logVerbose("[CommonCodeCoverageViewModel : _updateCodeCoverageSummary]: Updating code coverage summary view model");
                                }
                            }
                            this.codeCoverageSummaryLink(url);
                            this._messageAreaViewModel.clear();
                            this.buildCodeCoverageVisibility(false);
                            this.codeCoverageSummaryVisibility(true);
                        }
                        else {
                            Diag.logWarning("Code coverage summary was found, but no artifacts were present to fetch the summary file");
                            this._messageAreaViewModel.logError(Resources.NoBuildArtifactsFound);
                        }
                    }
                    else {
                        Diag.logVerbose("[CommonCodeCoverageViewModel : _updateCodeCoverageSummary]: No code coverage data found");
                        this._messageAreaViewModel.logInfoJQuery($("<span>" + Resources.BuildDetailsSummaryNoCodeCoverageNoLink + "</span>"));
                    }

                    Performance.getScenarioManager().endScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);
                },
                (reason) => {
                    Diag.logVerbose("[CommonCodeCoverageViewModel : _updateCodeCoverageSummary]: Promise rejected");

                    if (reason && reason.info) {
                        Diag.logVerbose("Info : " + reason.info);
                        this._messageAreaViewModel.logInfoJQuery($("<span>" + Resources.BuildDetailsSummaryNoCodeCoverageNoLink + "</span>"));
                    }
                    else {
                        Diag.logInfo("Reason : " + reason);
                        this._messageAreaViewModel.logError(reason);
                    }

                    Performance.getScenarioManager().abortScenario(TMUtils.CCPerfScenarios.Area, TMUtils.CCPerfScenarios.CodeCoverageInCCTab_WithCCDetails);
                });
        }, (error) => {
            Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
        });
    }

    private _getTfsContext() {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData;
    }

    private _getWindow(): Location {
        return window.location;
    }

    private _browserIsModern(): boolean {

        let isModernBrowser = true;

        // Opera 8.0+
        let isOpera = (!!window.hasOwnProperty("opr") && !!window["opr"].addons) || !!window.hasOwnProperty("opera") || navigator.userAgent.indexOf(" OPR/") >= 0;
        // Firefox 1.0+
        let isFirefox = window.hasOwnProperty("InstallTrigger");
        // At least Safari 3+: "[object HTMLElementConstructor]"
        let isSafari = Object.prototype.toString.call(HTMLElement).indexOf("Constructor") > 0;
        // Internet Explorer 6-11
        let isIE = /*@cc_on!@*/false || "documentMode" in document;
        // Edge 20+
        let isEdge = !isIE && !!window.hasOwnProperty("StyleMedia");
        // Chrome 1+
        let isChrome = !!window.hasOwnProperty("chrome") && !!window["chrome"].webstore;

        if (isIE) {
            let ie10andbelow = navigator.userAgent.indexOf("MSIE") !== -1;
            if (ie10andbelow) {
                isModernBrowser = false;
                return isModernBrowser;
            }
        }
        else if (isOpera) {
            if (/Opera[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                isModernBrowser = false;
                return isModernBrowser;
            }
        }
        else if (isChrome) {
            if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                let cversion = Number(RegExp.$1);
                if (cversion < 4) {
                    isModernBrowser = false;
                    return isModernBrowser;
                }
            }
        }
        else if (isFirefox) {
            if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { 
                let ffversion = Number(RegExp.$1);
                if (ffversion < 17) {  //Sandboxing was supported 17.0 onwards in firefox
                    isModernBrowser = false;
                    return isModernBrowser;
                }
            }
        }
        else if (isSafari) {
            if (/Safari[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                let sversion = Number(RegExp.$1);
                if (sversion < 500) {
                    isModernBrowser = false;
                    return isModernBrowser;
                }
            }
        }

        return isModernBrowser;
    }

    public buildCodeCoverageLink: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public buildCodeCoverageTitle: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public buildCodeCoverageVisibility: KnockoutObservable<boolean> = ko.observable(false);

    public buildCodeCoverageModuleVisibility: KnockoutObservable<boolean> = ko.observable(false);
    
    public codeCoverageSummaryLink: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public codeCoverageSummaryVisibility: KnockoutObservable<boolean> = ko.observable(false);
    public modernBrowserAvailable: KnockoutObservable<boolean> = ko.observable(true);
    
    private _buildCodeCoverageData: TCMContracts.BuildCoverage[];

    private _messageAreaViewModel: TCMMessageArea.MessageAreaViewModel;
}

VSS.tfsModuleLoaded("TFS.TestManagement.CodeCoverage.CommonCodeCoverageViewModel", exports);
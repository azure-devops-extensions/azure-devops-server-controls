import * as TCMContracts from "TFS/TestManagement/Contracts";
import { TestCaseResult, TestOutcome, TestSubResult } from "TFS/TestManagement/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultTreeData, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import { IViewContextData, Constants } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TestCaseResultIdentifierWithDuration } from "TestManagement/Scripts/TFS.TestManagement";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { ago } from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export class ContractConversionUtils {

    public static getResultViewModelFromSubresult(testCaseResult: TestCaseResult, context: IViewContextData, groupId: string, subResult: TestSubResult, parentResultDepth: number): ITestResultTreeData {
        let contextId: number = 0;
        let contextName: string = Utils_String.empty;
        let isCurrentArtifact: boolean = false;
        if (testCaseResult.failingSince) {
            switch (context.viewContext) {
                case CommonBase.ViewContext.Build:
                    contextId = testCaseResult.failingSince.build ? testCaseResult.failingSince.build.id : 0;
                    contextName = this._getFailingSinceBuildString(context.data.mainData.id, testCaseResult);
                    isCurrentArtifact = context.data.mainData.id === testCaseResult.failingSince.build.id;
                    break;
                case CommonBase.ViewContext.Release:
                    contextId = testCaseResult.failingSince.release ? testCaseResult.failingSince.release.id : 0;
                    contextName = this._getFailingSinceReleaseString(context.data.mainData.id, testCaseResult);
                    isCurrentArtifact = context.data.mainData.id === testCaseResult.failingSince.release.id;
                    break;
            }
        }

        const resultViewModel: ITestResultTreeData = {
            test: (subResult.displayName) ? subResult.displayName : Utils_String.format(Resources.SubResultDisplayName, subResult.id.toString()),
            testTitle: subResult.displayName,
            storage: testCaseResult.automatedTestStorage || Utils_String.empty,
            failingSince: testCaseResult.failingSince ? ago(testCaseResult.failingSince.date) : Utils_String.empty,
            failingContextName: contextName,
            isNewFailure: false,
            runId: parseInt(testCaseResult.testRun.id),
            resultId: testCaseResult.id,
            testcaseObject: testCaseResult.testCase,
            testCaseRefId: testCaseResult.testCaseReferenceId,
            failingContextId: contextId,
            isTestCaseRow: true,
            outcome: TestOutcome[subResult.outcome],
            duration: (subResult.durationInMs) ? this.convertMilliSecondsToReadableFormatForResultSummary(subResult.durationInMs) : this.convertMilliSecondsToReadableFormatForResultSummary(0),
            dateStarted: (subResult.startedDate) ? Utils_String.dateToString(subResult.startedDate, true) : Utils_String.empty,
            dateCompleted: (subResult.completedDate) ? Utils_String.dateToString(subResult.completedDate, true) : Utils_String.empty,
            owner: (testCaseResult.owner) ? testCaseResult.owner.displayName : Utils_String.empty,
            nodeType: (subResult.resultGroupType != null && subResult.resultGroupType !== TCMContracts.ResultGroupType.None) ? TreeNodeType.group : TreeNodeType.leaf,
            depth: parentResultDepth + 1,
            parentGroupId: groupId,
            subresults: subResult.subResults,
            groupId: testCaseResult.testRun.id.toString() + "." + testCaseResult.id.toString() + "." + subResult.id.toString(),
            subResultId: subResult.id,
            isCurrentArtifact: isCurrentArtifact,
            // [TODO]: For build scenario it is not needed.
            environmentName: testCaseResult.releaseReference ? this._getEnvironmentName(context) : Utils_String.empty,
        };

        return resultViewModel;
    }

    public static getResultViewModelFromTestResult(testCaseResult: TestCaseResult, context: IViewContextData, groupId: string): ITestResultTreeData {
        let contextId: number = 0;
        let contextName: string = Utils_String.empty;
        let isCurrentArtifact: boolean = false;
        if (testCaseResult.failingSince && context) {
            switch (context.viewContext) {
                case CommonBase.ViewContext.Build:
                    contextId = testCaseResult.failingSince.build ? testCaseResult.failingSince.build.id : 0;
                    contextName = this._getFailingSinceBuildString(context.data.mainData.id, testCaseResult);
                    isCurrentArtifact = context.data.mainData.id === testCaseResult.failingSince.build.id;
                    break;
                case CommonBase.ViewContext.Release:
                    contextId = testCaseResult.failingSince.release ? testCaseResult.failingSince.release.id : 0;
                    contextName = this._getFailingSinceReleaseString(context.data.mainData.id, testCaseResult);
                    isCurrentArtifact = context.data.mainData.id === testCaseResult.failingSince.release.id;
                    break;
            }
        }

        const resultViewModel: ITestResultTreeData = {
            test: testCaseResult.testCaseTitle,
            testTitle: testCaseResult.automatedTestName,
            storage: testCaseResult.automatedTestStorage || Utils_String.empty,
            failingSince: testCaseResult.failingSince ? ago(testCaseResult.failingSince.date) : Utils_String.empty,
            failingContextName: contextName,
            isNewFailure: testCaseResult.failingSince ? context.data.mainData.id === testCaseResult.failingSince.build.id : false,
            isUnreliable: TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled() ? this._isTestUnreliable(testCaseResult.customFields) : false,
            runId: parseInt(testCaseResult.testRun.id),
            resultId: testCaseResult.id,
            testcaseObject: testCaseResult.testCase,
            testCaseRefId: testCaseResult.testCaseReferenceId,
            failingContextId: contextId,
            isTestCaseRow: true,
            expanded: false,
            outcome: TestOutcome[testCaseResult.outcome],
            duration: (testCaseResult.durationInMs) ? this.convertMilliSecondsToReadableFormatForResultSummary(testCaseResult.durationInMs) : this.convertMilliSecondsToReadableFormatForResultSummary(0),
            durationInMs: (testCaseResult.durationInMs) ? testCaseResult.durationInMs : 0,
            dateStarted: (testCaseResult.startedDate) ? Utils_String.dateToString(testCaseResult.startedDate, true) : Utils_String.empty,
            dateCompleted: (testCaseResult.completedDate) ? Utils_String.dateToString(testCaseResult.completedDate, true) : Utils_String.empty,
            owner: (testCaseResult.owner) ? testCaseResult.owner.displayName : Utils_String.empty,
            nodeType: (TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isHierarchicalViewForResultsEnabled() && (testCaseResult.resultGroupType != null && testCaseResult.resultGroupType !== TCMContracts.ResultGroupType.None)) ? TreeNodeType.group : TreeNodeType.leaf,
            depth: groupId === "-1" ? 0 : 1,
            parentGroupId: groupId,
            subresults: testCaseResult.subResults,
            groupId: testCaseResult.testRun.id.toString() + "." + testCaseResult.id.toString(),
            isCurrentArtifact: isCurrentArtifact,
            // [TODO]: For build scenario it is not needed.
            environmentName: testCaseResult.releaseReference ? this._getEnvironmentName(context) : Utils_String.empty,
        };

        return resultViewModel;
    }

    public static convertMilliSecondsToReadableFormatForResultSummary(milliSeconds: number): string {
        let hour;
        let minute;
        let second;
        let milliSecondsFormat;
        second = Math.floor(milliSeconds / 1000);
        milliSeconds = Math.floor(milliSeconds % 1000);
        minute = Math.floor(second / 60);
        second = second % 60;
        hour = Math.floor(minute / 60);
        minute = minute % 60;

        if (minute < 10) {
            minute = "0" + minute;
        }
        if (second < 10) {
            second = "0" + second;
        }

        if (milliSeconds < 10) {
            milliSecondsFormat = "00" + milliSeconds;
        } else if (milliSeconds < 100) {
            milliSecondsFormat = "0" + milliSeconds;
        } else {
            milliSecondsFormat = "" + milliSeconds;
        }

        return Utils_String.format("{0}:{1}:{2}.{3}", hour, minute, second, milliSecondsFormat);
    }

    public static sortingIdentifierAscending(a: TestCaseResultIdentifierWithDuration, b: TestCaseResultIdentifierWithDuration) {
        return ContractConversionUtils._sortDuration(a.durationInMs, b.durationInMs, true);
    }

    public static sortingIdentifierDescending(a: TestCaseResultIdentifierWithDuration, b: TestCaseResultIdentifierWithDuration) {
        return ContractConversionUtils._sortDuration(a.durationInMs, b.durationInMs, false);
    }
    
    public static sortingComparatorAscending(a: TCMContracts.TestCaseResult, b: TCMContracts.TestCaseResult) {
        return ContractConversionUtils._sortDuration(a.durationInMs, b.durationInMs, true);
    }

    public static sortingComparatorDescending(a: TCMContracts.TestCaseResult, b: TCMContracts.TestCaseResult) {
        return ContractConversionUtils._sortDuration(a.durationInMs, b.durationInMs, false);
    }

    private static _sortDuration(durationFirst: number, durationSecond: number, isAscending: boolean){
        durationFirst = durationFirst ? durationFirst : 0;
        durationSecond = durationSecond ? durationSecond : 0;
        if (isAscending) {
            return durationFirst - durationSecond;
        }
        return durationSecond - durationFirst;
    }

    private static _getEnvironmentName(context: IViewContextData): string {
        let environmentName = Utils_String.empty;
        if (context && context.data.subData) {
            environmentName = context.data.subData.environment.name;
        }
        return environmentName;
    }

    private static _getFailingSinceBuildString(buildId: number, result: TestCaseResult): string {
        const contextName: string = (buildId === result.failingSince.build.id) ? Resources.CurrentBuild : result.failingSince.build.number;
        return contextName;
    }

    private static _getFailingSinceReleaseString(releaseId: number, result: TestCaseResult): string {
        const contextName: string = (releaseId === result.failingSince.release.id) ? Resources.CurrentRelease : result.failingSince.release.name;
        return contextName;
    }

    private static _isTestUnreliable(customFields: TCMContracts.CustomTestField[]): boolean {

        if (customFields) {
            for (let index = 0; index < customFields.length; index++) {
                if (Utils_String.equals(customFields[index].fieldName, Constants.OutcomeConfidenceField, true)) {
                    return parseFloat(customFields[index].value) === 0;
                }
            }
        }

        return false;
    }
}
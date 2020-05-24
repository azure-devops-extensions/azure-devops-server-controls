import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ColumnIndices } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";

export enum TestResultFieldIds {
    Duration = 400,
    FailingRelease = 401,
    FailingSince = 402,
    Owner = 403,
    DateStarted = 404,
    DateCompleted = 405,
    EnvironmentName = 406,
    FailingBuild = 407,
}

export class ColumnOptionsHelper {

    public static InitiallyRenderingColumnList(viewContext: CommonBase.ViewContext): ColumnIndices[] {
        const columnIndices: ColumnIndices[] = [];
        columnIndices.push(ColumnIndices.Duration);
        columnIndices.push(ColumnIndices.FailingSince);
        if (viewContext === CommonBase.ViewContext.Build) {
            columnIndices.push(ColumnIndices.FailingBuild);
        } else if (viewContext === CommonBase.ViewContext.Release) {
            columnIndices.push(ColumnIndices.FailingRelease);
        }

        return columnIndices;
    }

    public static getAllAvailableColumns(viewContext: CommonBase.ViewContext): any[] {
        const columns = [];
        columns.push({
            id: TestResultFieldIds.Duration,
            key: ColumnIndices.Duration,
            name: Resources.QueryColumnNameDuration,
            width: 80,
        });
        if (viewContext === CommonBase.ViewContext.Build) {
            columns.push({
                id: TestResultFieldIds.FailingBuild,
                key: ColumnIndices.FailingBuild,
                name: Resources.ResultGridHeader_FailingBuild,
                width: 100,
            });
        } else if (viewContext === CommonBase.ViewContext.Release) {
            columns.push({
                id: TestResultFieldIds.FailingRelease,
                key: ColumnIndices.FailingRelease,
                name: Resources.ResultGridHeader_FailingRelease,
                width: 100,
            });
        }
        columns.push({
            id: TestResultFieldIds.FailingSince,
            key: ColumnIndices.FailingSince,
            name: Resources.ResultGridHeader_FailingSince,
            width: 90,
        });
        columns.push({
            id: TestResultFieldIds.Owner,
            key: ColumnIndices.Owner,
            name: Resources.ResultGridHeader_Owner,
            width: 120,
        });
        columns.push({
            id: TestResultFieldIds.DateStarted,
            key: ColumnIndices.DateStarted,
            name: Resources.ResultGridHeader_DateStarted,
            width: 150,
        });
        columns.push({
            id: TestResultFieldIds.DateCompleted,
            key: ColumnIndices.DateCompleted,
            name: Resources.ResultGridHeader_DateCompleted,
            width: 150,
        });

        return columns;
    }
}
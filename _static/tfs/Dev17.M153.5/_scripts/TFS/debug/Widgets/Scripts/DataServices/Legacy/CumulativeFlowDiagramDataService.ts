import { DateSKParser } from 'Analytics/Scripts/DateSKParser';
import { OData, ODataQueryOptions } from 'Analytics/Scripts/OData';
import { ClientConstants, FunctionNameParser } from 'Dashboards/Scripts/Common';
import Q = require('q');
import * as DateUtils from 'VSS/Utils/Date';
import * as StringUtils from 'VSS/Utils/String';
import * as CFD_Contracts from 'Widgets/Scripts/CumulativeFlowDiagramContracts';
import { Column } from 'Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient';
import { BaseAnalyticsDataService } from 'Widgets/Scripts/DataServices/Legacy/BaseAnalyticsDataService';
import * as TimeZoneUtils from 'Widgets/Scripts/Shared/TimeZoneUtilities';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");


/**
 * Encapsulates policy specific to CFD.
 */
export interface ICFDDataService {

    /**
     * Get the columns of a particular board
     */
    getBoardColumns(project: string, boardId: string): IPromise<Column[]>;

    /**
     * Get the cumulative flow history using given options
     */
    getCumulativeFlowHistory(options: CFD_Contracts.CumulativeFlowHistoryOptions): IPromise<CFD_Contracts.CFDSamplePoint[]>;
}

/**
 * Singleton service that serves CFD data to consumer
 * Data is retrieved from server via REST API and stored in-memory which avoids chattiness
 * when consumers (widgets in view, configure, lightbox mode) asks for same data
 */
export class CFDDataService extends BaseAnalyticsDataService implements ICFDDataService {

    public static command: string = "CFD";

    constructor() {
        super(CFDDataService.command);
    }

    /**
     * Get the columns of a board
     * @param project - Name or ID of a team project
     * @param boardId - ID of the board
     */
    public getBoardColumns(project: string, boardId: string): IPromise<Column[]> {
        let key = StringUtils.format("boardColumns-{0}/{1}", project, boardId);
        let cachedBoardColumns = this.getCachedData(key);
        if (cachedBoardColumns) {
            return cachedBoardColumns;
        } else {
            let queryPromise = this.analyticsClient.getBoardColumns(project, boardId);
            this.setCachedData(key, queryPromise);
            return queryPromise;
        }
    }

    /**
     * Returns trend history for a CFD chart.
     * Data is ordered by column id then by date in ascending order.
     */
    public getCumulativeFlowHistory(options: CFD_Contracts.CumulativeFlowHistoryOptions): IPromise<CFD_Contracts.CFDSamplePoint[]> {
        let queryOptions = this.getCfdQueryOptions(options);

        if (options.board == null) { throw new Error(Resources_Widgets.CumulativeFlowDiagram_BoardNeeded); } //Without a valid board id, the query will fail. The widget needs to be reconfigured.

        let key = StringUtils.format("cfd-getCumulativeFlowHistory-{0}/{1}/{2}", options.project, options.team, JSON.stringify(queryOptions));
        let cachedCFDSamplePointsPromise = this.getCachedData(key);
        if (cachedCFDSamplePointsPromise) {
            return cachedCFDSamplePointsPromise;
        } else {
            let methodName = FunctionNameParser.getMethodName(OData, OData.query);

            let queryAndProcessPromise = WidgetTelemetry.executeAndTimeAsync(CFDDataService.command, methodName,
                () => OData.query(CFDDataService.command, queryOptions, ClientConstants.WidgetAjaxTimeoutMs), {
                    "CallingFunction": FunctionNameParser.getMethodName(this, this.getCumulativeFlowHistory)
                })
                .then((data: { value: CFD_Contracts.WorkItemBoardSnapshot[] }) => {
                    return this.convertWorkItemBoardSnapshotToCFDSamplePoints(data);
                });

            this.setCachedData(key, queryAndProcessPromise);
            return queryAndProcessPromise;
        }
    }

    private convertWorkItemBoardSnapshotToCFDSamplePoints(data: { value: CFD_Contracts.WorkItemBoardSnapshot[] }): CFD_Contracts.CFDSamplePoint[] {
        return data.value.map(samplePoint => {
            return {
                Count: samplePoint.Count,
                ColumnId: samplePoint.ColumnId,
                SampleDate: DateSKParser.parseDateSKAsDateString(samplePoint.DateSK)
            };
        });
    }

    /**
     * Converts given options into ODATA query
     * @param options
     */
    private getCfdQueryOptions(options: CFD_Contracts.CumulativeFlowHistoryOptions): ODataQueryOptions {
        var startDate: Date = options.timePeriod.identifier === CFD_Contracts.TimePeriodFieldIdentifiers.RollingPeriod
            ? DateUtils.addDays(TimeZoneUtils.getTodayInAccountTimeZone(), -options.timePeriod.settings, true /* adjustDSTOffset */)
            : DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>options.timePeriod.settings);

        // $apply
        var $apply = `filter(BoardId eq ${options.board}`
            + ` and DateSK ge ${DateUtils.format(startDate, "yyyyMMdd")})`;

        if (options.boardLane != null) {
            $apply += `/filter(LaneName eq '${QueryUtilities.escapeString(options.boardLane)}')`;
        }

        $apply += "/groupby((DateSK,ColumnId), aggregate($count as Count))";

        // $orderBy
        var $orderBy = "ColumnId,DateSK";

        return {
            entityType: "WorkItemBoardSnapshot",
            oDataVersion: BaseAnalyticsDataService.axODataVersion,
            project: options.project,
            $apply: $apply,
            $orderby: $orderBy,
            followNextLink: true // Follow nextLink to make sure we retrieve all results
        };
    }
}

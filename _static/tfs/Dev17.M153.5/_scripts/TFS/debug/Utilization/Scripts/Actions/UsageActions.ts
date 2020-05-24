import Diag = require("VSS/Diag");

import VSS_Service = require("VSS/Service");

import Action_Base = require("VSS/Flux/Action");

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");
import { CommandUsage, UsageSummaryQueryCriteria, UtilizationColumn } from "Utilization/Scripts/Generated/Contracts";
import UrlState_Helper = require("Utilization/Scripts/UrlStateHelper");
import Utilization_RestClient = require("Utilization/Scripts/Generated/RestClient");

export var StartDataFetch = new Action_Base.Action<any>();
export var DataLoad = new Action_Base.Action<any>();
export var DataLoadError = new Action_Base.Action<any>();


export class UsageActionCreatorClass {

    protected _getUsageSummary: (queryCriteria: UsageSummaryQueryCriteria) => IPromise<CommandUsage[]>;

    constructor(getUsageSummary: (queryCriteria: UsageSummaryQueryCriteria) => IPromise<CommandUsage[]>) {
        this._getUsageSummary = getUsageSummary;
    }

    /**
     * Refreshes the data on the page.
     * 
     * @param urlState
     */
    public loadView(urlState: UrlState_Helper.IUrlState): void {
        let queryCriteria: UsageSummaryQueryCriteria = UrlState_Helper.getQueryCriteria(urlState, UrlState_Helper.getRecordLimitForUI());
        let payloadPromise: IPromise<CommandUsage[]> = this._getUsageSummary(queryCriteria);

        if (payloadPromise) {
            StartDataFetch.invoke(queryCriteria);
            payloadPromise.then((payload: CommandUsage[]) => {
                DataLoad.invoke({ data: payload, queryCriteria: queryCriteria });
            }, (reason: any) => {
                DataLoadError.invoke(reason);
            });
        }
    }

    /**
     * Initiates the export to a CSV file.
     *
     * @param urlState
     */
    public initiateExport(urlState: UrlState_Helper.IUrlState): void {
        let queryCriteria: UsageSummaryQueryCriteria = UrlState_Helper.getQueryCriteria(urlState, UrlState_Helper.getRecordLimitForExport());
        let payloadPromise: IPromise<CommandUsage[]> = this._getUsageSummary(queryCriteria);

        if (payloadPromise) {
            payloadPromise.then((payload: CommandUsage[]) => {
                let cols: UtilizationColumn[] = urlState.columns.split(",").map(x => UrlState_Helper.getUtilizationColumnFromString(x))
                    .concat([UtilizationColumn.Count, UtilizationColumn.Usage, UtilizationColumn.Delay]);

                let csvContent: string = cols.map(x => UrlState_Helper.ColumnNames[x]).join(",") + "\n";

                for (let i = 0; i < payload.length; i++) {
                    let fields: string[] = [];
                    let item: CommandUsage = payload[i];

                    for (let j = 0; j < cols.length; j++) {
                        let col: UtilizationColumn = cols[j];
                        let entry: string = UrlState_Helper.getStringifiedEntry(item, queryCriteria, col);
                        fields.push(UrlState_Helper.escapeForCsv(entry, col));
                    }

                    csvContent += fields.join(",") + "\n";
                }

                if (payload.length === queryCriteria.recordLimit) {
                    let textSplits = Resources.Warning_MaximumRecordsReturned.split('{0}');
                    csvContent += textSplits[0] + queryCriteria.recordLimit + textSplits[1] + "\n";
                }

                // References for downloading CSVs
                // https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
                // https://github.com/mholt/PapaParse/issues/175
                // https://stackoverflow.com/questions/31959487/utf-8-encoidng-issue-when-exporting-csv-file-javascript

                var blob = new Blob(["\ufeff"+csvContent], {type: 'text/csv;charset=utf-8;' });
                if (window.navigator.msSaveOrOpenBlob)  // IE hack; see http://msdn.microsoft.com/en-us/library/ie/hh779016.aspx
                    window.navigator.msSaveBlob(blob, "usage.csv");
                else {
                    var a = window.document.createElement("a");
                    a.href = window.URL.createObjectURL(blob);
                    a.download = "usage.csv";
                    document.body.appendChild(a);
                    a.click();  // IE: "Access is denied"; see: https://connect.microsoft.com/IE/feedback/details/797361/ie-10-treats-blob-url-as-cross-origin-and-denies-access
                    document.body.removeChild(a);
                }

            }, (reason: any) => {
                alert(reason);
            });
        }
    }
}

export var UsageActionCreator = new UsageActionCreatorClass((queryCriteria: UsageSummaryQueryCriteria): IPromise<CommandUsage[]> => {
    return VSS_Service.getClient<Utilization_RestClient.UtilizationHttpClient>(Utilization_RestClient.UtilizationHttpClient).getUsageSummary(queryCriteria);
});
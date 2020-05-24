//Auto converted from Monitoring/Scripts/TFS.Monitoring.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");

export class MonitorManager extends TFS_Service.TfsService {

    private _count: any;

    public apiLocation: any;

    constructor () {
        super();
    }

    public getApiLocation(action?: string) {
        /// <param name="action" type="string" optional="true" />
        return this.getTfsContext().getActionUrl(action || "", "monitoring", { area: "api" });
    }

    public getJobs(count, callback, errorCallback? ) {
        this._ajaxJson("GetJobs", { count: count }, callback, errorCallback);
    }

    public getJobQueue(postition, callback, errorCallback? ) {
        this._ajaxJson("GetJobQueue", { position: postition }, callback, errorCallback);
    }

    public getJobHistoryByJobId(jobId, callback, errorCallback? ) {
        this._ajaxJson("GetJobHistory", { jobId: jobId }, callback, errorCallback);
    }

    public getJobHistory(jobId, resultType, callback, errorCallback? ) {
        this._ajaxJson("GetJobHistory", { jobId: jobId, resultType: resultType }, callback, errorCallback);
    }

    public getJobHistoryForJob(startTime, endTime, jobId, callback, errorCallback? ) {
        this._ajaxJson("GetJobHistory", { startTime: null, endTime: null, jobId: jobId }, callback, errorCallback);
    }

    public getJobResultsOverTime(startTime, endTime, callback, errorCallback? ) {
        this._ajaxJson("GetJobResultsOverTime", { startTime: null, endTime: null }, callback, errorCallback);
    }

    public getJobHistoryDetails(historyId, callback, errorCallback? ) {
        this._ajaxJson("GetJobHistoryDetails", { historyId: historyId }, callback, errorCallback);
    }

    public getJobDefinitionDetails(hostId, jobId, callback, errorCallback? ) {
        this._ajaxJson("GetJobDefinitionDetails", { hostId: hostId, jobId: jobId }, callback, errorCallback);
    }

    public getJobDefinitions(hostId, callback, errorCallback? ) {
        this._ajaxJson("GetJobDefinitions", { hostId: hostId }, callback, errorCallback);
    }

    public getJobName(jobId, callback, errorCallback? ) {
        this._ajaxJson("GetJobName", { jobId: jobId }, callback, errorCallback);
    }

    public getJobResultName(resultId, callback, errorCallback? ) {
        this._ajaxJson("GetJobResultName", { resultId: resultId }, callback, errorCallback);
    }

    public getAverageChartForJob(jobId, callback, errorCallback? ) {
        this._ajaxJson("GetAverageChartForJob", { jobId: jobId }, callback, errorCallback);
    }

    public getAverageChartForJobNoJob(callback, errorCallback? ) {
        this._ajaxJson("Get24HourAverageChart", {}, callback, errorCallback);
    }

    public getJobResultsOverTimeChart(callback, errorCallback? ) {
        this._ajaxJson("GetJobResultsOverTimeChart", {}, callback, errorCallback);
    }

    public getTotalRunTimeChart(callback, errorCallback? ) {
        this._ajaxJson("GetTotalRunTimeChart", {}, callback, errorCallback);
    }

    public getTotalRunTimePieChart(callback, errorCallback? ) {
        this._ajaxJson("GetTotalRunTimePieChart", {}, callback, errorCallback);
    }

    public getJobQueuePositionCountChart(callback, errorCallback? ) {
        this._ajaxJson("GetJobQueuePositionCountChart", {}, callback, errorCallback);
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }
}

VSS.initClassPrototype(MonitorManager, {
    apiLocation: null,
    _count: {} //TODO: Dangerous member initialization on prototype. Get rid of it.

});


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Monitoring", exports);

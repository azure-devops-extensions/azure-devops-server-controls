/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import CodeEditorIntegration = require("Build/Scripts/CodeEditorIntegration");
import Context = require("Build/Scripts/Context");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");
import TimelineViewModel = require("Build/Scripts/Models.TimelineViewModel");

import {BuildActions} from "Build.Common/Scripts/Linking";
import BuildClient = require("Build.Common/Scripts/ClientServices");

import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import BuildContracts = require("TFS/Build/Contracts");

import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

interface LogModel {
    content: string;
}

/**
 * Represents a full log
 */
class FullLogPromiseModel {
    /**
     * The promise
     */
    public promise: IPromise<LogModel>;

    constructor(buildId: number, logId: number) {
        var buildClient = Service.getService(BuildClient.BuildClientService);

        this.promise = buildClient.getLogs(buildId).then(
            (logs: BuildContracts.BuildLog[]) => {
                let log: BuildContracts.BuildLog = Utils_Array.first(logs, (l => l.id == logId));
                if (log) {
                    return buildClient.getBuildLog(buildId, logId).then((content: string) => {
                        return {
                            content: content
                        };
                    });
                }
                else {
                    return {
                        content: ""
                    };
                }
            });
    }
}

function getTokenizer(): any {
    return {
        root: [
            { regex: ".{27}Z ##\\[[E|e]rror[^\\]]*\].*", action: { token: "error-token" } },
            { regex: ".{27}Z ##\\[[W|w]arning[^\\]]*\].*", action: { token: "warn-token" } },
            { regex: ".{27}Z ##\\[[I|i]nfo[^\\]]*\].*", action: { token: "info-token" } },
            { regex: ".{27}Z ##\\[[S|s]ection[^\\]]*\].*", action: { token: "comment" } },
            { regex: ".{27}Z ##\\[[C|c]ommand[^\\]]*\].*", action: { token: "keyword" } },
            { regex: ".{27}Z ##\\[[D|d]ebug[^\\]]*\].*", action: { token: "debug-token" } },
            { regex: ".{27}Z ##\\[[V|v]erbose[^\\]]*\].*", action: { token: "info-token" } }
        ]
    };
}

var _codeEditorIntegration: CodeEditorIntegration.CodeEditorIntegration;
ko.bindingHandlers["buildLogViewer"] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        let $container: JQuery = $(domElem("div"));
        _codeEditorIntegration = new CodeEditorIntegration.CodeEditorIntegration("tfs.source-control.file-viewer", $container);
        $(element).append($container);

        let content: string = ko.utils.unwrapObservable(valueAccessor());
        if (!!content) {
            _codeEditorIntegration.setConfiguration({
                content: content,
                lineNumbers: true,
                skipResource: true,
                contentType: {
                    name: "text/vsts-build-log",
                    ignoreCase: true,
                    tokenizer: getTokenizer()
                },
            });
        }

        ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
            if (!!_codeEditorIntegration) {
                _codeEditorIntegration.dispose();
                _codeEditorIntegration = null;
            }
        });

        return { controlsDescendantBindings: true };
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        let content: string = ko.utils.unwrapObservable(valueAccessor());

        if (!!content) {
            _codeEditorIntegration.setConfiguration({
                content: content,
                lineNumbers: true,
                skipResource: true,
                contentType: {
                    name: "text/vsts-build-log",
                    ignoreCase: true,
                    tokenizer: getTokenizer()
                },
            });
        }
    }
}

export class BuildLogsTab extends BuildDetails.BuildDetailsTab {
    private _buildDetailsContext: Context.BuildDetailsContext;
    private _visibleReactor: KnockoutComputed<any>;
    private _logReactor: KnockoutComputed<any>;

    private _emptyLogsPromise: IPromise<LogModel>;
    private _logs: { [nodeId: number]: FullLogPromiseModel } = {};

    public logContent: KnockoutObservable<string> = ko.observable("");

    constructor(buildDetailsContext: Context.BuildDetailsContext) {
        super(BuildActions.Logs, BuildResources.LogsText, "buildvnext_details_logs_tab");

        this._buildDetailsContext = buildDetailsContext;

        // set up a promise to fake log retrieval when no node is selected
        this._emptyLogsPromise = Q(<any>{
            lines: [],
            index: null
        });

        // reactor to show or hide this tab, depending on whether the selection has a log
        this._visibleReactor = ko.computed({
            read: () => {
                let hasLog: boolean = false;

                let timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
                if (!!timelineRecord) {
                    hasLog = !!timelineRecord.log();
                }

                this.visible(hasLog);
            }
        });

        this._logReactor = ko.computed({
            read: () => {
                let selected: boolean = this.isSelected();

                if (selected) {
                    let timelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
                    if (!!timelineRecord) {
                        // show logs for this node
                        let currentRecordId: string = timelineRecord.id.peek();
                        let logsPromise: IPromise<LogModel> = this._getLogsPromise(timelineRecord);

                        logsPromise.then((logModel: LogModel) => {
                            // it's possible that the selected record changed while the log was loading
                            var currentRecord = this._buildDetailsContext.currentTimelineRecord.peek();
                            if (currentRecord && currentRecordId === currentRecord.id.peek()) {
                                this.logContent(logModel.content);
                            }
                        });
                    }
                    else {
                        // no node selected
                        this.logContent("");
                    }
                }
            }
        });
    }

    public dispose(): void {
        if (this._logReactor) {
            this._logReactor.dispose();
            this._logReactor = null;
        }

        if (this._visibleReactor) {
            this._visibleReactor.dispose();
            this._visibleReactor = null;
        }

        super.dispose();
    }

    private _getLogsPromise(record: TimelineRecordViewModel.TimelineRecordViewModel, refresh: boolean = true): IPromise<LogModel> {
        var result: IPromise<LogModel> = this._emptyLogsPromise;
        var timeline: TimelineViewModel.TimelineViewModel = this._buildDetailsContext.currentTimeline();

        if (!!timeline && !!record && record.state() !== BuildContracts.TimelineRecordState.Pending) {
            var logId: number = 0;
            if (!!record.log()) {
                logId = record.log().logId();

                var cached: FullLogPromiseModel = this._logs[logId];
                if (!!cached && !refresh) {
                    result = cached.promise;
                }
                else {
                    var logPromiseModel = new FullLogPromiseModel(timeline.buildId(), logId);
                    this._logs[logId] = logPromiseModel;

                    result = logPromiseModel.promise;
                }
            }
        }

        return result;
    }

}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.LogsTab", exports);

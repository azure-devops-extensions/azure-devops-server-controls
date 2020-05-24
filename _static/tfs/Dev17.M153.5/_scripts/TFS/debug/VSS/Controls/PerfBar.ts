import Bundling = require("VSS/Bundling");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Performance = require("VSS/Performance");
import Serialization = require("VSS/Serialization");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import { TimingGroup as PerformanceTimingGroup } from "VSS/WebApi/Contracts";

import Dialogs_NOREQUIRE = require("VSS/Controls/Dialogs");
import Grids_NOREQUIRE = require("VSS/Controls/Grids");

declare var __vssBundles: any[];

class PerfBar extends Controls.Control<any> {

    public initialize() {
        super.initialize();

        var pageContext = Context.getPageContext();
        this._debugMode = !!pageContext.diagnostics.debugMode;
        this._bundlingMode = !!pageContext.diagnostics.bundlingEnabled;
        this._cdnMode = !!pageContext.diagnostics.cdnEnabled;
        this._tracePointMode = !!pageContext.diagnostics.tracePointCollectionEnabled;
        this._kerosMetadataMode = this._initialKerosMetadataMode = /tfs-keros-metadata=enabled/i.test(document.cookie);
        this._bundleDetailsMode = typeof (__vssBundles) !== "undefined";
        this._perfDataByTtiScenario = {};

        this._$perfPanel = $(
            `<div class="perf-panel">
               <span class='perf-section perf-feedback'>
                   <span class='section-label'>Perf Feedback</span>
               </span>
               <span class='perf-section perf-resources'>
                   <span class='section-label'>Resources</span>
                   <span class='section-data'></span>
               </span>
               <span class='perf-section ci-events'>
                   <span class='section-label'>CI Events</span>
               </span>
               <span class='perf-section perf-scenarios'>
                   <span class='section-label'>Performance</span>
                   <span class='section-data'></span>
               </span>
               <span class='perf-section perf-bundles ${this._bundlingMode ? (this._bundleDetailsMode ? "highlight-bundle-details" : "") : "hidden"}'>
                   <span class='section-label'>${this._bundleDetailsMode ? "Show Bundle Data" : "Diagnose Bundles"}</span>
               </span>
             </div>`);

        var $feedbackSection = this._$perfPanel.find('.perf-feedback');
        $feedbackSection.click(() => {
            this._showFeedbackDialog();
        });

        // Resources section

        var $resourcesSection = this._$perfPanel.find('.perf-resources');
        $resourcesSection.click(() => {
            this._showResourcesDialog();
        });
        this._$perfResourcesData = $resourcesSection.find(".section-data");

        // CI Events section

        var $ciSection = this._$perfPanel.find('.ci-events');
        if (this._debugMode) {
            $ciSection.click(() => {
                this._showCIEventsDialog();
            });
        }
        else {
            $ciSection.hide();
        }

        // Scenarios section

        var $scenariosSection = this._$perfPanel.find('.perf-scenarios');
        this._$perfScenariosData = $scenariosSection.find(".section-data");

        $scenariosSection.click(() => {
            this._showScenariosDialog();
        });

        var scenarios = Performance.getScenarioManager().getAllCompletedScenarios();
        scenarios.forEach((scenario, index) => {
            this._handleScenario(scenario, index === 0);
        });

        Performance.getScenarioManager().addScenarioCompletedListener(this._handleScenario.bind(this));

        var $bundlesSection = this._$perfPanel.find('.perf-bundles');
        $bundlesSection.click(() => {
            this._collectBundleData();
        });

        this._element.append(this._$perfPanel);

        this._cspViolationCount = 0;

        document.addEventListener("securitypolicyviolation", (event: UIEvent) => {
            this._updateCspViolationsSection(event);
        });

        Events_Services.getService().attachEvent(HubEventNames.PreXHRNavigate, (sender: any, args: IHubEventArgs) => {
            this._ttiScenarioCompleted = false;
            this._$perfScenariosData.empty();
            this._$perfResourcesData.empty();
        });

        Events_Services.getService().attachEvent(HubEventNames.ProcessXHRNavigate, (sender: any, args: IHubEventArgs) => {
            this._perfDataForNextTtiScenario = args.pageXHRData.performanceTimings;
        });

        this._perfDataForNextTtiScenario = Serialization.deserializeJsonIsland<any>($(".vss-web-perf-timings"), null);
    }

    private _handleScenario(scenario: Performance.IScenarioDescriptor, checkForPLT: boolean = true) {

        var alreadyRecordedTti = this._ttiScenarioCompleted;

        this._addScenarioData(scenario);

        if (scenario.isPageInteractive() && !alreadyRecordedTti) {
            this._updateResourcesSection();
        }
    }

    private _updateResourcesSection() {
        if (this._bundlingMode) {

            var stats = Performance.getResourceStats();
            this._addResourceSegment("Scripts", stats.scriptsTotalSize, stats.scripts, Context.getPageContext().diagnostics.debugMode ? "[DEBUG]" : "");
            this._addResourceSegment("CSS", stats.cssTotalSize, stats.styles);
            this._addResourceSegment("Ajax", 0, stats.ajax);
            this._addResourceSegment("Other", 0, stats.other);
        }
        else {
            this._addPerfSegment(this._$perfResourcesData, "Scripts", this._debugMode ? "debug" : "minified", "");
            this._addPerfSegment(this._$perfResourcesData, "Bundling", "disabled", "");
        }
    }

    private _addPerfSegment($container: JQuery, label: string, content: string, tooltip: string): JQuery {
        var $segment = $('<span class="perf-data" />').attr("title", tooltip);
        $('<span class="segment-label" />').text(label + ":").appendTo($segment);
        $('<span class="segment-content" />').text(content).appendTo($segment);
        return $segment.appendTo($container);
    }

    private _addResourceSegment(label: string, size: number, resourceStats: Performance.IResourceTypeStats, suffix?: string) {

        if (!resourceStats.total) {
            return;
        }

        var text = "";
        var title = label + " resources";

        if (resourceStats.cached > 0) {
            text += resourceStats.cached + "/" + resourceStats.total;
        }
        else {
            text += resourceStats.total;
        }

        title += "\nCached resources: " + resourceStats.cached;
        title += "\nTotal resources: " + resourceStats.total;

        var sizeText = this._getSizeText(size);
        if (sizeText) {
            text += " (" + sizeText + ")";
            title += "\nTotal size (bytes): " + sizeText;
        }

        if (resourceStats.duration > 0) {
            title += "\nTotal duration: " + Math.round(resourceStats.duration) + " ms";
        }

        if (suffix) {
            text += " " + suffix;
        }

        return this._addPerfSegment(this._$perfResourcesData, label, text, title);
    }

    private _updateCspViolationsSection(event: UIEvent) {
        this._cspViolationCount++;

        if (!this._$cspViolationsData) {
            var $violationsSection = $('<span class="perf-section perf-csp-violations" />');
            $('<span class="section-label" />').text("CSP").appendTo($violationsSection);
            $('<span class="section-data" />').appendTo($violationsSection);
            $violationsSection.appendTo($(".perf-panel"));
            this._$cspViolationsData = $violationsSection.find(".section-data");

            var $segment = $('<span class="perf-data" />');
            $('<span class="segment-label" />').text("Violations" + ":").appendTo($segment);
            $('<span class="segment-content" />').text("0").appendTo($segment);
            $segment.appendTo(this._$cspViolationsData);
        }

        var $segment = this._$cspViolationsData.find(".perf-data");
        var $segmentContent = $segment.find(".segment-content");
        $segmentContent.text("" + this._cspViolationCount);
    }

    private _getSizeText(size: number) {
        var text = "";
        if (size > 0) {
            var kb = size / 1024;
            if (kb > 1024) {
                var mb = kb / 1024;
                text = (Math.round(mb * 10) / 10) + " MB";
            }
            else {
                text = Math.round(kb) + " KB";
            }
        }
        return text;
    }

    private _addScenarioData(scenario: Performance.IScenarioDescriptor) {

        this._scenarioDescriptors.push(scenario);
        if (scenario.isPageInteractive()) {
            this._perfDataByTtiScenario[this._scenarioDescriptors.length - 1] = this._perfDataForNextTtiScenario;
        }

        if (!this._ttiScenarioCompleted && scenario.isPageInteractive()) {
            this._ttiScenarioCompleted = true;

            if (this._$perfScenariosData) {
                var timeMs = scenario.getDuration() + "ms";
                this._addPerfSegment(this._$perfScenariosData, `TTI`, timeMs, `${scenario.getFeatureArea()}:${scenario.getName()} took ${timeMs}.`);

                var serverTimings = this._perfDataForNextTtiScenario || {};
                var groupsAdded = 0;

                groupsAdded += this._addServerTimingSegment(serverTimings, "SQL", "SQL executions", ["SQL"]);
                groupsAdded += this._addServerTimingSegment(serverTimings, "REST", "S2S REST calls", ["VssClient"]);
                groupsAdded += this._addServerTimingSegment(serverTimings, "Storage", "Azure Blob + Table Storage", ["BlobStorage", "TableStorage"]);
                groupsAdded += this._addServerTimingSegment(serverTimings, "Redis", "Redis calls", ["Redis"]);
                groupsAdded += this._addServerTimingSegment(serverTimings, "AAD", "Azure Active Directory calls", ["AAD"]);
                groupsAdded += this._addServerTimingSegment(serverTimings, "ServiceBus", "Service Bus Messages published", ["ServiceBus"]);

                if (groupsAdded > 1) {
                    this._addServerTimingSegment(serverTimings, "Total Remote", "Total remote calls", ["SQL", "VssClient", "AAD", "Redis", "ServiceBus", "BlobStorage", "TableStorage"]);
                }
            }
        }
    }

    private _addServerTimingSegment(serverTimings: IDictionaryStringTo<PerformanceTimingGroup>, groupLabel: string, groupTooltip: string, groupNames: string[]) {
        var count = 0;
        var duration = 0;

        for (var groupName of groupNames) {
            var timings = serverTimings[groupName];
            if (timings) {
                count += timings.count;
                duration += timings.elapsedTicks;
            }
        }

        if (count > 0) {
            this._addPerfSegment(this._$perfScenariosData, groupLabel, "" + count, `${groupTooltip}: ${count} entries took ${Math.round(duration / 10000)}ms.`);
            return 1;
        }
        else {
            return 0;
        }
    }

    private _showFeedbackDialog() {
        var $perfDialogContent = $("<div />").addClass("perf-panel-dialog");

        var $emailText = $(
            `<div class="perf-feedback-email"><span>Copy/Paste the following JSON and send an e-mail to: <a href="mailto:VSOWebPerfFeedback@microsoft.com">VSOWebPerfFeedback@microsoft.com</a>.</span></div>
             <div class="perf-feedback-email"><span>Include the page that you are loading in the subject and any additional comments about your experience in the body.</span></div>
            `).appendTo($perfDialogContent);

        var $perfFeedbackJson = $(
            `<textarea class="perf-feedback-json"</pre>
            `);

        var scenariosTelemetry = this._scenarioDescriptors.map(scenario => scenario.getTelemetry());

        if (scenariosTelemetry.length) {
            scenariosTelemetry.forEach((scenarioTelemetry) => {
                if (navigator) {
                    scenarioTelemetry["userAgent"] = navigator.userAgent;
                }
                scenarioTelemetry.properties["ElapsedTime"] = scenarioTelemetry.elapsedTime;
            });

            $perfFeedbackJson.text(JSON.stringify(scenariosTelemetry, null, 2));
        }
        else {
            $perfFeedbackJson.text(`This page has not completed any performance scenarios. SessionId: ${Context.getPageContext().diagnostics.sessionId}.`);
        }

        $perfFeedbackJson.appendTo($perfDialogContent);

        VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NOREQUIRE) => {
            _Dialogs.showMessageDialog($perfDialogContent, {
                title: "Perf Feedback",
                width: 1000,
                height: 650,
                useBowtieStyle: true,
                buttons: [_Dialogs.MessageDialog.buttons.close]
            });

            $perfFeedbackJson.select();
        });
    }

    private _showResourcesDialog() {
        var pageContext = Context.getPageContext();
        var $perfDialogContent = $("<div />").addClass("perf-panel-dialog");

        var $actions = $(
            `<div class="resource-actions">
               <span class="resource-action">
                 <span>Scripts: <a class="script-mode"></a></span>
               </span>
               <span class="resource-action">
                 <span>Bundling: <a class="bundling-mode"></a></span>
               </span>
               <span class="resource-action">
                 <span>CDN: <a class="cdn-mode"></a></span>
               </span>
               <span class="resource-action">
                 <span>Perf bar: <a class="perf-bar"></a></span>
               </span>
               <span class="resource-action">
                 <span>Keros metadata: <a class="keros-metadatamode"></a></span>
               </span>
               <div class="reload-warning">Reload the current page for your changes to take effect.</div>
             </div>`).appendTo($perfDialogContent);

        const setToggle = (options: {
            cssClass: string,
            cookieName: string,
            getter: () => boolean,
            setter: (val: boolean) => void,
            enabledLabel?: string,
            disabledLabel?: string,
        }) => {
            const $toggle = $actions.find(options.cssClass);
            $toggle.text(options.getter() ? options.enabledLabel || "enabled" : options.disabledLabel || "disabled");
            $toggle.click(() => {
                options.setter(!options.getter());
                $toggle.text(options.getter() ? options.enabledLabel || "enabled" : options.disabledLabel || "disabled");
                Utils_Core.setCookie(options.cookieName, options.getter() ? "enabled" : "disabled");
                $actions.find(".reload-warning").toggle(this._diagnosticSettingsChanged());
            });

            return $toggle;
        }

        $actions.find(".reload-warning").toggle(this._diagnosticSettingsChanged());

        setToggle({
            cssClass: ".script-mode", cookieName: "TFS-DEBUG", getter: () => this._debugMode, setter: (val) => { this._debugMode = val }, disabledLabel: "minified", enabledLabel: "debug"
        });
        setToggle({
            cssClass: ".bundling-mode", cookieName: "TFS-BUNDLING", getter: () => this._bundlingMode, setter: (val) => { this._bundlingMode = val }
        });
        const $cdnMode = setToggle({
            cssClass: ".cdn-mode", cookieName: "TFS-CDN", getter: () => this._cdnMode, setter: (val) => { this._cdnMode = val; }
        });
        if (!pageContext.diagnostics.cdnAvailable) {
            $cdnMode.closest(".resource-action").remove();
        }
        setToggle({
            cssClass: ".perf-bar", cookieName: "TFS-TRACEPOINT-COLLECTOR", getter: () => this._tracePointMode, setter: (val) => { this._tracePointMode = val }
        });
        setToggle({
            cssClass: ".keros-metadatamode", cookieName: "TFS-KEROS-METADATA", getter: () => this._kerosMetadataMode, setter: (val) => { this._kerosMetadataMode = val; }
        });

        var resources: any[] = Performance.getResourceTimingEntries();

        this._addResourceDetails("Script", pageContext.diagnostics.bundlingEnabled, $perfDialogContent, resources.filter(r => r.initiatorType === "script"));
        this._addResourceDetails("Styles", pageContext.diagnostics.bundlingEnabled, $perfDialogContent, resources.filter(r => r.initiatorType === "link"));
        this._addResourceDetails("Ajax", false, $perfDialogContent, resources.filter(r => r.initiatorType === "xmlhttprequest"));
        this._addResourceDetails("Other", false, $perfDialogContent, resources.filter(r => r.initiatorType !== "script" && r.initiatorType !== "link" && r.initiatorType !== "xmlhttprequest"));

        VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NOREQUIRE) => {
            _Dialogs.showMessageDialog($perfDialogContent, {
                title: "Resource Details",
                width: 1000,
                height: 650,
                useBowtieStyle: true,
                buttons: [_Dialogs.MessageDialog.buttons.close]
            });
        });
    }

    private _diagnosticSettingsChanged(): boolean {
        var pageContext = Context.getPageContext();
        return this._debugMode !== !!pageContext.diagnostics.debugMode ||
            this._bundlingMode !== !!pageContext.diagnostics.bundlingEnabled ||
            this._cdnMode !== !!pageContext.diagnostics.cdnEnabled ||
            this._tracePointMode !== !!pageContext.diagnostics.tracePointCollectionEnabled ||
            this._kerosMetadataMode !== this._initialKerosMetadataMode;
    }

    private _addResourceDetails(resourceType: string, useSize: boolean, $container: JQuery, resources: PerformanceEntry[]) {

        if (resources.length === 0) {
            return;
        }

        var sizeHeaderHtml = useSize ? `<th>Size</th>` : "";
        var sizeRowHtml = useSize ? `<td class="resource-size"></td>` : "";

        var $table = $(`<table class="perf-data-table">
                            <th>${resourceType} Resources</th>
                            ${sizeHeaderHtml}
                            <th title="Overall duration (ms)">Duration</th>
                            <th title="RequestStart -> ResponseStart (ms)">Latency</th>
                            <th title="ResponseStart -> ResponseEnd (ms)">Transfer</th>
                        </table>`);

        resources.forEach((resource: any) => {
            var $row = $(`<tr>
                 <td class=resource-name></td>
                 ${sizeRowHtml}
                 <td class=timing>${Math.round(resource.duration)}</td>
                 <td class=timing>${Math.round(resource.responseStart - resource.requestStart)}</td>
                 <td class=timing>${Math.round(resource.responseStart > 0 ? (resource.responseEnd - resource.responseStart) : 0)}</td>
               </tr>`).appendTo($table);

            var parts = (resource.name || "").split("/");
            var name: string = parts[parts.length - 1] || "";

            if (name.length > 80) {
                name = name.substr(0, 80) + "...";
            }

            $row.find(".resource-name").text(name).attr("title", resource.name || "");

            if (useSize) {

                var url = resource.name || "";
                if (url.indexOf(window.location.origin) === 0) {
                    url = url.substr(window.location.origin.length);
                }

                var size = Bundling.getBundleSize(url);
                if (size) {
                    $row.find(".resource-size").text(this._getSizeText(size)).attr("title", size + " bytes");
                }
            }
        });

        $table.appendTo($container);
    }

    private _showCIEventsDialog() {
        var $ciEventsDialogContent = $("<div />").addClass("ci-events-panel-dialog");

        var $checkbox = $(`<input type="checkbox">Show performance CI events also</input>`)
            .change(() => {
                $ciEventsDialogContent.find("table").remove();
                this._buildCIEventsTable($checkbox[0].checked).appendTo($ciEventsDialogContent);
            }).appendTo($ciEventsDialogContent);
        this._buildCIEventsTable(false).appendTo($ciEventsDialogContent);

        VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NOREQUIRE) => {
            _Dialogs.showMessageDialog($ciEventsDialogContent, {
                title: "Customer Intelligence Events",
                width: 1000,
                height: 650,
                useBowtieStyle: true,
                buttons: [_Dialogs.MessageDialog.buttons.close]
            });
        });
    }

    private _buildCIEventsTable(includePerfomanceEvents?: boolean): JQuery {
        var $table = $(`<table class="ci-events-data-table">
                    <th>Area</th>
                    <th>Feature</th>
                    <th>Properties</th>
                </table>`);

        var ciData = Telemetry.getPublishedEvents();
        ciData.forEach(data => {
            if (includePerfomanceEvents || data.area !== "Performance" && data.feature !== "Scenario") {
                var properties = "";
                Object.keys(data.properties).forEach(k => {
                    if (properties) {
                        properties += "\n";
                    }
                    properties += k + ": " + JSON.stringify(data.properties[k]);
                });

                var $row = $(`<tr>
                    <td class=area>${data.area}</td>
                    <td class=feature>${data.feature}</td>
                    <td class=properties></td>
                </tr>`);
                $row.find('td.properties').text(properties);
                $row.appendTo($table);
            }
        });

        return $table;
    }

    private _showScenariosDialog() {

        VSS.using(["VSS/Controls/Dialogs", "VSS/Controls/Grids"], (_Dialogs: typeof Dialogs_NOREQUIRE, _Grids: typeof Grids_NOREQUIRE) => {

            var $perfDialogContent = $('<div class="perf-panel-dialog" />');

            // Get the page's performance measurements
            let initialPageInteractiveScenarioIndex = -1;
            for (let i = 0, len = this._scenarioDescriptors.length; i < len; i++) {
                if (this._scenarioDescriptors[i].isPageInteractive()) {
                    initialPageInteractiveScenarioIndex = i;
                    break;
                }
            }

            var measurements = this._getMeasurements(initialPageInteractiveScenarioIndex);

            // Draw the summary table
            $(`<table class="scenarios-summary-table">
                 <tbody>
                   <tr>
                     <td title="Redirect + DNS + TCP Connect">Pre-Request: <span>${this._getMeasurementDuration(measurements, "PreRequest")} ms</span></td>
                     <td title="Page Request + Response">Page Request: <span>${this._getMeasurementDuration(measurements, "Request")} ms</span></td>
                     <td title="Fetch resources (Javascript, CSS) and process DOM">Process Resources: <span>${this._getMeasurementDuration(measurements, "FetchResources")} ms</span></td>
                     <td title="Execute Javascript modules and render the page (up to TTI)">Client-side Rendering: <span>${this._getMeasurementDuration(measurements, "Client-side Rendering")} ms</span></td>
                   </tr>
                 </tbody>
               </table>`).appendTo($perfDialogContent);

            // Draw performance details grid
            var rootItems: Grids_NOREQUIRE.IGridHierarchyItem[] = [];

            var detailedGroups: IDictionaryStringTo<{ timing: string; groups?: string[]; collapsed?: boolean; }> = {
                "Pre-Request": { timing: "PreRequest", groups: ["Redirect", "Fetch", "DNS", "TCP"], collapsed: true },
                "Page Request": { timing: "RequestResponse", groups: ["Request", "Response"] },
                "Process Resources": { timing: "FetchResources", groups: ["Unload", "FetchResources", "DOMProcessing"], collapsed: true },
                "Client-side Rendering": { timing: "Client-side Rendering" }
            };

            for (let detailedGroupName in detailedGroups) {
                var detailedGroup = detailedGroups[detailedGroupName];
                let measurement = measurements[detailedGroup.timing];
                if (measurement) {
                    var item = this._addMeasureToGridItems(measurement, rootItems, true);
                    item.children = [];
                    item.collapsed = !!detailedGroup.collapsed;
                    item["name"] = detailedGroupName;
                    if (detailedGroup.groups) {
                        for (let child of detailedGroup.groups) {
                            let measurement = measurements[child];
                            if (measurement) {
                                this._addMeasureToGridItems(measurement, item.children, true);
                            }
                        }
                    }
                }
            }

            if (this._scenarioDescriptors.length > 0) {

                var navigationStart = Performance.getNavigationStartTimestamp();

                var clientScenariosItem: Grids_NOREQUIRE.IGridHierarchyItem = {
                    name: "Scenarios",
                    children: []
                };
                rootItems.push(clientScenariosItem);

                for (let i = 0, len = this._scenarioDescriptors.length; i < len; i++) {

                    const scenario = this._scenarioDescriptors[i];

                    var scenarioItem: Grids_NOREQUIRE.IGridHierarchyItem = {
                        name: scenario.getName(),
                        startTime: scenario.getStartTime() - navigationStart,
                        duration: scenario.getDuration(),
                        properties: this._getPropertiesString(scenario.getData()),
                        collapsed: true
                    };

                    clientScenariosItem.children.push(scenarioItem);

                    var splitTimings = scenario.getSplitTimings();
                    if (splitTimings.length > 0) {

                        let splitsContainer: Grids_NOREQUIRE.IGridHierarchyItem = {
                            name: "Split Timings",
                            children: []
                        };

                        if (!scenarioItem.children) {
                            scenarioItem.children = [];
                        }
                        scenarioItem.children.push(splitsContainer);

                        for (var splitTiming of splitTimings) {
                            var splitItem: Grids_NOREQUIRE.IGridHierarchyItem = {
                                name: splitTiming.name,
                                startTime: splitTiming.timestamp
                            };
                            splitsContainer.children.push(splitItem);
                        }
                    }

                    if (i !== initialPageInteractiveScenarioIndex && scenario.isPageInteractive() && this._perfDataByTtiScenario[i]) {

                        let serverTimingsContainer: Grids_NOREQUIRE.IGridHierarchyItem = {
                            name: "Server Timings",
                            children: []
                        };

                        if (!scenarioItem.children) {
                            scenarioItem.children = [];
                        }
                        scenarioItem.children.push(serverTimingsContainer);

                        let serverTimings = convertPerfTimingsToTimingEntries(this._perfDataByTtiScenario[i]);
                        serverTimings.forEach(serverTiming => {
                            let measurement: IPerfDialogMeasurement = {
                                name: serverTiming.entryGroupName,
                                duration: serverTiming.entry.duration,
                                startTime: (serverTiming.entry.startTime / 1000),
                                properties: serverTiming.entry.properties
                            };

                            this._addMeasureToGridItems(measurement, serverTimingsContainer.children, false);
                        });
                    }
                }
            }

            Controls.create(_Grids.Grid, $perfDialogContent, <Grids_NOREQUIRE.IGridOptions>{
                columns: [
                    {
                        index: "name",
                        text: "Measurement",
                        width: 420,
                        canSortBy: false
                    },
                    {
                        index: "startTime",
                        text: "Start",
                        width: 60,
                        canSortBy: false
                    },
                    {
                        index: "duration",
                        text: "Duration",
                        width: 60,
                        canSortBy: false,
                        getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                            // Show rounded milliseconds as the text with a tooltip of the exact duration.
                            let entry = this.getRowData(dataIndex);
                            let $cell = this._drawCell.apply(this, arguments);
                            $cell.empty();
                            let $cellContent = $("<span />").appendTo($cell);

                            if (typeof entry.duration !== "undefined") {
                                $cellContent.text(entry.duration + "");
                                if (entry.measurement && entry.measurement.duration) {
                                    $cellContent.attr("title", entry.measurement.duration + " ms");
                                }
                            }

                            return $cell;
                        }
                    },
                    {
                        index: "properties",
                        text: "Properties",
                        width: 600,
                        canSortBy: false
                    }
                ],
                source: new _Grids.GridHierarchySource(rootItems),
                useBowtieStyle: true
            }, { cssClass: "scenarios-grid" });

            _Dialogs.show(_Dialogs.Dialog, <Dialogs_NOREQUIRE.IModalDialogOptions>{
                content: $perfDialogContent,
                title: "Performance Scenarios",
                dynamicSize: true,
                widthPct: 0.9,
                heightPct: 0.9,
                useBowtieStyle: true,
                buttons: []
            });
        });
    }

    private _getMeasurements(scenarioIndex: number): IDictionaryStringTo<IPerfDialogMeasurement> {

        var measurements: IDictionaryStringTo<IPerfDialogMeasurement> = {};
        const scenario = this._scenarioDescriptors[scenarioIndex];
        const perfData = this._perfDataByTtiScenario[scenarioIndex];

        try {
            var expectedDefaultEvents = Performance.getDefaultNavigationEvents(scenario);

            for (var expectedDefaultEvent of expectedDefaultEvents) {
                var measurement: IPerfDialogMeasurement = { name: expectedDefaultEvent.name, duration: expectedDefaultEvent.perfEntry.duration, startTime: expectedDefaultEvent.perfEntry.startTime };
                measurements[measurement.name] = measurement;
            }

            // Add server timings to the Request measurement
            var requestMeasurement = measurements["Request"];
            if (requestMeasurement) {
                requestMeasurement.innerMeasurements = [];
                let serverTimings = convertPerfTimingsToTimingEntries(perfData);
                serverTimings.forEach(serverTiming => {
                    requestMeasurement.innerMeasurements.push({ name: serverTiming.entryGroupName, duration: serverTiming.entry.duration, startTime: (serverTiming.entry.startTime / 1000) + requestMeasurement.startTime, properties: serverTiming.entry.properties });
                });

                var dataProviderMeasurementEntries = requestMeasurement.innerMeasurements.filter(m => { return m.name === "Html.InjectDataProviderData"; });
                if (dataProviderMeasurementEntries && dataProviderMeasurementEntries.length > 0) {
                    var dataProviderMeasurement = dataProviderMeasurementEntries[0];
                    dataProviderMeasurement.innerMeasurements = [];

                    var dataProviderServerTimings = getDataProviderServerTimings();
                    dataProviderServerTimings.forEach((timing) => {
                        dataProviderMeasurement.innerMeasurements.push({ name: timing.entryGroupName, duration: timing.entry.duration, properties: timing.entry.properties });
                    });
                }
            }

            // Add Bundle timings to the DOMProcessing
            var domProcessingEntry = measurements["FetchResources"];
            if (domProcessingEntry) {
                var resourceStats = Performance.getResourceStats();
                domProcessingEntry.innerMeasurements = [];
                for (var bundleLoad of resourceStats.bundleLoads) {
                    var outerBundleEntry: IPerfDialogMeasurement = {
                        name: "Script Bundle: " + bundleLoad.bundleName,
                        startTime: bundleLoad.outerStartTime,
                        duration: bundleLoad.outerLoad,
                        innerMeasurements: [{
                            name: "Inner load time",
                            startTime: bundleLoad.innerStartTime,
                            duration: bundleLoad.innerLoad,
                            innerMeasurements: null
                        }]
                    };
                    domProcessingEntry.innerMeasurements.push(outerBundleEntry);
                }
            }

            if (scenario) {
                var initialRequireStartTimeEntries = Performance.getTimingEntriesByName("requireStart");
                if (initialRequireStartTimeEntries && initialRequireStartTimeEntries.length > 0) {
                    var initialRequireStartTime = initialRequireStartTimeEntries[0].startTime;
                    var clientSideRenderingMeasurement: IPerfDialogMeasurement = { name: "Client-side Rendering", startTime: initialRequireStartTime, duration: scenario.getDuration() - initialRequireStartTime };
                    //only show the client-side rendering measurement if it's greater than 0. If it's less than 0, it means we don't have the TTI scenario.
                    if (clientSideRenderingMeasurement.duration >= 0) {
                        measurements[clientSideRenderingMeasurement.name] = clientSideRenderingMeasurement;
                    }
                }
            }

        } catch (error) {
            Diag.logWarning(`Failed to record navigation events: ${VSS.getErrorMessage(error)}`);
        }

        return measurements;
    }

    private _getPropertiesString(properties: any) {
        var pieces: string[] = [];
        if (properties) {
            $.each(properties, (key: string, value: any) => {
                var entry = key;
                if (value !== null && typeof value !== "undefined") {
                    if (typeof value === "string") {
                        entry += ": " + value;
                    }
                    else {
                        entry += ": " + JSON.stringify(value);
                    }
                }
                pieces.push(entry);
            });
        }
        return pieces.join('\n');
    }

    private _getMeasurementDuration(measurements: IDictionaryStringTo<IPerfDialogMeasurement>, measurementName: string): number {
        let measurement = measurements[measurementName];
        if (measurement && measurement.duration) {
            return Math.floor(measurement.duration);
        }
        else {
            return 0;
        }
    }

    private _addMeasureToGridItems(measurement: IPerfDialogMeasurement, rootItems: Grids_NOREQUIRE.IGridHierarchyItem[], isRootItem: boolean): Grids_NOREQUIRE.IGridHierarchyItem {

        var item = <Grids_NOREQUIRE.IGridHierarchyItem>{
            name: measurement.name,
            startTime: Math.floor(measurement.startTime) || 0,
            duration: Math.floor(measurement.duration) || 0,
            properties: this._getPropertiesString(measurement.properties),
            measurement: measurement,
            collapsed: isRootItem
        };

        // We're processing measurements in sorted order. Check which level in the tree they should be appended to
        var itemsForInsertion = rootItems;
        if (!isRootItem && measurement.startTime > 0) {
            while (itemsForInsertion.length > 0) {
                var compareItem = itemsForInsertion[itemsForInsertion.length - 1];
                var compareMeasurement: IPerfDialogMeasurement = compareItem["measurement"];
                if (!compareMeasurement ||
                    !compareMeasurement.startTime ||
                    measurement.startTime >= (compareMeasurement.startTime + compareMeasurement.duration) ||
                    (measurement.startTime + measurement.duration) >= (compareMeasurement.startTime + compareMeasurement.duration)) {
                    break;
                }

                if (!compareItem.children) {
                    compareItem.children = [];
                }
                itemsForInsertion = compareItem.children;
            }
        }
        itemsForInsertion.push(item);

        // Process inner measurements
        if (measurement.innerMeasurements) {
            item.children = [];
            for (var childMeasurement of measurement.innerMeasurements) {
                this._addMeasureToGridItems(childMeasurement, item.children, false);
            }
        }

        return item;
    }

    private _collectBundleData(): void {
        if (!Bundling.DiagnoseUtils.isDiagnosing()) {
            // Reload the page which will diagnose bundles on the server
            window.location.href = Bundling.DiagnoseUtils.markUrlForDiagnose(window.location.href);
        } else {
            this._showBundlesDialog();
        }
    }


    private _showBundlesDialog(): void {
        VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NOREQUIRE) => {
            let $bundlesDialogContent = $('<div class="perf-bundles-dialog" />');
            Controls.create<BundleView, BundleViewOptions>(BundleView, $bundlesDialogContent, { bundles: __vssBundles });

            _Dialogs.show(_Dialogs.Dialog, <Dialogs_NOREQUIRE.IModalDialogOptions>{
                content: $bundlesDialogContent,
                title: "Bundle Details", // (${bundleCount} bundles, ${moduleCount} modules, total ${this.toByteString(totalSize)})`,
                dynamicSize: true,
                widthPct: 0.8,
                heightPct: 0.8,
                useBowtieStyle: true,
                buttons: []
            });
        });
    }

    private _debugMode: boolean;
    private _bundlingMode: boolean;
    private _bundleDetailsMode: boolean;
    private _cdnMode: boolean;
    private _tracePointMode: boolean;
    private _kerosMetadataMode: boolean;
    private _initialKerosMetadataMode: boolean;
    private _scenarioDescriptors: Performance.IScenarioDescriptor[] = [];
    private _$perfPanel: JQuery;
    private _$perfResourcesData: JQuery;
    private _$perfScenariosData: JQuery;
    private _$cspViolationsData: JQuery;
    private _ttiScenarioCompleted: boolean = false;
    private _perfDataForNextTtiScenario: IDictionaryStringTo<PerformanceTimingGroup>;
    private _perfDataByTtiScenario: IDictionaryNumberTo<IDictionaryStringTo<PerformanceTimingGroup>>;
    private _cspViolationCount: number;
}

Controls.Enhancement.registerEnhancement(PerfBar, ".perf-bar-container");

interface VssBundleBase {
    Id: string;
    Size?: number;
}

interface VssBundleModule extends VssBundleBase {
    Bundle: VssBundle;
    Dependencies?: string;
    Immediate: boolean;
}

interface VssBundle extends VssBundleBase {
    ImmediateModules?: string[];
    Modules?: VssBundleModule[];
    Factor?: number;
}

interface BundleViewOptions {
    bundles?: VssBundle[];
}

var bundleTemplate =
    `<div class="bundle-item">
        <a href="#" class="expand-collapse bowtie-icon bowtie-chevron-down"></a>
        <span class="bundle-text"></span>
        <span class="bundle-size"></span>
        <div class="modules"></div>
     </div>`;

var moduleTemplate =
    `<div class="module-item">
        <span class="area-color bowtie-icon bowtie-work-item-bar"></span>
        <a href="#" class="module-text"></a>
        <span class="module-size"></span>
        <span class="module-size-visual">
            <span class="actual"></span><span class="remaining"></span>
        </span>
     </div>`;

var actionsTemplate =
    `<div class="bundles-actions">
        <button class="expand-all">Expand All</button>
        <button class="collapse-all">Collapse All</button>
     </div>`;

var legendTemplate =
    `<div class="bundles-legend">
        <div class="bundles-legend-row">
            <span class="legend-item immediate">VSS/Controls/Menus</span><span class="legend-description">Immediate module in a bundle</span>
            <span class="legend-item selected">VSS/Controls/Menus</span><span class="legend-description">Selected module</span>
            <span class="legend-item caller">VSS/Controls/Menus</span><span class="legend-description">Module referencing selected module</span>
        </div>
     </div>`;

var collapsedIcon = "bowtie-chevron-right";
var expandedIcon = "bowtie-chevron-down";

class BundleView extends Controls.Control<BundleViewOptions> {
    private static _visualSize = 200;
    private _areaColors = ["FF9D00", "773B93", "773B93", "F2CB1D", "CC293D", "339933", "FF5CC3", "0078d4", "748189", "254CA7", "6AEfff", "00d2dc", "57AB99"];
    private _areaColorsMap: IDictionaryStringTo<string> = {};
    private _totalSize: number;
    private _totalModules: number;
    private _callerMap: { [id: string]: string[] };

    initializeOptions(options?: BundleViewOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: "bundle-view"
        }, options));
    }

    initialize(): void {
        super.initialize();
        this.attachEvents();
        let bundles = this._options.bundles || [];
        this.prepare(bundles);
        this.render(bundles);

        // Add actionbar
        $(actionsTemplate).prependTo(this.getElement().parent());

        // Add legend
        $(legendTemplate).appendTo(this.getElement().parent());
    }

    private attachEvents(): void {
        let element = this.getElement().parent();
        element.on("click", "a, button", (e: JQueryEventObject) => {
            let $target = $(e.target);
            if ($target.hasClass("module-text")) {
                $(".module-text").removeClass("selected caller");
                $target.addClass("selected");

                let id = $target.data("id");
                let callers = this._callerMap[id] || [];
                for (let caller of callers) {
                    $target.closest(".modules").find(`.${caller}`).addClass("caller");
                }
            }
            else if ($target.hasClass("expand-collapse")) {
                let expand = $target.data("expand") === true;
                if(expand) {
                    $target.removeClass(collapsedIcon).addClass(expandedIcon);
                    $target.siblings(".modules").slideDown(500);
                } else {
                    $target.removeClass(expandedIcon).addClass(collapsedIcon);
                    $target.siblings(".modules").slideUp(500);
                }

                $target.data("expand", !expand);
            }
            else if ($target.hasClass("expand-all")) {
                element.find(`a.${collapsedIcon}`).removeClass(collapsedIcon).addClass(expandedIcon).data("expand", false);
                element.find(".modules").slideDown(500);
            }
            else if ($target.hasClass("collapse-all")) {
                element.find(`a.${expandedIcon}`).removeClass(expandedIcon).addClass(collapsedIcon).data("expand", true);
                element.find(".modules").slideUp(500);
            }
        });
    }

    private prepare(bundles: VssBundle[]): void {
        this._totalSize = 0;
        this._totalModules = 0;
        this._callerMap = {};

        for (let bundle of bundles) {
            bundle.Size = 0;
            bundle.Modules = bundle.Modules || [];
            let immediateModules = Utils_Array.toDictionary<string, boolean>(bundle.ImmediateModules || [], m=> m, m=> true, false);
            let maxSize = Number.MIN_VALUE;
            for (let module of bundle.Modules) {
                module.Bundle = bundle;
                module.Immediate = immediateModules[module.Id] === true;
                bundle.Size += module.Size || 0;
                maxSize = Math.max(maxSize, module.Size);

                for (let dependency of (module.Dependencies || [])) {
                    let key = `${bundle.Id}:${dependency}`;
                    if (!this._callerMap[key]) {
                        this._callerMap[key] = [];
                    }

                    let callers = this._callerMap[key];
                    let moduleId = module.Id.replace(/\/|\./g, '_');
                    if (callers.indexOf(moduleId) < 0) {
                        callers.push(moduleId);
                    }
                }
            }

            bundle.Factor = BundleView._visualSize / maxSize;
            this._totalSize += bundle.Size;
            this._totalModules += bundle.Modules.length;
        }
    }

    private render(bundles: VssBundle[]): void {
        for (let bundle of bundles) {
            let $bundle = this.createBundleElement(bundle, this.getElement());
            let $modulesContainer = $bundle.find(".modules");
            for (let module of (bundle.Modules || [])) {
                this.createModuleElement(module, $modulesContainer);
            }
        }
    }

    private createBundleElement(bundle: VssBundle, $container: JQuery): JQuery {
        let idParts = bundle.Id.split("-");
        let bundleType = idParts.length > 2 ? idParts.slice(0, 3).join('-') : ""; // Gets vss-bundle-view, vss-bundle-common, etc.
        let $bundle = $(bundleTemplate).appendTo($container);
        $bundle.find(".bundle-text").text(`${bundle.Id} (${bundle.Modules.length})`).addClass(bundleType);
        $bundle.find(".bundle-size").text(this.toByteString(bundle.Size));
        return $bundle;
    }

    private createModuleElement(module: VssBundleModule, $container: JQuery): JQuery {
        let $module = $(moduleTemplate).appendTo($container);
        let area = this.getModuleArea(module.Id);
        $module.find(".area-color").css({ color: area ? this.getAreaColor(area) : "#f8f8f8" });
        $module.find(".module-text").text(module.Id).addClass(module.Immediate ? "immediate" : "").data("id", `${module.Bundle.Id}:${module.Id}`).addClass(module.Id.replace(/\/|\./g, '_'));
        $module.find(".module-size").text(this.toByteString(module.Size));
        let actualSize = Math.round(module.Size * module.Bundle.Factor);
        $module.find(".module-size-visual > .actual").width(actualSize);
        let remainingSize = BundleView._visualSize - actualSize;
        $module.find(".module-size-visual > .remaining").width(remainingSize);
        return $module;
    }

    private getModuleArea(id: string): string {
        let parts = (id || "").split('/');
        return parts.length > 1 ? parts[0] : "";
    }

    private getAreaColor(area: string): string {
        let areaColorsMap = this._areaColorsMap;
        let areaColors = this._areaColors;
        if (!areaColorsMap[area]) {
            if (areaColors.length > 0) {
                areaColorsMap[area] = areaColors[0];
                areaColors.splice(0, 1);
            }
            else {
                areaColorsMap[area] = "FF9D00";
            }
        }

        return "#" + areaColorsMap[area];
    }

    private toByteString(size: number): string {
        size = size || 0;
        if (size < 1024) {
            return size + " B";
        }
        else {
            return Math.round(size / 1024) + " KB";
        }
    }
}

interface WebPerformanceTimingNamedEntry {
    entryGroupName: string;
    entry: WebPerformanceTimingEntry;
}

interface WebPerformanceTimingEntry {
    duration?: number;
    startTime?: number;
    properties?: IDictionaryStringTo<any>;
}

interface IPerfDialogMeasurement {
    name: string;
    duration: number;
    startTime?: number;
    innerMeasurements?: IPerfDialogMeasurement[];
    properties?: any;
}

function convertPerfTimingsToTimingEntries(perfTimings: IDictionaryStringTo<PerformanceTimingGroup>): WebPerformanceTimingNamedEntry[] {
    
    var timingEntries: WebPerformanceTimingNamedEntry[] = [];
    $.each(perfTimings, (id, group: PerformanceTimingGroup) => {
        group.timings.forEach(timing => {
            timingEntries.push({
                entryGroupName: id,
                entry: {
                    duration: (timing.elapsedTicks || 0) / 10000,
                    startTime: timing.startOffset,
                    properties: timing.properties
                }
            });
        });
    });

    timingEntries.sort((a, b) => { return a.entry.startTime - b.entry.startTime });
    return timingEntries;
}

var _jsonIslandDataProviderServerTimings: WebPerformanceTimingNamedEntry[];

function getDataProviderServerTimings(): WebPerformanceTimingNamedEntry[] {
    if (!_jsonIslandDataProviderServerTimings) {
        _jsonIslandDataProviderServerTimings = [];
        var dataProviderData = Serialization.deserializeJsonIsland<any>($(".vss-web-page-data"), null);
        if (dataProviderData && dataProviderData.data) {
            var timings = dataProviderData.data["PerformanceTimings"];
            if (timings) {
                $.each(timings, (groupName: string, group: any) => {
                    if (group.timings) {
                        group.timings.forEach((timing) => {
                            _jsonIslandDataProviderServerTimings.push({
                                entry: {
                                    duration: (timing.elapsedTicks || 0) / 10000,
                                    startTime: timing.startOffset,
                                    properties: timing.properties
                                },
                                entryGroupName: groupName
                            });
                        });
                    }
                });
            }
        }
        _jsonIslandDataProviderServerTimings.sort((a, b) => { return a.entry.startTime - b.entry.startTime });
    }
    return _jsonIslandDataProviderServerTimings;
}

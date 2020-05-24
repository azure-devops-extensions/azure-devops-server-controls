/// <amd-dependency path='VSS/LoaderPlugins/Css!ActivityStats' />
///<amd-dependency path="d3"/>
/// <reference types="jquery" />
/// <reference path='../d3.d.ts' />




import VSS = require("VSS/VSS");
import TFS_Diag_WebApi = require("./TFS.Diag.WebApi");
import Navigation = require("VSS/Controls/Navigation");
import Service = require("VSS/Service");
import Diag_Services = require("VSS/Diag/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Events_Action = require("VSS/Events/Action");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Menus = require("VSS/Controls/Menus");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Url = require("VSS/Utils/Url");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import TreeView = require("VSS/Controls/TreeView");

var domElem = Utils_UI.domElem;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var delegate = Utils_Core.delegate;

class EventNames {

    public static TraceEnter: string = "TraceEnter";
    public static TraceLeave: string = "TraceLeave";
    public static EnterMethod: string = "Method/Start";
    public static EnterSQL: string = "SQL/Start";
    public static EnterRedis: string = "Redis/Start";
    public static EnterWindowsAzureStorage: string = "WindowsAzureStorage/Start";
    public static MakeRESTCall: string = "REST/Start";
    public static ReceivedRESTResponse: string = "REST/Stop";
    public static LeaveMethod: string = "Method/Stop";
    public static LeaveSQL: string = "SQL/Stop";
    public static ExitRedis: string = "Redis/Stop";
    public static LeaveWindowsAzureStorage: string = "WindowsAzureStorage/Stop";

    constructor() {
    }
}

class EventTypes {

    public static Trace: string = "Trace";
    public static Method: string = "Method";
    public static RestCall: string = "RestCall";
    public static LockService: string = "LockService";
    public static SQL: string = "SQL";
    public static AzureStorage: string = "AzureStorage";
    public static Redis: string = "Redis";

    constructor() {
    }
}

class ActivityResult {
    public name: string;
    public title: string;
    public activityType: string;
    public startOffset: number;
    public endOffset: number;
    public duration: number;

    constructor(name: string, title: string, activityType: string, startOffset: number, endOffset: number) {
        this.name = name;
        this.title = title;
        this.activityType = activityType;

        // round to 2 digits
        this.startOffset = this._round(startOffset);
        this.endOffset = this._round(endOffset);

        // calculate duration and round to 2 decimals
        this.duration = this.endOffset - this.startOffset;
        this.duration = this._round(this.duration);
    }

    private _round(x: number): number {
        return Math.round(x * 100) / 100;
    }
}

class ActivityStatsBase extends Navigation.NavigationViewTab {
    private _httpClient: TFS_Diag_WebApi.DiagHttpClient;
    public activityId: string;

    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();
        this._httpClient = Service.getApplicationClient(TFS_Diag_WebApi.DiagHttpClient);
    }

    public onNavigate(rawState: any, parsedState: any) {
        var stats: ActivityResult[] = [],
            stat: ActivityResult = null,
            statMap: IDictionaryStringTo<TFS_Diag_WebApi.ActivityStatistic> = {},
            i: number = 0,
            initialOffset: number,
            doesStatExist = false,
            currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();

        this.activityId = parsedState.id;
        
        // If there are no stats available null out grid
        if (currentStats.length > 0) {
            // first make sure current activity id is in list.  if it is not then don't fetch
            for (i = 0; i < currentStats.length; i++) {
                if (currentStats[i].id === parsedState.id) {
                    doesStatExist = true;
                    break;
                }
            }

            if (doesStatExist) {
                // If the activity id exists, then fetch the data
                this._httpClient.beginGetAllActivityStatistics(parsedState.id).then(
                    (results: TFS_Diag_WebApi.ActivityStatistic[]) => {
                        if (results.length > 0) {
                            //sort the results
                            results = results.sort((a: TFS_Diag_WebApi.ActivityStatistic, b: TFS_Diag_WebApi.ActivityStatistic) => {
                                return a.relativeTimestamp - b.relativeTimestamp;
                            });

                            initialOffset = results[0].relativeTimestamp;

                            // Process the data.  Need to match up the Enter/Begin events with their Leave/End counterparts
                            for (i = 0; i < results.length; i++) {
                                var result = results[i],
                                    initialResult: TFS_Diag_WebApi.ActivityStatistic = null,
                                    activityMessage: string = null;


                                if (result.eventName.indexOf(EventNames.TraceEnter) == 0 || result.eventName.indexOf(EventNames.TraceLeave) == 0) {

                                    // Find the trace point pair for this trace event. These event names will look like
                                    //     TraceEnter::(123,987)
                                    //     TraceLeave::(123,987)
                                    var tracePair = result.eventName.split("::")[1];

                                    if (result.eventName.indexOf(EventNames.TraceEnter) == 0) {
                                        statMap[tracePair] = result;
                                    }
                                    else {
                                        initialResult = statMap[tracePair];
                                        stats.push(this._createResult(initialResult.activityMessage, initialResult.activityMessage, initialOffset, EventTypes.Trace, initialResult, result));

                                    }
                                }
                                else if (result.eventName === EventNames.EnterMethod || result.eventName === EventNames.EnterSQL || result.eventName === EventNames.EnterWindowsAzureStorage || result.eventName === EventNames.EnterRedis) {
                                    if (result.activityMessage.toLowerCase() === 'prc_acquirelock') {
                                        statMap["lockservice"] = result;
                                    } else if (result.activityMessage.toLowerCase() === 'prc_acquirelocks') {
                                        statMap["lockservice-s"] = result;
                                    }
                                    statMap[result.eventName + "-" + result.activityMessage] = result;
                                } else if (result.eventName === EventNames.MakeRESTCall) {
                                    activityMessage = this._parseActivityMessage(result.eventName, result.activityMessage);
                                    statMap[result.eventName + "-" + activityMessage] = result;
                                } else if (result.eventName === EventNames.ReceivedRESTResponse) {
                                    activityMessage = this._parseActivityMessage(result.eventName, result.activityMessage);
                                    initialResult = statMap[EventNames.MakeRESTCall + "-" + activityMessage];
                                    stats.push(this._createResult(activityMessage, initialResult.activityMessage, initialOffset, EventTypes.RestCall, initialResult, result));
                                } else if (result.eventName === EventNames.LeaveMethod) {
                                    initialResult = statMap[EventNames.EnterMethod + "-" + result.activityMessage];
                                    stats.push(this._createResult(initialResult.activityMessage, initialResult.activityMessage, initialOffset, EventTypes.Method, initialResult, result));
                                } else if (result.eventName === EventNames.ExitRedis) {
                                    initialResult = statMap[EventNames.EnterRedis + "-" + result.activityMessage];
                                    stats.push(this._createResult(initialResult.activityMessage, initialResult.activityMessage, initialOffset, EventTypes.Redis, initialResult, result));
                                } else if (result.eventName === EventNames.LeaveSQL) {
                                    // special case for locks
                                    if (result.activityMessage.toLowerCase() === 'prc_releaselock') {
                                        initialResult = statMap["lockservice"];
                                        stats.push(this._createResult("LockService", "LockService", initialOffset, EventTypes.LockService, initialResult, result));
                                    } else if (result.activityMessage.toLowerCase() === 'prc_releaselocks') {
                                        initialResult = statMap["lockservice-s"];
                                        stats.push(this._createResult("LockService", "LockService", initialOffset, EventTypes.LockService, initialResult, result));
                                    }

                                    // handle all sql calls
                                    initialResult = statMap[EventNames.EnterSQL + "-" + result.activityMessage];
                                    stats.push(this._createResult(initialResult.activityMessage, initialResult.activityMessage, initialOffset, EventTypes.SQL, initialResult, result));

                                } else if (result.eventName === EventNames.LeaveWindowsAzureStorage) {
                                    initialResult = statMap[EventNames.EnterWindowsAzureStorage + "-" + result.activityMessage];
                                    stats.push(this._createResult(initialResult.activityMessage, initialResult.activityMessage, initialOffset, EventTypes.AzureStorage, initialResult, result));
                                }
                            }

                            stats = stats.sort((a: ActivityResult, b: ActivityResult) => {
                                return a.startOffset - b.startOffset;
                            });
                        }
                        this.renderStats(stats);
                    });
            } else {
                this.renderStats([]);
            }
        } else {
            this.renderStats([]);
        }
    }

    private _parseActivityMessage(eventName: string, message: string): string {
        var activityMessage = message;
        if (eventName === EventNames.MakeRESTCall || eventName === EventNames.ReceivedRESTResponse) {
            var start: number = activityMessage.lastIndexOf("(");
            if (start > -1) {
                var newMessage = activityMessage.substr(start);
                var end = newMessage.lastIndexOf("]");
                if (end > 0) {
                    activityMessage = newMessage.substring(0, end + 1);
                }
            }
        }

        return activityMessage;
    }

    public renderStats(stats: ActivityResult[]): void {
        // implemented by extending classes
    }

    private _createResult(name: string, title: string, initialOffset: number, activityType: string, initialResult: TFS_Diag_WebApi.ActivityStatistic, endingResult: TFS_Diag_WebApi.ActivityStatistic): ActivityResult {
        return new ActivityResult(name, title, activityType, initialResult.relativeTimestamp - initialOffset, endingResult.relativeTimestamp - initialOffset);
    }
}

class ActivityStatsTableTab extends ActivityStatsBase {
    private _statsGrid: Grids.Grid;

    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();

        this._statsGrid = <Grids.Grid>Controls.BaseControl.createIn(Grids.Grid, this._element, {
            height: '100%',
            header: true,
            cssClass: 'activity-stats-grid',
            allowMultiSelect: false,
            gutter: {
                contextMenu: false
            },
            contextMenu: {
            },
            columns: <any[]>[{
                width: '100',
                index: 'activityType',
                text: "Event Type"
            }, {
                    width: '250',
                    index: 'name',
                    text: "Event Name"
                }, {
                    width: '100',
                    index: 'duration',
                    text: "Duration (ms)",
                    comparer: function (column, order, item1, item2) {
                        return item1.duration - item2.duration;
                    }
                },
                {
                    width: '100',
                    index: 'startOffset',
                    text: "Start Offset (ms)",
                    comparer: function (column, order, item1, item2) {
                        return item1.startOffset - item2.startOffset;
                    }
                }],
            enabledEvents: {},
            source: [],
        });
    }


    public renderStats(stats: ActivityResult[]) {
        this._refreshGrid(stats);
    }

    private _refreshGrid(results: ActivityResult[]) {
        this._setSource([]);
        this._setSource(results);
    }

    private _setSource(source) {
        var options = this._statsGrid._options;

        options.source = source;
        options.expandStates = this._statsGrid._expandStates;
        options.columns = this._statsGrid._columns;
        options.sortOrder = this._statsGrid._sortOrder;

        // Seeding the grid with the new source
        this._statsGrid.initializeDataSource();
    }
}

class ActivityStatsChartTab extends ActivityStatsBase {
    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();

    }

    public renderStats(stats: ActivityResult[]) {
        this._refreshChart(stats);
    }

    protected _refreshChart(stats: ActivityResult[]) {
        // Clear the tab
        this._element.empty();
        if (stats && stats.length > 0) {
            var that = this;
            var traces: ActivityResult[] = stats;

            // sort the traces
            traces = traces.sort(function (a, b) {
                return a.startOffset - b.startOffset;
            });

            // Figure out the total duration for activitis
            var totalDuration = 0;
            traces.forEach((value: ActivityResult) => {
                totalDuration = Math.max(totalDuration, value.endOffset);
            });

            // Setup height and widths
            var divWidth = 800;
            var itemHeight = 17;
            var margin = { top: 10, right: 10, bottom: 20, left: 10 };
            var width = divWidth - margin.left - margin.right;
            var height = traces.length * itemHeight + (traces.length - 1) * 5 - margin.top - margin.bottom + 50;

            var msFormat = d3.format(".f");

            var x = d3.scale.linear()
                .domain([0, totalDuration])
                .range([0, width]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');

            // Add the svg element
            var root = d3.select(this._element[0]);
            var svg = root.append("svg")
                .attr("width", width + margin.left + margin.right + 315)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var rectLayer = svg.append("g");
            var textLayer = svg.append("g");

            // Add labels.
            var label = textLayer.selectAll("text")
                .data(traces)
                .enter().append("text")
                .text(function (d) { return "(" + msFormat(d.duration) + "ms): " + d.name; })
                .attr("x", 0)
                .attr("y", function (d, i) { return (i * itemHeight) + (i - 1) * 5; })
                .attr("dy", 15)
                .attr("dx", 10)
                .style("fill", "#787878");

            //determine max width for labels
            var maxWidth = 0;
            var width = 0;
            this._element.find('text').each((index: any, elem: Element) => {
                width = (<any>elem).getSubStringLength(0, elem.textContent.length);
                maxWidth = Math.max(maxWidth, width);
            });

            // Cap the maxwidth at 300
            maxWidth = Math.min(maxWidth, 300);

            // Clip text elements to maxwidth
            this._element.find('text').each((index: any, elem: Element) => {
                this._placeTextWithEllipsis(elem, elem.textContent, maxWidth + 15);
            });

            // Add rects for waterfall
            var rect = rectLayer.selectAll("rect")
                .data(traces)
                .enter().append("rect")
                .attr("x", function (d) {
                return x(d.startOffset) + maxWidth + 15;
            })
                .attr("y", function (d, i) { return (i * itemHeight) + (i - 1) * 5; })
                .attr("width", function (d) {
                return Math.max(2, x(d.duration));
            })
                .attr("height", itemHeight)
                .style("fill", function (d) {
                return that._colorType(d);
            });

            // Add tooltips to rects.
            rect.append("title").text(function (d) {
                return "(" + msFormat(d.duration) + "ms): " + d.title;
            });

            var xAxisTransform = maxWidth + 15;
            svg.append('g')
                .attr('class', 'axis')
                .attr('transform', 'translate(' + xAxisTransform + ',' + height + ')')
                .call(xAxis);
        } else {
            $(domElem('span')).text("There are no statistics to show").appendTo(this._element);
        }
    }

    protected _colorType(item: any): string {
        if (item.activityType === EventTypes.RestCall) return "#aa3355";
        if (item.activityType === EventTypes.Method) return "#33aa55";
        if (item.activityType === EventTypes.SQL) return "#3355aa";
        if (item.activityType === EventTypes.AzureStorage) return "#99CCFF";
        if (item.activityType === EventTypes.LockService) return "#CC9900";
        if (item.activityType === EventTypes.Redis) return "#000000";
        if (item.activityType === EventTypes.Trace) return "#994499";

        return "#787878";
    }

    private _placeTextWithEllipsis(textObj: any, textString: string, width: number): void {
        textObj.textContent = textString;

        //ellipsis is needed
        if (textObj.getSubStringLength(0, textString.length) >= width) {
            for (var x = textString.length - 3; x > 0; x -= 3) {
                if (textObj.getSubStringLength(0, x) <= width) {
                    textObj.textContent = textString.substring(0, x) + "...";
                    return;
                }
            }
            textObj.textContent = "..."; //can't place at all
        }
    }
}


export class ActivityStatsTree extends TreeView.TreeView {
    public static EXPANDED_STATES = 'TFS.ActivityStatsTree.ExpandedStates';
    private _currentStats: Diag_Services.ActivityStatistic[];
    private _statAction: string;
    private _expandedStates: IDictionaryStringTo<boolean>;
    private _nodesMap: IDictionaryStringTo<TreeView.TreeNode>;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        
        // Load up stats from storage
        this._currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();

        // default to summary
        this._statAction = "summary";

        // load up and persisted expanded states
        this._expandedStates = this._loadExpandedStates();
        this._nodesMap = {};
    }

    public refresh(): void {
        var i: number,
            node: TreeView.TreeNode,
            parentNodes: TreeView.TreeNode[] = [],
            extraNodes: TreeView.TreeNode[] = [];

        // Clear node map
        this._nodesMap = {};
        this._currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();

        for (i = 0; i < this._currentStats.length; i++) {
            node = this._createTreeNode(this._currentStats[i]);

            // If no parent id it is a parent node
            if (!this._currentStats[i].parentId) {
                parentNodes.push(node);
            } else {
                //try and find parent
                if (this._nodesMap[this._currentStats[i].parentId]) {
                    this._nodesMap[this._currentStats[i].parentId].children.push(node);
                } else {
                    // Hold on to it and we will do another pass at the end
                    extraNodes.push(node);
                }
            }
        }

        // try and add the orphaned nodes again
        for (i = 0; i < extraNodes.length; i++) {
            var orphanedNode: any = extraNodes[i];
            if (this._nodesMap[orphanedNode.statistic.parentId]) {
                this._nodesMap[orphanedNode.statistic.parentId].children.push(orphanedNode);
            } else {
                // Add orphan as a parent
                parentNodes.push(orphanedNode);
            }
        }

        //sort the parent nodes
        parentNodes = parentNodes.sort((a: TreeView.TreeNode, b: TreeView.TreeNode): number => {
            var aStat: Diag_Services.ActivityStatistic = (<any>a).statistic,
                bStat: Diag_Services.ActivityStatistic = (<any>a).statistic,
                aDate = new Date(aStat.actionDate),
                bDate = new Date(bStat.actionDate);

            return aDate.getTime() - bDate.getTime();
        });

        //sort the items in the nodes/set expanded to false for parents with no children
        for (i = 0; i < parentNodes.length; i++) {
            if (parentNodes[i].children && parentNodes[i].children.length > 0) {
                parentNodes[i].children = parentNodes[i].children.sort((a: TreeView.TreeNode, b: TreeView.TreeNode): number => {
                    var aStat: Diag_Services.ActivityStatistic = (<any>a).statistic,
                        bStat: Diag_Services.ActivityStatistic = (<any>a).statistic,
                        aDate = new Date(aStat.actionDate),
                        bDate = new Date(bStat.actionDate);

                    return aDate.getTime() - bDate.getTime();
                });
            } else {
                parentNodes[i].expanded = false;
            }
        }

        // Clear root node and add new set of nodes
        this.rootNode.clear();
        this.rootNode.addRange(parentNodes);

        this._draw();

    }

    public setAction(action: string) {
        this._statAction = action;
    }

    private _createTreeNode(statistic: Diag_Services.ActivityStatistic): TreeView.TreeNode {
        var node: any = TreeView.TreeNode.create(this._getDisplayName(statistic.name));
        node.title = statistic.name;
        node.noTreeIcon = statistic.parentId ? true : false;
        node.tag = statistic.id;
        node.statistic = statistic;
        node.folder = statistic.parentId ? false : true;

        if (this._expandedStates.hasOwnProperty(statistic.id)) {
            node.expanded = this._expandedStates[statistic.id];
        } else {
            node.expanded = true;
        }

        // add to map for fast access
        this._nodesMap[statistic.id] = node;
        return node;
    }

    public _toggle(node, nodeElement): any {
        super._toggle(node, nodeElement);
        this._expandedStates[node.tag] = node.expanded;
        this._saveExpandedStates();
    }

    public onItemClick(node, nodeElement, e?: JQueryEventObject): any {
        // update the location
        window.location.href = Service.getLocalService(Navigation_Services.HistoryService).getFragmentActionLink(this._statAction || "summary", { id: node.tag });

        super.onItemClick(node, nodeElement, e);
    }

    private _getDisplayName(name: string) {
        var i = 0;
        if (name) {
            var segments: string[] = name.split("/");
            if (segments) {
                for (i = segments.length - 1; i >= 0; i--) {
                    if (segments[i] && segments[i].trim().length > 0) {
                        return segments[i].trim();
                    }
                }
            }
        }

        return name;
    }

    public setSelectedItem(id: string) {
        if (this.rootNode) {
            if (this._nodesMap[id]) {
                this.setSelectedNode(this._nodesMap[id]);
            }
        }
    }

    private _loadExpandedStates(): IDictionaryStringTo<boolean> {
        try {
            var expandedStates = window.localStorage.getItem(ActivityStatsTree.EXPANDED_STATES);
            if (expandedStates) {
                return Utils_Core.parseMSJSON(expandedStates, false);
            }
        } catch (error) {
            //ignore
        }
        return {};
    }

    private _saveExpandedStates() {
        try {
            window.localStorage.setItem(ActivityStatsTree.EXPANDED_STATES, Utils_Core.stringifyMSJSON(this._expandedStates));
        } catch (error) {
            //ignore
        }
    }

    public reset() {
        // Clear out stored states
        try {
            window.localStorage.removeItem(ActivityStatsTree.EXPANDED_STATES);
        } catch (error) {
            //ignore
        }

        this._expandedStates = {};

        // Reload the tree
        this.refresh();
    }

}

export class ActivityStatsView extends Navigation.TabbedNavigationView {
    private _currentStats: Diag_Services.ActivityStatistic[];
    private _menu: any;
    private _activityTree: ActivityStatsTree;
    private _emptyMessage: JQuery;
    private _state: any;

    constructor(options?) {
        var tabs = {};

        tabs["summary"] = ActivityStatsTableTab;
        tabs["chart"] = ActivityStatsChartTab;

        super($.extend({
            tabs: tabs,
            hubContentSelector: ".activity-stats-content",
            pivotTabsSelector: ".activitystats-explorer-tabs",
            attachNavigate: true
        }, options));
        this._menu = null;
    }

    public initialize() {
        var that = this;
        this._state = null;
        this._currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();

        // Create the tree
        this._activityTree = <ActivityStatsTree>Controls.Enhancement.enhance(ActivityStatsTree, $('.activity-stats-container', this._element), {});
        this._activityTree.refresh();

        this._emptyMessage = $('<div></div>')
            .addClass("no-data-message")
            .text("No statistics exist")
            .appendTo($('.activity-stats-explorer', this._element));

        this._evaluateGridVisibility();
        super.initialize();
        this._createToolbar();
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        var state: any = {};

        this.setState(state);

        // Determine the current state and id
        action = action || "summary";
        state.action = action;

        if (rawState.id) {
            state.id = rawState.id;
        } else if (this._currentStats && this._currentStats.length > 0) {
            state.id = this._currentStats[0].id;
        }

        callback(action, state);
    }

    public onNavigate(state: any) {
        /// <summary>Function invoked when a page/hash navigation has occurred</summary>
        /// <param name="state" type="Object">Hash object containing the hash-url parameters</param>
        this._state = state;
        this._activityTree.setAction(this._state ? this._state.action : null);
        this._setSelectedItem();
    }

    private _evaluateGridVisibility() {
        if (this._currentStats.length > 0) {
            this._activityTree.showElement();
            this._emptyMessage.hide();
        } else {
            this._activityTree.hideElement();
            this._emptyMessage.show();
        }
    }

    private _createToolbar() {
        this._menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._element.find("div.activity-stats-toolbar"), {
            items: this._createToolbarItems()
        });
        Menus.menuManager.attachExecuteCommand(Utils_Core.delegate(this, this._onToolbarItemClick));
    }

    private _createToolbarItems() {
        return <any[]>[
            { id: "refresh-activitystats", title: "Refresh", icon: "icon-refresh", showText: false },
            { separator: true },
            { id: "clear-activitystats", text: "Clear", title: "Clear", showText: true, noIcon: true },
            { id: "start-activitystats", text: "Start", title: "Start", showText: true, noIcon: true, disabled: Service.getLocalService(Diag_Services.ActivityStatsCollector).isCollectingStats() },
            { id: "stop-activitystats", text: "Stop", title: "Stop", showText: true, noIcon: true, disabled: !Service.getLocalService(Diag_Services.ActivityStatsCollector).isCollectingStats() },
            { id: "help-activitystats", text: "Help", title: "Help", showText: true, noIcon: true }
        ];
    }

    private _updateMenuStates() {
        this._menu.updateItems(this._createToolbarItems());
    }

    private _setSelectedItem() {
        var selectedIndex = -1;
        var that = this;

        if (!this._state || !this._state.id) {
            selectedIndex = 0;
        }
        else {
            $.each(this._currentStats, (index, activityStat) => {
                if (Utils_String.ignoreCaseComparer(activityStat.id, this._state.id) === 0) {
                    selectedIndex = index;

                    // Update the view title to the url of selected activity
                    that.setViewTitle(activityStat.name);
                    return;
                }
            });
        }

        var dataIndex = Math.max(selectedIndex, 0);
        this._activityTree.setSelectedItem(this._state.id);
    }

    private _onToolbarItemClick(sender, args?) {
        var command = args.get_commandName(),
            commandArgument = args.get_commandArgument(),
            that = this,
            result = false;

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "refresh-activitystats":
                this._refreshTree();
                break;
            case "clear-activitystats":
                this._clearList();
                break;
            case "start-activitystats":
                Service.getLocalService(Diag_Services.ActivityStatsCollector).collectStats(true);
                this._updateMenuStates();
                break;
            case "stop-activitystats":
                Service.getLocalService(Diag_Services.ActivityStatsCollector).collectStats(false);
                this._updateMenuStates();
                break;
            case "help-activitystats":
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: 'https://vsowiki.com/index.php?title=Web_Access_Performance_Viewer',
                    target: "_blank"
                });
                break;
            default:
                result = true;
                break;
        }

        return result;
    }

    private _refreshTree() {
        this._currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();
        this._activityTree.refresh();
        
        //update visibility                
        this._evaluateGridVisibility();    

        //select item
        this._setSelectedItem();
    }

    private _clearList() {
        // Remove items from storage
        Service.getLocalService(Diag_Services.ActivityStatsCollector).clearStats();

        // Clear the tree
        this._currentStats = Service.getLocalService(Diag_Services.ActivityStatsCollector).getActivityStatistics();
        this._activityTree.reset();
        
        //hide tree
        this._evaluateGridVisibility();

        this.setViewTitle("Activity Statistics");
        this.refreshCurrentTab();
    }
}

VSS.classExtend(ActivityStatsView, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(ActivityStatsView, ".activity-stats-view");


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Diag.ActivityStats.Controls", exports);

/// <reference types="jquery" />

import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildDetailsViewModel = require("Build/Scripts/Models.BuildDetailsViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import Information = require("Build/Scripts/Xaml.Information");
import XamlFunctions = require("Build/Scripts/Xaml.Functions");

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var TfsContext = TFS_Host_TfsContext.TfsContext;
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class BuildServer extends TFS_Service.TfsService {
    public static qualities: any = null;
    public static extensions: any = null;

    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);
    }

    public getApiLocation(action?: string) {
        /// <param name="action" type="string" optional="true" />
        return this.getTfsContext().getActionUrl(action || "", "build", { area: "api" });
    }

    public beginQueryLogXml(parameters: JSON, callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <param name="parameters" type="JSON">build uri & path</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever API call fails</param>

        this._ajaxJson("LogXml", parameters, callback, errorCallback);
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, delegate(this, callback), errorCallback, ajaxOptions);
    }
}

export class XamlBuildLogViewModel extends Adapters_Knockout.TemplateViewModel {
    public context: BuildDetails.BuildDetailsTab;

    constructor(context: BuildDetails.BuildDetailsTab) {
        super();

        this.context = context;

        this.computed(() => {
            let currentBuild = Context.buildDetailsContext.currentBuild();
            this.context.visible(currentBuild
                && currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml);
        });
    }
}

export class XamlBuildLogControl extends Adapters_Knockout.TemplateControl<XamlBuildLogViewModel> {
    static TemplateName = "buildvnext_details_xaml_log_tab";

    private _buildSubscription: IDisposable;
    private _nodesSubscription: IDisposable;
    private _buildLogContainer: BuildLogContainer = null;
    private _$buildDetailView: JQuery;

    constructor(viewModel: XamlBuildLogViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        this._$buildDetailView = $(domElem("div", "build-detail-view"));
        this._element.append(this._$buildDetailView);

        this._buildSubscription = this.computed(() => {
            let build = Context.buildDetailsContext.currentBuild();
            if (!build) {
                return;
            }

            // to make sure we subscribe to status and new build changes
            build.status();
            build.id();

            // dispose of any existing subscription against information nodes
            if (this._nodesSubscription) {
                this._nodesSubscription.dispose();
                this._nodesSubscription = null;
            }

            // if it's not a xaml build, dispose of the log control
            if (!build || build.definitionType() !== BuildContracts.DefinitionType.Xaml) {
                if (this._buildLogContainer) {
                    this._buildLogContainer.dispose();
                    this._buildLogContainer = null;
                }
            }
            else {
                this._nodesSubscription = this.subscribe(build.informationNodes, (nodes: BuildContracts.InformationNode[]) => {
                    this._refreshNodes(nodes);
                });

                this.refreshNodes(build.id());
            }
        });
    }

    public refreshNodes(buildId: number) {
        // construct what the log container expects
        Context.viewContext.buildClient.getInformationNodes(buildId).then((informationNodes: BuildContracts.InformationNode[]) => {
            this._refreshNodes(informationNodes);
        });
    }

    private _refreshNodes(informationNodes: BuildContracts.InformationNode[]) {
        var nodesById = {};
        informationNodes.forEach((node: BuildContracts.InformationNode) => {
            nodesById[node.nodeId] = node;
        });

        var rootNodes = [];
        informationNodes.forEach((node: BuildContracts.InformationNode) => {
            var parent = nodesById[node.parentId];
            if (parent) {
                if (!parent.nodes) {
                    parent.nodes = [];
                }
                parent.nodes.push(node);
            }
            else {
                rootNodes.push(node);
            }

            (<any>node).text = node.fields[Information.InformationFields.DisplayText];

            if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.ExternalLink) === 0) {
                var url = node.fields["Url"];
                var linkType: XamlFunctions.BuildExternalLinkType;
                if (Utils_String.startsWith(url, "$/")) {
                    linkType = XamlFunctions.BuildExternalLinkType.VersionControlPath;
                }
                else if (Utils_String.startsWith(url, "#")) {
                    linkType = XamlFunctions.BuildExternalLinkType.BuildContainerPath;
                }
                else if (Utils_String.startsWith(url, "vstfs:///", Utils_String.ignoreCaseComparer)) {
                    linkType = XamlFunctions.BuildExternalLinkType.ArtifactUri;
                }
                else if (Utils_String.startsWith(url, "\\\\")) {
                    // unc
                    linkType = XamlFunctions.BuildExternalLinkType.LocalPath;
                }
                else if (Utils_String.startsWith(url, "file://", Utils_String.ignoreCaseComparer)) {
                    // file uri, but not unc
                    linkType = XamlFunctions.BuildExternalLinkType.LocalPath;
                }
                else {
                    linkType = XamlFunctions.BuildExternalLinkType.Url;
                }
                var link: XamlFunctions.Link = {
                    text: node.fields["DisplayText"],
                    url: url,
                    type: linkType
                };
                (<any>node).link = link;
            }
            else if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.BuildProject) === 0) {
                var filename = node.fields["ServerPath"];
                if (!filename) {
                    filename = node.fields["LocalPath"];
                }

                var targets = node.fields["TargetNames"];
                if (targets) {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewProjectNodeWithTargetsFormat, filename, targets);
                }
                else {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewProjectNodeFormat, filename);
                }
            }
            else if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.AgentScopeActivityTracking) === 0) {
                (<any>node).text = Utils_String.format(BuildResources.XamlBuildLogAgentInfo, (<any>node).text, node.fields[Information.InformationFields.ReservedAgentName] || "");
            }
            else if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.BuildMessage) === 0) {
                (<any>node).text = node.fields[Information.InformationFields.Message];
            }
            else if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.BuildError) === 0) {
                (<any>node).status = "error";
                var message = node.fields[Information.InformationFields.Message];
                var file = node.fields[Information.InformationFields.File];
                var lineNumber = node.fields[Information.InformationFields.LineNumber];
                if (!file) {
                    (<any>node).text = message;
                }
                else if (parseInt(lineNumber) <= 0) {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewErrorWarningDetailNoLineNumber, file, message);
                }
                else {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewErrorWarningDetail, file, lineNumber, message);
                }
            }
            else if (Utils_String.localeIgnoreCaseComparer(node.type, Information.InformationTypes.BuildWarning) === 0) {
                (<any>node).status = "warning";
                var message = node.fields[Information.InformationFields.Message];
                var file = node.fields[Information.InformationFields.File];
                var lineNumber = node.fields[Information.InformationFields.LineNumber];
                if (!file) {
                    (<any>node).text = message;
                }
                else if (parseInt(lineNumber) <= 0) {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewErrorWarningDetailNoLineNumber, file, message);
                }
                else {
                    (<any>node).text = Utils_String.format(BuildResources.BuildDetailViewErrorWarningDetail, file, lineNumber, message);
                }
            }
        });

        var xamlBuild = {
            information: rootNodes
        };

        if (!this._buildLogContainer) {
            this._buildLogContainer = <BuildLogContainer>Controls.BaseControl.createIn(BuildLogContainer, this._$buildDetailView, $.extend({ buildDetail: xamlBuild }, this._options));
        }
        this._buildLogContainer.refresh(xamlBuild);
    }

    protected _dispose() {
        if (this._buildSubscription) {
            this._buildSubscription.dispose();
            this._buildSubscription = null;
        }

        if (this._nodesSubscription) {
            this._nodesSubscription.dispose();
            this._nodesSubscription = null;
        }

        this._cleanup();
        super._dispose();
    }
}

Adapters_Knockout.TemplateControl.registerBinding(XamlBuildLogControl.TemplateName, XamlBuildLogControl, (context?: any): XamlBuildLogViewModel => {
    return new XamlBuildLogViewModel(context);
});

export class XamlBuildDiagnosticsViewModel extends Adapters_Knockout.TemplateViewModel {
    public context: BuildDetails.BuildDetailsTab;

    public build: KnockoutComputed<BuildDetailsViewModel.BuildDetailsViewModel>;

    constructor(context: BuildDetails.BuildDetailsTab) {
        super();

        this.context = context;

        this.build = this.computed(() => {
            return Context.buildDetailsContext.currentBuild();
        });

        this.computed(() => {
            var currentBuild = this.build();
            this.context.visible(currentBuild
                && currentBuild.definitionType() === BuildContracts.DefinitionType.Xaml
                && currentBuild.finished());
        });
    }
}

export class XamlBuildDiagnosticsControl extends Adapters_Knockout.TemplateControl<XamlBuildDiagnosticsViewModel> {
    static TemplateName = "buildvnext_details_xaml_diagnostics_tab";

    private _buildDiagnosticsContainer: BuildDiagnosticsContainer = null;
    private _$buildDetailView: JQuery;

    private _$logMenu: JQuery;
    private _$logContent: JQuery;

    constructor(viewModel: XamlBuildDiagnosticsViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        this._$buildDetailView = this._element.find(".build-detail-view");
        this._$logMenu = this._element.find(".logmenu");
        this._$logContent = this._element.find(".logcontent");

        var viewModel = this.getViewModel();

        this.computed(() => {
            var buildModel = viewModel.build();

            // new build. recreate the control
            if (this._buildDiagnosticsContainer) {
                this._buildDiagnosticsContainer.dispose();
                this._buildDiagnosticsContainer = null;
                this._$logMenu.empty();
                this._$logContent.empty();
            }

            if (buildModel) {
                var build = buildModel.value();

                // if it's not a xaml build, dispose of the log control
                if (build && build.definition.type === BuildContracts.DefinitionType.Xaml) {
                    this.refresh(build.id);
                }
            }
        });
    }

    public refresh(buildId: number) {
        var viewModel = this.getViewModel();
        var build = viewModel.build();

        var xamlBuild = {
            id: build.id(),
            finished: build.finished(),
            uri: build.uri()
        };

        if (!this._buildDiagnosticsContainer) {
            this._buildDiagnosticsContainer = <BuildDiagnosticsContainer>Controls.BaseControl.createIn(BuildDiagnosticsContainer, this._$buildDetailView, $.extend({ buildDetail: xamlBuild, submenu: this._$logMenu, content: this._$logContent }, this._options));
        }
        this._buildDiagnosticsContainer.refresh(xamlBuild, null);
        this._$logMenu.show();
        this._$logContent.show();
    }
}

Adapters_Knockout.TemplateControl.registerBinding(XamlBuildDiagnosticsControl.TemplateName, XamlBuildDiagnosticsControl, (context?: any): XamlBuildDiagnosticsViewModel => {
    return new XamlBuildDiagnosticsViewModel(context);
});

class BuildDetailSection extends Controls.BaseControl {
    public _buildDetail: any;
    public _buildServer: any;

    constructor(options?) {
        super(options);

        this._buildDetail = this._options.buildDetail;
        Diag.Debug.assert(Boolean(this._buildDetail), "Build detail is expected");
    }

    public getBuildServer() {
        if (!this._buildServer) {
            this._buildServer = Service.getCollectionService(BuildServer, this._options.tfsContext.contextData);
        }
        return this._buildServer;
    }

    public show() {
        this._element.show();
    }

    public hide() {
        this._element.hide();
    }
}

VSS.initClassPrototype(BuildDetailSection, {
    _buildDetail: null,
    _buildServer: null
});

VSS.classExtend(BuildDetailSection, TfsContext.ControlExtensions);

class BuildLogContainer extends BuildDetailSection {
    private _logNodes: string[];

    constructor(options?) {
        super(options);

        this._logNodes = [
            Information.InformationTypes.ActivityProperties,
            Information.InformationTypes.ActivityTracking,
            Information.InformationTypes.AgentScopeActivityTracking,
            Information.InformationTypes.BuildProject,
            Information.InformationTypes.BuildStep,
            Information.InformationTypes.BuildMessage,
            Information.InformationTypes.BuildError,
            Information.InformationTypes.BuildWarning,
            Information.InformationTypes.ExternalLink,
            Information.InformationTypes.OpenedWorkItem
        ];
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend(options, {
            coreCssClass: "log"
        }));
    }

    public refresh(build) {
        this._element.empty();
        if (build.jsonLimitExceeded) {
            XamlFunctions.renderJsonLimitExceeded(this._element, build, build.hasLogs);
        }
        else {
            this._populateNodes(build.information, 0);
        }
    }

    public renderNode(node, level) {
        var nodeElement = XamlFunctions.appendNodeElement(this._element, node, level);
        if (node.status) {
            XamlFunctions.createIconLogNode(nodeElement, node, node.text);
        }
        else {
            XamlFunctions.appendText(nodeElement.append($("<pre />")), node.text || "");
        }
        return nodeElement;
    }

    public renderActivityProperties(node, level) {
        var prop, propText, nodeElement;
        nodeElement = this.renderNode(node, level);

        if (node.properties) {
            for (prop in node.properties) {
                if (node.properties.hasOwnProperty(prop)) {
                    propText = Utils_String.format(BuildResources.BuildDetailViewPropertyValueFormat, prop, node.properties[prop]);
                    $("<div class='property-value' />").text(propText).css("margin-left", 30).appendTo(nodeElement);
                }
            }
        }
    }

    public renderExternalLink(node, level) {
        var nodeElement = XamlFunctions.appendNodeElement(this._element, node, level);
        nodeElement.append(XamlFunctions.createLinkElement(node.link));
    }

    private _canBeRendered(node) {
        return $.inArray(node.type, this._logNodes) >= 0;
    }

    private _populateNodes(nodes, level) {
        var i, l, node, renderer;

        if (nodes) {
            for (i = 0, l = nodes.length; i < l; i++) {
                node = nodes[i];
                if (this._canBeRendered(node)) {
                    renderer = this["render" + node.type];
                    if ($.isFunction(renderer)) {
                        renderer.call(this, node, level);
                    }
                    else {
                        this.renderNode(node, level);
                    }
                    this._populateNodes(node.nodes, level + 1);
                }
            }
        }
    }
}

VSS.initClassPrototype(BuildLogContainer, {
    _logNodes: null
});

module BuildViewActions {
    export var COMPLETED = "completed";
    export var QUEUED = "queued";
    export var DEPLOYED = "deployed";
    export var LOG = "log";
    export var SUMMARY = "summary";
    export var DIAGNOSTICS = "diagnostics";
    export var DROP = "drop";
}

class BuildDiagnosticsContainer extends BuildDetailSection {
    private _menu: any;
    private _log: any;
    private _build: any;
    private _submenu: any;
    private _content: any;
    private _selectedIndex: number;
    private _linkNumber: number;
    private _allErrors: any;
    private _selected: any;
    private _logLocation: any;
    private _diagnosticsView: any;

    constructor(options?) {
        super(options);

        this._build = this._options.buildDetail;
        Diag.Debug.assert(Boolean(this._build), "Build detail is expected");
        this._submenu = this._options.submenu;
        Diag.Debug.assert(Boolean(this._submenu), "Submenu is expected");
        this._content = this._options.content;
        Diag.Debug.assert(Boolean(this._content), "Content is expected");
        if (!this._options.tfsContext) {
            this._options.tfsContext = Context.viewContext.tfsContext;
        }
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend(options, {
            coreCssClass: "BuildDiagnostics"
        }));

        this.hide();
    }

    public hide() {
        if (this._menu) {
            this._menu.dispose();
            delete this._menu;
        }
        if (this._log) {
            this._log.hide();
        }
    }

    public show() {
        if (this._build) {
            this._showToolbar(this._build);
        }
        if (this._log) {
            this._log.show();
        }
    }

    public refresh(build, logPath) {
        if (!build.finished) {
            this._log = $("<div class='BuildDiagnostics'></div>").text(BuildResources.NotFinished);
            this._content.append(this._log);
            this._menu = null;
            return;
        }

        this._build = build;
        this._log = $("<div class='BuildDiagnostics'></div>").text(BuildResources.Loading);
        this._content.append(this._log);

        this._showToolbar(build);

        // Default the log location to logPath that is in the URL
        this._setLogLocation(logPath, true);
    }

    private _updateMenu() {
        var nextEnabled = false,
            prevEnabled = false,
            nextItem;

        if (!this._menu) {
            return;
        }

        if (this._allErrors) {
            nextItem = this._menu.getItem("next");
            nextItem.updateText(BuildResources.NextError);
            if (this._allErrors.length === 1) {
                nextItem.updateText(BuildResources.GoToError);
                nextEnabled = true;
            }
            else if (this._selectedIndex >= this._allErrors.length - 1) {
                nextEnabled = false;
            }
            else {
                nextEnabled = true;
            }

            if (this._selectedIndex <= 0) {
                prevEnabled = false;
            }
            else {
                prevEnabled = true;
            }

            if (this._selected) {
                $(this._selected).prev("SPAN").removeClass("BuildSelected");
            }

            this._selected = this._allErrors[this._selectedIndex];

            if (this._selected) {
                this._content.scrollTop(this._selected.offsetTop);
                $(this._selected).prev("SPAN").addClass("BuildSelected");
            }
        }

        this._menu.updateCommandStates([{ id: "next", disabled: !nextEnabled }]);
        this._menu.updateCommandStates([{ id: "prev", disabled: !prevEnabled }]);
    }

    private _setLogLocation(intermediateFolder, forceRefresh?: boolean) {
        /// <param name="forceRefresh" type="boolean" optional="true" />

        var newLogLocation, path, state;
        if (intermediateFolder) {
            path = intermediateFolder;
        }
        else {
            path = "logs";
        }
        newLogLocation = path + "\\ActivityLog.xml";

        if (this._logLocation !== newLogLocation || forceRefresh) {
            if (!forceRefresh) {
                var historySvc = Navigation_Services.getHistoryService();
                state = historySvc.getCurrentState();
                historySvc.addHistoryPoint(BuildViewActions.DIAGNOSTICS, $.extend(state, { logPath: intermediateFolder ? intermediateFolder : "" }));
            }

            this._logLocation = newLogLocation;
            if (this._build) {
                this._loadLogs(this._build, this._logLocation, path);
            }
        }
    }

    private _loadLogs(build, logLocation, logFolder) {
        this.getBuildServer().beginQueryLogXml(
            { buildUri: build.uri, logLocation: logLocation, logFolder: logFolder },
            delegate(this, function (params) { this._onQueryXmlComplete(params, logFolder); }),
            delegate(this, function (error) { this._onErrorLogXml(error, this._log); })
        );
    }

    private _downloadLogs() {
        var path, build = this._build;
        if (build && build.hasDiagnostics) {
            path = "/logs";
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("ItemContent", "build", {
                    area: 'api',
                    buildUri: build.uri,
                    path: path
                } as TFS_Host_TfsContext.IRouteData),
                target: "_blank"
            });
        }
    }

    private _showToolbar(build) {
        if (!this._menu) {
            Context.viewContext.buildClient.getInformationNodes(build.id, [Information.InformationTypes.IntermediateLogInformation]).then((informationNodes: BuildContracts.InformationNode[]) => {
                var menuItems = this._createToolbarItems(informationNodes);

                this._menu = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._submenu, { items: menuItems });
                Menus.menuManager.attachExecuteCommand(Utils_Core.delegate(this, this._onToolbarItemClick));
                this._updateMenu();
            });
        }
    }

    private _createToolbarItems(intermediateLogInformationNodes: BuildContracts.InformationNode[]) {
        var i,
            items = [],
            intermediateInfoNodes,
            intermediateItems;

        function addSeparator() {
            if (items.length) {
                items[items.length] = { separator: true };
            }
        }

        // Add submenu
        if (intermediateLogInformationNodes.length > 0) {
            intermediateItems = [{ rank: 0, id: "intermediate-log", text: BuildResources.BuildDetailViewDiagnosticsFinalLogs, select: true, noIcon: true }];
            for (i = 0; i < intermediateLogInformationNodes.length; i++) {
                if (intermediateLogInformationNodes[i].fields["Message"]) {
                    // If there was an error getting these logs, just don't show them in Web Access
                }
                else {
                    intermediateItems[intermediateItems.length] = {
                        rank: i + 1,
                        id: "intermediate-log",
                        text: intermediateInfoNodes[i].text,
                        'arguments': { intermediateFolder: intermediateLogInformationNodes[i].fields["LogFile"] },
                        select: true,
                        noIcon: true
                    };
                }
            }

            intermediateItems[intermediateItems.length] = { separator: true };
            intermediateItems[intermediateItems.length] = { rank: i + 1, id: "download-logs", text: BuildResources.BuildDetailViewDownloadLogs, select: true, noIcon: true };
            items.push({ text: BuildResources.BuildDetailViewDiagnosticsViewLogs, noIcon: true, childItems: intermediateItems, tag: "intermediateLog", id: "intermediate-logs" });
        }

        addSeparator();
        items.push({ id: "collapse", text: BuildResources.HideProperties, noIcon: true });
        addSeparator();
        items.push({ id: "expand", text: BuildResources.ShowProperties, noIcon: true });
        addSeparator();
        items.push({ id: "next", text: BuildResources.NextError, noIcon: true });
        addSeparator();
        items.push({ id: "prev", text: BuildResources.PreviousError, noIcon: true });

        return items;
    }

    private _onToolbarItemClick(sender, args?) {
        var command = args.get_commandName(),
            commandArgument = args.get_commandArgument(),
            that = this,
            result = false;

        // Checking to see if the command we can handle is executed
        switch (command) {
            case "collapse":
                $("div.BuildShow", that._log).click();
                break;
            case "expand":
                $("div.BuildHeader:not(.BuildShow)", that._log).click();
                break;
            case "next":
                if ($(this).hasClass("BuildLinkDisabled")) {
                    return;
                }
                else if (that._allErrors) {
                    if (that._selectedIndex < that._allErrors.length - 1) {
                        that._selectedIndex += 1;
                    }
                    that._updateMenu();
                }
                break;
            case "prev":
                if ($(this).hasClass("BuildLinkDisabled")) {
                    return;
                }
                else if (that._allErrors) {
                    that._selectedIndex -= 1;
                    that._updateMenu();
                }
                break;
            case "intermediate-log":
                that._setLogLocation(commandArgument.intermediateFolder);
                break;
            case "download-logs":
                that._downloadLogs();
                break;
            default:
                result = true;
                break;
        }

        return result;
    }

    private _onErrorLogXml(error, parent) {
        // if it's not a TeamFoundationServiceException, the legacy ajax code wraps the message in "Ajax request failed with status {0}."
        // but those always map to 500s, so on the server we just return a 404 with a message. we don't want the wrap text.
        let message = error.message;
        if (error.xhr && Utils_String.equals(error.name, Ajax.Exceptions.AjaxException) && error.statusText) {
            message = error.statusText;
        }
        $(parent).empty().append($("<div class='Failure'></div>").text(message));
    }

    private _onQueryXmlComplete(params?, logFolder?) {
        var that = this, links;

        XamlFunctions.transformXML(this._log, params.transformedLogXml);

        that._allErrors = that._log.find(".BuildError,.BuildWarning");
        that._updateMenu();

        // Expand log links
        links = this._log.find("a.BuildLogLink");
        this._linkNumber = links.length;
        $.each(links, function (index, value) {
            $(value.parentElement).append($("<div></div>").text(BuildResources.Loading));
            that.getBuildServer().beginQueryLogXml(
                { buildUri: that._build.uri, logLocation: logFolder + "\\" + $(value).attr("href"), logFolder: logFolder },
                delegate(value.parentElement, function (params) { that._onQuerySubXmlComplete(params, this); }),
                delegate(that, function (error) { that._onErrorLogXml(error, value.parentElement); }));
        });

        // Decorate the diagnostics log subtree with jQuery calls (expand/collapse, )
        XamlFunctions.decorateLog(that._element);
    }

    private _onQuerySubXmlComplete(r, parent) {
        var that = this;

        // We need to remove BuildNode class on the root element so hierarchy does not shift right twice
        $(parent).removeClass("BuildNode");

        XamlFunctions.transformXML($(parent), r.transformedLogXml);

        // Decorate the diagnostics log subtree with jQuery calls (expand/collapse, insert agent logs, ...)
        XamlFunctions.decorateLog($(parent));

        if (that._linkNumber > 0) {
            that._linkNumber -= 1;
            that._allErrors = that._log.find(".BuildError,.BuildWarning");
            that._updateMenu();
        }
    }
}

VSS.initClassPrototype(BuildDiagnosticsContainer, {
    _menu: null,
    _log: null,
    _build: null,
    _submenu: null,
    _content: null,
    _selectedIndex: -1,
    _linkNumber: 0,
    _allErrors: null,
    _selected: null,
    _logLocation: null,
    _diagnosticsView: null
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.Xaml", exports);

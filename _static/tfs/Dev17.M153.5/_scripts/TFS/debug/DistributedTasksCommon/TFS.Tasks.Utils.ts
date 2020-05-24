import Q = require("q");

import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import WebApi_Constants = require("VSS/WebApi/Constants");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import Service = require("VSS/Service");
import Grids = require("VSS/Controls/Grids");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Navigation_Service = require("VSS/Navigation/Services");
import Security_Client = require("VSS/Security/RestClient");

import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import TaskTypes = require("DistributedTasksCommon/TFS.Tasks.Types");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";


var domElem = Utils_UI.domElem;

interface Offset {
    top: number;
    left: number;
}

interface DragStartInfo extends Offset {
    dataIndex: number;
    canvasWidth: number;
}

interface DropTargetInfo {
    dataIndex: number;
    below: boolean;
}

export interface MoveCompleteDelegate {
    (oldIndex: number, newIndex: number): void;
}

export class GridRowMover implements IDisposable {

    constructor(grid: Grids.Grid, dragdropScope: string, dragdropTextProvider: (element: any) => string, moveCompleteDelegate: MoveCompleteDelegate) {
        this._grid = grid;
        this._dragdropScope = dragdropScope;
        this._dragdropTextProvider = dragdropTextProvider;

        this._grid.setupDragDrop(this._getDraggableOptions(), this._getDroppableOptions());

        this._moveCompleteDelegate = moveCompleteDelegate;

        this._gridCanvas = this._grid.getElement().find(".grid-canvas");
        this._gridRowHeight = this._grid._rowHeight || 1;
    }

    public dispose(): void {
        this._grid = null;
        this._gridCanvas = null;
        this._moveCompleteDelegate = null;
    }

    private _getRowDataIndex(offset: Offset, dragStartInfo: DragStartInfo): DropTargetInfo {
        var canvasScrollTop = this._gridCanvas.scrollTop(),
            canvasScrollLeft = this._gridCanvas.scrollLeft(),
            offset = <Offset>{
                top: offset.top - dragStartInfo.top + canvasScrollTop + this._cursorOffset.top,
                left: offset.left - dragStartInfo.left + canvasScrollLeft + this._cursorOffset.left
            };

        if (offset.left <= 0 || offset.left > dragStartInfo.canvasWidth) {
            return null;
        }

        var itemsHeight = this._grid._count * this._gridRowHeight;
        if (offset.top <= 0 || offset.top > itemsHeight) {
            return null;
        }

        var dataIndex = Math.floor((offset.top - 1) / this._gridRowHeight);

        if (dataIndex === dragStartInfo.dataIndex) {
            return null;
        }

        return {
            dataIndex: dataIndex,
            below: dataIndex > dragStartInfo.dataIndex
        };

    }

    private _resetLastDropTarget(): void {
        if (this._lastDropTarget) {
            this._lastDropTarget.removeClass("upper-drop-guide lower-drop-guide");
            this._lastDropTarget = null;
        }
    }

    private _getDraggableOptions(): any {
        this._cursorOffset = { left: 16, top: 18 };

        return {
            cursorAt: this._cursorOffset,
            axis: "",
            appendTo: document.body,
            scroll: false,
            scrollables: [".grid-canvas"],
            scrollablesAxis: "y",
            scope: this._dragdropScope,
            distance: 10,
            helper: (evt: JQueryEventObject, ui: any) => {
                var rowData = this._grid.getRowData(ui.draggingRowInfo.dataIndex);
                return $("<div />")
                    .addClass("row-drag-helper")
                    .text(this._dragdropTextProvider(rowData));
            },
            start: (evt: JQueryEventObject, ui: any) => {
                this._dragStartInfo = {
                    top: ui.offset.top,
                    left: ui.offset.left,
                    dataIndex: ui.draggingRowInfo.dataIndex,
                    canvasWidth: this._gridCanvas.width()
                };
            },
            stop: (evt: JQueryEventObject, ui: any) => {
                this._dragStartInfo = null;
                this._resetLastDropTarget();
            },
            drag: (evt: JQueryEventObject, ui: any) => {
                if (this._dragStartInfo) {
                    this._resetLastDropTarget();
                    var dropTargetInfo = this._getRowDataIndex(<Offset>ui.offset, this._dragStartInfo);
                    if (dropTargetInfo) {
                        this._lastDropTarget = <JQuery>this._grid.getRowInfo(dropTargetInfo.dataIndex).row;
                        this._lastDropTarget.addClass(dropTargetInfo.below ? "lower-drop-guide" : "upper-drop-guide");
                    }
                }
            }
        };
    }

    private _getDroppableOptions(): any {
        return {
            hoverClass: "",
            tolerance: "pointer",
            scope: this._dragdropScope,
            drop: (evt: JQueryEventObject, ui: any) => {
                if (!!ui.draggingRowInfo && !!ui.droppingRowInfo) {
                    var oldIndex = <number>ui.draggingRowInfo.dataIndex,
                        newIndex = <number>ui.droppingRowInfo.dataIndex;

                    // If different than selected index, perform move operation
                    if (oldIndex !== newIndex && $.isFunction(this._moveCompleteDelegate)) {
                        this._moveCompleteDelegate(oldIndex, newIndex);
                    }
                }
            }
        };
    }

    private _grid: Grids.Grid;
    private _gridCanvas: JQuery;
    private _gridRowHeight: number;

    private _moveCompleteDelegate: MoveCompleteDelegate;

    private _cursorOffset: Offset;
    private _lastDropTarget: JQuery;
    private _dragStartInfo: DragStartInfo;
    private _dragdropScope: string;
    private _dragdropTextProvider: (element: any) => string;
}

/**
 * Loads an html template
 * @param name The template name
 * @param cssClass A CSS class to add to the template
 */

export class HtmlHelper {

    public static renderTemplateIfNeeded(templateId: string, template: string) {
        if ($("#" + templateId).length === 0) {
            var script = document.createElement('script');
            script.type = 'text/html';
            script.text = template;
            script.id = templateId;
            document.body.appendChild(script);
        }
    }
}

export function loadHtmlTemplate(name: string, cssClass?: string): JQuery {
    var template: JQuery = $(domElem("div"))
        .attr("data-bind", "template: { name: '" + name + "' }");

    if (!!cssClass) {
        template.addClass(cssClass);
    }

    return template;
}


export class PresentationUtils {

    public static getActionUrl(action?: string, controller?: string, routeData?: any, callback?: IResultCallback): IPromise<string> {
        var tfsConnection = new Service.VssConnection(Context.getDefaultWebContext());
        var deferred: Q.Deferred<string> = Q.defer<string>();

        tfsConnection.beginGetServiceUrl(WebApi_Constants.ServiceInstanceTypes.TFS, PlatformContracts.ContextHostType.Application).then((rootUrl: string) => {
            var actionUrl = ActionUrlResolver.getActionUrl(rootUrl, action, controller, routeData);
            deferred.resolve(actionUrl);
        });

        return deferred.promise;
    }

    public static marked(input: string): IPromise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();

        if (!!input) {
            // marked-tfs-extensions has overloaded rendering, so load that module as well
            VSS.using(["Presentation/Scripts/TFS/marked-tfs-extensions", "Presentation/Scripts/marked"], (_MarkedExtension, _Marked: any) => {
                var markedString = _Marked(input);
                deferred.resolve(markedString);
            });
        }
        else {
            deferred.resolve("");
        }

        return deferred.promise;
    }

    public static getUrlForExtension(contributionId: string, action?: any, queryParameters?: any, hubRoute?: string) {
        var baseUri:string= PresentationUtils.getTeamUrl();
        return this._getExtensionActionUrlFragment(baseUri, contributionId, hubRoute, action, queryParameters).replace("#", "?");
    }

    public static getUrlForCollectionLevelExtension(contributionId: string, action?: any, queryParameters?: any, hubRoute?: string) {
        const pageContext = Context.getPageContext();
        const collectionUri: string = pageContext.webContext.collection.uri;
        return this._getExtensionActionUrlFragment(collectionUri, contributionId, hubRoute, action, queryParameters).replace("#", "?");
    }

    public static getTeamUrl(): string {
        const pageContext = Context.getPageContext();

        const collectionUri: string = pageContext.webContext.collection.uri;
        const projectName: string = pageContext.webContext.project.name;
        let teamName = "";
        if (pageContext.navigation.topMostLevel === PlatformContracts.NavigationContextLevels.Team) {
            teamName = Context.getPageContext().webContext.team.name;
        }

        const baseUrl = collectionUri + projectName + (!!teamName ? "/" + teamName : "");
        return baseUrl;
    }

    private static _getExtensionActionUrlFragment(baseUri: string, contributionId: string, hubRoute: string, action: any, queryParameters?: any): string {
        var fragementActionLink = Navigation_Service.getHistoryService().getFragmentActionLink(action, queryParameters);

        return baseUri + PresentationUtils._getExtensionUrl(contributionId, hubRoute) + fragementActionLink;
    }

    private static _getExtensionUrl(contributionId: string, hubRoute: string): string {
        if (!!hubRoute) {
            return `/${hubRoute}`;
        }

        return `/_apps/hub/${contributionId}`;
    }
}

export class ActionUrlResolver {

    public static getActionUrl(rootUrl: string, action?: string, controller?: string, routeData?: any): string {
        if (window.self !== window.top) {
            return ActionUrlResolver._getPublicActionUrl(rootUrl, action, controller, routeData);
        }
        var actionUrl = ActionUrlResolver._constructActionUrl(action, controller, routeData);

        var rootPath: string = Context.getPageContext().webAccessConfiguration.paths.rootPath;
        return rootPath + actionUrl;
    }

    public static trimVirtualPath(
        virtualPath: string,
        rootPath: string): string {

        if (!virtualPath || virtualPath.length === 0) {
            return virtualPath;
        }

        if (virtualPath.toLowerCase().indexOf(rootPath.toLowerCase()) === 0) {
            virtualPath = virtualPath.substr(rootPath.length);
        }

        return virtualPath.replace(/^\/+|\/+$/g, "");
    }

    private static _getPublicActionUrl(rootUrl: string, action: string, controller: string, routeData?: any): string {
        var actionUrl: string = ActionUrlResolver._constructActionUrl(action, controller, routeData);
        return rootUrl + actionUrl;
    }

    private static _constructActionUrl(action?: string, controller?: string, routeData?: any): string {
        var pageContext = Context.getPageContext();
        var api = pageContext.webAccessConfiguration.api;
        var urlParts: string[] = [];
        var serviceHost: PlatformContracts.ExtendedHostContext;
        var project: string;
        var team: string;
        var routeParams: any;
        var parameters: any;
        var queryString: string;
        var areaPrefix: string;
        var controllerPrefix: string;

        areaPrefix = api.areaPrefix || "";
        controllerPrefix = api.controllerPrefix || "";

        routeParams = $.extend({}, routeData);

        var area: string = routeParams.area;
        if (typeof area === "undefined") {
            area = pageContext.navigation.area;
        }

        delete routeParams.area;

        // --- BEGIN TFS Navigation Context
        serviceHost = routeParams.serviceHost;

        if (typeof serviceHost === "undefined") {
            serviceHost = pageContext.webContext.host;
        }

        if (serviceHost) {
            var relVDir = this.trimVirtualPath(serviceHost.relativeUri, pageContext.webAccessConfiguration.paths.rootPath);
            if (relVDir) {
                urlParts.push(encodeURI(relVDir));
            }

            if (serviceHost.hostType === PlatformContracts.ContextHostType.ProjectCollection) {
                // Determine whether project and team names should be used or ids, if not explicitly given by caller
                var useApiUrl = this._shouldBuildApiUrl(area, routeParams);

                project = routeParams.project;

                if (typeof project === "undefined") {
                    if (useApiUrl) {
                        project = pageContext.webContext.project.id;
                    } else {
                        project = pageContext.webContext.project.name;
                    }
                }

                if (project) {
                    urlParts.push(encodeURIComponent(project));

                    team = routeParams.team;
                    if (typeof team === "undefined" && pageContext.webContext.team) {
                        if (useApiUrl) {
                            team = pageContext.webContext.team.id;
                        } else {
                            team = pageContext.webContext.team.name;
                        }
                    }
                    
                    if (team) {
                        urlParts.push(encodeURIComponent(team));
                    }
                }
            }
        }

        //delete these navigation params so that url should not have them as query params
        delete routeParams.serviceHost;
        delete routeParams.project;
        delete routeParams.team;

        // --- END TFS Navigation Context

        if (area) {
            // There might be multiple areas specified like apis and profile
            if ($.isArray(area)) {
                var areas: string[] = <any>area; // Casting because variable can be string or string[]
                if (areas.length > 0) {
                    urlParts.push(encodeURIComponent(areaPrefix + areas[0]));
                }

                // Successive areas
                for (var i = 1; i < areas.length; i++) {
                    urlParts.push(encodeURIComponent(areas[i]));
                }
            }
            else {
                // Single area like api, admin, oi
                urlParts.push(encodeURIComponent(areaPrefix + area));
            }
        }

        if (!controller) {
            controller = routeParams.controller;
        }

        delete routeParams.controller;

        if (!action) {
            action = routeParams.action;
        }

        delete routeParams.action;

        parameters = routeParams.parameters;
        delete routeParams.parameters;

        if (parameters) {
            // If the parameters are passed but no controller or no action then set defaults
            if (!controller) {
                controller = ActionUrlResolver._DEFAULT_CONTROLLER_NAME;
            }

            if (!action) {
                action = ActionUrlResolver._DEFAULT_ACTION_NAME;
            }
        }

        if (controller) {
            urlParts.push(encodeURIComponent(controllerPrefix + controller));

            if (action) {
                urlParts.push(encodeURIComponent(action));

                if (parameters) {
                    if ($.isArray(parameters)) {
                        urlParts.push.apply(urlParts, $.map(parameters, encodeURIComponent));
                    }
                    else {
                        urlParts.push(encodeURIComponent(parameters));
                    }
                }
            }
        }

        if (routeParams.includeVersion || area === ActionUrlResolver._API) {
            routeParams[ActionUrlResolver._VERSION] = pageContext.webAccessConfiguration.api.webApiVersion;
        }

        if (routeParams.includeLanguage && VSS.uiCulture) {
            routeParams[ActionUrlResolver._LANGUAGE] = VSS.uiCulture;
        }

        delete routeParams.includeVersion;

        // Add on client host query parameter if previously specified
        if (routeParams.area !== ActionUrlResolver._API && pageContext.webAccessConfiguration.clientHost) {
            routeParams[ActionUrlResolver._CLIENTHOST] = pageContext.webAccessConfiguration.clientHost;
        }

        queryString = $.param(routeParams);

        return urlParts.join("/") + (queryString ? ("?" + queryString) : "");
    }

    private static _shouldBuildApiUrl(routeArea: any, routeParams: any): boolean {
        var area: string;

        if (routeArea) {
            // Area definitions might be arrays, in that case check the first one
            if ($.isArray(routeArea)) {
                area = routeArea[0];
            } else {
                area = routeArea;
            }
        }

        // If an API url is explicitly requested, 
        // or the area is a an API area and an API url has not been explicitly prohibited
        return routeParams.useApiUrl
            || (area === ActionUrlResolver._API && (typeof (routeParams.useApiUrl) === "undefined" || routeParams.useApiUrl));
    }

    private static _DEFAULT_CONTROLLER_NAME = "home";
    private static _DEFAULT_ACTION_NAME = "index";
    private static _CLIENTHOST = "clientHost";
    private static _VERSION = "__v";
    private static _LANGUAGE = "__loc";
    private static _PERMALINK_PREFIX = "_permalink";

    private static _API = "api";
}

export class AccessibilityHelper {
    public static triggerClickOnEnterPress(event: JQueryEventObject): boolean {
        if (AccessibilityHelper.isEnterKeyPressEvent(event)) {
            $(event.target).click();
            event.preventDefault();
            return false;
        }

        return true;
    }

    public static triggerClickOnEnterOrSpaceKeyPress(event: JQueryEventObject): boolean {
        if (AccessibilityHelper.isEnterKeyPressEvent(event) || AccessibilityHelper.isSpaceKeyPressEvent(event)) {
            $(event.target).click();
            event.preventDefault();
            return false;
        }

        return true;
    }

    private static isEnterKeyPressEvent(event: JQueryEventObject): boolean {
        if (!event) {
            return false;
        }

        var keycode = (event.keyCode) ? event.keyCode : event.which;
        if (keycode === Utils_UI.KeyCode.ENTER) {
            return true;
        }

        return false;
    }

    private static isSpaceKeyPressEvent(event: JQueryEventObject): boolean {
        if (!event) {
            return false;
        }

        var keycode = (event.keyCode) ? event.keyCode : event.which;
        if (keycode === Utils_UI.KeyCode.SPACE) {
            return true;
        }

        return false;
    }
}

export class VariableExtractor {
    public static extractVariables(
        key: string,
        value: string, sourceInputDefinition: DistributedTaskContracts.TaskInputDefinition,
        selector: (variableName: string) => boolean = null): DistributedTaskContracts.TaskInputDefinition[] {

        var extractedVariables: DistributedTaskContracts.TaskInputDefinition[] = [];

        if (value !== null && value !== undefined) {

            var regex = new RegExp("\\$\\([^()]+\\)", "g");

            var result: string[] = value.match(regex);

            if (result) {
                result.forEach((variable: string) => {
                    //remove decoration. $(abc) => abc
                    var variableName = variable.substr(2, variable.length - 3);

                    var selected: boolean = true;
                    if (selector) {
                        selected = selector(variableName);
                    }

                    if (selected) {
                        extractedVariables.push(<DistributedTaskContracts.TaskInputDefinition>{
                            defaultValue: "",
                            groupName: null,
                            helpMarkDown: "",
                            label: variableName,
                            name: variableName,
                            options: {},
                            properties: {},
                            required: true,
                            type: "string",
                            visibleRule: null
                        });
                    }
                });
            }

            // Preserve data type if field contain only one variable
            // Make sure that the field contains only the variable. If it is appended to something, type cannot be preserved
            if (extractedVariables.length === 1 && Utils_String.localeComparer(value.trim(), result[0]) === 0 && sourceInputDefinition) {
                extractedVariables[0].type = sourceInputDefinition.type;
                extractedVariables[0].defaultValue = sourceInputDefinition.defaultValue;
                extractedVariables[0].helpMarkDown = sourceInputDefinition.helpMarkDown;
                extractedVariables[0].options = sourceInputDefinition.options;
                extractedVariables[0].properties = sourceInputDefinition.properties;

                if (extractedVariables[0].name === value) {
                    extractedVariables[0].defaultValue = sourceInputDefinition.defaultValue;
                }
            }
        }

        return extractedVariables;
    }

    public static containsVariable(data: string): boolean {
        var regex = new RegExp("\\$\\([\\w\\.]+\\)", "g");
        return regex.test(data);
    }

    public static normalizeVariableTypeInfo(inputDefinitions: DistributedTaskContracts.TaskInputDefinition[], variable: DistributedTaskContracts.TaskInputDefinition): void {
        var existingMetaTaskInput = Utils_Array.first(inputDefinitions, (serachVariable: DistributedTaskContracts.TaskInputDefinition) => {
            return serachVariable.name === variable.name;
        });

        if (existingMetaTaskInput.type !== variable.type) {
            existingMetaTaskInput.type = "string";
            existingMetaTaskInput.helpMarkDown = "";
            existingMetaTaskInput.options = {};
            existingMetaTaskInput.properties = {};
        }

        existingMetaTaskInput.groupName = "";
    }
}

export class DataSourceBindingUtils {
    public static clone(bindings: ServiceEndpointContracts.DataSourceBinding[]): ServiceEndpointContracts.DataSourceBinding[] {
        return $.map(bindings, (dataSourceBinding: ServiceEndpointContracts.DataSourceBinding) => {
            var clonedBinding: ServiceEndpointContracts.DataSourceBinding = {
                dataSourceName: dataSourceBinding.dataSourceName,
                endpointId: dataSourceBinding.endpointId,
                parameters: {},
                resultTemplate: dataSourceBinding.resultTemplate,
                target: dataSourceBinding.target,
                endpointUrl: dataSourceBinding.endpointUrl,
                resultSelector: dataSourceBinding.resultSelector,
                headers: dataSourceBinding.headers,
                callbackContextTemplate: dataSourceBinding.callbackContextTemplate,
                callbackRequiredTemplate: dataSourceBinding.callbackRequiredTemplate,
                initialContextTemplate: dataSourceBinding.initialContextTemplate
            };

            clonedBinding.parameters = $.extend(true, {}, dataSourceBinding.parameters);

            return clonedBinding;
        });
    }

    public static updateVariables(
        bindings: ServiceEndpointContracts.DataSourceBinding[],
        originalInputDefinition: DistributedTaskContracts.TaskInputDefinition,
        updatedInputDefinition: DistributedTaskContracts.TaskInputDefinition): void {

        bindings.forEach((binding: ServiceEndpointContracts.DataSourceBinding) => {
            if (binding.target === originalInputDefinition.name) {
                binding.target = updatedInputDefinition.name;
            }

            var decoratedSourceName: string = "$(" + originalInputDefinition.name + ")";
            var decoratedNewName: string = "$(" + updatedInputDefinition.name + ")";

            binding.endpointId = binding.endpointId.replace(decoratedSourceName, decoratedNewName);
        });
    }

    public static merge(data1: ServiceEndpointContracts.DataSourceBinding[], data2: ServiceEndpointContracts.DataSourceBinding[]): ServiceEndpointContracts.DataSourceBinding[] {
        var mergedData: ServiceEndpointContracts.DataSourceBinding[] = [];

        mergedData = Utils_Array.clone(data1);

        data2.forEach((bindingToMerge: ServiceEndpointContracts.DataSourceBinding) => {
            if (!DataSourceBindingUtils.contains(bindingToMerge, data1)) {
                mergedData.push(bindingToMerge);
            }
        });

        return mergedData;
    }

    public static contains(itemToSearch: ServiceEndpointContracts.DataSourceBinding, itemList: ServiceEndpointContracts.DataSourceBinding[]): boolean {
        var item: ServiceEndpointContracts.DataSourceBinding = Utils_Array.first(itemList, (searchItem: ServiceEndpointContracts.DataSourceBinding) => {
            return DataSourceBindingUtils.isEqual(itemToSearch, searchItem);
        });

        return !!item;
    }

    public static isEqual(binding1: ServiceEndpointContracts.DataSourceBinding, binding2: ServiceEndpointContracts.DataSourceBinding): boolean {
        if (binding1.dataSourceName !== binding2.dataSourceName ||
            binding1.endpointId !== binding2.endpointId ||
            binding1.target !== binding2.target) {
            return false;
        }

        return true;
    }
}

export class SecurityHelper {
    private static _securityClient: Security_Client.SecurityHttpClient;
    private static _poolSecurityClient: Security_Client.SecurityHttpClient;
    private static _serviceInstanceId: string = WebApi_Constants.ServiceInstanceTypes.TFS;
    private static _dteSecurityNamespaceId: string = "101EAE8C-1709-47F9-B228-0E476C35B3BA";
    private static _endpointsSecurityNamespaceId: string = "49B48001-CA20-4ADC-8111-5B60C903A50C";
    private static _agentPoolToken: string = "AgentPools";
    private static _agentQueueToken: string = "AgentQueues";
    private static _serviceEndpointToken: string = "endpoints";
    private static _namespaceSeparator: string = "/";

    public static hasAgentPoolPermission(poolId: number, permission: number): IPromise<boolean> {
        var securityClient = SecurityHelper.getPoolSecurityClient();
        var token = SecurityHelper._getSecurityToken(SecurityHelper._agentPoolToken, Utils_String.empty, poolId ? poolId.toString() : Utils_String.empty);

        return SecurityHelper._hasPermission(securityClient, SecurityHelper._dteSecurityNamespaceId, permission, token);
    }

    public static hasAgentQueuePermission(projectId: string, queueId: number, permission: number): IPromise<boolean> {
       var securityClient = SecurityHelper.getDefaultSecurityClient();
       var token = SecurityHelper._getSecurityToken(SecurityHelper._agentQueueToken, projectId, queueId ? queueId.toString() : Utils_String.empty);

        return SecurityHelper._hasPermission(securityClient, SecurityHelper._dteSecurityNamespaceId, permission, token);
    }

    public static hasServiceEndpointPermission(projectId: string, epId: string, permission: number): IPromise<boolean> {
        var securityClient = SecurityHelper.getDefaultSecurityClient();
        var token = SecurityHelper._getSecurityToken(SecurityHelper._serviceEndpointToken, projectId, epId);

        return SecurityHelper._hasPermission(securityClient, SecurityHelper._endpointsSecurityNamespaceId, permission, token);
    }

    private static _hasPermission(securityClient: Security_Client.SecurityHttpClient, securityNamespaceId: string, permission: number, token: string): IPromise<boolean> {
        var defer = Q.defer<boolean>();

        securityClient.hasPermissions(securityNamespaceId, permission, token).then((hasPermissions: boolean[]) => {
            defer.resolve(hasPermissions[0]);
        },
            (error: any) => {
                // Permission couldn't be determined, fallback to default true to avoid any blocking of UI.
                defer.resolve(true);
            });

        return defer.promise;
    }

    private static _getSecurityToken(prefix: string, projectId: string, resourceId: string): string {
        var token = prefix;

        if (projectId && !Utils_String.equals(projectId, Utils_String.empty)) {
            token = token.concat(SecurityHelper._namespaceSeparator, projectId);
        }

        if (resourceId && !Utils_String.equals(resourceId, Utils_String.empty)) {
            token = token.concat(SecurityHelper._namespaceSeparator, resourceId);
        }

        return token;
    }

    private static getDefaultSecurityClient(): Security_Client.SecurityHttpClient {
        if (!SecurityHelper._securityClient) {
            SecurityHelper._securityClient = Service.VssConnection.getConnection().getHttpClient(Security_Client.SecurityHttpClient, SecurityHelper._serviceInstanceId);
        }
        return SecurityHelper._securityClient;
    }

    private static getPoolSecurityClient(): Security_Client.SecurityHttpClient {
        if (!SecurityHelper._poolSecurityClient) {
            if (Context.getPageContext().webAccessConfiguration.isHosted) {
                SecurityHelper._poolSecurityClient = SecurityHelper.getDefaultSecurityClient();
            } 
            else {
                SecurityHelper._poolSecurityClient = Service.getApplicationClient<Security_Client.SecurityHttpClient>(Security_Client.SecurityHttpClient, Context.getDefaultWebContext(), SecurityHelper._serviceInstanceId);
            }
        }
        return SecurityHelper._poolSecurityClient;
    }
}

export function isDeprecated(taskDefinition: DistributedTaskContracts.TaskDefinition): boolean {
    return !!taskDefinition && taskDefinition.deprecated === true;
}

export function isPreview(taskDefinition: DistributedTaskContracts.TaskDefinition): boolean {
    return !!taskDefinition && taskDefinition.preview === true;
}

export function getLatestReleasedVersions(allMajorVersions: IDictionaryStringTo<IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition>>): IDictionaryStringTo<DistributedTaskContracts.TaskDefinition> {
    let releasedVersions: IDictionaryStringTo<DistributedTaskContracts.TaskDefinition> = {};

    if (allMajorVersions) {
        for (let taskId in allMajorVersions) {
            // in case all major lineages are in preview
            let latestMajorVersion: number = -1;
            let latestDefinition: DistributedTaskContracts.TaskDefinition;

            let majorVersions = allMajorVersions[taskId];
            if (majorVersions) {
                for (let majorVersionKey in majorVersions) {
                    let majorVersion = parseInt(majorVersionKey);
                    if (latestMajorVersion < majorVersion) {
                        latestMajorVersion = majorVersion;

                        let taskDefinition = majorVersions[majorVersionKey];

                        // exclude preview versions
                        if (!isPreview(taskDefinition)) {
                            latestDefinition = taskDefinition;
                        }
                    }
                }
            }

            if (!latestDefinition && latestMajorVersion > -1) {
                latestDefinition = majorVersions[latestMajorVersion];
            }

            if (latestDefinition) {
                releasedVersions[taskId] = latestDefinition;
            }
        }
    }

    return releasedVersions;
}

export function getMajorVersionSpec(version: DistributedTaskContracts.TaskVersion): string {
    if (!version) {
        return "*";
    }
    else {
        let versionSpecFormat = "{0}.*";
        if (version.isTest) {
            versionSpecFormat = Utils_String.format("{0}-test", versionSpecFormat);
        }

        return Utils_String.format(versionSpecFormat, version.major);
    }
}

export function getMajorVersion(versionSpec: string): number {
    if (!versionSpec || versionSpec === "*") {
        return -1;
    }
    else {
        return parseInt(versionSpec.substring(0, versionSpec.indexOf(".")));
    }
}

export function getLatestVersion(versions: IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition>): DistributedTaskContracts.TaskDefinition {
    if (!versions) {
        return null;
    }

    let versionNumbers: number[] = [];
    for (let version of Object.keys(versions)) {
        versionNumbers.push(parseInt(version));
    }
    versionNumbers = versionNumbers.sort();

    return versions[versionNumbers[versionNumbers.length - 1]];
}

export function getTaskDefinition(versions: IDictionaryNumberTo<DistributedTaskContracts.TaskDefinition>, versionSpec: string): DistributedTaskContracts.TaskDefinition {
    if (!versions) {
        return null;
    }

    versionSpec = versionSpec || "*";
    if (versionSpec === "*") {
        return getLatestVersion(versions);
    }
    else {
        let result = versions[getMajorVersion(versionSpec)];
        if (!result) {
            result = getLatestVersion(versions);
        }

        return result;
    }
}

export function getTaskGroupInstanceNameFormat(taskGroupName: string, taskGroupInputs: DistributedTaskContracts.TaskInputDefinition[]): string {
    return Utils_String.localeFormat(TaskResources.MetataskInstanceNameFormat, taskGroupName, (taskGroupInputs && taskGroupInputs.length ? '$(' + taskGroupInputs[0].name + ')' : ''))
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Utils", exports);

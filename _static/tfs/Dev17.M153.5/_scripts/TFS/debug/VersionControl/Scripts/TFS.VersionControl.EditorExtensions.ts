import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contributions_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import HubsService = require("VSS/Navigation/HubsService");
import Q = require("q");
import { IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface ContextMenuItemClickEventArgs {
    contextMenuItemId: string;
    dataForAction: any;
}

/**
 * Represents monaco editor's keybinding interface
 */
export interface IEditorKeybinding {
    ctrlCmd?: boolean;
    shift?: boolean;
    alt?: boolean;
    winCtrl?: boolean;
    key: string;
    chord?: IEditorKeybinding;
}

/**
* Monaco editor interface to specify when to enable a context menu item.
*/
export interface IEditorActionEnablement {
    textFocus?: boolean;
    widgetFocus?: boolean;
    writeableEditor?: boolean;
    tokensAtPosition?: string[];
    wordAtPosition?: boolean;
}

/**
*  Monaco editor IActionDescriptor for context menu items.
*/
export interface IEditorActionDescriptor {
    id: string;
    label: string;
    keybindings?: IEditorKeybinding[];
    contextMenuGroupId?: string;
    enablement?: IEditorActionEnablement;
}

export class ContextMenuItemExtension {
    public static EVENT_CONTEXT_MENU_ITEM_CLICKED = "context-menu-item-clicked";
    public static EDITOR_ADD_CONTEXT_MENU_ITEM = "vc-editor-add-context-menu-item";
    public static EDITOR_CREATED = "vc-extensionhost-created";

    public static bindContextMenuItems(fileViewer: any): void {
        // unbind before binding to avoid multiple callbacks
        // bind to "context menu item" click event.
        // get the text under cursor/selection and fire a search with selection as the search text.
        fileViewer._unbind(ContextMenuItemExtension.EVENT_CONTEXT_MENU_ITEM_CLICKED)
            ._bind(ContextMenuItemExtension.EVENT_CONTEXT_MENU_ITEM_CLICKED, (sender: any, args: ContextMenuItemClickEventArgs) => {
                if (SearchContextMenuItemExtension.isSearchContextMenuItemClicked(args)) {
                    // perform search action
                    SearchContextMenuItemExtension.searchContextMenuItemClickAction(args);
                }
            });
    }

    /**
    * Adds the required menu items in the context menu pop-up.
    */
    public static addContextMenuItems(fileViewer: any): void {
        fileViewer._bind(ContextMenuItemExtension.EDITOR_CREATED, (sender: any, args: any) => {
            SearchContextMenuItemExtension.getSearchContextMenuItems().done((searchContextMenuItems) => {
                args.extensionHost.postMessage(ContextMenuItemExtension.EDITOR_ADD_CONTEXT_MENU_ITEM, { contextMenuItems: searchContextMenuItems });
            });
        });
    }
}

class SearchContextMenuItemExtension {
    // various constants
    private static CONTROLLER_NAME: string = "search";
    private static ACTION_NAME: string = "search";
    private static PROVIDER_ID_PARAMETER_NAME: string = "type";
    private static SEARCH_TEXT_PARAMETER_NAME: string = "text";
    private static CODE_ENTITY_TYPE_NAME: string = "Code";
    private static PROJECT_FILTERS: string = "ProjectFilters";
    private static FILTER_VALUE_START = "{";
    private static FILTER_VALUE_END = "}";
    private static SEARCH_FILTERS_PARAMETER_NAME: string = "filters";
    private static SEARCH_TRIGGERED_FROM_CODEHUB_RIGHTCLICK: string = "trigger"
    private static CODESEARCH_CONTEXT_MENU_ITEM_ID: string = "72802cd9-9396-4276-9059-8c5e227cd8be";
    private static CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID: string = "ada3e19f-82ea-47a9-9585-e4ac3088b9e1";
    private static CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID: string = "08350060-51be-4155-9297-58633a8200e1";
    private static SEARCH_CODE_ENTITY_CONTRIBUTION = "ms.vss-code-search.code-entity-type";
    private static SEARCH_COLLECTION_HUB_GROUPID = "ms.vss-search-platform.search-hidden-collection-hub-group";
    private static SEARCH_PROJECT_HUB_GROUPID = "ms.vss-search-platform.search-hidden-project-hub-group";

    /**
    * Creates a codesearch specific action item to be shown in the monaco editor pop up on right-click.
    * To not pull any Search related dependencies, parts of code from TFS.Search.Controls.ContextMenuItemExtension is being duplicated here.
    */
    public static getSearchContextMenuItems(): Q.Promise<Array<IEditorActionDescriptor>> {
        let searchContextMenuItems: Array<IEditorActionDescriptor> = new Array<IEditorActionDescriptor>();
        let deferred: Q.Deferred<Array<IEditorActionDescriptor>> = Q.defer<Array<IEditorActionDescriptor>>();
        Service.getService(Contributions_Services.ExtensionService).getContributions([SearchContextMenuItemExtension.SEARCH_CODE_ENTITY_CONTRIBUTION], true, false).then((contributions: IExtensionContribution[]) => {

            // show code search context menu item if "Search" feature is enabled or "Search extension is installed" and the current project is a "git" project.
            if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchShell)
                || contributions.length > 0) {

                // Push menu item for "search"
                searchContextMenuItems.push(SearchContextMenuItemExtension._getActionDescriptor(
                    SearchContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID,
                    VCResources.ContextMenuCodeSearchToTextLabel,
                    "1_codesearch/1_termsearch",
                    null));

                searchContextMenuItems.push(SearchContextMenuItemExtension._getActionDescriptor(
                    SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID,
                    VCResources.ContextMenuCodeSearchToDefinitionLabel,
                    "1_codesearch/2_definitionsearch",
                    ["identifier"]));

                searchContextMenuItems.push(SearchContextMenuItemExtension._getActionDescriptor(
                    SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID,
                    VCResources.ContextMenuCodeSearchToReferenceLabel,
                    "1_codesearch/3_referencesearch",
                    ["identifier"]));
            }

            deferred.resolve(searchContextMenuItems);
        }, (error: any) => { deferred.reject(error); });

        return deferred.promise;
    }

    /**
    * Executes when "search" context menu item is clicked. This opens up a new window to display code search results.
    */
    public static searchContextMenuItemClickAction(args: ContextMenuItemClickEventArgs): void {
        let searchText: string = args.dataForAction.textUnderCursorOrSelection || "";

        searchText = $.trim(searchText);

        if (searchText !== "") {
            const hubsService = <HubsService.HubsService>Service.getLocalService(HubsService.HubsService);
            const selectedHubGroupId: string = hubsService.getSelectedHubGroupId();
            const context = TFS_Host_TfsContext.TfsContext.getDefault();

            if (selectedHubGroupId === SearchContextMenuItemExtension.SEARCH_COLLECTION_HUB_GROUPID ||
                selectedHubGroupId === SearchContextMenuItemExtension.SEARCH_PROJECT_HUB_GROUPID) {
                const newParams = Navigation_Services.getHistoryService().getCurrentState();
                newParams.text = SearchContextMenuItemExtension._getSearchText(searchText, args.contextMenuItemId);
                Navigation_Services.getHistoryService().addHistoryPoint(null, newParams, undefined, false, false);
            }
            else {
                let contextFilters: string = null;
                if (context.navigation.project && context.navigation.project !== "") {
                    let projectName: string = context.navigation.project;
                    contextFilters = SearchContextMenuItemExtension.PROJECT_FILTERS + SearchContextMenuItemExtension.FILTER_VALUE_START + projectName + SearchContextMenuItemExtension.FILTER_VALUE_END;
                }

                const urlParams = {
                    type: SearchContextMenuItemExtension.CODE_ENTITY_TYPE_NAME,
                    text: SearchContextMenuItemExtension._getSearchText(searchText, args.contextMenuItemId),
                    filters: contextFilters
                };
                // log telemetry data
                SearchContextMenuItemExtension._logTelemetryInformation(
                    args.contextMenuItemId);

                // route to search controller.
                const url = `${context.getPublicActionUrl("", "search", urlParams as IRouteData)}`;

                // show the results on the same page. As opening a window presents user with a pop-up having a warning message.
                window.location.href = url;
            }
        }
    }

    public static isSearchContextMenuItemClicked(args: ContextMenuItemClickEventArgs) {
        return args.contextMenuItemId === SearchContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID ||
            args.contextMenuItemId === SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID ||
            args.contextMenuItemId === SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID
    }

    private static _getSearchText(text: string, eventId: string): string {
        let searchText: string = "";
        // Search text should be treated as phrase
        text = "\"".concat(text).concat("\"");

        switch (eventId) {
            case SearchContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID:
                searchText = text;
                break;

            case SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID:
                searchText = "def:".concat(text);
                break;

            case SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID:
                searchText = "ref:".concat(text);
                break;

            // controll will never reach to default case
            // as we check if the context item clicked is a search related context menu item.
            default:
                break;
        }

        return searchText;
    }

    private static _logTelemetryInformation(eventId: string): void {
        let actionName: string = "";

        switch (eventId) {
            case SearchContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID:
                actionName = "TermSearchContextMenuItemAction";
                break;

            case SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID:
                actionName = "DefinitionSearchContextMenuItemAction";
                break;

            case SearchContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID:
                actionName = "ReferencesSearchContextMenuItemAction";
                break;

            // controll will never reach to default case
            // as we check if the context item clicked is a search related context menu item.
            default:
                break;
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData("webaccess.search", "CodeSearchPortal", {
            actionName: actionName
        }));
    }

    private static _getActionDescriptor(
        id: string,
        label: string,
        contextMenuGroupId: string,
        tokensAtPosition: string[]): IEditorActionDescriptor {
        let defaultEnablement: IEditorActionEnablement = <IEditorActionEnablement>{
            // The action is enabled only if text in the editor is focused (e.g. blinking cursor).
            textFocus: true,
            // The action is enabled only if the cursor position is over a word(i.e.not whitespace).
            wordAtPosition: true,
            // The action is enabled only if the cursor position is over a token e.g. a keyword or an identifier.
            tokensAtPosition: tokensAtPosition
        }

        return <IEditorActionDescriptor>{
            id: id,
            label: label,
            contextMenuGroupId: contextMenuGroupId,
            enablement: defaultEnablement
        }
    }
}

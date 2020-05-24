// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import VCEditorExtension = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");

export class ContextMenuItemExtension extends Controls.BaseControl {
    private static CODESEARCH_CONTEXT_MENU_ITEM_ID: string = "1bc42de4-cf5d-4150-92a5-6c15632df216";
    private static CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID: string = "c56d675a-f90d-4f53-b1a3-dbfc21e1ef4c";
    private static CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID: string = "f2bdd794-b101-43fd-a8a7-21a4a948c15a";

    // can be diff viewer or annotated file viewer.
    private _fileViewer: any;

    constructor(viewer: any, options?) {
        super(options);
        this._fileViewer = viewer;
    }

    /**
    * Adds the required menu items in the context menu pop-up.
    */
    public static getContextMenuItems(): Array<VCEditorExtension.IEditorActionDescriptor> {
        // populate context menu items list;
        var contextMenuItems: Array<VCEditorExtension.IEditorActionDescriptor> = new Array<VCEditorExtension.IEditorActionDescriptor>();
               
        // Push menu item for "search"
        contextMenuItems.push(ContextMenuItemExtension.getActionDescriptor(
            ContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID,
            Search_Resources.ContextMenuCodeSearchToTextLabel,
            "1_codesearch/1_termsearch",
            null));

        contextMenuItems.push(ContextMenuItemExtension.getActionDescriptor(
            ContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID,
            Search_Resources.ContextMenuCodeSearchToDefinitionLabel,
            "1_codesearch/2_definitionsearch",
            ["identifier"]));

        contextMenuItems.push(ContextMenuItemExtension.getActionDescriptor(
            ContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID,
            Search_Resources.ContextMenuCodeSearchToReferenceLabel,
            "1_codesearch/3_referencesearch",
            ["identifier"]));

        return contextMenuItems;
    }

    public bindContextMenuItems(): void { 
        
        // unbind before binding to avoid multiple callbacks
        // bind to "context menu item" click event.
        // get the text under cursor/selection and fire a search with selection as the search text.
        this._fileViewer._unbind(VCEditorExtension.ContextMenuItemExtension.EVENT_CONTEXT_MENU_ITEM_CLICKED)
            ._bind(VCEditorExtension.ContextMenuItemExtension.EVENT_CONTEXT_MENU_ITEM_CLICKED, (sender: any, args: VCEditorExtension.ContextMenuItemClickEventArgs) => {
            this.tryPerformSearchAction(args);
        });
    }

    private static getActionDescriptor(id: string, label: string, contextMenuGroupId: string, tokensAtPosition: string[]): VCEditorExtension.IEditorActionDescriptor {
        var defaultEnablement: VCEditorExtension.IEditorActionEnablement = <VCEditorExtension.IEditorActionEnablement> {
            // The action is enabled only if text in the editor is focused (e.g. blinking cursor).
            textFocus: true,
            // The action is enabled only if the cursor position is over a word(i.e.not whitespace).
            wordAtPosition: true,
            // The action is enabled only if the cursor position is over a token e.g. a keyword or an identifier.
            tokensAtPosition: tokensAtPosition
        }

        return <VCEditorExtension.IEditorActionDescriptor> {
            id: id,
            label: label,
            contextMenuGroupId: contextMenuGroupId,
            enablement: defaultEnablement
        }
    }

    private tryPerformSearchAction(args: VCEditorExtension.ContextMenuItemClickEventArgs): void {
        var searchText: string = args.dataForAction.textUnderCursorOrSelection || "",
            actionName: string = "",
            context = Context.SearchContext.getDefaultContext();

        searchText = $.trim(searchText);

        if (searchText !== "") {
            switch (args.contextMenuItemId) {
                case ContextMenuItemExtension.CODESEARCH_CONTEXT_MENU_ITEM_ID:
                    actionName = "TermSearchContextMenuItemAction";
                    break;

                case ContextMenuItemExtension.CODESEARCH_SEARCH_FOR_DEFINITION_CONTEXT_MENU_ITEM_ID:
                    searchText = "def:".concat(searchText);
                    actionName = "DefinitionSearchContextMenuItemAction";
                    break;

                case ContextMenuItemExtension.CODESEARCH_SEARCH_FOR_REFERENCES_CONTEXT_MENU_ITEM_ID:
                    searchText = "ref:".concat(searchText);
                    actionName = "ReferencesSearchContextMenuItemAction";
                    break;

                // if no search actions is clicked just return(no op)
                default: 
                    return;
            }

            // log telemetry data
            TelemetryHelper.TelemetryHelper.traceLog({
                searchOnRightClick: true,
                actionName: actionName,
                controller: context.navigation.currentController
            });

            Search_Helpers.Utils.createNewSearchRequestState(searchText, "Code");
        }
    }
}

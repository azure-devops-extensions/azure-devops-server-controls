// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Search_ContextMenuItemExtension = require("Search/Scripts/Providers/Code/Viewer/TFS.Search.Controls.ContextMenuItemExtension");
import Utils_Core = require("VSS/Utils/Core");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCDiffViewer = require("VersionControl/Scripts/Controls/DiffViewer");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

var delegate = Utils_Core.delegate;

export class DiffViewer extends Navigation.NavigationViewTab {
    private _diffViewer: VCDiffViewer.DiffViewer;
    private _contextMenuItemExtension: Search_ContextMenuItemExtension.ContextMenuItemExtension;

    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();

        this._diffViewer = <VCDiffViewer.DiffViewer>Controls.BaseControl.createIn(VCDiffViewer.DiffViewer, this._element, {
            tfsContext: Context.SearchContext.getTfsContext(),
            contextMenuItems: Search_ContextMenuItemExtension.ContextMenuItemExtension.getContextMenuItems()
        });

        this._contextMenuItemExtension = new Search_ContextMenuItemExtension.ContextMenuItemExtension(this._diffViewer);
        this._contextMenuItemExtension.bindContextMenuItems();

        this._diffViewer._bind("diff-menu-annotate-triggered", (sender: any, data: any) => {
            Navigation_Services.getHistoryService().addHistoryPoint(VCControlsCommon.VersionControlActionIds.Contents, {
                annotate: "true"
            });
        });
    }

    public onNavigate(rawState: any, parsedState: any) {
        parsedState.repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
            this._diffViewer.setActiveState(true, true);
            this._diffViewer.setChangeListNavigator(parsedState.changeListNavigator);

            this._diffViewer.setOrientation(preferences.diffViewerOrientation, false);
            this._diffViewer.setDiscussionManager(parsedState.discussionManager);

            this._diffViewer.diffItems(parsedState.repositoryContext, parsedState.item, rawState.oversion, rawState.mversion, rawState.opath, rawState.mpath, null, delegate(this, (error) => {
                this._options.navigationView.showError(error);
                return true;
            }));
        });
    }

    public onNavigateAway() {
        this._diffViewer.setActiveState(false);
    }
}

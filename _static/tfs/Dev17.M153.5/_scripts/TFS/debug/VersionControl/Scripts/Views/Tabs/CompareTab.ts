/// <reference types="jquery" />

import Q = require("q");

import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import VCEditorExtension = require("VersionControl/Scripts/TFS.VersionControl.EditorExtensions");
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import _VCDiffViewer = require("VersionControl/Scripts/Controls/DiffViewer");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";

import delegate = Utils_Core.delegate;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class CompareTab extends Navigation.NavigationViewTab {

    private _diffViewer: Q.Promise<_VCDiffViewer.DiffViewer>;

    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();
        
        this._diffViewer = Q.Promise<_VCDiffViewer.DiffViewer>((resolve, reject) => {
            VSS.using(["VersionControl/Scripts/Controls/DiffViewer"], (VCDiffViewer: typeof _VCDiffViewer) => {
                let tfsContext = this._options.tfsContext || TfsContext.getDefault();
                let diffViewer = <_VCDiffViewer.DiffViewer>Controls.BaseControl.createIn(VCDiffViewer.DiffViewer, this._element, {
                    tfsContext: tfsContext,
                    disableDownloadFile: this._options.disableDownloadFile,
                    disableAnnotate: this._options.disableAnnotate,
                });

                VCEditorExtension.ContextMenuItemExtension.addContextMenuItems(diffViewer);
                VCEditorExtension.ContextMenuItemExtension.bindContextMenuItems(diffViewer);

                diffViewer._bind("diff-menu-annotate-triggered", (sender: any, data: any) => {
                    Navigation_Services.getHistoryService().addHistoryPoint(VCControlsCommon.VersionControlActionIds.Contents, {
                        annotate: "true"
                    });
                });
                
                resolve(diffViewer);
            });
        });
    }

    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        CustomerIntelligenceData.publishFirstTabView("CompareTab", parsedState, this._options);
        Diag.logTracePoint('TFS.VersionControl.View.VersionControlChangeListView.VersionControlCompareTab.Selected');
        
        parsedState.repositoryContext.getClient().beginGetUserPreferences((preferences: VCWebAccessContracts.VersionControlUserPreferences) => {
            this._diffViewer.then(diffViewer => {
                diffViewer.setActiveState(true, true);
                diffViewer.setChangeListNavigator(parsedState.changeListNavigator);

                diffViewer.setOrientation(preferences.diffViewerOrientation, false);
                diffViewer.setDiscussionManager(parsedState.discussionManager);

                diffViewer.diffItems(parsedState.repositoryContext, parsedState.item, rawState.oversion, rawState.mversion, rawState.opath, rawState.mpath, this._options.scenarioComplete, delegate(this,(error) => {
                    this._options.navigationView.showError(error);
                    return true;
                }));
            });
        });
    }

    public onNavigateAway() {
        this._diffViewer.then(diffViewer => {
            diffViewer.setActiveState(false);
        });
    }

    public getDiffViewer(): Q.Promise<_VCDiffViewer.DiffViewer> {
        return this._diffViewer;
    }
}

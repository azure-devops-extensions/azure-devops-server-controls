import CoreDialogs = require("VSS/Controls/Dialogs");
import * as VSS from "VSS/VSS";

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { HistoryCommitPickerDialog } from "VersionControl/Scripts/Controls/HistoryCommitPickerDialog";
import * as _TfvcChangesetsPickerDialog from "VersionControl/Scripts/Controls/TfvcChangesetsPickerDialog";
import * as _TfvcShelveSetsPickerDialog from "VersionControl/Scripts/Controls/TfvcShelveSetsPickerDialog"; 

export module Dialogs {

    export function changesetPicker(options?: any) {
        /// <summary>Displays changeset picker in the dialog</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///     - okCallback (Function): callback function to run after changeset is selected and ok clicked.
        ///       selected changeset id is returned as function argument
        /// </param>
        VSS.using(["VersionControl/Scripts/Controls/TfvcChangesetsPickerDialog"], (ChangesetsPickerDialog: typeof _TfvcChangesetsPickerDialog) => {
            return CoreDialogs.show(ChangesetsPickerDialog.TfvcChangesetsPickerDialog, $.extend({
                title: VCResources.ChangesetPickerDialogTitle,
                myChangesLabel: VCResources.MyChanges,
                allChangesLabel: VCResources.AllChanges,
                linkTarget: "_blank",
                rel: "noopener noreferrer",
                width: 875,
                height: 600
            }, options)); });

    }

    export function commitPicker(options?: any) {
        /// <summary>Displays commit picker in the dialog</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///     - okCallback (Function): callback function to run after changeset is selected and ok clicked.
        ///       selected changeset id is returned as function argument
        /// </param>
        return CoreDialogs.show(HistoryCommitPickerDialog, $.extend({
            title: VCResources.CommitPickerDialogTitle,
            showBranches: true,
            myChangesLabel: VCResources.MyCommits,
            allChangesLabel: VCResources.AllCommits,
            filterOptions: {
                repositoryContext: options.repositoryContext || null,
                path: options.path || ""
            },
            linkTarget: "_blank",
            rel: "noopener noreferrer",
            width: 912,
            height: 600
        }, options));
    }

    export function shelvesetPicker(options?: any) {
        /// <summary>Displays shelveset picker in the dialog</summary>
        /// <param name="options" type="Object">Following options are supported:
        ///     - okCallback (Function): callback function to run after shelveset is selected and ok clicked.
        ///       selected shelveset info is return as the following format: {shelveset-name};{owner}
        /// </param>

        VSS.using(["VersionControl/Scripts/Controls/TfvcShelveSetsPickerDialog"], (ShelveSetsPickerDialog: typeof _TfvcShelveSetsPickerDialog) => {
            return CoreDialogs.show(ShelveSetsPickerDialog.TfvcShelveSetsPickerDialog, $.extend({
                title: VCResources.ShelvesetPickerDialogTitle,
                linkTarget: "_blank",
                rel: "noopener noreferrer",
                width: 870,
                height: 600
            }, options));
        })
    }
}

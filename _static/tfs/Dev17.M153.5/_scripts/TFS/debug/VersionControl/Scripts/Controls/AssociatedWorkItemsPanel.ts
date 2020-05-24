import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Panels = require("VSS/Controls/Panels");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import WorkItemDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import domElem = Utils_UI.domElem;

export interface Options {
    repositoryContext: RepositoryContext;
    versionSpec: VCSpecs.VersionSpec;
    collapsiblePanelOptions?: Panels.ICollapsiblePanelOptions;
}

export class Panel extends Controls.Control<Options> {
    private _panel: Panels.CollapsiblePanel;

    public _options: Options;

    constructor(options?: Options) {
        super(options);
    }

    public initializeOptions(options?: Options) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-associated-work-items-panel"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._populate();
    }

    private _createPanel() {
        const collapsiblePanelOptions = $.extend({
            cssClass: "collapsible-section",
            collapsed: false
        }, this._options.collapsiblePanelOptions);
        this._panel = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this.getElement(), collapsiblePanelOptions);
    }

    private _populate() {
        const versionSpec = this._options.versionSpec;
        const repositoryContext = this._options.repositoryContext;

        if (versionSpec) {
            repositoryContext.getClient().beginGetAssociatedWorkItemsPromise(repositoryContext, [versionSpec.toVersionString()]).then(workItems => {

                if (workItems.length > 0) {

                    const summaryText = workItems.length === 1
                         ? Utils_String.format(VCResources.AssociatedWorkItemFormat, 1)
                         : Utils_String.format(VCResources.AssociatedWorkItemsFormat, workItems.length);

                    const $workItemsContainer = $(domElem("div", "vc-associated-work-items-panel-container"));

                    $.each(workItems, (i, workItem) => {
                        let $workItem;

                        $workItem = $(domElem("div", "associated-work-item")).appendTo($workItemsContainer);
                        $(domElem("a"))
                            .text(Utils_String.format("{0} {1}", workItem.workItemType, workItem.id))
                            .appendTo($workItem)
                            .click(() => {
                                WorkItemDialogShim.showWorkItemById(workItem.id);
                            });

                        $(domElem("span", "work-item-title"))
                            .text(workItem.title || "")
                            .appendTo($workItem);

                        $(domElem("div", "work-item-summary"))
                            .text(workItem.assignedTo ?
                                Utils_String.format(VCResources.WorkItemDetail, workItem.state, workItem.assignedTo) :
                                Utils_String.format(VCResources.WorkItemDetailNotAssigned, workItem.state))
                            .appendTo($workItem);
                    });

                    this._createPanel();
                    this._panel.appendHeaderText(summaryText);
                    this._panel.appendContent($workItemsContainer);
                }
            });
        }
    }
}
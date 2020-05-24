// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Combos = require("VSS/Controls/Combos");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Path_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.PathFilterBase");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Search_Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import OpenDropDownOnFocusCombo_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo");
import TFS_OM_Common_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TreeView_NO_REQUIRE = require("VSS/Controls/TreeView");
import WITOM_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemUtility_NO_REQUIRE = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");

import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {WorkItemConstants} from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

/**
 * Creates an object of OpenDropDownOnFocusCombo control for providing an area path filter for work item search.
 */
export class AreaPathFilterControl extends Path_Filter_Base.PathFilterBase implements Search_Filter_Category_Base.IFilterCategoryBase {
    public static FILTER_CATEGORY_CLEAR_ALL_LINK_CSS_CLASS: string = "filter-category-clear-all-link";

    private static AREA_PATH_FILTER_CONTAINER_CSS_CLASS: string = "work-item-search-area-path-filter";
    private static CONTROL_MAX_WIDTH = 300;

    private _areaPathFilter: OpenDropDownOnFocusCombo_NO_REQUIRE.OpenDropDownOnFocusCombo;
    private _clickHandler: Search_Filter_Base.FilterItemClickHandler;
    private _$areaPathContainer: JQuery;
    private _localSettingsService: Settings.LocalSettingsService;

    constructor() {
        super();
        this._localSettingsService = Service.getLocalService(Settings.LocalSettingsService);
    }

    public initialize(): void {
        super.initialize();
    }

    public drawCategory(filterCategory: Search_Base_Contracts.AreaPathFilterCategory): void {
        var areaPathFilterCategoryCreationTime = Performance.getTimestamp(),
            projectName = filterCategory.projectName;
        this._$areaPathContainer = $(domElem("div")).addClass(AreaPathFilterControl.AREA_PATH_FILTER_CONTAINER_CSS_CLASS);
        var _$clearLink = $(domElem('div')).addClass(AreaPathFilterControl.FILTER_CATEGORY_CLEAR_ALL_LINK_CSS_CLASS)
            .text(Search_Resources.ClearLabel)
            .attr('tabindex', '0')
            .click(delegate(this, (obj: any) => {
                this._clearButtonHandler("ClickAction", projectName, obj);
            }))
            .keydown(delegate(this, (obj: any) => {
                if (obj.keyCode === Utils_UI.KeyCode.SPACE || obj.keyCode === Utils_UI.KeyCode.ENTER) {
                    this._clearButtonHandler("KeyboardAction", projectName, obj);
                }
            })),
            /*
            type: type of the control (defines the behavior of the Combo i.e. the value which is returned by getBehavior())
            change: the delegate provided is called whenever there is a change in the input text.
            onKeyDown: the delegate which is called whenever there is a keyDown event
            */
            comboOptions = <Combos.IComboOptions>{
                type: "treeSearch",
                mode: "drop",
                enabled: true,
                allowEdit: true,
                initialLevel: 2,
                maxAutoExpandDropWidth: AreaPathFilterControl.CONTROL_MAX_WIDTH,
                setTitleOnlyOnOverflow: true,
                noDropButton: false,
                change: delegate(this, this._onChange),
                // Binding the onFilterSelectionChanged (this._clickHandler) event handler to keyDown event of 'Enter' key
                // so as to fire search on key press of Enter when there is valid text in the input.
                // Event handling on other keys is taken care of the by the Combo control's keyDown event handler.
                onKeyDown: delegate(this, (e: JQueryEventObject) => {
                    var isInputEmpty = this._areaPathFilter ? this._areaPathFilter.getText() === Utils_String.empty : false,
                        isValid = this._areaPathFilter.getSelectedIndex() >= 0 || isInputEmpty;
                    if (e.keyCode === Utils_UI.KeyCode.ENTER && isValid) {
                        this._clickHandler(e);
                    }
                }),
                dropOptions: {
                    itemClick: delegate(this, this._onClick)
                }
            };

        this.baseDrawCategory(projectName, Search_Resources.AreaUnderTextFormat.replace("{0}", projectName), this.setExpanded, _$clearLink);
        // Appending _$areaPathContainer to _element even before creating the area path filter so as to avoid a flicker
        // as appending it after the areaPathFilter is created (which is created lazily) causes a flicker in the filters pane.
        this._element.append(this._$areaPathContainer);
        VSS.using(["Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo"],
            delegate(this, (OpenDropDownOnFocusCombo: typeof OpenDropDownOnFocusCombo_NO_REQUIRE) => {
                this._areaPathFilter = <OpenDropDownOnFocusCombo_NO_REQUIRE
                    .OpenDropDownOnFocusCombo>Controls.BaseControl.createIn(
                        OpenDropDownOnFocusCombo.OpenDropDownOnFocusCombo,
                        this._$areaPathContainer,
                        comboOptions);
                this._areaPathFilter.createErrorArea();
                this._areaPathFilter.getElement().attr("spellcheck", "false");
                this._beginPopulateAreaPaths(projectName, areaPathFilterCategoryCreationTime, filterCategory ? filterCategory.areaPath : null);
            }));
    }

    public setSelectionChangedHandler(clickHandler: Search_Filter_Base.FilterItemClickHandler): void {
        this._clickHandler = clickHandler;
    }

    public dispose(): void { }
    public getSelectedFilters(options?: any): Core_Contracts.IFilterCategory {
        if (this._areaPathFilter) {
            var selectedArea = this._areaPathFilter.getInputText();
            return new Core_Contracts.FilterNameValue(WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME, selectedArea);
        }
    }
    public onFilterPaneDomUpdate(data: any): void { }

    protected baseDrawCategory(projectName: string, textOfLabel: string, setExpanded: Function, _$clearLink: JQuery): void {
        super.baseDrawCategory(projectName, textOfLabel, setExpanded, _$clearLink);
    }

    private _beginPopulateAreaPaths(projectName: string, areaPathFilterCategoryCreationTime: number, areaPathFilter: string) {
        VSS.using(["Presentation/Scripts/TFS/TFS.OM.Common",
            "VSS/Controls/TreeView",
            "WorkItemTracking/Scripts/TFS.WorkItemTracking",
            "WorkItemTracking/Scripts/Controls/WorkItemForm/Utils"
        ], delegate(this, (
            TFS_OM_Common: typeof TFS_OM_Common_NO_REQUIRE,
            TreeView: typeof TreeView_NO_REQUIRE,
            WITOM: typeof WITOM_NO_REQUIRE,
            WorkItemUtility: typeof WorkItemUtility_NO_REQUIRE
        ) => {
            // Refer WorkItemClassificationControl.ts
            var _store = TFS_OM_Common.ProjectCollection
                .getConnection(Context.SearchContext.getTfsContext())
                .getService<WITOM_NO_REQUIRE.WorkItemStore>(WITOM.WorkItemStore),
                populateAreaPathsCallback = delegate(this, (selectedProject: WITOM_NO_REQUIRE.Project) => {
                    startTime = Performance.getTimestamp();
                    selectedProject.nodesCacheManager.beginGetNodes().then(() => {
                        TelemetryHelper.TelemetryHelper.traceLog({
                            "BeginGetNodesCallApiE2ETime": Performance.getTimestamp() - startTime,
                            "isSucceeded": true
                        });
                        var areaNodes: TreeView_NO_REQUIRE.TreeNode = WorkItemUtility
                            .populateUINodes(selectedProject
                                .nodesCacheManager
                                .getAreaNode(true), null, 1);
                        areaNodes.text = projectName;
                        this._areaPathFilter.setMode("drop");
                        this._areaPathFilter.setSource([areaNodes]);

                        this._areaPathFilter.setText(areaPathFilter ? areaPathFilter : projectName);
                        this._onChange();
                        TelemetryHelper.TelemetryHelper.traceLog({
                            "CreationOfAreaPathFilterControl": Performance.getTimestamp() - areaPathFilterCategoryCreationTime
                        });
                    }, (error: TfsError) => {
                        this._onChange();
                        TelemetryHelper.TelemetryHelper.traceLog({
                            "BeginGetNodesCallApiE2ETime": Performance.getTimestamp() - startTime,
                            "isSucceeded": false,
                            "projectId": selectedProject.guid
                        });
                    });
                });

            var startTime = Performance.getTimestamp();
            // Get the project info
            _store.beginGetProject(projectName, delegate(this, (selectedProject: WITOM_NO_REQUIRE.Project) => {
                TelemetryHelper.TelemetryHelper.traceLog({
                    "BeginGetProjectCallApiE2ETime": Performance.getTimestamp() - startTime,
                    "isSucceeded": true
                });
                if (Utils_String.ignoreCaseComparer(selectedProject.name, projectName) === 0) {
                    // Get the area path nodes for the specific project
                    populateAreaPathsCallback(selectedProject);
                }
            }), delegate(this, (error) => {
                    this._areaPathFilter.setInvalid(true, Search_Resources.WorkItemSearchInvalidProjectMessage);
                    Utils_Accessibility.announce(Search_Resources.WorkItemSearchInvalidProjectMessage, true);
                TelemetryHelper.TelemetryHelper.traceLog({
                    "BeginGetProjectCallApiE2ETime": Performance.getTimestamp() - startTime,
                    "isSucceeded": false
                });
            }));
        }));
    }

    // Validates the text being given as input to the area path filter.
    private _onChange(): void {
        var isInputEmpty = this._areaPathFilter ? this._areaPathFilter.getText() === Utils_String.empty : false,
            isValid = this._areaPathFilter.getSelectedIndex() >= 0 || isInputEmpty;
        if (isValid) {
            this._areaPathFilter.setInvalid(false);
        }
        else {
            this._areaPathFilter.setInvalid(true, Search_Resources.WorkItemSearchInvalidAreaPathMessage);
            Utils_Accessibility.announce(Search_Resources.WorkItemSearchInvalidAreaPathMessage, true);
        }
    }

    private _onClick(e?, itemIndex?, $target?, $li?): boolean {
        // If the user clicked on the node, executeSearch should be fired hence _clickHandler is being called
        // whereas if the user clicked on the chevron icon the tree should be expanded, hence calling the
        // _onItemClick of ComboTreeDropPopup
        var behavior = this._areaPathFilter.getBehavior<TreeView_NO_REQUIRE.SearchComboTreeBehavior>(),
            isAreaPathNodeClicked = behavior.getDropPopup<TreeView_NO_REQUIRE.ComboTreeDropPopup>()
                ._onItemClick(e, itemIndex, $target, $li);
        if (isAreaPathNodeClicked) {
            TelemetryHelper.TelemetryHelper.traceLog({ "AreaPathNodeClicked": true });
            this._setPreferences(behavior.getDataSource().getItemText(itemIndex));
            this._clickHandler(e);
        }
        return isAreaPathNodeClicked;
    }

    private _setPreferences(value: string): void {
        var context = Context.SearchContext.isAccountOrCollectionContext() ? Settings.LocalSettingsScope.Global : Settings.LocalSettingsScope.Team;

        this._localSettingsService.write(WorkItemConstants.WORK_ITEM_AREA_PATH_FILTER_PREFERENCE_KEY, value, context);
    }

    private _clearButtonHandler(actionPerformed: string, projectName: string, obj: any): void {
        this._areaPathFilter.setInputText(projectName, true);
        this._setPreferences(projectName);
        TelemetryHelper.TelemetryHelper.traceLog({
            "FilterCategory": "AreaPathFilters",
            "Action": actionPerformed,
        });
        this._clickHandler();
    }

    private setExpanded(expand: boolean): void {
        this._$areaPathContainer.removeClass("collapsed");
        if (expand) {
            this._$expander.attr('aria-expanded', 'true');
            this._$label.attr('aria-expanded', 'true');
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS)
                           .removeClass("bowtie-icon bowtie-triangle-right");
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS)
                           .addClass("bowtie-icon bowtie-triangle-down");
        }
        else {
            this._$expander.attr('aria-expanded', 'false');
            this._$label.attr('aria-expanded', 'false');
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS)
                           .removeClass("bowtie-icon bowtie-triangle-down");
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS)
                           .addClass("bowtie-icon bowtie-triangle-right");
            this._$areaPathContainer.addClass("collapsed");
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterCategoryCollapsed": "AreaPathFilters" });
        }
    }
}
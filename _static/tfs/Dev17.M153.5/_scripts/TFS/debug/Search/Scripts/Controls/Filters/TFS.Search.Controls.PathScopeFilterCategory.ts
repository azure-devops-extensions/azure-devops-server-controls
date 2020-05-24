// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Path_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.PathFilterBase");
import Path_Scope_Input_TextBox = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.PathScopeInputTextBox");
import Q = require("q");
import Search_Filter_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterBase");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Filter_Category_Base = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterCategoryBase");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import SourceExplorer_TreeView = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.SourceExplorerView");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TreeView = require("VSS/Controls/TreeView");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;

export class PathScopeFilterCategory extends Path_Filter_Base.PathFilterBase implements Search_Filter_Category_Base.IFilterCategoryBase {
    private static SOURCE_EXPLORER_VIEW_CONTAINER_CSS_CLASS: string = "source-explorer-view";
    private _sourceTreeView: SourceExplorer_TreeView.SourceExplorerView;
    private _pathInputTextBox: Path_Scope_Input_TextBox.PathScopeInputTextBox;

    private _itemClickHandler: Search_Filter_Base.FilterItemClickHandler;

    private _$sourceExplorerViewContainer: JQuery;
    private _projectName: string;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({}, options));
        this._pathInputTextBox = new Path_Scope_Input_TextBox.PathScopeInputTextBox(options);
        this._sourceTreeView = new SourceExplorer_TreeView.SourceExplorerView(options);

        this._pathInputTextBox.setPathNavigationHandler(delegate(this._sourceTreeView, this._sourceTreeView.setSelectedItemPath));
        this._projectName = this._options["projectName"];
    }

    public initializeRepositoryContext(repositoryContext: RepositoryContext, branchName: string) {
        this._sourceTreeView.initialiseRepositoryContext(repositoryContext, branchName);
    }

    /**
    * Implementation of IFilterCategoryBase.dispose(). No-op as we don't want to destroy the object since
    * we are maintaining a cache, storing PathScopeFilterCategory against a given repo.
    */
    public dispose(): void {
        return;
    }

    /*
    * override the definition. Method inherited from IFilterCategoryBase.
    **/
    public onFilterPaneDomUpdate(data: any) {
        // No-op
    }

    /**
    * Draws the filter category.
    * First draws the label, expander and wires the click event on expander.
    * Then draws the path input text box, and then the Tree View control.
    */
    public drawCategory(path: string, reloadTreeView: boolean): void {
        this.baseDrawCategory(this._projectName);
        this._$sourceExplorerViewContainer = $(domElem("div")).addClass(PathScopeFilterCategory.SOURCE_EXPLORER_VIEW_CONTAINER_CSS_CLASS);

        // create path input text box and the tree view.
        this._pathInputTextBox.createIn(this._element);
        this._pathInputTextBox.drawPathInputControl();
        
        this._sourceTreeView.createIn(this._$sourceExplorerViewContainer);
        this._element.append(this._$sourceExplorerViewContainer);

        // if "true" i.e. the path scope control is instantiated and not fetcehd from cache.
        // hence reload(init) the treeview.
        if (reloadTreeView === true) { 
            this._sourceTreeView.reload();
        }

        var successDelegate = delegate(this, (selectedPath: string) => {
            // set the path value in the text box
            this._pathInputTextBox.setPathValue(selectedPath);
        });
        var errorDelegate = delegate(this, (error: string) => { 
            // alert user on error while selecting the path specified.
            alert(error);
        });
        
        // select "path" by default.
        this._sourceTreeView.setSelectedItemPath(path, true).then(successDelegate, errorDelegate);
    }

    /**
    * Implementation of IFilterCategoryBase.getSelectedFilters();
    * Returns current selected node's item path, repository name to which the folder structure belongs to
    * and the type of the repository(either git or tfvc), encapsulated in an object.
    */
    public getSelectedFilters(node?: any): Core_Contracts.IFilterCategory {
        var value: any = null,
            selectedNode: any = node ? node : this._sourceTreeView.getSelectedNode();

        // instantiate values of the path filter iff the selected node is present and is not the repository node.
        // in case the selected node is the root node, only project filters is sent in the search request.
        // When the selected node is a branch filter, we revert the path filter to its root node by returning null value.
        if (selectedNode &&
            selectedNode.filterType !== "branchFilter" &&
            selectedNode !== this._sourceTreeView.rootNode &&
            selectedNode !== this._sourceTreeView.rootNode.children[0]) {
            value = {
                path: selectedNode.path,
                repositoryName: selectedNode.repositoryName,
                versionControlType: selectedNode.versionControlType
            };
        }

        return new Core_Contracts.PathScopeFilterNameValue(Search_Constants.SearchConstants.PathFilters, value);
    }

    /**
    * Sets the handler to handle the click event on TreeView's node.
    */
    public setSelectionChangedHandler(clickHandler: Search_Filter_Base.FilterItemClickHandler): void {
        this._itemClickHandler = clickHandler;
        if (this._sourceTreeView) {
            var selectionChangedHandler = delegate(this, (selectedNode: any) => {
                // update the text first then call the uber level handler
                // to update the navigation Uri after fetching the selected path.
                if (this._pathInputTextBox) {
                    if (selectedNode) {
                        var path: any = selectedNode.path;
                        this._pathInputTextBox.setPathValue(path);
                    }
                }

                this._itemClickHandler(selectedNode);
            });

            // set the handler.
            this._sourceTreeView.setSelectionChangedHandler(selectionChangedHandler);
        }
    }

    /**
    * Method to return repository context given the project/repo name and the type of version control.
    * Repository context is used to fetch items from server using version control api client.
    */
    public static getRepositoryContext(vcType: Base_Contracts.VersionControlType, projectName: string, repoName: string, repoId: string): JQueryPromise<RepositoryContext> {
        var tfsContext = Context.SearchContext.getTfsContext();
        var deferred: JQueryDeferred<RepositoryContext> = jQuery.Deferred();
        var rootRequestPath = Context.SearchContext.getRootRequestPath();
        switch (vcType) {
            case Base_Contracts.VersionControlType.Git:
                var httpClient: VCWebApi.GitHttpClient = new VCWebApi.GitHttpClient(rootRequestPath);
                httpClient.beginGetRepository(projectName, repoName).then(
                    (repository) => {
                        deferred.resolve(GitRepositoryContext.create(repository, tfsContext));
                    },
                    (error) => {
                        deferred.reject(error);
                    });
                break;

            case Base_Contracts.VersionControlType.Tfvc:
                var tfvcRepositoryContext: TfvcRepositoryContext = new TfvcRepositoryContext(tfsContext, projectName);
                deferred.resolve(tfvcRepositoryContext);
                break;

            default:
                deferred.reject();
                break;
        }

        return deferred.promise();
    }

    protected baseDrawCategory(projectName: string): void {
        super.baseDrawCategory(projectName, Search_Resources.PathUnderTextFormat.replace("{0}", projectName), this.setExpanded);
    }

    private setExpanded(expand: boolean): void {
        // hide/show path input text box
        this._pathInputTextBox.setExpand(expand);
        this._$sourceExplorerViewContainer.removeClass("collapsed");
        if (expand) {
            this._$expander.attr('aria-expanded', 'true');
            this._$label.attr('aria-expanded', 'true');
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-right");
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-down");
        }
        else {
            this._$expander.attr('aria-expanded', 'false');
            this._$label.attr('aria-expanded', 'false');
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.EXPANDED_CSS_CLASS);
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.COLLAPSED_CSS_CLASS);
            this._$expander.removeClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_MORE_ICON_CSS_CLASS).removeClass("bowtie-icon bowtie-triangle-down");
            this._$expander.addClass(Search_Filter_Category_Base.FilterCategoryBase.FILTER_CATEGORY_SHOW_LESS_ICON_CSS_CLASS).addClass("bowtie-icon bowtie-triangle-right");
            this._$sourceExplorerViewContainer.addClass("collapsed");
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterCategoryCollapsed": "PathScopeFilters" });
        }
    }
}
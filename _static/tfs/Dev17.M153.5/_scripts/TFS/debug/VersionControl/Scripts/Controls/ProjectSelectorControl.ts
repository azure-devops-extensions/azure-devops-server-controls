import * as TFS_Core_Contracts from "TFS/Core/Contracts";

import * as TFS_FilteredListControl from "Presentation/Scripts/TFS/FeatureRef/FilteredListControl";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import TfsContext = TFS_Host_TfsContext.TfsContext;

namespace TabIds {
    export const All = "projects";
}

export interface ProjectSelectorControlOptions extends TFS_FilteredListControl.FilteredListControlOptions {
    tfsContext?: TfsContext;
    initialProjects?: TFS_Core_Contracts.TeamProjectReference[];
}

export class ProjectSelectorControl extends TFS_FilteredListControl.FilteredListControl {
    private _searchText: string;
    private _totalProjectsCount: number = 0;

    public initialize() {
        this._element.addClass("vc-project-selector-control").addClass("vc-project-selector").addClass("bowtie-filtered-list");
        super.initialize();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            tabNames: options.tabNames ? options.tabNames : undefined,
            scrollToExactMatch: true,
            useBowtieStyle: true
        }, options));
    }

    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        if (this._options.initialProjects && this._options.initialProjects.length > 0)
        {
            this._totalProjectsCount = this._options.initialProjects.length;
            callback.call(this, this._options.initialProjects);
        }
        else
        {
            TfvcRepositoryContext.create().getTfvcClient().beginGetProjectInfos((data) => {
                const projects = data.map(proj => proj.project).sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
                this._totalProjectsCount = projects.length;
                callback.call(this, projects);
            });
        }
    }

    protected _getItemIconClass(item: any): string {
        return "bowtie-icon bowtie-briefcase";
    }

    public _getWaterMarkText(tabId): string {
        return VCResources.ProjectPickerFilterPlaceholder;
    }

    public _getItemName(item: any) {
        return item.name;
    }

    public _onEmptyListSearchEnterClick() {
        const searchText: string = this.getSearchText();
        this.setSearchText(searchText);
    }

    public _onItemSelected(item: any) {
        this._selectedItem = item;
        super._onItemSelected(item);
    }

    public clearInput() {
        this._searchText = "";
        super.clearInput();
    }

    protected onSearchTextChanged() {
        this._searchText = this.getSearchText();
        super.onSearchTextChanged();
    }
}

VSS.classExtend(ProjectSelectorControl, TfsContext.ControlExtensions);
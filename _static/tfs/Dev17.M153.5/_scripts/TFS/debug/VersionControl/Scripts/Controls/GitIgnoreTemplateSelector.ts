/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_FilteredListDropdownMenu = require("Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import VCContracts = require("TFS/VersionControl/Contracts");
import {GitClientService} from "VersionControl/Scripts/GitClientService"
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import TfsContext = TFS_Host_TfsContext.TfsContext;
import domElem = Utils_UI.domElem;

export class GitIgnoreTemplateSelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            useBowtieStyle: true,
            getSelectedItemContent: Utils_Core.delegate(this, this._createSelectedItemHtml),
            showInlineLabel: true,
            setMaxHeightToFitWindow: true,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.addClass("vc-git-ignore-selector-menu");
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return <GitIgnoreTemplateSelectorControl>Controls.Enhancement.enhance
            (GitIgnoreTemplateSelectorControl, $container, {
                projectName: this._options.projectName
            });
    }

    public _getItemDisplayText(item: VCContracts.GitTemplate): string {
        return item ? trimDotGitignore(item.name) : VCResources.AddGitIgnoreSelector_NoneValue;
    }

    public _getItemTooltip(item: VCContracts.GitTemplate): string {
        return this._getItemDisplayText(item);
    }

    private _createSelectedItemHtml(item: VCContracts.GitTemplate): JQuery {
        const $element: JQuery = $(domElem('span'));
        if (this._options.showInlineLabel) {
            $(domElem('span', 'add-gitignore-label'))
                .text(VCResources.AddGitIgnoreSelector_PrefixText)
                .appendTo($element);
        }
        $(domElem('span'))
            .text(this._getItemDisplayText(item))
            .appendTo($element);
        return $element;
    }
}
VSS.classExtend(GitIgnoreTemplateSelectorMenu, TfsContext.ControlExtensions);
export class GitIgnoreTemplateSelectorControl extends TFS_FilteredListControl.FilteredListControl {
    private _projectName: string;
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            useBowtieStyle: true,
            scrollToExactMatch: true,
        }, options));
    }

    public initialize() {
        this._element.addClass("vc-git-ignore-selector-control");
        this._projectName = this._options.projectName;
        super.initialize();
    }

    public _getItemName(item: VCContracts.GitTemplate): string {
        return trimDotGitignore(item.name);
    }

    public _getItemDisplayText(item: VCContracts.GitTemplate): string {
        return this._getItemName(item);
    }

    public _beginGetListItems(tabId: string, callback: (items: VCContracts.GitTemplate[]) => void) {
        const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<GitClientService>(GitClientService);
        gitClient.beginGetTemplateList(
            this._projectName,
            "gitignore",
            (templateList: VCContracts.GitTemplate[]) => {
                callback.call(this, templateList);
            },
            (error: Error) => {
                callback.call(this, []);
            });
    }
}
VSS.classExtend(GitIgnoreTemplateSelectorControl, TfsContext.ControlExtensions);

function trimDotGitignore(name: string) {
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex > 0) {
        return name.substr(0, dotIndex);
    }
}

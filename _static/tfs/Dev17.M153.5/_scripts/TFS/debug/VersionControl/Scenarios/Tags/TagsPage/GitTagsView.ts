/// <reference types="react-dom" />
import * as VSS from "VSS/VSS";

import * as StringUtils from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ViewBase } from "VersionControl/Scripts/Views/BaseView";
import { TagsPageSource } from "VersionControl/Scenarios/Tags/TagsPage/Sources/TagsPageSource";
import { ActionCreator, TagCreators } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionCreator";
import { TagsPageTelemetrySpy } from "VersionControl/Scenarios/Tags/TagsPage/Sources/TagsPageTelemetrySpy";
import { StoresHub } from "VersionControl/Scenarios/Tags/TagsPage/Stores/StoresHub";
import { ActionsHub } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import * as TagsPage from "VersionControl/Scenarios/Tags/TagsPage/Components/TagsPage";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import "VSS/LoaderPlugins/Css!fabric";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

const elementToRender = ".version-control-item-right-pane";

export class GitTagsView extends ViewBase {
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            hubContentSelector: elementToRender,
        }, options));
    }

    public initialize(): void {

        this._customerIntelligenceData.setView(CustomerIntelligenceConstants.TAGS_PAGE_VIEW);
        super.initialize();

        if (this._emptyRepository) {
            this._showEmptyRepositoryView($(elementToRender));
        }
        else {
            this._createFluxComponent($(elementToRender)[0]);
        }
        const contentTitle: string = VCResources.TagsTabLabel;
        const windowTitle: string = StringUtils.format(VCResources.RepositoryTags, (this._repositoryContext as GitRepositoryContext).getRepository().name);
        this.setViewTitleContent(windowTitle, contentTitle);
    }

    private _createFluxComponent(container: HTMLElement): void {
        this._initializeFlux();

        TagsPage.renderInto(
            container,
            {
                actionCreator: this._actionCreator,
                storesHub: this._storesHub,
                customerIntelligenceData: this._customerIntelligenceData.clone(),
            });

    }

    private _initializeFlux(): void {
        let repoContext = this._repositoryContext as GitRepositoryContext;
        const actionsHub = new ActionsHub();
        const tagsPageSource = new TagsPageSource(repoContext);
        const telemetrySpy = new TagsPageTelemetrySpy();
        this._storesHub = new StoresHub(actionsHub);
        this._actionCreator = new ActionCreator(
            actionsHub,
            tagsPageSource,
            telemetrySpy,
            this._storesHub.getAggregatedState,
            new GitPermissionsSource(repoContext.getProjectId(), repoContext.getRepositoryId()),
            new SettingsPermissionsSource()
        );
        this._actionCreator.initialize(this._repositoryContext);
        TagCreators.initialize(tagsPageSource, actionsHub);
    }

    public _dispose(): void {
        TagsPage.unmountFrom($(elementToRender)[0]);

        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }

        this._actionCreator = null;

        super._dispose();
    }
}

VSS.classExtend(GitTagsView, TfsContext.ControlExtensions);

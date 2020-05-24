/// <reference types="jquery" />

import Artifacts = require("Build/Scripts/Artifacts");
import BuildDetails = require("Build/Scripts/BuildDetails");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import TimelineRecordViewModel = require("Build/Scripts/Models.TimelineRecordViewModel");

import { BuildActions } from "Build.Common/Scripts/Linking";

import TFS_Build2_Contracts = require("TFS/Build/Contracts");

import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Grids = require("VSS/Controls/Grids");
import Knockout_Adapters = require("VSS/Adapters/Knockout");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as UserClaimsService from "VSS/User/Services";


var domElem = Utils_UI.domElem;

interface GridRow extends TFS_Build2_Contracts.ArtifactResource {
    stateIconClass: string;
    name: string;
}

export class ArtifactsTab extends BuildDetails.BuildDetailsTab {
    public artifacts: KnockoutComputed<TFS_Build2_Contracts.BuildArtifact[]>;

    private _buildDetailsContext: Context.BuildDetailsContext;
    private _viewContext: Context.ViewContext;

    constructor(viewContext: Context.ViewContext, buildDetailsContext: Context.BuildDetailsContext) {
        super(BuildActions.Artifacts, BuildResources.BuildDetailArtifactsTitle, ArtifactsControl.TemplateName);

        this._buildDetailsContext = buildDetailsContext;
        this._viewContext = viewContext;

        this.artifacts = this.computed(() => {
            var artifacts: TFS_Build2_Contracts.BuildArtifact[] = [];

            var build = this._buildDetailsContext.currentBuild();
            if (build) {
                artifacts = build.artifacts();
            }

            return artifacts;
        });

        // update visibility
        this.computed(() => {
            var artifacts = this.artifacts();

            // hide artifacts tab if there are no artifacts
            if (artifacts.length === 0) {
                this.visible(false);
            }
            // otherwise this tab is visible when no timeline record is selected
            else {
                var currentTimelineRecord: TimelineRecordViewModel.TimelineRecordViewModel = this._buildDetailsContext.currentTimelineRecord();
                this.visible(!currentTimelineRecord);
            }
        });
    }
}

export class ArtifactsViewModel extends Knockout_Adapters.TemplateViewModel {
    public context: BuildDetails.BuildDetailsTab;

    public artifacts: KnockoutComputed<TFS_Build2_Contracts.BuildArtifact[]>;

    constructor(context: ArtifactsTab) {
        super();
        this.context = context;

        this.artifacts = context.artifacts;
    }

    public dispose(): void {
        super.dispose();
    }
}

export class ArtifactsControl extends Knockout_Adapters.TemplateControl<ArtifactsViewModel> {
    static TemplateName = "buildvnext_details_artifacts_tab";

    private _grid: Grids.Grid;
    private _gridColumns: Grids.IGridColumn[];
    private _gridSource: any[];

    private _subscriptions: IDisposable[] = [];
    private _artifacts: TFS_Build2_Contracts.BuildArtifact[] = [];

    constructor(viewModel: ArtifactsViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        this._artifacts = this.getViewModel().artifacts();
        this._updateGridSource(this._artifacts);

        this._subscriptions.push(
            this.subscribe(this.getViewModel().artifacts, (artifacts: TFS_Build2_Contracts.BuildArtifact[]) => {
                this._artifacts = artifacts;
                if (this.getViewModel().context.isSelected()) {
                    // update if it is already selected
                    this._updateGridSource(this._artifacts);
                }
            }));

        this._subscriptions.push(
            this.getViewModel().context.isSelected.subscribe((value: boolean) => {
                if (value) {
                    this._updateGridSource(this._artifacts);
                }
            }));
    }

    private _getArtifactGridOptions(): Grids.IGridOptions {
        // Initial options for the grid. It will be repopulated as different timeline records are selected
        return <Grids.IGridOptions>{
            allowMultiSelect: false,
            autoSort: true,
            source: [],
            columns: this._getArtifactGridColumns(),
            sortOrder: this._getInitialSortOrder(),
            header: true
        };
    }

    _getInitialSortOrder(): Grids.IGridSortOrder[] {
        return [{ index: "name", order: "asc" }];
    }

    private _getArtifactGridColumns(): Grids.IGridColumn[] {
        let projId: string = this.getViewModel().context.currentBuild().projectId();
        let vm: any = this.getViewModel();
		let buildId: () => number = function(){
			return vm.context.currentBuild().id();
		}
        if (!this._gridColumns) {
            this._gridColumns = <Grids.IGridColumn[]>[
                {
                    index: "stateIconClass",
                    width: 26,
                    canSortBy: false,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var item: GridRow = grid._dataSource[dataIndex];
                        if (item) {
                            return $(domElem("div", "grid-cell"))
                                .attr("role", "gridcell")
                                .width(26)
                                .append($(domElem("span", "icon"))
                                    .addClass(item.stateIconClass));
                        }
                    }
                },
                {
                    index: "name",
                    text: BuildResources.NameLabel,
                    width: 250,
                    canSortBy: true
                },
                {
                    index: "download",
                    text: "",
                    width: 100,
                    canSortBy: true,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var artifactRow: GridRow = grid._dataSource[dataIndex];
                        if (artifactRow) {
                            var cell = $(domElem("div", "grid-cell bowtie")).attr("role", "gridcell").width(100);

                            // show the download link if the artifact provider says it supports it and if there's actually a download url
                            var artifactProvider: Artifacts.IArtifactProvider = Artifacts.ArtifactProviderFactory.getArtifactProvider(artifactRow.type);
                            if (artifactProvider && artifactProvider.supportsDownload() && artifactRow.downloadUrl) {
                                var link = $(domElem("button"))
                                    .addClass("build-artifacts-grid-button btn-default")
                                    .text(BuildResources.ArtifactsDownloadText)
                                    .appendTo(cell);

                                link.click(() => {
                                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                        url: artifactRow.downloadUrl,
                                        target: "_blank"
                                    });
                                });
                            }

                            return cell;
                        }
                    }
                },
                {
                    index: "explore",
                    text: "",
                    width: 250,
                    canSortBy: true,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        // "this" is the grid
                        var grid: Grids.Grid = this;
                        var artifactRow: GridRow = grid._dataSource[dataIndex];

                        const canExploreArtifacts = (tfsContext: TfsContext, artifactProvider: Artifacts.IArtifactProvider): boolean => {
                            const userClaimsService = UserClaimsService.getService();
                            const anonymousClaim = userClaimsService.hasClaim(UserClaimsService.UserClaims.Anonymous);
                            const publicClaim = userClaimsService.hasClaim(UserClaimsService.UserClaims.Public);

                            // Anonymous or public user does not have permission to explore file container artifacts
                            // Only file container artifacts support download
                            return !((anonymousClaim || publicClaim) && artifactProvider.supportsDownload());
                        }

                        if (artifactRow) {
                            var cell = $(domElem("div", "grid-cell bowtie")).attr("role", "gridcell").width(250);

                            // show the explore link if the artifact provider says it supports it
                            var artifactProvider: Artifacts.IArtifactProvider = Artifacts.ArtifactProviderFactory.getArtifactProvider(artifactRow.type);
                            if (artifactProvider) {
                                if (canExploreArtifacts(Context.viewContext.tfsContext, artifactProvider)) {
                                    var columnInfo = artifactProvider.getColumn2(artifactRow, artifactRow.name);
                                    if (columnInfo && columnInfo.display) {
                                        if (columnInfo.onClick) {
                                            var link = $(domElem("button"))
                                                .addClass("build-artifacts-grid-button btn-default")
                                                .text(columnInfo.text || BuildResources.ArtifactsExploreText)
                                                .appendTo(cell);

                                            link.click(() => {
                                                columnInfo.onClick(Context.viewContext.tfsContext, artifactRow, artifactRow.name, buildId, projId);
                                            });
                                        }
                                        else {
                                            var text = $(domElem("span"))
                                                .text(columnInfo.text || BuildResources.ArtifactsExploreText)
                                                .appendTo(cell);
                                        }
                                    }
                                }
                            }

                            return cell;
                        }
                    }
                }
            ]
        }

        return this._gridColumns;
    }

    private _disposeSubscription(): void {
        if (this._subscriptions.length > 0) {
            $.each(this._subscriptions, (index, value: IDisposable) => {
                value.dispose();
            });
        }
    }

    dispose(): void {
        this._disposeSubscription();

        // Dispose grid
        this._grid.dispose();
        this._grid = null;

        super.dispose();
    }

    private _updateGridSource(artifacts: TFS_Build2_Contracts.BuildArtifact[]): void {
        if (!this._grid || this._grid.isDisposed()) {
            this._grid = <Grids.Grid>Controls.Enhancement.enhance(Grids.Grid, this._element.find(".artifacts-grid"), this._getArtifactGridOptions());
        }

        this._gridSource = $.map(artifacts, (art: TFS_Build2_Contracts.BuildArtifact) => {
            if (art && art.resource) {
                var iconClass: string = "folder";

                var artifactProvider = Artifacts.ArtifactProviderFactory.getArtifactProvider(art.resource.type);
                if (artifactProvider) {
                    iconClass = artifactProvider.iconClass || iconClass;
                }

                var resource = art.resource;
                return {
                    stateIconClass: iconClass,
                    name: art.name,
                    downloadUrl: resource.downloadUrl,
                    url: resource.url,
                    type: resource.type,
                    data: resource.data,
                    _links: resource._links
                };
            }
        });

        // Update the grid with new source
        this._grid.setDataSource(
            this._gridSource,
            null,
            this._getArtifactGridColumns(),
            null,
            -1);
    }
}

Knockout_Adapters.TemplateControl.registerBinding("buildvnext_details_artifacts_tab", ArtifactsControl, (context?: any): ArtifactsViewModel => {
    return new ArtifactsViewModel(context);
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("BuildDetails.ArtifactsTab", exports);

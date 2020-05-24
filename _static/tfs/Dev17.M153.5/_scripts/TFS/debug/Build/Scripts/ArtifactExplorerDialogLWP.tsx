import * as React from "react";

import { BuildClientService as BuildClientService2_2 } from "Build.Common/Scripts/Api2.2/ClientServices";

import { IArtifactProvider, ArtifactProviderFactory } from "Build/Scripts/Artifacts";
import { ArtifactsExplorerDialog, ArtifactsExplorerDialogModel, ArtifactsExplorerDialogSubtype } from "Build/Scripts/BuildDetails.ArtifactExplorerDialog";

import { initKnockoutHandlers } from "DistributedTasksCommon/TFS.Knockout.CustomHandlers";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Application } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { BuildArtifact, ArtifactResource } from "TFS/Build/Contracts";

import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { show } from "VSS/Controls/Dialogs";
import { copyToClipboard } from "VSS/Utils/Clipboard";
import { FileContainerService } from "VSS/FileContainer/Services";
import { registerLWPComponent } from "VSS/LWP";
import { getCollectionService } from "VSS/Service";

// For drop artifact
import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { DedupManifestParser } from "Build/Scripts/BuildDetails.DedupArtifact";
import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

export interface IArtifactExplorerDialogProps extends IBaseProps {
    artifact: BuildArtifact;
    buildId: number | null;
    projectId: string;
}

export class ArtifactExplorerDialogLWPComponent extends BaseComponent<IArtifactExplorerDialogProps, {}> {
    public static componentType = "ci-artifacts-explorer-dialog";
    private _element: HTMLElement;
    private _showCopyCallout = true;
    private _artifactProvider: IArtifactProvider;
    private _providerContext: any;

    private _buildId: number | null;
    private _projectId: string;
    private _artifactId: string;
    private _isDrop: boolean = false;

    constructor(props: IArtifactExplorerDialogProps) {
        super(props);

        this._buildId = props.buildId;
        this._projectId = props.projectId;

        const artifactResource = props.artifact.resource;
        this._artifactId = artifactResource.properties["ArtifactId"]; // Get the ArtifactId property.
        const artifactProvider: IArtifactProvider = ArtifactProviderFactory.getArtifactProvider(artifactResource.type);
        if (artifactProvider && artifactProvider.supportsDownload() && artifactResource.downloadUrl) {
            this._showCopyCallout = false;
        }
        else if (artifactResource.type.toLowerCase() == "pipelineartifact") {
            this._isDrop = true;
            this._showCopyCallout = false;
        }
    }

    public componentDidMount() {
        if (!this._showCopyCallout) {
            initKnockoutHandlers();
            this._element.innerHTML = `<script id="artifacts_explorer_dialog" type="text/html">
                <div data-bind="template: { name: 'artifacts_explorer_tree', data: fileTree }"></div>
            </script>
            <script id="artifacts_explorer_tree" type="text/html">
                <div data-bind="renderTreeView: { treeNodes: nodes, onNodeClick: _onClick, menuOptions: { getMenuOptions: getMenuOptions } }"></div>
            </script>`;

            if (this._isDrop) {
                const artifactResource: ArtifactResource = this.props.artifact.resource;
                const artifactName = this.props.artifact.name;
                if (artifactResource.data) {
                    if (!this._buildId) {
                        VSS.handleError({ name: "", message: "Build identifier not available." });
                    }

                    // 1) Get metadata
                    const manifestId: string = artifactResource.data;

                    // 2) Get manifest data
                    const service = getCollectionService(BuildClientService);
                    service.getBuildDropManifest(this._buildId, artifactName, manifestId).then(
                        data => {
                            /* Manifest example:
                            data =
                                [
                                    { "path": "/a/b/1.txt", "blob": { "id": "123", "size": 956  } },
                                    { "path": "/a/c/2.exe", "blob": { "id": "456", "size": 2730 } },
                                    { "path": "/x/f.pdb",   "blob": { "id": "789", "size": 388  } }
                                ];
                            */

                            // 3) Render the tree
                            const items = DedupManifestParser.parse(data);
                            const dialogModel = new ArtifactsExplorerDialogModel(
                                items, artifactName, this._buildId, this._projectId, this._artifactId, ArtifactsExplorerDialogSubtype.Dedup);
                            Dialogs.show(ArtifactsExplorerDialog, dialogModel);
                        },
                        error => {
                            VSS.handleError(error);
                        });
                }
            }
            else {
                const tfsContext = TfsContext.getDefault();
                const fileContainerService = Application.getConnection(tfsContext).getService(FileContainerService);
                const parsedContainerPath = fileContainerService.parseContainerPath(this.props.artifact.resource.data);
                getCollectionService(BuildClientService2_2).beginGetBuildContainerItemsWithContainerId(parsedContainerPath.containerId, null, parsedContainerPath.path, tfsContext)
                    .then((items) => {
                        // Show the dialog
                        const dialogModel = new ArtifactsExplorerDialogModel(items, this.props.artifact.name);
                        show(ArtifactsExplorerDialog, dialogModel);
                    });
            }
        }
        else {
            copyToClipboard(this.props.artifact.resource.downloadUrl, {
                showCopyDialog: true
            });
        }
    }

    public render() {
        return <div ref={this._resolveRef("_element")}>
        </div>;
    }
}

export interface IArtifactCopyDialogLWPComponentProps {
    content: string;
}

export class ArtifactCopyDialogLWPComponent extends React.Component<IArtifactCopyDialogLWPComponentProps, {}> {
    public static componentType = "ci-artifacts-copy-dialog";
    public componentDidMount() {
        copyToClipboard(this.props.content, {
            showCopyDialog: true
        });
    }

    public render() {
        return null;
    }
}

registerLWPComponent(ArtifactExplorerDialogLWPComponent.componentType, ArtifactExplorerDialogLWPComponent);
registerLWPComponent(ArtifactCopyDialogLWPComponent.componentType, ArtifactCopyDialogLWPComponent);

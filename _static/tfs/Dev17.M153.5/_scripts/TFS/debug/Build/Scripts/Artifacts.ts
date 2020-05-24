import ArtifactsExplorerDialog = require("Build/Scripts/BuildDetails.ArtifactExplorerDialog");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { ArtifactResourceTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { DedupManifestParser } from "Build/Scripts/BuildDetails.DedupArtifact";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import TFS_Build2_Contracts = require("TFS/Build/Contracts");

import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import FileContainer = require("VSS/FileContainer/Contracts");
import FileContainerServices = require("VSS/FileContainer/Services");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import { getCollectionService } from "VSS/Service";
import { BuildClientService as BuildClientService2_2 } from "Build.Common/Scripts/Api2.2/ClientServices";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";

var domElem = Utils_UI.domElem;

export interface IArtifactColumn {
    display: boolean;
    text?: string;
    onClick?: (tfsContext: TFS_Host_TfsContext.TfsContext, artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string, buildId: () => number, projectId: string) => void;
}

export interface IArtifactProvider {
    iconClass: string;
    supportsDownload(): boolean;
    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn;
}

export class ArtifactProviderFactory {
    private static _artifactProviders: IDictionaryStringTo<() => IArtifactProvider> = {};

    public static getArtifactProvider(artifactResourceType: string): IArtifactProvider {
        var factory = ArtifactProviderFactory._artifactProviders[artifactResourceType.toLowerCase()];
        if (factory) {
            return factory();
        }
    }

    public static registerArtifactProvider(artifactProviderType: () => IArtifactProvider, artifactResourceTypes: string[]) {
        artifactResourceTypes.forEach((resourceType: string) => {
            if (!ArtifactProviderFactory._artifactProviders[resourceType.toLowerCase()]) {
                ArtifactProviderFactory._artifactProviders[resourceType.toLowerCase()] = artifactProviderType;
            }
        });
    }
}

class FilePathArtifactProvider implements IArtifactProvider {
    public iconClass: string = "folder";

    public supportsDownload(): boolean {
        return false;
    }

    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn {
        return {
            display: true,
            onClick: (tfsContext: TFS_Host_TfsContext.TfsContext, artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string, buildId: () => number, projectId: string) => {
                if (artifactResource.downloadUrl) {
                    // IE <= 10 exposes document.all. IE11 does not
                    var isIE: boolean = !!document.all || (window.ActiveXObject !== undefined);

                    // if https or not IE, copy the url to the clipboard
                    if (!isIE || Utils_String.ignoreCaseComparer("https:", window.location.protocol) === 0) {
                        if (confirm(Utils_String.format(BuildResources.OpenDropLocation, artifactResource.downloadUrl))) {
                            // attempt to copy the location to the clipboard
                            Utils_Clipboard.copyToClipboard(artifactResource.downloadUrl);
                        }
                    }
                    else {
                        // IE and not https
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                            url: artifactResource.downloadUrl,
                            target: "_blank"
                        });
                    }
                }
            }
        };
    }
}
ArtifactProviderFactory.registerArtifactProvider(() => new FilePathArtifactProvider(), [ArtifactResourceTypes.FilePath, ArtifactResourceTypes.SymbolStore]);

class ContainerArtifactProvider implements IArtifactProvider {
    public iconClass: string = "folder";

    public supportsDownload(): boolean {
        return true;
    }

    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn {
        return {
            display: true,
            onClick: (tfsContext: TFS_Host_TfsContext.TfsContext, artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string, buildId: () => number, projectId: string) => {
                if (artifactResource.data) {
                    var fileContainerService = TFS_OM_Common.Application.getConnection(tfsContext).getService<FileContainerServices.FileContainerService>(FileContainerServices.FileContainerService);
                    var parsedContainerPath = fileContainerService.parseContainerPath(artifactResource.data);
                    getCollectionService(BuildClientService2_2).beginGetBuildContainerItemsWithContainerId(parsedContainerPath.containerId, null, parsedContainerPath.path, tfsContext).then((items: FileContainer.FileContainerItem[]) => {
                        // Show the dialog
                        var dialogModel = new ArtifactsExplorerDialog.ArtifactsExplorerDialogModel(items, artifactName);
                        Dialogs.show(ArtifactsExplorerDialog.ArtifactsExplorerDialog, dialogModel);
                    }, (error) => {
                        // permission issue, show permission error
                        if (error && error.status === 401) {
                            const div = $(domElem('div'));
                            const icon = $(domElem('span')).addClass("icon icon-warning");
                            const error = $(domElem('span')).css({'vertical-align':"middle"}).text(BuildResources.NoPermissionToExploreArtifacts);
                            div.append(icon).append(error);
                            const dialog = Dialogs.show(Dialogs.ModalDialog, {
                                title: BuildResources.ArtifactsExplorerTitle,
                                content: div,
                                resizable: false,
                                buttons: {
                                    okButton: {
                                        text: BuildResources.Ok,
                                        click: () => {
                                            dialog.close();
                                        }
                                    }
                                }
                            });
                        }
                        else {
                            // Show dialog with no items
                            const dialogModel = new ArtifactsExplorerDialog.ArtifactsExplorerDialogModel([], artifactName);
                            Dialogs.show(ArtifactsExplorerDialog.ArtifactsExplorerDialog, dialogModel);
                        }
                    });
                }
            }
        };
    }
}
ArtifactProviderFactory.registerArtifactProvider(() => new ContainerArtifactProvider(), [ArtifactResourceTypes.Container]);

class DedupDropArtifactProvider implements IArtifactProvider {
    public iconClass: string = "folder";

    public supportsDownload(): boolean {
        return false;
    }

    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn {
        return {
            display: true,
            onClick: (tfsContext: TFS_Host_TfsContext.TfsContext, artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string, buildId: () => number, projectId: string) => {
                if (artifactResource.data) {
                    // 1) Get metadata
                    const manifestId: string = artifactResource.data;

                    const artifactId: string = artifactResource.properties["ArtifactId"];

                    // 2) Get manifest data
                    let service = getCollectionService(BuildClientService);
                    service.getBuildDropManifest(buildId(), artifactName, manifestId).then(
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
                            var items = DedupManifestParser.parse(data);
                            var dialogModel = new ArtifactsExplorerDialog.ArtifactsExplorerDialogModel(
                                items, artifactName, buildId(), projectId, artifactId, ArtifactsExplorerDialog.ArtifactsExplorerDialogSubtype.Dedup);
                            Dialogs.show(ArtifactsExplorerDialog.ArtifactsExplorerDialog, dialogModel);
                        },
                        error => {
                            console.error("Encountered an error: " + error);
                        });
                }
            }
        };
    }
}
ArtifactProviderFactory.registerArtifactProvider(() => new DedupDropArtifactProvider(), [ArtifactResourceTypes.PipelineArtifact]);

class GitRefArtifactProvider implements IArtifactProvider {
    public iconClass: string = "bowtie-icon bowtie-tag";

    public supportsDownload(): boolean {
        return false;
    }

    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn {
        var parsedResource: string = "";
        try {
            parsedResource = JSON.parse(artifactResource.data);
        }
        catch (ex) {
        }

        if (parsedResource && parsedResource["ref"]) {
            return {
                display: true,
                text: parsedResource["ref"],
                onClick: (tfsContext: TFS_Host_TfsContext.TfsContext, artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string, buildId: () => number, projectId: string) => {
                if (artifactResource._links && artifactResource._links.web && artifactResource._links.web.href) {
                    window.open(artifactResource._links.web.href, "_blank");
                }
            }
        };
        }
        else {
            return {
                display: false
            };
        }
    }
}
ArtifactProviderFactory.registerArtifactProvider(() => new GitRefArtifactProvider(), [ArtifactResourceTypes.GitRef]);

class TfvcLabelArtifactProvider implements IArtifactProvider {
    public iconClass: string = "bowtie-icon bowtie-tag";

    public supportsDownload(): boolean {
        return false;
    }

    getColumn2(artifactResource: TFS_Build2_Contracts.ArtifactResource, artifactName: string): IArtifactColumn {
        return {
            display: true,
            text: artifactResource.data
        };
    }
}
ArtifactProviderFactory.registerArtifactProvider(() => new TfvcLabelArtifactProvider(), [ArtifactResourceTypes.TfvcLabel]);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Artifacts", exports);

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { VSLauncher } from "Presentation/Scripts/TFS/TFS.Core.Utils.VisualStudio";
import { IExtensionHost } from "VersionControl/Scenarios/Explorer/Commands/ExtensionHost";
import { GetCommandsOptions, hasFileExtension } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";
import { getMenuIcon } from "VersionControl/Scenarios/Shared/Commands/CommandsCreator";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

const visualStudioSolutionExtension = "sln";

export class OpenInVisualStudioCommand {
    constructor(private extensionHost: IExtensionHost) {
    }

    public getCommand = ({ item, isEditing, isCurrentItem, uiSource }: GetCommandsOptions): IContextualMenuItem => {
        if (hasFileExtension(item, visualStudioSolutionExtension) &&
            !(isEditing && isCurrentItem) &&
            item.contentMetadata &&
            item.contentMetadata.vsLink) {
            return {
                key: "openInVisualStudio",
                name: VCResources.OpenInVisualStudioTooltip,
                iconProps: getMenuIcon("bowtie-logo-visual-studio"),
                onClick: () => this.open(item.contentMetadata.vsLink, uiSource),
            };
        }
    }

    private open(link: string, uiSource: string) {
        this.extensionHost.publishTelemetryEvent("openInVisualStudio", { uiSource });

        VSLauncher.openVSWebLink(link);
    }
}

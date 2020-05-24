import { getErrorMessage } from "VSS/VSS";

import { IInternalLinkedArtifactDisplayData, IInternalLinkedArtifactPrimaryData, IColumn } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ArtifactIconType, ILinkedArtifactId} from "TFS/WorkItemTracking/ExtensionContracts";

export namespace ErrorUtils {
    /**
     * Get primary data object that can be used to display an error
     * @param artifact Artifact to show the error for
     * @param displayId
     * @param typeDisplayName
     */
    export function getErrorPrimaryData(artifact: IInternalLinkedArtifactDisplayData): IInternalLinkedArtifactPrimaryData {

        const displayId: string | ILinkedArtifactId = artifact.primaryData && artifact.primaryData.displayId || artifact.id;
        const typeDisplayName = artifact.linkTypeDisplayName || artifact.linkType || artifact.type;

        let errorMessage: string;
        if (artifact && artifact.error) {
            errorMessage = getErrorMessage(artifact.error);
        }

        return {
            displayId: displayId,
            title: errorMessage,
            typeIcon: {
                type: ArtifactIconType.icon,
                descriptor: "bowtie-status-error la-error-icon",
                title: errorMessage
            },
            typeName: typeDisplayName,
            href: "#",
            callback: () => true
        };
    }
}

export namespace ComponentUtils {
    /**
     * Generates text for 'Rich Tooltip' of the given artifact with the provided hidden columns
     *
     * @param artifact - Artifact to generate the tooltip for
     * @param hiddenColumns - columns that are hidden in the UI and therefore should show up in the tooltip
     */
    export function getTooltip(artifact: IInternalLinkedArtifactDisplayData, hiddenColumns: IColumn[]): string {
        if (!artifact || !artifact.primaryData) {
            // No Primary data, so there's nothing to show
            return "";
        }

        let tooltip: string = "";

        if (artifact.additionalData) {
            for (const column of hiddenColumns) {
                if (artifact.additionalData[column.refName]) {
                    tooltip += `${column.name}:\t${artifact.additionalData[column.refName].styledText.text}\n`;
                }
            }
        }

        return tooltip.trim();
    }
}

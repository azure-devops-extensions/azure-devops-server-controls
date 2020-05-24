import { IInternalLinkedArtifactDisplayData  } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IdentityRef } from "VSS/WebApi/Contracts";
import * as Utils_Array from "VSS/Utils/Array";

import { LinkedWorkItemInfo } from "VersionControl/Scenarios/PullRequestCreate/Stores/PullRequestPropertiesStore";


export module WorkItemsHelper {
    export function addWorkItem(workItems: LinkedWorkItemInfo[], workItemId: number): LinkedWorkItemInfo[] {
        if (!workItems.some(wi => wi.id === workItemId)) {
            return [...workItems, { id: workItemId, autoLinked: false } as LinkedWorkItemInfo];
        }
        return workItems;
    }

    export function containsWorkItem(workItems: LinkedWorkItemInfo[], workItemId: number): boolean {
        return workItems.some(wi => wi.id === workItemId);
    }

    export function removeWorkItem(workItems: LinkedWorkItemInfo[], workItemId: IInternalLinkedArtifactDisplayData): LinkedWorkItemInfo[] {
        const index = Utils_Array.findIndex(workItems, wi => wi.id === Number(workItemId.id));
        return [
            ...workItems.slice(0, index),
            ...workItems.slice(index + 1)
        ];
    }
}

export namespace LabelsHelper {
    export function addLabel(labels: string[], newLabel: string): string[] {
        if (!labels.some(l => l === newLabel))
        {
            labels = [...labels, newLabel];
        }
        return labels;
    }

    export function removeLabel(labels: string[], newLabel: string): string[] {
        labels = labels.filter(l => l !== newLabel);
        return labels;
    }
}


export module TitleDescriptionHelper {
 
     export function getInputTitleAndDescription(sourceBranch: string, targetBranch: string): {title: string, description: string} {
        const genRefName: string = sessionStorage.getItem("TFS-PR-GENREF");
        const ontoRefName: string = sessionStorage.getItem("TFS-PR-ONTOREF");
        const inputTitle = sessionStorage.getItem("TFS-PR-TITLE");
        const inputDescription = sessionStorage.getItem("TFS-PR-DESC");

        if (genRefName === sourceBranch && ontoRefName === targetBranch && inputTitle && inputDescription) {
            return {
                title: inputTitle,
                description: inputDescription
            };
        }

        //fallback for compatibility
        return getUrlTitleAndDescription(window.location.href);
    }

    function getUrlTitleAndDescription(uri: string): {title: string, description: string} {
        let title: string = null;
        let description: string = null;

        const queryString = uri.split('?')[1];

        if (queryString) {
            const queryParams: string[] = queryString.split('&');
            for (let i: number = 0; i < queryParams.length; ++i) {
                const item: string[] = queryParams[i].split('=');
                const key: string = item[0];
                const value: string = decodeURIComponent(item[1]);
                if (key === "title") {
                    title = value;
                }
                else if (key === "desc") {
                    description = value;
                }
            }
        }

        return {title, description};
    }
}

export module IdentityHelper {
    export function transformIEntityToIdentityRef(entity: IEntity): IdentityRef {
        const originIsAad: boolean = entity.originDirectory == "aad";
        const hasLocal: boolean = (entity.active) && (entity.localId != null) && (entity.localId != "");
        const isAad: boolean = originIsAad && !hasLocal;
        const isGroup: boolean = entity.entityType == "Group";

        return {
            id: isAad ? entity.originId : entity.localId,
            isAadIdentity: isAad,
            isContainer: isGroup,
            displayName: entity.displayName
        } as IdentityRef;
    }

    export function transformIEntitiesToIdentityRefs(entities: IEntity[]): IdentityRef[] {
        return entities.map(transformIEntityToIdentityRef);
    }
}

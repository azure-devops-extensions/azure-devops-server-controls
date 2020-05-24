import * as Serialization from "VSS/Serialization";
import { GitVersionDescriptor, TypeInfo as GitTypeInfo } from "TFS/VersionControl/Contracts";
import { TypeInfo as WikiTypeInfo, WikiV2 } from "TFS/Wiki/Contracts";

export function deserializeToWiki(wiki: any): WikiV2 {
    return Serialization.ContractSerializer.deserialize(wiki, WikiTypeInfo.WikiV2) as WikiV2;
}

export function deserializeToWikiVersion(wikiVersion: any): GitVersionDescriptor {
    return Serialization.ContractSerializer.deserialize(wikiVersion, GitTypeInfo.GitVersionDescriptor) as GitVersionDescriptor;
}

import { PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IMultiCommandDropdownVersions {
    packageId: string;
    versions: PackageVersion[];
}

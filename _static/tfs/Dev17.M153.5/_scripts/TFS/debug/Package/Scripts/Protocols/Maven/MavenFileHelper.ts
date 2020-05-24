import * as Utils_String from "VSS/Utils/String";

import * as PackageResources from "Feed/Common/Resources";

import { PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export interface IMavenFile {
    name: string;
    key: string;
}

export function getFiles(packageVersion: PackageVersion): IMavenFile[] {
    const fileNames: IMavenFile[] = [];

    if (packageVersion.files) {
        packageVersion.files.forEach(file => {
            if (!isHashFile(file.name)) {
                fileNames.push({
                    name: file.name,
                    key: file.name
                });
            }
        });
    }

    return fileNames;
}

export function getMetadata(packageVersion: PackageVersion): IMavenFile[] {
    const metadataFiles: IMavenFile[] = [];

    if (isSnapshotVersion(packageVersion)) {
        metadataFiles.push({
            name: "snapshot/maven-metadata.xml",
            key: "snapshotMetadata"
        });
    }

    metadataFiles.push({
        name: "artifact/maven-metadata.xml",
        key: "artifactMetadata"
    });

    metadataFiles.push({
        name: "index.json",
        key: "artifactIndex"
    });

    return metadataFiles;
}

export function getHrefLink(
    ref: string,
    endpointUrl: string,
    normalizedName: string,
    normalizedVersion: string,
    callback: (href: string) => void
): void {
    const nameParts = normalizedName ? normalizedName.split(":") : null;
    const groupId = nameParts[0] ? nameParts[0].replace(/\./g, "/") : null;
    const artifactId = nameParts[1];

    if (endpointUrl !== null && groupId !== null && artifactId !== null && normalizedVersion !== null && ref !== null) {
        const link = Utils_String.format(
            "{0}/{1}/{2}/{3}/{4}",
            endpointUrl,
            groupId,
            artifactId,
            normalizedVersion,
            ref
        );
        callback(link);
    } else {
        alert(Utils_String.format(PackageResources.Maven_File_NotFound, ref));
    }
}

export function isSnapshotVersion(packageVersion: PackageVersion): boolean {
    return packageVersion.version.toLowerCase().indexOf("-snapshot") > -1;
}

function isHashFile(fileName: string): boolean {
    return (
        Utils_String.endsWith(fileName, ".md5", Utils_String.ignoreCaseComparer) ||
        Utils_String.endsWith(fileName, ".sha1", Utils_String.ignoreCaseComparer)
    );
}

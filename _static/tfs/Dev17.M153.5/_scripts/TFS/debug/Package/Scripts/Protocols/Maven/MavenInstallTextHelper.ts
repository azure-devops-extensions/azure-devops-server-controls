import * as PackageResources from "Feed/Common/Resources";

export function getMavenPackageInstallText(version: string, packageName: string): string {
    if (packageName) {
        const packageNameParts = packageName ? packageName.split(":") : "";

        if (packageNameParts.length === 2) {
            return renderMavenPackageInstallText(packageNameParts[0], packageNameParts[1], version);
        }

        return PackageResources.MavenOverview_InvalidPackageError;
    }
}

export function renderMavenPackageInstallText(groupId: string, artifactId: string, version: string): string {
    // using » to indicate where the indentations will be
    const snippet = `<dependency>
            »<groupId>${groupId}</groupId>
            »<artifactId>${artifactId}</artifactId>
            »<version>${version}</version>
            </dependency>`;

    return snippet.replace(/  +/g, "").replace(/»/g, "  ");
}

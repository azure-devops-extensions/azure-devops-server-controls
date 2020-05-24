import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";

/**
 * This method assumes that the path provided is that of a file.
 * If the path corresponds to a folder, this will still return the default file icon type.
 * @param path - The path of the file for which the icon name is required.
 */
export function getIconNameForFile(path: string): string {
    const extension = VersionControlPath.getFileExtension(path).toLocaleLowerCase();

    switch (extension) {
        case "sln":
            return "bowtie-file-type-sln";
        case "htm":
        case "html":
            return "bowtie-file-type-html";
        case "js":
            return "bowtie-file-type-js";
        case "jsproj":
            return "bowtie-file-type-jsproj";
        case "cs":
            return "bowtie-file-type-cs";
        case "csproj":
            return "bowtie-file-type-csproj";
        case "vb":
            return "bowtie-file-type-vb";
        case "vbproj":
            return "bowtie-file-type-vbproj";
        case "c":
        case "cc":
        case "h":
        case "hpp":
        case "cpp":
        case "cxx":
            return "bowtie-file-type-cpp";
        case "vcxproj":
            return "bowtie-file-type-vcxproj";
        case "fs":
        case "fsx":
            return "bowtie-file-type-fs";
        case "fsproj":
            return "bowtie-file-type-fsproj";
        case "py":
            return "bowtie-file-type-python";
        case "pyproj":
            return "bowtie-file-type-pyproj";
        case "ts":
        case "tsx":
            return "bowtie-file-type-typescript";
        case "coffee":
        case "litcoffee":
            return "bowtie-file-type-coffeescript";
        case "aspx":
            return "bowtie-file-type-aspx";
        case "css":
            return "bowtie-file-type-css";
        case "sass":
            return "bowtie-file-type-sass";
        case "less":
            return "bowtie-file-type-less";
        case "json":
            return "bowtie-file-type-json";
        case "xml":
        case "config":
            return "bowtie-file-type-xml";
        case "md":
        case "markdown":
        case "mdown":
            return "bowtie-file-type-md";
        case "ps1":
        case "psm1":
            return "bowtie-file-type-powershell";
        case "bat":
        case "cmd":
            return "bowtie-file-type-cmd";
        case "java":
            return "bowtie-file-type-java";
        case "sql":
            return "bowtie-file-type-sql";
        case "sh":
            return "bowtie-script";
        default:
            return "bowtie-file";
    }
}

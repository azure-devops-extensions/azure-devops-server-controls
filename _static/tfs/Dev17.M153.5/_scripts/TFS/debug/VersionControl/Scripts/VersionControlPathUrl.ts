import URI = require("Presentation/Scripts/URI");

/**
    * Combines a relativePath with a basePath and resolves all "../" path segements.
    */
export function resolveRelativePath(relativePath: string, basePath: string) {
    if (!relativePath) {
        relativePath = "";
    }
    if (!basePath) {
        basePath = "";
    }
    let encodedPath = uriEncodePathSegments(relativePath);
    let encodedBasePath = uriEncodePathSegments(basePath);
    let uri = new URI(encodedPath);
    let absUri = uri.absoluteTo(encodedBasePath);
    return URI.decode(absUri.href());
}

/**
    * URI Encodes each segment in the path while preserving the '/' in between the segments or converting '\' to '/'
*/
function uriEncodePathSegments(path: string): string {
    let segments = path.split(/[\\\/]/);

    for (let i = 0; i < segments.length; i++) {
        segments[i] = URI.encode(segments[i]);
    }
    return segments.join("/");
}
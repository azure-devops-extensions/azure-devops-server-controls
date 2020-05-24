import FileContainer_Contracts = require("VSS/FileContainer/Contracts");

/**
 * A variation of FileContainerItem to adopt Pipeline Artifact's (PA) file entry. Because 
 * a PA's manifest contains very little information about the files within, we have 
 * to skip most properties on this item. Of particular importance is the dedupId, which is
 * essential to retrieving the file since the backend storage is addressed per contents 
 * instead of path/name.
 */
export class DedupFileContainerItem implements FileContainer_Contracts.FileContainerItem {
    // Supported
    path: string;
    fileLength: number;

    // Specific
    dedupId: string;

    // Not supported
    containerId: number;
    contentId: number[];
    contentLocation: string;
    createdBy: string;
    dateCreated: Date;
    dateLastModified: Date;
    fileEncoding: number;
    fileHash: number[];
    fileId: number;
    fileType: number;
    itemLocation: string;
    itemType: FileContainer_Contracts.ContainerItemType;
    lastModifiedBy: string;
    scopeIdentifier: string;
    status: FileContainer_Contracts.ContainerItemStatus;
    ticket: string;

    /**
     * Returns the file name of this item. This contains only the last section of the full pathname.
     * 
     * If this method returns null, it most likely indicates a bug.
     */
    public getFileName(): string {
        let name: string = this.path;

        // Only use the last section in the path
        let index: number = name.lastIndexOf("/");
        if (index >= 0) {
            name = this.path.substring(index + 1);
        }

        if (name && name.length > 0) {
            return name;
        }
        else {
            console.error("Cannot extract file name from path " + this.path);
            return null;
        }
    }

    /**
     * Get the full path of this item, starting with '/'.
     */
    public getFullPath(): string {
        let path: string = this.path;
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        return path;
    }
}

export class DedupManifestParser {

    public static parse(manifest: any[]): FileContainer_Contracts.FileContainerItem[] {
        // Example of input:
        // [
        //   { "path": "/a/b/1.txt", "blob": { "id": "123", "size": 956  } },
        //   { "path": "/a/c/2.exe", "blob": { "id": "456", "size": 2730 } },
        //   { "path": "/x/f.pdb",   "blob": { "id": "789", "size": 3886 } },
        //   { "path" : "/a/s/d", "type" : "EmptyDirectory"} 
        // ]

        let items: DedupFileContainerItem[] = [];
        let dirSet = new Set<string>(); // A set to cache all the directory paths to avoid duplicated folder entries.

        for (let entry of manifest) {
            let path: string = <string>entry.path; // "path": "/a/b/1.txt"
            path = path.replace(/\\/g, '/'); // canonicalization is necessary as on Windows '\' may be used as path separator.
            let index: number = 0, base: number = 0;
            if (path.startsWith('/')) {
                base = index = 1;
            }

            // Add parent directories
            while ((index = path.indexOf('/', index)) != -1) {
                let dirpath: string = path.substring(base, index);
                if (!dirSet.has(dirpath)) {
                    dirSet.add(dirpath);
                    let item = new DedupFileContainerItem();
                    item.itemType = FileContainer_Contracts.ContainerItemType.Folder;
                    item.path = dirpath;
                    items.push(item);
                }
                index++;
            }

            // Add file
            if (entry.blob != null) {
                let data: any = entry.blob; // "blob": { "id": "123", "size": 956 }
                let item = new DedupFileContainerItem();
                item.dedupId = data.id;
                item.path = path.substring(base);
                item.fileLength = data.size;
                item.itemType = FileContainer_Contracts.ContainerItemType.File;
                items.push(item);
            }
            else if (entry.type == "EmptyDirectory") { // Add the empty directory.
                let item = new DedupFileContainerItem();
                item.path = path.substring(base);
                item.itemType = FileContainer_Contracts.ContainerItemType.Folder;
                items.push(item);
            }

        }

        return items;
    }
}
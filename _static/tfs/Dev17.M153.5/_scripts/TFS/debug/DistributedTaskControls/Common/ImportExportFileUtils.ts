export class ImportExportFileUtils {
    /**
     * 
     * @param fileStrContent - The content that would go inside the file
     * @param fileName - File name. Make sure this has the .json extension
     */
    public static downloadExportedJSONFileContent(fileStrContent: string, fileName: string): void {
        let file = new Blob([fileStrContent], { type: "application/json" });

        //needed for IE10
        if (window.navigator && window.navigator.msSaveBlob) {
            window.navigator.msSaveBlob(file, fileName);
        }
        else {
            // refer to the link http://stackoverflow.com/questions/31214677/download-a-reactjs-object-as-a-file for details
            // There is a package react-file-download (https://www.npmjs.com/package/react-file-download), but we do not have this 
            // downloaded in our repo.
            //
            // So we are using this approach as has been answered in the stack overflow thread mentioned above
            let a = document.createElement("a");
            document.body.appendChild(a);
            a.href = URL.createObjectURL(file);
            a.setAttribute("download", fileName);
            a.click();
        }
    }

    /**
     * 
     * @param storageKey Identifier in the session storage
     * @param strContent String content to be stored
     * @param timeout (in milliseconds) time after which the session storage data will be deleted
     */
    public static saveFileContentToSessionStorageWithTimeout(storageKey: string, strContent: string, timeout?: number): void {
        if (!storageKey) {
            throw new Error("ImportExportFileUtils.saveFileContentToSessionStorage : storageKey is null or empty");
        }

        window.sessionStorage.setItem(storageKey, strContent);

        if (!!timeout) {
            setTimeout(() => { window.sessionStorage.removeItem(storageKey); }, timeout);
        }
    }

    /**
     * 
     * @param storageKey Identifier in the session storage
     */
    public static getAndRemoveFileContentFromSessionStorage(storageKey: string): string {
        const fileContent = window.sessionStorage.getItem(storageKey);
        window.sessionStorage.removeItem(storageKey);
        return fileContent;
    }
}
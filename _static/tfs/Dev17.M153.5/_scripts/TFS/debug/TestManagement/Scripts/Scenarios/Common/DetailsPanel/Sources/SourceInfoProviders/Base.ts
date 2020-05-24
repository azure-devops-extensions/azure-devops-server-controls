import { IFilePathData } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";

export class BaseSourceInfoProvider {
    protected rootFilesAndFolder: string[] = null;
    protected shouldGetRootFilesAndFolder = false;
    protected buildSourceDirectory: string = null;

    /**
     * Remove build source directory path if path is a full path.
     * @param filePathData information about the file path
     */
    protected removeSourceDirectoryFromPath(filePathData: IFilePathData): boolean {
        let directory: string = null;

        if (filePathData.isFullPath) {
            
            // We already figured out buildSourceDirectory, then just truncate that from the begining of file path.
            if (this.buildSourceDirectory) {
                if (filePathData.filePath.startsWith(this.buildSourceDirectory)) {
                    filePathData.filePath = filePathData.filePath.substring(this.buildSourceDirectory.length);
                    return true;
                }

                return false;
            }
            else if (!!this.rootFilesAndFolder) {
                // If we know the sorce root files and folder then 
                // split the file path by "\" and pick one by one and match it to the sorce root files and folder
                // If we get the match then left of that point is build source directory.
                let breakIntoFolder = filePathData.filePath.split("\\");

                for (var i = 0; i < breakIntoFolder.length; i++) {
                    if (this.rootFilesAndFolder.indexOf(breakIntoFolder[i]) <= -1) {
                        if (directory) {
                            directory = directory + "\\" + breakIntoFolder[i];
                        }
                        else {
                            directory = breakIntoFolder[i];
                        }
                    }
                    else {
                        filePathData.filePath = filePathData.filePath.substring(directory.length);
                        this.buildSourceDirectory = directory;
                        return true;
                    }
                }

                return false;
            }
            else {
                // If we dont have sorce root files and folder then we will not be able to truncate build source directory path.
                return false;
            }
        }
        else {
            // Nothing to do, path is a relative path.
            return true;
        }
    }
}

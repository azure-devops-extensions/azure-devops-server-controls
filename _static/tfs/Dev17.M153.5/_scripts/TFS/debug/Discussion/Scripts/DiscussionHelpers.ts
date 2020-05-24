
export interface IDragDropDataTransferItem {
    /* We need the source information to identify if we should act on the event */
    source: string;
    text: string;
}

export class DiscussionHelpers {

    /**
    * Returns array of files if the DataTransfer of an event contains one or more files
    * 
    * @param dataTransfer of a drop event
    */
    public static getFileArrayFromDataTransfer(dataTransfer: DataTransfer): File[] {

        let fileArray: File[] = [];
        if (dataTransfer && dataTransfer.items) {
            for (let i = 0; i < dataTransfer.items.length; ++i) {
                let file = dataTransfer.items[i].getAsFile();
                if (file) {
                    fileArray.push(file);
                }
            }
        }
        else if (dataTransfer && dataTransfer.files) {
            // ie uses dataTransfer.files instead of dataTransfer.items
            for (let i = 0; i < dataTransfer.files.length; ++i) {
                let file = dataTransfer.files[i];
                if (file) {
                    fileArray.push(file);
                }
            }
        }

        return fileArray;
    }
}

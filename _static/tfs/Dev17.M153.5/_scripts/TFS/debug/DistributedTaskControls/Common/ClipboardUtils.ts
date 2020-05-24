import { empty } from "VSS/Utils/String";

export class ClipboardUtils {

    public static getPastedText(clipboardEvent: ClipboardEvent): string {
        let pastedText: string = empty;
        
        if (clipboardEvent && clipboardEvent.clipboardData) {
            // Modern browsers
            pastedText = clipboardEvent.clipboardData.getData("text/plain");
        }
        else {
            // IE
            let ieWindow = window as any;
            if (ieWindow.clipboardData && ieWindow.clipboardData.getData) {
                pastedText = ieWindow.clipboardData.getData("Text");
            }
        }

        return pastedText;
    }
}
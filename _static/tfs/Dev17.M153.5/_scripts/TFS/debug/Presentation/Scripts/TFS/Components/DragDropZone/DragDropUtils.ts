export class DragDropUtils {
    public static TYPE_PREFIX_CLASS = "drag-drop";

    /**
     * What: Convert an array of string into a class prefixed selector.
     * Why: Need to have a specific class to have only proper defined type to be dropped from speficic drag type
     * Example: A drop zone can have ["task", "feature"] and a dropzone ["feature"] which allow the last one to be dropped      
     *      the Dom will have a class for the drag zone of "drag-drop-feature" as well as the drop-zone "drag-drop-feature drag-drop-task"
     * @return {string} : In case of invalid input, the return is an empty string (no class)
     */
    public static arrayTypesToStringSelectorClasses(types: string[]): string {
        if (!DragDropUtils.isTypeDefined(types)) {
            return "";
        }
        return types.map(t => "." + DragDropUtils.TYPE_PREFIX_CLASS + "-" + t).join(" ");
    }

    /**
     * What: Convert an array of string into a class prefixed by a drag and drop string.
     * Why: Need to have a specific class to have only proper defined type to be dropped from speficic drag type
     * Example: A drop zone can have ["task", "feature"] and a dropzone ["feature"] which allow the last one to be dropped      
     *      the Dom will have a class for the drag zone of "drag-drop-feature" as well as the drop-zone "drag-drop-feature drag-drop-task"
     * @return {string} : In case of invalid input, the return is an empty string (no class)
     */
    public static arrayTypesToStringClasses(types: string[]): string {
        if (!DragDropUtils.isTypeDefined(types)) {
            return "";
        }
        return types.map(t => DragDropUtils.TYPE_PREFIX_CLASS + "-" + t).join(" ");
    }

    private static isTypeDefined(types: string[]): boolean {
        return !!types && types.length > 0;
    }
}
import * as Utils_String from "VSS/Utils/String";

/**
 * Helper class which contains some utils method for sources
 */
export class SourcesUtils {

    // Compares the provided input in combo box with branch present, 
    // if is matched, 0 is returned otherwise 1 or -1
    public static branchFilterComparer(branch: string, input: string): number {

        let matching: number = 0;

        // If nothing is provided, every branch should be displayed
        if (!input || input.trim().length === 0 || !branch) {
            return matching;
        }

        let trimmedInput = input.trim();
        let trimmedBranch = branch.trim();

        // Check if "*" matching is required
        // Permitted only at the end
        if (trimmedInput.lastIndexOf("*") === trimmedInput.length - 1) {
            return SourcesUtils.branchFilterComparer(branch, input.substr(0, trimmedInput.length - 1));
        }

        return Utils_String.localeIgnoreCaseComparer(trimmedBranch.substr(0, trimmedInput.length), trimmedInput);
    }
}
import { CommandBar } from "OfficeFabric/CommandBar";
import { Fabric } from "OfficeFabric/Fabric";

/**
 * Holds references to select React components and provides methods to set the focus on them with visible focus styling.
 */
export class FocusManager {
    private commandBar: CommandBar;
    private page: Fabric;

    /**
     * Set the page Fabric container to allow updating for keyboard focus styling.
     */
    public setPage = (page: Fabric): void => {
        this.page = page;
    }

    /**
     * Set a command bar for subsequent focusing.
     */
    public setCommandBar = (commandBar: CommandBar): void => {
        this.commandBar = commandBar;
    }

    /**
    * Set keyboard focus on the previously referenced command bar.
    */
    public setFocusToCommandBar = (): void => {
        if (this.commandBar) {
            this.commandBar.focus();
            this.showFocusStyling();
        }
    }

    // HACK: To apply the keyboard focus border styles, the page adds an 'is-focusVisible' class based on isFocusVisible.
    // A hackier alternative to calling setState() externally would be to trigger a navigational keyboard event that would do the same.
    // We'll start a discussion with the Fabric team for a better way.
    private showFocusStyling() {
        if (this.page) {
            this.page.setState({ isFocusVisible: true });
        }
    }
}
import { NavigationView } from "VSS/Controls/Navigation";

// this ensures that buttons work on fabric dialogs opened from other fabric dialogs
import "VSS/LoaderPlugins/Css!fabric";

export class BuildViewBase extends NavigationView {
    initialize(): void {
        super.initialize();
        this._element.attr("role", "main");
    }
}
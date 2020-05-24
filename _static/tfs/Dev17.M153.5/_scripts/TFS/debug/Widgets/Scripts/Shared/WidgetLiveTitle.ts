import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");


/** Interim extension interface for Widget Configurations to attach their data on */
export interface ITrackName {
    /** This is reserved for use by Widget Live Title. It records the last saved name, when an artifact is used to set the title. */
    lastArtifactName?: string;
}

export class WidgetLiveTitleViewer {
    public static getLiveTitle(
        currentWidgetName: string,
        widgetCustomSettings: ITrackName,
        currentArtifactName: string): string {

        //The last name of the artifactwith
        var lastArtifactName = widgetCustomSettings.lastArtifactName; 

        //By default, the saved widget name is what should be shown.
        var resultName = currentWidgetName;

        //If the saved name is unset, there is no worse option than the current artifact name.
        //If saved name was set to the last known name of the artifact, let's use the current artifact name. 
        if ((currentWidgetName == null || currentWidgetName == ""  ||
            currentWidgetName == lastArtifactName) && (currentArtifactName != null && currentArtifactName != "")) {
            resultName = currentArtifactName;
        }

        return resultName;
    }
}

/** Manages state for applying a live title to a widget.
 * This class provides plumbing for binding the current artifact to the Widget
 * It does this by ensuring the Widget title uses the latest known artifact name, whenever the user saves
 * the title with the last known artifact name, a blank name, or a default name.
 * During state changes which affect the title, a widget needs to work in the following sequence, to avoid failures to properly update:
 * 1- updateTitle (This needs to happen first, so we can check the old title state)
 * 2- appendToSettings (This needs to happen after updateTitle to be aware of the latest name of the artifact)
 * 3- Widget needs to NotifyChange, with settings which have been updated with the latest artifact name from step 2
 */
export class WidgetLiveTitleEditor {
    private lastArtifactName: string;
    private defaultName: string;

    /** Construct this class by providing the last name the widget was saved as. */
    constructor(lastArtifactName: string, defaultName:string) {
        this.lastArtifactName = lastArtifactName;
        this.defaultName = defaultName;
    }

    /** Instantiates the class from Custom settings.
     *
     * from the Custom Settings object, the Last saved name property is used to track user intent of applying the artifact title.
     * defaultWidgetName is the name the Widget is given by the Catalog at creation time, before a user has customized, and can be overridden.
    */
    public static fromSettings(widgetCustomSettings: ITrackName, defaultName: string = null): WidgetLiveTitleEditor {
        var lastArtifactName = null;
        if (widgetCustomSettings && widgetCustomSettings.lastArtifactName) {
            lastArtifactName = widgetCustomSettings.lastArtifactName
        }
        return new WidgetLiveTitleEditor(lastArtifactName, defaultName);
    }

    /** Returns the last Saved name */
    private getLastSavedName() : string {
        return this.lastArtifactName;
    }

    /** This ensures that a bound title is updated in relation to the latest known name of the selected artifact */
    public updateTitleOnLatestArtifact(widgetConfigContext: Dashboard_Shared_Contracts.IConfigureWidgetName,
        currentArtifactName: string): void {

        //First, the current State
        var currentSavedName = widgetConfigContext.getCurrentWidgetName(); 

        //Now, we check if we can override
        // 1 - the name has been user-Customized, or is it in a default state which we should keep current.
        // 2 - Does the artifact have a name we can safely apply over default?
        var canOverride: boolean = this._canOverrideCurrentSavedName(currentSavedName, currentArtifactName) &&
            currentArtifactName != null &&
            currentArtifactName != "";

        //This allows us to verify the saved name next time, when the underlying artifact name changes
        //Note: We always record, in case the user sets title to match name
        this.lastArtifactName = currentArtifactName; 

        //We take the current name, Write it into the config, and record the last known name 
        //(assuming it is different)
        if (canOverride) {
            //We only need to send a change when state is dirty, and we would be overriding the current Widget name
            if (currentArtifactName != currentSavedName) {
                widgetConfigContext.setCurrentWidgetName(currentArtifactName);
            }
        }
    }

    /** Internal Policy to detect if we are a go to overide the saved Name (due to lack of customization)*/
    public _canOverrideCurrentSavedName(currentSavedName: string, currentArtifactName:string): boolean {
        var canOverride= (currentSavedName == null ||        //Case 1 - User cleared the name
            currentSavedName == "" ||
            currentSavedName == this.lastArtifactName ||        //Case 2a - User has not renamed from the last name we set
            currentSavedName == currentArtifactName ||       //Case 2b - User set the name to match the artifact
            currentSavedName == this.defaultName);           //Case 3 - User has not renamed from the default name        

        return canOverride;
    }

    /** This tags the last saved name to customsettings (if we are actively tracking).
     * This needs to be applied to preserve user intent before saving a widget.
     */
    public appendToSettings(widgetCustomSettings: ITrackName) {
        widgetCustomSettings.lastArtifactName = this.lastArtifactName;
    }
}

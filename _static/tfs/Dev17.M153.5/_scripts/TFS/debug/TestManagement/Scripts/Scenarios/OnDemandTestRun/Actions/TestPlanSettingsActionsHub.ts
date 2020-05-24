import { Action } from "VSS/Flux/Action";

export class TestPlanSettingsActionsHub{
    public closeDialog = new Action<void>();
    public tabChanged = new Action<string>();
    public testOutcomeSettingsChanged = new Action<boolean>();
    public fetchingBuildDefinitions = new Action<boolean>();
    public fetchedBuildDefinitions = new Action<IKeyValuePair<number, string>[]>();
    public fetchingBuilds = new Action<boolean>();
    public fetchedBuilds = new Action<IKeyValuePair<number, string>[]>();
    public fetchingReleaseDefinitions = new Action<boolean>();
    public fetchedReleaseDefinitions = new Action<IKeyValuePair<number, string>[]>();
    public fetchingReleaseEnvDefinitions = new Action<boolean>();
    public fetchedReleaseEnvDefinitions = new Action<IKeyValuePair<number, string>[]>();
    public fetchedTestOutcomeSettings = new Action<boolean>();
    public buildDefinitionChanged = new Action<number>();
    public buildChanged = new Action<number>();
    public releaseDefinitionChanged = new Action<number>();
    public releaseEnvDefinitionChanged = new Action<number>();
    public savingSettings = new Action<void>();
    public onError = new Action<string>();
    public onErrorMessageClose = new Action<void>();
}

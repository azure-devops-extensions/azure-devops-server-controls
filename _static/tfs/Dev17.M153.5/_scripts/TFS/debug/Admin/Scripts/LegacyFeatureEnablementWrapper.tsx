import * as React from "react";
import { registerLWPComponent } from "VSS/LWP";
import { WizardManager } from "Admin/Scripts/TFS.Admin.FeatureEnablement";

export class LegacyFeatureEnablementWrapper extends React.Component<{}, {}> {
    public render() {
      var wizardManager = new WizardManager();
      wizardManager.showDialog({
        close: function() { }
      });
      return null;
    }
}

registerLWPComponent(
  "legacyFeatureEnablementWrapper",
  LegacyFeatureEnablementWrapper
);

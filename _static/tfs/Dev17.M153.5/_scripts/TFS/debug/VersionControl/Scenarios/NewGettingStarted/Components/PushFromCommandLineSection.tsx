import * as React from "react";
import { PivotedTextBoxWithCopy, IPivotedTextBoxPair } from "VSSPreview/Flux/Components/PivotedTextBoxWithCopy";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/PushFromCommandLineSection";

export interface PushFromCommandLineSectionProps {
    pushCommandPairs: IPivotedTextBoxPair[];
    toggleButtonSelectedKey: string;
    onToggleButtonClicked(newSelectedText: string): void;
}

export const PushFromCommandLineSection = (props: PushFromCommandLineSectionProps): JSX.Element => {
    return (
        <div className="push-from-command-line-section">
            <PivotedTextBoxWithCopy
                pairs={props.pushCommandPairs}
                tooltipBeforeCopied={VCResources.EmptyRepo_PushCommandsCopyButtonTooltipBeforeCopied}
                tooltipAfterCopied={VCResources.EmptyRepo_PushCommandsCopyButtonTooltipAfterCopied}
                selectedKey={props.toggleButtonSelectedKey}
                onToggle={props.onToggleButtonClicked}
                multiLine={true}
                />
        </div >
    );
}
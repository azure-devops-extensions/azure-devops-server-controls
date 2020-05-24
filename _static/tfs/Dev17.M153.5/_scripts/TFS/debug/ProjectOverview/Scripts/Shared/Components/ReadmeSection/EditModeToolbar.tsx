import * as React from "react";
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { Pivot, PivotItem, PivotLinkFormat, PivotLinkSize } from "OfficeFabric/Pivot";

import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface EditModeToolbarProps {
    commandsOptions: CommandsOptions;
    onPivotItemClick: (itemKey: string) => void;
}

export interface CommandsOptions {
    isGit?: boolean;
    isDirty?: boolean;
    isDiffInline?: boolean;
    showToggleInlineDiff?: boolean;
    promptSaveEditingFile: () => void;
    discardEditingFile: () => void;
    toggleEditingDiffInlineClicked: () => void;
    setCommandBar: (commandBar: CommandBar) => void;
}

export class EditModeToolbar extends React.Component<EditModeToolbarProps, {}> {
    public render(): JSX.Element {
        return <div className="edit-readme-toolbar">
            <div className="views">
                <Pivot
                    linkFormat={PivotLinkFormat.links}
                    linkSize={PivotLinkSize.normal}
                    headersOnly={true}
                    getTabId={getEditTabId}
                    onLinkClick={(item) => this.props.onPivotItemClick(item.props.itemKey)}>
                    <PivotItem linkText={VCResources.Contents} itemKey={VersionControlActionIds.Contents} />
                    <PivotItem linkText={VCResources.Preview} itemKey={VersionControlActionIds.Preview} />
                    <PivotItem linkText={VCResources.HighlightChanges} itemKey={VersionControlActionIds.HighlightChanges} />
                </Pivot>
            </div>
            <CommandBar
                className="edit-readme-item-command-bar"
                items={[]}
                farItems={getCommandsInBar(this.props.commandsOptions)}
                ref={(commandBar) => {this.props.commandsOptions.setCommandBar(commandBar)}}
            />
        </div>;
    }
}

export function getEditTabId(itemKey: string): string {
    return `EditTab_${itemKey}`;
}

interface CommandCreator {
    (options: CommandsOptions, index: number): IContextualMenuItem;
}

function getCommandsInBar(props: CommandsOptions): IContextualMenuItem[] {
    const fileEditingCreators: CommandCreator[] = [
        creators.save,
        creators.discard,
        creators.toggleInlineDiff,
    ];
    return fileEditingCreators
        .map((creator, index) => creator(props, index))
        .map(fulfillCommand)
        .filter(command => command);
}

function fulfillCommand(command: IContextualMenuItem): IContextualMenuItem {
    if (command) {
        if (command.disabled) {
            command["aria-disabled"] = true;
        }
    }

    return command;
}

const creators = {
    save: ({ promptSaveEditingFile, isGit, isDirty }: CommandsOptions) => ({
        key: "save",
        name: isGit ? VCResources.EditFileCommit : VCResources.EditFileCheckin,
        disabled: !isDirty,
        iconProps: getMenuIcon("bowtie-save"),
        onClick: promptSaveEditingFile,
    }),
    discard: ({ discardEditingFile, isDirty }: CommandsOptions) => ({
        key: "discard",
        name: isDirty ? VCResources.EditFileDiscard : VCResources.EditFileCancel,
        iconProps: getMenuIcon(isDirty ? "bowtie-edit-undo" : "bowtie-math-multiply"),
        onClick: discardEditingFile,
    }),
    toggleInlineDiff: ({ toggleEditingDiffInlineClicked, isDiffInline, showToggleInlineDiff }: CommandsOptions) =>
        (showToggleInlineDiff) && {
            key: "toggleInlineDiff",
            name: isDiffInline ? VCResources.EditFileDiffSideBySide : VCResources.EditFileDiffInline,
            iconProps: getMenuIcon(isDiffInline ? "bowtie-diff-side-by-side" : "bowtie-diff-inline"),
            onClick: toggleEditingDiffInlineClicked,
        },
};

function getMenuIcon(name: string): IIconProps {
    return { className: "bowtie-icon " + name, iconName: undefined };
}

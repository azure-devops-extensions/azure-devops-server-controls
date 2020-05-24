/// <reference types="react" />

import React = require("react");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";

import { BuildLinks, DefinitionsActions } from "Build.Common/Scripts/Linking";
import { isDefinitionNameValid } from "Build.Common/Scripts/Validation";

import { InlineRename } from "Presentation/Scripts/TFS/Components/InlineRename";

import { getCollectionService } from "VSS/Service";

export interface DefinitionNameEditorProps {
    id: number;
    name: string;
    readonly: boolean;
}

export class DefinitionNameEditor extends React.Component<DefinitionNameEditorProps, any> {
    public render(): JSX.Element {
        let pageUrl = BuildLinks.getDefinitionLink(this.props.id);
        return <InlineRename id={this.props.id.toString()} isReadOnly={this.props.readonly} text={this.props.name} validate={this._isDefinitionNameValid} submit={this._saveDefinitionName} pageUrl={pageUrl} placeHolder={BuildResources.EditDefinitionNamePlaceholder} type={BuildResources.BuildDefinitionNameCopyType} />;
    }

    public shouldComponentUpdate(nextProps: DefinitionNameEditorProps): boolean {
        return nextProps.id !== this.props.id
            || nextProps.name !== this.props.name;
    }

    private _isDefinitionNameValid = (name: string): boolean => {
        return isDefinitionNameValid(name);
    }

    private _saveDefinitionName = (name: string): void => {
        let definitionSource = getCollectionService(DefinitionSource);
        definitionSource.renameDefinition(this.props.id, name);
    }
}

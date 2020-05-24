/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Fields/Components/CollectionFieldsPivot";

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { PageLearnMoreLink } from "WorkCustomization/Scripts/Common/Components/LearnMoreLink";
import { CollectionFieldsGrid } from "WorkCustomization/Scripts/Views/Fields/Components/CollectionFieldsGrid";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export class CollectionFieldsPivot extends Component<Props, State> {
    render(): JSX.Element {
        return <CollectionFieldsGrid />
    }
}
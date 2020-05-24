import * as React from "react";
import * as Button from "OfficeFabric/Button";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { IHubHeaderProps } from "MyExperiences/Scenarios/Shared/Models";
import { HubFilterBox } from "MyExperiences/Scenarios/Shared/Components/HubFilterBox";
import * as  OrganizationInfoAndCollectionsPickerSection_Async from "MyExperiences/Scenarios/Shared/Components/OrganizationInfoAndCollectionsPickerSection";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubHeader";

import "VSS/LoaderPlugins/Css!fabric";

const AsyncOrganizationInfoAndCollectionsPickerSection = getAsyncLoadedComponent(
    ["MyExperiences/Scenarios/Shared/Components/OrganizationInfoAndCollectionsPickerSection"],
    (m: typeof OrganizationInfoAndCollectionsPickerSection_Async) => m.OrganizationInfoAndCollectionsPickerSection,
    () => <div className="org-info-and-collection-picker-placeholder" />
);

export const HubHeader: React.StatelessComponent<IHubHeaderProps> = (props: IHubHeaderProps): JSX.Element => {
    return (
        <header className="header bowtie">
            <div className="left-section">
                {_renderLeftSection(props)}
            </div>
            <div className="right-section">
                {_renderFilter(props)}
                {_renderButton(props)}
            </div>
        </header>
    );
};

function _renderLeftSection(props: IHubHeaderProps): JSX.Element {
    if (!props.organizationInfoAndCollectionPickerProps && !props.title) {
        return null;
    }

    if (!props.isOrganizationInfoAndCollectionPickerEnabled) {
        return <h1 className="title ms-font-xl">{props.title}</h1>;
    } else {
        return <AsyncOrganizationInfoAndCollectionsPickerSection {...props.organizationInfoAndCollectionPickerProps} />;
    }
}

function _renderFilter(props: IHubHeaderProps): JSX.Element {
    if (!props.filter) {
        return null;
    }

    return <HubFilterBox {...props.filter} />;
}

function _renderButton(props: IHubHeaderProps): JSX.Element {
    if (!props.button) {
        return null;
    }

    const buttonProps: Button.IButtonProps = {
        onClick: props.button.onClick,
        className: "bowtie-widget cta",
    };

    return (
        <div className="bowtie-fabric">
            <Button.PrimaryButton {...buttonProps}>
                {props.button.text}
            </Button.PrimaryButton>
        </div>
    );
}

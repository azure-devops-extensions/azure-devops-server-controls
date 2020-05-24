import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");

import BuildContracts = require("TFS/Build/Contracts");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";

/**
 * Describes an object that can create a specific repository type
 */
export interface RepositoryFactory {
    /**
     * Indicates whether primary or not.
     */
    isPrimary: boolean;

    /**
     * The text to display
     */
    displayText: string;

    /**
     * The repository type
     */
    type: string;

    /**
     * The CSS class for the icon
     */
    icon: string;

    /**
     * Creates a repository data contract
     */
    createNewRepository(repoContext?: RepositoryContext): IPromise<BuildContracts.BuildRepository>;

    /**
     * Creates a view model from a data contract
     * @param definitionId The definition id
     * @param repository The repository data contract
     */
    createRepositoryViewModel(definitionId: number, repository: BuildContracts.BuildRepository): IPromise<RepositoryEditor.RepositoryEditorViewModel>;

    /**
     * Creates a repository block with icon and display text, to be displayed in template wizard
     */
    repositoryBlock: IRepositorySourceBlock;
}

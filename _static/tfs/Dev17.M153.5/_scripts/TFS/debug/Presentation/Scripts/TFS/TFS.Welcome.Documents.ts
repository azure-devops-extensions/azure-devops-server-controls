import TFS_Core_Contracts = require("TFS/Core/Contracts");
import VSS = require("VSS/VSS");

export interface IProjectRepository {
    getRepositoryName(): string;
    getRepositoryType(): number;
    createDefaultDocument(): DocumentFile; //implement in derived class
    createDocument(path): DocumentFile;
}

export interface IWelcomeDocumentProvider {
    beginGetProjectDocumentation(): JQueryPromise<ProjectDocumentation>;
    getExplorerUrl(document: DocumentFile): string;
    getFileContentUrl(document: DocumentFile): string;
    hasDefaultRepository(): boolean;
    beginGetProjectRepositories(defaultRepositoryType: TFS_Core_Contracts.SourceControlTypes): JQueryPromise<Array<IProjectRepository>>;
    }

export class DocumentPluginManager {
    private static _documentProviderDictionary: { [name: string]: () => IWelcomeDocumentProvider; } = {};

    public static GetPlugin(id: string): IWelcomeDocumentProvider {
        if (DocumentPluginManager._documentProviderDictionary[id]) {
            return DocumentPluginManager._documentProviderDictionary[id]();
        }
    }

    public static RegisterPlugin(id: string, callback: () => IWelcomeDocumentProvider): void {
        DocumentPluginManager._documentProviderDictionary[id] = callback;
    }
}

export class ProjectDocumentation {
    public name: string;
    public projectDocument: DocumentFile;
    public sectionDocumentation: SectionDocumentation[];

    constructor(name: string, projectDocument: DocumentFile) {
        this.name = name;
        this.projectDocument = projectDocument;
        this.sectionDocumentation = new Array<SectionDocumentation>();
    }
}

export class SectionDocumentation {
    public name: string;
    public sectionDocument: DocumentFile;
    public subsectionDocumentation: SubsectionDocumentation[];

    constructor(name: string, sectionDocument: DocumentFile) {
        this.name = name;
        this.sectionDocument = sectionDocument;
        this.subsectionDocumentation = new Array<SubsectionDocumentation>();
    }
}

export class SubsectionDocumentation {
    public subsectionDocument: DocumentFile;
    public name: string;
}

export class DocumentFile {
    public exists: Exists;
    public name: string;
    public parentName: string;
    public path: string;

    constructor(path: string, name: string, parentName: string, exists: Exists) {
        this.path = path;
        this.name = name;
        this.parentName = parentName;
        this.exists = exists;
    }

    /**
    * Returns a value indicating whether the document file matches the name and path which are passed in as parameters.
    */
    public equals(name: string, path: string): boolean {
        return this.name.toLowerCase() === name.toLowerCase() && this.path.toLowerCase() === path.toLowerCase();
    }

    public clone(): DocumentFile {
        throw new Error("This should be overriden in the derived class.");
    }
}

export enum Exists {
    Unknown = 0,
    No = 1,
    Yes = 2
}

export class DocumentConstants {
    public static DEFAULT_FILE_PATH: string = "/README.md";
    public static DEFAULT_FILE_NAME: string = "readme";
    public static MARKDOWN_FILE_EXT: string = "md";
}

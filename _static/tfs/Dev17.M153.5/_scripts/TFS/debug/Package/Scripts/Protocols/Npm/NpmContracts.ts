/* tslint:disable:interface-name */
import { IPerson } from "Package/Scripts/Protocols/Common/IPerson";

export interface BugTracker {
    email: string;
    url: string;
}

/**
 * Describes the structure of the package
 */
export interface Directories {
    /**
     * Folder containing binaries
     */
    binariesFolder: string;
    /**
     * Folder containing markdown files
     */
    documentationFolder: string;
    /**
     * Folder containing example scripts
     */
    examplesFolder: string;
    /**
     * Folder containing the library
     */
    libraryFolder: string;
    /**
     * Folder containing man(ual) pages
     */
    manualPagesFolder: string;
}

export interface NpmProtocolMetadata {
    author: IPerson;
    /**
     * Executable files that should be put on the PATH.  An empty string key indicates the current package name.
     */
    binaries: { [key: string]: string };
    /**
     * Information about a bug tracker the package uses
     */
    bugs: BugTracker;
    /**
     * Configuration parameters for the scripts property
     */
    config: { [key: string]: string };
    /**
     * Contributors to the package
     */
    contributors: IPerson[];
    /**
     * Deprecation message for the package
     */
    deprecated: string;
    /**
     * Directory paths for various package content, such as "lib", "bin", and "man"
     */
    directories: Directories;
    engines: { [key: string]: string };
    /**
     * Treat this package as if the engine-strict config param was set: Deprecated in npm 3.0.0
     */
    engineStrict: any;
    /**
     * File patterns to include in the project
     */
    files: string[];
    /**
     * Homepage for the package
     */
    homepage: string;
    /**
     * Information about the license the package useses
     */
    license: string;
    /**
     * ModuleID of the Main entry point for the package, relative to the root of the package.
     */
    main: string;
    /**
     * Man(page) files
     */
    manualPages: any;
    /**
     * Operating systems that this package can run on
     */
    operatingSystem: string[];
    /**
     * Provide a warning if package is install locally
     */
    preferGlobal: boolean;
    privatePackage: boolean;
    /**
     * CPU architectures that this package can run on
     */
    processorArchitecture: string[];
    /**
     * Config parameters used during publishing.
     */
    publishConfig: { [key: string]: string };
    /**
     * Source code repository associated with the package
     */
    repository: Repository;
    /**
     * A map of npm lifecycle events to scripts to run. See https://docs.npmjs.com/misc/scripts
     */
    scripts: { [key: string]: string };
}

export interface Repository {
    /**
     * Type of the repo (git/hg/svn/etc)
     */
    type: string;
    /**
     * A URL string that can be passed to npm install.  If this is set, URL should be null. See https://docs.npmjs.com/cli/install for different formats if we eventually decide to parse this.
     */
    shortcutSyntax: string;
    /**
     * VCS URL, not necessarily a public web URL.
     */
    url: string;
}

export interface Package {
    _links: any;
    /**
     * Deprecated message, if any, for the package
     */
    deprecateMessage: string;
    id: string;
    /**
     * The display name of the package
     */
    name: string;
    /**
     * If and when the package was deleted
     */
    unpublishedDate: Date;
    /**
     * The version of the package
     */
    version: string;
}

export interface PackageVersionDetails {
    /**
     * Indicates the deprecate message of a package version
     */
    deprecateMessage: string;
}

export let TypeInfo = {
    Package: <any>{},
    PackageMetadata: <any>{}
};

TypeInfo.Package.fields = {
    unpublishedDate: {
        isDate: true
    }
};

TypeInfo.PackageMetadata.fields = {
    time: {
        isDictionary: true
    }
};

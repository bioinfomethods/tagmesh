/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
declare class Tag {
    name: string;
    color: string;
    constructor(name: string, color: string);
    toJSON(): {
        id: string;
        name: string;
    };
}
/**
 *  the identity of a participant that creates of modifies tags
 */
declare class User {
    username: string;
    email: string;
    constructor(username: string, email: string);
}
/**
 * Represents a tag and associated tag metadata such as notes and color to
 * display
 */
declare class Annotation {
    /**
     * Name of the tag
     */
    tagDefinition: Tag;
    /**
     * Notes associated with this annotation
     */
    notes: string;
    /**
     * Username of user who creted this annotation
     */
    username: string | null;
    get tag(): string;
    get color(): string;
    constructor(tag: Tag, notes: string, username: string | null);
}
/**
 * Type safe access to entry annotation map
 */
type EntityAnnotations = {
    [key: string]: Annotation;
};
/**
 * Represents an Entity that has annotations / tags attached to it.
 *
 * Entities have a unique identifier, name, and set of annotations (tags).
 * This class is used to manage the identity and metadata of an entity within a system.
 */
declare class Entity {
    /**
     * Unique identifier for the Entity, typically set to the name initially.
     */
    id: string;
    /**
     * Human-readable name of the Entity.
     */
    name: string;
    /**
     * Type of the entity. Entity types are optional, but when provided will
     * (in the future) enable linkage to a schema that can define metadata
     * about the tags that are assigned and constraints on them.
     */
    type: string | null;
    /**
     * Annotations or tags associated with the Entity.
     *
     * This is a dictionary object where each key-value pair represents an
     * annotation or tag applied to the Entity.
     */
    tags: EntityAnnotations;
    /**
     * Constructs a new instance of the Entity class.
     *
     * @param name The name of the entity which will also be used as the initial identifier.
     */
    constructor(name: string, type?: string);
}
/**
 * Options to configure the tag repository
 */
interface TagRepositoryOptions {
    /**
     * Passed through to PouchDB constructor as configuration options
     */
    pouchAdapter: Object | null;
    /**
     * URL of couchdb server. For access through the bundled Ngnix server,
     * use the address of server + '/db'
     */
    serverURL: string | null;
}
type RepositoryEntities = {
    [key: string]: Entity;
};
type TagDefinitions = {
    [key: string]: Tag;
};
type TagRepoConnectOptions = {
    couchBaseURL: string;
    username?: string | null;
    password?: string | null;
    headers?: {
        [key: string]: string;
    };
};
/**
 * The main class for interfacing with tag mesh from end user code.
 *
 * Provides functions to load, save, remove and update tags and their annotations
 * for a given subject. In the tagmesh model, each subject of annotations is managed
 * by a separate tag repository, and has a unique document ID under which data is
 * saved in local or remote state databases.
 *
 * To provide secure access, TagRepository relies on cryptographically generated
 * document ids; that is, the primary method by which a document is protected is
 * that its document id is an unguessable cryptographic identifier. Users are
 * granted access to subjects by providing them either directly with the document
 * id for the subject, or the underlying secrets needed to compute it. The root of
 * security is the <code>repositorySecretRoot</code> which is used to salt
 * all other computed secrets. This should be set once by your application and
 * should be common across all applications that share the set of subjects
 * that are to be collaboratively annotated.
 */
declare class TagRepository {
    /**
     * Salt used in hashing to produce unguessable document ids
     */
    static repositorySecretRoot: string;
    /**
     * Prefix used for document ids - set to something specifc to your application
     * if you want multiple applications to share the same document store.
     */
    static metaDataDocumentIdRoot: string;
    /**
     * The secure document id of this TagRepository
     *
     * This is created from a salted hash of subject id and the metaDataDocumentIdRoot
     */
    metaDataDocumentId: string;
    /**
     * Prefix added to entities within this tag repository to ensure they are
     * unique to the subject
     */
    subject_id: string;
    /**
     * All the annotations in the repository
     *
     * This is a dictionary object where keys are entity ids and values are entities
     */
    userAnnotations: RepositoryEntities;
    /**
     * The URL of the server to which this TagRepository will attempt to connect
     */
    serverURL: string | null;
    /**
     * Internal PouchDB database used to store entities
     */
    pouch: PouchDB.Database;
    /**
     * Remote couch db database if one is connected
     */
    couch: PouchDB.Database | null;
    /**
     * The database where cross-patient schema information is stored
     */
    schema_db: PouchDB.Database;
    /**
     * Remote database where cross-patient schema information is stored
     */
    schema_db_couch: PouchDB.Database | null;
    /**
     * User who was authenticated. Null until successful authentiction
     * with `connect` method.
     */
    user: User | null;
    /**
     * Set to true if currently connected to a remote CouchDB instance
     */
    connected: boolean;
    /**
     * The sync handler for the PouchDB database, assigned when connected
     */
    syncHandler: PouchDB.Replication.Sync<any> | null;
    /**
     * Definitions for tags known for this database
     */
    tagDefinitions: TagDefinitions;
    /**
     * Options that are passed through to PouchDB
     */
    options: TagRepositoryOptions | null;
    /**
     * Internal constructor used to create a TagRepository.
     *
     * Typically do not use this constructor unless you want to compute secret ids for
     * yourself. Instead, use the `create` function which automatically computes
     * secure document ids
     */
    constructor(secret_id: string, subject_id: string, annotations: RepositoryEntities, options?: TagRepositoryOptions);
    /**
     * Reset state for the given subject, using give object to store annotations for that subject
     */
    private init;
    /**
     * Switch the current subject of annotations to a different one, using the given object as
     * the annotation store
     */
    changeSubject(subject_id: string, annotations: RepositoryEntities, username: string, password: string): Promise<void>;
    /**
     * Creates a TagRepository for the given subject, using the given annotations object
     * to store annotations.
     *
     * This method will compute a secure document id automatically based on the subject id
     * and the repositorySecretRoot.
     *
     * @param subject_id    the unique identifier for the subject this repository is for
     * @param annotations   an object to store annotations in. You can pass a plain, empty
     *                      javascript object (`{}`), however if you are using TagMesh
     *                      in the context of an application using managed state or reactive
     *                      objects, you may wish to pass a managed / reactive object here so that
     *                      tagmesh will update your managed object with annotations.
     * @param options       Options to pass to PouchDB in its initialization to customise how
     *                      annotations are stored.
     */
    static create(subject_id: string, annotations: RepositoryEntities, options?: TagRepositoryOptions): Promise<TagRepository>;
    /**
     * Return the information for the entity specified by the given id
     *
     * If there is no entity known for the id, a blank entity will be created, but not saved
     */
    get(id: string): Entity;
    getOrCreateTag(name: string, color: string): Promise<Tag>;
    /**
     * Save a new tag for the given entity
     */
    saveTag({ entityName, tag, notes, color, type }: {
        entityName: string;
        tag: string;
        notes: string;
        color: string;
        type: string | null;
    }): Promise<Entity>;
    private getEntityKey;
    /**
     * Saves the given entity, typically after it has been modified
     */
    private saveEntity;
    private saveMetaData;
    /**
     * Remove all tags from this repository.
     */
    clear(): Promise<void>;
    /**
     * Remove the annotations identified by the given tag for the given entity
     */
    removeTag(entityId: string, tag: string): Promise<void>;
    /**
     * Remove the given annotation for the given entity
     */
    removeAnnotation(entityId: string, anno?: Annotation): Promise<void>;
    /**
     * Loads the TagRepository from saved state.
     *
     * Typically you will not need to call this explicitly because it is invoked
     * when the TagRepository is created.
     */
    loadState(): Promise<TagRepository>;
    connect({ couchBaseURL, username, password, headers }: TagRepoConnectOptions): Promise<void>;
    /**
     * Disconnect from the remote CouchDB server
     */
    disconnect(): Promise<void>;
}
export { Annotation, Entity, TagRepository };

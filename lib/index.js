var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/*
 * This software is licensed under the BSD 2-Clause license.
 *
 * Copyright 2024 Simon Sadedin
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import PouchDB from 'pouchdb';
/**
 * Utility function to compute sha256 hash for secure calculation
 * of private URLs
 */
function computeSHA256(message) {
    return __awaiter(this, void 0, void 0, function* () {
        // Encode the string as a Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        // Compute the hash
        const hashBuffer = yield crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // Convert bytes to hex string
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    });
}
class Tag {
    constructor(name, color) {
        this.name = name;
        this.color = color;
    }
    toJSON() {
        return {
            id: this.name,
            name: this.color,
        };
    }
    ;
}
/**
 *  the identity of a participant that creates of modifies tags
 */
class User {
    constructor(username, email) {
        this.username = username;
        this.email = email;
    }
}
/**
 * Represents a tag and associated tag metadata such as notes and color to
 * display
 */
class Annotation {
    get tag() {
        return this.tagDefinition.name;
    }
    get color() {
        return this.tagDefinition.color;
    }
    constructor(tag, notes, username) {
        this.tagDefinition = tag;
        this.notes = notes;
        this.username = username;
    }
}
/**
 * Represents an Entity that has annotations / tags attached to it.
 *
 * Entities have a unique identifier, name, and set of annotations (tags).
 * This class is used to manage the identity and metadata of an entity within a system.
 */
class Entity {
    /**
     * Constructs a new instance of the Entity class.
     *
     * @param name The name of the entity which will also be used as the initial identifier.
     */
    constructor(name, type) {
        this.tags = {};
        this.name = name;
        this.id = name;
        this.type = type || null;
    }
}
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
class TagRepository {
    /**
     * Internal constructor used to create a TagRepository.
     *
     * Typically do not use this constructor unless you want to compute secret ids for
     * yourself. Instead, use the `create` function which automatically computes
     * secure document ids
     */
    constructor(secret_id, subject_id, annotations, options) {
        /**
         * The URL of the server to which this TagRepository will attempt to connect
         */
        this.serverURL = null;
        /**
         * Remote couch db database if one is connected
         */
        this.couch = null;
        /**
         * Remote database where cross-patient schema information is stored
         */
        this.schema_db_couch = null;
        /**
         * User who was authenticated. Null until successful authentiction
         * with `connect` method.
         */
        this.user = null;
        /**
         * Set to true if currently connected to a remote CouchDB instance
         */
        this.connected = false;
        /**
         * The sync handler for the PouchDB database, assigned when connected
         */
        this.syncHandler = null;
        if (TagRepository.repositorySecretRoot == 'set_me_to_a_secret') {
            console.warn("TagRepository secret is set to the default publicly known value. Please set this to a secret value to ensure your application is secure\n" +
                "by adding TagRepository.repositorySecretRoot='<an actual secret>' to your application code");
        }
        this.options = options;
        this.connected = false;
        this.init(secret_id, subject_id, annotations);
    }
    /**
     * Reset state for the given subject, using give object to store annotations for that subject
     */
    init(secret_id, subject_id, annotations) {
        var _a, _b;
        this.subject_id = subject_id;
        this.metaDataDocumentId = TagRepository.metaDataDocumentIdRoot + secret_id;
        this.pouch = new PouchDB(this.metaDataDocumentId, ((_a = this.options) === null || _a === void 0 ? void 0 : _a.pouchAdapter) || {});
        this.userAnnotations = annotations;
        this.serverURL = ((_b = this.options) === null || _b === void 0 ? void 0 : _b.serverURL) || null;
        this.couch = null;
        this.user = null;
        this.tagDefinitions = {};
        // The schema database which spans all patients in this context
        this.schema_db = new PouchDB(TagRepository.metaDataDocumentIdRoot + '__schema', {});
        this.schema_db_couch = null;
    }
    /**
     * Switch the current subject of annotations to a different one, using the given object as
     * the annotation store
     */
    changeSubject(subject_id, annotations, username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            let secret_id = yield computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id);
            this.init(secret_id, subject_id, annotations);
            yield this.loadState();
            if (this.serverURL != null)
                this.connect({ couchBaseURL: this.serverURL, username, password });
        });
    }
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
    static create(subject_id, annotations, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let secret_id = yield computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id);
            let repo = new TagRepository(secret_id, subject_id, annotations, options);
            yield repo.loadState();
            return repo;
        });
    }
    /**
     * Return the information for the entity specified by the given id
     *
     * If there is no entity known for the id, a blank entity will be created, but not saved
     */
    get(id) {
        return this.userAnnotations[id] || new Entity(id);
    }
    getOrCreateTag(name, color) {
        return __awaiter(this, void 0, void 0, function* () {
            if (name in this.tagDefinitions)
                return this.tagDefinitions[name];
            let tag_doc = yield this.schema_db.get('tag_definitions');
            if ('tags' in tag_doc) {
                let tagObj = tag_doc.tags;
                if (tagObj[name]) {
                    return tagObj[name];
                }
                const newTag = new Tag(name, color);
                this.tagDefinitions[name] = newTag;
                tagObj[name] = { name: newTag.name, color: newTag.color };
            }
            console.log("Save new tags document", tag_doc);
            this.schema_db.put(tag_doc);
            return new Tag(name, color);
        });
    }
    /**
     * Save a new tag for the given entity
     */
    saveTag({ entityName, tag, notes, color, type }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let entity = this.get(entityName);
            let tagDef = yield this.getOrCreateTag(tag, color);
            if (type)
                entity.type = type;
            if (!entity.tags[tag]) {
                // Have to convert to plain object here, otherwise indexeddb can't store it
                // in pouch. How can we make that work?
                entity.tags[tag] = Object.assign(Object.assign({}, new Annotation(tagDef, notes, ((_a = this.user) === null || _a === void 0 ? void 0 : _a.username) || null)), { tag: tagDef.name, color: tagDef.color }); // have to explicitly add tag prop to make TS happy
            }
            else {
                Object.assign(entity.tags[tag], { tag: tagDef.name, notes: notes, color: tagDef.color, type: type });
            }
            if (!this.userAnnotations[entity.id]) {
                this.userAnnotations[entity.id] = entity;
            }
            this.saveEntity(entity.id);
            return entity;
        });
    }
    getEntityKey(entityId) {
        return this.subject_id + ':' + entityId;
    }
    /**
     * Saves the given entity, typically after it has been modified
     */
    saveEntity(entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = null;
            const entityKey = this.getEntityKey(entityId);
            try {
                doc = yield this.pouch.get(entityKey);
                let meta = {
                    _id: doc._id,
                    _rev: doc._rev
                };
                doc = Object.assign(Object.assign({}, JSON.parse(JSON.stringify(this.userAnnotations[entityId]))), meta);
                console.log('Updating existing doc', doc);
            }
            catch (e) {
                console.log(e);
                doc = Object.assign({ _id: entityKey }, JSON.parse(JSON.stringify(this.userAnnotations[entityId])));
            }
            console.log("Sending doc to pouch", doc);
            this.pouch.put(doc);
        });
    }
    saveMetaData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = null;
            try {
                doc = yield this.pouch.get(this.metaDataDocumentId);
                let meta = {
                    _id: doc._id,
                    _rev: doc._rev
                };
                doc = Object.assign(Object.assign({}, data), meta);
                console.log('Updating existing doc', doc);
            }
            catch (e) {
                console.log(e);
                doc = Object.assign(Object.assign({}, data), { _id: this.metaDataDocumentId });
            }
            console.log("Sending doc to pouch", doc);
            this.pouch.put(doc);
        });
    }
    /**
     * Remove all tags from this repository.
     */
    clear() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Clearing all annotations from document");
            for (var entityId in this.userAnnotations) {
                console.log("Remove tags for entity: ", entityId);
                for (var tag in (_a = this.userAnnotations[entityId]) === null || _a === void 0 ? void 0 : _a.tags) {
                    yield this.removeAnnotation(entityId, this.userAnnotations[entityId].tags[tag]);
                }
            }
        });
    }
    /**
     * Remove the annotations identified by the given tag for the given entity
     */
    removeTag(entityId, tag) {
        return __awaiter(this, void 0, void 0, function* () {
            this.removeAnnotation(entityId, this.get(entityId).tags[tag]);
        });
    }
    /**
     * Remove the given annotation for the given entity
     */
    removeAnnotation(entityId, anno) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!anno)
                return;
            if (!this.userAnnotations[entityId]) {
                console.log(`Entity ${entityId} does not have any annotations`);
                return;
            }
            console.log(`Removing tag ${anno.tag} from entity ${entityId}`);
            let entity = this.userAnnotations[entityId];
            delete entity.tags[anno.tag];
            yield this.saveEntity(entity.id);
        });
    }
    /**
     * Loads the TagRepository from saved state.
     *
     * Typically you will not need to call this explicitly because it is invoked
     * when the TagRepository is created.
     */
    loadState() {
        return __awaiter(this, void 0, void 0, function* () {
            let tagDefDoc = null;
            const tagDefDocKey = 'tag_definitions';
            try {
                tagDefDoc = yield this.schema_db.get(tagDefDocKey);
            }
            catch (e) {
                let ee = e;
                if (ee.name != 'not_found')
                    throw e;
                console.log("Creating new tag schema doc");
                tagDefDoc = {
                    _id: tagDefDocKey,
                    tags: this.tagDefinitions
                };
                this.schema_db.put(tagDefDoc);
            }
            console.log("Loaded tag def doc:", tagDefDoc);
            if ('tags' in tagDefDoc)
                this.tagDefinitions = tagDefDoc.tags;
            let allDocs = yield this.pouch.allDocs({
                include_docs: true
            });
            console.log('Got docs: ', allDocs);
            let entityRows = allDocs
                .rows
                .filter(doc => doc.id != this.metaDataDocumentId);
            let mapped_annotations = new Map(entityRows.map(row => [row.id.split(':')[1], row.doc]));
            let final_annotations = Object.fromEntries(mapped_annotations.entries());
            console.log("Final annotations: ", final_annotations);
            for (var entityId in final_annotations) {
                let entity = new Entity(entityId);
                const annoEntity = final_annotations[entityId];
                entity.name = annoEntity.name;
                entity.tags = annoEntity.tags;
                this.userAnnotations[entityId] = annoEntity;
            }
            return this;
        });
    }
    connect({ couchBaseURL, username = null, password = null, headers = {} }) {
        return __awaiter(this, void 0, void 0, function* () {
            const fetchWithHeaders = (url, opts) => {
                opts.headers = new Headers(headers);
                return fetch(url, opts);
            };
            const pouchDBOptions = headers && headers['Authorization']
                ? { fetch: fetchWithHeaders }
                : { auth: { username, password } };
            let schemaDBURL = couchBaseURL + '/' + TagRepository.metaDataDocumentIdRoot + '__schema';
            this.schema_db_couch = new PouchDB(schemaDBURL, pouchDBOptions);
            this.schema_db.replicate.from(this.schema_db_couch)
                .on('complete', () => {
                console.log("Couchdb schema replication complete");
                this.loadState();
                let sync = PouchDB.sync(this.schema_db, this.schema_db_couch, { live: true, retry: true });
                sync.on('change', () => {
                    console.log("Couchdb schema sync complete");
                    this.loadState();
                });
            })
                .on('error', () => {
                this.connected = false;
            });
            // Then connect / replicate the main database
            let dbURL = couchBaseURL + '/' + this.metaDataDocumentId;
            console.log("Connecting to server " + dbURL);
            this.couch = new PouchDB(dbURL, pouchDBOptions);
            yield this.pouch.replicate.from(this.couch).on('complete', () => {
                console.log("Couchdb replicate complete");
                this.loadState();
                this.connected = true;
                // TODO: once connected, we need to look up the user from the Couch database to get
                // their real user object. For now, fake it with unknown email address.
                this.user = new User(username !== null && username !== void 0 ? username : "Unknown", "Unknown");
                let sync = PouchDB.sync(this.pouch, this.couch, { live: true, retry: true });
                this.syncHandler = sync;
                sync.on('change', () => {
                    console.log("Couchdb sync complete");
                    this.loadState();
                });
            });
            console.log("Connected to server " + couchBaseURL);
        });
    }
    /**
     * Disconnect from the remote CouchDB server
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.syncHandler) {
                this.syncHandler.cancel();
            }
            this.connected = false;
            console.log("Disconnecting from server");
        });
    }
}
/**
 * Salt used in hashing to produce unguessable document ids
 */
TagRepository.repositorySecretRoot = 'set_me_to_a_secret';
/**
 * Prefix used for document ids - set to something specifc to your application
 * if you want multiple applications to share the same document store.
 */
TagRepository.metaDataDocumentIdRoot = 'tagmesh_metadata__';
export { Annotation, Entity, TagRepository };

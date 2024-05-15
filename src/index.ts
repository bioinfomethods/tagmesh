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
import PouchDB from 'pouchdb'

/**
 * Utility function to compute sha256 hash for secure calculation
 * of private URLs
 */
async function computeSHA256(message : string) {
    // Encode the string as a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Compute the hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

class Tag {
    
    name : string
    
    color: string

    constructor(name: string, color: string) {
        this.name = name
        this.color =color
    }
    
    toJSON() {
      return {
        id: this.name,
        name: this.color,
      }
  };
}

/** 
 *  the identity of a participant that creates of modifies tags
 */
class User {
   
   username : string
   
   email : string 
   
   constructor(username : string, email :string) {
     this.username = username
     this.email = email
   }
}



/** 
 * Represents a tag and associated tag metadata such as notes and color to 
 * display
 */
class Annotation {
    
    /**
     * Name of the tag
     */
    tagDefinition : Tag
    
    /**
     * Notes associated with this annotation
     */
    notes : string
    
    /** 
     * Username of user who creted this annotation
     */
    username : string | null
    
    get tag() : string {
        return this.tagDefinition.name
    }
    
    get color() : string {
        return this.tagDefinition.color
    }

    constructor(tag : Tag, notes: string, username: string | null) {
        this.tagDefinition = tag
        this.notes = notes
        this.username = username
    }
}

/**
 * Type safe access to entry annotation map
 */
type EntityAnnotations = {[key : string] : Annotation}


/**
 * Represents an Entity that has annotations / tags attached to it.
 * 
 * Entities have a unique identifier, name, and set of annotations (tags).
 * This class is used to manage the identity and metadata of an entity within a system.
 */
class Entity {

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
    type: string|null;

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
    constructor(name: string, type?:string) {
        this.tags = {};
        this.name = name;
        this.id = name;
        this.type = type || null
    }
}


/**
 * Options to configure the tag repository
 */
interface TagRepositoryOptions {
    /** 
     * Passed through to PouchDB constructor as configuration options
     */
    pouchAdapter : Object | null,

    /** 
     * URL of couchdb server. For access through the bundled Ngnix server,
     * use the address of server + '/db'
     */
    serverURL : string | null
}

type RepositoryEntities = {[key : string] : Entity}

type TagDefinitions = {[key : string] : Tag}


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
     * Salt used in hashing to produce unguessable document ids
     */
    static repositorySecretRoot = 'set_me_to_a_secret'

    /**
     * Prefix used for document ids - set to something specifc to your application
     * if you want multiple applications to share the same document store.
     */
    static metaDataDocumentIdRoot = 'tagmesh_metadata__'

    /**
     * The secure document id of this TagRepository
     * 
     * This is created from a salted hash of subject id and the metaDataDocumentIdRoot
     */
    metaDataDocumentId! : string
    
    /** 
     * Prefix added to entities within this tag repository to ensure they are
     * unique to the subject
     */
    subject_id! : string

    /**
     * All the annotations in the repository
     * 
     * This is a dictionary object where keys are entity ids and values are entities
     */
    userAnnotations! : RepositoryEntities
    
    /** 
     * The URL of the server to which this TagRepository will attempt to connect
     */
    serverURL : string | null = null
    
    /** 
     * Internal PouchDB database used to store entities
     */
    pouch! : PouchDB.Database
    
    /**
     * Remote couch db database if one is connected
     */
    couch : PouchDB.Database | null = null
    
    /** 
     * The database where cross-patient schema information is stored
     */
    schema_db! : PouchDB.Database

    /** 
     * Remote database where cross-patient schema information is stored
     */
    schema_db_couch : PouchDB.Database | null = null
    
    /** 
     * User who was authenticated. Null until successful authentiction 
     * with `connect` method.
     */
    user : User | null = null
    
    /** 
     * Set to true if currently connected to a remote CouchDB instance
     */
    connected : boolean = false
    
    /**
     * The sync handler for the PouchDB database, assigned when connected
     */
    syncHandler : PouchDB.Replication.Sync<any> | null = null

    /** 
     * Definitions for tags known for this database
     */
    tagDefinitions! : TagDefinitions
    
    /**
     * Options that are passed through to PouchDB
     */
    options : TagRepositoryOptions | null
    
    /**
     * Internal constructor used to create a TagRepository.
     * 
     * Typically do not use this constructor unless you want to compute secret ids for 
     * yourself. Instead, use the `create` function which automatically computes
     * secure document ids
     */
    constructor(secret_id : string, subject_id : string, annotations : RepositoryEntities, options? : TagRepositoryOptions) {
        
        if(TagRepository.repositorySecretRoot == 'set_me_to_a_secret') {
            console.warn("TagRepository secret is set to the default publicly known value. Please set this to a secret value to ensure your application is secure\n" +
                          "by adding TagRepository.repositorySecretRoot='<an actual secret>' to your application code")
        }
        this.options = options!
        this.connected = false
        this.init(secret_id, subject_id, annotations)
    }

    /**
     * Reset state for the given subject, using give object to store annotations for that subject
     */
    private init(secret_id : string, subject_id : string, annotations : RepositoryEntities) {
        this.subject_id = subject_id
        this.metaDataDocumentId = TagRepository.metaDataDocumentIdRoot + secret_id
        this.pouch = new PouchDB(this.metaDataDocumentId, this.options?.pouchAdapter || {})
        this.userAnnotations = annotations
        this.serverURL = this.options?.serverURL || null
        
        this.couch = null
        this.user = null
        this.tagDefinitions = {}

        // The schema database which spans all patients in this context
        this.schema_db = new PouchDB(TagRepository.metaDataDocumentIdRoot + '__schema', {})
        this.schema_db_couch = null
    }
    
    /**
     * Switch the current subject of annotations to a different one, using the given object as
     * the annotation store
     */
    async changeSubject(subject_id : string, annotations : RepositoryEntities, username : string, password : string) {
        let secret_id = await computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id)
        this.init(secret_id, subject_id, annotations)
        
        await this.loadState()

        if(this.serverURL!=null)
            this.connect(this.serverURL, username, password)
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
    static async create(subject_id : string, annotations : RepositoryEntities, options? : TagRepositoryOptions) {

        let secret_id = await computeSHA256(TagRepository.repositorySecretRoot + '-' + subject_id)

        let repo = new TagRepository(secret_id, subject_id, annotations, options)
        
        await repo.loadState()
        
        return repo;
    }
    
    /**
     * Return the information for the entity specified by the given id
     * 
     * If there is no entity known for the id, a blank entity will be created, but not saved
     */
    get(id : string) : Entity {
        return this.userAnnotations[id] || new Entity(id)
    }
    
    async getOrCreateTag(name : string, color : string) : Promise<Tag> {
        
        if(name in this.tagDefinitions)
            return this.tagDefinitions[name] as Tag
            
            
       
        let tag_doc = await this.schema_db.get('tag_definitions') as { [key : string]: any}
        
        if('tags' in tag_doc) {
            let tagObj : { [key : string]: any} = tag_doc.tags  as object
            
            if(tagObj[name]) {
                return tagObj[name] as Tag
            }
            
            const newTag = new Tag(name, color)
            this.tagDefinitions[name]  = newTag
            tagObj[name] = { name: newTag.name, color: newTag.color }
        }
        console.log("Save new tags document", tag_doc)
        this.schema_db.put(tag_doc)
        return new Tag(name, color)
    }

    /**
     * Save a new tag for the given entity
     */
    async saveTag({entityName, tag, notes, color, type} : 
        {entityName: string, tag: string, notes : string, color: string, type: string|null}) : Promise<Entity> {
        
        let entity : Entity = this.get(entityName)
        
        let tagDef = await this.getOrCreateTag(tag, color)
        
        if(type)
            entity.type = type

        if (!entity.tags[tag]) {
            // Have to convert to plain object here, otherwise indexeddb can't store it
            // in pouch. How can we make that work?
            entity.tags[tag] = {...new Annotation(tagDef, notes, this.user?.username||null), tag: tagDef.name, color: tagDef.color} // have to explicitly add tag prop to make TS happy

        }
        else {
            Object.assign(entity.tags[tag], {tag: tagDef.name, notes: notes, color: tagDef.color, type: type} )
        }

        if(!this.userAnnotations[entity.id]) {
            this.userAnnotations[entity.id] = entity
        }

        this.saveEntity(entity.id)
        
        return entity
    }

    private getEntityKey(entityId : string) : string {
        return this.subject_id + ':' + entityId
    }

    /**
     * Saves the given entity, typically after it has been modified
     */
    private async saveEntity(entityId: string) {

        let doc : any = null
        const entityKey = this.getEntityKey(entityId)
        try {
            doc = await this.pouch.get(entityKey)

            let meta = {
                _id: doc._id,
                _rev: doc._rev
            }

            doc = {
                ...JSON.parse(JSON.stringify(this.userAnnotations[entityId])),
                ...meta
            }

            console.log('Updating existing doc', doc)
        }
        catch (e) {
            console.log(e)
            doc = {
                _id: entityKey,
                ...JSON.parse(JSON.stringify(this.userAnnotations[entityId])),
            }
        }
        console.log("Sending doc to pouch", doc)
        this.pouch.put(doc)
    }

    private async saveMetaData(data : Object) {
        let doc : any = null
        try {
            doc = await this.pouch.get(this.metaDataDocumentId)

            let meta = {
                _id: doc._id,
                _rev: doc._rev
            }

            doc = {
                ...data,
                ...meta
            }

            console.log('Updating existing doc', doc)
        }
        catch (e) {
            console.log(e)
            doc = {
                ...data,
                _id: this.metaDataDocumentId,
            }
        }
        console.log("Sending doc to pouch", doc)
        this.pouch.put(doc)
   }
    
    /** 
     * Remove all tags from this repository.
     */
    async clear() {
        console.log("Clearing all annotations from document")

        for(var entityId in this.userAnnotations) {
            console.log("Remove tags for entity: ", entityId)
            for(var tag in this.userAnnotations[entityId]?.tags) {
                await this.removeAnnotation(entityId, this.userAnnotations[entityId].tags[tag])
            }
        }
    }

    /**
     * Remove the annotations identified by the given tag for the given entity
     */
    async removeTag(entityId : string, tag : string) {
        this.removeAnnotation(entityId, this.get(entityId).tags[tag])
    }

    /**
     * Remove the given annotation for the given entity
     */
    async removeAnnotation(entityId : string, anno? : Annotation) {

        if(!anno)
            return

        if(!this.userAnnotations[entityId]) {
            console.log(`Entity ${entityId} does not have any annotations`)
            return
        }

        console.log(`Removing tag ${anno.tag} from entity ${entityId}`)

        let entity : Entity = this.userAnnotations[entityId]!
        
        delete entity.tags[anno.tag]

        await this.saveEntity(entity.id)
    }
    
    /**
     * Loads the TagRepository from saved state.
     * 
     * Typically you will not need to call this explicitly because it is invoked
     * when the TagRepository is created.
     */
    async loadState() : Promise<TagRepository> {
        
        let tagDefDoc = null
        const tagDefDocKey = 'tag_definitions'
        
        try {
           tagDefDoc = await this.schema_db.get(tagDefDocKey)
        }
        catch(e) {
            
            let ee = e as Error
            
            if(ee.name != 'not_found')
                throw e
            
            console.log("Creating new tag schema doc")
            tagDefDoc = {
                _id : tagDefDocKey,
                tags : this.tagDefinitions
            }
            this.schema_db.put(tagDefDoc!)
        }
        
        console.log("Loaded tag def doc:", tagDefDoc)
        
        if('tags' in tagDefDoc)
            this.tagDefinitions = tagDefDoc.tags! as TagDefinitions
        
       
        let allDocs = await this.pouch.allDocs({
            include_docs:true
        })

        console.log('Got docs: ', allDocs)
        
        let entityRows = 
            allDocs
                .rows
                .filter(doc => doc.id != this.metaDataDocumentId )

        let mapped_annotations = new Map(entityRows.map(row => [row.id.split(':')[1], row.doc]))
        let final_annotations = Object.fromEntries(mapped_annotations.entries())
        console.log("Final annotations: ", final_annotations)
        
        for(var entityId in final_annotations) {
            
            let entity = new Entity(entityId)
            const annoEntity : any = final_annotations[entityId]!
            entity.name = annoEntity.name
            entity.tags = annoEntity.tags
            this.userAnnotations[entityId] = annoEntity
        }
        
        return this;
      }
      
      
    /**  
     *  Connects to remote CouchDB repository with given username and password
     */
    async connect(couchBaseURL : string, username : string, password : string) {
        
        // First connect schema db url
        let schemaDBURL = couchBaseURL + '/' + TagRepository.metaDataDocumentIdRoot + '__schema'
        this.schema_db_couch = new PouchDB(schemaDBURL, { auth: { "username":  username, "password": password} })
        this.schema_db.replicate.from(this.schema_db_couch)
            .on('complete', () => {
                console.log("Couchdb schema replication complete")
                this.loadState()

                let sync = PouchDB.sync(this.schema_db, this.schema_db_couch!, {live: true, retry: true})
                sync.on('change', () => {
                    console.log("Couchdb schema sync complete")
                    this.loadState()
                })
            })
            .on('error', () => {
                this.connected = false
            })


        // Then connect / replicate the main database
        let dbURL = couchBaseURL + '/' + this.metaDataDocumentId
        console.log("Connecting to server " + dbURL)
        this.couch = new PouchDB(dbURL, { auth: { "username":  username, "password": password} })
        
        await this.pouch.replicate.from(this.couch).on('complete', () => {

            console.log("Couchdb replicate complete")
            this.loadState()
            this.connected = true

            // TODO: once connected, we need to look up the user from the Couch database to get
            // their real user object. For now, fake it with unknown email address.
            this.user = new User(username, "Unknown")
            
            let sync = PouchDB.sync(this.pouch, this.couch!, {live: true, retry: true})
            this.syncHandler = sync
            sync.on('change', () => {
                console.log("Couchdb sync complete")
                this.loadState()
            })
        })
        
        console.log("Connected to server " + couchBaseURL)
    }

    /**
     * Disconnect from the remote CouchDB server
     */
    async disconnect() {
        if(this.syncHandler){
            this.syncHandler.cancel()
        }
        this.connected = false
        console.log("Disconnecting from server")
    }
}

export { TagRepository, Entity, Annotation }
